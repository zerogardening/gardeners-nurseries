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
    이력검색: '', 이력쪽: 1
  };
  var 참조 = {};

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
      (받는곳 ? 받는곳 + ' 님 출고 안내 📦' : '출고 안내 📦') + '\n\n' +
      줄들.map(function (r) {
        var 단가 = Number(r.단가) || 0;
        return '· ' + r.유통명 + (r.규격 ? ' ' + r.규격 : '') + '\n' +
          u.콤마(r.수량) + '주X' + u.콤마(단가) + '원 = ' + u.콤마(r.수량 * 단가) + '원';
      }).join('\n\n') +
      '\n\n합계 💰 ' + u.콤마(총) + '원';
    if (계좌) 본문 += '\n\n🏦 입금계좌\n' + 계좌;
    본문 += '\n\n🙏 감사합니다.';
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
      제목: '출고를 처리할까요?',
      본문: 본문,
      확인글: (u.폰인가() && 상태.전화.trim()) ? '출고 처리 · 문자 보내기' : '출고 처리',
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
    u.토스트('출고 처리했습니다 — ' + u.콤마(총) + '주');

    상태.담은것 = []; 상태.검색 = ''; 상태.메모 = '';
    if (참조.메모) 참조.메모.value = '';
    담은칸다시(); 내역다시();
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
    if (!상태.담은것.length) {
      참조.담은칸.appendChild(만들기('div', { style: 'padding:var(--space-sm) 0; color:var(--color-text-muted)', text: '검색해서 담은 품목이 여기 쌓입니다' }));
    } else {
      상태.담은것.forEach(function (r) { 참조.담은칸.appendChild(담은줄(r)); });
    }
    합계다시();
    if (참조.출고단추) 참조.출고단추.disabled = !상태.담은것.length;
  }

  function 항목줄(r, 다시그리는것) {
    var 줄 = 만들기('div', { class: 'row', style: 'align-items:center; gap:var(--space-sm); padding:var(--space-2xs) 0' });
    줄.appendChild(만들기('div', { style: 'flex:1', html: u.안전(r.유통명) + ' ' + u.안전(r.규격 || '') +
      ' <span class="dim">' + u.콤마(r.수량) + '주 X ' + u.콤마(r.단가 || 0) + '원 = ' + u.콤마(r.금액 || r.수량 * (r.단가 || 0)) + '원</span>' }));
    var 수정 = 만들기('button', { class: 'btn sm', type: 'button', text: '수정' });
    수정.addEventListener('click', function () { 수정열기(r, 다시그리는것); });
    var 삭제단추 = 만들기('button', { class: 'btn sm warn', type: 'button', text: '삭제' });
    삭제단추.addEventListener('click', function () { 삭제(r.id, 다시그리는것); });
    줄.appendChild(수정); 줄.appendChild(삭제단추);
    return 줄;
  }

  function 묶음카드(g, 펼침기본, 다시그리는것) {
    var 펼침 = 펼침기본;
    var 머리 = 만들기('button', { class: 'fold', type: 'button', style: 'width:100%' });
    var 몸 = 만들기('div', { class: 'foldbody' + (펼침 ? ' open' : '') });
    function 머리글() {
      머리.innerHTML = (펼침 ? '－' : '＋') + ' ' + u.안전(g.받는곳 || '받는 곳 없음') +
        ' <span class="n">' + g.항목.length + '종 · ' + u.콤마(g.총수량) + '주 · ' + u.콤마(g.총금액) + '원</span>';
    }
    머리글();
    머리.addEventListener('click', function () {
      펼침 = 몸.classList.toggle('open');
      머리글();
    });

    var 속 = 만들기('div', { style: 'padding:var(--space-sm) 0' });
    g.항목.forEach(function (r) { 속.appendChild(항목줄(r, 다시그리는것)); });
    var 받는곳수정 = 만들기('button', { class: 'btn sm', type: 'button', text: '받는 곳 고치기' });
    받는곳수정.addEventListener('click', function () { 거래수정(g, 다시그리는것); });
    var 취소단추 = 만들기('button', { class: 'btn sm warn', type: 'button', text: '이 출고 전체 취소' });
    취소단추.addEventListener('click', function () { 거래삭제(g, 다시그리는것); });
    속.appendChild(만들기('div', { class: 'row', style: 'justify-content:flex-end; gap:var(--space-sm); margin-top:var(--space-xs)' }, [받는곳수정, 취소단추]));
    몸.appendChild(속);

    return 만들기('div', { class: 'ph-card alert quiet', style: 'padding:var(--space-md)' }, [머리, 몸]);
  }

  function 내역다시() {
    if (!참조.내역칸) return;
    u.비우기(참조.내역칸);
    var 묶음들 = 묶음짓기(오늘내역());
    if (!묶음들.length) {
      참조.내역칸.appendChild(만들기('div', { style: 'padding:var(--space-sm) 0; color:var(--color-text-muted)', text: '오늘 처리한 출고가 없습니다' }));
      return;
    }
    묶음들.forEach(function (g) { 참조.내역칸.appendChild(묶음카드(g, true, 내역다시)); });
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
    b.addEventListener('click', function () { 상태.보기 = '이력'; 상태.이력쪽 = 1; ZG.앱.다시그리기(); });
    return b;
  }

  function PC배치(뿌리) {
    참조.결과칸 = 만들기('div', { class: 'stack', style: 'margin-top:var(--space-sm)' });
    참조.담은칸 = 만들기('div', { class: 'stack', style: 'margin-top:var(--space-sm)' });
    참조.내역칸 = 만들기('div', { class: 'stack', style: 'margin-top:var(--space-sm)' });
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

    var 출고단추 = 만들기('button', { class: 'btn main wide', type: 'button', text: '출고 처리' });
    출고단추.addEventListener('click', 출고처리);
    참조.출고단추 = 출고단추;
    담은카드.appendChild(만들기('div', { class: 'row bottom' }, [만들기('div', { class: 'spacer' }), 출고단추]));

    var 내역카드 = 만들기('div', { class: 'card' }, [
      만들기('h3', { text: '오늘 출고 내역' }),
      참조.내역칸
    ]);

    뿌리.appendChild(검색카드);
    뿌리.appendChild(담은카드);
    뿌리.appendChild(내역카드);
  }

  function 폰배치(뿌리) {
    참조.결과칸 = 만들기('div', { class: 'ph-list', style: 'margin-top:var(--space-sm)' });
    참조.담은칸 = 만들기('div', { class: 'ph-list', style: 'margin-top:var(--space-sm)' });
    참조.내역칸 = 만들기('div', { class: 'ph-list', style: 'margin-top:var(--space-sm)' });
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

    var 출고단추 = 만들기('button', { class: 'ph-save', type: 'button', text: '출고 처리' });
    출고단추.addEventListener('click', 출고처리);
    참조.출고단추 = 출고단추;
    뿌리.appendChild(출고단추);

    뿌리.appendChild(만들기('div', { class: 'ph-sec', text: '오늘 출고 내역' }));
    뿌리.appendChild(참조.내역칸);
  }

  /* ══════════ 출고이력 ══════════ */
  function 이력전체() {
    var 열쇠 = 상태.이력검색.trim().toLowerCase().replace(/\s/g, '');
    var 것들 = ZG.저장소.읽기(ZG.저장소.키.출고).sort(function (a, b) { return (b.등록일시 || 0) - (a.등록일시 || 0); });
    if (!열쇠) return 것들;
    return 것들.filter(function (r) {
      var 밭 = (r.유통명 + (r.받는곳 || '') + r.품목코드).toLowerCase().replace(/\s/g, '');
      return 밭.indexOf(열쇠) >= 0;
    });
  }

  /* 품목 한 줄 고치기 — 수량 · 단가 · 메모만. 받는 곳 · 전화는 거래 전체 몫이라 거래수정()이 따로 맡는다 */
  function 수정열기(r, 다시그리는것) {
    다시그리는것 = 다시그리는것 || 이력다시;
    var 값 = { 수량: r.수량, 단가: r.단가 || 0, 메모: r.메모 || '' };

    function 수칸(이름, 옵션) {
      var e = 만들기('input', Object.assign({ class: 'inp num', type: 'text', inputmode: 'numeric' }, 옵션 || {}));
      e.value = u.콤마(값[이름]);
      e.addEventListener('input', function () { 값[이름] = u.숫자(e.value); });
      e.addEventListener('blur', function () { e.value = u.콤마(값[이름]); });
      return e;
    }
    function 글칸(이름, 옵션) {
      var e = 만들기('input', Object.assign({ class: 'inp', type: 'text' }, 옵션 || {}));
      e.value = 값[이름];
      e.addEventListener('input', function () { 값[이름] = e.value; });
      return e;
    }
    function 필드2(라벨, 내용) { return 만들기('div', { class: 'field' }, [만들기('label', { html: 라벨 }), 내용]); }

    var 패널 = 만들기('div', { class: 'editpanel', role: 'dialog', 'aria-modal': 'true', 'aria-label': '출고 품목 수정' }, [
      만들기('h3', { text: '출고 품목 수정' }),
      만들기('div', { class: 'sub', html: u.안전(r.유통명) + ' · ' + u.안전(r.규격 || '') + ' · ' + u.안전(r.출고일) }),
      만들기('div', { class: 'pair' }, [필드2('수량', 수칸('수량')), 필드2('단가', 수칸('단가'))]),
      필드2('메모', 글칸('메모'))
    ]);
    var 스크림 = 만들기('div', { class: 'editscrim' });
    function 닫기() {
      document.removeEventListener('keydown', 탈출);
      if (패널.parentNode) 패널.parentNode.removeChild(패널);
      if (스크림.parentNode) 스크림.parentNode.removeChild(스크림);
      document.body.style.overflow = '';
    }
    function 탈출(e) { if (e.key === 'Escape') 닫기(); }
    스크림.addEventListener('click', 닫기);

    var 취소 = 만들기('button', { class: 'btn', type: 'button', text: '취소' });
    취소.addEventListener('click', 닫기);
    var 저장 = 만들기('button', { class: 'btn main', type: 'button', text: '저장' });
    저장.addEventListener('click', function () {
      var 수량 = Math.max(1, Math.floor(값.수량) || 1);
      var 단가 = Math.max(0, 값.단가 || 0);
      ZG.저장소.바꾸기(ZG.저장소.키.출고, r.id, {
        수량: 수량, 단가: 단가, 금액: 수량 * 단가,
        메모: String(값.메모).trim(), 수정일시: Date.now()
      });
      u.토스트('고쳤습니다');
      닫기();
      다시그리는것();
      ZG.앱 && ZG.앱.요약다시();
    });
    패널.appendChild(만들기('div', { class: 'btnrow' }, [취소, 저장]));

    document.body.appendChild(스크림);
    document.body.appendChild(패널);
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', 탈출);
  }

  /* 받는 곳 · 전화는 거래(묶음) 전체가 같은 값을 쓴다 — 고치면 그 거래의 모든 줄에 반영한다 */
  function 거래수정(g, 다시그리는것) {
    u.물음({ 제목: '받는 곳을 고칠까요?', 이름: '받는 곳', 값: g.받는곳, 자리표시: '거래처명 · 받는 분' }, function (이름) {
      if (이름 == null) return;
      u.물음({ 제목: '전화번호를 고칠까요?', 이름: '전화번호', 값: g.전화, 자리표시: '010-0000-0000' }, function (전화) {
        if (전화 == null) return;
        g.항목.forEach(function (r) {
          ZG.저장소.바꾸기(ZG.저장소.키.출고, r.id, {
            받는곳: 이름.trim(), 전화: 전화.replace(/[^\d]/g, ''), 수정일시: Date.now()
          });
        });
        u.토스트('고쳤습니다');
        다시그리는것();
      });
    });
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
    var e = u.손대야열림(만들기('input', { class: 'inp', type: 'search', placeholder: '🔍  유통명 · 받는 곳으로 찾기' }));
    u.조합안전입력(e, function (값) { 상태.이력검색 = 값; 상태.이력쪽 = 1; 이력다시(); }, 150);
    return e;
  }

  function 이력화면(뿌리) {
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

    참조.이력칸 = 만들기('div', { style: 'margin-top:var(--space-md)' });
    var 카드 = 만들기('div', { class: 'card' }, [
      만들기('h3', { text: '출고 이력' }),
      머리줄, 참조.이력칸
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
    결과다시(); 담은칸다시(); 내역다시();
  }

  function 요약() {
    if (상태.보기 === '이력') return { 제목: '출고 이력', 뒤로: null, 왼: '', 오: '' };
    var 것들 = 오늘내역();
    var 총 = 것들.reduce(function (a, r) { return a + (Number(r.수량) || 0); }, 0);
    return { 왼: 상태.출고일, 오: '오늘 <b>' + 것들.length + '</b>건 · <b>' + u.콤마(총) + '</b>주 나감' };
  }

  ZG.출고 = { 그리기: 그리기, 요약: 요약 };
})(window.ZG);
