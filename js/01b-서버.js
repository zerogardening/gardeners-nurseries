/* 01b-서버 — Supabase 클라이언트 · 로그인 게이트 · 첫 내려받기 · Realtime
   주소·열쇠는 js/01a-설정.js 한 곳에만 있다. 비어 있으면 로그인도 서버도 건너뛰고
   이 기기 안에서만 돈다 — 화면은 그대로 뜬다. CDN 이 안 열려도 마찬가지다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 설정 = ZG.설정 || {};
  var 주소 = 설정.서버주소 || '';
  var 공개키 = 설정.공개키 || '';
  var 토큰키 = 설정.토큰키 ? 설정.토큰키() : '';
  var 표들 = ['품목', '입고', '출고', '재고조정', '업체', '명세서', '명세서줄', '견적요청', '메모', '사람', '업무', '구독'];

  var 서버 = {
    로그인됨: false, 켜짐: false, 아직안올림: false,
    클라이언트: null, 표들: 표들, 경고: [],
    표이름: 표이름, 키로: 키로,
    받아오기: function () { return 내려받기(true); },
    올림표시: 올림표시,
    상태: 상태
  };
  ZG.서버 = 서버;

  function 표이름(k) { return String(k).replace('gn.v1.', ''); }
  function 키로(표) { return 'gn.v1.' + 표; }

  function 상태() {
    return {
      로그인됨: 서버.로그인됨, 켜짐: 서버.켜짐, 아직안올림: 서버.아직안올림,
      못보낸건수: ZG.보내기 ? ZG.보내기.건수() : 0,
      경고: 서버.경고.slice()
    };
  }

  /* ── 게이트 (동기) — 토큰이 없으면 화면을 그리기 전에 로그인으로 보낸다 ─────────
     🔴 서버 설정이 아직 없으면 게이트를 걸지 않는다. 걸면 아무도 화면을 못 본다. */
  if (!주소 || !공개키) {
    console.info('서버 설정이 아직 없습니다 (js/01a-설정.js) — 이 기기 안에서만 돕니다');
    return;
  }
  var 토큰 = null;
  try { 토큰 = localStorage.getItem(토큰키); } catch (e) {}
  if (!토큰) {
    location.replace(설정.로그인화면 + '?from=' + encodeURIComponent(location.href));
    return;
  }
  서버.로그인됨 = true;

  if (!window.supabase || !window.supabase.createClient) {
    console.warn('supabase-js 를 못 불러왔습니다 — 로컬 전용으로 돕니다');
    return;
  }
  var supa = window.supabase.createClient(주소, 공개키, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
  서버.클라이언트 = supa;
  서버.켜짐 = true;

  /* ── 에코 무시 — 「지금 로컬에 이미 있는 값」이 돌아온 것만 버린다 (설계 §5) ────
     🔴 「내가 보낸 값인가」로 판단하면 안 된다. 그사이 남의 값을 로컬에 덮어썼다면
        되돌아온 내 값은 메아리가 아니라 서버의 최신값이라 반드시 받아야 한다.
        (안 받으면 A·B가 서로 상대 값을 든 채 갈라진다 — 8/6 실측)
     로컬과 같을 때만 건너뛰므로 진짜 메아리는 그대로 걸러져 화면이 안 튄다.
     지문은 키를 정렬해 만든다 — jsonb 가 칸 순서를 바꿔 돌려주기 때문이다. */
  function 정렬(v) {
    if (Array.isArray(v)) return v.map(정렬);
    if (v && typeof v === 'object') {
      var o = {};
      Object.keys(v).sort().forEach(function (k) { if (v[k] !== undefined) o[k] = 정렬(v[k]); });
      return o;
    }
    return v;
  }
  function 지문(값) {
    try { return JSON.stringify(정렬(값 === undefined ? null : 값)); }
    catch (e) { return null; }
  }
  function 같은가(a, b) {
    var x = 지문(a); return x !== null && x === 지문(b);
  }

  /* ── 「나중에 서버에 닿은 쪽이 이긴다」의 근거 (설계 §5) ─────────────────────
     한 묶음으로 온 두 줄의 도착 순서가 기기마다 정반대라 온 순서대로 덮으면 갈라진다.
     (A는 [B값,A값] · B는 [A값,B값] 순으로 받는다 — 8/6 실측)
     그래서 줄마다 「마지막으로 적용한 수정시각」을 적어 두고 그보다 옛 값은 버린다.
     수정시각은 서버 트리거가 찍으므로 두 기기가 같은 값을 본다.
     🔴 로컬과 같아 건너뛸 때도 시각은 적어 둬야 한다 — 안 그러면 뒤에 온 옛 값이 통과한다. */
  var 적용시각 = {};   // '표|id' → { t: ms, f: 지문 }

  /* timestamptz 를 마이크로초 정수로. 🔴 Date.parse 는 소수 3자리까지만 봐서
     `.088005` 와 `.088006` 이 같아져 버린다 — 실제로 그 자리에서 갈린다. */
  function 밀리초(v) {
    if (!v) return null;
    var s = String(v), 소수 = /\.(\d+)/.exec(s), 마이크로 = 0;
    if (소수) {
      var d = (소수[1] + '000000').slice(0, 6);
      마이크로 = Number(d.slice(3));
      s = s.replace(/\.\d+/, '.' + d.slice(0, 3));
    }
    var t = Date.parse(s);
    return isNaN(t) ? null : t * 1000 + 마이크로;
  }
  /* 같은 밀리초가 실제로 나온다. 그때는 지문이 큰 쪽이 이긴다 —
     어느 쪽이 서버에 남았는지는 알 수 없지만 두 기기가 반드시 같은 답을 낸다. */
  function 밀린값인가(열쇠, t, f) {
    var 앞 = 적용시각[열쇠];
    if (!앞 || t === null || 앞.t === null) return false;
    if (t < 앞.t) return true;
    if (t > 앞.t) return false;
    return String(f) <= String(앞.f);
  }
  function 적어두기(열쇠, t, f) { 적용시각[열쇠] = { t: t, f: f }; }

  /* ── 다시그리기 배분 (200ms 몰아치기 방지) ──────────────────────────────────── */

  /* 🔴 글자를 치고 있는 동안에는 그리지 않는다 (8/6 🔴-8).
     화면을 통째로 다시 그리면 입력칸 DOM 자체가 새것으로 갈아끼워지고, 그 순간
     한글 조합이 끊겨 치던 글자와 포커스가 통째로 사라진다
     (8/4 「휴케라」→「ㅎㅠㅋㅔㄹㅏ」 사고와 같은 원인).
     🔴 이 자리는 「남이 저장한 것을 받아 그리는」 곳이라 급하지 않다 — 손을 뗄 때까지 미룬다.
        우람님이 직접 누른 다시그리기(탭·거르개·저장)는 이 자리를 지나지 않으므로 그대로 즉시 그려진다.
     체크박스·라디오·버튼은 눌러 둔 채로 있는 일이 흔해 막지 않는다 — 글자 치는 칸만 본다. */
  var 글자칸 = { text: 1, search: 1, tel: 1, email: 1, url: 1, number: 1, password: 1 };
  function 치는중() {
    var a = document.activeElement;
    if (!a) return false;
    /* 🔴 단 하나의 예외 — 「다시 그려도 이 칸은 안 갈아끼운다」고 스스로 약속한 칸.
       홈 화면의 채팅 입력칸이 그것이다(19-홈.js 는 피드만 갈고 입력칸 마디는 손대지 않는다).
       이 예외가 없으면 한 사람이 2분 동안 글을 치는 내내 남의 말이 한 줄도 안 들어온다.
       🔴 그 약속을 못 지키는 화면은 절대 이 딱지를 붙이면 안 된다 — 치던 글이 날아간다. */
    if (a.getAttribute && a.getAttribute('data-그려도됨') !== null) return false;
    if (a.isContentEditable) return true;
    if (a.tagName === 'TEXTAREA') return true;
    return a.tagName === 'INPUT' && 글자칸[(a.type || 'text').toLowerCase()] === 1;
  }

  var 예약 = null;
  function 그리기예약() {
    if (예약) return;
    예약 = setTimeout(그리기, 200);
  }
  function 그리기() {
    예약 = null;
    if (치는중()) { 예약 = setTimeout(그리기, 400); return; }   // 손 뗄 때까지 되물어본다
    /* 🔴 새 셸을 만들면 이 줄에 이름을 넣어야 한다 — 안 넣으면 남이 넣은 것이 그 화면에 영영 안 뜬다.
       견적앱은 빠졌다 (견적이 메모 안 상단탭으로 들어가 메모앱이 대신 그린다, 2026-09-17) */
    ['앱', '업체앱', '메모앱', '홈앱'].forEach(function (이름) {
      var a = ZG[이름];
      if (a && typeof a.다시그리기 === 'function') { try { a.다시그리기(); } catch (e) { console.warn(e); } }
    });
  }

  function 띠(글, 색) {
    function 넣기() {
      var d = document.createElement('div');
      d.className = 'gn-서버띠';
      d.style.cssText = 'padding:10px 14px;font-size:13px;line-height:1.5;background:' + 색 +
        ';border-bottom:1px solid rgba(0,0,0,.08);position:relative;z-index:60';
      d.textContent = 글;
      document.body.insertBefore(d, document.body.firstChild);
    }
    if (document.body) 넣기(); else document.addEventListener('DOMContentLoaded', 넣기);
  }

  /* ── 표 하나를 통째로 받는다. 1,000건씩 끊는다 ──────────────────────────────── */
  function 표받기(표) {
    var 이름 = 'gn_' + 표, 모두 = [];
    function 다음(시작) {
      return supa.from(이름).select('id,내용,삭제됨,수정시각').order('id').range(시작, 시작 + 999)
        .then(function (r) {
          if (r.error) throw r.error;
          모두 = 모두.concat(r.data || []);
          if ((r.data || []).length === 1000) return 다음(시작 + 1000);
          return 모두;
        });
    }
    return 다음(0);
  }

  /* ── 관문 ① 서버상태 행이 있는가 ──────────────────────────────────────────── */
  function 서버상태읽기() {
    return supa.from('gn_공유설정').select('내용').eq('id', '서버상태').maybeSingle()
      .then(function (r) { if (r.error) throw r.error; return r.data; });
  }

  /* 「서버로 올리기」가 표를 전부 성공한 뒤에만 부른다 */
  function 올림표시(건수) {
    return supa.from('gn_공유설정').upsert([{
      id: '서버상태', 삭제됨: false,
      내용: { 올림완료: true, 올린때: new Date().toISOString(),
             올린기기: navigator.userAgent.slice(0, 120), 건수: 건수 || {} }
    }], { onConflict: 'id' });
  }

  /* ── 첫 내려받기 ──────────────────────────────────────────────────────────── */
  function 내려받기(강제) {
    var 저 = ZG.저장소, 건수 = {};
    서버.경고 = [];
    // 첫 내려받기로 채운 줄도 시각을 적어 둔다 — 안 그러면 뒤에 오는 옛 값을 못 거른다
    function 시각모으기(표, 행들) {
      행들.forEach(function (r) {
        적어두기(표 + '|' + r.id, 밀리초(r.수정시각), r.삭제됨 ? ' 삭제' : 지문(r.내용));
      });
    }

    var 일 = 표들.map(function (표) {
      return 표받기(표).then(function (행들) {
        var 로컬수 = 저.읽기(키로(표)).length;
        // 관문 ② — 서버가 로컬보다 적으면 그 표는 안 덮는다 (삭제됨 포함해 센다)
        if (!강제 && 행들.length < 로컬수) {
          서버.경고.push('서버 ' + 표 + ' ' + 행들.length + '건 / 이 기기 ' + 로컬수 + '건 — 덮지 않았습니다');
          return;
        }
        시각모으기(표, 행들);
        var 값 = 행들.filter(function (r) { return !r.삭제됨; }).map(function (r) { return r.내용; });
        저.조용히(true); 저.전체쓰기(키로(표), 값); 저.조용히(false);
        건수[표] = 값.length;
      })
      /* 🔴 표 하나가 넘어져도 나머지가 같이 죽지 않게 — Promise.all 이 통째로 거부되면
         다른 표도 안 내려오고 보내기 큐도 안 깨어난다 (8단계 설계 §5-3) */
      .catch(function (e) {
        /* 🔴 「그런 표가 없다」는 고장이 아니라 **아직 안 만든 것**이다 (2026-09-17 우람님).
           새 표를 더한 판을 올리면, 설치 SQL 을 다시 돌리기 전까지는 반드시 이 자리를 지난다.
           그때 빨간 경고를 띄우면 멀쩡한 앱이 고장 난 것처럼 보인다.
           조용히 넘기고 콘솔에만 적는다 — 표를 만들면 저절로 받아진다.
           (PostgREST 는 42P01 / PGRST205 로 답한다) */
        var 코드 = String((e && (e.code || e.message)) || '');
        if (/42P01|PGRST205|does not exist|Could not find the table/i.test(코드)) {
          console.info('아직 없는 표라 건너뜁니다 — ' + 표 + ' (설치/표만들기.sql 을 한 번 더 돌리면 됩니다)');
          return;
        }
        서버.경고.push(표 + ' 를 못 받았습니다 (' + (e.message || e) + ')');
      });
    }).concat([
      표받기('공유설정').then(function (행들) {
        시각모으기('공유설정', 행들);
        행들.forEach(function (r) {
          if (r.삭제됨) return;
          return;   // 공유설정에 아직 받아 쓸 것이 없다
        });
      })
    ]);

    return Promise.all(일).then(function () {
      저.설정쓰기({ 실데이터: true });
      if (서버.경고.length) 띠('⚠ ' + 서버.경고.join(' · '), '#fef3c7');
      그리기예약();
      /* 받아오기가 한 번 끝났으면 자국을 남긴다 — 이사 화면이 하던 몫이다.
         실패해도 그냥 넘어간다. 다음 번에 다시 남기면 된다 */
      올림표시(건수).then(null, function () {});
      return 건수;
    });
  }

  /* ── Realtime — 채널 하나에 표 전부 ───────────────────────────────────────── */
  function 구독() {
    var ch = supa.channel('gn-전체');
    표들.concat(['공유설정']).forEach(function (표) {
      ch.on('postgres_changes', { event: '*', schema: 'public', table: 'gn_' + 표 }, function (p) {
        받은줄(표, p);
      });
    });
    ch.subscribe();
  }

  function 받은줄(표, p) {
    var 행 = p['new'] && p['new'].id ? p['new'] : p.old;
    if (!행 || !행.id) return;
    var 저 = ZG.저장소, k = 키로(표);
    var 지움 = p.eventType === 'DELETE' || 행.삭제됨 === true;
    var 열쇠 = 표 + '|' + 행.id;
    var 새시각 = 밀리초(행.수정시각);
    var 새지문 = 지움 ? '\u0000삭제' : 지문(행.내용);
    if (밀린값인가(열쇠, 새시각, 새지문)) return;   // 이 줄에 이미 더 새 값을 적용했다

    if (표 === '공유설정') return;   // 아직 받아 쓸 공유설정이 없다

    var 목록 = 저.읽기(k);
    var 자리 = 목록.findIndex(function (r) { return 저.레코드키(표, r) === String(행.id); });
    적어두기(열쇠, 새시각, 새지문);
    if (지움) { if (자리 < 0) return; 목록.splice(자리, 1); }
    else if (자리 >= 0) {
      if (같은가(목록[자리], 행.내용)) return;   // 이미 같다 — 메아리. 다시그리기도 안 한다
      목록[자리] = 행.내용;
    }
    else 목록.push(행.내용);
    저.조용히(true); 저.전체쓰기(k, 목록); 저.조용히(false);
    그리기예약();
  }

  /* ── 시작 ─────────────────────────────────────────────────────────────────── */
  supa.auth.getSession().then(function (r) {
    if (!r || !r.data || !r.data.session) {
      location.replace(설정.로그인화면 + '?from=' + encodeURIComponent(location.href));
      throw new Error('세션 없음');
    }
    // 내가 누구인지 여기서 한 번만 정한다 — 01d-사람 이 이 값으로 내 줄을 찾는다
    if (ZG.사람 && ZG.사람.세션) ZG.사람.세션(r.data.session.user);
    return 서버상태읽기();
  }).then(function (행) {
    구독();
    /* 🔴 우람님 것에 있던 「관문 ①」을 뺐다 (2026-09-17).
       거기서는 구 app.html 자료를 이사하기 전까지 빈 서버가 로컬을 덮지 못하게
       막아야 했고, 그 문을 여는 것이 이사 화면의 「서버로 올리기」였다.
       여기엔 옮겨올 구 프로그램도, 이사 화면도 없다 — 서버가 처음부터 진실이다.
       문을 그대로 두면 서버상태 행을 만들 길이 없어 어느 기기도 영영 못 받아온다. */
    return 내려받기(!행);   // 첫 판(행 없음)이면 강제로 받는다. 그 뒤엔 관문 ② 가 지킨다
  }).then(function () {
    // 오래 끊겨 있다 돌아왔을 때 내 옛 값이 남의 새 값을 덮지 않게 — 먼저 받고 나서 보낸다
    if (ZG.보내기) ZG.보내기.깨우기();
  }).catch(function (e) {
    console.warn('서버 연동을 못 켰습니다 — 로컬 전용으로 돕니다', e);
  });
})(window.ZG);
