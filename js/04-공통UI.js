/* 04-공통UI — 포맷터 · 토스트 · 자동완성 · 스테퍼 (설계 §6-6 · §10 · §11) */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 폰질의 = window.matchMedia('(max-width: 899px)');
  var 움직임끔질의 = window.matchMedia('(prefers-reduced-motion: reduce)');

  function 폰인가() { return 폰질의.matches; }
  function 움직임끔() { return 움직임끔질의.matches; }

  /* ── 폰에서 PC 화면으로 탈출 ── (12단계)
     폰 브라우저의 화면 폭(layout viewport)을 1280 으로 못박으면 폰질의(max-width:899px)가 꺼지고
     다섯 화면이 저절로 PC 배치로 다시 그려진다(다들 폰질의 change 를 듣는다).
     🔴 화면마다 제 스위치를 두면 다섯이 어긋난다 — 여기 한 곳만 둔다.
     들고 나는 자리는 폰 「⋯ 더보기」와 PC 옆메뉴다. */
  var PC보기키 = 'gn.v1.PC보기';
  function PC보기인가() {
    try { return localStorage.getItem(PC보기키) === '1'; } catch (e) { return false; }
  }
  function 뷰포트맞추기() {
    var 켬 = PC보기인가();
    document.documentElement.classList.toggle('pc보기', 켬);   // 확대 잠금을 푸는 열쇠 (공통.css · 00-확대금지)
    var m = document.querySelector('meta[name="viewport"]');
    if (!m) return;
    m.setAttribute('content', 켬
      ? 'width=1280, viewport-fit=cover'
      : 'width=device-width, initial-scale=1, viewport-fit=cover');
  }
  function PC보기(켬) {
    try { localStorage.setItem(PC보기키, 켬 ? '1' : '0'); } catch (e) { /* 사파리 비공개 모드 */ }
    뷰포트맞추기();
    // viewport 를 바꿔도 안 듣는 판이 있다 — 배치가 그대로면 한 번만 다시 읽는다
    setTimeout(function () { if (PC보기인가() === 폰인가()) location.reload(); }, 80);
  }
  뷰포트맞추기();

  function 만들기(태그, 속성, 자식) {
    var e = document.createElement(태그);
    if (속성) Object.keys(속성).forEach(function (k) {
      if (k === 'class') e.className = 속성[k];
      else if (k === 'html') e.innerHTML = 속성[k];
      else if (k === 'text') e.textContent = 속성[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), 속성[k]);
      else if (속성[k] != null) e.setAttribute(k, 속성[k]);
    });
    (자식 || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }

  function 비우기(요소) { while (요소.firstChild) 요소.removeChild(요소.firstChild); }

  function 콤마(수) { return (Number(수) || 0).toLocaleString('ko-KR'); }
  function 숫자(문자) {
    var s = String(문자 == null ? '' : 문자).replace(/[,\s원]/g, '');
    var n = Number(s);
    return isNaN(n) ? 0 : n;
  }
  function 오늘문자() { return ZG.계산.날짜문자(Date.now()); }

  function 안전(문자) {
    return String(문자 == null ? '' : 문자)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ── 토스트 ── */
  function 토스트(글) {
    var 칸 = document.getElementById('토스트칸');
    if (!칸) return;
    var t = 만들기('div', { class: 'toast', role: 'status', 'aria-live': 'polite', text: 글 });
    칸.appendChild(t);
    var 머무름 = 움직임끔() ? 1200 : 2600;
    setTimeout(function () {
      t.className = 'toast 가는중';
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 260);
    }, 머무름);
  }

  /* ── 확인 대화상자 — macOS 방식. window.confirm 대신 톤을 맞춘다 ──
     되돌릴 수 없는 일(입고 삭제)과 되돌리기 어려운 일(새 업체 등록)에만 쓴다. */
  function 확인(옵션, 그때) {
    var 앞선것 = document.querySelector('.askbox');
    if (앞선것) return;                       // 두 겹으로 뜨지 않게
    var 되돌릴포커스 = document.activeElement;

    function 닫기(답) {
      document.removeEventListener('keydown', 열쇠);
      if (막) 막.remove();
      if (상자) 상자.remove();
      if (되돌릴포커스 && 되돌릴포커스.focus) 되돌릴포커스.focus();
      그때(답);
    }
    function 열쇠(e) {
      if (e.key === 'Escape') { e.preventDefault(); 닫기(false); }
      else if (e.key === 'Tab') {
        var 것들 = 상자.querySelectorAll('button');
        var 처음 = 것들[0], 끝 = 것들[것들.length - 1];
        if (e.shiftKey && document.activeElement === 처음) { e.preventDefault(); 끝.focus(); }
        else if (!e.shiftKey && document.activeElement === 끝) { e.preventDefault(); 처음.focus(); }
      }
    }

    var 막 = 만들기('div', { class: 'askscrim' });
    막.addEventListener('click', function () { 닫기(false); });

    var 아니오 = 만들기('button', { class: 'btn', type: 'button', text: 옵션.취소글 || '취소' });
    아니오.addEventListener('click', function () { 닫기(false); });
    var 예 = 만들기('button', { class: 'btn ' + (옵션.위험 ? 'warn' : 'main'), type: 'button', text: 옵션.확인글 || '확인' });
    예.addEventListener('click', function () { 닫기(true); });

    var 상자 = 만들기('div', { class: 'askbox', role: 'dialog', 'aria-modal': 'true' }, [
      만들기('h4', { text: 옵션.제목 }),
      옵션.본문 ? 만들기('p', { html: 옵션.본문 }) : null,
      만들기('div', { class: 'btnrow' }, [아니오, 예])
    ]);

    document.body.appendChild(막);
    document.body.appendChild(상자);
    document.addEventListener('keydown', 열쇠);
    setTimeout(function () { 예.focus(); }, 20);
  }

  /* ── 물음 — 한 줄만 받는 대화상자. window.prompt 를 쓰지 않는다 (4단계 설계 §3-2) ──
     답을 받으면 그때(글), 취소면 그때(null). 폰에서는 아래에서 올라오는 시트 모양이다. */
  function 물음(옵션, 그때) {
    if (document.querySelector('.askbox')) return;
    var 되돌릴포커스 = document.activeElement;

    var 칸 = 만들기('input', {
      class: 'inp', type: 'text', value: 옵션.값 || '',
      placeholder: 옵션.자리표시 || '', maxlength: String(옵션.최대 || 40)
    });

    function 닫기(답) {
      document.removeEventListener('keydown', 열쇠);
      막.remove(); 상자.remove();
      if (되돌릴포커스 && 되돌릴포커스.focus) 되돌릴포커스.focus();
      그때(답);
    }
    function 확정() {
      var v = 칸.value.trim();
      if (!v) { 흔들기(칸); 칸.focus(); return; }
      닫기(v);
    }
    function 열쇠(e) { if (e.key === 'Escape') { e.preventDefault(); 닫기(null); } }

    // 조합 중 Enter 는 글자 확정이지 제출이 아니다
    칸.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
      e.preventDefault(); 확정();
    });

    var 막 = 만들기('div', { class: 'askscrim' });
    막.addEventListener('click', function () { 닫기(null); });

    var 아니오 = 만들기('button', { class: 'btn', type: 'button', text: '취소' });
    아니오.addEventListener('click', function () { 닫기(null); });
    var 예 = 만들기('button', { class: 'btn main', type: 'button', text: 옵션.확인글 || '확인' });
    예.addEventListener('click', 확정);

    var 상자 = 만들기('div', {
      class: 'askbox' + (폰인가() ? ' sheetup' : ''), role: 'dialog', 'aria-modal': 'true'
    }, [
      만들기('h4', { text: 옵션.제목 }),
      옵션.본문 ? 만들기('p', { html: 옵션.본문 }) : null,
      만들기('div', { class: 'field' }, [
        만들기('label', { text: 옵션.이름 || '이름' }), 칸
      ]),
      만들기('div', { class: 'btnrow' }, [아니오, 예])
    ]);

    document.body.appendChild(막);
    document.body.appendChild(상자);
    document.addEventListener('keydown', 열쇠);
    setTimeout(function () { 칸.focus(); 칸.select(); }, 20);
  }

  /* ── 고르기 시트 — 항목 하나를 고른다. 취소면 그때(null) ── */
  function 고르기(옵션, 그때) {
    if (document.querySelector('.askbox')) return;
    var 되돌릴포커스 = document.activeElement;

    function 닫기(값) {
      document.removeEventListener('keydown', 열쇠);
      막.remove(); 상자.remove();
      if (되돌릴포커스 && 되돌릴포커스.focus) 되돌릴포커스.focus();
      그때(값);
    }
    function 열쇠(e) { if (e.key === 'Escape') { e.preventDefault(); 닫기(null); } }

    var 막 = 만들기('div', { class: 'askscrim' });
    막.addEventListener('click', function () { 닫기(null); });

    var 목록 = 만들기('div', { class: 'picklist' });
    (옵션.항목 || []).forEach(function (it) {
      var b = it.그림
        ? 만들기('button', { type: 'button', class: it.켬 ? 'on' : '',
            html: '<span class="ic">' + 아이콘(it.그림) + '</span>' + it.글 })
        : 만들기('button', { type: 'button', class: it.켬 ? 'on' : '', text: it.글 });
      b.addEventListener('click', function () { 닫기(it.값); });
      목록.appendChild(b);
    });

    var 닫기버튼 = 만들기('button', { class: 'btn', type: 'button', text: '닫기' });
    닫기버튼.addEventListener('click', function () { 닫기(null); });

    var 상자 = 만들기('div', {
      class: 'askbox' + (폰인가() ? ' sheetup' : ''), role: 'dialog', 'aria-modal': 'true'
    }, [
      만들기('h4', { text: 옵션.제목 }),
      옵션.본문 ? 만들기('p', { html: 옵션.본문 }) : null,
      목록,
      만들기('div', { class: 'btnrow' }, [닫기버튼])
    ]);

    document.body.appendChild(막);
    document.body.appendChild(상자);
    document.addEventListener('keydown', 열쇠);
  }

  /* ── 폰 아래 「⋯ 더보기」 ── 아래 탭에 자리가 셋뿐이라 나머지를 여기 모은다.
     네 화면(상품·업체·메모·견적)이 이 하나를 같이 쓴다 */
  function 더보기시트(지금) {
    고르기({
      제목: '더보기',
      항목: [
        { 값: '견적', 그림: '말풍선', 글: '견적 요청', 켬: 지금 === '견적' },
        { 값: 'PC보기', 그림: PC보기인가() ? '폰' : '화면', 글: PC보기인가() ? '폰화면으로' : 'PC화면으로' }
      ]
    }, function (값) {
      if (값 === '견적') location.href = '견적.html';
      else if (값 === 'PC보기') PC보기(!PC보기인가());
    });
  }

  /* ── 탭·메뉴 아이콘 ──
     이모지는 기기마다 그림이 다르고 색도 제멋대로다(아이폰·안드로이드·PC가 전부 다르게 그린다).
     24×24 선 아이콘 하나로 통일한다. 색은 currentColor 라 켜짐/꺼짐이 글씨색을 저절로 따라간다. */
  var 그림 = {
    화분: '<path d="M3 20.5h18"/><path d="M5 13h6l-.8 7.5H5.8zM13.5 13h5.5l-.8 7.5h-3.9z"/>' +
          '<path d="M8 13c0-2.6-2-4-4.2-4C3.8 11.6 5.8 13 8 13z"/><path d="M8 13c0-2.8 2-4.3 4.3-4.3C12.3 11.4 10.3 13 8 13z"/>',
    상자: '<path d="M12 2.5v7.5"/><path d="M8.6 6.8L12 10.2l3.4-3.4"/>' +
          '<path d="M4.2 12.5h15.6l-1.5 8.2H5.7z"/><path d="M4.2 12.5L6 9.6h12l1.8 2.9"/>',
    문서: '<path d="M6 2.5h8.5L18.5 6.5V21.5H6z"/><path d="M14.5 2.5v4h4"/><path d="M9 11h7M9 14.5h7M9 18h4"/>',
    온실: '<path d="M2.5 20.5h19"/><path d="M4.5 20.5v-9L12 6l7.5 5.5v9"/><path d="M12 6.2v14.3"/>' +
          '<path d="M4.5 11.5h15"/><path d="M8.2 11.5v9M15.8 11.5v9"/>',
    말풍선: '<path d="M3.5 4.5h17v11.5H9l-5.5 4.2z"/><path d="M7.5 8.5h9M7.5 12h5.5"/>',
    메모: '<path d="M5 2.5h10.5L19 6v15.5H5z"/><path d="M8.2 7.5h7.5M8.2 11h7.5M8.2 14.5h4.5"/>' +
          '<path d="M14.5 19.5l1.8-.5.6-1.8-1.3-1.3-1.8.6-.5 1.8z"/>',
    점셋: '<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
    폰:   '<rect x="5.5" y="2.5" width="13" height="19" rx="2.6"/><path d="M10.5 5.5h3"/><path d="M12 18.2h.01"/>',
    화면: '<rect x="2.5" y="3.5" width="19" height="13" rx="2.2"/><path d="M8.5 20.5h7M12 16.5v4"/>'
  };
  function 아이콘(이름) {
    return '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85"' +
           ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (그림[이름] || '') + '</svg>';
  }

  /* ── 눌렀을 때 아주 약한 진동 ──
     🔴 아이폰 사파리엔 navigator.vibrate 가 아예 없다. 대신 iOS 17.4 부터
     <input type=checkbox switch> 를 누르면 시스템이 약한 햅틱을 준다 —
     안 보이는 것을 하나 만들어 두고 대신 눌러 준다. 안 되는 기기에선 그냥 조용하다. */
  var 햅틱딱지, 햅틱스위치;
  function 햅틱() {
    try {
      if (navigator.vibrate) { navigator.vibrate(10); return; }
      if (!햅틱딱지) {
        햅틱딱지 = document.createElement('label');
        햅틱딱지.setAttribute('aria-hidden', 'true');
        /* 🔴 display:none 으로 숨기면 사파리가 아예 안 그려서 햅틱도 안 준다.
           그려는 두되 눈에 안 보이고 손도 안 닿는 자리로 치운다 */
        햅틱딱지.style.cssText =
          'position:fixed; left:-9999px; top:0; width:1px; height:1px; opacity:0; pointer-events:none';
        햅틱스위치 = document.createElement('input');
        햅틱스위치.type = 'checkbox';
        햅틱스위치.setAttribute('switch', '');
        햅틱스위치.tabIndex = -1;
        햅틱딱지.appendChild(햅틱스위치);
        document.body.appendChild(햅틱딱지);
      }
      햅틱딱지.click();
      햅틱스위치.blur();   // 딱지를 누르면 커서가 이리 옮겨온다 — 바로 뗀다
    } catch (e) { /* 못 하는 기기면 조용히 넘어간다 */ }
  }

  /* ── 손이 닿기 전엔 키보드가 안 뜨게 ──
     🔴 탭을 바꾸면 화면을 통째로 다시 그리는데, 아이폰은 사라진 칸에 있던 커서를
     새로 생긴 첫 입력칸(대개 검색칸)으로 옮겨 붙인다. 그래서 입고에서 재고로 넘어가면
     검색칸에 커서가 붙어 키보드가 저 혼자 올라왔다(8/6 에 blur 로 막아봤지만 늦어서 놓친다).
     읽기전용 칸에는 키보드가 아예 안 뜬다 — 손이 닿는 그 순간에 푼다.
     🔴 폰에서만 건다. PC 는 소프트 키보드가 없고, Tab 키로 들어오는 길을 막으면 안 된다. */
  function 손대야열림(칸) {
    if (!폰인가()) return 칸;
    칸.readOnly = true;
    var 풀기 = function () { 칸.readOnly = false; };
    칸.addEventListener('touchstart', 풀기, { passive: true });
    칸.addEventListener('mousedown', 풀기);
    return 칸;
  }

  /* ── 폰 아래 탭바 · PC 왼쪽 메뉴 ──
     화면마다 제 것을 만들면 메뉴 하나 늘 때 여러 곳을 고쳐야 한다. 네 화면이 이 둘을 같이 쓴다.
     🔴 곁줄은 넷이다 — 상품 · 업체 · 메모 · 견적 요청.
        「재고」는 상품 안 상단탭, 「명세서 발행」은 업체 안 상단탭이다. */
  var 탭칸 = [
    { 이름: '입고', 아이콘: '상자', 주소: 'index.html#입고' },
    { 이름: '업체', 아이콘: '온실', 주소: '업체.html' },
    { 이름: '메모', 아이콘: '메모', 주소: '메모.html' }
  ];
  var 옆칸 = [
    { 이름: '상품',      아이콘: '화분',   주소: 'index.html' },
    { 이름: '업체',      아이콘: '온실',   주소: '업체.html' },
    { 이름: '메모',      아이콘: '메모',   주소: '메모.html' },
    { 이름: '견적 요청', 아이콘: '말풍선', 주소: '견적.html' }
  ];

  /* 지금: 탭칸 이름 하나. 넷에 없는 값('업체'·'소싱')이면 「더보기」가 켜지고 그 값이 시트로 넘어간다.
     눌림(이름): true 를 돌려주면 그 화면이 제자리에서 처리한 것으로 보고 주소로 안 옮긴다.
     🔴 <nav> 를 돌려주기만 한다. 붙이는 것도, 높이를 재는 것도 부르는 쪽 몫이다(08b 가 잰다). */
  function 탭바(지금, 눌림) {
    var 바 = 만들기('nav', { class: 'ph-nav' });
    var 안에있나 = 탭칸.some(function (t) { return t.이름 === 지금; });
    탭칸.forEach(function (t) {
      var b = 만들기('button', {
        type: 'button', class: t.이름 === 지금 ? 'on' : '',
        html: '<span class="ic">' + 아이콘(t.아이콘) + '</span>' + t.이름
      });
      b.addEventListener('click', function () {
        햅틱();
        if (눌림 && 눌림(t.이름) === true) return;
        if (t.이름 === 지금) return;   // 제 화면을 다시 부르면 쓰던 것이 날아간다
        location.href = t.주소;
      });
      바.appendChild(b);
    });
    var 더보기 = 만들기('button', {
      type: 'button', class: 안에있나 ? '' : 'on',
      html: '<span class="ic">' + 아이콘('점셋') + '</span>더보기'
    });
    더보기.addEventListener('click', function () { 햅틱(); 더보기시트(안에있나 ? '' : 지금); });
    바.appendChild(더보기);
    return 바;
  }

  function 옆메뉴(지금) {
    // 작은 자리에는 심볼만 — 글씨 로고는 이 크기에서 안 읽힌다 (img/브랜드/_확인2.html)
    var 상호 = 만들기('div', { class: 'brand' }, [
      만들기('img', { src: 'img/브랜드/심볼-배지.png', alt: '' }),
      만들기('div', {}, [
        만들기('div', { class: 'nm', text: '정원사의 널서리' }),
        만들기('div', { class: 'en', text: "GARDENER'S NURSERIES IWOL" })
      ])
    ]);
    var 옆 = 만들기('aside', { class: 'pc-side' }, [
      상호,
      만들기('div', { class: 'slogan', style: 'padding:8px 18px 14px', text: '충북 진천군 이월면 · 생산농가' })
    ]);
    옆칸.forEach(function (m) {
      var b = 만들기('button', {
        type: 'button', class: m.이름 === 지금 ? 'on' : '',
        html: '<span class="ic">' + 아이콘(m.아이콘) + '</span>' + m.이름
      });
      if (m.이름 !== 지금) b.addEventListener('click', function () { location.href = m.주소; });
      옆.appendChild(b);
    });
    // 폰에서 넘어온 사람만 돌아갈 문을 본다 — 진짜 PC 에는 안 보인다
    if (PC보기인가()) {
      var 되돌리기 = 만들기('button', { type: 'button', html: '<span class="ic">' + 아이콘('폰') + '</span>폰화면으로' });
      되돌리기.addEventListener('click', function () { PC보기(false); });
      옆.appendChild(되돌리기);
    }
    옆.appendChild(만들기('div', { class: 'sidefoot' }, [
      만들기('img', { src: 'img/브랜드/캐리커쳐4인.png', alt: '' }),
      만들기('div', { class: 'say', text: '오늘도 잘 자라고 있습니다' })
    ]));
    return 옆;
  }

  /* ── 창 Esc 는 주인이 하나다 ──
     창(.pcsheet)은 한 번에 하나만 뜬다. 그런데 모듈마다 document 에 제 리스너를 걸어 두면
     앞 창 것이 안 떨어진 채로 남아, 확인 상자 위에서 Esc 를 눌렀을 때 그 창까지 같이 닫혔다.
     (동봉카드 위에 설정 창 → 삭제 확인 → Esc → 쓰던 값 통째로 날아감. 2026-08-05 검수)
     그래서 자리를 하나만 둔다. 새로 걸면 앞엣것은 그 자리에서 밀려난다. */
  var 탈출할일 = null;

  function 탈출열쇠(e) {
    if (e.key !== 'Escape' || !탈출할일) return;
    if (document.querySelector('.askbox')) return;   // 확인 상자가 떠 있으면 Esc 는 그 상자 몫이다
    탈출할일();
  }

  function 탈출걸기(할일) {
    document.removeEventListener('keydown', 탈출열쇠);
    탈출할일 = 할일;
    document.addEventListener('keydown', 탈출열쇠);
  }

  function 탈출풀기() {
    탈출할일 = null;
    document.removeEventListener('keydown', 탈출열쇠);
  }

  /* ── 검사 실패한 칸 흔들기 ── */
  function 흔들기(요소) {
    if (!요소) return;
    요소.getAnimations && 요소.getAnimations().forEach(function (a) { a.cancel(); });
    요소.classList.remove('흔듦');
    void 요소.offsetWidth;
    요소.classList.add('흔듦');
    setTimeout(function () { 요소.classList.remove('흔듦'); }, 320);
  }

  /* ── 목록 등장 — 앞 6줄만 시차 (설계 §10-3) ── */
  function 목록등장(줄들) {
    Array.prototype.slice.call(줄들).forEach(function (줄, i) {
      if (i >= 6) return;
      줄.classList.add('등장');
      줄.style.animationDelay = (i * 24) + 'ms';
      줄.addEventListener('animationend', function () {
        줄.classList.remove('등장'); 줄.style.animationDelay = '';
      }, { once: true });
    });
  }

  function 번쩍(요소) {
    if (!요소) return;
    요소.classList.add('번쩍');
    setTimeout(function () { 요소.classList.remove('번쩍'); }, 700);
  }

  /* ── 한글 IME 안전 입력 ──
     아이폰에서 「휴케라」가 ㅎㅠㅋㅔㄹㅏ 로 떨어지던 버그.
     조합(composition) 중에 목록을 다시 그리면 조합이 끊긴다.
     그래서 조합이 끝난 뒤에만, 그것도 debounce 를 걸어 한 번만 처리한다.
     처리(값) 안에서 입력칸의 value 를 덮어쓰거나 DOM 을 갈아끼우지 않는다. */
  function 조합안전입력(입력, 처리, 지연) {
    var 조합중 = false, 타이머 = null;
    var 밀리 = 지연 == null ? 180 : 지연;

    function 예약() {
      clearTimeout(타이머);
      타이머 = setTimeout(function () { 처리(입력.value); }, 밀리);
    }

    입력.addEventListener('compositionstart', function () { 조합중 = true; });
    // 브라우저에 따라 compositionend 시점에 isComposing 이 이미 false 다 — 여기서 한 번 확실히 처리한다
    입력.addEventListener('compositionend', function () { 조합중 = false; 예약(); });
    입력.addEventListener('input', function (e) {
      if (조합중 || e.isComposing) return;
      예약();
    });
    return { 조합중: function () { return 조합중; }, 취소: function () { clearTimeout(타이머); } };
  }

  /* ── 스테퍼 — 길게 누르면 연속 (설계 §8-2) ── */
  function 스테퍼(값, 바뀜) {
    var 숫자칸 = 만들기('div', { class: 'num', text: String(값) });
    var 지금 = 값;

    function 놓기(delta) {
      지금 = Math.max(0, 지금 + delta);
      숫자칸.textContent = String(지금);
      숫자칸.classList.remove('톡'); void 숫자칸.offsetWidth; 숫자칸.classList.add('톡');
      바뀜(지금);
    }

    function 누름버튼(글, delta) {
      var 타이머 = null, 반복 = null;
      function 멈춤() { clearTimeout(타이머); clearInterval(반복); }
      var b = 만들기('button', { type: 'button', text: 글, 'aria-label': delta > 0 ? '하나 늘리기' : '하나 줄이기' });
      b.addEventListener('click', function () { 놓기(delta); });
      b.addEventListener('pointerdown', function () {
        타이머 = setTimeout(function () { 반복 = setInterval(function () { 놓기(delta); }, 60); }, 400);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (e) { b.addEventListener(e, 멈춤); });
      return b;
    }

    var 상자 = 만들기('div', { class: 'stepper' }, [누름버튼('－', -1), 숫자칸, 누름버튼('＋', 1)]);
    상자.맞추기 = function (새값) { 지금 = 새값; 숫자칸.textContent = String(새값); };
    return 상자;
  }

  /* ── 자동완성 (설계 §6-6) ──
     묶는 단위는 접두 5자. 규격만 다른 것은 한 줄로 묶는다. */
  function 후보찾기(글) {
    var 열쇠 = String(글).toLowerCase().replace(/\s/g, '');
    if (!열쇠) return [];
    var 저 = ZG.저장소;
    var 품목 = 저.품목들();
    var 입고 = 저.읽기(저.키.입고);

    var 묶음 = {};
    품목.forEach(function (p) {
      var 이름 = String(p.유통명).toLowerCase().replace(/\s/g, '');
      var 밭 = 이름 + String(p.학명).toLowerCase().replace(/\s/g, '') + String(p.품목코드).toLowerCase();
      if (밭.indexOf(열쇠) < 0) return;
      var g = 묶음[p.접두] || (묶음[p.접두] = { 접두: p.접두, 품목들: [], 입고건수: 0, 최근입고일: '', 최근규격: '', 최근단가: 0, 자리: 99 });
      g.품목들.push(p);
      /* 유사순 — 이름의 몇 번째 글자에서 걸렸나. 0 이면 「버들마편초」처럼 첫 글자부터 맞은 것이다.
         이름에 없고 학명·코드에만 있으면 50 으로 뒤로 보낸다 (우람님 지시 8/10) */
      var 자리 = 이름.indexOf(열쇠);
      g.자리 = Math.min(g.자리, 자리 < 0 ? 50 : 자리);
    });

    Object.keys(묶음).forEach(function (접두) {
      var g = 묶음[접두];
      g.품목들.sort(function (a, b) { return a.규격cm - b.규격cm; });
      g.대표 = g.품목들[0];
      입고.forEach(function (r) {
        if (String(r.품목코드).slice(0, 5) !== 접두) return;
        g.입고건수 += 1;
        if (String(r.입고일) >= g.최근입고일) {
          g.최근입고일 = String(r.입고일); g.최근규격 = r.규격; g.최근단가 = r.매입단가;
        }
      });
      if (!g.최근규격) { g.최근규격 = g.대표.규격; g.최근단가 = g.대표.매입단가; }
    });

    return Object.keys(묶음).map(function (k) { return 묶음[k]; })
      .sort(function (a, b) { return a.자리 !== b.자리 ? a.자리 - b.자리 : b.입고건수 - a.입고건수; })
      .slice(0, 8);
  }

  function 자동완성(설정) {
    var 입력 = 설정.입력, 담을곳 = 설정.담을곳;
    var 목록 = [], 고른칸 = -1, 상자 = null, 감시 = null;

    function 닫기() {
      /* 🔴 예약된 타자 타이머를 같이 끊는다. 안 끊으면 목록에서 고른 150ms 뒤에 타이머가 뒤늦게
         터져 방금 고른 그 한 건이 다시 뜬다 — 두 번 고르는 것처럼 보인다 (우람님 지시 8/10) */
      if (감시) 감시.취소();
      if (상자 && 상자.parentNode) 상자.parentNode.removeChild(상자);
      상자 = null; 고른칸 = -1;   // 목록은 지우지 않는다 — 그리기()가 닫기()를 먼저 부른다
      입력.setAttribute('aria-expanded', 'false');
    }

    function 표시() {
      var 줄들 = 상자 ? 상자.querySelectorAll('.it') : [];
      Array.prototype.forEach.call(줄들, function (줄, i) {
        줄.classList.toggle('on', i === 고른칸);
        줄.setAttribute('aria-selected', i === 고른칸 ? 'true' : 'false');
      });
    }

    function 그리기() {
      닫기();
      if (!목록.length && !설정.새로) return;
      상자 = 만들기('div', { class: 'ac', role: 'listbox' });
      상자.appendChild(만들기('div', {
        class: 'hd',
        text: 목록.length
          ? '전에 넣은 것에서 ' + 목록.length + '건 찾았습니다 — 고르면 학명 · 품목코드가 저절로 채워집니다'
          : '전에 넣은 것에는 없습니다'
      }));

      목록.forEach(function (g, i) {
        var 왼 = 만들기('div', {}, [
          만들기('div', { class: 'nm', text: g.대표.유통명 }),
          만들기('div', { class: 'sci', text: g.대표.학명 })
        ]);
        var 자식 = [만들기('div', { class: 'cd', text: g.접두 }), 왼];
        if (!폰인가()) {
          자식.push(만들기('div', {
            class: 'rg',
            html: '입고 ' + g.입고건수 + '건 · 최근 ' + 안전(g.최근입고일 || '—') +
                  '<br>' + 안전(g.최근규격) + ' · ' + 콤마(g.최근단가) + '원'
          }));
        }
        var 줄 = 만들기('button', { type: 'button', class: 'it', role: 'option', 'aria-selected': 'false' }, 자식);
        줄.addEventListener('mousedown', function (e) { e.preventDefault(); });
        줄.addEventListener('click', function () { var g2 = g; 닫기(); 설정.고름(g2); });
        줄.addEventListener('mousemove', function () { 고른칸 = i; 표시(); });
        상자.appendChild(줄);
      });

      if (설정.새로) {
        var 새줄 = 만들기('button', {
          type: 'button', class: 'new',
          html: '＋ 목록에 없습니다 — 새 품목으로 등록 <span>학명을 끝까지 치면 품목코드가 새로 만들어집니다</span>'
        });
        새줄.addEventListener('mousedown', function (e) { e.preventDefault(); });
        새줄.addEventListener('click', function () { 닫기(); 설정.새로(); });
        상자.appendChild(새줄);
      }

      담을곳.appendChild(상자);
      입력.setAttribute('aria-expanded', 'true');
    }

    입력.setAttribute('role', 'combobox');
    입력.setAttribute('aria-expanded', 'false');
    입력.setAttribute('autocomplete', 'off');

    감시 = 조합안전입력(입력, function (값) {
      var 글 = String(값).trim();
      if (글.length < 1) { 목록 = []; 닫기(); return; }
      목록 = 후보찾기(글); 고른칸 = -1; 그리기();
    }, 150);

    입력.addEventListener('keydown', function (e) {
      if (e.isComposing || e.keyCode === 229) return;   // 조합 중 Enter 는 글자 확정이지 선택이 아니다
      if (!상자) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); 고른칸 = Math.min(고른칸 + 1, 목록.length - 1); 표시(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); 고른칸 = Math.max(고른칸 - 1, 0); 표시(); }
      else if (e.key === 'Enter') {
        if (고른칸 >= 0) { e.preventDefault(); var g = 목록[고른칸]; 닫기(); 설정.고름(g); }
      } else if (e.key === 'Escape') { e.preventDefault(); 닫기(); }
      else if (e.key === 'Tab') { 닫기(); }
    });

    입력.addEventListener('blur', function () { setTimeout(닫기, 120); });

    return { 닫기: 닫기 };
  }

  /* ── 업체 자동완성 ──
     후보는 업체 관리에 등록된 곳이다. 🔴 목록에 없는 이름도 그냥 칠 수 있어야 해서
     고르기를 강요하지 않는다 — 안 고르면 친 글자가 그대로 값이다.
     품목용 자동완성()은 후보찾기(품목)에 묶여 있어 여기 못 쓴다. 목록 모양(.ac)만 같이 쓴다. */
  function 업체자동완성(설정) {
    var 입력 = 설정.입력, 담을곳 = 설정.담을곳;
    var 목록 = [], 고른칸 = -1, 상자 = null, 감시 = null;
    var 앞세울 = 설정.앞구분 || '';

    function 닫기() {
      if (감시) 감시.취소();      // 예약된 타자 타이머가 뒤늦게 터져 목록이 다시 뜨는 것을 막는다
      if (상자 && 상자.parentNode) 상자.parentNode.removeChild(상자);
      상자 = null; 고른칸 = -1;
      입력.setAttribute('aria-expanded', 'false');
    }

    function 업체들() {
      if (ZG.업체자료) return ZG.업체자료.목록();
      return ZG.저장소.읽기(ZG.저장소.키.업체);   // 업체자료가 안 실린 화면(상품)에서도 돈다
    }

    function 찾기(글) {
      var q = String(글 || '').trim().toLowerCase();
      var 것들 = 업체들().filter(function (c) { return c && c.이름; });
      if (q) {
        것들 = 것들.filter(function (c) {
          return [c.이름, c.대표, c.담당자].some(function (s) {
            return String(s || '').toLowerCase().indexOf(q) >= 0;
          });
        });
      }
      것들.sort(function (a, b) {
        if (앞세울) {
          var x = a.구분 === 앞세울 ? 0 : 1, y = b.구분 === 앞세울 ? 0 : 1;
          if (x !== y) return x - y;
        }
        if (q) {   // 한 글자만 쳐도 뜬다 — 이름 첫 글자부터 맞은 곳을 앞에 세운다
          var i = String(a.이름).toLowerCase().indexOf(q), j = String(b.이름).toLowerCase().indexOf(q);
          if (i < 0) i = 50; if (j < 0) j = 50;
          if (i !== j) return i - j;
        }
        return String(a.이름).localeCompare(String(b.이름), 'ko');
      });
      return 것들.slice(0, 8);
    }

    function 표시() {
      var 줄들 = 상자 ? 상자.querySelectorAll('.it') : [];
      Array.prototype.forEach.call(줄들, function (줄, i) {
        줄.classList.toggle('on', i === 고른칸);
        줄.setAttribute('aria-selected', i === 고른칸 ? 'true' : 'false');
      });
    }

    function 고르기실행(c) { 닫기(); 설정.고름(c); }

    function 그리기() {
      닫기();
      if (!목록.length) return;
      상자 = 만들기('div', { class: 'ac', role: 'listbox' });
      상자.appendChild(만들기('div', { class: 'hd', text: '업체 관리에 등록된 곳 ' + 목록.length + '곳' }));
      목록.forEach(function (c, i) {
        var 아래 = [c.구분, c.대표, c.전화].filter(Boolean).join(' · ');
        var 줄 = 만들기('button', { type: 'button', class: 'it', role: 'option', 'aria-selected': 'false' }, [
          만들기('div', {}, [만들기('div', { class: 'nm', text: c.이름 }), 만들기('div', { class: 'sub', text: 아래 })])
        ]);
        줄.addEventListener('mousedown', function (e) { e.preventDefault(); });
        줄.addEventListener('click', function () { 고르기실행(c); });
        줄.addEventListener('mousemove', function () { 고른칸 = i; 표시(); });
        상자.appendChild(줄);
      });
      담을곳.appendChild(상자);
      입력.setAttribute('aria-expanded', 'true');
    }

    입력.setAttribute('role', 'combobox');
    입력.setAttribute('aria-expanded', 'false');
    입력.setAttribute('autocomplete', 'off');

    감시 = 조합안전입력(입력, function (값) { 목록 = 찾기(값); 고른칸 = -1; 그리기(); }, 200);
    입력.addEventListener('focus', function () { 목록 = 찾기(입력.value); 고른칸 = -1; 그리기(); });
    입력.addEventListener('keydown', function (e) {
      if (e.isComposing || e.keyCode === 229) return;
      if (!상자) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); 고른칸 = Math.min(고른칸 + 1, 목록.length - 1); 표시(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); 고른칸 = Math.max(고른칸 - 1, 0); 표시(); }
      else if (e.key === 'Enter') { if (고른칸 >= 0) { e.preventDefault(); 고르기실행(목록[고른칸]); } }
      else if (e.key === 'Escape') { e.preventDefault(); 닫기(); }
      else if (e.key === 'Tab') { 닫기(); }
    });
    입력.addEventListener('blur', function () { setTimeout(닫기, 150); });

    return { 닫기: 닫기 };
  }

  ZG.ui = {
    만들기: 만들기, 비우기: 비우기, 안전: 안전,
    콤마: 콤마, 숫자: 숫자, 오늘문자: 오늘문자,
    폰인가: 폰인가, 폰질의: 폰질의, 움직임끔: 움직임끔, PC보기: PC보기, PC보기인가: PC보기인가,
    토스트: 토스트, 확인: 확인, 물음: 물음, 고르기: 고르기, 더보기시트: 더보기시트, 탭바: 탭바, 옆메뉴: 옆메뉴, 아이콘: 아이콘, 햅틱: 햅틱, 손대야열림: 손대야열림, 흔들기: 흔들기, 목록등장: 목록등장, 번쩍: 번쩍,
    탈출걸기: 탈출걸기, 탈출풀기: 탈출풀기,
    스테퍼: 스테퍼, 자동완성: 자동완성, 후보찾기: 후보찾기, 업체자동완성: 업체자동완성,
    조합안전입력: 조합안전입력
  };
})(window.ZG);
