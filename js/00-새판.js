/* 00-새판 — 앱이 옛 화면을 든 채 안 바뀌는 것을 스스로 고친다 (2026-08-19)

   깃허브 Pages 는 HTML 에 `cache-control: max-age=600` 을 붙여 보낸다. 우리는 그 머리글을 못 고친다.
   `?v=` 는 js·css 만 갈아치운다 — HTML 이 옛것이면 그 안에 적힌 옛 `?v=` 를 부르니 아무것도 안 바뀐다.
   홈화면 앱(standalone)은 주소창도 새로고침 단추도 없어 손으로 풀 길이 아예 없다
   (2026-08-19 우람님 폰: 여러 번 완전히 껐다 켜도 옛 메모 화면 그대로였다).

   그래서 뜰 때마다 이 쪽의 HTML 을 캐시 무시하고 한 번 받아 판 번호를 대조한다.
   🔴 이 파일은 `00-확대금지.js` 바로 뒤, 여섯 화면 **전부**에 실려야 뜻이 있다.
   🔴 새 판을 올릴 때 `?v=` 를 안 올리면 이 장치도 같이 잔다 — 올리는 것을 잊지 마라. */
(function () {
  'use strict';

  /* 🔴 file:// 로 열었을 때는 아예 하지 않는다. fetch 가 막혀 있어 크롬이 콘솔에 **빨간 에러**를 찍는데,
     그 콘솔은 배포 전에 눈으로 훑는 곳이다(개발지침 §4) — 늘 켜져 있으면 진짜 에러를 놓친다.
     캐시가 문제되는 곳은 배포된 http(s) 뿐이라 잃는 것도 없다 */
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return;

  /* ── 서비스워커 — 탭을 누를 때마다 파일 39개를 다시 묻던 왕복을 없앤다 (우람님 9/3) ──
     🔴 여기 두는 까닭: 이 파일이 여섯 화면 **전부**에 실리고, 판 번호를 다루는 자리도 여기다.
        주소는 문서 기준으로 풀리므로 다스리는 범위도 이 폴더 안쪽이다.
     🔴 안 되는 브라우저·막힌 환경이면 조용히 지금까지 하던 대로 돈다. */
  if ('serviceWorker' in navigator) {
    try {
      navigator.serviceWorker.register('sw.js').catch(function () { /* 그냥 지금처럼 */ });
    } catch (e) { /* 그냥 지금처럼 */ }
  }

  /* 🔴 받아온 HTML 에서는 **이 파일의 줄만** 찾는다 (2026-09-17 고침).
     전에는 `\.(?:js|css)\?v=(\d+)` 로 「맨 처음 걸리는 것」을 잡았는데, 그게 <head> 의
     `css/공통.css?v=N` 이라 내 판(`00-새판.js?v=1`)과 영영 안 맞았다 —
     http(s) 로 열 때마다 되돌이 방패(2회)가 멈출 때까지 헛 새로고침을 두 번씩 했다.
     🔴 그래서 이제 **`00-새판.js` 의 `?v=` 가 배포 방아쇠다.** 판을 올릴 때 이것도 같이 올린다. */
  var 서버판찾기 = /00-새판\.js\?v=(\d+)/;

  var 나 = (document.currentScript && document.currentScript.src) || '';
  var 내판 = 나.match(서버판찾기);
  if (!내판) return;                        // ?v= 없이 여는 판이면 할 일이 없다
  내판 = 내판[1];

  /* 🔴 되돌이 새로고침 방패. 새 HTML 을 받고도 판이 안 맞으면(배포가 반쯤 올라간 중이면 그럴 수 있다)
     두 번까지만 시도하고 만다. 무한 새로고침은 그날 업무가 통째로 멈추는 사고다 */
  var 열쇠 = 'zg.새판시도';
  var 시도 = 0;
  try { 시도 = Number(sessionStorage.getItem(열쇠)) || 0; } catch (e) { /* 무시 */ }
  if (시도 >= 2) return;

  /* cache:'reload' 는 캐시를 무시하고 받아 **캐시까지 새것으로 갈아준다**.
     no-store 로 받으면 캐시가 그대로라 바로 뒤의 reload() 가 또 옛 HTML 을 쓴다 — 그래서 reload 다 */
  fetch(location.href, { cache: 'reload' }).then(function (답) {
    return 답 && 답.ok ? 답.text() : null;
  }).then(function (글) {
    if (!글) return;
    var 서버판 = 글.match(서버판찾기);
    if (!서버판 || 서버판[1] === 내판) {
      try { sessionStorage.removeItem(열쇠); } catch (e) { /* 무시 */ }
      return;   // 이미 새것이다
    }
    try { sessionStorage.setItem(열쇠, String(시도 + 1)); } catch (e) { /* 무시 */ }
    location.reload();
  }).catch(function () { /* 인터넷이 끊겼다 — 들고 있는 것으로 그냥 쓴다 */ });
})();
