/* 07-앱 — 부팅 · 뼈대 · 탭 전환 (설계 §4 · §8-4 · §8-5) */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  /* 🔴 `이름` 은 해시이자 열쇠다 — `#입고`·`#재고` 로 걸린 링크가 여기저기 있다.
     상품 화면은 들어오면 입고가 먼저다 (2026-09-17 우람님). */
  var 탭들 = [
    { 이름: '입고', 폰: true, 모듈: function () { return ZG.입고; } },
    { 이름: '재고', 폰: true, 모듈: function () { return ZG.재고; } }
  ];
  var 폰탭들 = 탭들.filter(function (t) { return t.폰; });
  var 지금 = '입고';
  var 뿌리, 본문;

  function 해시읽기() {
    var h = decodeURIComponent(location.hash.replace('#', ''));
    return 탭들.some(function (t) { return t.이름 === h; }) ? h : null;
  }

  function 현재모듈() {
    var 것 = 탭들.filter(function (t) { return t.이름 === 지금; })[0] || 탭들[0];
    return 것.모듈();
  }

  function 머리정보() {
    var m = 현재모듈();
    if (m.머리) return m.머리();
    var 요 = m.요약 ? m.요약() : { 왼: '', 오: '' };
    return { 제목: 지금, 뒤로: null, 왼: 요.왼, 오: 요.오 };
  }

  /* ── PC 뼈대 ── */
  function PC뼈대() {
    var 옆 = u.옆메뉴('상품');

    var 머리 = 만들기('div', { class: 'pc-head' }, [
      만들기('h2', { text: '상품' }),
      만들기('div', { class: 'path', text: '상품 › ' + 지금 })
    ]);

    var 탭 = 만들기('div', { class: 'pc-tabs', role: 'tablist' });
    var 알약 = 만들기('i', { class: 'ind' });
    탭.appendChild(알약);
    var 단추들 = 탭들.map(function (t) {
      var b = 만들기('button', {
        type: 'button', role: 'tab', text: t.이름,
        'aria-selected': t.이름 === 지금 ? 'true' : 'false',
        class: t.이름 === 지금 ? 'on' : ''
      });
      b.addEventListener('click', function () { 탭으로(t.이름); });
      탭.appendChild(b);
      return b;
    });

    본문 = 만들기('div', { class: 'pc-본문' });
    var 주 = 만들기('div', { class: 'pc-main' }, [머리, 탭, 본문]);
    뿌리.appendChild(만들기('div', { class: 'shell' }, [옆, 주]));

    // 알약을 켜진 탭 자리로
    var 켜짐 = 단추들[탭들.findIndex(function (t) { return t.이름 === 지금; })];
    requestAnimationFrame(function () {
      알약.style.width = 켜짐.offsetWidth + 'px';
      알약.style.transform = 'translateX(' + (켜짐.offsetLeft - 2) + 'px)';
    });
  }

  /* ── 폰 뼈대 ── */
  function 폰뼈대() {
    var 정보 = 머리정보();
    var 위 = 만들기('div', { class: 'ph-top' });
    // 뒤로갈 데가 있을 때만 제목 왼쪽에 「‹」 하나 (8/6 우람님) — 돌아갈 곳 이름은 적지 않는다
    var 왼쪽 = 만들기('div', { class: '왼' });
    if (정보.뒤로) {
      var 뒤 = 만들기('button', { class: 'ph-back', type: 'button', text: '‹', 'aria-label': '뒤로' });
      뒤.addEventListener('click', 정보.뒤로);
      왼쪽.appendChild(뒤);
    }
    if (정보.제목) 왼쪽.appendChild(만들기('h1', { text: 정보.제목, style: 정보.작게 ? 'font-size:22px' : null }));
    위.appendChild(왼쪽);

    var 아래 = (정보.왼 || 정보.오) ? 만들기('div', { class: 'ph-sub' }, [
      만들기('span', { html: 정보.왼 }), 만들기('span', { html: 정보.오 })
    ]) : null;

    본문 = 만들기('div', { class: 'ph-body' });

    /* 🔴 속탭 줄 — 기본화면·입고내역·작업중을 한 화면 안에서 오간다 (2026-09-14 우람님).
       전에는 폰 아래 탭바에서 입고/재고를 갈랐는데, 셋이 되면서 아래로는 안 들어간다.
       결은 메모 화면의 `.toggle` 과 같다. */
    var 속탭 = 만들기('div', { class: 'toggle 속탭', style: 'height:36px' });
    폰탭들.forEach(function (t) {
      var b = 만들기('button', {
        type: 'button', text: t.이름, style: 'flex:1; padding:0',
        class: t.이름 === 지금 ? 'on' : ''
      });
      b.addEventListener('click', function () { 탭으로(t.이름); });
      속탭.appendChild(b);
    });

    /* 「이미지」는 폰에 안 낸다 — PC 편집기 창을 얹는 자리라 폰에서는 못 쓴다 (8/13 우람님) */
    var 바 = u.탭바('입고', function (이름) {
      if (이름 !== '입고') return false;
      탭으로('입고');          // 「입고」를 다시 눌러도 페이지를 새로 열지 않는다
      return true;
    });

    뿌리.appendChild(만들기('div', { class: 'ph-shell' }, [위, 아래, 속탭, 본문, 바]));
  }

  function 다시그리기() {
    if (u.폰인가() && !폰탭들.some(function (t) { return t.이름 === 지금; })) 지금 = '입고';
    u.비우기(뿌리);
    if (u.폰인가()) 폰뼈대(); else PC뼈대();
    현재모듈().그리기(본문);
    if (u.폰인가()) 요약다시();
  }

  /* 폰 위쪽 요약줄만 다시 — 저장 뒤 숫자가 바뀔 때 */
  function 요약다시() {
    if (!u.폰인가()) return;
    var 정보 = 머리정보();
    var 줄 = 뿌리.querySelector('.ph-sub');
    if (!줄) return;
    줄.children[0].innerHTML = 정보.왼;
    줄.children[1].innerHTML = 정보.오;
  }

  /* ── 탭만 눌렀는데 폰 키보드가 올라오지 않게 한다 (8/6 우람님) ──
     재고 화면을 그리는 코드에는 검색칸에 커서를 주는 명령이 없다(06a·06b·06c 확인).
     탭을 바꾸면 화면을 통째로 다시 그리는데, 그때 사파리가 남아 있던 커서를
     새로 생긴 입력칸으로 옮겨 붙인다. 그래서 앞뒤로 한 번씩 뗀다.
     검색은 칸을 직접 누르시면 그때 올라온다. */
  function 키보드내리기() {
    var 것 = document.activeElement;
    if (것 && 것 !== document.body && 것.blur) 것.blur();
  }

  /* 다시 그린 직후 — 모듈이 일부러 준 커서(입고 수량칸 등)는 건드리지 않고
     저 혼자 잡힌 검색칸(type=search)만 뗀다. 검색칸에 커서를 주는 코드는 없다. */
  function 검색칸커서떼기() {
    requestAnimationFrame(function () {
      var 것 = document.activeElement;
      if (것 && 것.type === 'search' && 것.blur) 것.blur();
    });
  }

  function 탭으로(이름) {
    키보드내리기();
    if (location.hash === '#' + 이름) { 지금 = 이름; 다시그리기(); 검색칸커서떼기(); return; }
    location.hash = '#' + 이름;
  }

  function 해시바뀜() {
    var 새것 = 해시읽기();
    if (!새것) 새것 = '입고';
    if (새것 === 지금) return;
    키보드내리기();
    지금 = 새것;
    ZG.저장소.설정쓰기({ 마지막탭: 지금 });
    다시그리기();
    검색칸커서떼기();
  }

  function 시작() {
    뿌리 = document.getElementById('앱');
    ZG.저장소.부팅();
    지금 = 해시읽기() || ZG.저장소.설정읽기().마지막탭 || '입고';
    if (!location.hash) location.hash = '#' + 지금;
    다시그리기();

    window.addEventListener('hashchange', 해시바뀜);
    u.폰질의.addEventListener('change', 다시그리기);
    window.addEventListener('storage', function (e) {
      if (e.key && e.key.indexOf('gn.v1.') === 0) 다시그리기();
    });
  }

  ZG.앱 = { 시작: 시작, 다시그리기: 다시그리기, 요약다시: 요약다시 };
  document.addEventListener('DOMContentLoaded', 시작);
})(window.ZG);
