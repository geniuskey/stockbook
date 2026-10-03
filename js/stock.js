/* Copyright (c) 2026 geniuskey and StockBook contributors.
   Executable code: MIT (see ../LICENSE-MIT).
   Educational content and illustrations: CC-BY-4.0 (see ../LICENSE.md). */
/* ==========================================================================
   StockBook 주식 계산 엔진 — 전역 객체 ST
   모든 장이 같은 계산(호가·체결, 가격 경로, 지표, 가치평가, 포트폴리오,
   백테스트, 옵션, 세금·비용)과 같은 가상 시장 데이터를 쓰게 한다.
   단위: 원, 비율은 소수(연 3.5% → 0.035). 브라우저와 node 양쪽에서 동작한다.
     node -e "const ST=require('./js/stock.js'); console.log(ST.ratios(ST.CO.hanbit))"
   등장하는 회사·지수·가격은 모두 가상이다.
   ========================================================================== */
(function (root) {
  "use strict";
  const ST = {};
  const TD = 252; // 1년 거래일 수

  /* ------------------------------------------------------------ 2026년 한국 시장 제도 값 (대표값, 바뀔 수 있다) */
  ST.KR = {
    year: 2026,
    limit: 0.30,                  // 가격제한폭 ±30%
    session: { preOpen: "08:30", open: "09:00", closeAuction: "15:20", close: "15:30" },
    nxt: { open: "08:00", close: "20:00" }, // 대체거래소(넥스트레이드) 거래 시간(약)
    settle: 2,                    // 결제일 T+2
    ticks: [[2000, 1], [5000, 5], [20000, 10], [50000, 50], [200000, 100], [500000, 500], [Infinity, 1000]],
    sellTax: { KOSPI: 0.0020, KOSDAQ: 0.0020, KONEX: 0.0010, US: 0 }, // 증권거래세(농어촌특별세 포함), 매도 시
    fee: 0.00015,                 // 온라인 위탁 수수료(약, 증권사마다 다름)
    usFee: 0.0025,                // 해외 주식 수수료(약)
    secFee: 0.0000278,            // 미국 SEC fee(매도, 약)
    fxSpread: 0.01,               // 환전 스프레드(우대 전, 약 1%)
    divTax: 0.154,                // 배당소득세(지방세 포함)
    finIncomeLimit: 20e6,         // 금융소득 종합과세 기준(이자+배당)
    overseasTax: 0.22,            // 해외 주식 양도소득세(지방세 포함)
    overseasDeduction: 2.5e6,     // 해외 주식 양도소득 기본공제(연)
    majorHolder: 50e8,            // 국내 상장주식 대주주 기준(종목당 보유액, 약)
    isa: { limit: 2e7, taxFree: 2e6, taxFreeLow: 4e6, sepTax: 0.099 },
    margin: { initial: 0.4, maintenance: 1.4, rate: 0.085 }, // 신용: 보증금률 40%, 담보유지비율 140%, 이자 연 8.5%(약)
    vi: { static: 0.10, dynamic: 0.03 },                   // 변동성 완화장치(정적 ±10%, 동적 약 ±2~3%)
    circuit: [0.08, 0.15, 0.20],                          // 서킷브레이커 단계(지수 하락률)
    sidecar: 0.05,                                        // 사이드카(선물 ±5%, KOSPI 기준)
  };

  /* ------------------------------------------------------------ 기본 수학 */
  ST.clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  ST.sum = (xs) => xs.reduce((s, x) => s + x, 0);
  ST.mean = (xs) => (xs.length ? ST.sum(xs) / xs.length : NaN);
  ST.std = function (xs, sample = true) {
    const n = xs.length; if (n < 2) return 0;
    const m = ST.mean(xs); let s = 0;
    for (const x of xs) s += (x - m) * (x - m);
    return Math.sqrt(s / (sample ? n - 1 : n));
  };
  ST.cov = function (a, b) {
    const n = Math.min(a.length, b.length); if (n < 2) return 0;
    const ma = ST.mean(a.slice(0, n)), mb = ST.mean(b.slice(0, n)); let s = 0;
    for (let i = 0; i < n; i++) s += (a[i] - ma) * (b[i] - mb);
    return s / (n - 1);
  };
  ST.corr = (a, b) => { const sa = ST.std(a), sb = ST.std(b); return sa && sb ? ST.cov(a, b) / (sa * sb) : 0; };
  ST.percentile = function (xs, p) {
    const s = xs.filter(isFinite).slice().sort((a, b) => a - b); if (!s.length) return NaN;
    const k = (s.length - 1) * p, f = Math.floor(k), c = Math.ceil(k);
    return f === c ? s[f] : s[f] + (s[c] - s[f]) * (k - f);
  };
  /** 히스토그램: {edges, counts, width} */
  ST.hist = function (xs, bins = 30, lo, hi) {
    lo = lo == null ? Math.min(...xs) : lo; hi = hi == null ? Math.max(...xs) : hi;
    if (hi <= lo) hi = lo + 1;
    const w = (hi - lo) / bins, counts = new Array(bins).fill(0);
    for (const x of xs) { if (!isFinite(x)) continue; const k = Math.floor((x - lo) / w); if (k >= 0 && k < bins) counts[k]++; else if (x === hi) counts[bins - 1]++; }
    return { edges: Array.from({ length: bins + 1 }, (_, i) => lo + i * w), counts, width: w, lo, hi };
  };
  ST.npdf = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  /** 표준정규 누적분포 (Abramowitz–Stegun 26.2.17) */
  ST.ncdf = function (x) {
    const k = 1 / (1 + 0.2316419 * Math.abs(x));
    const p = 1 - ST.npdf(x) * k * (0.319381530 + k * (-0.356563782 + k * (1.781477937 + k * (-1.821255978 + k * 1.330274429))));
    return x >= 0 ? p : 1 - p;
  };

  /* ------------------------------------------------------------ 난수 (시드 고정) */
  /** 0~1 균등 난수 함수 (mulberry32) */
  ST.rng = function (seed = 1) {
    let a = seed >>> 0;
    return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };
  /** 표준정규 난수 함수 */
  ST.gauss = function (seed = 1) {
    const r = typeof seed === "function" ? seed : ST.rng(seed);
    return function () { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  };
  /** 두꺼운 꼬리 난수(자유도 df인 t분포를 분산 1로 맞춤) */
  ST.fat = function (seed = 1, df = 4) {
    const r = ST.rng(seed), g = ST.gauss(r);
    return function () { let c = 0; for (let i = 0; i < df; i++) { const z = g(); c += z * z; } return (g() / Math.sqrt(c / df)) * Math.sqrt((df - 2) / df); };
  };

  /* ------------------------------------------------------------ 호가 단위·가격제한폭·비용 */
  /** 호가 단위(2023년 이후 KOSPI·KOSDAQ 공통) */
  ST.tick = function (price) { for (const [lim, t] of ST.KR.ticks) if (price < lim) return t; return 1000; };
  /** 호가 단위로 맞춤. dir: "down"(내림) | "up"(올림) | 생략(반올림) */
  ST.roundTick = function (p, dir) {
    if (p <= 0) return 1;
    const t = ST.tick(p), f = dir === "down" ? Math.floor : dir === "up" ? Math.ceil : Math.round;
    const q = f(p / t) * t;
    return ST.tick(q) === t ? q : f(p / ST.tick(q)) * ST.tick(q);
  };
  /** 전일 종가 기준 상한가·하한가 */
  ST.limits = function (prev) {
    return { upper: ST.roundTick(prev * (1 + ST.KR.limit), "down"), lower: ST.roundTick(prev * (1 - ST.KR.limit), "up") };
  };
  /** 다음/이전 호가: ST.stepTick(72000, +1) → 72100 */
  ST.stepTick = function (p, k = 1) {
    let x = p;
    for (let i = 0; i < Math.abs(k); i++) x = k > 0 ? x + ST.tick(x) : x - ST.tick(x - 1);
    return x;
  };
  /**
   * 한 번의 매매 비용. ST.cost({side:"buy"|"sell", price, qty, market:"KOSPI"|"KOSDAQ"|"US", fee})
   * → {amount, fee, tax, total(매수: 낸 돈, 매도: 받은 돈)}
   */
  ST.cost = function ({ side = "buy", price, qty = 1, market = "KOSPI", fee }) {
    const amount = price * qty;
    const f = amount * (fee == null ? (market === "US" ? ST.KR.usFee : ST.KR.fee) : fee);
    const tax = side === "sell" ? amount * (ST.KR.sellTax[market] || 0) + (market === "US" ? amount * ST.KR.secFee : 0) : 0;
    return { amount, fee: f, tax, total: side === "buy" ? amount + f : amount - f - tax };
  };
  /** 사고팔기 한 번 왕복 비용률(수수료 2번 + 매도세) */
  ST.roundTrip = (market = "KOSPI", fee) => 2 * (fee == null ? (market === "US" ? ST.KR.usFee : ST.KR.fee) : fee) + (ST.KR.sellTax[market] || 0);

  /* ------------------------------------------------------------ 세금 */
  /** 배당·이자 원천징수: {gross, tax, net} */
  ST.divTax = (gross) => ({ gross, tax: gross * ST.KR.divTax, net: gross * (1 - ST.KR.divTax) });
  /** 해외 주식 양도세: 연간 손익 통산 후 250만원 공제, 22% */
  ST.overseasTax = function (gain) {
    const base = Math.max(0, gain - ST.KR.overseasDeduction);
    return { gain, base, tax: base * ST.KR.overseasTax, net: gain - base * ST.KR.overseasTax };
  };
  /**
   * 금융소득 종합과세 간이 계산(교육용). fin: 연 이자+배당, other: 다른 종합소득 과세표준.
   * 2,000만원까지 15.4% 분리과세, 넘는 부분은 다른 소득과 합쳐 누진세율(지방세 포함 ×1.1). 비교과세는 원천징수액을 하한으로 단순화.
   */
  ST.finIncomeTax = function (fin, other = 0) {
    const lim = ST.KR.finIncomeLimit;
    if (fin <= lim) return { tax: fin * ST.KR.divTax, rate: ST.KR.divTax, comprehensive: false };
    const prog = (x) => { const B = [[14e6, 0.06], [50e6, 0.15], [88e6, 0.24], [150e6, 0.35], [300e6, 0.38], [500e6, 0.40], [1e9, 0.42], [Infinity, 0.45]]; let t = 0, lo = 0; for (const [hi, r] of B) { if (x > lo) t += (Math.min(x, hi) - lo) * r; lo = hi; } return t * 1.1; };
    // 비교과세: 종합과세 결과가 전액 원천징수(15.4%)보다 작으면 원천징수 쪽을 낸다
    const tax = Math.max(fin * ST.KR.divTax, lim * ST.KR.divTax + prog(other + fin - lim) - prog(other));
    return { tax, rate: tax / fin, comprehensive: true };
  };
  /** ISA 만기 과세: 순이익 중 비과세 한도 초과분 9.9% (profit에는 과세 대상 이익만 넘긴다. 국내 상장 주식 매매 차익은 원래 비과세라 뺀다) */
  ST.isaTax = (profit, low = false) => Math.max(0, profit - (low ? ST.KR.isa.taxFreeLow : ST.KR.isa.taxFree)) * ST.KR.isa.sepTax;

  /* ------------------------------------------------------------ 시간 가치 */
  ST.fv = (r, n, pmt = 0, pv = 0) => (r === 0 ? pv + pmt * n : pv * Math.pow(1 + r, n) + pmt * ((Math.pow(1 + r, n) - 1) / r));
  ST.pv = (r, n, pmt = 0, fv = 0) => (r === 0 ? fv + pmt * n : fv / Math.pow(1 + r, n) + pmt * ((1 - Math.pow(1 + r, -n)) / r));
  ST.npv = (r, flows) => flows.reduce((s, c, t) => s + c / Math.pow(1 + r, t), 0);
  /** 내부수익률(이분법) */
  ST.irr = function (flows, lo = -0.99, hi = 10) {
    const f = (r) => ST.npv(r, flows); let a = lo, b = hi, fa = f(a);
    if (fa * f(b) > 0) return NaN;
    for (let i = 0; i < 200; i++) { const m = (a + b) / 2, fm = f(m); if (Math.abs(fm) < 1e-9) return m; if (fa * fm < 0) b = m; else { a = m; fa = fm; } }
    return (a + b) / 2;
  };

  /* ------------------------------------------------------------ 수익률·위험 통계 */
  /** 단순 수익률 배열 (길이 n-1) */
  ST.returns = (p) => { const r = []; for (let i = 1; i < p.length; i++) r.push(p[i] / p[i - 1] - 1); return r; };
  ST.logReturns = (p) => { const r = []; for (let i = 1; i < p.length; i++) r.push(Math.log(p[i] / p[i - 1])); return r; };
  /** 수익률 배열 → 1에서 시작하는 누적 가치 */
  ST.cumulate = (rets, start = 1) => { const out = [start]; for (const r of rets) out.push(out[out.length - 1] * (1 + r)); return out; };
  /** 연평균 복리 수익률. ppy: 1년당 기간 수(일간 252, 월간 12) */
  ST.cagr = (p, ppy = TD) => (p.length < 2 || p[0] <= 0 ? NaN : Math.pow(p[p.length - 1] / p[0], ppy / (p.length - 1)) - 1);
  ST.annVol = (rets, ppy = TD) => ST.std(rets) * Math.sqrt(ppy);
  ST.sharpe = (rets, rf = 0, ppy = TD) => { const ex = rets.map((r) => r - rf / ppy); const s = ST.std(ex); return s ? (ST.mean(ex) / s) * Math.sqrt(ppy) : 0; };
  ST.sortino = (rets, rf = 0, ppy = TD) => { const ex = rets.map((r) => r - rf / ppy); const dn = Math.sqrt(ST.mean(ex.map((r) => Math.min(0, r) ** 2))); return dn ? (ST.mean(ex) / dn) * Math.sqrt(ppy) : 0; };
  /** 변동성 끌림: 기하평균 ≈ 산술평균 − σ²/2 */
  ST.drag = (mu, sigma) => mu - (sigma * sigma) / 2;
  /** 고점 대비 낙폭 배열 (0 ~ −1) */
  ST.drawdowns = (p) => { let pk = -Infinity; return p.map((x) => { pk = Math.max(pk, x); return x / pk - 1; }); };
  /** 최대 낙폭: {mdd(음수), peak, trough, recovery(회복 인덱스, 없으면 -1)} */
  ST.maxDrawdown = function (p) {
    let pk = 0, mdd = 0, peak = 0, trough = 0;
    for (let i = 0; i < p.length; i++) { if (p[i] > p[pk]) pk = i; const d = p[i] / p[pk] - 1; if (d < mdd) { mdd = d; peak = pk; trough = i; } }
    let recovery = -1; for (let i = trough; i < p.length; i++) if (p[i] >= p[peak]) { recovery = i; break; }
    return { mdd, peak, trough, recovery };
  };
  ST.beta = (ra, rm) => { const v = ST.cov(rm, rm); return v ? ST.cov(ra, rm) / v : 0; };
  /** 수익률 요약: {cagr, vol, sharpe, mdd, total} */
  ST.summary = function (p, ppy = TD, rf = 0) {
    const r = ST.returns(p);
    return { total: p[p.length - 1] / p[0] - 1, cagr: ST.cagr(p, ppy), vol: ST.annVol(r, ppy), sharpe: ST.sharpe(r, rf, ppy), mdd: ST.maxDrawdown(p).mdd };
  };

  /* ------------------------------------------------------------ 가격 경로 */
  /**
   * 기하 브라운 운동. ST.gbm({s0, mu, sigma, days, seed, n, dt, jump:{lambda, mean, sd}})
   * n을 주면 경로 배열들, 아니면 경로 하나(길이 days+1). mu·sigma는 연 단위, dt 기본 1/252.
   */
  ST.gbm = function ({ s0 = 100, mu = 0.07, sigma = 0.2, days = TD, seed = 1, n, dt = 1 / TD, jump, fat } = {}) {
    const r = ST.rng(seed), g = fat ? ST.fat(seed * 7 + 1, fat) : ST.gauss(r);
    const drift = (mu - (sigma * sigma) / 2) * dt, vol = sigma * Math.sqrt(dt);
    const one = () => {
      const p = [s0]; let s = s0;
      for (let i = 0; i < days; i++) {
        let x = drift + vol * g();
        if (jump && r() < jump.lambda * dt) x += (jump.mean || 0) + (jump.sd || 0.1) * g();
        s *= Math.exp(x); p.push(s);
      }
      return p;
    };
    if (n == null) return one();
    const out = []; for (let k = 0; k < n; k++) out.push(one());
    return out;
  };
  /** GARCH(1,1) 변동성 군집 경로: {prices, vols(연환산)} */
  ST.garch = function ({ s0 = 100, mu = 0.07, sigma = 0.2, days = TD, seed = 1, alpha = 0.09, beta = 0.89 } = {}) {
    const g = ST.gauss(seed), v0 = (sigma * sigma) / TD, omega = v0 * (1 - alpha - beta);
    let v = v0, s = s0, eps = 0; const prices = [s0], vols = [sigma];
    for (let i = 0; i < days; i++) {
      v = omega + alpha * eps * eps + beta * v;
      eps = Math.sqrt(v) * g();
      s *= Math.exp(mu / TD - v / 2 + eps);
      prices.push(s); vols.push(Math.sqrt(v * TD));
    }
    return { prices, vols };
  };
  /**
   * 종가 배열 → 캔들 [{o,h,l,c,v}]. 시가·고가·저가·거래량을 그럴듯하게 만든다.
   * opts: {seed, tick(true면 호가 단위로 맞춤), vol0(평균 거래량), sigma(연 변동성)}
   */
  ST.ohlc = function (closes, { seed = 1, tick = false, vol0 = 1e6, sigma } = {}) {
    const r = ST.rng(seed), g = ST.gauss(r);
    const rets = ST.logReturns(closes);
    const sd = sigma ? sigma / Math.sqrt(TD) : Math.max(1e-4, ST.std(rets));
    const fix = (x) => (tick ? ST.roundTick(x) : x);
    const out = [];
    for (let i = 0; i < closes.length; i++) {
      const c = closes[i], prev = i ? closes[i - 1] : c;
      const o = i ? prev * Math.exp(0.25 * sd * g()) : c * Math.exp(0.25 * sd * g());
      const hi = Math.max(o, c) * Math.exp(Math.abs(0.5 * sd * g()));
      const lo = Math.min(o, c) * Math.exp(-Math.abs(0.5 * sd * g()));
      const move = Math.abs(Math.log(c / prev)) / sd;
      const v = Math.round(vol0 * (0.6 + 0.6 * move) * Math.exp(0.35 * g()));
      out.push({ o: fix(o), h: fix(hi), l: fix(lo), c: fix(c), v });
    }
    return out;
  };
  /** 캔들 묶기(일봉 → 주봉 k=5, 월봉 k≈21) */
  ST.resample = function (candles, k) {
    const out = [];
    for (let i = 0; i < candles.length; i += k) {
      const g = candles.slice(i, i + k);
      out.push({ o: g[0].o, h: Math.max(...g.map((d) => d.h)), l: Math.min(...g.map((d) => d.l)), c: g[g.length - 1].c, v: ST.sum(g.map((d) => d.v || 0)), i0: i });
    }
    return out;
  };
  /** 거래일 날짜 배열(주말만 뺀다): ST.tradingDays("2016-01-04", 300) → ["2016-01-04", ...] */
  ST.tradingDays = function (start, n) {
    const d = new Date(start + "T00:00:00Z"), out = [];
    while (out.length < n) { const w = d.getUTCDay(); if (w !== 0 && w !== 6) out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
    return out;
  };

  /* ------------------------------------------------------------ 기술적 지표 (앞부분은 null) */
  ST.sma = function (a, n) { const out = new Array(a.length).fill(null); let s = 0; for (let i = 0; i < a.length; i++) { s += a[i]; if (i >= n) s -= a[i - n]; if (i >= n - 1) out[i] = s / n; } return out; };
  ST.ema = function (a, n) { const out = new Array(a.length).fill(null), k = 2 / (n + 1); let e = null; for (let i = 0; i < a.length; i++) { if (i === n - 1) { e = ST.mean(a.slice(0, n)); } else if (i >= n) e = a[i] * k + e * (1 - k); if (i >= n - 1) out[i] = e; } return out; };
  ST.rollStd = function (a, n) { const out = new Array(a.length).fill(null); for (let i = n - 1; i < a.length; i++) out[i] = ST.std(a.slice(i - n + 1, i + 1), false); return out; };
  /** RSI(와일더 평활) */
  ST.rsi = function (a, n = 14) {
    const out = new Array(a.length).fill(null); if (a.length <= n) return out;
    let g = 0, l = 0;
    for (let i = 1; i <= n; i++) { const d = a[i] - a[i - 1]; if (d > 0) g += d; else l -= d; }
    g /= n; l /= n; out[n] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
    for (let i = n + 1; i < a.length; i++) { const d = a[i] - a[i - 1]; g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n; out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); }
    return out;
  };
  /** MACD: {macd, signal, hist} */
  ST.macd = function (a, f = 12, s = 26, sig = 9) {
    const ef = ST.ema(a, f), es = ST.ema(a, s);
    const m = a.map((_, i) => (ef[i] != null && es[i] != null ? ef[i] - es[i] : null));
    const first = m.findIndex((x) => x != null), sg = new Array(a.length).fill(null);
    if (first >= 0) { const e = ST.ema(m.slice(first), sig); e.forEach((v, j) => (sg[first + j] = v)); }
    return { macd: m, signal: sg, hist: m.map((x, i) => (x != null && sg[i] != null ? x - sg[i] : null)) };
  };
  /** 볼린저 밴드: {mid, up, lo, pctB} */
  ST.bollinger = function (a, n = 20, k = 2) {
    const mid = ST.sma(a, n), sd = ST.rollStd(a, n);
    const up = mid.map((m, i) => (m == null ? null : m + k * sd[i])), lo = mid.map((m, i) => (m == null ? null : m - k * sd[i]));
    return { mid, up, lo, pctB: a.map((x, i) => (up[i] == null || up[i] === lo[i] ? null : (x - lo[i]) / (up[i] - lo[i]))) };
  };
  /** ATR(캔들) */
  ST.atr = function (c, n = 14) {
    const tr = c.map((d, i) => (i ? Math.max(d.h - d.l, Math.abs(d.h - c[i - 1].c), Math.abs(d.l - c[i - 1].c)) : d.h - d.l));
    const out = new Array(c.length).fill(null); let a = null;
    for (let i = 0; i < c.length; i++) { if (i === n - 1) a = ST.mean(tr.slice(0, n)); else if (i >= n) a = (a * (n - 1) + tr[i]) / n; if (i >= n - 1) out[i] = a; }
    return out;
  };
  ST.obv = function (c) { let s = 0; return c.map((d, i) => (i ? (s += d.c > c[i - 1].c ? d.v : d.c < c[i - 1].c ? -d.v : 0) : s)); };
  ST.highest = (a, n) => a.map((_, i) => (i < n - 1 ? null : Math.max(...a.slice(i - n + 1, i + 1))));
  ST.lowest = (a, n) => a.map((_, i) => (i < n - 1 ? null : Math.min(...a.slice(i - n + 1, i + 1))));

  /* ------------------------------------------------------------ 호가창과 체결 엔진 */
  /**
   * 가격·시간 우선 원칙의 연속 매매 호가창.
   *   const b = new ST.Book({ ref: 72000 });
   *   b.limit("buy", 71900, 30, "me");  b.market("sell", 50);  b.cancel(id)
   *   b.depth(5) → {asks:[{price, qty, n}](낮은 가격부터), bids:[...](높은 가격부터)}
   *   b.best() → {bid, ask, spread, mid};  b.trades → [{price, qty, side(공격 쪽), buyer, seller, t}]
   * limit/market은 이번 주문으로 일어난 체결 배열을 돌려준다. 시장가 잔량은 버린다(남기지 않음).
   */
  ST.Book = class {
    constructor({ ref = 10000 } = {}) { this.bids = []; this.asks = []; this.trades = []; this.seq = 0; this.t = 0; this.last = ref; this.ref = ref; }
    _sort() { this.bids.sort((a, b) => b.price - a.price || a.seq - b.seq); this.asks.sort((a, b) => a.price - b.price || a.seq - b.seq); }
    _match(o, limitPrice) {
      const fills = [], opp = o.side === "buy" ? this.asks : this.bids;
      while (o.qty > 0 && opp.length) {
        const top = opp[0];
        if (limitPrice != null && (o.side === "buy" ? top.price > limitPrice : top.price < limitPrice)) break;
        const q = Math.min(o.qty, top.qty);
        const tr = { price: top.price, qty: q, side: o.side, buyer: o.side === "buy" ? o.owner : top.owner, seller: o.side === "sell" ? o.owner : top.owner, t: this.t++, maker: top.id, taker: o.id };
        fills.push(tr); this.trades.push(tr); this.last = top.price;
        o.qty -= q; top.qty -= q; if (top.qty <= 0) opp.shift();
      }
      return fills;
    }
    limit(side, price, qty, owner = "") {
      const o = { id: ++this.seq, seq: this.seq, side, price, qty, owner, orig: qty };
      const fills = this._match(o, price);
      if (o.qty > 0) { (side === "buy" ? this.bids : this.asks).push(o); this._sort(); }
      fills.rest = o.qty > 0 ? o : null; fills.id = o.id;
      return fills;
    }
    market(side, qty, owner = "") { const o = { id: ++this.seq, seq: this.seq, side, qty, owner }; return this._match(o, null); }
    cancel(id) { for (const q of [this.bids, this.asks]) { const k = q.findIndex((o) => o.id === id); if (k >= 0) return q.splice(k, 1)[0]; } return null; }
    /** 시장가로 qty를 체결하면 평균 단가와 미끄러짐(실행하지 않는다) */
    impact(side, qty) {
      const opp = side === "buy" ? this.asks : this.bids; let left = qty, cost = 0, worst = null;
      for (const o of opp) { if (left <= 0) break; const q = Math.min(left, o.qty); cost += q * o.price; left -= q; worst = o.price; }
      const filled = qty - left, avg = filled ? cost / filled : NaN, b = this.best();
      return { filled, avg, worst, slip: filled && b.mid ? (side === "buy" ? avg / b.mid - 1 : 1 - avg / b.mid) : NaN };
    }
    depth(levels = 5) {
      const agg = (q) => { const m = new Map(); for (const o of q) { const e = m.get(o.price) || { price: o.price, qty: 0, n: 0 }; e.qty += o.qty; e.n++; m.set(o.price, e); } return [...m.values()].slice(0, levels); };
      return { asks: agg(this.asks), bids: agg(this.bids) };
    }
    best() {
      const bid = this.bids.length ? this.bids[0].price : null, ask = this.asks.length ? this.asks[0].price : null;
      return { bid, ask, spread: bid != null && ask != null ? ask - bid : null, mid: bid != null && ask != null ? (bid + ask) / 2 : this.last };
    }
    /** 기준가 주변에 무작위 호가를 깐다(시작 상태 만들기) */
    seed({ levels = 10, seed = 1, size = 100 } = {}) {
      const r = ST.rng(seed); let a = ST.roundTick(this.ref, "up"), b = ST.stepTick(a, -1);
      for (let i = 0; i < levels; i++) {
        this.limit("sell", a, Math.max(1, Math.round(size * (0.4 + 1.2 * r()) * (1 + i * 0.12))), "mm");
        this.limit("buy", b, Math.max(1, Math.round(size * (0.4 + 1.2 * r()) * (1 + i * 0.12))), "mm");
        a = ST.stepTick(a, 1); b = ST.stepTick(b, -1);
      }
      return this;
    }
  };
  /**
   * 단일가 매매(동시호가). orders:[{side, price(null이면 시장가), qty}], ref: 기준가
   * 체결량이 최대인 가격 → 잔량이 적은 가격 → 기준가에 가까운 가격 순으로 고른다.
   * → {price, volume, curve:[{price, buy(그 가격 이상 매수 누적), sell(그 가격 이하 매도 누적), vol}]}
   */
  ST.auction = function (orders, ref) {
    const prices = [...new Set(orders.filter((o) => o.price != null).map((o) => o.price))].sort((a, b) => a - b);
    if (!prices.length) prices.push(ref);
    const curve = prices.map((p) => {
      const buy = ST.sum(orders.filter((o) => o.side === "buy" && (o.price == null || o.price >= p)).map((o) => o.qty));
      const sell = ST.sum(orders.filter((o) => o.side === "sell" && (o.price == null || o.price <= p)).map((o) => o.qty));
      return { price: p, buy, sell, vol: Math.min(buy, sell) };
    });
    let best = null;
    for (const c of curve) {
      if (!best || c.vol > best.vol || (c.vol === best.vol && Math.abs(c.buy - c.sell) < Math.abs(best.buy - best.sell)) ||
        (c.vol === best.vol && Math.abs(c.buy - c.sell) === Math.abs(best.buy - best.sell) && Math.abs(c.price - ref) < Math.abs(best.price - ref))) best = c;
    }
    return { price: best && best.vol > 0 ? best.price : ref, volume: best ? best.vol : 0, curve };
  };

  /* ------------------------------------------------------------ 기업 지표·가치평가 */
  /**
   * 회사 데이터 → 지표. 금액은 원.
   * → {mcap, eps, bps, sps, dps, per, pbr, psr, roe, roa, opm, npm, dy, payout, debtRatio, ev, ebitda, evEbitda, fcfYield}
   */
  ST.ratios = function (c) {
    const mcap = c.price * c.shares, eps = c.net / c.shares, bps = c.equity / c.shares, sps = c.sales / c.shares;
    const ebitda = c.op + (c.da || 0), ev = mcap + (c.debt || 0) - (c.cash || 0);
    return {
      mcap, eps, bps, sps, dps: c.dps || 0,
      per: eps > 0 ? c.price / eps : NaN, pbr: c.price / bps, psr: c.price / sps,
      roe: c.net / c.equity, roa: c.net / c.assets, opm: c.op / c.sales, npm: c.net / c.sales,
      dy: (c.dps || 0) / c.price, payout: eps > 0 ? (c.dps || 0) / eps : NaN,
      debtRatio: (c.assets - c.equity) / c.equity, ev, ebitda, evEbitda: ebitda > 0 ? ev / ebitda : NaN,
      fcfYield: (c.fcf || 0) / mcap,
    };
  };
  /** 듀퐁 분해: ROE = 순이익률 × 총자산회전율 × 레버리지 */
  ST.dupont = ({ net, sales, assets, equity }) => ({ margin: net / sales, turnover: sales / assets, leverage: assets / equity, roe: net / equity });
  /** CAPM 기대수익률 */
  ST.capm = (rf, beta, mrp) => rf + beta * mrp;
  /** 가중평균자본비용 */
  ST.wacc = ({ E, D, re, rd, tax = 0.24 }) => (E * re + D * rd * (1 - tax)) / (E + D);
  /** 고든 성장 모형: 내년 배당 d1, 요구수익률 r, 영구 성장률 g */
  ST.gordon = (d1, r, g) => (r > g ? d1 / (r - g) : Infinity);
  /** 2단계 배당할인: n년 동안 g1, 이후 g2 */
  ST.ddm2 = function ({ d0, g1, n, g2, r }) {
    let pv = 0, d = d0;
    for (let t = 1; t <= n; t++) { d *= 1 + g1; pv += d / Math.pow(1 + r, t); }
    const tv = r > g2 ? (d * (1 + g2)) / (r - g2) : Infinity;
    return { value: pv + tv / Math.pow(1 + r, n), pvStage1: pv, pvTerminal: tv / Math.pow(1 + r, n) };
  };
  /**
   * 현금흐름할인(DCF). growth: 숫자(매년 같은 성장) 또는 배열(해마다).
   * ST.dcf({fcf0, growth, years, wacc, tg, netDebt, shares})
   * → {flows:[{t, fcf, pv}], pvSum, tv, pvTv, ev, equity, perShare, tvShare}
   */
  ST.dcf = function ({ fcf0, growth = 0.05, years = 5, wacc = 0.09, tg = 0.02, netDebt = 0, shares = 1 }) {
    const flows = []; let f = fcf0, pvSum = 0;
    for (let t = 1; t <= years; t++) { const g = Array.isArray(growth) ? growth[Math.min(t - 1, growth.length - 1)] : growth; f *= 1 + g; const pv = f / Math.pow(1 + wacc, t); flows.push({ t, fcf: f, pv }); pvSum += pv; }
    const tv = wacc > tg ? (f * (1 + tg)) / (wacc - tg) : Infinity, pvTv = tv / Math.pow(1 + wacc, years);
    const ev = pvSum + pvTv, equity = ev - netDebt;
    return { flows, pvSum, tv, pvTv, ev, equity, perShare: equity / shares, tvShare: pvTv / ev };
  };
  /** 역DCF: 현재 주가를 정당화하는 연 성장률(앞 years년) */
  ST.reverseDcf = function ({ price, fcf0, years = 10, wacc = 0.09, tg = 0.02, netDebt = 0, shares = 1 }) {
    let lo = -0.5, hi = 1.5;
    const f = (g) => ST.dcf({ fcf0, growth: g, years, wacc, tg, netDebt, shares }).perShare - price;
    if (f(lo) > 0) return lo; if (f(hi) < 0) return hi;
    for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (f(m) > 0) hi = m; else lo = m; }
    return (lo + hi) / 2;
  };

  /* ------------------------------------------------------------ 행렬 (작은 크기) */
  ST.matVec = (A, v) => A.map((row) => row.reduce((s, a, j) => s + a * v[j], 0));
  ST.dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
  ST.inv = function (A) {
    const n = A.length, M = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]];
      const d = M[c][c]; if (Math.abs(d) < 1e-14) return null;
      for (let j = 0; j < 2 * n; j++) M[c][j] /= d;
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[c][j]; }
    }
    return M.map((r) => r.slice(n));
  };
  /** 변동성 배열과 상관 행렬 → 공분산 행렬 (corr가 숫자면 모든 쌍에 같은 상관) */
  ST.covMatrix = (sig, corr) => sig.map((si, i) => sig.map((sj, j) => si * sj * (i === j ? 1 : typeof corr === "number" ? corr : corr[i][j])));

  /* ------------------------------------------------------------ 포트폴리오 */
  /** 비중 w, 기대수익 mu, 공분산 cov → {mu, sigma} */
  ST.port = (w, mu, cov) => ({ mu: ST.dot(w, mu), sigma: Math.sqrt(Math.max(0, ST.dot(w, ST.matVec(cov, w)))) });
  /** 두 자산 투자선: 비중 0~1 → [{w, mu, sigma}] */
  ST.frontier2 = function (a, b, rho, steps = 50) {
    const out = [];
    for (let i = 0; i <= steps; i++) { const w = i / steps; out.push({ w, mu: w * a.mu + (1 - w) * b.mu, sigma: Math.sqrt(w * w * a.sigma ** 2 + (1 - w) ** 2 * b.sigma ** 2 + 2 * w * (1 - w) * rho * a.sigma * b.sigma) }); }
    return out;
  };
  /** 공매도 허용 최소분산 포트폴리오 비중 */
  ST.minVar = function (cov) { const S = ST.inv(cov); if (!S) return null; const one = cov.map(() => 1), x = ST.matVec(S, one), s = ST.sum(x); return x.map((v) => v / s); };
  /** 공매도 허용 접점(최대 샤프) 포트폴리오 비중 */
  ST.tangency = function (mu, cov, rf = 0) { const S = ST.inv(cov); if (!S) return null; const x = ST.matVec(S, mu.map((m) => m - rf)), s = ST.sum(x); return x.map((v) => v / s); };
  /** 공매도 허용 효율적 투자선(목표 수익 범위) → [{mu, sigma, w}] */
  ST.frontier = function (mu, cov, { lo, hi, steps = 40 } = {}) {
    const S = ST.inv(cov); if (!S) return [];
    const one = mu.map(() => 1), Si1 = ST.matVec(S, one), Sim = ST.matVec(S, mu);
    const A = ST.dot(one, Si1), B = ST.dot(one, Sim), C = ST.dot(mu, Sim), D = A * C - B * B;
    lo = lo == null ? Math.min(...mu) : lo; hi = hi == null ? Math.max(...mu) : hi;
    const out = [];
    for (let i = 0; i <= steps; i++) {
      const m = lo + ((hi - lo) * i) / steps, l1 = (C - B * m) / D, l2 = (A * m - B) / D;
      const w = Si1.map((v, k) => l1 * v + l2 * Sim[k]);
      out.push({ mu: m, sigma: Math.sqrt(Math.max(0, (A * m * m - 2 * B * m + C) / D)), w });
    }
    return out;
  };
  /** 공매도 없는 무작위 포트폴리오 n개 → [{w, mu, sigma, sharpe}] */
  ST.randomPortfolios = function (mu, cov, n = 1500, seed = 1, rf = 0) {
    const r = ST.rng(seed), out = [];
    for (let k = 0; k < n; k++) {
      const a = 1 + 3 * r(), e = mu.map(() => Math.pow(-Math.log(r() + 1e-12), a)), s = ST.sum(e), w = e.map((x) => x / s);
      const p = ST.port(w, mu, cov); out.push({ w, mu: p.mu, sigma: p.sigma, sharpe: (p.mu - rf) / p.sigma });
    }
    return out;
  };
  /**
   * 여러 자산 가격으로 리밸런싱 포트폴리오 가치. prices: [자산][시점], w: 목표 비중, every: 리밸런싱 간격(0이면 안 함)
   * → {value:[], weights:[[...]], turnover}
   */
  ST.rebalance = function (prices, w, every = TD, cost = 0) {
    const n = prices.length, T = prices[0].length; let units = w.map((wi, i) => wi / prices[i][0]), turnover = 0;
    const value = [], weights = [];
    for (let t = 0; t < T; t++) {
      let v = 0; for (let i = 0; i < n; i++) v += units[i] * prices[i][t];
      if (every && t > 0 && t % every === 0) {
        const cur = units.map((u, i) => (u * prices[i][t]) / v), tr = ST.sum(cur.map((c, i) => Math.abs(c - w[i]))) / 2;
        turnover += tr; v *= 1 - tr * cost;
        units = w.map((wi, i) => (wi * v) / prices[i][t]);
      }
      value.push(v); weights.push(units.map((u, i) => (u * prices[i][t]) / v));
    }
    return { value, weights, turnover };
  };

  /* ------------------------------------------------------------ 백테스트·자금 관리 */
  /**
   * 한 종목 백테스트. signal: 시점별 목표 비중 배열(0~1, 음수는 공매도) 또는 함수 (i, closes) → 비중.
   * i 시점 신호는 i+1 시점 종가에 체결한다(미래 참조 방지). lookahead:true면 같은 날 체결(일부러 틀리게).
   * opts: {cost(편도 비용률, 기본 수수료+매도세 절반), rf(현금 이자, 연)}
   * → {equity:[], pos:[], trades:[{i, side, price, w}], stats:{total, cagr, vol, sharpe, mdd, trades, exposure, winRate}}
   */
  ST.backtest = function (closes, signal, { cost = ST.roundTrip() / 2, rf = 0, lookahead = false, start = 1 } = {}) {
    const T = closes.length, sig = typeof signal === "function" ? closes.map((_, i) => signal(i, closes)) : signal;
    const equity = [start], pos = [0], trades = []; let w = 0, inPos = 0, entry = 0, wins = 0, rounds = 0;
    for (let i = 1; i < T; i++) {
      const r = closes[i] / closes[i - 1] - 1;
      let e = equity[i - 1] * (1 + w * r + (1 - Math.abs(w)) * (rf / TD));
      const target = lookahead ? (sig[i] == null ? w : sig[i]) : (sig[i - 1] == null ? w : sig[i - 1]);
      if (target !== w) {
        e *= 1 - Math.abs(target - w) * cost;
        trades.push({ i, side: target > w ? "buy" : "sell", price: closes[i], w: target });
        if (w === 0 && target !== 0) { entry = closes[i]; inPos = 1; }
        else if (target === 0 && inPos) { rounds++; if ((closes[i] - entry) * Math.sign(w) > 0) wins++; inPos = 0; }
        w = target;
      }
      equity.push(e); pos.push(w);
    }
    const s = ST.summary(equity);
    s.trades = trades.length; s.exposure = ST.mean(pos.map((p) => (p ? 1 : 0))); s.winRate = rounds ? wins / rounds : NaN;
    return { equity, pos, trades, stats: s };
  };
  /** 적립식: every 거래일마다 amount씩 산다 → {invested, units, value, avgCost, series:[{i, invested, value}]} */
  ST.dca = function (closes, amount, every = 21, cost = ST.KR.fee) {
    let units = 0, invested = 0; const series = [];
    for (let i = 0; i < closes.length; i++) {
      if (i % every === 0) { units += (amount * (1 - cost)) / closes[i]; invested += amount; }
      series.push({ i, invested, value: units * closes[i] });
    }
    return { invested, units, value: units * closes[closes.length - 1], avgCost: invested / units, series };
  };
  /** 켈리 비율: 승률 p, 이길 때 b배 이익(질 때 전액 손실 1) */
  ST.kelly = (p, b, loss = 1) => p / loss - (1 - p) / b;
  /** 연속형 켈리 비중: (μ − r) / σ² */
  ST.kellyCont = (mu, r, sigma) => (mu - r) / (sigma * sigma);

  /* ------------------------------------------------------------ 레버리지·신용 */
  /** 일일 수익률 → 일일 재조정 레버리지 상품 가치 (fee: 연 보수, borrow: 빌린 몫 이자 연) */
  ST.leveraged = function (rets, L = 2, fee = 0.0065, borrow = 0.03, start = 1) {
    const out = [start];
    for (const r of rets) out.push(Math.max(0, out[out.length - 1] * (1 + L * r - fee / TD - Math.max(0, L - 1) * borrow / TD)));
    return out;
  };
  /**
   * 신용 매수 경로. path: 가격 배열, own: 내 돈, loanRatio: 내 돈 대비 빌린 돈(1이면 2배),
   * maintenance: 담보유지비율(1.4), rate: 대출 이자(연).
   * 담보비율 = 주식 평가액 / 대출금. 유지비율 아래로 내려가면 다음 날 종가에 반대매매(전량 매도로 단순화).
   * → {equity:[], ratio:[], loan, callAt(처음 미달 인덱스|-1), liquidatedAt, final}
   */
  ST.marginPath = function (path, { own = 1e7, loanRatio = 1, maintenance = ST.KR.margin.maintenance, rate = ST.KR.margin.rate } = {}) {
    const loan0 = own * loanRatio, units = (own + loan0) / path[0];
    let loan = loan0, callAt = -1, liq = -1; const equity = [], ratio = [];
    for (let i = 0; i < path.length; i++) {
      if (i) loan *= 1 + rate / TD;
      const val = liq >= 0 ? 0 : units * path[i];
      if (liq >= 0) { equity.push(equity[equity.length - 1]); ratio.push(null); continue; }
      const rt = loan ? val / loan : Infinity; ratio.push(rt); equity.push(val - loan);
      if (rt < maintenance && callAt < 0) callAt = i;
      else if (callAt >= 0 && i === callAt + 1) { liq = i; equity[i] = Math.max(-loan, val - loan); }
    }
    return { equity, ratio, loan: loan0, callAt, liquidatedAt: liq, final: equity[equity.length - 1] };
  };

  /* ------------------------------------------------------------ 옵션 */
  /**
   * 블랙-숄즈(배당수익률 q). ST.bs({S, K, T(년), r, sigma, q, type:"call"|"put"})
   * → {price, delta, gamma, vega(1%p당), theta(하루당), rho(1%p당), d1, d2}
   */
  ST.bs = function ({ S, K, T, r = 0.03, sigma = 0.2, q = 0, type = "call" }) {
    if (T <= 0 || sigma <= 0) {
      const iv = type === "call" ? Math.max(0, S - K) : Math.max(0, K - S);
      return { price: iv, delta: type === "call" ? (S > K ? 1 : 0) : (S < K ? -1 : 0), gamma: 0, vega: 0, theta: 0, rho: 0, d1: NaN, d2: NaN };
    }
    const sq = sigma * Math.sqrt(T), d1 = (Math.log(S / K) + (r - q + (sigma * sigma) / 2) * T) / sq, d2 = d1 - sq;
    const eq = Math.exp(-q * T), er = Math.exp(-r * T), N = ST.ncdf, n = ST.npdf;
    const call = type === "call";
    const price = call ? S * eq * N(d1) - K * er * N(d2) : K * er * N(-d2) - S * eq * N(-d1);
    const delta = call ? eq * N(d1) : eq * (N(d1) - 1);
    const gamma = (eq * n(d1)) / (S * sq), vega = (S * eq * n(d1) * Math.sqrt(T)) / 100;
    const theta = (-(S * eq * n(d1) * sigma) / (2 * Math.sqrt(T)) + (call ? q * S * eq * N(d1) - r * K * er * N(d2) : -q * S * eq * N(-d1) + r * K * er * N(-d2))) / 365;
    const rho = (call ? K * T * er * N(d2) : -K * T * er * N(-d2)) / 100;
    return { price, delta, gamma, vega, theta, rho, d1, d2 };
  };
  /** 내재변동성(이분법) */
  ST.impliedVol = function (price, o) { let lo = 1e-4, hi = 5; for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (ST.bs({ ...o, sigma: m }).price > price) hi = m; else lo = m; } return (lo + hi) / 2; };
  /** 이항 트리 옵션 가격(american: 조기 행사 허용) */
  ST.binomial = function ({ S, K, T, r = 0.03, sigma = 0.2, n = 50, type = "call", american = false }) {
    const dt = T / n, u = Math.exp(sigma * Math.sqrt(dt)), d = 1 / u, p = (Math.exp(r * dt) - d) / (u - d), disc = Math.exp(-r * dt);
    const pay = (s) => (type === "call" ? Math.max(0, s - K) : Math.max(0, K - s));
    let v = Array.from({ length: n + 1 }, (_, j) => pay(S * Math.pow(u, j) * Math.pow(d, n - j)));
    for (let i = n - 1; i >= 0; i--) { v = v.slice(0, i + 1).map((_, j) => { const c = disc * (p * v[j + 1] + (1 - p) * v[j]); return american ? Math.max(c, pay(S * Math.pow(u, j) * Math.pow(d, i - j))) : c; }); }
    return v[0];
  };
  /**
   * 만기 손익. legs: [{type:"call"|"put"|"stock"|"future", K, qty(+매수 −매도), premium(옵션 단가), price(주식·선물 진입가)}]
   * ST.payoff(legs, S) → 만기 주가 S에서의 손익
   */
  ST.payoff = (legs, S) => legs.reduce((s, l) => {
    const q = l.qty == null ? 1 : l.qty;
    if (l.type === "call") return s + q * (Math.max(0, S - l.K) - (l.premium || 0));
    if (l.type === "put") return s + q * (Math.max(0, l.K - S) - (l.premium || 0));
    return s + q * (S - l.price);
  }, 0);

  /* ------------------------------------------------------------ 환율 */
  /** 원화 수익률 = (1+현지 수익률)(1+환율 변화) − 1 */
  ST.fxReturn = (rLocal, rFx) => (1 + rLocal) * (1 + rFx) - 1;

  /* ------------------------------------------------------------ 가상의 회사 (모든 숫자는 가상, 원 단위) */
  const E8 = 1e8;
  ST.CO = {
    hanbit: { key: "hanbit", name: "한빛반도체", sector: "반도체", market: "KOSPI", price: 72000, shares: 1e8,
      sales: 60000 * E8, op: 9000 * E8, net: 7200 * E8, da: 6000 * E8, equity: 60000 * E8, assets: 90000 * E8, debt: 20000 * E8, cash: 10000 * E8,
      dps: 1440, fcf: 5000 * E8, growth: 0.08, beta: 1.3, sigma: 0.38, note: "경기에 민감한 대형 제조업. 업황에 따라 이익이 크게 출렁인다." },
    nuri: { key: "nuri", name: "누리식품", sector: "음식료", market: "KOSPI", price: 38000, shares: 2e7,
      sales: 18000 * E8, op: 1100 * E8, net: 800 * E8, da: 500 * E8, equity: 6400 * E8, assets: 10400 * E8, debt: 2000 * E8, cash: 800 * E8,
      dps: 1900, fcf: 750 * E8, growth: 0.03, beta: 0.6, sigma: 0.2, note: "느리지만 꾸준한 생활필수품 회사. 이익의 절반 가까이를 배당한다." },
    byeol: { key: "byeol", name: "별빛바이오", sector: "바이오", market: "KOSDAQ", price: 15000, shares: 5e7,
      sales: 300 * E8, op: -400 * E8, net: -420 * E8, da: 60 * E8, equity: 2500 * E8, assets: 3300 * E8, debt: 500 * E8, cash: 1200 * E8,
      dps: 0, fcf: -450 * E8, growth: 0.6, beta: 1.5, sigma: 0.65, note: "신약 후보 하나에 회사의 운명이 걸린 적자 기업. 임상 결과 하나로 주가가 반토막 나거나 두 배가 된다." },
    daon: { key: "daon", name: "다온은행", sector: "금융", market: "KOSPI", price: 13500, shares: 4e8,
      sales: 40000 * E8, op: 12000 * E8, net: 9000 * E8, da: 800 * E8, equity: 180000 * E8, assets: 3800000 * E8, debt: 0, cash: 0,
      dps: 810, fcf: 8000 * E8, growth: 0.02, beta: 0.9, sigma: 0.25, note: "자산 대부분이 대출인 은행. 장부가치보다 훨씬 싸게 거래된다." },
    moa: { key: "moa", name: "모아플랫폼", sector: "인터넷", market: "KOSPI", price: 120000, shares: 1.5e8,
      sales: 40000 * E8, op: 4000 * E8, net: 3600 * E8, da: 2500 * E8, equity: 60000 * E8, assets: 85000 * E8, debt: 8000 * E8, cash: 15000 * E8,
      dps: 200, fcf: 3000 * E8, growth: 0.2, beta: 1.2, sigma: 0.42, note: "빠르게 크는 플랫폼 기업. 지금 이익보다 미래 성장의 기대가 주가에 담겨 있다." },
  };
  ST.COKEYS = ["hanbit", "nuri", "byeol", "daon", "moa"];
  /** 가상의 시장 지수 이름 */
  ST.INDEX_NAME = "SB 종합지수";

  /* ------------------------------------------------------------ 가상 시장 데이터 (결정적, 한 번만 만든다) */
  /**
   * ST.market() → {
   *   days(거래일 수), dates:["2016-01-04",...], index:[지수 종가], indexCandles:[{o,h,l,c,v}],
   *   stocks:{hanbit:[{o,h,l,c,v}], ...}(마지막 종가가 ST.CO의 price), closes:{hanbit:[...], ...},
   *   regimes:[{from, to, name}], events:[{i, key, text, move}]
   * }
   * 약 10년(2016~2025) 일봉. 상승장·횡보·급락·반등·약세장이 섞여 있다(구간 수익률은 ST.REGIMES의 ret). 같은 값을 모든 장이 공유한다.
   */
  let MARKET = null;
  ST.REGIMES = [
    { len: 400, ret: 0.18, sigma: 0.14, name: "완만한 상승" },
    { len: 160, ret: -0.12, sigma: 0.19, name: "조정" },
    { len: 340, ret: 0.35, sigma: 0.13, name: "강세장" },
    { len: 40, ret: -0.34, sigma: 0.45, name: "급락" },
    { len: 210, ret: 0.45, sigma: 0.26, name: "급반등" },
    { len: 400, ret: 0.2, sigma: 0.16, name: "상승" },
    { len: 250, ret: -0.25, sigma: 0.22, name: "약세장" },
    { len: 300, ret: 0.02, sigma: 0.15, name: "횡보" },
    { len: 500, ret: 0.45, sigma: 0.15, name: "회복과 상승" },
  ];
  ST.market = function () {
    if (MARKET) return MARKET;
    const g = ST.fat(2026, 5), r = ST.rng(91);
    const regimes = []; let t = 0;
    for (const R of ST.REGIMES) { regimes.push({ from: t, to: t + R.len, name: R.name, ret: R.ret }); t += R.len; }
    const days = t + 1, mret = [0];
    for (const R of ST.REGIMES) {
      // 구간 수익률이 정확히 R.ret이 되도록 잡음의 평균을 뺀다
      const z = Array.from({ length: R.len }, () => (R.sigma / Math.sqrt(TD)) * g()), zm = ST.mean(z), d = Math.log(1 + R.ret) / R.len;
      for (const x of z) mret.push(d + x - zm);
    }
    const idx = [2000]; for (let i = 1; i < days; i++) idx.push(idx[i - 1] * Math.exp(mret[i]));
    const events = [];
    const stocks = {}, closes = {};
    ST.COKEYS.forEach((key, s) => {
      const c = ST.CO[key], gs = ST.gauss(500 + s * 31), rs = ST.rng(900 + s * 17);
      const idio = Math.sqrt(Math.max(0.01, c.sigma * c.sigma - c.beta * c.beta * 0.165 * 0.165)) / Math.sqrt(TD);
      const lr = [0];
      for (let i = 1; i < days; i++) {
        let x = c.beta * mret[i] + idio * gs();
        if (key === "byeol" && rs() < 6 / TD) { const mv = (rs() < 0.45 ? -1 : 1) * (0.12 + 0.18 * rs()); x += mv; events.push({ i, key, move: mv, text: mv > 0 ? "임상 결과 기대감" : "임상 지연 공시" }); }
        if (key === "hanbit" && rs() < 2 / TD) { const mv = (rs() < 0.5 ? -1 : 1) * (0.05 + 0.05 * rs()); x += mv; events.push({ i, key, move: mv, text: mv > 0 ? "실적 서프라이즈" : "실적 쇼크" }); }
        lr.push(ST.clamp(x, Math.log(0.7), Math.log(1.3)));
      }
      const raw = [1]; for (let i = 1; i < days; i++) raw.push(raw[i - 1] * Math.exp(lr[i]));
      const k = c.price / raw[days - 1];
      const cl = raw.map((x) => ST.roundTick(x * k)); cl[days - 1] = c.price;
      const cand = ST.ohlc(cl, { seed: 300 + s, tick: true, vol0: Math.round(4e10 / c.price * (0.5 + r())), sigma: c.sigma });
      stocks[key] = cand; closes[key] = cand.map((d) => d.c);
    });
    const indexCandles = ST.ohlc(idx, { seed: 11, vol0: 4e8, sigma: 0.165 });
    MARKET = { days, dates: ST.tradingDays("2016-01-04", days), index: idx, indexCandles, stocks, closes, regimes, events, mret };
    return MARKET;
  };

  /**
   * 가상의 종목 유니버스(월간). 팩터·생존 편향·백테스트 실험용.
   * ST.universe({n:300, months:120, seed:11}) → {
   *   months, market:[월 수익률], stocks:[{id, name, size, value, quality, lowvol, rets:[월 수익률|null(상장폐지 뒤)], price:[], delistedAt(-1|월)}],
   *   factors:{value:[], size:[], mom:[], quality:[], lowvol:[]}(팩터 월 수익률)
   * }
   * 팩터 프리미엄(교육용 가정, 연): 가치 3%, 소형 2%, 퀄리티 2.5%, 저변동 1.5%, 모멘텀은 지난 수익의 지속성으로 생긴다.
   */
  const UNI = {};
  ST.universe = function ({ n = 300, months = 120, seed = 11 } = {}) {
    const key = n + ":" + months + ":" + seed; if (UNI[key]) return UNI[key];
    const g = ST.gauss(seed), r = ST.rng(seed + 1);
    const mkt = [], F = { value: [], size: [], quality: [], lowvol: [], mom: [] };
    for (let t = 0; t < months; t++) {
      mkt.push(0.07 / 12 + (0.16 / Math.sqrt(12)) * g());
      F.value.push(0.03 / 12 + (0.10 / Math.sqrt(12)) * g());
      F.size.push(0.02 / 12 + (0.09 / Math.sqrt(12)) * g());
      F.quality.push(0.025 / 12 + (0.06 / Math.sqrt(12)) * g());
      F.lowvol.push(0.015 / 12 + (0.07 / Math.sqrt(12)) * g());
    }
    const stocks = [];
    const syl = ["가", "나", "다", "라", "마", "바", "사", "아", "자", "차", "카", "타", "파", "하", "온", "솔", "빛", "결", "별", "들"];
    for (let k = 0; k < n; k++) {
      const z = () => g();
      const s = { id: k, name: syl[Math.floor(r() * 20)] + syl[Math.floor(r() * 20)] + ["전자", "화학", "제약", "건설", "유통", "에너지", "금융", "소재", "기계", "게임"][Math.floor(r() * 10)],
        size: z(), value: z(), quality: z(), lowvol: z(), beta: 0, rets: [], price: [1], delistedAt: -1, drift: 0 };
      s.beta = ST.clamp(1 - 0.25 * s.lowvol + 0.2 * g(), 0.3, 2);
      const idio = (0.22 + 0.1 * Math.max(0, -s.size) + 0.06 * Math.max(0, -s.lowvol)) / Math.sqrt(12);
      for (let t = 0; t < months; t++) {
        if (s.delistedAt >= 0) { s.rets.push(null); s.price.push(null); continue; }
        s.drift = 0.8 * s.drift + 0.007 * g(); // 지속되는 개별 추세 → 모멘텀
        const x = s.beta * mkt[t] + 0.25 * (s.value * F.value[t] - s.size * F.size[t] + s.quality * F.quality[t] + s.lowvol * F.lowvol[t]) - 0.0015 * Math.max(0, -s.quality) + s.drift + idio * g();
        const ret = Math.max(-0.95, Math.exp(x) - 1);
        s.rets.push(ret); s.price.push(s.price[s.price.length - 1] * (1 + ret));
        if (s.price[s.price.length - 1] < 0.15 || (s.quality < -1.2 && r() < 0.004)) { s.delistedAt = t; s.rets[t] = -0.9; s.price[s.price.length - 1] *= 0.1; }
      }
      stocks.push(s);
    }
    for (let t = 0; t < months; t++) {
      const live = stocks.filter((s) => s.rets[t] != null);
      if (t < 12) { F.mom.push(0); continue; }
      const past = (s) => { let p = 1; for (let j = t - 12; j < t - 1; j++) p *= 1 + (s.rets[j] == null ? -1 : s.rets[j]); return p; };
      const ranked = live.map((s) => ({ s, p: past(s) })).sort((a, b) => b.p - a.p), q = Math.floor(ranked.length * 0.3);
      F.mom.push(ST.mean(ranked.slice(0, q).map((x) => x.s.rets[t])) - ST.mean(ranked.slice(-q).map((x) => x.s.rets[t])));
    }
    return (UNI[key] = { months, market: mkt, stocks, factors: F });
  };

  /* ------------------------------------------------------------ 이어지는 케이스: 한결의 투자 노트 */
  ST.HG = {
    name: "이한결", age: 27, start: "2026-10",
    salary: 36e6,              // 세전 연봉(MoneyBook과 같은 인물)
    emergency: 6e6,            // 비상금(이미 마련, 투자하지 않는다)
    seed: 10e6,                // 첫 투자금
    monthly: 700000,           // 매달 주식에 넣는 돈(월 저축 100만원 중 70%)
    bondMonthly: 300000,       // 채권·예금 쪽(이 책에서는 다루기만 한다)
    horizon: 33,               // 60세까지
    maxDrawdown: -0.3,         // 견딜 수 있다고 정한 평가손실(MoneyBook 12장)
    core: 0.8, satellite: 0.2, // 이 책 끝에서 정하는 구조: 지수 80% + 직접 고른 종목 20%
  };

  if (typeof module !== "undefined" && module.exports) module.exports = ST;
  else root.ST = ST;
})(typeof window !== "undefined" ? window : globalThis);
