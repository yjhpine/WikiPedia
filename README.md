# 열한 번째 관찰석 — Vertical Slice

어두운 제4관찰소 책상 앞에서 CRT를 켜고, PADS 위키 기록을 대조해 쪽지의 질문을 해결하는 브라우저 미스터리 게임입니다.

`node server.cjs`를 실행한 뒤 `http://127.0.0.1:4173`을 브라우저에서 열어 플레이합니다. 전원을 켠 뒤 쪽지를 확인하고, `L-017`과 `P-003`의 배치 코드를 대조해 답을 제출하세요.

- `Data/chapter01.js` — 문서·퍼즐·메시지 콘텐츠 데이터
- `app.js` — 게임 상태, 검색·링크·History·답안·이벤트 처리
- `styles.css` — 2.5D 사무실, CRT, PADS 화면 연출
- `server.cjs` — 모듈 스크립트를 올바른 MIME 유형으로 제공하는 간단한 로컬 서버
- `Docs/` — Chapter 1의 전체 내러티브 Source of Truth
