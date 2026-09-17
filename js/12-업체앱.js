/* 12-업체앱 — 업체.html 셸. 3탭 라우팅 · 폭 전환
   들어오면 업체등록이 먼저다 (2026-09-17 우람님). 「명세서발행」은 여기 세 번째 탭이다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 뿌리, 본문;
  var 탭 = '등록';          // 등록 · 목록 · 명세서
  var 명세서탭 = '작성';    // 작성 · 이력

  var 탭이름 = { 등록: '업체등록', 목록: '거래처목록', 명세서: '명세서발행' };

  function 지금모듈() {
    if (탭 === '등록') return ZG.업체폼;
    if (탭 === '목록') return ZG.업체목록;
    return 명세서탭 === '작성' ? ZG.명세서 : ZG.명세서이력;
  }

  function 길() {
    var 뒤 = 탭 === '명세서' ? ' › ' + 명세서탭 : '';
    return '업체 › ' + 탭이름[탭] + 뒤;
  }

  /* ── PC ── */
  function PC뼈대() {
    var 옆 = u.옆메뉴('업체');

    var 머리 = 만들기('div', { class: 'pc-head' }, [
      만들기('h2', { text: '업체' }), 만들기('div', { class: 'path', text: 길() })
    ]);

    var 탭줄 = 만들기('div', { class: 'pc-tabs', role: 'tablist' });
    [['등록', '업체등록'], ['목록', '거래처목록'], ['명세서', '명세서발행']].forEach(function (쌍) {
      var b = 만들기('button', {
        type: 'button', role: 'tab', text: 쌍[1],
        class: 탭 === 쌍[0] ? 'on' : '', 'aria-selected': 탭 === 쌍[0] ? 'true' : 'false'
      });
      b.addEventListener('click', function () { 탭으로(쌍[0]); });
      탭줄.appendChild(b);
    });

    본문 = 만들기('div', { class: 'pc-본문' });
    var 주조각 = [머리, 탭줄];
    if (탭 === '명세서') 주조각.push(서브탭());
    주조각.push(본문);
    뿌리.appendChild(만들기('div', { class: 'shell' }, [옆, 만들기('div', { class: 'pc-main' }, 주조각)]));
  }

  function 서브탭() {
    var 줄 = 만들기('div', { class: 'subtabs', role: 'tablist' });
    [['작성', '작성'], ['이력', '발행 이력']].forEach(function (쌍) {
      var b = 만들기('button', {
        type: 'button', role: 'tab', text: 쌍[1],
        class: 명세서탭 === 쌍[0] ? 'on' : '', 'aria-selected': 명세서탭 === 쌍[0] ? 'true' : 'false'
      });
      b.addEventListener('click', function () { 명세서탭으로(쌍[0]); });
      줄.appendChild(b);
    });
    return 줄;
  }

  /* ── 폰 ── 업체는 「더보기」 안이다 */
  function 폰뼈대() {
    var 정보 = 지금모듈().요약 ? 지금모듈().요약() : { 왼: '', 오: '' };
    var 제목 = 탭이름[탭];

    var 왼쪽 = 만들기('div', { class: '왼' });
    var 뒤 = 만들기('button', { class: 'ph-back', type: 'button', text: '‹', 'aria-label': '뒤로' });
    뒤.addEventListener('click', function () {
      if (탭 === '등록') location.href = 'index.html';
      else 탭으로('등록');
    });
    왼쪽.appendChild(뒤);
    왼쪽.appendChild(만들기('h1', { text: 제목 }));

    var 위 = 만들기('div', { class: 'ph-top' }, [왼쪽]);
    var 아래 = 만들기('div', { class: 'ph-sub' }, [
      만들기('span', { html: 정보.왼 || '' }), 만들기('span', { html: 정보.오 || '' })
    ]);

    본문 = 만들기('div', { class: 'ph-body', style: 'gap:var(--space-md)' });
    var 탭줄 = 만들기('div', { class: 'subtabs' });
    [['등록', '업체등록'], ['목록', '거래처목록'], ['명세서', '명세서발행']].forEach(function (쌍) {
      var b = 만들기('button', { type: 'button', class: 탭 === 쌍[0] ? 'on' : '', text: 쌍[1] });
      b.addEventListener('click', function () { 탭으로(쌍[0]); });
      탭줄.appendChild(b);
    });
    본문.appendChild(탭줄);
    if (탭 === '명세서') 본문.appendChild(서브탭());

    var 바 = u.탭바('업체');

    뿌리.appendChild(만들기('div', { class: 'ph-shell' }, [위, 아래, 본문, 바]));
  }

  function 다시그리기() {
    u.비우기(뿌리);
    if (u.폰인가()) 폰뼈대(); else PC뼈대();
    지금모듈().그리기(본문);
  }

  /* 폰 위쪽 요약줄만 다시 — 목록·품목 수가 바뀔 때 */
  function 요약다시() {
    if (!u.폰인가()) return;
    var m = 지금모듈();
    if (!m.요약) return;
    var 정보 = m.요약();
    var 줄 = 뿌리.querySelector('.ph-sub');
    if (!줄) return;
    줄.children[0].innerHTML = 정보.왼 || '';
    줄.children[1].innerHTML = 정보.오 || '';
  }

  function 탭으로(이름) { 탭 = 이름; 다시그리기(); }
  function 명세서탭으로(이름) { 탭 = '명세서'; 명세서탭 = 이름; 다시그리기(); }

  /* 명세서의 「⚙ 내 업체정보」 — 자사 업체의 수정 창을 연다. 명세서 안에서 자사를 고치지 않는다 */
  function 내업체정보() {
    var 자사 = ZG.업체자료.자사();
    if (!자사) {
      탭으로('등록');
      u.토스트('업체 등록에서 「공급자로 지정」을 체크해 주세요');
      return;
    }
    탭으로('목록');
    ZG.업체폼.수정열기(자사.id);
  }

  function 시작() {
    뿌리 = document.getElementById('앱');
    ZG.저장소.부팅();
    ZG.명세서.준비();
    다시그리기();
    u.폰질의.addEventListener('change', 다시그리기);
    window.addEventListener('storage', function (e) {
      if (e.key && e.key.indexOf('gn.v1.') === 0) 다시그리기();
    });
  }

  ZG.업체앱 = {
    시작: 시작, 다시그리기: 다시그리기, 요약다시: 요약다시,
    탭으로: 탭으로, 명세서탭으로: 명세서탭으로, 내업체정보: 내업체정보
  };
  document.addEventListener('DOMContentLoaded', 시작);
})(window.ZG);
