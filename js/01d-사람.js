/* 01d-사람 — 누가 쓰고 있는가 (2026-09-17 우람님)
   글에 얼굴과 이름을 붙이고, 업무를 사람에게 걸고, 메모·체크리스트를 제 것으로 가른다.

   🔴 열쇠는 **소문자 이메일**이다. uid 가 아니다.
      가입 전에는 uid 를 알 길이 없지만 이메일은 미리 안다 —
      그래서 미리 넣어 둔 줄과 그 사람이 가입한 뒤의 줄이 **같은 줄**이 된다.
      옮겨 붙이는 코드가 아예 없다.

   🔴 사진은 17a-메모자료 의 것을 그대로 쓴다. 통(버킷)을 새로 만들지 않는다.
      씨앗 사진만 저장소에 커밋한 파일(img/…)이라 src 를 직접 준다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 저 = ZG.저장소, 키 = 저.키.사람;

  /* ══════════════════════════════════════════════════════════════
     씨앗 — 미리 등록해 두는 사람들.  🔴 여기에 한 줄씩 넣으면 된다.
     그 사람이 **처음 로그인하는 순간** 이름·직책·사진이 이미 들어가 있다.
     본인이 프로필에서 바꾸면 그때부터 서버 줄이 이긴다. 씨앗이 다시 덮지 않는다.
     사진은 저장소에 커밋한다 — img/사람/<이름>.jpg (없으면 이름 첫 글자 동그라미가 뜬다)
     ══════════════════════════════════════════════════════════════ */
  var 씨앗 = [
    // { 메일: 'kim@example.com', 이름: '김철수', 직책: '대표', 사진: 'img/사람/김철수.jpg' },
    // { 메일: 'lee@example.com', 이름: '이영희', 직책: '관리', 사진: 'img/사람/이영희.jpg' }
  ];

  var 씨앗표 = {};
  씨앗.forEach(function (s) { 씨앗표[String(s.메일).toLowerCase()] = s; });

  /* ── 나 ── */
  /* 내 메일은 설정(기기별, 서버에 안 감)에 둔다. 01b 가 세션을 받은 뒤 넣어 주고,
     로그인.html 도 성공 직후 같은 값을 써 둔다 — 첫 그림 전에 **동기로** 읽혀야 하기 때문이다. */
  function 나키() {
    try { return String(저.설정읽기().나 || '').toLowerCase(); } catch (e) { return ''; }
  }

  function 세션(사용자) {
    if (!사용자 || !사용자.email) return;
    var 메일 = String(사용자.email).toLowerCase();
    저.설정쓰기({ 나: 메일 });
    // 내 줄이 아직 없으면 씨앗에서, 씨앗에도 없으면 가입 때 넣은 user_metadata 에서 한 줄 만든다
    if (한장(메일)) return;
    var m = 사용자.user_metadata || {};
    var 씨 = 씨앗표[메일] || {};
    저장(메일, {
      이름: 씨.이름 || m.이름 || 메일.split('@')[0],
      직책: 씨.직책 || m.직책 || '',
      사진: 씨.사진 || ''
    });
  }

  /* ── 자료 ── */
  function 전부() { return 저.읽기(키); }

  function 한장(메일) {
    var 키값 = String(메일 || '').toLowerCase();
    var 것들 = 전부();
    for (var i = 0; i < 것들.length; i++) if (String(것들[i].id).toLowerCase() === 키값) return 것들[i];
    return null;
  }

  /* 아직 한 번도 안 들어온 사람도 씨앗에 있으면 이름·얼굴이 뜬다 */
  function 하나(메일) {
    var 키값 = String(메일 || '').toLowerCase();
    if (!키값) return null;
    var r = 한장(키값);
    if (r) return r;
    var 씨 = 씨앗표[키값];
    if (씨) return { id: 키값, 이름: 씨.이름, 직책: 씨.직책 || '', 사진: 씨.사진 || '' };
    return null;
  }

  function 나() { return 하나(나키()); }

  /* 목록 — 서버에 있는 사람 + 아직 안 들어온 씨앗. 이름순 */
  function 목록() {
    var 본것 = {}, 줄들 = [];
    전부().forEach(function (r) {
      if (r.삭제) return;
      본것[String(r.id).toLowerCase()] = true;
      줄들.push(r);
    });
    씨앗.forEach(function (s) {
      var k = String(s.메일).toLowerCase();
      if (본것[k]) return;
      줄들.push({ id: k, 이름: s.이름, 직책: s.직책 || '', 사진: s.사진 || '' });
    });
    줄들.sort(function (a, b) { return String(a.이름 || a.id) < String(b.이름 || b.id) ? -1 : 1; });
    return 줄들;
  }

  function 이름(메일) {
    var r = 하나(메일);
    if (r && r.이름) return r.이름;
    return String(메일 || '').split('@')[0] || '(누구)';
  }

  function 저장(메일, 값) {
    var 키값 = String(메일 || '').toLowerCase();
    if (!키값) return null;
    var 지금 = Date.now();
    if (한장(키값)) return 저.바꾸기(키, 키값, Object.assign({}, 값, { 고친때: 지금 }));
    var 레코드 = Object.assign({ id: 키값, 만든때: 지금 }, 값, { 고친때: 지금 });
    저.덧붙이기(키, 레코드);
    return 레코드;
  }

  /* ── 얼굴 ──
     사진이 저장소 파일(img/…)이면 src 를 그대로, Storage 경로면 data-경로 + 서명걸기.
     둘 다 없으면 이름 첫 글자. 색은 이름에서 뽑아 늘 같은 색이 나온다 */
  var 색들 = ['우', '지', '영', '나', '다', '라'];
  function 색결(메일) {
    var s = String(메일 || ''), n = 0;
    for (var i = 0; i < s.length; i++) n = (n + s.charCodeAt(i)) % 997;
    return 색들[n % 색들.length];
  }

  function 얼굴(메일, 결) {
    var r = 하나(메일);
    var 사진 = r && r.사진;
    var 속성 = { class: '얼굴 ' + 색결(메일) + (결 ? ' ' + 결 : ''), alt: '' };
    if (사진 && 사진.indexOf('img/') === 0) {
      속성.src = 사진;
      return 만들기('img', 속성);
    }
    if (사진) {
      속성['data-경로'] = 사진;       // 그린 뒤 ZG.메모자료.서명걸기(자리) 가 주소를 꽂는다
      return 만들기('img', 속성);
    }
    var 글 = (r && r.이름) ? r.이름.slice(0, 1) : String(메일 || '?').slice(0, 1).toUpperCase();
    return 만들기('span', { class: 속성.class, text: 글 });
  }

  /* ── 사진 올리기 ── 17a 것을 그대로 부른다. 통도 경로 규칙도 그대로다 */
  function 사진올리기(파일, 메일) {
    var 자 = ZG.메모자료;
    if (!자 || !자.올리기) return Promise.reject(new Error('사진을 못 올립니다'));
    // 경로는 ASCII 라야 한다 — 이메일의 @ 와 . 을 바꿔 쓴다
    var 방 = 'p-' + String(메일).toLowerCase().replace(/@/g, '-at-').replace(/[^a-z0-9._-]/g, '-');
    return 자.올리기(파일, 방);
  }

  /* ══════════ 프로필 창 ══════════ */
  /* 내 얼굴·이름·직책을 고친다. 이메일은 열쇠라 못 바꾼다. 껍데기는 17c 할일창 과 같은 .askbox 다 */
  function 프로필창() {
    if (document.querySelector('.askbox')) return;
    var 메일 = 나키();
    if (!메일) { u.토스트('로그인 뒤에 쓸 수 있습니다'); return; }
    var 지금값 = 하나(메일) || { 이름: '', 직책: '', 사진: '' };
    var 새사진 = null;   // 올라간 경로. null 이면 안 바꾼 것이다

    var 얼굴칸 = 만들기('div', { class: '프로필얼굴' }, [얼굴(메일, '큰')]);
    var 사진칸 = 만들기('input', { type: 'file', accept: 'image/*', style: 'display:none' });
    var 바꿈b = 만들기('button', { class: 'btn sm', type: 'button', text: '사진 바꾸기' });
    바꿈b.addEventListener('click', function () { 사진칸.click(); });
    사진칸.addEventListener('change', function () {
      var f = 사진칸.files && 사진칸.files[0];
      사진칸.value = '';
      if (!f) return;
      바꿈b.disabled = true;
      바꿈b.textContent = '올리는 중…';
      사진올리기(f, 메일).then(function (경로) {
        새사진 = 경로;
        u.비우기(얼굴칸);
        var g = 만들기('img', { class: '얼굴 큰 ' + 색결(메일), 'data-경로': 경로, alt: '' });
        얼굴칸.appendChild(g);
        if (ZG.메모자료) ZG.메모자료.서명걸기(얼굴칸);
      }).catch(function (e) {
        u.토스트('사진을 못 올렸습니다');
        console.warn(e);
      }).then(function () {
        바꿈b.disabled = false;
        바꿈b.textContent = '사진 바꾸기';
      });
    });

    var 이름칸 = 만들기('input', { class: 'inp', type: 'text', maxlength: '20' });
    이름칸.value = 지금값.이름 || '';
    var 직책칸 = 만들기('input', { class: 'inp', type: 'text', maxlength: '20' });
    직책칸.value = 지금값.직책 || '';

    function 닫기(저장할까) {
      document.removeEventListener('keydown', 열쇠);
      막.remove(); 상자.remove();
      if (!저장할까) return;
      var t = 이름칸.value.trim();
      var 값 = { 이름: t || 메일.split('@')[0], 직책: 직책칸.value.trim() };
      if (새사진) 값.사진 = 새사진;
      저장(메일, 값);
      u.토스트('프로필을 바꿨습니다');
      다시그리기();
    }
    function 열쇠(e) { if (e.key === 'Escape') { e.preventDefault(); 닫기(false); } }

    var 막 = 만들기('div', { class: 'askscrim' });
    막.addEventListener('click', function () { 닫기(false); });
    var 아니오 = 만들기('button', { class: 'btn', type: 'button', text: '취소' });
    아니오.addEventListener('click', function () { 닫기(false); });
    var 예 = 만들기('button', { class: 'btn main', type: 'button', text: '저장' });
    예.addEventListener('click', function () { 닫기(true); });

    var 상자 = 만들기('div', {
      class: 'askbox' + (u.폰인가() ? ' sheetup' : ''), role: 'dialog', 'aria-modal': 'true'
    }, [
      만들기('h4', { text: '내 프로필' }),
      만들기('div', { class: '프로필머리' }, [얼굴칸, 바꿈b, 사진칸]),
      만들기('div', { class: 'field' }, [만들기('label', { text: '이름' }), 이름칸]),
      만들기('div', { class: 'field' }, [만들기('label', { text: '직책' }), 직책칸]),
      만들기('div', { class: 'field' }, [
        만들기('label', { text: '이메일' }),
        만들기('div', { class: '프로필메일', text: 메일 })
      ]),
      만들기('div', { class: 'btnrow' }, [아니오, 예])
    ]);

    document.body.appendChild(막);
    document.body.appendChild(상자);
    document.addEventListener('keydown', 열쇠);
    if (ZG.메모자료) ZG.메모자료.서명걸기(얼굴칸);
  }

  /* ══════════ 내 자리 시트 ══════════ */
  /* 「더보기」를 없애면서 갈 곳 잃은 PC보기가 여기로 들어왔다 */
  function 내시트() {
    u.고르기({
      제목: 이름(나키()),
      항목: [
        { 값: '프로필', 그림: '사람', 글: '내 프로필' },
        { 값: 'PC보기', 그림: u.PC보기인가() ? '폰' : '화면', 글: u.PC보기인가() ? '폰화면으로' : 'PC화면으로' },
        { 값: '로그아웃', 그림: '나감', 글: '로그아웃' }
      ]
    }, function (값) {
      if (값 === '프로필') 프로필창();
      else if (값 === 'PC보기') u.PC보기(!u.PC보기인가());
      else if (값 === '로그아웃') 로그아웃();
    });
  }

  function 로그아웃() {
    u.확인({ 제목: '로그아웃할까요?', 확인글: '로그아웃' }, function (예) {
      if (!예) return;
      /* 🔴 저장소.전부지우기() 는 부르지 않는다 — 아직 못 올린 큐까지 조용히 지운다.
         자료는 서버에 있고, 다시 로그인하면 내려온다. */
      var 끝 = function () { location.replace((ZG.설정 && ZG.설정.로그인화면) || '로그인.html'); };
      var 서 = ZG.서버;
      if (서 && 서.클라이언트) 서.클라이언트.auth.signOut().then(끝, 끝);
      else 끝();
    });
  }

  /* 프로필을 바꾸면 화면마다 붙은 얼굴을 새로 그려야 한다 */
  function 다시그리기() {
    ['앱', '업체앱', '메모앱', '홈앱'].forEach(function (이름) {
      var a = ZG[이름];
      if (a && typeof a.다시그리기 === 'function') { try { a.다시그리기(); } catch (e) { console.warn(e); } }
    });
  }

  ZG.사람 = {
    나키: 나키, 나: 나, 하나: 하나, 목록: 목록, 이름: 이름, 저장: 저장,
    얼굴: 얼굴, 색결: 색결, 사진올리기: 사진올리기,
    세션: 세션, 프로필창: 프로필창, 내시트: 내시트, 로그아웃: 로그아웃
  };
})(window.ZG);
