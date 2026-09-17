/* 00-확대금지 — 폰에서 앱처럼 쓰시게 두 손가락 확대를 막는다.

   안드로이드·PC 는 공통.css 의 html{touch-action:pan-x pan-y} 로 막힌다.
   아이폰 사파리는 iOS 10 부터 viewport 의 user-scalable=no 를 무시하고 touch-action 도 안 듣는다.
   그래서 사파리 전용 제스처 이벤트를 직접 막는 것 말고는 방법이 없다.

   동봉카드 창(.pcsheet.카드)이 떠 있을 때만 푼다 — 카드 글씨가 작아 키워 보셔야 한다.
   푸는 조건을 CSS 와 같은 선택자로 맞춰 둔다. 한쪽만 고치면 어긋난다. */
(function () {
  'use strict';

  /* 폰에서 「PC화면으로」 넘어가면 PC 배치가 폰 화면에 통째로 들어가 글씨가 작다 —
     그때는 확대를 막으면 못 읽는다. 04-공통UI 와 같은 열쇠를 본다(한쪽만 고치면 어긋난다) */
  function PC보기() {
    try { return localStorage.getItem('gn.v1.PC보기') === '1'; } catch (e) { return false; }
  }
  function 확대허용() { return PC보기() || !!document.querySelector('.pcsheet.카드'); }

  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (t) {
    document.addEventListener(t, function (e) {
      if (확대허용()) return;
      e.preventDefault();
    }, { passive: false });
  });
})();
