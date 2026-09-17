/* 01e-잔치 — 들어오면 한 번 뜨는 잔치 초대장 (2026-09-17 우람님)

   🔴 이 파일은 **때가 지나면 통째로 지운다.** 그러라고 따로 뺐다 —
      홈.html 의 <script> 한 줄과 이 파일만 지우면 흔적이 없다.
      다른 코드가 이것을 부르지 않는다.

   한 사람이 한 기기에서 한 번만 본다. 본 표시는 설정(기기별)에 남는다 —
   서버로 안 나가므로 남의 기기에 영향이 없고, 지우면 다시 뜬다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 그림 = 'img/잔치/생일파티.jpg';
  var 단추글 = '생일파티 입장하기';
  var 본표시 = '잔치본때';

  function 봤나() {
    try { return !!ZG.저장소.설정읽기()[본표시]; } catch (e) { return true; }
  }

  function 열기() {
    var u = ZG.ui, 만들기 = u.만들기;
    if (document.querySelector('.잔치')) return;

    var 사진 = 만들기('img', { class: '잔치그림', src: 그림, alt: '' });
    var 단추 = 만들기('button', { class: 'btn main 잔치단추', type: 'button', text: 단추글 });

    var 막 = 만들기('div', { class: '잔치막' });
    var 판 = 만들기('div', { class: '잔치', role: 'dialog', 'aria-modal': 'true', 'aria-label': 단추글 }, [
      사진, 단추
    ]);

    function 닫기() {
      var 표시 = {};
      표시[본표시] = Date.now();
      try { ZG.저장소.설정쓰기(표시); } catch (e) { /* 못 적어도 화면은 넘어간다 */ }
      막.remove(); 판.remove();
      document.removeEventListener('keydown', 열쇠);
    }
    function 열쇠(e) { if (e.key === 'Escape') { e.preventDefault(); 닫기(); } }

    단추.addEventListener('click', 닫기);
    /* 🔴 막을 눌러도 닫지 않는다 — 초대장은 단추로만 넘어간다.
       잘못 스쳐 닫히면 「한 번만」이라 다시 볼 길이 없다 */
    document.addEventListener('keydown', 열쇠);

    document.body.appendChild(막);
    document.body.appendChild(판);
  }

  function 차리기() {
    if (봤나()) return;
    if (!ZG.사람 || !ZG.사람.나키()) return;   // 아직 누구인지 모른다 — 다음 기회에
    열기();
  }

  /* 내가 누구인지는 서버에서 세션을 받은 뒤에야 안다(01d 스스로챙기기).
     그래서 바로 한 번, 조금 뒤 한 번 더 두드린다. 이미 봤으면 봤나()가 막는다. */
  document.addEventListener('DOMContentLoaded', function () {
    차리기();
    setTimeout(차리기, 900);
    setTimeout(차리기, 2500);
  });

  ZG.잔치 = { 열기: 열기 };   /* 다시 보고 싶을 때 콘솔에서 ZG.잔치.열기() */
})(window.ZG);
