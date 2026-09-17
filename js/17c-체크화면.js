/* 17c-체크화면 — 체크리스트 탭 (2026-08-26 우람님)
   자료는 메모와 같은 표(gn.v1.메모)에 종류:'체크' 로 넣는다. 표를 새로 파면
   서버(v3_메모)에도 표를 하나 더 만들어야 한다 — 한 줄이 한 장이라 섞여도 서로를 안 덮는다.
   🔴 달은 「그 달에 등록한 것 + 아직 안 끝난 것 전부」다. 안 끝난 할일이 달을 넘겨 사라지면
      우람님이 못 보신다. 끝난 것만 그 달에 갇힌다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 저 = ZG.저장소, 키 = 저.키.메모;

  var 펼친것 = {};        // id → true. 카드를 눌러 상세를 펴 둔 것
  var 열린줄닫기 = null;  // 쓸어서 단추가 나와 있는 줄을 닫는 함수. 한 번에 하나만 연다
  var 방금끌었다 = false; // 쓸던 손가락이 뗀 자리에서 클릭이 한 번 더 온다 — 그걸 삼킨다

  /* 쓸었을 때 나오는 단추 — 아이폰 메모장처럼 그림 위, 글씨 아래.
     🔴 결 이름을 'edit' 로 두면 안 된다. 메모.css 의 `.edit` 는 본문 편집칸(흰 바탕·min-height 220px)이라
        단추가 그걸 뒤집어쓰고 흰 덩어리가 되어 사라진다 (2026-08-26 우람님: 수정 단추가 안 보였다) */
  var 그림 = {
    수정: '<path d="M4 20.5h4L20.2 8.3a2 2 0 0 0 0-2.8l-1.7-1.7a2 2 0 0 0-2.8 0L3.5 16v4.5z"/><path d="M14.5 6.2l3.3 3.3"/>',
    삭제: '<path d="M4 6.5h16"/><path d="M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7"/><path d="M6.6 6.5l.9 13.2a1.3 1.3 0 0 0 1.3 1.3h6.4a1.3 1.3 0 0 0 1.3-1.3l.9-13.2"/>'
  };
  function 쓸기단추(이름, 결, 누름) {
    var b = 만들기('button', { type: 'button', class: 결, 'aria-label': 이름 }, [
      만들기('span', {
        class: 'ic',
        html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
              'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + 그림[이름] + '</svg>'
      }),
      만들기('span', { class: 'lb', text: 이름 })
    ]);
    b.addEventListener('click', 누름);
    return b;
  }

  function 두자리(n) { return (n < 10 ? '0' : '') + n; }
  function 오늘() {
    var d = new Date();
    return d.getFullYear() + '-' + 두자리(d.getMonth() + 1) + '-' + 두자리(d.getDate());
  }
  function 새id() { return 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6); }

  /* ══════════ 자료 ══════════ */

  function 전부() {
    return 저.읽기(키).filter(function (r) { return r.종류 === '체크'; });
  }

  function 목록(달) {
    var 줄들 = 전부().filter(function (r) {
      var 등록달 = String(r.날짜 || '').slice(0, 7);
      if (등록달 === 달) return true;
      // 안 끝난 일은 앞으로만 넘어온다. 지난 달을 되짚어 볼 때 다음 달 일이 끼면 그 달 일이 아니다
      return !r.완료 && 등록달 < 달;
    });
    // 안 끝난 것이 위, 그 안에서는 등록 순서(만든때 오름차). 끝난 것은 아래로 내려가 끝낸 순서대로 쌓인다
    줄들.sort(function (a, b) {
      if (!a.완료 !== !b.완료) return a.완료 ? 1 : -1;
      if (a.완료) return (a.끝낸때 || a.고친때 || 0) - (b.끝낸때 || b.고친때 || 0);
      return (a.만든때 || 0) - (b.만든때 || 0);
    });
    return 줄들;
  }

  function 남은수(달) {
    return 목록(달).filter(function (r) { return !r.완료; }).length;
  }

  function 넣기(제목, 상세) {
    var 지금 = Date.now();
    저.덧붙이기(키, {
      id: 새id(), 종류: '체크', 제목: 제목, 상세: 상세 || '',
      완료: false, 날짜: 오늘(), 만든때: 지금, 고친때: 지금
    });
  }

  function 고치기(id, 변경) {
    변경.고친때 = Date.now();
    저.바꾸기(키, id, 변경);
  }

  /* ══════════ 할일 창 — 제목 · 상세 두 칸 ══════════ */
  /* 04-공통UI 의 물음()은 한 줄만 받는다. 껍데기(.askbox/.askscrim)는 그대로 빌려 쓰고 칸만 둘로 늘린다 */
  function 할일창(레코드, 그때) {
    if (document.querySelector('.askbox')) return;
    var 되돌릴포커스 = document.activeElement;

    var 제목칸 = 만들기('input', { class: 'inp', type: 'text', maxlength: '80', placeholder: '할 일' });
    제목칸.value = (레코드 && 레코드.제목) || '';
    var 상세칸 = 만들기('textarea', { class: 'inp', rows: '4', placeholder: '상세 내용 (없으면 비워 두세요)' });
    상세칸.value = (레코드 && 레코드.상세) || '';

    function 닫기(답) {
      document.removeEventListener('keydown', 열쇠);
      막.remove(); 상자.remove();
      if (되돌릴포커스 && 되돌릴포커스.focus) 되돌릴포커스.focus();
      if (답) 그때(답);
    }
    function 확정() {
      var t = 제목칸.value.trim();
      if (!t) { u.흔들기(제목칸); 제목칸.focus(); return; }
      닫기({ 제목: t, 상세: 상세칸.value.trim() });
    }
    function 열쇠(e) { if (e.key === 'Escape') { e.preventDefault(); 닫기(null); } }

    제목칸.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
      e.preventDefault(); 상세칸.focus();
    });

    var 막 = 만들기('div', { class: 'askscrim' });
    막.addEventListener('click', function () { 닫기(null); });
    var 아니오 = 만들기('button', { class: 'btn', type: 'button', text: '취소' });
    아니오.addEventListener('click', function () { 닫기(null); });
    var 예 = 만들기('button', { class: 'btn main', type: 'button', text: 레코드 ? '고치기' : '추가' });
    예.addEventListener('click', 확정);

    var 상자 = 만들기('div', {
      class: 'askbox' + (u.폰인가() ? ' sheetup' : ''), role: 'dialog', 'aria-modal': 'true'
    }, [
      만들기('h4', { text: 레코드 ? '할 일 고치기' : '새 할 일' }),
      만들기('div', { class: 'field' }, [만들기('label', { text: '제목' }), 제목칸]),
      만들기('div', { class: 'field' }, [만들기('label', { text: '상세 내용' }), 상세칸]),
      만들기('div', { class: 'btnrow' }, [아니오, 예])
    ]);

    document.body.appendChild(막);
    document.body.appendChild(상자);
    document.addEventListener('keydown', 열쇠);
    setTimeout(function () { 제목칸.focus(); 제목칸.select(); }, 20);
  }

  /* ══════════ 쓸어서 단추 내기 (아이폰 메모장) ══════════ */
  /* 🔴 세로로 굴리는 손가락을 가로로 오해하면 목록을 못 굴리신다 — |dx| 가 |dy| 보다 클 때만 잡는다 */
  function 쓸기붙이기(카드, 폭) {
    var 시작x = null, 시작y = null, 끌기 = false, 열림 = false;

    function 놓기(값) {
      열림 = 값;
      카드.style.transition = '';
      카드.style.transform = 값 ? 'translateX(-' + 폭 + 'px)' : '';
      열린줄닫기 = 값 ? 닫기 : (열린줄닫기 === 닫기 ? null : 열린줄닫기);
    }
    function 닫기() { 놓기(false); }

    카드.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.tagName === 'INPUT') return;   // 체크박스를 누른 손가락은 쓸기가 아니다
      시작x = e.clientX; 시작y = e.clientY; 끌기 = false;
    });
    카드.addEventListener('pointermove', function (e) {
      if (시작x == null) return;
      var dx = e.clientX - 시작x, dy = e.clientY - 시작y;
      if (!끌기) {
        if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return;
        끌기 = true;
        try { 카드.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
        if (열린줄닫기 && 열린줄닫기 !== 닫기) 열린줄닫기();
        카드.style.transition = 'none';
      }
      카드.style.transform = 'translateX(' + Math.min(0, Math.max(-폭, (열림 ? -폭 : 0) + dx)) + 'px)';
    });
    function 끝(e) {
      if (시작x == null) return;
      var dx = e.clientX - 시작x;
      시작x = null;
      if (!끌기) return;
      끌기 = false;
      방금끌었다 = true;
      놓기(열림 ? dx < 40 : dx < -50);
    }
    ['pointerup', 'pointercancel'].forEach(function (t) { 카드.addEventListener(t, 끝); });
    return 닫기;
  }

  /* ══════════ 카드 ══════════ */

  function 줄만들기(r, 달) {
    var 제목 = 만들기('div', { class: 't', text: r.제목 || '(제목 없음)' });
    var 몸조각 = [제목];
    if (r.상세) {
      몸조각.push(만들기('div', { class: 'dwrap' }, [만들기('div', { class: 'd', text: r.상세 })]));
    }
    if (!r.완료 && String(r.날짜 || '').slice(0, 7) !== 달) {
      제목.appendChild(만들기('span', { class: 'old', text: '지난 ' + Number(String(r.날짜).slice(5, 7)) + '월' }));
    }

    var 체크 = 만들기('input', { type: 'checkbox', class: 'ck' });
    체크.checked = !!r.완료;
    체크.addEventListener('click', function (e) { e.stopPropagation(); });
    체크.addEventListener('change', function () {
      고치기(r.id, { 완료: 체크.checked, 끝낸때: 체크.checked ? Date.now() : null });
      ZG.메모앱.다시그리기();
    });

    var 카드 = 만들기('div', {
      class: 'ckcard' + (r.완료 ? ' done' : '') + (r.상세 ? ' has' : '') + (펼친것[r.id] && r.상세 ? ' open' : '')
    }, [
      체크, 만들기('div', { class: 'body' }, 몸조각)
    ]);

    var 고침 = 쓸기단추('수정', 'ed', function () {
      할일창(r, function (값) { 고치기(r.id, 값); ZG.메모앱.다시그리기(); });
    });
    var 삭제 = 쓸기단추('삭제', 'del', function () {
      u.확인({ 제목: '「' + (r.제목 || '') + '」을 지울까요?', 확인글: '지우기', 위험: true }, function (예) {
        if (!예) return;
        저.지우기(키, r.id);
        열린줄닫기 = null;
        ZG.메모앱.다시그리기();
      });
    });

    var 줄 = 만들기('div', { class: 'ckrow' }, [
      만들기('div', { class: 'ckacts' }, [고침, 삭제]), 카드
    ]);
    var 닫기 = 쓸기붙이기(카드, 152);   // 단추 두 개 × 76px — 메모.css 의 .ckacts button 너비와 맞춰 둔다

    카드.addEventListener('click', function () {
      if (방금끌었다) { 방금끌었다 = false; return; }
      if (열린줄닫기 === 닫기) { 닫기(); return; }   // 단추가 나와 있으면 먼저 닫는다
      if (!r.상세) return;
      펼친것[r.id] = !펼친것[r.id];
      카드.classList.toggle('open', 펼친것[r.id]);
    });
    return 줄;
  }

  /* ══════════ 화면 ══════════ */

  function 달줄(달) {
    var 앞 = 만들기('button', { type: 'button', text: '‹', 'aria-label': '지난 달' });
    앞.addEventListener('click', function () { ZG.메모앱.달로(ZG.메모.달옮기기(달, -1)); });
    var 뒤 = 만들기('button', { type: 'button', text: '›', 'aria-label': '다음 달' });
    뒤.addEventListener('click', function () { ZG.메모앱.달로(ZG.메모.달옮기기(달, 1)); });
    return 만들기('div', { class: 'calhd' }, [앞, 만들기('div', { class: 'm', text: ZG.메모.달글(달) }), 뒤]);
  }

  function 추가누름() {
    할일창(null, function (값) { 넣기(값.제목, 값.상세); ZG.메모앱.다시그리기(); });
  }

  function 그리기(자리) {
    열린줄닫기 = null;
    var 달 = ZG.메모앱.달();
    var 줄들 = 목록(달);

    자리.appendChild(달줄(달));
    if (!줄들.length) {
      자리.appendChild(만들기('div', { class: 'empty', text: '할 일이 없습니다' }));
    } else {
      var 목 = 만들기('div', { class: 'cklist' });
      줄들.forEach(function (r) { 목.appendChild(줄만들기(r, 달)); });
      자리.appendChild(목);
    }

    if (u.폰인가()) {
      var 팹 = 만들기('button', { class: 'ph-fab', type: 'button', text: '＋', 'aria-label': '할 일 추가' });
      팹.addEventListener('click', 추가누름);
      자리.appendChild(팹);
    } else {
      var b = 만들기('button', { class: 'btn main', type: 'button', text: '＋ 할 일 추가' });
      b.addEventListener('click', 추가누름);
      자리.insertBefore(만들기('div', { class: 'ckadd' }, [b]), 자리.firstChild);
    }
  }

  function 요약() {
    var 달 = ZG.메모앱.달();
    return { 왼: ZG.메모.달글(달), 오: '남은 일 <b>' + 남은수(달) + '</b>건' };
  }
  function 폰머리() { return { 제목: '체크리스트' }; }

  ZG.메모.체크탭 = { 그리기: 그리기, 요약: 요약, 폰머리: 폰머리 };
  ZG.체크 = { 목록: 목록, 넣기: 넣기, 고치기: 고치기 };   /* 자체점검(체크-점검.js)이 부른다 */
})(window.ZG);
