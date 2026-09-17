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

  var 뿌리, 본문, 피드칸, 목록칸, 입력칸;
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

  /* 달력 점 — 날짜 → 담당자 메일 목록. 명세서는 '서' 로 따로 센다 */
  function 달점들(달) {
    var 표 = {};
    function 찍기(날짜, 누구) {
      if (!날짜 || 날짜.slice(0, 7) !== 달) return;
      if (!표[날짜]) 표[날짜] = [];
      if (표[날짜].indexOf(누구) < 0 && 표[날짜].length < 4) 표[날짜].push(누구);
    }
    업무들().forEach(function (r) {
      var 담당 = (r.담당 || []);
      if (!담당.length) 찍기(r.예정, '');
      else 담당.forEach(function (메일) { 찍기(r.예정, 메일); });
    });
    명세서들(달).forEach(function (s) { 찍기(s.작성일, '서') });
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

  /* 꾹 누르면 — 업무로 등록 · 공지로 올리기 · 복사 · 삭제 */
  function 줄시트(r) {
    var 항목 = [];
    if (!r.업무id) 항목.push({ 값: '업무', 글: '＋ 업무로 등록' });
    항목.push({ 값: '공지', 글: r.공지 ? '📌 공지 내리기' : '📌 공지로 올리기' });
    항목.push({ 값: '복사', 글: '글자 복사' });
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
    몸.appendChild(만들기('div', { class: 'wbub', text: r.글 }));

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
    var 더 = 만들기('button', { class: 'plus', type: 'button', text: '＋', 'aria-label': '더하기' });
    더.addEventListener('click', function () { u.토스트('사진은 다음에 붙입니다'); });

    /* 🔴 data-그려도됨 — 01b 의 「치는 중엔 안 그린다」 방패를 이 칸만 지나가게 한다.
       그 약속은 아래 피드다시() 가 지킨다. 이 마디는 절대 갈아끼우지 않는다. */
    입력칸 = 만들기('textarea', {
      class: 'inp', rows: '1', placeholder: '메시지를 입력하세요', 'data-그려도됨': ''
    });
    입력칸.addEventListener('input', function () {
      입력칸.style.height = 'auto';
      입력칸.style.height = Math.min(입력칸.scrollHeight, 120) + 'px';
    });
    입력칸.addEventListener('keydown', function (e) {
      if (u.폰인가()) return;                       // 폰은 단추로만 보낸다 — 엔터는 줄바꿈이다
      if (e.key !== 'Enter' || e.shiftKey) return;
      if (e.isComposing || e.keyCode === 229) return;   // 🔴 한글 조합 중의 엔터는 글자를 고르는 것이다
      e.preventDefault();
      보내기();
    });

    var 보냄 = 만들기('button', { class: 'send', type: 'button', text: '↑', 'aria-label': '보내기' });
    보냄.addEventListener('click', 보내기);

    통.appendChild(더); 통.appendChild(입력칸); 통.appendChild(보냄);
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
        (점표[날짜] || []).forEach(function (누구) {
          점.appendChild(만들기('i', { class: 누구 === '서' ? '서' : ('색' + (사람.색결(누구) || '나')) }));
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

  function 업무카드(r) {
    var 몸 = 만들기('div', { class: 'body' }, [만들기('div', { class: 't', text: r.제목 || '(제목 없음)' })]);
    if (r.상세) 몸.appendChild(만들기('div', { class: 'd', text: r.상세 }));

    var 끝줄 = 만들기('div', { class: 'm' });
    (r.담당 || []).forEach(function (메일) {
      끝줄.appendChild(만들기('span', { class: 'who' }, [사람.얼굴(메일, 'sm'), document.createTextNode(사람.이름(메일))]));
    });
    if (r.예정 === 고른날 || r.완료) {
      끝줄.appendChild(만들기('span', { class: 'when', text: (r.예정 || '').slice(5).replace('-', '/') }));
    } else if (r.예정) {
      // 오늘로 따라온 지난 일 — 언제 것이었는지 보여 준다
      끝줄.appendChild(만들기('span', { class: 'late', text: '지난 ' + Number(r.예정.slice(8)) + '일' }));
    }
    if (r.쓴이 && (r.담당 || []).indexOf(r.쓴이) < 0) {
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
    카드.addEventListener('click', function () { 업무창(r, null); });
    if (ZG.메모자료) ZG.메모자료.서명걸기(카드);
    return 카드;
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
    것들.forEach(function (r) { 목.appendChild(업무카드(r)); });
    서류.forEach(function (s) { 목.appendChild(명세서카드(s)); });
    자리.appendChild(목);
  }

  /* ── 업무 창 ── 새로 등록하거나 고친다. 채팅 줄에서 올릴 때는 그 글이 제목으로 들어온다 */
  function 업무창(있던것, 채팅줄것) {
    if (document.querySelector('.askbox')) return;
    var 고름 = {};
    ((있던것 && 있던것.담당) || []).forEach(function (m) { 고름[m] = true; });
    var 날 = (있던것 && 있던것.예정) || 고른날;

    var 제목칸 = 만들기('input', { class: 'inp', type: 'text', maxlength: '80', placeholder: '할 일' });
    제목칸.value = (있던것 && 있던것.제목) || (채팅줄것 && 채팅줄것.글.slice(0, 80)) || '';
    var 상세칸 = 만들기('textarea', { class: 'inp', rows: '3' });
    상세칸.value = (있던것 && 있던것.상세) || '';

    var 사람줄 = 만들기('div', { class: 'pickrow' });
    사람.목록().forEach(function (p) {
      var b = 만들기('button', { type: 'button', class: 고름[p.id] ? 'on' : '' }, [
        사람.얼굴(p.id, 'sm'), document.createTextNode(p.이름 || p.id)
      ]);
      b.addEventListener('click', function () {
        if (고름[p.id]) delete 고름[p.id]; else 고름[p.id] = true;
        b.classList.toggle('on', !!고름[p.id]);
      });
      사람줄.appendChild(b);
    });

    var 날줄 = 만들기('div', { class: 'pickrow' });
    function 날단추(값, 글) {
      var b = 만들기('button', { type: 'button', class: 날 === 값 ? 'on' : '', text: 글 });
      b.addEventListener('click', function () {
        날 = 값;
        [].slice.call(날줄.children).forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        날칸.value = 값;
      });
      날줄.appendChild(b);
      return b;
    }
    var 오 = 오늘();
    var 내일 = 날짜문자(new Date(Date.now() + 864e5));
    var 모레 = 날짜문자(new Date(Date.now() + 1728e5));
    날단추(오, '오늘');
    날단추(내일, '내일');
    날단추(모레, '모레');
    var 날칸 = 만들기('input', { class: 'inp', type: 'date' });
    날칸.value = 날;
    날칸.addEventListener('change', function () {
      날 = 날칸.value || 오;
      [].slice.call(날줄.children).forEach(function (x) { x.classList.remove('on'); });
    });

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
      var 제목 = 제목칸.value.trim();
      if (!제목) { u.토스트('할 일을 적어주세요'); return; }
      var 값 = {
        제목: 제목, 상세: 상세칸.value.trim(),
        담당: Object.keys(고름), 예정: 날
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
    function 열쇠(e) { if (e.key === 'Escape') { e.preventDefault(); 닫기(null); } }

    var 막 = 만들기('div', { class: 'askscrim' });
    막.addEventListener('click', function () { 닫기(null); });
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
      class: 'askbox' + (u.폰인가() ? ' sheetup' : ''), role: 'dialog', 'aria-modal': 'true'
    }, [
      만들기('h4', { text: 있던것 ? '업무 고치기' : '새 업무' }),
      만들기('div', { class: 'field' }, [만들기('label', { text: '할 일' }), 제목칸]),
      만들기('div', { class: 'field' }, [만들기('label', { text: '상세' }), 상세칸]),
      만들기('div', { class: 'field' }, [만들기('label', { text: '누가 합니까' }), 사람줄]),
      만들기('div', { class: 'field' }, [만들기('label', { text: '언제까지' }), 날줄, 날칸]),
      단추줄
    ]);

    document.body.appendChild(막);
    document.body.appendChild(상자);
    document.addEventListener('keydown', 열쇠);
    if (ZG.메모자료) ZG.메모자료.서명걸기(상자);
    setTimeout(function () { 제목칸.focus(); }, 20);
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
    뿌리.appendChild(만들기('div', { class: 'ph-shell' }, [위, 아래, 본문, u.탭바('홈', function (이름) {
      return 이름 === '홈';   // 제 화면을 다시 불러 치던 글을 날리지 않는다
    })]));
    if (ZG.메모자료) ZG.메모자료.서명걸기(위);
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
