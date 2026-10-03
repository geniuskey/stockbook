# StockBook — 만져 보며 배우는 주식 교과서

호가창에서 옵션까지. 주식과 시장을 직접 만지며 배우는 한국어 인터랙티브 교과서입니다. [MoneyBook](https://moneybook.euiyun.com/)(돈 교과서)의 후속작입니다.
26개 챕터, 390여 개의 시뮬레이터, 그리고 호가·체결, 가격 경로, 기술적 지표, 가치평가, 포트폴리오, 백테스트, 옵션, 세금·비용을 같은 방식으로 계산하는 주식 계산 엔진(`js/stock.js`)과 10년치 가상 시장 데이터로 구성됩니다.
책 전체가 MoneyBook의 이한결(27세)이 처음 증권 계좌를 열고 1,000만원과 매달 70만원으로 첫 투자를 하는 과정을 따라가고, 25장에서는 독자가 가상 시장에서 직접 사고팝니다.

배포 주소: https://stockbook.euiyun.com/

## 실행
빌드 과정이 없는 정적 사이트입니다.

```bash
python -m http.server 8000   # → http://localhost:8000
```
`index.html`을 브라우저로 바로 열어도 동작합니다. KaTeX와 폰트는 CDN에서 불러오므로 인터넷 연결이 필요합니다.

## 구성

| 부 | 장 | 파일 | 주제 |
|---|---|---|---|
| 시장 | 01 | chapters/overview.html | 지분과 청구권, 창업에서 상장까지 |
| | 02 | chapters/market.html | 거래소와 증권사, T+2, 가격제한폭, VI |
| | 03 | chapters/orderbook.html | 호가창, 지정가·시장가, 체결 우선순위, 동시호가 |
| | 04 | chapters/price.html | 수요와 공급, 랜덤워크, 효율적 시장, 두꺼운 꼬리 |
| 기업 | 05 | chapters/statements.html | 손익계산서·재무상태표·현금흐름표 |
| | 06 | chapters/ratios.html | PER·PBR·ROE·EV/EBITDA, 듀퐁 |
| | 07 | chapters/valuation.html | DCF, 고든 성장, 역DCF, 안전마진 |
| | 08 | chapters/dividend.html | 배당락, 재투자, 자사주 매입 |
| | 09 | chapters/corporate.html | 증자와 희석, 분할, CB, IPO, 상장폐지 |
| 가격 | 10 | chapters/return.html | 로그 수익률, CAGR, 변동성 끌림, TWR·MWR |
| | 11 | chapters/chart.html | 캔들, 거래량, 이동평균, 로그 축, 수정주가 |
| | 12 | chapters/technical.html | RSI·MACD·볼린저, 그리고 그 한계 |
| 위험 | 13 | chapters/risk.html | 변동성과 낙폭, 분산, 베타, 꼬리 위험 |
| | 14 | chapters/portfolio.html | 효율적 투자선, 샤프, CAPM, 리밸런싱 |
| | 15 | chapters/index.html | 지수 계산, ETF 구조, 추적오차, 레버리지 ETF |
| | 16 | chapters/factor.html | 가치·모멘텀·규모·퀄리티·저변동 |
| 전략 | 17 | chapters/backtest.html | 미래 참조, 생존 편향, 과최적화 |
| | 18 | chapters/strategy.html | 적립식, 손절, 포지션 크기, 켈리 |
| | 19 | chapters/leverage.html | 신용과 반대매매, 공매도, 숏스퀴즈 |
| | 20 | chapters/derivatives.html | 선물, 옵션, 블랙-숄즈, 그릭스 |
| 환경 | 21 | chapters/macro.html | 금리와 할인율, 경기·업종 순환 |
| | 22 | chapters/global.html | 해외 주식, 환율, 환헤지 |
| | 23 | chapters/tax.html | 거래세·수수료, 배당세, 양도세, ISA |
| | 24 | chapters/psychology.html | 손실 회피, 처분 효과, 버블 |
| | 25 | chapters/lab.html | 모의투자 실험실 |
| | 26 | chapters/glossary.html | 용어집, 종합 퀴즈 |

공통 코드
- `css/style.css` — 디자인 토큰(라이트/다크, 상승 빨강·하락 파랑)
- `js/common.js` — 내비게이션, 캔버스·차트·캔들·막대·도넛·끌기 헬퍼, 전역 `MB`
- `js/stock.js` — 2026년 시장 제도 값, 호가 단위·가격제한폭·비용·세금, 호가창 체결 엔진, 가격 경로, 기술적 지표, 가치평가, 포트폴리오, 백테스트, 레버리지, 옵션, 가상 회사·가상 시장·가상 유니버스, 전역 `ST`
- `tools/head.py` — 챕터 `<head>`·사이트맵·JSON-LD 생성기
- `tools/check.py` — 페이지 점검기(콘솔 오류, 가로 넘침, 조작 중 예외)

챕터 작성 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.
등장하는 회사·지수·가격은 모두 교육용으로 만든 가상의 것입니다. 제도 수치는 2026년 한국 시장을 바탕으로 한 근사이며 바뀔 수 있습니다. 이 사이트는 특정 종목이나 상품을 권하지 않으며 투자·세무 자문이 아닙니다.

## 배포 (GitHub Pages)
저장소 루트가 그대로 사이트입니다. `CNAME`에 `stockbook.euiyun.com`이 들어 있고, `.nojekyll`로 Jekyll 처리를 끕니다. `main` 브랜치에 푸시하면 배포됩니다.

## 라이선스

Copyright (c) 2026 geniuskey and StockBook contributors

| 적용 대상 | 라이선스 | 재사용 조건 |
|---|---|---|
| JS·CSS·Python·HTML의 실행 코드 | [MIT](LICENSE-MIT) | 수정·재배포·상업적 이용 가능. 저작권 및 라이선스 고지 유지 |
| 교재 본문·그림·문제·해설 | [CC BY 4.0](LICENSE-CC-BY-4.0) | 수정·번역·재배포·상업적 이용 가능. 저작자·출처·라이선스 표시 및 변경 사실 명시 |

자세한 내용은 [라이선스 안내](LICENSE.md)를 참고하세요.
