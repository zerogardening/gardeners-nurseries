/* 05d-입고내역 — 최근 입고 목록 (PC 표 · 폰 카드). 설계 §4-1 · §16-1
   각 줄에 수정 · 삭제가 붙는다. 실제 고치고 지우는 일은 05e 가 한다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 내 = ZG.입고내부, 상태 = 내.상태, 참조 = 내.참조;

  var 기간들 = ['오늘', '이번 달', '지난 달', '최근 3개월', '올해', '전체'];

  function 기간범위(이름) {
    var 이제 = new Date(), 년 = 이제.getFullYear(), 월 = 이제.getMonth();
    var ㄴ = ZG.계산.날짜문자;
    if (이름 === '오늘') return [u.오늘문자(), u.오늘문자()];
    if (이름 === '이번 달') return [ㄴ(new Date(년, 월, 1)), ㄴ(new Date(년, 월 + 1, 0))];
    if (이름 === '지난 달') return [ㄴ(new Date(년, 월 - 1, 1)), ㄴ(new Date(년, 월, 0))];
    if (이름 === '최근 3개월') return [ㄴ(new Date(년, 월 - 2, 1)), ㄴ(new Date(년, 월 + 1, 0))];
    if (이름 === '올해') return [년 + '-01-01', 년 + '-12-31'];
    return ['0000-00-00', '9999-99-99'];
  }

  function 걸러진입고() {
    var 목록 = ZG.저장소.읽기(ZG.저장소.키.입고);
    var 범위 = 상태.직접범위 || 기간범위(상태.기간);
    var 열쇠 = (상태.검색 || '').toLowerCase().replace(/\s/g, '');
    return 목록.filter(function (r) {
      if (r.입고일 < 범위[0] || r.입고일 > 범위[1]) return false;
      if (상태.업체거르기 && r.입고업체 !== 상태.업체거르기) return false;
      if (열쇠) {
        var 밭 = (r.유통명 + r.학명 + r.품목코드 + r.입고업체 + (r.메모 || '')).toLowerCase().replace(/\s/g, '');
        if (밭.indexOf(열쇠) < 0) return false;
      }
      return true;
    }).sort(function (a, b) { return b.등록일시 - a.등록일시; });
  }

  function 기간칩들(다시) {
    var 목록 = ZG.저장소.읽기(ZG.저장소.키.입고);
    var 상자 = 만들기('div', { class: 'fchips' });
    기간들.forEach(function (이름) {
      var 범위 = 기간범위(이름);
      var 수 = 목록.filter(function (r) { return r.입고일 >= 범위[0] && r.입고일 <= 범위[1]; }).length;
      var b = 만들기('button', {
        class: 'fchip' + (상태.기간 === 이름 && !상태.직접범위 ? ' on' : ''),
        type: 'button',
        html: u.안전(이름) + (이름 === '전체' ? '' : ' <span class="n">' + 수 + '</span>')
      });
      b.addEventListener('click', function () { 상태.기간 = 이름; 상태.직접범위 = null; 다시(); });
      상자.appendChild(b);
    });
    return 상자;
  }

  /* ── 줄마다 붙는 수정 · 삭제 ── */
  function 단추들(기록, 줄) {
    var 상자 = 만들기('div', { class: 'rowacts' });
    var 고침 = 만들기('button', { class: 'btn sm', type: 'button', text: '수정' });
    고침.addEventListener('click', function () { ZG.입고수정.열기(기록.id, 고침, 줄); });
    var 지움 = 만들기('button', { class: 'btn sm', type: 'button', text: '삭제' });
    지움.addEventListener('click', function () { ZG.입고수정.지우기묻기(기록); });
    상자.appendChild(고침); 상자.appendChild(지움);
    return 상자;
  }

  /* ── PC 표 ── */
  function 내역표() {
    var 목록 = 걸러진입고();
    var 표 = 만들기('table', { class: '입고내역' });
    표.innerHTML =
      '<colgroup><col style="width:64px"><col style="width:98px"><col>' +
      '<col style="width:94px"><col style="width:50px"><col style="width:62px"><col style="width:76px">' +
      '<col style="width:86px"><col style="width:44px"><col style="width:100px"></colgroup>' +
      '<thead><tr><th>입고일</th><th>품목코드</th><th>유통명 · 학명</th><th>규격</th>' +
      '<th class="r">수량</th><th class="r">단가</th><th class="r">금액</th><th>입고업체</th><th>구분</th>' +
      '<th></th></tr></thead>';

    var 몸 = 만들기('tbody');
    var 수량합 = 0, 금액합 = 0;
    목록.forEach(function (r) {
      var 금액 = (Number(r.수량) || 0) * (Number(r.매입단가) || 0);
      수량합 += Number(r.수량) || 0; 금액합 += 금액;
      var 줄 = 만들기('tr');
      줄.innerHTML =
        '<td class="dim">' + u.안전(String(r.입고일).slice(5)) + '</td>' +
        '<td class="code">' + u.안전(r.품목코드) + '</td>' +
        '<td>' + u.안전(r.유통명) + '<div class="sci">' + u.안전(r.학명) + '</div>' +
        (r.메모 ? '<div class="memo">📝 ' + u.안전(r.메모) + '</div>' : '') + '</td>' +
        '<td class="dim">' + u.안전(r.규격) + '</td>' +
        '<td class="r">' + u.콤마(r.수량) + '</td>' +
        '<td class="r">' + u.콤마(r.매입단가) + '</td>' +
        '<td class="r">' + u.콤마(금액) + '</td>' +
        '<td class="dim">' + u.안전(r.입고업체) + '</td>' +
        '<td class="dim">' + u.안전(r.과세구분) + '</td><td></td>';
      줄.lastChild.appendChild(단추들(r, 줄));
      if (r.id === 상태.방금저장) 줄.classList.add('번쩍');
      몸.appendChild(줄);
    });

    if (!목록.length) {
      몸.innerHTML = '<tr><td colspan="10" class="dim" style="text-align:center; padding:var(--space-4xl) 0">' +
        '이 조건에 맞는 입고가 없습니다</td></tr>';
    } else {
      var 합 = 만들기('tr', { class: 'totrow' });
      합.innerHTML = '<td>합계</td><td></td><td>' + 목록.length + '건</td><td></td>' +
        '<td class="r">' + u.콤마(수량합) + '</td><td></td><td class="r">' + u.콤마(금액합) +
        '</td><td></td><td></td><td></td>';
      몸.appendChild(합);
    }
    표.appendChild(몸);
    u.목록등장(몸.querySelectorAll('tr'));
    상태.방금저장 = null;

    var 쪽 = 만들기('div', { class: 'pager', html: '<span class="gap">' + 목록.length + '건 중 1~' + 목록.length + '</span><b>1</b>' });
    return 만들기('div', {}, [만들기('div', { class: 'tablewrap' }, [표]), 쪽]);
  }

  function 검색줄(다시) {
    var 업체 = ZG.저장소.읽기(ZG.저장소.키.업체);
    var 찾기 = u.손대야열림(만들기('input', { class: 'inp', type: 'search', placeholder: '🔍  유통명 · 학명 · 품목코드 · 업체' }));
    찾기.value = 상태.검색 || '';
    // 내역다시() 는 참조.내역칸만 갈아끼우므로 이 입력칸은 살아남는다 — 조합만 지켜주면 된다
    u.조합안전입력(찾기, function (값) {
      if (값 === 상태.검색) return;
      상태.검색 = 값; 내역다시();
    }, 180);

    var 고르기 = 만들기('select', { class: 'inp' });
    고르기.innerHTML = '<option value="">전체 업체</option>' +
      업체.map(function (c) { return '<option>' + u.안전(c.이름) + '</option>'; }).join('');
    고르기.value = 상태.업체거르기 || '';
    고르기.addEventListener('change', function () { 상태.업체거르기 = 고르기.value; 내역다시(); });

    var 범위 = 상태.직접범위 || 기간범위(상태.기간);
    var 시작 = 만들기('input', { class: 'inp', type: 'date', value: 범위[0] === '0000-00-00' ? '' : 범위[0] });
    var 끝 = 만들기('input', { class: 'inp', type: 'date', value: 범위[1] === '9999-99-99' ? '' : 범위[1] });

    var 조회 = 만들기('button', { class: 'btn main', type: 'button', text: '조회' });
    조회.addEventListener('click', function () {
      if (시작.value && 끝.value) { 상태.직접범위 = [시작.value, 끝.value]; 다시(); }
    });
    var 초기화 = 만들기('button', { class: 'btn', type: 'button', text: '조건 초기화' });
    초기화.addEventListener('click', function () {
      상태.검색 = ''; 상태.업체거르기 = ''; 상태.직접범위 = null; 상태.기간 = '오늘'; 다시();
    });

    return 만들기('div', { class: 'qbar' }, [
      내.필드('찾기 <span class="auto">유통명 · 학명 · 품목코드 · 업체를 한 칸에서</span>', 찾기, 'flex:1; min-width:250px'),
      내.필드('입고업체', 고르기, 'width:168px'),
      내.필드('시작일', 시작, 'width:150px'),
      만들기('div', { class: 'dash', text: '~' }),
      내.필드('종료일', 끝, 'width:150px'),
      조회, 초기화
    ]);
  }

  /* ── 폰 카드 ── */
  function 폰내역() {
    var 목록 = 걸러진입고();
    var 수량합 = 목록.reduce(function (a, r) { return a + (Number(r.수량) || 0); }, 0);
    var 금액합 = 목록.reduce(function (a, r) { return a + (Number(r.수량) || 0) * (Number(r.매입단가) || 0); }, 0);

    var 목 = 만들기('div', { class: 'ph-list' });
    목록.slice(0, 상태.폰보임 || 10).forEach(function (r) {
      var 칸 = 만들기('div', { class: 'ph-card' });
      칸.innerHTML =
        '<div class="r1"><div class="nm">' + u.안전(r.유통명) + '</div><div class="cd">' + u.안전(r.품목코드) + '</div></div>' +
        '<div class="sci">' + u.안전(r.학명) + '</div>' +
        '<div class="r2">' + u.안전(r.규격) + ' · <b>' + u.콤마(r.수량) + '</b>주 · ' + u.콤마(r.매입단가) + '원' +
        '<span class="amt">' + u.콤마((Number(r.수량) || 0) * (Number(r.매입단가) || 0)) + '</span></div>' +
        (r.메모 ? '<div class="memo">📝 ' + u.안전(r.메모) + '</div>' : '');
      칸.appendChild(단추들(r, 칸));
      목.appendChild(칸);
    });
    if (!목록.length) 목.appendChild(만들기('div', { class: 'ph-card', text: '이 기간에 넣은 것이 없습니다' }));
    u.목록등장(목.children);

    var 조각 = [
      만들기('div', { class: 'ph-sec', html: '넣은 것 <span class="r">' + 목록.length + '건 · ' + u.콤마(수량합) + '주 · ' + u.콤마(금액합) + '원</span>' }),
      목
    ];
    if (목록.length > (상태.폰보임 || 10)) {
      var 더 = 만들기('button', { class: 'btn', type: 'button', text: '더 보기' });
      더.addEventListener('click', function () { 상태.폰보임 = (상태.폰보임 || 10) + 10; 내역다시(); });
      조각.push(더);
    }
    조각.push(기간칩들(내역다시));
    조각[조각.length - 1].style.justifyContent = 'center';
    return 만들기('div', { class: 'stack' }, 조각);
  }

  function 내역다시() {
    if (!참조.내역칸) return;
    u.비우기(참조.내역칸);
    참조.내역칸.appendChild(u.폰인가() ? 폰내역() : 내역표());
  }

  /* PC 쪽 카드 통째 */
  function 내역카드() {
    var 다시 = function () { ZG.입고.그리기(참조.뿌리); };
    var 내역 = 만들기('div', { class: 'card table-card' });
    내역.appendChild(만들기('h3', {
      style: 'padding:0 var(--space-sm)',
      html: '입고 내역' +
        '<span class="right" style="display:flex; gap:var(--space-sm)">' +
        '<button class="btn sm" aria-disabled="true">⬇ 엑셀 내려받기</button>' +
        '<button class="btn sm" aria-disabled="true">인쇄</button></span>'
    }));
    var 조건 = 만들기('div', { style: 'padding:0 var(--space-sm) var(--space-xl); display:flex; flex-direction:column; gap:var(--space-lg)' });
    조건.appendChild(기간칩들(다시));
    조건.appendChild(검색줄(다시));
    내역.appendChild(조건);
    참조.내역칸 = 만들기('div');
    내역.appendChild(참조.내역칸);
    내역다시();
    참조.감쌈 = 만들기('div', { class: 'editwrap' }, [내역]);   // 수정 시트가 여기 들어온다
    return 참조.감쌈;
  }

  ZG.입고내역 = { 내역카드: 내역카드, 내역다시: 내역다시, 걸러진입고: 걸러진입고, 기간범위: 기간범위 };
})(window.ZG);
