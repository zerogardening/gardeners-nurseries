/* 08-출고 — 출고 탭. 품목을 검색해 담고 수량을 정해 빼면서, 원하면 받는 분께 문자로 알린다.
   출고 기록(gn.v1.출고)은 03-계산 현재고() 가 이미 입고에서 빼고 있다 — 저장만 하면 재고에 곧바로 반영된다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;

  var 상태 = {
    검색: '', 담은것: [], 받는곳: '', 전화: '', 메모: '', 출고일: ''
  };
  var 참조 = {};

  /* ── 자료 ── */
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
      현재고: 현재고, 수량: 1
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

  function 수량고치기(코드, 값) {
    var 행 = 상태.담은것.filter(function (r) { return r.품목코드 === 코드; })[0];
    if (!행) return;
    var n = Math.max(1, Math.floor(u.숫자(값)) || 1);
    행.수량 = n;
    return n;
  }

  function 오늘내역() {
    return ZG.저장소.읽기(ZG.저장소.키.출고).filter(function (r) { return r.출고일 === 상태.출고일; })
      .sort(function (a, b) { return (b.등록일시 || 0) - (a.등록일시 || 0); });
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

  function 문자내용(줄들, 받는곳, 출고일) {
    var 총 = 줄들.reduce(function (a, r) { return a + r.수량; }, 0);
    return '[정원사의 널서리]' +
      (받는곳 ? ' ' + 받는곳 + ' 님 출고 안내' : ' 출고 안내') + '\n' +
      출고일 + '\n' +
      줄들.map(function (r) { return '· ' + r.유통명 + (r.규격 ? ' ' + r.규격 : '') + ' ' + u.콤마(r.수량) + '주'; }).join('\n') +
      '\n합계 ' + u.콤마(총) + '주\n감사합니다.';
  }

  function 출고처리() {
    if (!상태.담은것.length) { u.토스트('담은 품목이 없습니다'); return; }

    var 초과 = 상태.담은것.filter(function (r) { return r.수량 > r.현재고; });
    var 본문 = 상태.담은것.map(function (r) {
      return u.안전(r.유통명) + ' ' + u.안전(r.규격 || '') + ' <b>' + u.콤마(r.수량) + '</b>주' +
        (r.수량 > r.현재고 ? ' <span style="color:var(--color-danger)">— 현재고 ' + u.콤마(r.현재고) + '주보다 많습니다</span>' : '');
    }).join('<br>');
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
    var 담은것 = 상태.담은것.slice();

    담은것.forEach(function (r, i) {
      ZG.저장소.덧붙이기(키.출고, {
        id: 'oc_' + 이제.toString(36) + '_' + i.toString(36) + '_' + Math.random().toString(36).slice(2, 6),
        출고일: 상태.출고일, 품목코드: r.품목코드, 유통명: r.유통명, 학명: r.학명, 규격: r.규격,
        수량: r.수량, 받는곳: 받는곳, 전화: 전화, 메모: 상태.메모.trim(), 등록일시: 이제
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
      location.href = 'sms:' + 전화 + '?body=' + encodeURIComponent(문자내용(담은것, 받는곳, 상태.출고일));
    }
  }

  function 취소(id) {
    u.확인({
      제목: '이 출고를 취소할까요?', 본문: '지운 만큼 재고가 다시 늘어납니다.',
      확인글: '취소', 위험: true
    }, function (했다) {
      if (!했다) return;
      ZG.저장소.지우기(ZG.저장소.키.출고, id);
      u.토스트('취소했습니다');
      내역다시();
      ZG.앱 && ZG.앱.요약다시();
    });
  }

  /* ── 그리기 ── */
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

  function 담은줄(r, 폰) {
    var 칸 = 만들기('div', { class: 'ph-card' });
    var 수량칸;
    if (폰) {
      수량칸 = u.스테퍼(r.수량, function (n) { 수량고치기(r.품목코드, n); });
    } else {
      수량칸 = 만들기('input', { class: 'inp num sm', type: 'text', inputmode: 'numeric', value: String(r.수량), style: 'width:70px' });
      수량칸.addEventListener('input', function () { 수량고치기(r.품목코드, 수량칸.value); });
      수량칸.addEventListener('blur', function () { 수량칸.value = String(수량고치기(r.품목코드, 수량칸.value)); });
    }
    var 빼기단추 = 만들기('button', { class: 'btn sm', type: 'button', text: '빼기' });
    빼기단추.addEventListener('click', function () { 빼기(r.품목코드); });

    칸.innerHTML =
      '<div class="r1"><div class="nm">' + u.안전(r.유통명) + '</div><div class="cd">' + u.안전(r.품목코드) + '</div></div>' +
      '<div class="r2">' + u.안전(r.규격 || '') +
      '<span class="amt">현재고 <b' + (r.수량 > r.현재고 ? ' style="color:var(--color-danger)"' : '') + '>' + u.콤마(r.현재고) + '</b>주</span></div>';
    var 아래줄 = 만들기('div', { class: 'row', style: 'align-items:center; margin-top:var(--space-sm)' }, [수량칸, 만들기('div', { style: 'flex:1' }), 빼기단추]);
    칸.appendChild(아래줄);
    return 칸;
  }

  function 담은칸다시() {
    if (!참조.담은칸) return;
    u.비우기(참조.담은칸);
    if (!상태.담은것.length) {
      참조.담은칸.appendChild(만들기('div', { style: 'padding:var(--space-sm) 0; color:var(--color-text-muted)', text: '검색해서 담은 품목이 여기 쌓입니다' }));
    } else {
      var 폰 = u.폰인가();
      상태.담은것.forEach(function (r) { 참조.담은칸.appendChild(담은줄(r, 폰)); });
    }
    if (참조.출고단추) 참조.출고단추.disabled = !상태.담은것.length;
  }

  function 내역줄(r) {
    var 칸 = 만들기('div', { class: 'ph-card' });
    칸.innerHTML =
      '<div class="r1"><div class="nm">' + u.안전(r.유통명) + '</div><div class="cd">' + u.안전(r.품목코드) + '</div></div>' +
      '<div class="r2">' + u.안전(r.규격 || '') +
      '<span class="amt"><b>' + u.콤마(r.수량) + '</b>주' + (r.받는곳 ? ' · ' + u.안전(r.받는곳) : '') + '</span></div>';
    var 취소단추 = 만들기('button', { class: 'btn sm warn', type: 'button', text: '취소' });
    취소단추.addEventListener('click', function () { 취소(r.id); });
    칸.appendChild(만들기('div', { class: 'row', style: 'justify-content:flex-end; margin-top:var(--space-sm)' }, [취소단추]));
    return 칸;
  }

  function 내역다시() {
    if (!참조.내역칸) return;
    u.비우기(참조.내역칸);
    var 것들 = 오늘내역();
    if (!것들.length) {
      참조.내역칸.appendChild(만들기('div', { style: 'padding:var(--space-sm) 0; color:var(--color-text-muted)', text: '오늘 처리한 출고가 없습니다' }));
      return;
    }
    것들.forEach(function (r) { 참조.내역칸.appendChild(내역줄(r)); });
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

  function PC배치(뿌리) {
    참조.결과칸 = 만들기('div', { class: 'stack', style: 'margin-top:var(--space-sm)' });
    참조.담은칸 = 만들기('div', { class: 'stack', style: 'margin-top:var(--space-sm)' });
    참조.내역칸 = 만들기('div', { class: 'stack', style: 'margin-top:var(--space-sm)' });

    var 검색카드 = 만들기('div', { class: 'card' }, [
      만들기('h3', { text: '품목 검색' }),
      만들기('div', { class: 'row' }, [필드(null, 검색칸(), 'flex:1')]),
      참조.결과칸
    ]);

    var 담은카드 = 만들기('div', { class: 'card' }, [
      만들기('h3', { text: '담은 품목' }),
      참조.담은칸,
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

    뿌리.appendChild(필드(null, 검색칸()));
    뿌리.appendChild(참조.결과칸);

    뿌리.appendChild(만들기('div', { class: 'ph-sec', text: '담은 품목' }));
    뿌리.appendChild(참조.담은칸);

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

  function 그리기(뿌리) {
    참조.뿌리 = 뿌리;
    if (!상태.출고일) 상태.출고일 = u.오늘문자();
    u.비우기(뿌리);
    if (u.폰인가()) 폰배치(뿌리); else PC배치(뿌리);
    결과다시(); 담은칸다시(); 내역다시();
  }

  function 요약() {
    var 것들 = 오늘내역();
    var 총 = 것들.reduce(function (a, r) { return a + (Number(r.수량) || 0); }, 0);
    return { 왼: 상태.출고일, 오: '오늘 <b>' + 것들.length + '</b>건 · <b>' + u.콤마(총) + '</b>주 나감' };
  }

  ZG.출고 = { 그리기: 그리기, 요약: 요약 };
})(window.ZG);
