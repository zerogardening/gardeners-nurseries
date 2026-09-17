/* 15e-견적앱 — 견적.html 셸. 상단탭 없는 한 화면이다.
   전에는 주문 화면 안 탭이었는데, 주문을 들어내면서 곁줄 네 번째로 독립했다 (2026-09-17). */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 뿌리, 본문;

  /* ── PC ── */
  function PC뼈대() {
    var 옆 = u.옆메뉴('견적 요청');
    var 머리 = 만들기('div', { class: 'pc-head' }, [
      만들기('h2', { text: '견적 요청' }),
      만들기('div', { class: 'path', text: '견적 요청' + (ZG.견적PC.상태.수정id ? ' › 수정' : '') })
    ]);
    본문 = 만들기('div', { class: 'pc-본문' });
    뿌리.appendChild(만들기('div', { class: 'shell' }, [옆, 만들기('div', { class: 'pc-main' }, [머리, 본문])]));
  }

  /* ── 폰 ── 견적은 아래 탭에 자리가 없어 「더보기」 안이다 */
  function 폰뼈대() {
    var m = ZG.견적폰;
    var 왼쪽 = 만들기('div', { class: '왼' });
    var 뒤 = 만들기('button', { class: 'ph-back', type: 'button', text: '‹', 'aria-label': '뒤로' });
    뒤.addEventListener('click', function () {
      if (m.상태.뷰 === '목록') location.href = 'index.html';
      else m.목록으로();
    });
    왼쪽.appendChild(뒤);
    왼쪽.appendChild(만들기('h1', { text: m.제목() }));

    var 요약 = m.요약();
    var 위 = 만들기('div', { class: 'ph-top' }, [왼쪽]);
    var 아래 = 만들기('div', { class: 'ph-sub' }, [
      만들기('span', { html: 요약.왼 || '' }), 만들기('span', { html: 요약.오 || '' })
    ]);
    본문 = 만들기('div', { class: 'ph-body' });
    뿌리.appendChild(만들기('div', { class: 'ph-shell' }, [위, 아래, 본문, u.탭바('견적')]));
  }

  function 다시그리기() {
    u.비우기(뿌리);
    if (u.폰인가()) { 폰뼈대(); ZG.견적폰.그리기(본문); }
    else { PC뼈대(); ZG.견적PC.그리기(본문); }
  }

  function 시작() {
    뿌리 = document.getElementById('앱');
    ZG.저장소.부팅();
    다시그리기();
    u.폰질의.addEventListener('change', 다시그리기);
  }

  ZG.견적앱 = { 시작: 시작, 다시그리기: 다시그리기 };
  document.addEventListener('DOMContentLoaded', 시작);
})(window.ZG);
