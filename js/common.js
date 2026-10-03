/* Copyright (c) 2026 geniuskey and StockBook contributors.
   Executable code: MIT (see ../LICENSE-MIT).
   Educational content and illustrations: CC-BY-4.0 (see ../LICENSE.md). */
/* ==========================================================================
   StockBook 공통 스크립트 — 전역 객체 MB
   - 레이아웃(상단바, 목차, 이전/다음, 테마) 자동 생성
   - 시뮬레이터 헬퍼: canvas, chart, bars, donut, range, seg, drag, 색/난수/포맷
   이 파일은 <head>에서 defer 없이 로드된다. 페이지 스크립트는 </body> 직전에 둔다.
   ========================================================================== */
(function () {
  "use strict";

  // stage: 이 책의 여섯 부(STAGES의 인덱스). 실험실·용어집처럼 부가 없는 장은 생략한다.
  const STAGES = [
    { key: "market",   name: "시장",   en: "Market" },
    { key: "company",  name: "기업",   en: "Company" },
    { key: "price",    name: "가격",   en: "Price" },
    { key: "risk",     name: "위험",   en: "Risk" },
    { key: "strategy", name: "전략",   en: "Strategy" },
    { key: "context",  name: "환경",   en: "Context" },
  ];

  const CHAPTERS = [
    { slug: "overview",    num: "01", stage: 0, title: "주식이란 무엇인가",         desc: "주식은 회사의 한 조각이다. 지분과 의결권, 이익에 대한 청구권, 유한책임. 창업에서 상장까지 지분이 쪼개지는 과정.", tags: ["시장", "sim"] },
    { slug: "market",      num: "02", stage: 0, title: "주식시장의 구조",           desc: "발행시장과 유통시장, 거래소와 증권사, KOSPI와 KOSDAQ, 결제 T+2, 시가총액과 유동주식, 가격제한폭과 서킷브레이커.", tags: ["시장", "sim"] },
    { slug: "orderbook",   num: "03", stage: 0, title: "호가창과 체결",             desc: "가격은 주문이 만난 곳에서 정해진다. 지정가·시장가, 가격·시간 우선, 호가 단위, 스프레드와 시장 충격, 동시호가.", tags: ["시장", "sim"] },
    { slug: "price",       num: "04", stage: 0, title: "주가는 왜 움직이는가",       desc: "수요와 공급, 정보와 기대, 랜덤워크와 효율적 시장 가설. 뉴스가 가격에 반영되는 속도와 소음.", tags: ["시장", "sim"] },
    { slug: "statements",  num: "05", stage: 1, title: "재무제표 읽기",             desc: "손익계산서, 재무상태표, 현금흐름표. 매출에서 순이익까지의 폭포, 회계 이익과 현금의 차이, 분식의 신호.", tags: ["기업", "sim"] },
    { slug: "ratios",      num: "06", stage: 1, title: "투자 지표",                 desc: "EPS·PER·PBR·ROE·배당수익률·EV/EBITDA. 듀퐁 분해, 지표가 서로 묶이는 방식, 낮은 PER의 함정.", tags: ["기업", "sim"] },
    { slug: "valuation",   num: "07", stage: 1, title: "가치평가",                  desc: "기업의 값은 미래 현금흐름의 현재가치다. DCF, 할인율과 영구성장률, 고든 성장 모형, 역DCF, 안전마진.", tags: ["기업", "sim"] },
    { slug: "dividend",    num: "08", stage: 1, title: "배당과 주주환원",            desc: "배당락에서 주가가 빠지는 이유, 배당 재투자의 복리, 자사주 매입과 소각, 배당성향과 지속 가능성.", tags: ["기업", "sim"] },
    { slug: "corporate",   num: "09", stage: 1, title: "기업 이벤트",               desc: "유상증자와 희석, 무상증자와 액면분할, 감자, 전환사채, IPO 공모가와 상장 첫날, 인수합병과 상장폐지.", tags: ["기업", "sim"] },
    { slug: "return",      num: "10", stage: 2, title: "수익률의 수학",              desc: "단순·로그 수익률, 총수익, 연환산과 CAGR, 산술평균과 기하평균의 차이, 변동성이 수익을 갉아먹는 끌림.", tags: ["가격", "sim"] },
    { slug: "chart",       num: "11", stage: 2, title: "차트 읽기",                 desc: "캔들의 네 가격, 거래량, 이동평균, 로그 축과 선형 축, 일봉·주봉·월봉, 수정주가.", tags: ["가격", "sim"] },
    { slug: "technical",   num: "12", stage: 2, title: "기술적 분석과 그 한계",       desc: "RSI·MACD·볼린저 밴드·지지와 저항. 그리고 무작위 데이터에서도 보이는 패턴, 거래 비용 뒤에 남는 것.", tags: ["가격", "sim"] },
    { slug: "risk",        num: "13", stage: 3, title: "위험과 분산",               desc: "변동성과 최대 낙폭, 체계적·비체계적 위험, 종목 수와 분산 효과, 상관관계, 베타, 꼬리 위험.", tags: ["위험", "sim"] },
    { slug: "portfolio",   num: "14", stage: 3, title: "포트폴리오 이론",            desc: "평균-분산, 효율적 투자선, 무위험 자산과 자본시장선, 샤프 비율, CAPM, 리밸런싱.", tags: ["위험", "sim"] },
    { slug: "index",       num: "15", stage: 3, title: "지수와 ETF",                desc: "지수는 어떻게 계산되는가. 시가총액·동일가중, ETF의 설정·환매와 괴리, 추적오차, 레버리지 ETF의 함정.", tags: ["위험", "sim"] },
    { slug: "factor",      num: "16", stage: 3, title: "팩터 투자",                 desc: "가치, 모멘텀, 규모, 퀄리티, 저변동성. 팩터 수익의 근거와 긴 침체기, 스마트 베타.", tags: ["위험", "sim"] },
    { slug: "backtest",    num: "17", stage: 4, title: "백테스트의 함정",            desc: "과거로 전략을 시험한다. 생존 편향, 미래 참조, 과최적화와 데이터 스누핑, 표본 밖 검증.", tags: ["전략", "sim"] },
    { slug: "strategy",    num: "18", stage: 4, title: "매매 규칙과 자금 관리",       desc: "적립식과 일시 투자, 손절과 익절, 포지션 크기, 켈리 기준, 파산 확률, 리밸런싱 규칙.", tags: ["전략", "sim"] },
    { slug: "leverage",    num: "19", stage: 4, title: "레버리지·신용·공매도",        desc: "빌린 돈으로 사면 무엇이 달라지는가. 신용거래와 반대매매, 담보비율, 공매도와 숏스퀴즈.", tags: ["전략", "sim"] },
    { slug: "derivatives", num: "20", stage: 4, title: "선물과 옵션",               desc: "손익 그래프로 보는 파생상품. 선물의 증거금, 콜·풋, 블랙-숄즈, 그릭스, 커버드콜과 보호적 풋.", tags: ["전략", "sim"] },
    { slug: "macro",       num: "21", stage: 5, title: "금리·경기·주식",            desc: "금리가 오르면 주가가 내리는 이유, 경기 순환과 업종 순환, 실적 시즌, 인플레이션과 주식.", tags: ["환경", "sim"] },
    { slug: "global",      num: "22", stage: 5, title: "해외 주식과 환율",          desc: "미국 시장, 환율이 수익률에 섞이는 방식, 환헤지, 국가 분산, 시차와 거래 시간.", tags: ["환경", "sim"] },
    { slug: "tax",         num: "23", stage: 5, title: "세금과 거래 비용",          desc: "증권거래세와 수수료, 배당소득세, 해외 주식 양도세 250만원 공제, 금융소득 종합과세, ISA·연금계좌.", tags: ["환경", "sim"] },
    { slug: "psychology",  num: "24", stage: 5, title: "투자자의 심리",             desc: "손실 회피와 처분 효과, 과잉 매매, 군집과 버블, 확증 편향. 왜 알면서도 고점에 사는가.", tags: ["환경", "sim"] },
    { slug: "lab",         num: "25",           title: "모의투자 실험실",           desc: "가상의 시장에서 직접 사고판다. 호가창, 차트, 뉴스, 수수료와 세금까지. 내 매매를 지수와 비교한다.", tags: ["실험실", "sim"] },
    { slug: "glossary",    num: "26",           title: "용어집 & 종합 퀴즈",        desc: "핵심 주식 용어를 검색하고, 종합 퀴즈로 실력을 점검하자.", tags: ["정리"] },
  ];
  const MB = (window.MB = {});
  MB.CHAPTERS = CHAPTERS;
  MB.STAGES = STAGES;

  /* ------------------------------------------------------------ math utils */
  MB.clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  MB.lerp = (a, b, t) => a + (b - a) * t;
  MB.map = (x, a, b, c, d) => c + ((x - a) * (d - c)) / (b - a);
  MB.randn = function () {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  MB.poisson = function (lambda) {
    if (lambda <= 0) return 0;
    if (lambda > 40) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * MB.randn()));
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
  };
  /** 숫자 포맷: 유효 자리 */
  MB.fmt = function (x, digits = 3) {
    if (!isFinite(x)) return "—";
    if (x === 0) return "0";
    const a = Math.abs(x);
    if (a >= 1e5 || a < 1e-3) return x.toExponential(digits - 1).replace("e+", "e");
    return Number(x.toPrecision(digits)).toLocaleString("en-US", { maximumFractionDigits: 6 });
  };
  /**
   * 원화 포맷: MB.won(123456789) → "1억 2,346만원", MB.won(8500) → "8,500원"
   * digits: 만원 단위 아래 반올림 기준(기본 0 → 만원 단위). short=true면 "원"을 뺀다.
   */
  MB.won = function (x, opt = {}) {
    if (!isFinite(x)) return "—";
    const neg = x < 0, a = Math.abs(x), unit = opt.short ? "" : "원";
    let s;
    if (a < 1e5 && !opt.digits) s = Math.round(a).toLocaleString("ko-KR") + unit;
    else {
      const man = Math.round(a / 1e4 * Math.pow(10, opt.digits || 0)) / Math.pow(10, opt.digits || 0);
      const eok = Math.floor(man / 1e4), rest = Math.round((man - eok * 1e4) * 100) / 100;
      if (eok >= 1e4) s = (Math.floor(eok / 1e4)).toLocaleString("ko-KR") + "조" + (eok % 1e4 ? " " + (eok % 1e4).toLocaleString("ko-KR") + "억" : "") + unit;
      else if (eok > 0) s = eok.toLocaleString("ko-KR") + "억" + (rest ? " " + rest.toLocaleString("ko-KR") + "만" : "") + unit;
      else s = rest.toLocaleString("ko-KR") + "만" + unit;
    }
    return (neg ? "−" : "") + s.trim();
  };
  /** 축 눈금용 짧은 원화: 1.2억, 3,500만, 800만, 5만, 9천 */
  MB.wonAxis = function (x) {
    const a = Math.abs(x), sg = x < 0 ? "−" : "";
    if (a >= 1e12) return sg + +(a / 1e12).toFixed(1) + "조";
    if (a >= 1e8) return sg + +(a / 1e8).toFixed(a >= 1e9 ? 0 : 1) + "억";
    if (a >= 1e5) return sg + Math.round(a / 1e4).toLocaleString("ko-KR") + "만";
    if (a >= 1e4) return sg + +(a / 1e4).toFixed(1) + "만";
    if (a >= 1e3) return sg + +(a / 1e3).toFixed(1) + "천";
    return sg + Math.round(a);
  };
  /** 퍼센트: MB.pct(0.0345) → "3.45%" */
  MB.pct = (x, digits = 2) => (isFinite(x) ? +(x * 100).toFixed(digits) + "%" : "—");


  /** 오차 함수 (Abramowitz–Stegun 7.1.26, |ε| < 1.5e-7) */
  MB.erf = function (x) {
    const s = Math.sign(x); x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  };
  MB.erfc = (x) => 1 - MB.erf(x);
  /** 캔버스 글꼴 문자열: MB.font(12) / MB.font(11, true) */
  MB.font = function (px, mono, weight) {
    const cs = getComputedStyle(document.body);
    return (weight ? weight + " " : "") + px + "px " + (mono ? cs.getPropertyValue("--mono") : cs.getPropertyValue("--font"));
  };
  /** 호출을 묶어 마지막 한 번만 실행 */
  MB.debounce = function (fn, ms = 120) { let t = 0; return function () { const a = arguments; clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); }; };
  /** 정규 난수 시드 고정용 간단 PRNG (mulberry32) */
  MB.rng = function (seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  /** 시드 고정 정규 난수 함수: const g = MB.randnSeeded(7); g() */
  MB.randnSeeded = function (seed) {
    const r = MB.rng(seed);
    return function () { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  };

  /* ------------------------------------------------------------ theme */
  const themeCbs = [];
  MB.onTheme = (cb) => themeCbs.push(cb);
  MB.isDark = function () {
    const t = document.documentElement.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  };
  /** CSS 변수 값 읽기: MB.color('accent') */
  MB.color = function (name) {
    return getComputedStyle(document.documentElement).getPropertyValue("--" + name).trim();
  };
  /** 자주 쓰는 색 묶음 (테마 변경 시 다시 호출할 것) */
  MB.palette = function () {
    const c = MB.color;
    return {
      bg: c("canvas-bg"), text: c("text"), dim: c("text-dim"), faint: c("text-faint"),
      grid: c("grid"), axis: c("axis"), border: c("border"), surface: c("surface"),
      accent: c("accent"), accent2: c("accent-2"), ok: c("ok"), warn: c("warn"), bad: c("bad"),
      red: c("red"), green: c("green"), blue: c("blue"), up: c("up"), down: c("down"), upSoft: c("up-soft"), downSoft: c("down-soft"),
      // 데이터 시리즈용 기본 순서
      series: [c("accent"), c("accent-2"), c("warn"), c("ok"), c("bad"), c("text-dim")],
    };
  };
  function applyTheme(t) {
    if (t) document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
    themeCbs.forEach((cb) => { try { cb(); } catch (e) { console.error(e); } });
  }
  try { const saved = localStorage.getItem("sb-theme"); if (saved) document.documentElement.setAttribute("data-theme", saved); } catch (e) {}
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
      if (!document.documentElement.getAttribute("data-theme")) applyTheme(null);
    });
  }

  /* ------------------------------------------------------------ canvas helper */
  /**
   * HiDPI 캔버스. 폭은 부모 폭을 따르고 높이는 aspect(높이/폭) 또는 height(px)로 결정.
   * draw(ctx, w, h)는 리사이즈·테마 변경 시 자동 호출된다. 애니메이션이면 직접 redraw() 호출.
   *   const cv = MB.canvas(el, (ctx,w,h)=>{...}, {aspect:0.5, maxHeight: 420});
   *   cv.redraw(); cv.ctx; cv.w; cv.h
   */
  MB.canvas = function (canvas, draw, opts = {}) {
    if (typeof canvas === "string") canvas = document.querySelector(canvas);
    const ctx = canvas.getContext("2d");
    const st = { ctx, w: 0, h: 0, canvas, dpr: 1 };
    function resize() {
      const parent = canvas.parentElement;
      const w = Math.max(200, Math.floor(opts.width || parent.clientWidth || 600));
      let h = opts.height || Math.round(w * (opts.aspect || 0.5));
      if (opts.minHeight) h = Math.max(h, opts.minHeight);
      if (opts.maxHeight) h = Math.min(h, opts.maxHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      st.w = w; st.h = h; st.dpr = dpr;
      st.redraw();
    }
    st.redraw = function () {
      if (!st.w) return;
      ctx.save();
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      if (!opts.noClear) {
        ctx.clearRect(0, 0, st.w, st.h);
        ctx.fillStyle = canvas.closest(".sim-view.scope") ? "#0b0d12" : MB.color("canvas-bg");
        ctx.fillRect(0, 0, st.w, st.h);
      }
      try { draw && draw(ctx, st.w, st.h); } finally { ctx.restore(); }
    };
    st.resize = resize;
    if (window.ResizeObserver) {
      let lastW = -1;
      new ResizeObserver(() => { const w = canvas.parentElement.clientWidth; if (w !== lastW) { lastW = w; resize(); } }).observe(canvas.parentElement);
    } else window.addEventListener("resize", resize);
    MB.onTheme(() => st.redraw());
    resize();
    return st;
  };

  /**
   * 화면에 보일 때만 도는 애니메이션 루프. fn(dt초, t초)
   *   const loop = MB.loop(el, (dt,t)=>{...}); loop.stop(); loop.start();
   */
  MB.loop = function (el, fn) {
    let raf = 0, last = 0, t = 0, visible = true, running = true;
    function frame(ts) {
      raf = 0;
      if (!running || !visible) return;
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
      last = ts; t += dt;
      fn(dt, t);
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && running && visible) { last = 0; raf = requestAnimationFrame(frame); } }
    if (window.IntersectionObserver && el) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; kick(); }).observe(el);
    }
    kick();
    return {
      start() { running = true; kick(); },
      stop() { running = false; },
      get running() { return running; },
      toggle() { running ? (running = false) : ((running = true), kick()); return running; },
    };
  };

  /* ------------------------------------------------------------ chart helper */
  /**
   * 간단한 선 그래프. box = {x,y,w,h}(생략 시 캔버스 전체에 여백 자동)
   * opts: { x:[min,max], y:[min,max], logX, logY, xLabel, yLabel, xTicks, yTicks,
   *         xFmt, yFmt, series:[{data:[[x,y],...], color, width, dash, fill, label}],
   *         vlines:[{x,color,label,dash}], hlines:[{y,color,label,dash}], points:[{x,y,color,r,label}],
   *         bands:[{x0,x1,color}] }
   * 반환: { X(v)->px, Y(v)->px, box }
   */
  MB.chart = function (ctx, box, opts) {
    const P = MB.palette();
    const dpr = (ctx.getTransform && ctx.getTransform().a) || 1;
    const W = ctx.canvas.width / dpr, H = ctx.canvas.height / dpr;
    if (!box) box = { x: 58, y: 16, w: W - 58 - 18, h: H - 16 - 46 };
    const [x0, x1] = opts.x, [y0, y1] = opts.y;
    const lx = (v) => (opts.logX ? Math.log10(v) : v);
    const ly = (v) => (opts.logY ? Math.log10(v) : v);
    const X = (v) => box.x + ((lx(v) - lx(x0)) / (lx(x1) - lx(x0))) * box.w;
    const Y = (v) => box.y + box.h - ((ly(v) - ly(y0)) / (ly(y1) - ly(y0))) * box.h;
    const ticks = (a, b, log, n) => {
      if (log) { const out = []; for (let e = Math.ceil(Math.log10(a) - 1e-9); e <= Math.log10(b) + 1e-9; e++) out.push(Math.pow(10, e)); return out; }
      const span = b - a, raw = span / (n || 5), mag = Math.pow(10, Math.floor(Math.log10(raw)));
      const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= (n || 5) + 0.5) || raw;
      const out = []; for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + step * 1e-6; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
      return out;
    };
    const defFmt = (v) => (Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-2 && v !== 0) ? v.toExponential(0).replace("e+", "e") : String(Number(v.toPrecision(4))));
    const xFmt = opts.xFmt || defFmt, yFmt = opts.yFmt || defFmt;
    ctx.save();
    ctx.font = "11px " + getComputedStyle(document.body).getPropertyValue("--mono");
    ctx.lineWidth = 1;
    // bands
    (opts.bands || []).forEach((b) => { ctx.fillStyle = b.color; ctx.fillRect(X(b.x0), box.y, X(b.x1) - X(b.x0), box.h); });
    // grid + ticks
    const xt = opts.xTicks || ticks(x0, x1, opts.logX, 6);
    const yt = opts.yTicks || ticks(y0, y1, opts.logY, 5);
    ctx.strokeStyle = P.grid; ctx.fillStyle = P.dim;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    xt.forEach((v) => { const px = X(v); if (px < box.x - 1 || px > box.x + box.w + 1) return; ctx.beginPath(); ctx.moveTo(px, box.y); ctx.lineTo(px, box.y + box.h); ctx.stroke(); const s = xFmt(v), ko = /[가-힣]/.test(s); if (ko) ctx.font = "11px " + getComputedStyle(document.body).getPropertyValue("--font"); ctx.fillText(s, px, box.y + box.h + 6); if (ko) ctx.font = "11px " + getComputedStyle(document.body).getPropertyValue("--mono"); });
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    let yTickW = 0;
    yt.forEach((v) => { const py = Y(v); if (py < box.y - 1 || py > box.y + box.h + 1) return; ctx.beginPath(); ctx.moveTo(box.x, py); ctx.lineTo(box.x + box.w, py); ctx.stroke(); const s = yFmt(v), ko = /[가-힣]/.test(s); if (ko) ctx.font = "11px " + getComputedStyle(document.body).getPropertyValue("--font"); yTickW = Math.max(yTickW, ctx.measureText(s).width); ctx.fillText(s, box.x - 6, py); if (ko) ctx.font = "11px " + getComputedStyle(document.body).getPropertyValue("--mono"); });
    ctx.strokeStyle = P.axis;
    ctx.beginPath(); ctx.moveTo(box.x, box.y); ctx.lineTo(box.x, box.y + box.h); ctx.lineTo(box.x + box.w, box.y + box.h); ctx.stroke();
    // labels
    ctx.fillStyle = P.dim; ctx.font = "12px " + getComputedStyle(document.body).getPropertyValue("--font");
    if (opts.xLabel) { ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(opts.xLabel, box.x + box.w / 2, box.y + box.h + 40); }
    if (opts.yLabel) { ctx.save(); ctx.translate(Math.max(8, box.x - Math.max(44, yTickW + 16)), box.y + box.h / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(opts.yLabel, 0, 0); ctx.restore(); }
    // clip plot area
    ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y - 2, box.w + 2, box.h + 4); ctx.clip();
    (opts.series || []).forEach((s, i) => {
      if (!s.data || !s.data.length) return;
      ctx.strokeStyle = s.color || P.series[i % P.series.length];
      ctx.lineWidth = s.width || 2; ctx.setLineDash(s.dash || []);
      ctx.beginPath();
      let started = false;
      s.data.forEach(([x, y]) => { if (!isFinite(y) || (opts.logY && y <= 0) || (opts.logX && x <= 0)) { started = false; return; } const px = X(x), py = Y(y); started ? ctx.lineTo(px, py) : ctx.moveTo(px, py); started = true; });
      ctx.stroke();
      if (s.fill) {
        ctx.lineTo(X(s.data[s.data.length - 1][0]), Y(opts.logY ? y0 : Math.max(y0, 0)));
        ctx.lineTo(X(s.data[0][0]), Y(opts.logY ? y0 : Math.max(y0, 0)));
        ctx.closePath(); ctx.fillStyle = s.fill; ctx.fill();
      }
      ctx.setLineDash([]);
    });
    (opts.vlines || []).forEach((l) => { ctx.strokeStyle = l.color || P.faint; ctx.setLineDash(l.dash || [4, 4]); ctx.lineWidth = l.width || 1.2; ctx.beginPath(); ctx.moveTo(X(l.x), box.y); ctx.lineTo(X(l.x), box.y + box.h); ctx.stroke(); ctx.setLineDash([]); if (l.label) { ctx.fillStyle = l.color || P.dim; ctx.textBaseline = "top"; const flip = X(l.x) + 4 + ctx.measureText(l.label).width > box.x + box.w; ctx.textAlign = flip ? "right" : "left"; ctx.fillText(l.label, X(l.x) + (flip ? -4 : 4), box.y + 4); } });
    (opts.hlines || []).forEach((l) => { ctx.strokeStyle = l.color || P.faint; ctx.setLineDash(l.dash || [4, 4]); ctx.lineWidth = l.width || 1.2; ctx.beginPath(); ctx.moveTo(box.x, Y(l.y)); ctx.lineTo(box.x + box.w, Y(l.y)); ctx.stroke(); ctx.setLineDash([]); if (l.label) { ctx.fillStyle = l.color || P.dim; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText(l.label, box.x + box.w - 4, Y(l.y) - 3); } });
    (opts.points || []).forEach((p) => { ctx.fillStyle = p.color || P.accent; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), p.r || 4, 0, Math.PI * 2); ctx.fill(); if (p.label) { ctx.fillStyle = P.text; ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText(p.label, X(p.x) + 6, Y(p.y) - 4); } });
    ctx.restore();
    ctx.restore();
    return { X, Y, box };
  };

  /* ------------------------------------------------------------ controls */
  /**
   * range 입력 바인딩. output은 id+"-out" 요소 또는 <output for=id>.
   *   const get = MB.range('wl', v => v+' nm', v => redraw());  get() → 현재 값(Number)
   */
  MB.range = function (id, fmt, onInput) {
    const el = typeof id === "string" ? document.getElementById(id) : id;
    const out = document.getElementById(el.id + "-out") || document.querySelector(`output[for="${el.id}"]`);
    const update = (fire) => {
      const v = Number(el.value);
      const pct = ((v - Number(el.min || 0)) / (Number(el.max || 100) - Number(el.min || 0))) * 100;
      el.style.setProperty("--fill", pct + "%");
      if (out) out.textContent = fmt ? fmt(v) : String(v);
      if (fire && onInput) onInput(v);
    };
    el.addEventListener("input", () => update(true));
    update(false);
    const get = () => Number(el.value);
    get.set = (v) => { el.value = v; update(true); };
    get.el = el;
    return get;
  };
  /**
   * 세그먼트 버튼: <div class="seg" id="mode"><button data-value="a" class="on">A</button>...</div>
   *   const mode = MB.seg('mode', v => redraw());  mode() → 현재 값
   */
  MB.seg = function (id, onChange) {
    const el = typeof id === "string" ? document.getElementById(id) : id;
    const btns = [...el.querySelectorAll("button")];
    let cur = (btns.find((b) => b.classList.contains("on")) || btns[0]).dataset.value;
    const set = (v, fire = true) => {
      cur = v;
      btns.forEach((b) => { const on = b.dataset.value === v; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
      if (fire && onChange) onChange(v);
    };
    btns.forEach((b) => b.addEventListener("click", () => set(b.dataset.value)));
    set(cur, false);
    const get = () => cur;
    get.set = set;
    return get;
  };
  /**
   * 캔버스 위 끌기(마우스·터치). 좌표는 CSS px.
   *   MB.drag(cv.canvas, { start(x, y, e) {}, move(x, y, e) {}, end() {}, hover(x, y, e) {} });
   * 누르는 순간 start와 move가 한 번씩 불린다. 끄는 동안 페이지 스크롤은 막힌다.
   */
  MB.drag = function (canvas, on) {
    if (typeof canvas === "string") canvas = document.querySelector(canvas);
    canvas.classList.add("drag");
    let act = false;
    const pos = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    canvas.addEventListener("pointerdown", (e) => { act = true; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} const [x, y] = pos(e); if (on.start) on.start(x, y, e); if (on.move) on.move(x, y, e); e.preventDefault(); });
    canvas.addEventListener("pointermove", (e) => { const [x, y] = pos(e); if (act) { if (on.move) on.move(x, y, e); } else if (on.hover) on.hover(x, y, e); });
    const up = () => { if (act) { act = false; if (on.end) on.end(); } };
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
  };
  /** 통계 표시: MB.stat('snr', '32.1 dB') → id 요소의 textContent 설정(HTML 허용) */
  MB.stat = function (id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; };

  /* ------------------------------------------------------------ bar / donut */
  /**
   * 막대(누적 가능) 그래프. MB.chart와 같은 축을 쓴다.
   *   MB.bars(ctx, box|null, { labels:["1월",...], stacks:[{label, color, data:[...]}, ...],
   *     y:[min,max](생략 시 자동), yFmt, yLabel, gap:0.28, hlines, highlight: 인덱스, valueFmt(합계 표시) })
   * 음수 값은 0 아래로 쌓는다. 반환: { X(i) 막대 중심 px, Y(v), box, bw(막대 폭) }
   */
  MB.bars = function (ctx, box, o) {
    const P = MB.palette();
    const n = o.labels.length, stacks = o.stacks;
    let lo = 0, hi = 0;
    for (let i = 0; i < n; i++) {
      let p = 0, m = 0;
      stacks.forEach((s) => { const v = s.data[i] || 0; if (v >= 0) p += v; else m += v; });
      hi = Math.max(hi, p); lo = Math.min(lo, m);
    }
    const y = o.y || [lo * 1.08, hi * 1.08 || 1];
    const xLab = (o.labels.length > 14) ? Math.ceil(o.labels.length / 12) : 1;
    const c = MB.chart(ctx, box, { x: [0, n], y, yFmt: o.yFmt, yLabel: o.yLabel, xLabel: o.xLabel, xTicks: [], hlines: o.hlines });
    const B = c.box, slot = B.w / n, bw = slot * (1 - (o.gap == null ? 0.28 : o.gap));
    ctx.save();
    for (let i = 0; i < n; i++) {
      const cx = B.x + slot * (i + 0.5);
      let p = 0, m = 0;
      stacks.forEach((s, k) => {
        const v = s.data[i] || 0; if (!v) return;
        const a = v >= 0 ? p : m, b = a + v;
        if (v >= 0) p = b; else m = b;
        ctx.fillStyle = (typeof s.color === "function" ? s.color(i, v) : s.color) || P.series[k % P.series.length];
        if (o.highlight != null && o.highlight !== i) ctx.globalAlpha = 0.35;
        const y0 = c.Y(a), y1 = c.Y(b);
        ctx.fillRect(cx - bw / 2, Math.min(y0, y1), bw, Math.max(1, Math.abs(y1 - y0)));
        ctx.globalAlpha = 1;
      });
      if (i % xLab === 0) {
        ctx.fillStyle = P.dim; ctx.font = MB.font(11); ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText(o.labels[i], cx, B.y + B.h + 6);
      }
      if (o.valueFmt) {
        ctx.fillStyle = P.text; ctx.font = MB.font(11, true); ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillText(o.valueFmt(p + m, i), cx, c.Y(p) - 3);
      }
    }
    ctx.restore();
    return { X: (i) => B.x + slot * (i + 0.5), Y: c.Y, box: B, bw };
  };
  /**
   * 도넛(파이) 그래프. items:[{label, value, color}], 가운데 글자 center:{big, small}
   *   MB.donut(ctx, cx, cy, R, items, { inner:0.6, center:{big:"300만", small:"월 실수령"}, labels:true, highlight })
   * 반환: hit(x, y) → 마우스 위치의 항목 인덱스(없으면 -1)
   */
  MB.donut = function (ctx, cx, cy, R, items, o = {}) {
    const P = MB.palette();
    const total = items.reduce((s, it) => s + Math.max(0, it.value), 0) || 1;
    const inner = o.inner == null ? 0.6 : o.inner;
    let a = -Math.PI / 2;
    const arcs = [];
    ctx.save();
    items.forEach((it, i) => {
      const da = (Math.max(0, it.value) / total) * Math.PI * 2;
      const pop = o.highlight === i ? R * 0.06 : 0, mid = a + da / 2;
      const ox = Math.cos(mid) * pop, oy = Math.sin(mid) * pop;
      ctx.beginPath();
      ctx.arc(cx + ox, cy + oy, R, a, a + da);
      ctx.arc(cx + ox, cy + oy, R * inner, a + da, a, true);
      ctx.closePath();
      ctx.fillStyle = it.color || P.series[i % P.series.length]; ctx.fill();
      ctx.strokeStyle = MB.color("canvas-bg"); ctx.lineWidth = 2; ctx.stroke();
      if (o.labels !== false && da > 0.32) {
        const rr = R * (1 + inner) / 2;
        ctx.fillStyle = "#fff"; ctx.font = MB.font(11, true, 600); ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(Math.round((it.value / total) * 100) + "%", cx + ox + Math.cos(mid) * rr, cy + oy + Math.sin(mid) * rr);
      }
      arcs.push([a, a + da]);
      a += da;
    });
    if (o.center) {
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = P.text; ctx.font = MB.font(Math.max(14, R * 0.22), false, 800);
      ctx.fillText(o.center.big || "", cx, cy - (o.center.small ? R * 0.08 : 0));
      if (o.center.small) { ctx.fillStyle = P.dim; ctx.font = MB.font(Math.max(11, R * 0.11)); ctx.fillText(o.center.small, cx, cy + R * 0.16); }
    }
    ctx.restore();
    return {
      hit(x, y) {
        const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
        if (r > R * 1.06 || r < R * inner) return -1;
        let t = Math.atan2(dy, dx); if (t < -Math.PI / 2) t += Math.PI * 2;
        return arcs.findIndex(([s, e]) => t >= s && t < e);
      },
    };
  };

  /* ------------------------------------------------------------ stock helpers */
  /** 주가: MB.price(72300) → "72,300원", MB.price(12.5, {usd:true}) → "$12.50" */
  MB.price = function (x, o = {}) {
    if (!isFinite(x)) return "—";
    if (o.usd) return (x < 0 ? "−$" : "$") + Math.abs(x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (x < 0 ? "−" : "") + Math.round(Math.abs(x)).toLocaleString("ko-KR") + (o.short ? "" : "원");
  };
  /** 부호 붙은 퍼센트: MB.chg(0.0345) → "+3.45%", MB.chg(-0.012) → "−1.2%" */
  MB.chg = (x, digits = 2) => (isFinite(x) ? (x > 0 ? "+" : x < 0 ? "−" : "") + +(Math.abs(x) * 100).toFixed(digits) + "%" : "—");
  /** 등락 색 클래스(한국 관례: 상승 빨강, 하락 파랑): MB.tone(x) → "up-t" | "down-t" | "" */
  MB.tone = (x) => (x > 0 ? "up-t" : x < 0 ? "down-t" : "");
  /** 등락 색 값(캔버스용) */
  MB.toneColor = (x) => { const P = MB.palette(); return x > 0 ? P.up : x < 0 ? P.down : P.dim; };
  /**
   * 캔들 차트(+거래량). 한국 관례대로 양봉(종가≥시가)은 빨강, 음봉은 파랑.
   *   MB.candles(ctx, box|null, data:[{o,h,l,c,v}], {
   *     y:[min,max](생략 시 자동), logY, volume:true, volFrac:0.22, yFmt, xLabel(i)→문자열|null,
   *     overlays:[{data:[값|null...](data와 같은 길이), color, width, dash}],
   *     markers:[{i, price, color, label, shape:"up"|"down"|"dot"}], hlines:[{y,color,label,dash}],
   *     bands:[{i0,i1,color}], highlight: 인덱스, hollow: 양봉 속 비우기 })
   * 반환: { X(i) 캔들 중심 px, Y(price), box(가격 영역), vbox(거래량 영역), cw(캔들 폭), idx(px)→가장 가까운 인덱스 }
   */
  MB.candles = function (ctx, box, data, o = {}) {
    const P = MB.palette();
    const dpr = (ctx.getTransform && ctx.getTransform().a) || 1;
    const W = ctx.canvas.width / dpr, H = ctx.canvas.height / dpr;
    if (!box) box = { x: 58, y: 14, w: W - 58 - 14, h: H - 14 - 30 };
    const n = Math.max(1, data.length);
    const vf = o.volume === false ? 0 : (o.volFrac == null ? 0.22 : o.volFrac);
    const vh = box.h * vf, gap = vf ? 8 : 0;
    const pb = { x: box.x, y: box.y, w: box.w, h: box.h - vh - gap };
    const vbox = { x: box.x, y: box.y + box.h - vh, w: box.w, h: vh };
    let lo = Infinity, hi = -Infinity, vmax = 0;
    data.forEach((d) => { lo = Math.min(lo, d.l); hi = Math.max(hi, d.h); vmax = Math.max(vmax, d.v || 0); });
    (o.overlays || []).forEach((ov) => ov.data.forEach((v) => { if (v != null && isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }));
    if (!isFinite(lo)) { lo = 0; hi = 1; }
    let y = o.y;
    if (!y) { const pad = (hi - lo) * 0.06 || hi * 0.05 || 1; y = o.logY ? [lo / 1.04, hi * 1.04] : [lo - pad, hi + pad]; }
    const slot = pb.w / n, cw = Math.max(1, Math.min(18, slot * 0.68));
    const X = (i) => pb.x + slot * (i + 0.5);
    const c = MB.chart(ctx, pb, { x: [0, n], y, logY: o.logY, yFmt: o.yFmt || ((v) => Math.round(v).toLocaleString("ko-KR")), xTicks: [], hlines: o.hlines,
      bands: (o.bands || []).map((b) => ({ x0: b.i0, x1: b.i1 + 1, color: b.color })) });
    const Y = c.Y;
    ctx.save();
    ctx.beginPath(); ctx.rect(pb.x, pb.y - 1, pb.w + 1, pb.h + 2); ctx.clip();
    data.forEach((d, i) => {
      const up = d.c >= d.o, col = up ? P.up : P.down, cx = X(i);
      if (o.highlight != null && o.highlight !== i) ctx.globalAlpha = 0.45;
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(Math.round(cx) + 0.5, Y(d.h)); ctx.lineTo(Math.round(cx) + 0.5, Y(d.l)); ctx.stroke();
      const y0 = Y(Math.max(d.o, d.c)), y1 = Y(Math.min(d.o, d.c)), bh = Math.max(1, y1 - y0);
      if (up && o.hollow) { ctx.fillStyle = P.bg; ctx.fillRect(cx - cw / 2, y0, cw, bh); ctx.strokeRect(cx - cw / 2 + 0.5, y0 + 0.5, cw - 1, bh - 1); }
      else ctx.fillRect(cx - cw / 2, y0, cw, bh);
      ctx.globalAlpha = 1;
    });
    (o.overlays || []).forEach((ov, k) => {
      ctx.strokeStyle = ov.color || P.series[k % P.series.length]; ctx.lineWidth = ov.width || 1.6; ctx.setLineDash(ov.dash || []);
      ctx.beginPath(); let st = false;
      ov.data.forEach((v, i) => { if (v == null || !isFinite(v)) { st = false; return; } st ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)); st = true; });
      ctx.stroke(); ctx.setLineDash([]);
    });
    ctx.restore();
    (o.markers || []).forEach((m) => {
      const cx = X(m.i), py = Y(m.price), col = m.color || (m.shape === "down" ? P.down : m.shape === "up" ? P.up : P.accent);
      ctx.fillStyle = col; ctx.beginPath();
      if (m.shape === "up") { ctx.moveTo(cx, py + 4); ctx.lineTo(cx - 6, py + 13); ctx.lineTo(cx + 6, py + 13); }
      else if (m.shape === "down") { ctx.moveTo(cx, py - 4); ctx.lineTo(cx - 6, py - 13); ctx.lineTo(cx + 6, py - 13); }
      else ctx.arc(cx, py, 4, 0, Math.PI * 2);
      ctx.fill();
      if (m.label) { ctx.font = MB.font(11, false, 600); ctx.textAlign = "center"; ctx.textBaseline = m.shape === "down" ? "bottom" : "top"; ctx.fillText(m.label, cx, m.shape === "down" ? py - 15 : py + 15); }
    });
    if (vf) {
      ctx.save();
      ctx.strokeStyle = P.grid; ctx.beginPath(); ctx.moveTo(vbox.x, vbox.y + vbox.h + 0.5); ctx.lineTo(vbox.x + vbox.w, vbox.y + vbox.h + 0.5); ctx.stroke();
      data.forEach((d, i) => {
        const hgt = vmax ? (d.v / vmax) * vbox.h : 0;
        ctx.fillStyle = d.c >= d.o ? P.up : P.down; ctx.globalAlpha = o.highlight != null && o.highlight !== i ? 0.2 : 0.45;
        ctx.fillRect(X(i) - cw / 2, vbox.y + vbox.h - hgt, cw, hgt);
      });
      ctx.globalAlpha = 1; ctx.fillStyle = P.faint; ctx.font = MB.font(10); ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("거래량", vbox.x + 4, vbox.y + 1);
      ctx.restore();
    }
    if (o.xLabel) {
      ctx.save(); ctx.fillStyle = P.dim; ctx.font = MB.font(10.5, true); ctx.textAlign = "center"; ctx.textBaseline = "top";
      let lastX = -1e9;
      for (let i = 0; i < n; i++) { const s = o.xLabel(i); if (s == null) continue; const px = X(i); if (px - lastX < 44 || px + ctx.measureText(s).width / 2 > box.x + box.w + 4) continue; ctx.fillText(s, px, box.y + box.h + 6); lastX = px; }
      ctx.restore();
    }
    return { X, Y, box: pb, vbox, cw, idx: (px) => MB.clamp(Math.floor((px - pb.x) / slot), 0, n - 1) };
  };

  /* ------------------------------------------------------------ layout build */
  const LOGO = `<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="mbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/></linearGradient></defs><rect x="2" y="2" width="28" height="28" rx="8" fill="url(#mbg)"/><path d="M10 9v14M16 7v16M22 11v12" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/><rect x="8" y="13" width="4" height="7" rx="1" fill="#fff"/><rect x="14" y="10" width="4" height="8" rx="1" fill="#fff"/><rect x="20" y="14" width="4" height="5" rx="1" fill="#fff"/></svg>`;
  const ICON_MENU = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`;
  const ICON_MOON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`;
  const ICON_SUN = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`;

  function build() {
    const body = document.body;
    const root = body.dataset.root != null ? body.dataset.root : body.dataset.chapter ? "../" : "";
    const curSlug = body.dataset.chapter || "";
    const href = (slug) => (slug ? `${root}chapters/${slug}.html` : `${root}index.html`);

    // favicon
    if (!document.querySelector('link[rel="icon"]')) { const fi = document.createElement("link"); fi.rel = "icon"; fi.type = "image/svg+xml"; fi.href = root + "favicon.svg"; document.head.appendChild(fi); }

    // top bar
    const bar = document.createElement("header");
    bar.className = "mb-topbar";
    bar.innerHTML = `
      <button class="mb-btn icon" id="mb-menu" aria-label="챕터 목록">${ICON_MENU}</button>
      <a class="mb-logo" href="${href("")}">${LOGO}<span>StockBook <small>주식 교과서</small></span></a>
      <span class="spacer"></span>
      <button class="mb-btn icon" id="mb-theme" aria-label="테마 전환"></button>
      <div class="mb-progress" id="mb-progress"></div>`;
    body.prepend(bar);

    // drawer
    const drawer = document.createElement("nav");
    drawer.className = "mb-drawer";
    drawer.innerHTML = `<h4>Chapters</h4><ul class="mb-chlist">
      <li><a href="${href("")}" class="${curSlug ? "" : "active"}"><span class="num">00</span><span>홈 · 주식의 지도</span></a></li>
      ${CHAPTERS.map((c) => `<li><a href="${href(c.slug)}" class="${c.slug === curSlug ? "active" : ""}"><span class="num">${c.num}</span><span>${c.title}</span></a></li>`).join("")}
    </ul>`;
    const backdrop = document.createElement("div");
    backdrop.className = "mb-drawer-backdrop";
    body.append(backdrop, drawer);
    const toggleDrawer = (o) => body.classList.toggle("drawer-open", o);
    bar.querySelector("#mb-menu").addEventListener("click", () => toggleDrawer(true));
    backdrop.addEventListener("click", () => toggleDrawer(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggleDrawer(false); });

    // theme toggle
    const tbtn = bar.querySelector("#mb-theme");
    const setIcon = () => (tbtn.innerHTML = MB.isDark() ? ICON_SUN : ICON_MOON);
    setIcon();
    tbtn.addEventListener("click", () => {
      const next = MB.isDark() ? "light" : "dark";
      try { localStorage.setItem("sb-theme", next); } catch (e) {}
      applyTheme(next); setIcon();
    });

    // progress
    const prog = bar.querySelector("#mb-progress");
    const onScroll = () => { const h = document.documentElement.scrollHeight - innerHeight; prog.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + "%"; };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();

    // chapter page extras
    const main = document.querySelector("main.chapter");
    if (main) {
      // 여섯 부 띠
      const curCh = CHAPTERS.find((c) => c.slug === curSlug);
      const hero = main.querySelector(".chapter-hero");
      if (hero && curCh && curCh.stage != null) {
        const first = (i) => CHAPTERS.find((c) => c.stage === i);
        const strip = document.createElement("nav");
        strip.className = "mb-stages";
        strip.setAttribute("aria-label", "이 책의 여섯 부");
        strip.innerHTML = STAGES.map((st, i) => `<a href="${href(first(i).slug)}" class="${i === curCh.stage ? "cur" : ""}"${i === curCh.stage ? ' aria-current="step"' : ""}><b>${st.name}</b><small>${st.en}</small></a>`).join("");
        hero.after(strip);
      }
      // numbered h2 + TOC
      const layout = document.createElement("div");
      layout.className = "mb-layout";
      main.parentNode.insertBefore(layout, main);
      layout.appendChild(main);
      const toc = document.createElement("aside");
      toc.className = "mb-toc";
      const h2s = [...main.querySelectorAll("section > h2")];
      let n = 0;
      toc.innerHTML = "<h4>ON THIS PAGE</h4>" + h2s.map((h, i) => {
        const sec = h.parentElement;
        if (!sec.id) sec.id = "s" + (i + 1);
        const numbered = !sec.classList.contains("keypoints") && !sec.classList.contains("quiz-sec") && !sec.hasAttribute("data-nonum");
        if (numbered && !h.querySelector(".h-num")) { n++; h.insertAdjacentHTML("afterbegin", `<span class="h-num">${String(n).padStart(2, "0")}</span>`); }
        return `<a href="#${sec.id}">${h.textContent.replace(/^\d\d/, "").trim()}</a>`;
      }).join("");
      layout.appendChild(toc);
      const links = [...toc.querySelectorAll("a")];
      if (window.IntersectionObserver && h2s.length) {
        const io = new IntersectionObserver((es) => {
          es.forEach((e) => { if (e.isIntersecting) { links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id)); } });
        }, { rootMargin: "-20% 0px -70% 0px" });
        h2s.forEach((h) => io.observe(h.parentElement));
      }

      // pager
      const idx = CHAPTERS.findIndex((c) => c.slug === curSlug);
      const prev = idx > 0 ? CHAPTERS[idx - 1] : null;
      const next = idx >= 0 && idx < CHAPTERS.length - 1 ? CHAPTERS[idx + 1] : null;
      const pager = document.createElement("nav");
      pager.className = "mb-pager";
      pager.innerHTML =
        (prev ? `<a class="prev" href="${href(prev.slug)}"><small>← 이전 · ${prev.num}</small>${prev.title}</a>` : `<a class="prev" href="${href("")}"><small>← 처음으로</small>홈 · 주식의 지도</a>`) +
        (next ? `<a class="next" href="${href(next.slug)}"><small>다음 · ${next.num} →</small>${next.title}</a>` : "");
      layout.after(pager);
    }
    const foot = document.createElement("footer");
    foot.className = "mb-foot";
    foot.innerHTML = `StockBook — 주식과 시장을 만져 보며 배우는 인터랙티브 교과서 · 등장하는 회사와 가격은 가상이며, 수치는 교육용 근사 모델입니다. 투자 권유나 투자·세무 자문이 아닙니다.<br>
      © 2026 geniuskey 및 StockBook 기여자 · 콘텐츠 <a rel="license" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> · 코드 <a href="${root}LICENSE-MIT">MIT</a> · <a href="${root}LICENSE.md">라이선스 안내</a>`;
    body.appendChild(foot);

    // quiz
    document.querySelectorAll(".quiz-q").forEach((q) => {
      const opts = [...q.querySelectorAll("button.opt")];
      opts.forEach((b) => b.addEventListener("click", () => {
        opts.forEach((o) => { o.disabled = true; if (o.hasAttribute("data-correct")) o.classList.add("right"); });
        if (!b.hasAttribute("data-correct")) b.classList.add("wrong");
        q.classList.add("done");
        q.dispatchEvent(new CustomEvent("answered", { bubbles: true, detail: { correct: b.hasAttribute("data-correct") } }));
      }));
    });

    // KaTeX
    const renderMath = () => {
      if (window.renderMathInElement) {
        renderMathInElement(document.body, {
          delimiters: [{ left: "$$", right: "$$", display: true }, { left: "\\(", right: "\\)", display: false }, { left: "\\[", right: "\\]", display: true }],
          throwOnError: false,
          ignoredClasses: ["no-math"],
        });
      }
    };
    if (window.renderMathInElement) renderMath();
    else window.addEventListener("load", renderMath);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
