/* 06a-재고목록 — 재고 탭 목록 (설계 §4-2 · §7) */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 쪽크기 = 15;

  /* 급열림: 재입고 요청 접기칸. 앱을 새로 열면 늘 접힌 채로 시작하고(밭에서는 목록이 먼저다),
     한 번 펼치면 그 세션 동안은 다시 그려도 펼친 채로 둔다. */
  var 상태 = {
    필터: '전체', 검색: '', 쪽: 1, 폰보임: 15, 상세코드: null, 스크롤: 0, 급열림: false,
    업체: '',                              // 입고업체 칩 (8/19 · 2026-09-14 칩으로)
    일자: '',                              // 일자별이 보는 날. 빈 값이면 오늘 (2026-09-14)
    일자범위: null,                        // [시작, 끝] — 가운데 날짜를 눌러 지정하면 채워진다
    선택: {},        // 품목코드 → true. 골라 놓은 것 (8/6 선택 삭제)
    선택모드: false  // 폰에서만 쓴다 — 「선택」을 눌러야 동그라미가 나온다
  };
  var 참조 = {};

  function 고른것들() { return Object.keys(상태.선택); }
  function 선택비우기() { 상태.선택 = {}; }

  /* 고른 개수가 바뀔 때마다 부른다. 목록은 다시 그리지 않는다 —
     다시 그리면 체크를 누르는 족족 화면이 튀고 누르던 자리를 잃는다 */
  function 선택바갱신() {
    var 수 = 고른것들().length;
    if (참조.선택바) {
      참조.선택바.classList.toggle('보임', 수 > 0);
      if (참조.선택수) 참조.선택수.textContent = 수 + '종 골랐습니다';
    }
    if (참조.폰막대) 참조.폰막대.classList.toggle('보임', 수 > 0);
    if (참조.폰삭제) 참조.폰삭제.textContent = 수 ? 수 + '종 삭제' : '삭제';
    if (참조.전체체크) {
      var 보이는 = 참조.보이는코드 || [];
      참조.전체체크.checked = 보이는.length > 0 && 보이는.every(function (c) { return 상태.선택[c]; });
    }
  }

  function 고르기(코드, 켬) {
    if (켬) 상태.선택[코드] = true;
    else delete 상태.선택[코드];
    선택바갱신();
  }

  function 전부요약() {
    var 장 = ZG.계산.장부();
    var 품목 = ZG.저장소.품목들();
    var 접두수 = {};
    품목.forEach(function (p) { 접두수[p.접두] = (접두수[p.접두] || 0) + 1; });
    var 입고별 = {};   // 품목코드 → [{날짜, 업체}] — 입고 기준 거르개가 쓴다
    장.입고.forEach(function (r) {
      (입고별[r.품목코드] = 입고별[r.품목코드] || [])
        .push({ 날짜: r.입고일 || '', 업체: (r.입고업체 || '').trim() });
    });
    return ZG.계산.소진순정렬(품목.map(function (p) {
      var 요 = ZG.계산.요약(p, 장);
      요.같은접두 = 접두수[p.접두] > 1;
      요.입고들 = 입고별[p.품목코드] || [];
      return 요;
    }));
  }

  function 거르기(전부) {
    var 열쇠 = 상태.검색.toLowerCase().replace(/\s/g, '');
    return 전부.filter(function (요) {
      var p = 요.품목;
      // 「일자별」은 품목이 아니라 입고 기록을 보는 갈래다 — 여기서 거르지 않는다
      if (상태.필터 !== '전체' && 상태.필터 !== '일자별' && p.상태 !== 상태.필터) return false;
      if (상태.업체) {
        var 맞는입고 = (요.입고들 || []).some(function (i) { return i.업체 === 상태.업체; });
        if (!맞는입고) return false;
      }
      if (열쇠) {
        var 밭 = (p.유통명 + p.학명 + p.품목코드).toLowerCase().replace(/\s/g, '');
        if (밭.indexOf(열쇠) < 0) return false;
      }
      return true;
    });
  }

  function 요약글() {
    var 전부 = 전부요약();
    var 총 = 전부.reduce(function (a, 요) { return a + Math.max(0, 요.현재고); }, 0);
    var 급함 = 전부.filter(function (요) { return 요.재입고; }).length;
    return { 왼: '등록 <b>' + 전부.length + '</b>종 · 총 <b>' + u.콤마(총) + '</b>주', 오: '3주 내 소진 <b>' + 급함 + '</b>종' };
  }

  function 필터칩들(전부, 다시) {
    var 상자 = 만들기('div', { class: 'fchips' });
    var 셈 = function (이름) {
      return 이름 === '전체' ? 전부.length : 전부.filter(function (요) { return 요.품목.상태 === 이름; }).length;
    };
    /* 🔴 2026-09-14 우람님 — 「3주 내 소진은 뺀다」. 「일자별」은 품목이 아니라
       그날 들어온 **입고 기록**을 보는 갈래라 개수를 세지 않는다. */
    ['전체', '판매중', '품절', '일자별'].forEach(function (이름) {
      var 날 = 이름 === '일자별';
      var b = 만들기('button', {
        class: 'fchip' + (상태.필터 === 이름 ? ' on' : ''), type: 'button',
        html: u.안전(이름) + (날 ? '' : ' <span class="n">' + 셈(이름) + '</span>')
      });
      b.addEventListener('click', function () {
        상태.필터 = 이름; 상태.쪽 = 1;
        if (날 && !상태.일자) 상태.일자 = u.오늘문자();   // 처음 누르면 오늘부터
        다시();
      });
      상자.appendChild(b);
    });
    return 상자;
  }

  /* ── 일자별 (2026-09-14 우람님) ──
     품목이 아니라 **그날 들어온 입고 기록**을 본다. 기본은 오늘,
     좌우 화살표로 앞뒤 날, 가운데 날짜를 누르면 시작일~종료일을 지정하는 창이 뜬다. */
  function 날짜더하기(날, 일수) {
    var d = new Date(날 + 'T00:00:00');
    d.setDate(d.getDate() + 일수);
    return ZG.계산.날짜문자(d);
  }

  function 날글(날) {
    var d = new Date(날 + 'T00:00:00');
    return d.getFullYear() + '. ' + (d.getMonth() + 1) + '. ' + d.getDate() +
           ' (' + '일월화수목금토'[d.getDay()] + ')';
  }

  function 일자줄(다시) {
    var 범위 = 상태.일자범위;
    var 줄 = 만들기('div', { class: '일자줄' });

    var 앞 = 만들기('button', { class: '화살', type: 'button', text: '‹', 'aria-label': '앞날' });
    var 뒤 = 만들기('button', { class: '화살', type: 'button', text: '›', 'aria-label': '뒷날' });
    앞.disabled = 뒤.disabled = !!범위;       // 기간을 지정하셨으면 화살표는 쉰다
    앞.addEventListener('click', function () { 상태.일자 = 날짜더하기(상태.일자, -1); 다시(); });
    뒤.addEventListener('click', function () { 상태.일자 = 날짜더하기(상태.일자, 1); 다시(); });

    var 가운데 = 만들기('button', { class: '일자', type: 'button',
      text: 범위 ? (날글(범위[0]) + '  ~  ' + 날글(범위[1])) : 날글(상태.일자) });
    가운데.addEventListener('click', function () { 기간창(다시); });

    줄.appendChild(앞); 줄.appendChild(가운데); 줄.appendChild(뒤);
    return 줄;
  }

  /* 가운데 날짜를 누르면 뜨는 창 — 시작일·종료일을 직접 고른다 */
  function 기간창(다시) {
    var 범위 = 상태.일자범위 || [상태.일자, 상태.일자];
    var 칸 = function (값) { return 만들기('input', { class: 'inp', type: 'date', value: 값 }); };
    var 부터 = 칸(범위[0]), 까지 = 칸(범위[1]);

    var 속 = 만들기('div', { class: '기간창' }, [
      만들기('div', { class: 'ttl', text: '기간으로 보기' }),
      만들기('label', { text: '시작일' }), 부터,
      만들기('label', { text: '종료일' }), 까지
    ]);
    var 덮개 = 만들기('div', { class: '기간덮개' }, [속]);
    var 닫기 = function () { if (덮개.parentNode) 덮개.parentNode.removeChild(덮개); };

    var 하루 = 만들기('button', { class: 'btn', type: 'button', text: '하루만 보기' });
    하루.addEventListener('click', function () {
      상태.일자범위 = null; 상태.일자 = 부터.value || u.오늘문자(); 닫기(); 다시();
    });
    var 보기 = 만들기('button', { class: 'btn main', type: 'button', text: '이 기간 보기' });
    보기.addEventListener('click', function () {
      var a = 부터.value, b = 까지.value;
      if (!a || !b) { u.토스트('시작일과 종료일을 고르세요'); return; }
      if (a > b) { var x = a; a = b; b = x; }          // 거꾸로 고르셔도 알아서 바꾼다
      상태.일자범위 = (a === b) ? null : [a, b];
      상태.일자 = a;
      닫기(); 다시();
    });
    속.appendChild(만들기('div', { class: '단추줄' }, [하루, 보기]));

    덮개.addEventListener('click', function (e) { if (e.target === 덮개) 닫기(); });
    document.body.appendChild(덮개);
    return 덮개;
  }

  /* 그 날(또는 그 기간)에 들어온 입고 기록. 업체 칩도 같이 먹는다 */
  function 그날입고() {
    var 범위 = 상태.일자범위 || [상태.일자, 상태.일자];
    var 열쇠 = (상태.검색 || '').toLowerCase().replace(/\s/g, '');
    return ZG.저장소.읽기(ZG.저장소.키.입고).filter(function (r) {
      if (!r.입고일 || r.입고일 < 범위[0] || r.입고일 > 범위[1]) return false;
      if (상태.업체 && (r.입고업체 || '').trim() !== 상태.업체) return false;
      if (열쇠) {
        var 밭 = (r.유통명 + r.학명 + r.품목코드 + (r.입고업체 || '') + (r.메모 || ''))
                   .toLowerCase().replace(/\s/g, '');
        if (밭.indexOf(열쇠) < 0) return false;
      }
      return true;
    }).sort(function (a, b) {
      return a.입고일 === b.입고일 ? (b.등록일시 || 0) - (a.등록일시 || 0)
                                   : (a.입고일 < b.입고일 ? 1 : -1);
    });
  }

  /* ── 입고업체 찾기 (2026-09-14 우람님 「업체별은 검색&자동완성으로 보여준다」) ──
     처음엔 칩 줄이었는데 곳이 열둘이라 옆으로 밀어야 했다. 쳐서 고르는 쪽이 빠르다.
     🔴 업체 목록은 업체관리가 아니라 **실제 입고 기록**에서 뽑는다 —
        등록 안 된 이름으로 들어온 입고도 골라야 한다.
     🔴 `datalist` 를 쓴다 — 입고 화면 업체칸(05b)과 같은 결이고, 폰에서도 제 키보드가 뜬다. */
  function 업체찾기(전부, 다시) {
    var 셈 = {};
    전부.forEach(function (요) {
      (요.입고들 || []).forEach(function (i) { if (i.업체) 셈[i.업체] = (셈[i.업체] || 0) + 1; });
    });
    var 이름들 = Object.keys(셈).sort(function (a, b) { return 셈[b] - 셈[a]; });
    if (!이름들.length) return 만들기('div');

    var 칸 = 만들기('input', {
      class: 'inp 업체찾기', type: 'search', list: 'zg-입고업체목록',
      placeholder: '업체로 거르기', value: 상태.업체, 'aria-label': '입고업체로 거르기'
    });
    var 목록 = 만들기('datalist', { id: 'zg-입고업체목록' });
    목록.innerHTML = 이름들.map(function (n) {
      return '<option value="' + u.안전(n) + '">' + 셈[n] + '건</option>';
    }).join('');

    var 고름 = function () {
      var 값 = (칸.value || '').trim();
      // 🔴 목록에 없는 글자는 무시한다 — 반쯤 치다 만 것으로 목록이 비면 고장으로 보인다
      if (값 && 이름들.indexOf(값) < 0) return;
      if (값 === 상태.업체) return;
      상태.업체 = 값; 상태.쪽 = 1; 다시();
    };
    칸.addEventListener('change', 고름);
    칸.addEventListener('search', 고름);      // 폰에서 ✕ 를 눌러 지웠을 때
    칸.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); 고름(); } });

    var 통 = 만들기('div', { class: '업체줄' }, [칸, 목록]);
    if (상태.업체) {
      // 🔴 업체 이름은 칸에 이미 적혀 있다 — 단추에 또 쓰지 않는다
      var 지움 = 만들기('button', { class: '업체지움', type: 'button', text: '✕', 'aria-label': '업체 거르기 끄기' });
      지움.addEventListener('click', function () { 상태.업체 = ''; 상태.쪽 = 1; 다시(); });
      통.appendChild(지움);
    }
    return 통;
  }

  /* 이 칸은 목록을 다시 그려도 DOM 이 살아남아야 한다 — 06b 목록다시() 참고.
     칸이 갈아끼워지면 아이폰 한글 조합이 끊긴다. */
  function 검색칸(목록다시) {
    /* 🔴 손대야열림 — 탭을 바꿀 때 아이폰이 커서를 여기로 옮겨 붙여 키보드가 저 혼자 올라왔다 */
    var e = u.손대야열림(만들기('input', { class: 'inp', type: 'search', placeholder: '🔍  유통명 · 학명 · 품목코드로 찾기' }));
    e.value = 상태.검색;
    u.조합안전입력(e, function (값) {
      if (값 === 상태.검색) return;
      상태.검색 = 값; 상태.쪽 = 1; 목록다시();
    }, 180);
    참조.검색 = e;
    return e;
  }

  /* ── 재입고 요청 — 접기칸 (설계 §16-7) ──
     04b-특성의 .fold / .foldbody 구조를 그대로 쓴다. 부품은 새로 만들지 않는다. */
  function 급한카드들(전부, 폰) {
    var 급 = 전부.filter(function (요) { return 요.재입고; });
    var 최대 = 폰 ? 3 : 5;
    var 상자 = 만들기('div', { class: 'alert' + (급.length ? '' : ' quiet') });

    var 속 = 만들기('div', { class: '재입고속' });
    var 몸 = 만들기('div', { class: 'foldbody' }, [속]);
    var 머리 = 만들기('button', { class: 'fold 재입고머리', type: 'button', 'aria-expanded': 'false' });
    function 머리글(열림) {
      머리.innerHTML = (열림 ? '－' : '＋') + ' 재입고 요청 <span class="n">' + 급.length + '종</span>';
    }
    머리.addEventListener('click', function () {
      상태.급열림 = 몸.classList.toggle('open');
      머리.setAttribute('aria-expanded', 상태.급열림 ? 'true' : 'false');
      머리글(상태.급열림);
    });
    머리글(상태.급열림);
    if (상태.급열림) { 몸.classList.add('open'); 머리.setAttribute('aria-expanded', 'true'); }
    상자.appendChild(머리);
    상자.appendChild(몸);

    if (!급.length) {
      속.appendChild(만들기('p', { text: '3주 안에 소진될 품목이 없습니다.' }));
      return 상자;
    }

    if (폰) {
      var 목 = 만들기('div', { class: 'ph-list' });
      급.slice(0, 최대).forEach(function (요) { 목.appendChild(폰카드(요, true)); });
      속.appendChild(목);
      u.목록등장(목.children);
    } else {
      var 판 = 만들기('div', { class: 'ucards' });
      급.slice(0, 최대).forEach(function (요) { 판.appendChild(급한카드(요)); });
      속.appendChild(판);
      u.목록등장(판.children);
    }

    return 상자;
  }

  function 급한카드(요) {
    var p = 요.품목;
    var 칸 = 만들기('div', { class: 'ucard' });
    칸.innerHTML =
      '<div class="days ' + 요.등급 + '">' + u.안전(요.소진.표시) + '</div>' +
      '<div class="nm">' + u.안전(p.유통명) + ' <span class="code">' + u.안전(p.품목코드) + '</span></div>' +
      '<div class="sci">' + u.안전(p.학명) + ' · ' + u.안전(p.규격) + '</div>' +
      '<div class="stock">현재고 <b' + (요.현재고 <= 0 ? ' class="zero"' : '') + '>' + u.콤마(Math.max(0, 요.현재고)) +
      '</b><span class="sub">월 ' + u.콤마(요.월출고) + '주 나감</span></div>' +
      '<div class="last">마지막 입고 ' + u.안전(요.마지막입고 || '기록 없음') + '</div>';
    var b = 만들기('button', { class: 'btn sm', type: 'button', text: '입고 등록' });
    b.addEventListener('click', function () { ZG.입고.채우기(p); location.hash = '#입고'; });
    칸.appendChild(b);
    return 칸;
  }

  /* ── 폰 카드 ── */
  function 폰카드(요, 짧게) {
    var p = 요.품목;
    var 고름 = 상태.선택모드;
    var 칸 = 만들기('button', {
      class: 'ph-card' + (고름 ? ' 고르는중' : '') + (고름 && 상태.선택[p.품목코드] ? ' 골랐다' : ''),
      type: 'button'
    });
    var 속 = (고름 ? '<span class="동그라미"></span>' : '') +
      '<div class="r1"><div class="nm">' + u.안전(p.유통명) + '</div>' +
      '<div class="days big ' + 요.등급 + '">' + u.안전(요.소진.표시) + '</div>' +
      (고름 ? '' : '<span class="chev">›</span>') + '</div>';
    if (!짧게) 속 += '<div class="sci">' + u.안전(p.학명) + '</div>';
    속 += '<div class="r2">' + u.안전(p.품목코드) + ' · <b>' + u.콤마(Math.max(0, 요.현재고)) + '</b>주 · 월 ' +
      u.콤마(요.월출고) + '주 나감</div>';
    칸.innerHTML = 속;
    칸.addEventListener('click', function () {
      if (!상태.선택모드) { ZG.재고수정.폰상세열기(p.품목코드); return; }
      var 켬 = !상태.선택[p.품목코드];
      고르기(p.품목코드, 켬);
      칸.classList.toggle('골랐다', 켬);
    });
    return 칸;
  }

  /* ── 고른 것 알림줄 (PC) — 목록칸 밖에 둔다. 목록을 다시 그려도 살아남아야 한다 ── */
  function 선택바() {
    var 수글 = 만들기('b', { text: '0종 골랐습니다' });
    참조.선택수 = 수글;
    var 풀기 = 만들기('button', { class: 'btn sm', type: 'button', text: '선택 해제' });
    풀기.addEventListener('click', function () { 선택비우기(); ZG.재고.목록다시(); 선택바갱신(); });
    var 지움 = 만들기('button', { class: 'btn sm warn', type: 'button', text: '선택 삭제' });
    지움.addEventListener('click', function () { ZG.재고수정.선택삭제(); });
    var 바 = 만들기('div', { class: '선택바' }, [수글, 만들기('div', { style: 'flex:1' }), 풀기, 지움]);
    참조.선택바 = 바;
    return 바;
  }

  /* ── 폰: 「선택」 단추와 아래 고정 작업 막대 ── */
  function 선택단추(다시) {
    var b = 만들기('button', { class: 'btn sm', type: 'button', text: 상태.선택모드 ? '취소' : '선택' });
    b.addEventListener('click', function () {
      상태.선택모드 = !상태.선택모드;
      if (!상태.선택모드) 선택비우기();
      다시();
    });
    return b;
  }

  function 폰작업막대() {
    var b = 만들기('button', { class: '삭제', type: 'button', text: '삭제' });
    b.addEventListener('click', function () { ZG.재고수정.선택삭제(); });
    참조.폰삭제 = b;
    var 바 = 만들기('div', { class: 'ph-작업막대' }, [b]);
    참조.폰막대 = 바;
    return 바;
  }

  /* ── PC 표 ── */
  function 표그리기(걸러진) {
    var 표 = 만들기('table');
    표.innerHTML =
      '<colgroup><col style="width:38px"><col style="width:104px"><col>' +
      '<col style="width:100px"><col style="width:86px"><col style="width:76px">' +
      '<col style="width:86px"><col style="width:104px"><col style="width:70px"></colgroup>' +
      '<thead><tr><th class="ck"></th><th>품목코드</th><th>유통명 · 학명</th><th>규격</th>' +
      '<th class="r">현재고</th><th class="r">소진일</th><th class="r">매입단가</th><th>상태</th><th></th></tr></thead>';

    var 몸 = 만들기('tbody');
    var 처음 = (상태.쪽 - 1) * 쪽크기;
    var 쪽것 = 걸러진.slice(처음, 처음 + 쪽크기);

    // 「이 쪽 전부」 체크는 지금 보이는 줄만 본다 — 안 보이는 줄까지 골라 지우면 사고다
    참조.보이는코드 = 쪽것.map(function (요) { return 요.품목.품목코드; });
    var 전체체크 = 만들기('input', { type: 'checkbox', 'aria-label': '이 쪽 전부 고르기' });
    참조.전체체크 = 전체체크;
    전체체크.addEventListener('change', function () {
      참조.보이는코드.forEach(function (c) {
        if (전체체크.checked) 상태.선택[c] = true; else delete 상태.선택[c];
      });
      Array.prototype.forEach.call(몸.querySelectorAll('input[type=checkbox]'), function (c) {
        c.checked = 전체체크.checked;
        c.closest('tr').classList.toggle('골랐다', 전체체크.checked);
      });
      선택바갱신();
    });
    표.querySelector('th.ck').appendChild(전체체크);

    쪽것.forEach(function (요) {
      var p = 요.품목;
      var 줄 = 만들기('tr');
      줄.dataset.코드 = p.품목코드;
      줄.innerHTML =
        '<td class="ck"></td>' +
        '<td class="code' + (요.같은접두 ? ' same' : '') + '">' + u.안전(p.품목코드) + '</td>' +
        '<td>' + u.안전(p.유통명) + '<div class="sci">' + u.안전(p.학명) + '</div></td>' +
        '<td class="dim">' + u.안전(p.규격) + '</td>' +
        '<td class="r' + (요.현재고 <= 0 ? ' zero' : '') + '">' + u.콤마(Math.max(0, 요.현재고)) +
        '<span class="sub">월 ' + u.콤마(요.월출고) + '주</span></td>' +
        (요.소진.종류 === '판정안함'
          ? '<td class="r dim" style="font-weight:var(--weight-medium)">판정 안 함</td>'
          : '<td class="r"><span class="days ' + 요.등급 + '">' + u.안전(요.소진.표시) + '</span></td>') +
        '<td class="r">' + u.콤마(p.매입단가) + '</td>' +
        '<td>' + 배지(요) + '</td><td></td>';
      var 체크 = 만들기('input', { type: 'checkbox', 'aria-label': p.유통명 + ' 고르기' });
      체크.checked = !!상태.선택[p.품목코드];
      줄.classList.toggle('골랐다', 체크.checked);
      체크.addEventListener('change', function () {
        고르기(p.품목코드, 체크.checked);
        줄.classList.toggle('골랐다', 체크.checked);
      });
      줄.firstChild.appendChild(체크);

      var 고침 = 만들기('button', { class: 'btn sm', type: 'button', text: '수정' });
      고침.addEventListener('click', function () { ZG.재고수정.시트열기(p.품목코드, 고침, 줄); });
      줄.lastChild.appendChild(고침);
      몸.appendChild(줄);
    });

    if (!쪽것.length) {
      몸.innerHTML = '<tr><td colspan="9" class="dim" style="text-align:center; padding:var(--space-4xl) 0">' +
        '이 조건에 맞는 품목이 없습니다</td></tr>';
    }
    표.appendChild(몸);
    u.목록등장(몸.querySelectorAll('tr'));
    참조.표몸 = 몸;
    return 만들기('div', { class: 'tablewrap' }, [표]);
  }

  function 배지(요) {
    var p = 요.품목;
    if (요.재입고) return '<span class="chip out">재입고 필요</span>';
    if (p.상태 === '품절') return '<span class="chip warn">' + u.안전(p.상태) + '</span>';
    return '<span class="chip">판매중</span>';
  }

  function 쪽번호(걸러진, 다시) {
    var 마지막 = Math.max(1, Math.ceil(걸러진.length / 쪽크기));
    if (상태.쪽 > 마지막) 상태.쪽 = 마지막;
    var 처음 = (상태.쪽 - 1) * 쪽크기;
    var 상자 = 만들기('div', { class: 'pager' });
    상자.appendChild(만들기('span', {
      class: 'gap',
      text: 걸러진.length + '종 중 ' + (걸러진.length ? 처음 + 1 : 0) + '~' + Math.min(처음 + 쪽크기, 걸러진.length)
    }));
    function 단추(글, 쪽, 켬) {
      if (켬) return 만들기('b', { text: 글 });
      var b = 만들기('button', { type: 'button', text: 글 });
      b.disabled = 쪽 < 1 || 쪽 > 마지막;
      b.addEventListener('click', function () { 상태.쪽 = 쪽; 다시(); });
      return b;
    }
    상자.appendChild(단추('‹', 상태.쪽 - 1));
    for (var i = 1; i <= 마지막; i++) 상자.appendChild(단추(String(i), i, i === 상태.쪽));
    상자.appendChild(단추('›', 상태.쪽 + 1));
    return 상자;
  }

  ZG.재고목록 = {
    상태: 상태, 참조: 참조, 전부요약: 전부요약, 거르기: 거르기, 요약글: 요약글,
    필터칩들: 필터칩들, 업체찾기: 업체찾기, 일자줄: 일자줄, 그날입고: 그날입고, 검색칸: 검색칸, 급한카드들: 급한카드들, 폰카드: 폰카드,
    표그리기: 표그리기, 쪽번호: 쪽번호, 배지: 배지,
    고른것들: 고른것들, 선택비우기: 선택비우기, 선택바갱신: 선택바갱신,
    선택바: 선택바, 선택단추: 선택단추, 폰작업막대: 폰작업막대
  };
})(window.ZG);
