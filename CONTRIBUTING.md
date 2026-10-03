# StockBook 챕터 작성 가이드

빌드 과정 없는 정적 사이트다. `index.html` + `chapters/<slug>.html` + 공통 `css/style.css`, `js/common.js`(전역 `MB`), `js/stock.js`(전역 `ST`).
로컬 실행: `python -m http.server 8000` → http://localhost:8000 (file://로 열어도 동작하게 classic script만 쓴다. ES module 금지.)
같은 저자의 [MoneyBook](https://moneybook.euiyun.com/)(돈 교과서)의 후속작이다. 형식·컴포넌트·문체는 MoneyBook과 같다.

## 기여물의 라이선스
실행 코드는 MIT, 본문·그림·문제·해설 등 교육 콘텐츠는 CC BY 4.0. 구분은 [라이선스 안내](LICENSE.md)를 따른다.

## 원칙
- **한국어**, 대상은 주식을 처음 공부하는 성인(사회초년생, 대학생, 고등학생도 읽을 수 있게). MoneyBook 수준의 돈 지식(복리, 물가, 위험과 수익의 기초)은 있다고 보되, 필요하면 한 문장으로 다시 풀고 MoneyBook 장으로 링크한다(`<a href="https://moneybook.euiyun.com/chapters/interest.html">MoneyBook 4장</a>`). 용어는 처음 나올 때 `<span class="term">시가총액</span><span class="en">(Market cap)</span>`처럼 쓰고 한 문장으로 풀어 준다.
- 이 책의 핵심은 **시뮬레이터의 양과 질**이다. 읽고 외우는 책이 아니라, 주문을 넣고, 가격을 끌고, 전략을 돌려 보면서 "아, 그래서"를 얻는 책이다(Bartosz Ciechanowski의 글이 본보기).
  - **장마다 시뮬레이터 12개 이상**(`.sim`). 개념 하나에 조작 가능한 그림 하나. 정적 SVG(`figure.diagram`)는 구조도·흐름도에만 장마다 2~3개.
  - 한 시뮬레이터는 **한 가지**만 보여 준다. 슬라이더는 1~3개. 장 끝에 큰 종합 시뮬레이터 하나.
  - 앞 시뮬레이터에서 만진 것 위에 다음 것을 쌓는다. 글은 시뮬레이터 바로 앞에서 "무엇을 움직여 볼지"를, 바로 뒤에서 "무엇을 봤는지"를 말한다.
  - 슬라이더만 쓰지 말고 캔버스 위 직접 끌기(`MB.drag`)를 적극적으로 쓴다(차트의 점을 끌어 가격을 바꾸기, 호가창에 주문을 끌어 놓기, 손익 그래프의 행사가를 끌기). 끌 수 있는 것에는 손잡이를 그린다.
  - 직접 해 보는 형식을 섞는다: 버튼으로 주문을 넣는 호가창, "다음 날" 버튼으로 하루씩 진행하는 매매, 예측하고 맞히는 게임, 무작위 차트와 진짜(가상 시장) 차트 구분하기.
  - 값을 끝까지 밀었을 때 **무너지는 모습**이 보여야 한다(반대매매로 계좌가 사라진다, 레버리지 ETF가 녹는다, 과최적화 전략이 표본 밖에서 무너진다). 한계가 배울 점이다.
  - 결과는 숫자(`.sim-readout`)로도 보여 준다. 금액은 `MB.won()`, 주가는 `MB.price()`, 등락률은 `MB.chg()`.
  - 애니메이션을 아끼지 않는다: 흘러가는 시세, 쌓이는 체결, 하루씩 그려지는 캔들(`MB.loop`). 화면 밖에서는 멈춘다(`MB.loop`가 자동 처리).
- 순서: 일상의 질문 → 조작 가능한 그림 → 원리(필요하면 수식, KaTeX) → 시뮬레이터 → 실제 제도·수치 → 한결의 투자 노트 → 핵심 정리/퀴즈.
- **색 관례(한국 HTS)**: 상승·이익은 빨강 `--up`(`P.up`), 하락·손실은 파랑 `--down`(`P.down`). 캔버스는 `MB.toneColor(x)`, 글자는 `class="up-t"`/`"down-t"` 또는 `MB.tone(x)`. `--bad`(빨강)는 "위험·경고"(반대매매, 상장폐지, 파산)에만 쓴다. 주제색은 `--accent`(보라), 보조는 `--accent-2`(금색).
- 수치: **2026년 한국 시장 제도 기준 대표값**. 엔진의 `ST.KR`에 모아 두었다(가격제한폭 ±30%, 호가 단위, 증권거래세 0.20%, 배당소득세 15.4%, 해외 주식 양도세 22%·250만원 공제…). 본문에 쓸 때는 "2026년 기준", 확실하지 않으면 '약', '~'을 붙인다. 제도는 바뀐다는 점을 장마다 한 번은 말한다(`.callout.warn`).
- **투자 권유를 하지 않는다.** 실제 상장 회사 이름을 예로 쓰지 않는다. 예시는 엔진의 가상 회사 `ST.CO`(한빛반도체, 누리식품, 별빛바이오, 다온은행, 모아플랫폼)와 가상 지수 `ST.INDEX_NAME`("SB 종합지수")를 쓴다. 실제 지수·제도명(KOSPI, KOSDAQ, S&P 500, 나스닥, ISA, 연금저축)은 설명에 필요하면 괜찮다. 과거 수익률은 미래를 보장하지 않는다는 점을 분명히 한다. 역사적 사건(2008년 금융위기, 2020년 3월 급락, 닷컴 버블 등)은 대략적인 수치와 함께 언급해도 된다('약').
- 가상 시장 데이터(`ST.market()`)는 교육용으로 만든 가짜 가격이다. 처음 쓰는 곳에서 "가상의 시장"임을 밝힌다.
- 외부 라이브러리는 KaTeX만. 이미지 대신 인라인 SVG/canvas.
- 색은 CSS 변수나 `MB.palette()`를 쓴다. 직접 색 코드를 적지 않는다(다크 모드).
- 모바일(폭 360px)에서 가로 스크롤 금지. SVG는 `viewBox`만 주고 width/height 생략.
- 문체는 평서문 "~다". 이모지 금지. 다른 장을 언급할 때는 `<a href="valuation.html">7장</a>`처럼 링크한다.

## head 블록
각 챕터 `<head>`에는 아래 표식만 두고 `python tools/head.py <slug>`를 실행한다(인자 없이 실행하면 전체 장 + 사이트맵 + `index.html`의 JSON-LD를 갱신한다). 제목·번호는 `js/common.js`의 `CHAPTERS`에서 읽는다. `js/stock.js`는 항상 함께 불러온다.
```html
<!doctype html>
<html lang="ko">
<head>
<!--head:start {"desc": "한 문장 설명"}-->
<!--head:end-->
</head>
```

## 페이지 골격
```html
<body data-chapter="slug">
<main class="chapter">
  <header class="chapter-hero">
    <div class="eyebrow">Chapter NN</div><h1>제목</h1><p class="lead">…</p>
    <ul class="objectives"><li>…</li></ul>
  </header>
  <section id="영문-id"><h2>절 제목</h2> … </section>
  <section class="keypoints" id="summary"><h2>핵심 정리</h2><ol><li>…</li></ol></section>
  <section class="quiz-sec" id="quiz"><h2>확인 퀴즈</h2><div class="quiz"> … </div></section>
</main>
<script>(function () { "use strict"; /* 시뮬레이터 */ })();</script>
</body>
```
상단바·챕터 목록·여섯 부 띠·오른쪽 목차·h2 번호·이전/다음·푸터·퀴즈 동작·KaTeX 렌더는 `common.js`가 자동으로 만든다. 직접 넣지 않는다.
장 고유의 스타일이 필요하면 `<head>` 표식 아래(head:end 뒤)에 작은 `<style>`을 둬도 된다. 색은 CSS 변수만.

## 컴포넌트
- 그림: `<figure class="diagram"><svg viewBox="0 0 460 260" role="img" aria-label="…">…</svg><figcaption><b>그림 제목.</b> 설명</figcaption></figure>`. SVG 안에서는 `.lbl`, `.lbl-dim`, `.lbl-b`, `.lbl-acc`, `.lbl-acc2`, `.lbl-bad`, `.lbl-up`, `.lbl-down`, `.t-mono`, `.s-line`, `.s-axis`, `.s-acc`, `.s-acc2`, `.s-ok`, `.s-dash`, `.s-bad`, `.s-up`, `.s-down`, `.f-surface`, `.f-elev`, `.f-acc`, `.f-acc2`, `.f-ok`, `.f-warn`, `.f-bad`, `.f-up`, `.f-down`, `.f-acc-soft`, `.f-acc2-soft`, `.f-ok-soft`, `.f-warn-soft`, `.f-bad-soft`, `.f-up-soft`, `.f-down-soft` 클래스를 쓴다. 화살표 머리는 `<marker>`에 `fill="context-stroke"`.
- 시뮬레이터:
```html
<div class="sim" id="sim-x">
  <div class="sim-head"><span class="sim-tag">SIMULATOR</span><h3>제목</h3></div>
  <div class="sim-body side">
    <div class="sim-view"><canvas id="x-cv"></canvas></div>
    <div class="sim-controls">
      <label class="ctrl"><span>이름 <output id="x-a-out"></output></span><input type="range" id="x-a" min="0" max="10" step="0.1" value="3"></label>
      <div class="seg" id="x-mode"><button data-value="a" class="on">A</button><button data-value="b">B</button></div>
      <label class="check"><input type="checkbox" id="x-c"> 옵션</label>
      <div class="btn-row"><button class="btn primary" id="x-go">실행</button><button class="btn" id="x-re">다시</button></div>
    </div>
  </div>
  <div class="sim-readout"><div class="stat"><span class="k">이름</span><span class="v" id="x-o-1">—</span></div></div>
  <div class="sim-note">해볼 것: ① … ② … ③ … (모델의 가정)</div>
</div>
```
  컨트롤이 없거나 캔버스를 직접 끄는 시뮬레이터는 `.sim-body`에서 `side`를 빼고 `.sim-view` 안에 `<span class="hint">끌어서 움직인다</span>`를 둔다. 게임형은 `.sim-tag`를 `GAME`, 실험형은 `LAB`으로 써도 된다.
- 호가창 표: `<table class="hoga"><tr class="ask"><td class="q">120</td><td class="px">72,100</td><td></td></tr>…<tr class="bid"><td></td><td class="px">71,900</td><td class="q">80</td></tr></table>` (매도 잔량 왼쪽·파랑, 매수 잔량 오른쪽·빨강). 캔버스로 그려도 된다.
- 수식: `<div class="formula">$$…$$<div class="where">기호 설명</div></div>`, 문장 속은 `\(…\)`. 장마다 0~4개. 수식보다 그림과 숫자가 먼저다.
- 강조 상자: `.callout`, `.callout.tip`, `.callout.warn`, `.callout.deep`(첫 `<strong>`이 제목).
- 표: `<div class="table-wrap"><table>…</table></div>`. 숫자 칸은 `class="num"`.
- 체결 내역·계좌 명세: `<div class="slip"><div class="row"><span>매수 금액</span><span>720,000</span></div>…<div class="row total"><span>합계</span><span>720,108</span></div></div>`.
- 등락 표시: `<span class="won plus">+3.2%</span>`(빨강), `<span class="won minus">−1.5%</span>`(파랑).
- 범례: `<div class="legend"><span><i style="background:var(--up)"></i>양봉</span></div>`, `.pill`, `.ok-t` `.bad-t` `.warn-t` `.up-t` `.down-t`.
- 퀴즈: `<div class="quiz-q"><p>문제</p><div class="opts"><button class="opt">…</button><button class="opt" data-correct>정답</button></div><div class="quiz-exp">해설</div></div>` (장마다 5문항, 정답 위치를 섞는다).
- 한결의 투자 노트(아래 참조):
```html
<div class="casefile">
  <div class="tag"><b>NOTE 한결</b><span>한결의 투자 노트 · 3장</span></div>
  <h4>첫 주문: 한빛반도체 10주</h4>
  <p>…이 장의 방법을 한결에게 적용한 결과…</p>
  <div class="clue"><div><b>이 장에서 정한 것</b>…</div><div><b>아직 남은 문제</b>…</div><div><b>다음 단계</b>…</div></div>
</div>
```

## 이어지는 케이스: 한결의 투자 노트
MoneyBook에서 첫 월급을 받고 예산·비상금·연금까지 정리한 이한결(가상, 실제 인물과 무관)이 처음으로 주식 계좌를 연다. 모든 장 끝(핵심 정리 앞)에 `.casefile` 하나를 넣고 **아래 표에서 자기 장에 해당하는 내용만** 다룬다. 뒤 장의 결론을 미리 말하지 않는다. 숫자는 `ST.HG`, `ST.CO`와 엔진으로 직접 계산해서 쓴다(`node -e "const ST=require('./js/stock.js'); …"`로 확인).

- 인물: 이한결, 27세, 2026년 1월 입사, 세전 연봉 3,600만원. 2026년 10월, 비상금 600만원을 마련했고 월 저축 100만원 중 70만원을 주식에 넣기로 했다(MoneyBook 16장에서 주식 70 / 채권 30). 첫 투자금(시드) 1,000만원. 견딜 수 있다고 정한 평가손실은 −30%(MoneyBook 12장).
- 가상의 회사(`ST.CO`, 2026년 10월 현재):

| 회사 | 업종·시장 | 주가 | 시총 | PER | PBR | ROE | 배당수익률 | 성격 |
|---|---|---|---|---|---|---|---|---|
| 한빛반도체 `hanbit` | 반도체·KOSPI | 72,000 | 7.2조 | 10 | 1.2 | 12% | 2.0% | 경기 민감, 변동성 38% |
| 누리식품 `nuri` | 음식료·KOSPI | 38,000 | 7,600억 | 9.5 | 1.19 | 12.5% | 5.0% | 방어주, 배당성향 47.5% |
| 별빛바이오 `byeol` | 바이오·KOSDAQ | 15,000 | 7,500억 | 적자 | 3.0 | −16.8% | 0 | 신약 하나에 운명, 변동성 65% |
| 다온은행 `daon` | 금융·KOSPI | 13,500 | 5.4조 | 6 | 0.3 | 5% | 6.0% | 저PBR, 자산 대부분이 대출 |
| 모아플랫폼 `moa` | 인터넷·KOSPI | 120,000 | 18조 | 50 | 3.0 | 6% | 0.17% | 고성장 기대, 변동성 42% |

| 장 | 이 장에서 다루는 것 |
|---|---|
| 01 주식이란 | 한결 소개(MoneyBook 후속). 한빛반도체 1주 72,000원은 회사의 1억분의 1, 이익 7,200원과 순자산 60,000원의 몫. 질문: 1,000만원과 매달 70만원으로 무엇을 사야 하는가. 책 전체가 한결의 첫 투자를 따라간다는 안내. |
| 02 시장 구조 | 비대면 증권 계좌 개설, 예수금, 매수 후 T+2 결제. 다섯 회사의 시가총액 비교, KOSPI·KOSDAQ 차이, 가격제한폭(한빛 상한가 93,600 / 하한가 50,400). |
| 03 호가와 체결 | 첫 주문: 한빛반도체 10주. 시장가와 지정가, 스프레드 100원이 왕복에서 얼마인지, 수수료·거래세 포함 실제 낸 돈(`ST.cost`). |
| 04 주가의 움직임 | 산 다음 날 −3%. 한빛의 일간 변동성(연 38% → 하루 약 2.4%)으로 보면 흔한 날. 뉴스와 소음, 랜덤워크. 하루하루 보지 않기로. |
| 05 재무제표 | 동료가 권한 별빛바이오 재무제표: 매출 300억, 영업손실 400억, 현금 1,200억, 연 현금 소진 약 450억 → 약 2.7년. |
| 06 투자 지표 | 다섯 회사 지표표. PER 9.5(누리)와 50(모아), PBR 0.3(다온)의 뜻. 낮은 PER이 늘 싼 것은 아니다. |
| 07 가치평가 | 한빛반도체 DCF(FCF 5,000억, 5년 8% 성장, WACC 9%, 영구 2%, 순부채 1조) → 주당 약 8.4만원. 가정을 조금씩 바꾸면 5만~12만원. 역DCF: 72,000원은 앞으로 10년 연 약 3.6% 성장을 가정. 가치는 점이 아니라 범위. |
| 08 배당 | 누리식품 100주: 배당 19만원, 세후 160,740원. 배당락. 30년 배당 재투자의 차이. 배당수익률만 보고 고르면 생기는 함정(다온). |
| 09 기업 이벤트 | 별빛바이오가 20% 할인 유상증자 공시(가상): 주식 수 25% 증가 시 희석과 권리락 가격. 무상증자·액면분할은 가치가 그대로임을 확인. |
| 10 수익률의 수학 | 첫 6개월 계좌: 입금 시점이 달라 단순 수익률이 왜곡된다. 시간가중 vs 금액가중(IRR). 산술평균의 착시, −50% 다음 +50%. |
| 11 차트 | 한빛반도체 10년 차트(가상 시장)를 선형·로그 축, 일봉·주봉·월봉으로. 같은 데이터가 다르게 보인다. |
| 12 기술적 분석 | 유튜브에서 본 골든크로스 규칙을 한빛·지수에 백테스트. 비용을 넣으면 남는 것. 무작위 차트에서도 보이는 패턴. |
| 13 위험과 분산 | 한빛 몰빵 vs 다섯 종목 vs 지수: 변동성·최대 낙폭 비교. −30% 감내선을 넘는 것은 무엇인가. |
| 14 포트폴리오 이론 | 다섯 종목 + 지수 + 채권으로 효율적 투자선을 그리고 한결의 위치를 찍는다. 샤프 비율. |
| 15 지수와 ETF | 핵심(core)은 지수 ETF로. 보수 0.05% vs 0.5%의 30년, 추적오차. 레버리지 ETF의 유혹을 시뮬레이션으로 거절. |
| 16 팩터 | 위성(satellite) 몫을 어떤 기준으로 고를까. 가치·모멘텀·퀄리티의 근거와 몇 년씩 지는 기간. |
| 17 백테스트 | "연 40% 전략" 광고를 해부: 과최적화, 생존 편향, 미래 참조. 표본 밖에서 무너진다. |
| 18 매매 규칙 | 결정: 1,000만원은 6개월 분할 매수, 매달 70만원 자동 적립, 위성 한 종목은 계좌의 5% 이하, 연 1회 리밸런싱. 켈리로 본 과잉 베팅. |
| 19 레버리지 | 지인이 권한 신용 2배: 반대매매 시뮬레이션(−30%에서 담보비율 140% 붕괴) → 거절. 공매도와 숏스퀴즈는 이해만. |
| 20 선물과 옵션 | 한빛반도체 100주에 커버드콜·보호적 풋을 씌우면? 손익 그래프와 비용. 결론: 지금은 이해만 한다. |
| 21 금리·경기 | 기준금리 인상 뉴스에 모아플랫폼(성장주) −12%, 누리식품 −1%. 할인율과 듀레이션으로 설명. |
| 22 해외 주식 | 위성 일부를 미국 지수로: 환율 1,300→1,450원의 효과, 환헤지, 양도세 250만원 공제. |
| 23 세금과 비용 | 1년 결산: 배당세, 거래세, 수수료 합계. 같은 투자를 ISA·연금저축으로 했을 때 절약액. |
| 24 투자자의 심리 | 약세장 −25%에서 팔고 싶은 마음. 처분 효과, 확증 편향. 한결이 쓰는 한 장짜리 투자 정책서(IPS). |
| 25 모의투자 실험실 | 독자가 가상 시장에서 직접 매매한다. 한결의 규칙(지수 80 + 위성 20, 적립식)과 겨룬다. |
| 26 용어집 | 한결 없이 용어와 종합 퀴즈. |

## JS 헬퍼 (`MB`, `js/common.js`)
- `MB.canvas(el|선택자, draw(ctx, w, h), {aspect, minHeight, maxHeight})` → `{redraw(), ctx, w, h, canvas}`. 리사이즈·테마 변경 시 자동으로 다시 그린다. draw 안에서 `MB.palette()`를 매번 다시 읽는다. w, h는 CSS px. 문자열은 `querySelector` 선택자이므로 `"#id"`로 넘긴다. **만들자마자 draw를 한 번 부르므로** draw가 읽는 상태와 컨트롤(`MB.range`, `MB.seg`)을 먼저 만든다. draw 안에서 자기 반환값을 참조하지 않는다(초기화 전 접근 오류). 폭에 따라 높이가 달라져야 하면 옵션 객체에 `get height() { … }` getter를 넘긴다.
- `MB.drag(canvas|선택자, {start(x, y, e), move(x, y, e), end(), hover(x, y, e)})` 캔버스 위 끌기(마우스·터치, CSS px). draw에서 계산한 배치(상자, 축 변환)를 바깥 변수에 저장해 두고 move에서 역변환한다.
- `MB.chart(ctx, box|null, {x:[min,max], y:[min,max], logX, logY, xLabel, yLabel, xFmt, yFmt, xTicks, yTicks, series:[{data:[[x,y]], color, width, dash, fill}], vlines:[{x,color,label}], hlines:[{y,color,label}], points:[{x,y,color,r,label}], bands:[{x0,x1,color}]})` → `{X, Y, box}`. 금액 축은 `yFmt: MB.wonAxis`. box를 생략하면 왼쪽 여백 58px. 축 글자가 길면 box를 직접 준다.
- **`MB.candles(ctx, box|null, data:[{o,h,l,c,v}], {y, logY, volume(기본 true), volFrac, yFmt, xLabel(i)→문자열|null, overlays:[{data:[값|null], color, width, dash}], markers:[{i, price, shape:"up"|"down"|"dot", label, color}], hlines, bands:[{i0,i1,color}], highlight, hollow})`** → `{X(i), Y(price), box, vbox, cw, idx(px)}`. 양봉 빨강, 음봉 파랑, 아래에 거래량. 이동평균 등은 overlays로. `idx(px)`로 마우스 위치의 캔들을 찾는다.
- `MB.bars(ctx, box|null, {labels, stacks:[{label, color, data}], y, yFmt, yLabel, gap, hlines, highlight, valueFmt})` → `{X(i), Y, box, bw}` 누적 막대(음수는 아래로).
- `MB.donut(ctx, cx, cy, R, [{label, value, color}], {inner, center:{big, small}, labels, highlight})` → `{hit(x, y)}`.
- `MB.range(id, fmt, onInput)` → `get()`, `get.set(v)`. 출력은 `id + "-out"` 요소.
- `MB.seg(id, onChange)` → `get()`, `get.set(v)`. `MB.stat(id, html)`.
- `MB.loop(el, (dt, t) => {})` 화면에 보일 때만 도는 애니메이션. `.stop()`, `.start()`, `.toggle()`.
- `MB.palette()` → `{bg, text, dim, faint, grid, axis, border, surface, accent, accent2, ok, warn, bad, red, green, blue, up, down, upSoft, downSoft, series}`, `MB.color(name)`, `MB.isDark()`, `MB.onTheme(cb)`.
- 포맷: `MB.won(x)` "1억 2,346만원"(10만원 미만은 "45,000원"), `MB.wonAxis(x)` "1.2억", `MB.price(72300)` "72,300원"(`{short:true}`면 "72,300", `{usd:true}`면 "$12.50"), `MB.pct(0.0345)` "3.45%", `MB.chg(0.0345)` "+3.45%", `MB.tone(x)` 등락 클래스, `MB.toneColor(x)` 등락 색, `MB.fmt(x, digits)`.
- SVG 그림의 viewBox 폭은 420~480 정도로 잡는다. 640~720이면 360px 화면에서 글자가 6px까지 작아진다.
- 고정폭 글꼴(`MB.font(px, true)`, SVG의 `.t-mono`)은 숫자·영문에만 쓴다. 한글은 자간이 벌어진다.
- `MB.font(px, mono, weight)`, `MB.erf`, `MB.rng(seed)`, `MB.randn()`, `MB.randnSeeded(seed)`, `MB.poisson(λ)`, `MB.debounce`, `MB.clamp/lerp/map`, `MB.CHAPTERS`, `MB.STAGES`.

## 주식 계산 엔진 (`ST`, `js/stock.js`)
모든 장이 같은 계산과 같은 가상 시장을 쓰게 하는 공통 엔진이다. 호가·비용·세금·지표·가치평가·포트폴리오·백테스트·옵션 계산은 직접 만들지 말고 이것을 쓴다(장 고유의 작은 계산은 직접 해도 된다). 단위는 원, 비율은 소수, 변동성·수익률은 연 단위.
- 제도 값 `ST.KR`: `limit`(0.30), `session`, `nxt`, `settle`(2), `ticks`, `sellTax`({KOSPI:0.002, KOSDAQ:0.002, US:0}), `fee`(0.00015), `usFee`, `fxSpread`, `divTax`(0.154), `finIncomeLimit`(2천만), `overseasTax`(0.22), `overseasDeduction`(250만), `majorHolder`(50억), `isa`, `margin`({initial, maintenance:1.4, rate}), `vi`, `circuit`, `sidecar`.
- 호가·비용: `ST.tick(p)` 호가 단위, `ST.roundTick(p, "up"|"down")`, `ST.stepTick(p, k)` k호가 위/아래, `ST.limits(전일종가)` → `{upper, lower}`, `ST.cost({side, price, qty, market, fee})` → `{amount, fee, tax, total}`, `ST.roundTrip(market)` 왕복 비용률(0.23%).
- 세금: `ST.divTax(gross)` → `{gross, tax, net}`, `ST.overseasTax(gain)` → `{base, tax, net}`, `ST.finIncomeTax(fin, other)` → `{tax, rate, comprehensive}`, `ST.isaTax(profit)`.
- 통계: `ST.mean/std/cov/corr/percentile/sum`, `ST.hist(xs, bins, lo, hi)` → `{edges, counts, width}`, `ST.npdf`, `ST.ncdf`.
- 수익률: `ST.returns(prices)`, `ST.logReturns`, `ST.cumulate(rets, start)`, `ST.cagr(prices, ppy=252)`, `ST.annVol(rets, ppy)`, `ST.sharpe(rets, rf, ppy)`, `ST.sortino`, `ST.drag(mu, sigma)`, `ST.drawdowns(prices)`, `ST.maxDrawdown(prices)` → `{mdd, peak, trough, recovery}`, `ST.beta(ra, rm)`, `ST.summary(prices, ppy)` → `{total, cagr, vol, sharpe, mdd}`. 월간 데이터는 `ppy=12`.
- 시간 가치: `ST.fv`, `ST.pv`, `ST.npv(r, flows)`, `ST.irr(flows)`.
- 난수: `ST.rng(seed)` 0~1, `ST.gauss(seed)` 정규, `ST.fat(seed, df)` 두꺼운 꼬리. **시뮬레이터는 시드를 고정**해 새로고침해도 같은 그림이 나오게 하고, "다시 뽑기" 버튼에서만 시드를 바꾼다.
- 가격 경로: `ST.gbm({s0, mu, sigma, days, seed, n, jump:{lambda, mean, sd}, fat})` → 가격 배열(n을 주면 배열의 배열), `ST.garch({s0, mu, sigma, days, seed, alpha, beta})` → `{prices, vols}`, `ST.ohlc(closes, {seed, tick, vol0, sigma})` → 캔들, `ST.resample(candles, k)` 주봉(5)·월봉(21), `ST.tradingDays(start, n)`.
- **가상 시장 `ST.market()`**: 2016-01-04부터 2,601거래일(약 10년). `{days, dates, index(SB 종합지수 종가), indexCandles, stocks:{hanbit:[{o,h,l,c,v}],…}, closes:{hanbit:[…],…}, regimes:[{from, to, name, ret}], events:[{i, key, text, move}]}`. 국면: 완만한 상승 → 조정 → 강세장 → 급락(−34%, 40일) → 급반등 → 상승 → 약세장(−25%) → 횡보 → 회복과 상승. 지수 10년 +79%(연 5.8%), 최대 낙폭 −42%. 각 종목 마지막 종가는 `ST.CO`의 주가와 같다. 한 번 만들어 캐시하므로 여러 번 불러도 된다.
- **가상 유니버스 `ST.universe({n:300, months:120, seed:11})`**: 월간 300종목. `{months, market:[월 수익률], stocks:[{id, name, size, value, quality, lowvol, beta, rets:[…|null], price:[…|null], delistedAt}], factors:{value, size, quality, lowvol, mom}}`. 팩터·생존 편향(상장폐지 종목 포함)·백테스트 실험용.
- 지표(앞부분 null): `ST.sma(a, n)`, `ST.ema`, `ST.rollStd`, `ST.rsi(a, 14)`, `ST.macd(a, 12, 26, 9)` → `{macd, signal, hist}`, `ST.bollinger(a, 20, 2)` → `{mid, up, lo, pctB}`, `ST.atr(candles, 14)`, `ST.obv(candles)`, `ST.highest/lowest(a, n)`.
- 호가창: `new ST.Book({ref})`, `.seed({levels, seed, size})` 기준가 주변 호가 깔기, `.limit(side, price, qty, owner)` → 체결 배열(`.rest`: 남은 주문), `.market(side, qty, owner)`, `.cancel(id)`, `.depth(levels)` → `{asks, bids}`(각 `{price, qty, n}`), `.best()` → `{bid, ask, spread, mid}`, `.impact(side, qty)` → `{filled, avg, worst, slip}`(실행 안 함), `.trades`, `.last`. 동시호가 `ST.auction(orders, ref)` → `{price, volume, curve}`.
- 기업: `ST.CO`(위 표), `ST.COKEYS`, `ST.ratios(co)` → `{mcap, eps, bps, sps, dps, per, pbr, psr, roe, roa, opm, npm, dy, payout, debtRatio, ev, ebitda, evEbitda, fcfYield}`, `ST.dupont({net, sales, assets, equity})`, `ST.capm(rf, beta, mrp)`, `ST.wacc({E, D, re, rd, tax})`, `ST.gordon(d1, r, g)`, `ST.ddm2({d0, g1, n, g2, r})`, `ST.dcf({fcf0, growth(숫자|배열), years, wacc, tg, netDebt, shares})` → `{flows, pvSum, tv, pvTv, ev, equity, perShare, tvShare}`, `ST.reverseDcf({price, fcf0, years, wacc, tg, netDebt, shares})` → 성장률.
- 포트폴리오: `ST.covMatrix(sigmas, corr(숫자|행렬))`, `ST.port(w, mu, cov)` → `{mu, sigma}`, `ST.frontier2(a, b, rho)`, `ST.minVar(cov)`, `ST.tangency(mu, cov, rf)`, `ST.frontier(mu, cov, {lo, hi, steps})`(공매도 허용), `ST.randomPortfolios(mu, cov, n, seed, rf)`(공매도 없음), `ST.rebalance(prices[자산][시점], w, every, cost)` → `{value, weights, turnover}`, `ST.inv`, `ST.matVec`, `ST.dot`.
- 백테스트: `ST.backtest(closes, signal(배열|함수(i, closes)→목표 비중), {cost, rf, lookahead})` → `{equity, pos, trades, stats:{total, cagr, vol, sharpe, mdd, trades, exposure, winRate}}`. i 시점 신호는 i+1에 체결(lookahead:true면 일부러 미래 참조). `ST.dca(closes, amount, every)` → `{invested, units, value, avgCost, series}`. `ST.kelly(p, b)`, `ST.kellyCont(mu, r, sigma)`.
- 레버리지: `ST.leveraged(dailyRets, L, fee, borrow)` → 가치 배열, `ST.marginPath(path, {own, loanRatio, maintenance, rate})` → `{equity, ratio, callAt, liquidatedAt, final}`.
- 옵션: `ST.bs({S, K, T, r, sigma, q, type})` → `{price, delta, gamma, vega, theta(하루), rho, d1, d2}`, `ST.impliedVol(price, opts)`, `ST.binomial({…, n, american})`, `ST.payoff(legs, S)` (legs: `{type:"call"|"put"|"stock"|"future", K, qty, premium, price}`).
- 환율: `ST.fxReturn(rLocal, rFx)`.
- 케이스: `ST.HG` (`seed` 1,000만, `monthly` 70만, `horizon` 33년, `maxDrawdown` −0.3, `core` 0.8, `satellite` 0.2).

## 점검
- `python tools/check.py <slug>` (playwright 필요). 넓은 화면·라이트와 360px·다크로 열어 콘솔 오류, 가로 넘침, 조작 중 예외를 보고한다. `--shots 폴더`로 스크린샷을 남겨 눈으로도 본다.
- 브라우저 콘솔에 오류가 없어야 한다. 다크·라이트 테마 모두 확인.
- 캔버스 글자는 `MB.font()`로, 색은 `MB.palette()`로.
