/* 19-홈 — 홈 화면 셸 + 채팅 + 업무캘린더 (2026-09-17 우람님 · 시안 널서리-04-홈)
   상단탭 둘이다. 표는 하나(gn.v1.업무)이고 `종류` 한 칸으로 채팅과 업무를 가른다 —
   채팅 한 줄을 업무로 올릴 때 줄을 옮겨 심지 않아도 되기 때문이다.

   채팅 { 종류:'채팅', 글, 쓴이, 때, 공지, 업무id }
   업무 { 종류:'업무', 제목, 상세, 쓴이, 담당[], 예정:'YYYY-MM-DD', 완료, 끝낸때, 만든때 }

   🔴 명세서 줄은 여기 저장하지 않는다. 그릴 때 gn.v1.명세서 를 작성일로 걸러 섞을 뿐이다.
   🔴 다시그리기가 둘이다 — 온판(첫 그림·폭 바뀜)과 피드만. 서버가 밀어 준 것은 늘 피드만이다.
      통째로 다시 그리면 치던 문장이 날아간다. 입력칸 마디는 절대 갈아끼우지 않는다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 저 = ZG.저장소, 키 = 저.키.업무;
  var 사람 = ZG.사람;
  var 요일 = ['일', '월', '화', '수', '목', '금', '토'];

  var 뿌리, 껍데기, 본문, 피드칸, 목록칸, 입력칸;
  var 탭 = '채팅';            // '채팅' | '업무'
  var 달, 고른날;
  var 거르개 = '';            // '' | '내' | 사람 메일
  var 마지막폰 = null;

  /* ══════════ 잔손 ══════════ */
  function 두자리(n) { return (n < 10 ? '0' : '') + n; }
  function 날짜문자(d) { return d.getFullYear() + '-' + 두자리(d.getMonth() + 1) + '-' + 두자리(d.getDate()); }
  function 오늘() { return 날짜문자(new Date()); }
  function 난수(n) { var s = ''; while (s.length < n) s += Math.random().toString(36).slice(2); return s.slice(0, n); }
  function 새id() { return 'w-' + Date.now().toString(36) + '-' + 난수(4); }
  function 나() { return 사람.나키(); }

  function 달글(달) { return Number(달.slice(0, 4)) + '년 ' + Number(달.slice(5, 7)) + '월'; }
  function 달옮기기(달, 걸음) {
    var 해 = Number(달.slice(0, 4)), 월 = Number(달.slice(5, 7)) + 걸음;
    해 += Math.floor((월 - 1) / 12);
    월 = ((월 - 1) % 12 + 12) % 12 + 1;
    return 해 + '-' + 두자리(월);
  }
  function 날글(날짜) {
    var d = new Date(날짜 + 'T00:00:00');
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + 요일[d.getDay()] + ')' + (날짜 === 오늘() ? ' · 오늘' : '');
  }
  function 시각글(밀리) {
    var d = new Date(밀리), h = d.getHours();
    return (h < 12 ? '오전 ' : '오후 ') + (h % 12 || 12) + ':' + 두자리(d.getMinutes());
  }

  /* ══════════ 자료 ══════════ */
  function 전부() { return 저.읽기(키); }
  function 한장(id) {
    var 것들 = 전부();
    for (var i = 0; i < 것들.length; i++) if (것들[i].id === id) return 것들[i];
    return null;
  }
  function 고치기(id, 변경) { return 저.바꾸기(키, id, 변경); }

  function 채팅들() {
    return 전부().filter(function (r) { return r.종류 === '채팅'; })
      .sort(function (a, b) { return (a.때 || 0) - (b.때 || 0); });
  }
  function 공지들() {
    return 채팅들().filter(function (r) { return r.공지; }).reverse();   // 새것이 앞
  }

  function 업무들() {
    return 전부().filter(function (r) { return r.종류 === '업무'; });
  }

  /* ══════════ 갈래 (업무 종류) ══════════
     🔴 표를 새로 파지 않는다 — 같은 표에 종류:'갈래' 로 한 줄씩 산다.
        기기마다 달라도 되는 값이 아니라 다 같이 보는 것이라 설정에 둘 수 없다.
     🔴 이름 칸은 `종류` 가 이미 채팅/업무/갈래를 가르는 데 쓰여서 `갈래` 다. */
  var 색판 = ['#C98F35', '#7FA164', '#9B7BAE', '#6E87AB', '#C4776A', '#9A9A5E', '#8E8E93'];

  function 갈래들() {
    return 전부().filter(function (r) { return r.종류 === '갈래'; })
      .sort(function (a, b) { return (a.만든때 || 0) - (b.만든때 || 0); });
  }
  function 갈래하나(이름) {
    var 것들 = 갈래들();
    for (var i = 0; i < 것들.length; i++) if (것들[i].이름 === 이름) return 것들[i];
    return null;
  }
  function 갈래색(이름) {
    var g = 갈래하나(이름);
    return g ? g.색 : '';
  }
  function 갈래넣기(이름, 색) {
    var 줄 = { id: 'g-' + Date.now().toString(36) + '-' + 난수(3), 종류: '갈래', 이름: 이름, 색: 색, 만든때: Date.now() };
    저.덧붙이기(키, 줄);
    return 줄;
  }

  /* 🔴 안 끝난 업무는 지난 날 칸에 갇히지 않고 오늘로 따라온다 — 체크리스트가 쓰는 규칙 그대로다.
     끝난 것만 제 날짜에 남는다. 안 그러면 넘긴 일이 달을 넘기며 조용히 사라진다. */
  function 그날업무(날짜) {
    var 이오늘 = 날짜 === 오늘();
    return 업무들().filter(function (r) {
      if (거르개 === '내' && (r.담당 || []).indexOf(나()) < 0) return false;
      if (거르개 && 거르개 !== '내' && (r.담당 || []).indexOf(거르개) < 0) return false;
      if (r.예정 === 날짜) return true;
      return 이오늘 && !r.완료 && r.예정 && r.예정 < 날짜;   // 밀린 것은 오늘로 따라온다
    }).sort(function (a, b) {
      if (!a.완료 !== !b.완료) return a.완료 ? 1 : -1;
      return (a.만든때 || 0) - (b.만든때 || 0);
    });
  }

  /* 달력 점 — 날짜 → **그 날 잡힌 업무의 갈래 색** 목록 (2026-09-17 우람님).
     전에는 담당자 색으로 찍었는데, 갈래에 색을 달고 나니 달력에도 그 색이 보여야 한다.
     같은 색은 한 번만, 한 칸에 넷까지. 명세서는 '서' 로 따로 세어 속 빈 점으로 그린다.
     갈래가 없는 업무는 빈 문자열 — 기본 강조색으로 찍힌다. */
  function 달점들(달) {
    var 표 = {};
    function 찍기(날짜, 색) {
      if (!날짜 || 날짜.slice(0, 7) !== 달) return;
      if (!표[날짜]) 표[날짜] = [];
      if (표[날짜].indexOf(색) < 0 && 표[날짜].length < 4) 표[날짜].push(색);
    }
    업무들().forEach(function (r) { 찍기(r.예정, 갈래색(r.갈래) || ''); });
    명세서들(달).forEach(function (s) { 찍기(s.작성일, '서'); });
    return 표;
  }

  /* 명세서 — 저장하지 않는다. 이미 전량 받아온 것을 날짜로 걸러 보여 줄 뿐이다 */
  function 명세서들(달또는날) {
    var 것들 = [];
    try { 것들 = 저.읽기(저.키.명세서); } catch (e) { return []; }
    return 것들.filter(function (s) {
      var d = String(s.작성일 || '');
      return 달또는날.length === 7 ? d.slice(0, 7) === 달또는날 : d === 달또는날;
    });
  }

  function 남은업무수() {
    return 업무들().filter(function (r) { return !r.완료; }).length;
  }

  /* ── 안 읽음 ── 기기마다 따로다(설정은 서버 큐를 안 탄다) */
  function 본때() { try { return Number(저.설정읽기().업무본때 || 0); } catch (e) { return 0; } }
  function 안읽음() {
    var t = 본때(), 나메일 = 나();
    return 채팅들().filter(function (r) { return (r.때 || 0) > t && r.쓴이 !== 나메일; }).length;
  }
  function 읽음표시() {
    var 줄들 = 채팅들();
    if (!줄들.length) return;
    저.설정쓰기({ 업무본때: 줄들[줄들.length - 1].때 || Date.now() });
  }

  /* ══════════ 채팅 ══════════ */

  function 보내기() {
    if (!입력칸) return;
    var 글 = 입력칸.value.trim();
    if (!글) return;
    저.덧붙이기(키, {
      id: 새id(), 종류: '채팅', 글: 글, 쓴이: 나(), 때: Date.now(), 공지: false, 업무id: null
    });
    입력칸.value = '';
    입력칸.style.height = '';
    피드다시(true);            // 내가 보낸 것은 늘 따라 내려간다
    입력칸.focus();            // 🔴 피드만 갈았으므로 커서가 살아 있다
  }

  /* 사진 한 장을 올려 한 줄로 보낸다. 치고 있던 글이 있으면 같이 실린다 */
  function 사진보내기(파일, 단추) {
    var 자 = ZG.메모자료;
    if (!자 || !자.저장통()) { u.토스트('사진은 인터넷이 있어야 올라갑니다'); return; }
    var id = 새id();
    var 글 = 입력칸 ? 입력칸.value.trim() : '';
    if (단추) { 단추.disabled = true; 단추.textContent = '…'; }
    u.토스트('사진 올리는 중…');
    자.올리기(파일, id).then(function (경로) {
      저.덧붙이기(키, {
        id: id, 종류: '채팅', 글: 글, 사진: 경로,
        쓴이: 나(), 때: Date.now(), 공지: false, 업무id: null
      });
      if (입력칸) { 입력칸.value = ''; 입력칸.style.height = ''; }
      피드다시(true);
    }).catch(function (e) {
      console.warn(e);
      u.토스트('사진을 못 올렸습니다');
    }).then(function () {
      if (단추) { 단추.disabled = false; 단추.textContent = '＋'; }
    });
  }

  /* 꾹 누르면 — 업무로 등록 · 공지로 올리기 · 복사 · 삭제 */
  function 줄시트(r) {
    var 항목 = [];
    if (!r.업무id) 항목.push({ 값: '업무', 글: '＋ 업무로 등록' });
    항목.push({ 값: '공지', 글: r.공지 ? '📌 공지 내리기' : '📌 공지로 올리기' });
    if (r.글) 항목.push({ 값: '복사', 글: '글자 복사' });
    if (r.쓴이 === 나()) 항목.push({ 값: '삭제', 글: '삭제' });

    u.고르기({ 제목: '이 메시지를', 항목: 항목 }, function (값) {
      if (값 === '업무') 업무창(null, r);
      else if (값 === '공지') { 고치기(r.id, { 공지: !r.공지 }); 피드다시(); }
      else if (값 === '복사') {
        try {
          navigator.clipboard.writeText(r.글);
          u.토스트('복사했습니다');
        } catch (e) { u.토스트('복사하지 못했습니다'); }
      } else if (값 === '삭제') {
        u.확인({ 제목: '이 메시지를 지울까요?', 확인글: '지우기', 위험: true }, function (예) {
          if (!예) return;
          저.지우기(키, r.id);
          피드다시();
        });
      }
    });
  }

  function 채팅줄(r) {
    var 내것 = r.쓴이 === 나();
    var 몸 = 만들기('div', { class: 'wbody' });
    var 이름줄 = 만들기('div', { class: 'wname' });
    if (!내것) 이름줄.appendChild(document.createTextNode(사람.이름(r.쓴이) + ' '));
    이름줄.appendChild(만들기('span', { class: 'tm', text: 시각글(r.때) }));
    몸.appendChild(이름줄);

    /* 사진은 경로만 저장돼 있다 — 그릴 때 서명 URL(1시간)을 묶어 받아 꽂는다(채팅그리기 끝의 서명걸기).
       글 없이 사진만 보낸 줄은 말풍선 테를 얇게 해 사진이 곧 말풍선이 되게 한다 */
    var 방울 = 만들기('div', { class: 'wbub' + (r.사진 && !r.글 ? ' 사진만' : '') });
    if (r.글) 방울.appendChild(만들기('div', { class: 'tx', text: r.글 }));
    if (r.사진) 방울.appendChild(만들기('img', { class: 'wshot', 'data-경로': r.사진, alt: '보낸 사진' }));
    몸.appendChild(방울);

    if (r.업무id) {
      var 일 = 한장(r.업무id);
      if (일) {
        var 누구 = (일.담당 || []).map(사람.이름).join('·');
        몸.appendChild(만들기('button', {
          class: 'wup', type: 'button',
          text: '✓ 업무로 올림' + (누구 ? ' · ' + 누구 : '') + (일.예정 ? ' ' + 일.예정.slice(5).replace('-', '/') : '')
        }));
      }
    }

    var 줄 = 만들기('div', { class: 'wrow' + (내것 ? ' me' : '') }, [사람.얼굴(r.쓴이), 몸]);
    꾹누르기(줄, function () { 줄시트(r); });
    return 줄;
  }

  /* 꾹 누르기 — 10px 넘게 움직이면 취소한다(안 그러면 목록을 못 굴리신다). 17b 것과 같은 몸짓이다 */
  function 꾹누르기(칸, 할일) {
    var 타이머 = null, 시작 = null, 눌림 = false;
    function 끄기() { clearTimeout(타이머); 타이머 = null; 시작 = null; }
    칸.addEventListener('pointerdown', function (e) {
      끄기();
      눌림 = false;
      시작 = { x: e.clientX, y: e.clientY };
      타이머 = setTimeout(function () { 끄기(); 눌림 = true; u.햅틱(); 할일(); }, 550);
    });
    칸.addEventListener('pointermove', function (e) {
      if (!시작) return;
      if (Math.abs(e.clientX - 시작.x) > 10 || Math.abs(e.clientY - 시작.y) > 10) 끄기();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { 칸.addEventListener(t, 끄기); });
    칸.addEventListener('click', function (e) { if (눌림) { 눌림 = false; e.preventDefault(); } });
    칸.addEventListener('contextmenu', function (e) { e.preventDefault(); 할일(); });   // PC 는 오른쪽 단추
  }

  function 공지띠() {
    var 것들 = 공지들();
    if (!것들.length) return null;
    var 맨앞 = 것들[0];
    var 띠 = 만들기('div', { class: 'notice' }, [
      만들기('span', { class: 'pin', text: '📌' }),
      만들기('span', { class: 'tx' }, [
        document.createTextNode(맨앞.글),
        만들기('span', { class: 'by', text: 사람.이름(맨앞.쓴이) })
      ])
    ]);
    if (것들.length > 1) 띠.appendChild(만들기('span', { class: 'cnt', text: String(것들.length) }));
    var x = 만들기('button', { class: 'x', type: 'button', text: '✕', 'aria-label': '공지 내리기' });
    x.addEventListener('click', function () { 고치기(맨앞.id, { 공지: false }); 피드다시(); });
    띠.appendChild(x);
    return 띠;
  }

  function 채팅그리기(자리) {
    var 줄들 = 채팅들().slice(-200);   // 오래된 것은 안 그린다. 세 명이 쓰는 방이라 이걸로 충분하다
    var t = 본때(), 나메일 = 나(), 새줄그음 = false;
    var 지난날 = '';

    u.비우기(자리);
    if (!줄들.length) {
      자리.appendChild(만들기('div', { class: 'empty', text: '아직 주고받은 말이 없습니다' }));
      return;
    }
    줄들.forEach(function (r) {
      var 날 = 날짜문자(new Date(r.때 || Date.now()));
      if (날 !== 지난날) {
        지난날 = 날;
        자리.appendChild(만들기('div', { class: 'wday', text: 날글(날) }));
      }
      if (!새줄그음 && (r.때 || 0) > t && r.쓴이 !== 나메일) {
        새줄그음 = true;
        자리.appendChild(만들기('div', { class: 'wnew', text: '여기까지 읽었습니다' }));
      }
      자리.appendChild(채팅줄(r));
    });
    if (ZG.메모자료) ZG.메모자료.서명걸기(자리);
  }

  function 입력줄() {
    var 통 = 만들기('div', { class: 'wbar' });
    /* ＋ 사진 붙이기. 🔴 올리는 일은 17a-메모자료 것을 그대로 쓴다 —
       줄이기(긴 변 1600 · JPEG 0.8) · 통(memo) · 서명 URL 까지 이미 다 있다. 두 벌을 만들지 않는다 */
    var 사진칸 = 만들기('input', { type: 'file', accept: 'image/*', style: 'display:none' });
    var 더 = 만들기('button', { class: 'plus', type: 'button', text: '＋', 'aria-label': '사진 붙이기' });
    더.addEventListener('mousedown', function (e) { e.preventDefault(); });   // 커서가 안 빠지게
    더.addEventListener('click', function () { 사진칸.click(); });
    사진칸.addEventListener('change', function () {
      var f = 사진칸.files && 사진칸.files[0];
      사진칸.value = '';                 // 같은 사진을 다시 골라도 change 가 뜨게
      if (f) 사진보내기(f, 더);
    });

    /* 🔴 data-그려도됨 — 01b 의 「치는 중엔 안 그린다」 방패를 이 칸만 지나가게 한다.
       그 약속은 아래 피드다시() 가 지킨다. 이 마디는 절대 갈아끼우지 않는다. */
    입력칸 = 만들기('textarea', {
      class: 'inp', rows: '1', placeholder: '메시지를 입력하세요', 'data-그려도됨': '',
      enterkeyhint: 'send'   // 폰 키보드의 ↵ 자리에 「보내기」라고 뜬다
    });
    입력칸.addEventListener('input', function () {
      입력칸.style.height = 'auto';
      입력칸.style.height = Math.min(입력칸.scrollHeight, 120) + 'px';
    });
    /* 🔴 엔터가 보내기다 — 폰도 마찬가지다 (2026-09-17 우람님: 키보드가 올라오면 ↑ 를 뺀다).
       Shift+Enter 는 줄바꿈이다. 폰에는 Shift 가 없으니 폰에서는 줄바꿈이 없다 — 채팅이라 괜찮다.
       🔴 조합 중(한글을 만들고 있는 중)의 엔터는 글자를 고르는 것이지 보내는 것이 아니다.
          이걸 안 막으면 「하이」를 치다 엔터를 눌렀을 때 「하ㅇ」가 날아간다. */
    입력칸.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.shiftKey) return;
      if (e.isComposing || e.keyCode === 229) return;
      e.preventDefault();
      보내기();
    });

    // 커서가 들어오면 위쪽을 접고, 나가면 편다
    입력칸.addEventListener('focus', function () { 키보드(true); });
    입력칸.addEventListener('blur', function () { 키보드(false); });

    var 보냄 = 만들기('button', { class: 'send', type: 'button', text: '↑', 'aria-label': '보내기' });
    /* 🔴 mousedown 을 막아야 입력칸에서 커서가 안 빠진다 — 빠지면 키보드가 내려갔다 올라오며 화면이 튄다 */
    보냄.addEventListener('mousedown', function (e) { e.preventDefault(); });
    보냄.addEventListener('click', 보내기);

    통.appendChild(더); 통.appendChild(사진칸); 통.appendChild(입력칸); 통.appendChild(보냄);
    return 통;
  }

  /* ══════════ 업무캘린더 ══════════ */

  function 달력(자리) {
    var 머리 = 만들기('div', { class: 'calhd' });
    var 앞 = 만들기('button', { type: 'button', text: '‹', 'aria-label': '지난 달' });
    앞.addEventListener('click', function () { 달로(달옮기기(달, -1)); });
    var 뒤 = 만들기('button', { type: 'button', text: '›', 'aria-label': '다음 달' });
    뒤.addEventListener('click', function () { 달로(달옮기기(달, 1)); });
    머리.appendChild(앞);
    머리.appendChild(만들기('div', { class: 'm', text: 달글(달) }));
    머리.appendChild(뒤);
    자리.appendChild(머리);

    var 표 = 만들기('div', { class: 'cal' });
    요일.forEach(function (요, i) {
      표.appendChild(만들기('div', { class: 'wd' + (i === 0 ? ' sun' : ''), text: 요 }));
    });

    var 해 = Number(달.slice(0, 4)), 월 = Number(달.slice(5, 7));
    var 첫날 = new Date(해, 월 - 1, 1);
    var 날수 = new Date(해, 월, 0).getDate();
    var 점표 = 달점들(달);

    for (var b = 0; b < 첫날.getDay(); b++) 표.appendChild(만들기('div', { class: 'd off' }));
    for (var n = 1; n <= 날수; n++) {
      (function (일) {
        var 날짜 = 달 + '-' + 두자리(일);
        var 요일수 = new Date(해, 월 - 1, 일).getDay();
        var 칸 = 만들기('button', {
          type: 'button',
          class: 'd' + (요일수 === 0 ? ' sun' : '') + (날짜 === 고른날 ? ' on' : '') + (날짜 === 오늘() ? ' today' : ''),
          text: String(일)
        });
        var 점 = 만들기('span', { class: 'dots' });
        (점표[날짜] || []).forEach(function (색) {
          if (색 === '서') 점.appendChild(만들기('i', { class: '서' }));
          else 점.appendChild(만들기('i', 색 ? { style: 'background:' + 색 } : null));
        });
        칸.appendChild(점);
        칸.addEventListener('click', function () { 날고르기(날짜); });
        표.appendChild(칸);
      })(n);
    }
    자리.appendChild(표);
  }

  function 거르개줄(자리) {
    var 줄 = 만들기('div', { class: 'fchips' });
    function 칩(값, 글, 얼굴메일, 수) {
      var b = 만들기('button', { type: 'button', class: 'fchip' + (거르개 === 값 ? ' on' : '') });
      if (얼굴메일) b.appendChild(사람.얼굴(얼굴메일, 'sm'));
      b.appendChild(document.createTextNode(글));
      if (수 != null) b.appendChild(만들기('span', { class: 'n', text: String(수) }));
      b.addEventListener('click', function () { 거르개 = 값; 피드다시(); });
      줄.appendChild(b);
    }
    칩('', '전체');
    칩('내', '내 업무', null, 업무들().filter(function (r) {
      return !r.완료 && (r.담당 || []).indexOf(나()) >= 0;
    }).length);
    사람.목록().forEach(function (p) {
      if (p.id === 나()) return;
      칩(p.id, ' ' + (p.이름 || p.id), p.id);
    });
    자리.appendChild(줄);
    if (ZG.메모자료) ZG.메모자료.서명걸기(줄);
  }

  var 그림 = {
    수정: '<path d="M4 20.5h4L20.2 8.3a2 2 0 0 0 0-2.8l-1.7-1.7a2 2 0 0 0-2.8 0L3.5 16v4.5z"/><path d="M14.5 6.2l3.3 3.3"/>',
    삭제: '<path d="M4 6.5h16"/><path d="M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7"/><path d="M6.6 6.5l.9 13.2a1.3 1.3 0 0 0 1.3 1.3h6.4a1.3 1.3 0 0 0 1.3-1.3l.9-13.2"/>'
  };

  function 업무카드(r) {
    var 몸 = 만들기('div', { class: 'body' });

    // 갈래는 색 점 하나로 붙는다 — 이름을 길게 쓰면 할 일 글씨가 밀린다
    var 제목줄 = 만들기('div', { class: 't' });
    if (r.갈래) {
      제목줄.appendChild(만들기('span', {
        class: '갈래점', style: 'background:' + (갈래색(r.갈래) || 'var(--color-text-faint)'),
        title: r.갈래
      }));
    }
    제목줄.appendChild(document.createTextNode(r.제목 || '(제목 없음)'));
    몸.appendChild(제목줄);
    if (r.상세) 몸.appendChild(만들기('div', { class: 'd', text: r.상세 }));

    var 끝줄 = 만들기('div', { class: 'm' });
    if (r.갈래) {
      끝줄.appendChild(만들기('span', {
        class: '갈래칩', text: r.갈래,
        style: '--갈래:' + (갈래색(r.갈래) || 'var(--color-border)')
      }));
    }
    var 담당 = r.담당 || [];
    if (!담당.length) 끝줄.appendChild(만들기('span', { class: 'who 전체', text: '전체' }));
    else 담당.forEach(function (메일) {
      끝줄.appendChild(만들기('span', { class: 'who' }, [사람.얼굴(메일, 'sm'), document.createTextNode(사람.이름(메일))]));
    });
    if (r.예정 === 고른날 || r.완료) {
      끝줄.appendChild(만들기('span', { class: 'when', text: (r.예정 || '').slice(5).replace('-', '/') }));
    } else if (r.예정) {
      // 오늘로 따라온 지난 일 — 언제 것이었는지 보여 준다
      끝줄.appendChild(만들기('span', { class: 'late', text: '지난 ' + Number(r.예정.slice(8)) + '일' }));
    }
    if (r.쓴이 && 담당.indexOf(r.쓴이) < 0 && 담당.length) {
      끝줄.appendChild(만들기('span', { class: 'by', text: 사람.이름(r.쓴이) + '이 지시' }));
    }
    몸.appendChild(끝줄);

    var 체크 = 만들기('input', { type: 'checkbox', class: 'ck' });
    체크.checked = !!r.완료;
    체크.addEventListener('click', function (e) { e.stopPropagation(); });
    체크.addEventListener('change', function () {
      고치기(r.id, { 완료: 체크.checked, 끝낸때: 체크.checked ? Date.now() : null });
      피드다시();
    });

    var 카드 = 만들기('div', { class: 'tcard' + (r.완료 ? ' done' : '') }, [체크, 몸]);

    /* 쓸면 수정·삭제가 나온다 (2026-09-17 우람님). 메모 카드·체크리스트와 같은 몸짓이다 */
    var 고침 = u.쓸기단추('수정', 'ed', function () { 업무창(r, null); }, 그림.수정);
    var 지움 = u.쓸기단추('삭제', 'del', function () {
      u.확인({ 제목: '「' + (r.제목 || '') + '」을 지울까요?', 확인글: '지우기', 위험: true }, function (예) {
        if (!예) return;
        저.지우기(키, r.id);
        u.열린줄잊기();
        피드다시();
      });
    }, 그림.삭제);
    var 줄 = 만들기('div', { class: '쓸줄' }, [만들기('div', { class: '쓸단추' }, [고침, 지움]), 카드]);
    var 닫기 = u.쓸기붙이기(카드, 152);   // 단추 두 개 × 76px

    카드.addEventListener('click', function () {
      if (u.방금끌었나()) return;
      if (u.열린줄인가(닫기)) { 닫기(); return; }
      업무창(r, null);
    });
    if (ZG.메모자료) ZG.메모자료.서명걸기(카드);
    return 줄;
  }

  function 명세서카드(s) {
    var 글 = (s.받는곳 && s.받는곳.이름 ? s.받는곳.이름 : '거래처') +
             ' · ' + u.콤마(s.합계 || 0);
    return 만들기('div', { class: 'tcard auto' }, [
      만들기('div', { class: 'body' }, [
        만들기('div', { class: 't' }, [만들기('span', { class: 'tag', text: '명세서' }), document.createTextNode(글)])
      ])
    ]);
  }

  function 업무그리기(자리) {
    u.비우기(자리);
    달력(자리);
    거르개줄(자리);

    var 것들 = 그날업무(고른날);
    var 서류 = 명세서들(고른날);
    var 머리 = 만들기('div', { class: 'tsec' }, [
      만들기('h3', { text: 날글(고른날) }),
      만들기('span', { class: 'r', text: '업무 ' + 것들.length + ' · 남은 ' + 것들.filter(function (r) { return !r.완료; }).length })
    ]);
    if (!u.폰인가()) {   // PC 는 팹이 없다 — 머리줄에 단추를 둔다
      var 넣기 = 만들기('button', { class: 'btn main sm', type: 'button', text: '＋ 업무 등록' });
      넣기.addEventListener('click', function () { 업무창(null, null); });
      머리.appendChild(넣기);
    }
    자리.appendChild(머리);

    if (!것들.length && !서류.length) {
      자리.appendChild(만들기('div', { class: 'empty', text: '이 날 잡힌 업무가 없습니다' }));
      return;
    }
    var 목 = 만들기('div', { class: 'tlist' });
    u.열린줄잊기();   // 목록을 새로 그리는 참이다 — 쓸어서 열어 둔 줄의 닫기를 들고 있으면 헛돈다
    것들.forEach(function (r) { 목.appendChild(업무카드(r)); });
    서류.forEach(function (s) { 목.appendChild(명세서카드(s)); });
    자리.appendChild(목);
  }

  /* ── 업무 창 ── 새로 등록하거나 고친다 (2026-09-17 우람님이 통째로 다시 잡으셨다).
     위에서부터 — 업무 종류(갈래) · 업무 지정(누구) · 할 일 한 칸.
     🔴 날짜 고르개를 두지 않는다. **달력에서 고른 그 날**에 잡힌다 —
        날을 먼저 고르고 ＋ 를 누르는 것이 이 화면의 흐름이기 때문이다.
        고칠 때는 원래 날을 그대로 둔다(다른 날로 옮기려면 지우고 그 날에 새로 넣는다). */
  function 업무창(있던것, 채팅줄것) {
    if (document.querySelector('.askbox')) return;

    var 갈래 = (있던것 && 있던것.갈래) || '';
    var 맡을이 = 있던것 ? ((있던것.담당 || [])[0] || '') : '';   // '' 이면 전체다
    var 날 = (있던것 && 있던것.예정) || 고른날;

    /* ── 업무 종류 ── 고르개 + 「＋ 새 종류」 */
    var 갈래칸 = 만들기('div', { class: '갈래줄' });
    function 갈래그리기() {
      u.비우기(갈래칸);
      var 것들 = 갈래들();
      function 칩(이름, 색) {
        var b = 만들기('button', {
          type: 'button', class: '갈래고르개' + (갈래 === 이름 ? ' on' : ''),
          style: '--갈래:' + (색 || 'var(--color-border)'), text: 이름 || '없음'
        });
        b.addEventListener('click', function () { 갈래 = 이름; 갈래그리기(); });
        갈래칸.appendChild(b);
      }
      칩('', '');
      것들.forEach(function (g) { 칩(g.이름, g.색); });
      var 새 = 만들기('button', { type: 'button', class: '갈래새', text: '＋ 새 종류' });
      새.addEventListener('click', 새갈래창);
      갈래칸.appendChild(새);
    }
    갈래그리기();

    /* ── 업무 지정 ── 드롭다운 하나. 「전체」면 모두의 업무다 */
    var 맡을칸 = 만들기('select', { class: 'inp' });
    function 맡을그리기() {
      u.비우기(맡을칸);
      맡을칸.appendChild(만들기('option', { value: '', text: '전체 — 모두의 업무' }));
      사람.목록().forEach(function (p) {
        맡을칸.appendChild(만들기('option', { value: p.id, text: (p.이름 || p.id) + (p.직책 ? ' · ' + p.직책 : '') }));
      });
      맡을칸.value = 맡을이;
    }
    맡을그리기();
    맡을칸.addEventListener('change', function () { 맡을이 = 맡을칸.value; });

    /* ── 할 일 ── 제목·상세를 한 칸으로 합쳤다.
       🔴 저장할 때 첫 줄을 제목으로, 나머지를 상세로 나눈다 — 카드 그리는 쪽을 안 고쳐도 된다 */
    var 글칸 = 만들기('textarea', {
      class: 'inp 할일칸', rows: '7',
      placeholder: '무엇을 할까요\n\n첫 줄이 제목이 됩니다'
    });
    글칸.value = 있던것
      ? [있던것.제목 || '', 있던것.상세 || ''].filter(Boolean).join('\n')
      : (채팅줄것 ? 채팅줄것.글 : '');

    /* ── 새 종류 만들기 ── 이름 + 색 */
    function 새갈래창() {
      if (document.querySelector('.askbox2')) return;
      var 고른색 = 색판[갈래들().length % 색판.length];
      var 이름칸 = 만들기('input', { class: 'inp', type: 'text', maxlength: '12', placeholder: '출하 · 관수 · 삽목 …' });

      var 색줄 = 만들기('div', { class: '색줄' });
      색판.forEach(function (c) {
        var b = 만들기('button', {
          type: 'button', class: '색알' + (c === 고른색 ? ' on' : ''), style: 'background:' + c, 'aria-label': c
        });
        b.addEventListener('click', function () {
          고른색 = c;
          [].slice.call(색줄.children).forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on');
        });
        색줄.appendChild(b);
      });

      function 닫기2(만들까) {
        document.removeEventListener('keydown', 열쇠2);
        막2.remove(); 상자2.remove();
        if (!만들까) return;
        var 이름 = 이름칸.value.trim();
        if (!이름) { u.토스트('종류 이름을 적어주세요'); return; }
        if (갈래하나(이름)) { u.토스트('이미 있는 종류입니다'); 갈래 = 이름; 갈래그리기(); return; }
        갈래넣기(이름, 고른색);
        갈래 = 이름;
        갈래그리기();
      }
      function 열쇠2(e) { if (e.key === 'Escape') { e.preventDefault(); 닫기2(false); } }

      var 막2 = 만들기('div', { class: 'askscrim askscrim2' });
      막2.addEventListener('click', function () { 닫기2(false); });
      var 아니오2 = 만들기('button', { class: 'btn', type: 'button', text: '취소' });
      아니오2.addEventListener('click', function () { 닫기2(false); });
      var 예2 = 만들기('button', { class: 'btn main', type: 'button', text: '만들기' });
      예2.addEventListener('click', function () { 닫기2(true); });

      var 상자2 = 만들기('div', {
        class: 'askbox askbox2' + (u.폰인가() ? ' sheetup' : ''), role: 'dialog', 'aria-modal': 'true'
      }, [
        만들기('h4', { text: '새 업무 종류' }),
        만들기('div', { class: 'field' }, [만들기('label', { text: '이름' }), 이름칸]),
        만들기('div', { class: 'field' }, [만들기('label', { text: '색' }), 색줄]),
        만들기('div', { class: 'btnrow' }, [아니오2, 예2])
      ]);
      document.body.appendChild(막2);
      document.body.appendChild(상자2);
      document.addEventListener('keydown', 열쇠2);
      setTimeout(function () { 이름칸.focus(); }, 20);
    }

    /* ── 저장 · 삭제 ── */
    function 닫기(어떻게) {
      document.removeEventListener('keydown', 열쇠);
      막.remove(); 상자.remove();
      if (!어떻게) return;
      if (어떻게 === '삭제') {
        저.지우기(키, 있던것.id);
        u.토스트('업무를 지웠습니다');
        피드다시();
        return;
      }
      var 글 = 글칸.value.trim();
      if (!글) { u.토스트('할 일을 적어주세요'); return; }
      var 줄나눔 = 글.indexOf('\n');
      var 값 = {
        제목: (줄나눔 < 0 ? 글 : 글.slice(0, 줄나눔)).trim().slice(0, 120),
        상세: 줄나눔 < 0 ? '' : 글.slice(줄나눔 + 1).trim(),
        갈래: 갈래,
        담당: 맡을이 ? [맡을이] : [],      // 빈 배열이 곧 「전체」다
        예정: 날
      };
      if (있던것) {
        고치기(있던것.id, 값);
      } else {
        var 레코드 = Object.assign({
          id: 새id(), 종류: '업무', 쓴이: 나(), 완료: false, 끝낸때: null, 만든때: Date.now()
        }, 값);
        저.덧붙이기(키, 레코드);
        // 채팅 줄에서 올린 것이면 그 줄에 딱지를 남긴다 (원문은 안 건드린다)
        if (채팅줄것) 고치기(채팅줄것.id, { 업무id: 레코드.id });
        고른날 = 날;
        u.토스트('업무로 등록했습니다');
      }
      피드다시();
    }
    function 열쇠(e) {
      if (e.key !== 'Escape' || document.querySelector('.askbox2')) return;
      e.preventDefault(); 닫기(null);
    }

    var 막 = 만들기('div', { class: 'askscrim' });
    막.addEventListener('click', function () { if (!document.querySelector('.askbox2')) 닫기(null); });
    var 아니오 = 만들기('button', { class: 'btn', type: 'button', text: '취소' });
    아니오.addEventListener('click', function () { 닫기(null); });
    var 예 = 만들기('button', { class: 'btn main', type: 'button', text: 있던것 ? '고치기' : '업무 등록' });
    예.addEventListener('click', function () { 닫기('저장'); });

    var 단추줄 = 만들기('div', { class: 'btnrow' });
    if (있던것) {
      var 지움 = 만들기('button', { class: 'btn warn', type: 'button', text: '삭제', style: 'margin-right:auto' });
      지움.addEventListener('click', function () {
        u.확인({ 제목: '이 업무를 지울까요?', 확인글: '지우기', 위험: true }, function (답) {
          if (답) 닫기('삭제');
        });
      });
      단추줄.appendChild(지움);
    }
    단추줄.appendChild(아니오);
    단추줄.appendChild(예);

    var 상자 = 만들기('div', {
      class: 'askbox 업무창' + (u.폰인가() ? ' sheetup' : ''), role: 'dialog', 'aria-modal': 'true'
    }, [
      만들기('h4', { text: (있던것 ? '업무 고치기' : '새 업무') + ' · ' + 날글(날) }),
      만들기('div', { class: 'field' }, [만들기('label', { text: '업무 종류' }), 갈래칸]),
      만들기('div', { class: 'field' }, [만들기('label', { text: '업무 지정' }), 맡을칸]),
      만들기('div', { class: 'field' }, [만들기('label', { text: '할 일' }), 글칸]),
      단추줄
    ]);

    document.body.appendChild(막);
    document.body.appendChild(상자);
    document.addEventListener('keydown', 열쇠);
    if (ZG.메모자료) ZG.메모자료.서명걸기(상자);
    setTimeout(function () { 글칸.focus(); }, 20);
  }
  /* ══════════ 그리기 ══════════ */

  function 요약() {
    if (탭 === '채팅') {
      return { 왼: '안 읽음 <b>' + 안읽음() + '</b>', 오: '남은 업무 <b>' + 남은업무수() + '</b>' };
    }
    return { 왼: u.안전(달글(달)), 오: '남은 업무 <b>' + 남은업무수() + '</b>' };
  }

  /* 🔴 피드만 다시 그린다 — 입력칸 마디는 손대지 않는다.
     통째로 다시 그리면 치던 문장과 한글 조합이 통째로 날아간다. 이것이 01b 의 예외를 떠받친다. */
  function 피드다시(바닥으로) {
    if (!목록칸) { 다시그리기(); return; }
    /* 옛 글을 읽는 중이면 끌어내리지 않는다. 바닥에서 80px 안에 있을 때만 따라 내려간다 */
    var 바닥가까이 = 바닥으로 === true || !피드칸 ||
      (피드칸.scrollHeight - 피드칸.scrollTop - 피드칸.clientHeight < 80);

    if (탭 === '채팅') {
      var 띠칸 = 뿌리.querySelector('.notice-자리');
      if (띠칸) { u.비우기(띠칸); var 띠 = 공지띠(); if (띠) 띠칸.appendChild(띠); }
      채팅그리기(목록칸);
      if (바닥가까이 && 피드칸) 피드칸.scrollTop = 피드칸.scrollHeight;
    } else {
      업무그리기(목록칸);
    }
    요약다시();
  }

  function 요약다시() {
    var 줄 = 뿌리.querySelector('.ph-sub') || 뿌리.querySelector('.pc-head .path');
    if (!줄) return;
    var 정보 = 요약();
    if (줄.classList.contains('path')) { 줄.textContent = '홈 › ' + (탭 === '채팅' ? '채팅' : '업무캘린더'); return; }
    줄.children[0].innerHTML = 정보.왼;
    줄.children[1].innerHTML = 정보.오;
  }

  function 상단탭(폰인가) {
    var 줄 = 만들기('div', 폰인가
      ? { class: 'toggle', style: 'height:36px' }
      : { class: 'pc-tabs', role: 'tablist' });
    [['채팅', '채팅'], ['업무', '업무캘린더']].forEach(function (쌍) {
      var b = 만들기('button', {
        type: 'button', role: 폰인가 ? null : 'tab', text: 쌍[1],
        class: 탭 === 쌍[0] ? 'on' : '',
        style: 폰인가 ? 'flex:1; padding:0' : null
      });
      b.addEventListener('click', function () { 탭으로(쌍[0]); });
      줄.appendChild(b);
    });
    return 줄;
  }

  /* ── PC ── */
  function PC뼈대() {
    var 옆 = u.옆메뉴('홈');
    var 머리 = 만들기('div', { class: 'pc-head' }, [
      만들기('h2', { text: '홈' }),
      만들기('div', { class: 'path', text: '홈 › ' + (탭 === '채팅' ? '채팅' : '업무캘린더') })
    ]);
    본문 = 만들기('div', { class: 'pc-본문' });
    뿌리.appendChild(만들기('div', { class: 'shell' }, [옆, 만들기('div', { class: 'pc-main' }, [머리, 상단탭(false), 본문])]));
  }

  /* ── 폰 ── */
  function 폰뼈대() {
    var 왼쪽 = 만들기('div', { class: '왼', style: 'min-width:0' }, [만들기('h1', { text: '홈' })]);
    var 오른 = 만들기('button', { class: '내얼굴', type: 'button', 'aria-label': '내 프로필' }, [사람.얼굴(나())]);
    오른.addEventListener('click', function () { 사람.내시트(); });
    var 위 = 만들기('div', { class: 'ph-top' }, [왼쪽, 오른]);

    var 정보 = 요약();
    var 아래 = 만들기('div', { class: 'ph-sub' }, [
      만들기('span', { html: 정보.왼 }), 만들기('span', { html: 정보.오 })
    ]);

    본문 = 만들기('div', { class: 'ph-body tight' });

    /* 🔴 탭바는 채팅에서도 그린다 (2026-09-17 우람님이 되돌리셨다).
       홈이 첫 화면인데 아래 메뉴가 없으면 어디로도 못 간다.
       대신 **키보드가 올라오면** 탭바를 숨긴다 — 그때만 대화가 화면을 다 쓴다.
       숨기는 것은 CSS 한 줄이다(.ph-shell.키보드 .ph-nav) — 마디를 지웠다 되살리지 않는다.
       다시 그리면 치던 글이 날아가기 때문이다. */
    var 조각 = [위, 아래, 본문, u.탭바('홈', function (이름) {
      return 이름 === '홈';   // 제 화면을 다시 불러 치던 글을 날리지 않는다
    })];
    껍데기 = 만들기('div', { class: 'ph-shell 홈셸' + (탭 === '채팅' ? ' 채팅중' : '') }, 조각);
    뿌리.appendChild(껍데기);
    if (ZG.메모자료) ZG.메모자료.서명걸기(위);
  }

  /* ── 키보드가 올라오면 위쪽을 접는다 ──
     머리줄 · 안읽음줄 · 상단탭 · 공지띠를 숨겨 대화와 입력칸만 남긴다.
     🔴 visualViewport 를 재지 않고 focus/blur 로만 판단한다 — 아이폰은 칸에 커서가 들어간
        그 순간 키보드를 올리므로 이걸로 충분하고, 재는 쪽은 기기마다 어긋난다.
     🔴 화면을 다시 그리지 않는다. 결(class)만 붙였다 뗀다 — 치던 글은 그대로 있다. */
  /* ── 키보드가 올라오면 껍데기를 그만큼 줄인다 ──
     🔴 100dvh 는 키보드를 못 본다(규격상 가상 키보드는 dvh 에 안 들어간다).
        진짜 남은 높이는 visualViewport 만 안다.

     🔴 입력줄을 position:fixed 로 띄우는 방식은 버렸다 (2026-09-17 우람님 화면 두 번째).
        fixed 는 **레이아웃 뷰포트** 기준인데, 아이폰은 키보드가 뜬 채 굴릴 때
        보이는 창을 위아래로 흔든다 — 그때마다 입력줄이 따라 날아다닌다.
        껍데기를 줄이면 입력줄은 그냥 흐름의 맨 아래에 앉아 있어 흔들릴 일이 없다.

     🔴 처음에 이 방식이 터졌던 까닭은 따로 있었다 — .ph-body 가 안 줄어들고 있었다.
        (플렉스 칸 기본값 min-height:auto. 메모.css 에서 고쳤다.) 그래서 이제 안전하다.

     🔴 키보드가 **올라오는 도중**에 재면 엉뚱하게 작은 값이 잡힌다.
        창의 1/4 보다 작은 값은 버린다 — 그 한 번을 박으면 대화 칸이 0 이 된다. */
  var 보임칸 = window.visualViewport || null;
  function 높이맞춤() {
    if (!껍데기 || !보임칸) return;
    var 높이 = Math.round(보임칸.height);
    if (높이 < window.innerHeight * 0.25) return;   // 올라오는 도중에 잰 값 — 버린다
    껍데기.style.height = 높이 + 'px';
    /* 🔴 여기서 맨 아래로 끌어내리지 않는다. 아이폰은 굴리는 중에도 보이는 창을 흔들어
       이 함수를 부른다 — 끌어내리면 위로 올리려는 손을 도로 끌어내린다.
       처음 올라올 때 한 번만 내리면 된다 (키보드() 참조). */
  }

  function 키보드(켬) {
    if (!껍데기) return;
    껍데기.classList.toggle('키보드', !!켬);
    if (켬) {
      if (보임칸) {
        보임칸.addEventListener('resize', 높이맞춤);
        보임칸.addEventListener('scroll', 높이맞춤);
      }
      높이맞춤();
      // 키보드가 다 올라온 뒤에 한 번 더 — 올라오는 동안 잰 높이는 아직 옛것이다.
      // 바닥으로 내리는 것도 여기서만 한다(높이맞춤 안에서 하면 굴릴 때마다 끌려 내려간다)
      var 바닥으로 = function () { 높이맞춤(); if (피드칸) 피드칸.scrollTop = 피드칸.scrollHeight; };
      setTimeout(바닥으로, 80);
      setTimeout(바닥으로, 300);
    } else {
      if (보임칸) {
        보임칸.removeEventListener('resize', 높이맞춤);
        보임칸.removeEventListener('scroll', 높이맞춤);
      }
      껍데기.style.height = '';   // dvh 로 되돌린다
    }
  }

  function 다시그리기() {
    u.비우기(뿌리);
    입력칸 = null; 목록칸 = null; 피드칸 = null;
    마지막폰 = u.폰인가();
    if (마지막폰) 폰뼈대(); else PC뼈대();

    if (마지막폰) 본문.appendChild(상단탭(true));

    if (탭 === '채팅') {
      if (마지막폰) 본문.classList.add('홈채팅');   // 팹용 아래 여백을 걷고 입력줄을 바닥에 붙인다
      본문.appendChild(만들기('div', { class: 'notice-자리' }));
      피드칸 = 만들기('div', { class: 'wfeed' });
      목록칸 = 만들기('div', { class: 'wlist' });
      피드칸.appendChild(목록칸);
      본문.appendChild(피드칸);
      본문.appendChild(입력줄());
      피드다시(true);
      setTimeout(읽음표시, 1500);
    } else {
      목록칸 = 만들기('div', { class: '업무칸' });
      본문.appendChild(목록칸);
      업무그리기(목록칸);
      var 팹 = 만들기('button', { class: 'ph-fab', type: 'button', text: '＋', 'aria-label': '업무 등록' });
      팹.addEventListener('click', function () { 업무창(null, null); });
      본문.appendChild(팹);
    }
  }

  function 탭으로(이름) {
    if (탭 === 이름) return;
    탭 = 이름;
    저.설정쓰기({ 홈탭: 이름 });
    다시그리기();
  }
  function 달로(값) { 달 = 값; if (고른날.slice(0, 7) !== 달) 고른날 = 달 + '-01'; 피드다시(); }
  function 날고르기(날짜) { 고른날 = 날짜; 달 = 날짜.slice(0, 7); 피드다시(); }

  /* 폭이 바뀌면 통째로 다시 그린다 — 짜임 자체가 다르다 */
  function 폭바뀜() { if (u.폰인가() !== 마지막폰) 다시그리기(); }

  function 시작() {
    뿌리 = document.getElementById('앱');
    저.부팅();
    사람 = ZG.사람;
    고른날 = 오늘();
    달 = 고른날.slice(0, 7);
    try { 탭 = 저.설정읽기().홈탭 || '채팅'; } catch (e) { 탭 = '채팅'; }
    다시그리기();
    u.폰질의.addEventListener('change', 폭바뀜);
    window.addEventListener('storage', function (e) {
      if (e.key && e.key.indexOf('gn.v1.') === 0) 피드다시();
    });
  }

  /* 🔴 이름은 '홈앱'이다 — 01b-서버.js 의 다시그리기 목록이 이 이름으로 찾는다.
     서버가 밀어 준 것은 늘 피드만 갈아 끼운다(치던 글을 안 먹는다) */
  ZG.홈앱 = {
    시작: 시작,
    다시그리기: 피드다시,
    온판다시: 다시그리기,
    탭으로: 탭으로
  };
  document.addEventListener('DOMContentLoaded', 시작);
})(window.ZG);
