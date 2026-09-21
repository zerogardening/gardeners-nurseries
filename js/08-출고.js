/* 08-출고 — 출고 탭. 품목을 검색해 담고 수량 · 단가를 정해 빼면서, 원하면 받는 분께 문자로 알린다.
   출고 기록(gn.v1.출고)은 03-계산 현재고() 가 이미 입고에서 빼고 있다 — 저장만 하면 재고에 곧바로 반영된다.
   「출고이력」에서는 지금까지 낸 모든 출고를 고쳐 · 지울 수 있고, PC 에서는 명세서 형태로 인쇄한다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 이력쪽크기 = 20;

  var 상태 = {
    보기: '등록',                 // '등록' | '이력'
    검색: '', 담은것: [], 받는곳: '', 전화: '', 메모: '', 출고일: '',
    이력검색: '', 이력쪽: 1, 이력일자: '', 이력달: ''
  };
  var 참조 = {};
  var 요일 = ['일', '월', '화', '수', '목', '금', '토'];

  function 두자리(n) { return (n < 10 ? '0' : '') + n; }
  function 달글(달) { return Number(달.slice(0, 4)) + '년 ' + Number(달.slice(5, 7)) + '월'; }
  function 달옮기기(달, 걸음) {
    var 해 = Number(달.slice(0, 4)), 월 = Number(달.slice(5, 7)) + 걸음;
    해 += Math.floor((월 - 1) / 12);
    월 = ((월 - 1) % 12 + 12) % 12 + 1;
    return 해 + '-' + 두자리(월);
  }

  /* ── 자료 ── */
  function 기본단가(p) {
    var 판 = Number(p.판매단가) || 0;
    if (판 > 0) return 판;
    return (Number(p.매입단가) || 0) * 2;   // 판매단가를 아직 안 넣었으면 명세서와 같은 셈으로 어림한다
  }

  function 후보목록() {
    var 열쇠 = 상태.검색.trim().toLowerCase().replace(/\s/g, '');
    if (!열쇠) return [];
    var 장 = ZG.계산.장부();
    return ZG.저장소.품목들().filter(function (p) {
      var 밭 = (p.유통명 + p.학명 + p.품목코드).toLowerCase().replace(/\s/g, '');
      return 밭.indexOf(열쇠) >= 0;
    }).map(function (p) {
      return { 품목: p, 현재고: ZG.계산.현재고(p.품목코드, 장) };
    }).slice(0, 8);
  }

  function 담기(p, 현재고) {
    var 있는것 = 상태.담은것.filter(function (r) { return r.품목코드 === p.품목코드; })[0];
    if (있는것) { 있는것.수량 += 1; }
    else 상태.담은것.push({
      품목코드: p.품목코드, 유통명: p.유통명, 학명: p.학명, 규격: p.규격,
      현재고: 현재고, 수량: 1, 단가: 기본단가(p)
    });
    상태.검색 = '';
    if (참조.검색) 참조.검색.value = '';
    결과다시();
    담은칸다시();
  }

  function 빼기(코드) {
    상태.담은것 = 상태.담은것.filter(function (r) { return r.품목코드 !== 코드; });
    담은칸다시();
  }

  function 오늘내역() {
    return ZG.저장소.읽기(ZG.저장소.키.출고).filter(function (r) { return r.출고일 === 상태.출고일; })
      .sort(function (a, b) { return (b.등록일시 || 0) - (a.등록일시 || 0); });
  }

  /* 한 번에 「출고 처리」를 누른 줄들을 한 묶음으로 — 거래id 가 없는 옛 기록은 등록일시·받는곳으로 대신 묶는다 */
  function 묶음짓기(목록) {
    var 맵 = {}, 순서 = [];
    목록.forEach(function (r) {
      var 키 = r.거래id || ('t_' + r.등록일시 + '_' + (r.받는곳 || ''));
      var g = 맵[키];
      if (!g) {
        g = 맵[키] = { 키: 키, 출고일: r.출고일, 등록일시: r.등록일시, 받는곳: r.받는곳 || '', 전화: r.전화 || '', 항목: [] };
        순서.push(g);
      }
      g.항목.push(r);
    });
    순서.forEach(function (g) {
      g.총수량 = g.항목.reduce(function (a, r) { return a + (Number(r.수량) || 0); }, 0);
      g.총금액 = g.항목.reduce(function (a, r) { return a + (Number(r.금액) || r.수량 * (Number(r.단가) || 0)); }, 0);
    });
    return 순서;
  }

  function 거래삭제(g, 다시그리는것) {
    u.확인({
      제목: '이 출고를 지울까요?',
      본문: (g.받는곳 ? u.안전(g.받는곳) + ' · ' : '') + g.항목.length + '종 · ' + u.콤마(g.총수량) + '주<br>지운 만큼 재고가 다시 늘어납니다.',
      확인글: '삭제', 위험: true
    }, function (했다) {
      if (!했다) return;
      g.항목.forEach(function (r) { ZG.저장소.지우기(ZG.저장소.키.출고, r.id); });
      u.토스트('지웠습니다');
      다시그리는것();
      ZG.앱 && ZG.앱.요약다시();
    });
  }

  /* 새 업체는 조용히 등록한다 — 이름·전화만으로 충분한 자리라 05c 처럼 확인창을 띄우지 않는다 */
  function 업체반영(이름, 전화) {
    if (!이름) return;
    var 키 = ZG.저장소.키;
    var 업체 = ZG.저장소.읽기(키.업체);
    var 있는것 = 업체.filter(function (c) { return c.이름 === 이름; })[0];
    if (있는것) {
      var 바꿀것 = { 마지막사용: Date.now() };
      if (전화 && !String(있는것.전화 || '').trim()) 바꿀것.전화 = 전화;
      ZG.저장소.바꾸기(키.업체, 있는것.id, 바꿀것);
    } else {
      ZG.저장소.덧붙이기(키.업체, {
        id: 'co_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
        이름: 이름, 구분: '판매처', 전화: 전화 || '', 마지막사용: Date.now()
      });
    }
  }

  /* 우람님이 정한 문구 그대로 — 품목마다 「수량X단가원 = 금액원」 두 줄, 끝에 합계·입금계좌 */
  function 문자내용(줄들, 받는곳, 출고일, 계좌) {
    var 총 = 줄들.reduce(function (a, r) { return a + r.수량 * (Number(r.단가) || 0); }, 0);
    var 본문 = '🌱 [정원사의 널서리]\n' +
      (받는곳 ? 받는곳 + ' 님 출고 안내' : '출고 안내') + '\n\n' +
      줄들.map(function (r) {
        var 단가 = Number(r.단가) || 0;
        return '· ' + r.유통명 + (r.규격 ? ' ' + r.규격 : '') + '\n' +
          u.콤마(r.수량) + '주X' + u.콤마(단가) + '원 = ' + u.콤마(r.수량 * 단가) + '원';
      }).join('\n\n') +
      '\n\n합계: ' + u.콤마(총) + '원';
    if (계좌) 본문 += '\n\n💰입금계좌\n' + 계좌;
    return 본문;
  }

  function 출고처리() {
    if (!상태.담은것.length) { u.토스트('담은 품목이 없습니다'); return; }

    var 초과 = 상태.담은것.filter(function (r) { return r.수량 > r.현재고; });
    var 총금액 = 상태.담은것.reduce(function (a, r) { return a + r.수량 * (Number(r.단가) || 0); }, 0);
    var 본문 = 상태.담은것.map(function (r) {
      return u.안전(r.유통명) + ' ' + u.안전(r.규격 || '') + ' <b>' + u.콤마(r.수량) + '</b>주 · ' +
        u.콤마(r.단가) + '원 = <b>' + u.콤마(r.수량 * (Number(r.단가) || 0)) + '</b>원' +
        (r.수량 > r.현재고 ? ' <span style="color:var(--color-danger)">— 현재고 ' + u.콤마(r.현재고) + '주보다 많습니다</span>' : '');
    }).join('<br>') + '<br><b>합계 ' + u.콤마(총금액) + '원</b>';
    if (초과.length) 본문 = '<b style="color:var(--color-danger)">현재고보다 많이 빼는 품목이 있습니다.</b><br>' + 본문;

    u.확인({
      제목: '출고할까요?',
      본문: 본문,
      확인글: (u.폰인가() && 상태.전화.trim()) ? '출고 · 문자 보내기' : '출고',
      위험: !!초과.length
    }, function (했다) { if (했다) 저장진행(); });
  }

  function 저장진행() {
    var 키 = ZG.저장소.키;
    var 받는곳 = 상태.받는곳.trim(), 전화 = 상태.전화.replace(/[^\d]/g, '');
    var 이제 = Date.now();
    var 거래id = 'txn_' + 이제.toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    var 담은것 = 상태.담은것.slice();

    담은것.forEach(function (r, i) {
      var 단가 = Number(r.단가) || 0;
      ZG.저장소.덧붙이기(키.출고, {
        id: 'oc_' + 이제.toString(36) + '_' + i.toString(36) + '_' + Math.random().toString(36).slice(2, 6),
        거래id: 거래id,
        출고일: 상태.출고일, 품목코드: r.품목코드, 유통명: r.유통명, 학명: r.학명, 규격: r.규격,
        수량: r.수량, 단가: 단가, 금액: r.수량 * 단가,
        받는곳: 받는곳, 전화: 전화, 메모: 상태.메모.trim(), 등록일시: 이제
      });
    });
    if (받는곳) 업체반영(받는곳, 전화);

    var 총 = 담은것.reduce(function (a, r) { return a + r.수량; }, 0);
    u.토스트('출고했습니다 — ' + u.콤마(총) + '주');

    상태.담은것 = []; 상태.검색 = ''; 상태.메모 = '';
    if (참조.메모) 참조.메모.value = '';
    담은칸다시();
    ZG.앱 && ZG.앱.요약다시();

    if (u.폰인가() && 전화) {
      var 자사 = ZG.업체자료 ? ZG.업체자료.자사() : null;
      var 계좌 = 자사 && 자사.입금계좌 ? String(자사.입금계좌).trim() : '';
      location.href = 'sms:' + 전화 + '?body=' + encodeURIComponent(문자내용(담은것, 받는곳, 상태.출고일, 계좌));
    }
  }

  function 삭제(id, 다시그리는것) {
    u.확인({
      제목: '이 출고를 지울까요?', 본문: '지운 만큼 재고가 다시 늘어납니다.',
      확인글: '삭제', 위험: true
    }, function (했다) {
      if (!했다) return;
      ZG.저장소.지우기(ZG.저장소.키.출고, id);
      u.토스트('지웠습니다');
      다시그리는것();
      ZG.앱 && ZG.앱.요약다시();
    });
  }

  /* ── 수량·단가 손보기 — 좌우 단추 또는 가운데 숫자를 눌러 바로 친다 ── */
  function 숫자조절(초기값, 최소, 바뀜) {
    var 값 = 초기값;
    var 입력 = 만들기('input', {
      class: 'inp num sm', type: 'text', inputmode: 'numeric',
      style: 'width:56px; text-align:center; padding-left:4px; padding-right:4px', value: String(값)
    });
    function 반영(새값) {
      값 = Math.max(최소, Math.floor(u.숫자(새값)) || 최소);
      입력.value = String(값);
      바뀜(값);
    }
    var 마이너스 = 만들기('button', { class: 'btn sm', type: 'button', text: '－', 'aria-label': '하나 줄이기' });
    마이너스.addEventListener('click', function () { 반영(값 - 1); });
    var 플러스 = 만들기('button', { class: 'btn sm', type: 'button', text: '＋', 'aria-label': '하나 늘리기' });
    플러스.addEventListener('click', function () { 반영(값 + 1); });
    입력.addEventListener('change', function () { 반영(입력.value); });
    입력.addEventListener('blur', function () { 반영(입력.value); });
    /* 가운데 정렬이라 손대면 커서가 글자 앞에 붙곤 한다 — 눌렀을 때는 늘 뒤로 보내 바로 지울 수 있게 */
    입력.addEventListener('focus', 커서끝으로);
    입력.addEventListener('click', 커서끝으로);
    function 커서끝으로() {
      requestAnimationFrame(function () {
        var 길이 = 입력.value.length;
        try { 입력.setSelectionRange(길이, 길이); } catch (e) { /* 무시 */ }
      });
    }
    var 상자 = 만들기('div', { class: 'row', style: 'align-items:center; gap:6px; flex:0 0 auto' }, [마이너스, 입력, 플러스]);
    return { 요소: 상자, 맞추기: 반영 };
  }

  /* ── 그리기 — 담은 품목 카드 ── */
  function 결과줄(항목) {
    var p = 항목.품목;
    var 칸 = 만들기('button', { class: 'ph-card', type: 'button' });
    칸.innerHTML =
      '<div class="r1"><div class="nm">' + u.안전(p.유통명) + '</div>' +
      '<div class="cd">' + u.안전(p.품목코드) + '</div></div>' +
      '<div class="sci">' + u.안전(p.학명 || '') + '</div>' +
      '<div class="r2">' + u.안전(p.규격 || '') +
      '<span class="amt">현재고 <b' + (항목.현재고 <= 0 ? ' style="color:var(--color-danger)"' : '') + '>' + u.콤마(항목.현재고) + '</b>주</span></div>';
    칸.addEventListener('click', function () { 담기(p, 항목.현재고); });
    return 칸;
  }

  function 결과다시() {
    if (!참조.결과칸) return;
    u.비우기(참조.결과칸);
    var 목록 = 후보목록();
    if (!상태.검색.trim()) return;
    if (!목록.length) { 참조.결과칸.appendChild(만들기('div', { style: 'padding:var(--space-sm) 0; color:var(--color-text-muted)', text: '찾는 품목이 없습니다' })); return; }
    목록.forEach(function (항목) { 참조.결과칸.appendChild(결과줄(항목)); });
  }

  function 담은줄(r) {
    var 칸 = 만들기('div', { class: 'ph-card' });
    칸.innerHTML =
      '<div class="r1"><div class="nm">' + u.안전(r.유통명) + '</div><div class="cd">' + u.안전(r.품목코드) + '</div></div>' +
      '<div class="r2">' + u.안전(r.규격 || '') +
      '<span class="amt">현재고 <b' + (r.수량 > r.현재고 ? ' style="color:var(--color-danger)"' : '') + '>' + u.콤마(r.현재고) + '</b>주</span></div>';

    var 금액칸 = 만들기('b', { text: u.콤마(r.수량 * (Number(r.단가) || 0)) + '원' });
    function 금액다시() { 금액칸.textContent = u.콤마(r.수량 * (Number(r.단가) || 0)) + '원'; 합계다시(); }

    var 수량위젯 = 숫자조절(r.수량, 1, function (n) { r.수량 = n; 금액다시(); });

    var 단가입력 = 만들기('input', {
      class: 'inp num sm', type: 'text', inputmode: 'numeric', style: 'width:90px',
      value: u.콤마(r.단가)
    });
    단가입력.addEventListener('input', function () { r.단가 = u.숫자(단가입력.value); 금액다시(); });
    단가입력.addEventListener('blur', function () { 단가입력.value = u.콤마(r.단가); });
    ['focus', 'click'].forEach(function (이벤트) {
      단가입력.addEventListener(이벤트, function () {
        requestAnimationFrame(function () {
          var 길이 = 단가입력.value.length;
          try { 단가입력.setSelectionRange(길이, 길이); } catch (e) { /* 무시 */ }
        });
      });
    });

    var 빼기단추 = 만들기('button', { class: 'btn sm', type: 'button', text: '빼기' });
    빼기단추.addEventListener('click', function () { 빼기(r.품목코드); });

    var 줄1 = 만들기('div', { class: 'row', style: 'align-items:center; gap:var(--space-md); margin-top:var(--space-sm); flex-wrap:wrap' }, [
      만들기('span', { class: 'auto', text: '수량' }), 수량위젯.요소,
      만들기('span', { class: 'auto', text: '단가' }), 단가입력,
      만들기('div', { style: 'flex:1' }),
      빼기단추
    ]);
    var 줄2 = 만들기('div', { class: 'row', style: 'justify-content:flex-end; margin-top:var(--space-xs)' }, [
      만들기('span', { class: 'auto', style: 'margin-right:6px', text: '금액' }), 금액칸
    ]);
    칸.appendChild(줄1); 칸.appendChild(줄2);
    return 칸;
  }

  function 합계다시() {
    if (!참조.합계칸) return;
    var 총수량 = 상태.담은것.reduce(function (a, r) { return a + r.수량; }, 0);
    var 총금액 = 상태.담은것.reduce(function (a, r) { return a + r.수량 * (Number(r.단가) || 0); }, 0);
    참조.합계칸.innerHTML = 상태.담은것.length
      ? '합계 <b>' + u.콤마(총수량) + '</b>주 · <b>' + u.콤마(총금액) + '</b>원' : '';
  }

  function 담은칸다시() {
    if (!참조.담은칸) return;
    u.비우기(참조.담은칸);
    상태.담은것.forEach(function (r) { 참조.담은칸.appendChild(담은줄(r)); });
    합계다시();
    if (참조.출고단추) 참조.출고단추.disabled = !상태.담은것.length;
  }

  /* 화면을 새로 안 띄우고 그 자리에서 바로 수량 · 단가를 고친다. 저장을 눌러야 실제로 반영된다 */
  function 항목줄(작업행) {
    var r = 작업행.원본;
    var 칸 = 만들기('div', { style: 'padding:var(--space-2xs) 0' });
    칸.innerHTML = '<div class="row" style="align-items:center; gap:var(--space-sm)">' +
      '<div style="flex:1">' + u.안전(r.유통명) + ' ' + u.안전(r.규격 || '') + '</div></div>';

    var 금액칸 = 만들기('b', { text: u.콤마(작업행.수량 * (Number(작업행.단가) || 0)) + '원' });
    function 금액다시() { 금액칸.textContent = u.콤마(작업행.수량 * (Number(작업행.단가) || 0)) + '원'; }

    var 수량위젯 = 숫자조절(작업행.수량, 1, function (n) { 작업행.수량 = n; 금액다시(); });

    var 단가입력 = 만들기('input', {
      class: 'inp num sm', type: 'text', inputmode: 'numeric', style: 'width:90px',
      value: u.콤마(작업행.단가)
    });
    단가입력.addEventListener('input', function () { 작업행.단가 = u.숫자(단가입력.value); 금액다시(); });
    단가입력.addEventListener('blur', function () { 단가입력.value = u.콤마(작업행.단가); });
    ['focus', 'click'].forEach(function (이벤트) {
      단가입력.addEventListener(이벤트, function () {
        requestAnimationFrame(function () {
          var 길이 = 단가입력.value.length;
          try { 단가입력.setSelectionRange(길이, 길이); } catch (e) { /* 무시 */ }
        });
      });
    });

    var 줄 = 만들기('div', { class: 'row', style: 'align-items:center; gap:var(--space-md); margin-top:var(--space-2xs); flex-wrap:wrap' }, [
      만들기('span', { class: 'auto', text: '수량' }), 수량위젯.요소,
      만들기('span', { class: 'auto', text: '단가' }), 단가입력,
      만들기('div', { style: 'flex:1' }),
      만들기('span', { class: 'auto', text: '금액' }), 금액칸
    ]);
    칸.appendChild(줄);
    return 칸;
  }

  /* 카드를 왼쪽으로 밀면 삭제 단추 하나가 나온다(04-공통UI 쓸기붙이기 — 메모·체크리스트와 같은 결) */
  function 묶음카드(g, 펼침기본, 다시그리는것) {
    var 펼침 = 펼침기본;
    var 작업 = g.항목.map(function (r) { return { 원본: r, 수량: r.수량, 단가: Number(r.단가) || 0 }; });

    var 머리 = 만들기('div', { class: 'fold', style: 'width:100%; cursor:pointer' });
    var 몸 = 만들기('div', { class: 'foldbody' + (펼침 ? ' open' : '') });
    function 머리글() {
      머리.innerHTML = (펼침 ? '－' : '＋') + ' ' + u.안전(g.받는곳 || '받는 곳 없음') +
        ' <span class="n">' + g.항목.length + '종 · ' + u.콤마(g.총수량) + '주 · ' + u.콤마(g.총금액) + '원</span>';
    }
    머리글();
    머리.addEventListener('click', function () {
      if (u.방금끌었나()) return;   // 왼쪽으로 밀던 손가락을 뗀 자리에서 클릭이 한 번 더 온다
      펼침 = 몸.classList.toggle('open');
      머리글();
    });

    var 속 = 만들기('div', { style: 'padding:var(--space-sm) 0' });
    작업.forEach(function (w) { 속.appendChild(항목줄(w)); });

    var 저장단추 = 만들기('button', { class: 'btn main sm', type: 'button', text: '저장' });
    저장단추.addEventListener('click', function () {
      작업.forEach(function (w) {
        var 수량 = Math.max(1, Math.floor(w.수량) || 1);
        var 단가 = Math.max(0, w.단가 || 0);
        ZG.저장소.바꾸기(ZG.저장소.키.출고, w.원본.id, { 수량: 수량, 단가: 단가, 금액: 수량 * 단가, 수정일시: Date.now() });
      });
      u.토스트('저장했습니다');
      다시그리는것();
      ZG.앱 && ZG.앱.요약다시();
    });
    var 문자단추 = 만들기('button', { class: 'btn sm', type: 'button', text: '문자' });
    문자단추.addEventListener('click', function () {
      if (!u.폰인가()) { u.토스트('문자는 폰에서만 보낼 수 있습니다'); return; }
      if (!g.전화) { u.토스트('전화번호가 없어 문자를 보낼 수 없습니다'); return; }
      var 자사 = ZG.업체자료 ? ZG.업체자료.자사() : null;
      var 계좌 = 자사 && 자사.입금계좌 ? String(자사.입금계좌).trim() : '';
      var 줄들 = 작업.map(function (w) { return { 유통명: w.원본.유통명, 규격: w.원본.규격, 수량: w.수량, 단가: w.단가 }; });
      location.href = 'sms:' + g.전화 + '?body=' + encodeURIComponent(문자내용(줄들, g.받는곳, g.출고일, 계좌));
    });
    속.appendChild(만들기('div', { class: 'row', style: 'justify-content:flex-end; gap:var(--space-sm); margin-top:var(--space-sm)' }, [문자단추, 저장단추]));
    몸.appendChild(속);

    /* 🔴 position:relative 가 없으면 절대배치된 쓸단추가 카드보다 위로 떠 늘 보인다 (04-공통UI 쓸기 참고) */
    var 카드 = 만들기('div', { class: 'ph-card alert quiet', style: 'padding:var(--space-md); position:relative' }, [머리, 몸]);
    var 삭제 = u.쓸기단추('삭제', 'del', function () { 거래삭제(g, 다시그리는것); });
    var 줄 = 만들기('div', { class: '쓸줄' }, [만들기('div', { class: '쓸단추' }, [삭제]), 카드]);
    u.쓸기붙이기(카드, 76);
    return 줄;
  }

  function 검색칸() {
    var e = u.손대야열림(만들기('input', { class: 'inp', type: 'search', placeholder: '🔍  유통명 · 학명 · 품목코드로 찾기' }));
    u.조합안전입력(e, function (값) { 상태.검색 = 값; 결과다시(); }, 150);
    참조.검색 = e;
    return e;
  }

  function 받는곳칸() {
    var 감쌈 = 만들기('div', { class: 'acwrap' });
    var e = 만들기('input', { class: 'inp', type: 'text', placeholder: '거래처명 · 받는 분', value: 상태.받는곳 });
    e.addEventListener('input', function () { 상태.받는곳 = e.value; });
    감쌈.appendChild(e);
    u.업체자동완성({
      입력: e, 담을곳: 감쌈, 앞구분: '판매처',
      고름: function (c) {
        상태.받는곳 = c.이름; e.value = c.이름;
        if (c.전화) { 상태.전화 = c.전화; if (참조.전화) 참조.전화.value = c.전화; }
      }
    });
    return 감쌈;
  }

  function 전화칸() {
    var e = 만들기('input', { class: 'inp', type: 'tel', inputmode: 'numeric', placeholder: '010-0000-0000 · 문자 보낼 번호', value: 상태.전화 });
    e.addEventListener('input', function () { 상태.전화 = e.value; });
    참조.전화 = e;
    return e;
  }

  function 메모칸() {
    var e = 만들기('input', { class: 'inp', type: 'text', placeholder: '메모 · 선택', value: 상태.메모 });
    e.addEventListener('input', function () { 상태.메모 = e.value; });
    참조.메모 = e;
    return e;
  }

  function 필드(라벨, 내용, 스타일) {
    return 만들기('div', { class: 'field', style: 스타일 || null }, [
      라벨 ? 만들기('label', { html: 라벨 }) : null, 내용
    ]);
  }

  function 이력단추() {
    var b = 만들기('button', { class: 'btn sm', type: 'button', text: '📋 출고이력' });
    b.addEventListener('click', function () {
      상태.이력일자 = u.오늘문자(); 상태.이력달 = 상태.이력일자.slice(0, 7);
      상태.이력검색 = ''; 상태.이력쪽 = 1;
      상태.보기 = '이력';
      ZG.앱.다시그리기();
    });
    return b;
  }

  function PC배치(뿌리) {
    참조.결과칸 = 만들기('div', { class: 'stack', style: 'margin-top:var(--space-sm)' });
    참조.담은칸 = 만들기('div', { class: 'stack', style: 'margin-top:var(--space-sm)' });
    참조.합계칸 = 만들기('div', { style: 'text-align:right; margin-top:var(--space-sm); font-size:var(--font-md)' });

    var 검색카드 = 만들기('div', { class: 'card' }, [
      만들기('h3', { html: '품목 검색<span class="right"></span>' }),
      만들기('div', { class: 'row' }, [필드(null, 검색칸(), 'flex:1')]),
      참조.결과칸
    ]);
    검색카드.querySelector('h3 .right').appendChild(이력단추());

    var 담은카드 = 만들기('div', { class: 'card' }, [
      만들기('h3', { text: '담은 품목' }),
      참조.담은칸,
      참조.합계칸,
      만들기('div', { class: 'row' }, [
        필드('받는 곳 <span class="auto">선택 · 문자를 보낼 때 씁니다</span>', 받는곳칸(), 'flex:1; min-width:200px'),
        필드('전화번호 <span class="auto">선택</span>', 전화칸(), 'width:200px'),
        필드('메모 <span class="auto">선택</span>', 메모칸(), 'flex:1; min-width:180px')
      ])
    ]);

    var 출고단추 = 만들기('button', { class: 'btn main wide', type: 'button', text: '출고' });
    출고단추.addEventListener('click', 출고처리);
    참조.출고단추 = 출고단추;
    담은카드.appendChild(만들기('div', { class: 'row bottom' }, [만들기('div', { class: 'spacer' }), 출고단추]));

    뿌리.appendChild(검색카드);
    뿌리.appendChild(담은카드);
  }

  function 폰배치(뿌리) {
    참조.결과칸 = 만들기('div', { class: 'ph-list', style: 'margin-top:var(--space-sm)' });
    참조.담은칸 = 만들기('div', { class: 'ph-list', style: 'margin-top:var(--space-sm)' });
    참조.합계칸 = 만들기('div', { style: 'text-align:right; margin-top:var(--space-sm)' });

    뿌리.appendChild(만들기('div', { class: 'row', style: 'justify-content:flex-end' }, [이력단추()]));
    뿌리.appendChild(필드(null, 검색칸()));
    뿌리.appendChild(참조.결과칸);

    뿌리.appendChild(만들기('div', { class: 'ph-sec', text: '담은 품목' }));
    뿌리.appendChild(참조.담은칸);
    뿌리.appendChild(참조.합계칸);

    뿌리.appendChild(필드('받는 곳 <span class="auto">선택</span>', 받는곳칸()));
    뿌리.appendChild(필드('전화번호 <span class="auto">선택 · 문자 보낼 번호</span>', 전화칸()));
    뿌리.appendChild(필드('메모 <span class="auto">선택</span>', 메모칸()));

    var 출고단추 = 만들기('button', { class: 'ph-save', type: 'button', text: '출고' });
    출고단추.addEventListener('click', 출고처리);
    참조.출고단추 = 출고단추;
    뿌리.appendChild(출고단추);
  }

  /* ══════════ 출고이력 ══════════ */
  /* 찾는 말이 있으면 날짜와 상관없이 전체에서 찾고, 없으면 고른 날 하루만 본다 */
  function 이력전체() {
    var 열쇠 = 상태.이력검색.trim().toLowerCase().replace(/\s/g, '');
    var 전체 = ZG.저장소.읽기(ZG.저장소.키.출고).sort(function (a, b) { return (b.등록일시 || 0) - (a.등록일시 || 0); });
    if (열쇠) {
      return 전체.filter(function (r) {
        var 밭 = (r.유통명 + (r.받는곳 || '') + r.품목코드).toLowerCase().replace(/\s/g, '');
        return 밭.indexOf(열쇠) >= 0;
      });
    }
    return 전체.filter(function (r) { return r.출고일 === 상태.이력일자; });
  }

  /* 그 달에 출고가 있던 날 — 달력 점 표시에 쓴다 */
  function 이력점표(달) {
    var 표 = {};
    ZG.저장소.읽기(ZG.저장소.키.출고).forEach(function (r) {
      if (String(r.출고일).slice(0, 7) === 달) 표[r.출고일] = true;
    });
    return 표;
  }

  function 날짜고르기(날짜) {
    상태.이력일자 = 날짜; 상태.이력달 = 날짜.slice(0, 7);
    상태.이력검색 = ''; 상태.이력쪽 = 1;
    if (참조.이력검색입력) 참조.이력검색입력.value = '';
    달력다시(); 이력다시();
  }

  function 달로(달) {
    상태.이력달 = 달;
    if (상태.이력일자.slice(0, 7) !== 달) 상태.이력일자 = 달 + '-01';
    달력다시(); 이력다시();
  }

  function 달력다시() {
    if (!참조.달력칸) return;
    u.비우기(참조.달력칸);
    달력그리기(참조.달력칸);
  }

  function 달력그리기(자리) {
    var 머리 = 만들기('div', { class: 'calhd' });
    var 앞 = 만들기('button', { type: 'button', text: '‹', 'aria-label': '지난 달' });
    앞.addEventListener('click', function () { 달로(달옮기기(상태.이력달, -1)); });
    var 뒤 = 만들기('button', { type: 'button', text: '›', 'aria-label': '다음 달' });
    뒤.addEventListener('click', function () { 달로(달옮기기(상태.이력달, 1)); });
    머리.appendChild(앞);
    머리.appendChild(만들기('div', { class: 'm', text: 달글(상태.이력달) }));
    머리.appendChild(뒤);
    자리.appendChild(머리);

    var 표 = 만들기('div', { class: 'cal' });
    요일.forEach(function (요, i) {
      표.appendChild(만들기('div', { class: 'wd' + (i === 0 ? ' sun' : ''), text: 요 }));
    });

    var 해 = Number(상태.이력달.slice(0, 4)), 월 = Number(상태.이력달.slice(5, 7));
    var 첫날 = new Date(해, 월 - 1, 1);
    var 날수 = new Date(해, 월, 0).getDate();
    var 점표 = 이력점표(상태.이력달);
    var 오늘 = u.오늘문자();

    for (var b = 0; b < 첫날.getDay(); b++) 표.appendChild(만들기('div', { class: 'd off' }));
    for (var n = 1; n <= 날수; n++) {
      (function (일) {
        var 날짜 = 상태.이력달 + '-' + 두자리(일);
        var 요일수 = new Date(해, 월 - 1, 일).getDay();
        var 칸 = 만들기('button', {
          type: 'button',
          class: 'd' + (요일수 === 0 ? ' sun' : '') + (날짜 === 상태.이력일자 ? ' on' : '') + (날짜 === 오늘 ? ' today' : ''),
          text: String(일)
        });
        if (점표[날짜]) {
          var 점 = 만들기('span', { class: 'dots' });
          점.appendChild(만들기('i'));
          칸.appendChild(점);
        }
        칸.addEventListener('click', function () { 날짜고르기(날짜); });
        표.appendChild(칸);
      })(n);
    }
    자리.appendChild(표);
  }

  /* .doc 이 하던 방식(11b 인쇄)을 그대로 빌린다 — 인쇄 동안만 body 직계로 옮기고, 클래스로 나머지를 끈다.
     거래(묶음)마다 소제목을 하나씩 세워 명세서 여러 장을 이어 붙인 모양으로 찍는다. */
  function 이력인쇄(묶음들) {
    var 모두 = [];
    묶음들.forEach(function (g) { 모두 = 모두.concat(g.항목); });
    if (!모두.length) { u.토스트('인쇄할 출고 이력이 없습니다'); return; }
    var 자사 = ZG.업체자료 ? ZG.업체자료.자사() : null;
    var 총 = 모두.reduce(function (a, r) { return a + (r.금액 || r.수량 * (r.단가 || 0)); }, 0);

    var 표속 = 묶음들.map(function (g) {
      var 줄들 = g.항목.map(function (r) {
        return '<tr><td>' + u.안전(r.출고일) + '</td><td>' + u.안전(r.유통명) + ' ' + u.안전(r.규격 || '') + '</td>' +
          '<td class="r">' + u.콤마(r.수량) + '</td><td class="r">' + u.콤마(r.단가 || 0) + '</td>' +
          '<td class="r">' + u.콤마(r.금액 || (r.수량 * (r.단가 || 0))) + '</td></tr>';
      }).join('');
      return '<tr class="dgrp"><td colspan="5">' + u.안전(g.받는곳 || '받는 곳 없음') +
        '<span class="r">' + u.콤마(g.총수량) + '주 · ' + u.콤마(g.총금액) + '원</span></td></tr>' + 줄들;
    }).join('');

    var 문서 = 만들기('div', { class: 'doc출고' });
    document.title = '출고 명세서_' + u.오늘문자();
    document.body.classList.add('출고인쇄중');
    document.body.appendChild(문서);
    문서.innerHTML =
      '<h2>출고 명세서</h2>' +
      '<div class="dmeta">' + u.안전(자사 && 자사.이름 || '정원사의 널서리') +
      (자사 && 자사.전화 ? ' · ' + u.안전(자사.전화) : '') +
      '<span class="r">인쇄일 ' + u.안전(u.오늘문자()) + '</span></div>' +
      '<table><thead><tr><th>출고일</th><th>품목</th><th class="r">수량</th><th class="r">단가</th><th class="r">금액</th></tr></thead>' +
      '<tbody>' + 표속 + '</tbody>' +
      '<tfoot><tr><td colspan="4" class="r">합계</td><td class="r"><b>' + u.콤마(총) + '원</b></td></tr></tfoot></table>' +
      (자사 && 자사.입금계좌 ? '<div class="dacct">입금계좌 · ' + u.안전(자사.입금계좌) + '</div>' : '');

    function 되돌리기() {
      window.removeEventListener('afterprint', 되돌리기);
      document.body.classList.remove('출고인쇄중');
      if (문서.parentNode) 문서.parentNode.removeChild(문서);
    }
    window.addEventListener('afterprint', 되돌리기);
    setTimeout(function () { window.print(); setTimeout(되돌리기, 1500); }, 50);
  }

  function 이력다시() {
    if (!참조.이력칸) return 이력화면(참조.뿌리);
    var 묶음들 = 묶음짓기(이력전체());
    u.비우기(참조.이력칸);
    if (!묶음들.length) {
      참조.이력칸.appendChild(만들기('div', { style: 'padding:var(--space-sm) 0; color:var(--color-text-muted)', text: '출고 이력이 없습니다' }));
      return;
    }
    var 목록 = 만들기('div', { class: 'stack' });
    묶음들.slice(0, 상태.이력쪽 * 이력쪽크기).forEach(function (g) { 목록.appendChild(묶음카드(g, false, 이력다시)); });
    참조.이력칸.appendChild(목록);
    if (묶음들.length > 상태.이력쪽 * 이력쪽크기) {
      var 더 = 만들기('button', { class: 'btn', type: 'button', text: '더 보기' });
      더.addEventListener('click', function () { 상태.이력쪽 += 1; 이력다시(); });
      참조.이력칸.appendChild(더);
    }
  }

  function 이력검색칸() {
    var e = u.손대야열림(만들기('input', { class: 'inp', type: 'search', placeholder: '🔍  유통명 · 받는 곳으로 찾기 (모든 날짜)' }));
    u.조합안전입력(e, function (값) { 상태.이력검색 = 값; 상태.이력쪽 = 1; 이력다시(); }, 150);
    참조.이력검색입력 = e;
    return e;
  }

  function 이력화면(뿌리) {
    if (!상태.이력일자) { 상태.이력일자 = u.오늘문자(); 상태.이력달 = 상태.이력일자.slice(0, 7); }
    u.비우기(뿌리);
    var 뒤로 = 만들기('button', { class: 'btn sm', type: 'button', text: '‹ 출고 등록' });
    뒤로.addEventListener('click', function () { 상태.보기 = '등록'; ZG.앱.다시그리기(); });

    var 머리줄 = 만들기('div', { class: 'row', style: 'align-items:center; gap:var(--space-md); flex-wrap:wrap' }, [
      뒤로, 만들기('div', { style: 'flex:1' }, [이력검색칸()])
    ]);
    if (!u.폰인가()) {
      var 출력 = 만들기('button', { class: 'btn sm', type: 'button', text: '🖨 출력' });
      출력.addEventListener('click', function () { 이력인쇄(묶음짓기(이력전체())); });
      머리줄.appendChild(출력);
    }

    참조.달력칸 = 만들기('div');
    달력그리기(참조.달력칸);

    참조.이력칸 = 만들기('div', { style: 'margin-top:var(--space-md)' });
    var 카드 = 만들기('div', { class: 'card' }, [
      만들기('h3', { text: '출고 이력' }),
      참조.달력칸, 머리줄, 참조.이력칸
    ]);
    뿌리.appendChild(카드);
    이력다시();
  }

  function 그리기(뿌리) {
    참조.뿌리 = 뿌리;
    if (!상태.출고일) 상태.출고일 = u.오늘문자();
    u.비우기(뿌리);
    if (상태.보기 === '이력') { 이력화면(뿌리); return; }
    if (u.폰인가()) 폰배치(뿌리); else PC배치(뿌리);
    결과다시(); 담은칸다시();
  }

  function 요약() {
    if (상태.보기 === '이력') return { 제목: '출고 이력', 뒤로: null, 왼: '', 오: '' };
    var 것들 = 오늘내역();
    var 총 = 것들.reduce(function (a, r) { return a + (Number(r.수량) || 0); }, 0);
    return { 왼: 상태.출고일, 오: '오늘 <b>' + 것들.length + '</b>건 · <b>' + u.콤마(총) + '</b>주 나감' };
  }

  /* 다른 탭으로 나가면 이력을 보고 있었어도 다음에 올 땐 등록 화면부터 (07-앱이 탭을 바꿀 때 부른다) */
  function 나가기() { 상태.보기 = '등록'; }

  ZG.출고 = { 그리기: 그리기, 요약: 요약, 나가기: 나가기 };
})(window.ZG);
