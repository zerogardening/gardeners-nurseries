/* 06b-재고배치 — 재고 탭의 PC · 폰 배치 (설계 §4-2) */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 목 = ZG.재고목록, 상태 = 목.상태, 참조 = 목.참조;

  function 다시() { 그리기(참조.뿌리); }

  /* 검색 · 쪽넘김 · 더보기는 목록칸만 갈아끼운다.
     화면을 통째로 다시 그리면 검색 입력칸 DOM 이 사라져 한글 조합이 끊긴다. */
  function 목록다시() {
    if (!참조.목록칸) return 다시();
    if (상태.필터 === '일자별') {          // 일자별은 품목이 아니라 입고 기록이다 — 제 목록을 다시 그린다
      u.비우기(참조.목록칸);
      참조.목록칸.appendChild(목.일자줄(다시));
      참조.목록칸.appendChild(일자목록(u.폰인가()));
      return;
    }
    var 걸러진 = 목.거르기(목.전부요약());
    u.비우기(참조.목록칸);
    (u.폰인가() ? 폰목록속(걸러진) : PC목록속(걸러진)).forEach(function (c) {
      if (c) 참조.목록칸.appendChild(c);
    });
    목.선택바갱신();   // 목록칸이 갈렸으니 체크 상태와 개수를 다시 맞춘다
  }

  function PC목록속(걸러진) {
    return [목.표그리기(걸러진), 목.쪽번호(걸러진, 목록다시)];
  }

  function 폰목록속(걸러진) {
    var 줄 = 만들기('div', { class: 'ph-sec 고름줄' });
    줄.appendChild(만들기('span', {
      html: (상태.선택모드 ? '작업할 품목을 고르세요' : '소진일 빠른 순') +
        ' <span class="r">' + 걸러진.length + '종</span>'
    }));
    // 목록칸만 갈면 위쪽 재입고 칸이 그대로 남는다 — 화면을 통째로 다시 그린다
    줄.appendChild(목.선택단추(다시));
    var 조각 = [줄];
    var 목록 = 만들기('div', { class: 'ph-list' });
    걸러진.slice(0, 상태.폰보임).forEach(function (요) { 목록.appendChild(목.폰카드(요, false)); });
    if (!걸러진.length) 목록.appendChild(만들기('div', { class: 'ph-card', text: '이 조건에 맞는 품목이 없습니다' }));
    조각.push(목록);
    u.목록등장(목록.children);

    if (걸러진.length > 상태.폰보임) {
      var 더 = 만들기('button', { class: 'btn', type: 'button', text: '더 보기' });
      더.addEventListener('click', function () { 상태.폰보임 += 15; 목록다시(); });
      조각.push(더);
    }
    if (상태.선택모드) 조각.push(목.폰작업막대());
    return 조각;
  }

  function PC배치(뿌리) {
    var 전부 = 목.전부요약();
    var 걸러진 = 목.거르기(전부);
    참조.목록칸 = null;

    var 급 = 목.급한카드들(전부, false);
    if (급) 뿌리.appendChild(급);

    var 감쌈 = 만들기('div', { class: 'editwrap' });
    var 카드 = 만들기('div', { class: 'card table-card' });
    카드.appendChild(만들기('h3', {
      style: 'padding:0 var(--space-sm)',
      html: '전체 품목 <span class="hint">소진일 빠른 순</span>' +
        '<span class="right" style="display:flex; gap:var(--space-sm)">' +
        '<button class="btn sm" aria-disabled="true">⬇ 엑셀 내려받기</button>' +
        '<button class="btn sm" aria-disabled="true">인쇄</button></span>'
    }));

    var 조건 = 만들기('div', { style: 'padding:0 var(--space-sm) var(--space-lg); display:flex; flex-direction:column; gap:var(--space-lg)' });
    var 칩줄 = 목.필터칩들(전부, 다시);
    칩줄.appendChild(만들기('div', { style: 'flex:1' }));
    var 찾기 = 목.검색칸(목록다시);
    찾기.style.width = '264px'; 찾기.style.height = 'var(--h-btn)';
    칩줄.appendChild(찾기);
    조건.appendChild(칩줄);
    조건.appendChild(목.업체찾기(전부, 다시));
    조건.appendChild(목.선택바());
    카드.appendChild(조건);

    참조.목록칸 = 만들기('div');
    if (상태.필터 === '일자별') {
      참조.목록칸.appendChild(목.일자줄(다시));
      참조.목록칸.appendChild(일자목록(false));
    } else {
      PC목록속(걸러진).forEach(function (c) { 참조.목록칸.appendChild(c); });
    }
    카드.appendChild(참조.목록칸);

    감쌈.appendChild(카드);
    참조.감쌈 = 감쌈;
    뿌리.appendChild(감쌈);
  }

  /* ── 일자별 목록 (2026-09-14) ──
     품목이 아니라 입고 기록 하나가 한 줄이다. 날짜가 바뀌면 사이에 날 머리를 끼운다
     (기간으로 보실 때 여러 날이 섞이므로). */
  function 일자목록(폰) {
    var 것들 = 목.그날입고();
    var 통 = 만들기('div', { class: 'stack' });
    if (!것들.length) {
      통.appendChild(만들기('div', { class: 폰 ? 'ph-card' : 'card', style: 'text-align:center; color:var(--color-text-muted)',
                                    text: '이 날에 들어온 입고가 없습니다' }));
      return 통;
    }
    var 총주 = 것들.reduce(function (s, r) { return s + (Number(r.수량) || 0); }, 0);
    통.appendChild(만들기('div', { class: 'ph-sec',
      html: '입고 <b>' + 것들.length + '</b>건 <span class="r">' + u.콤마(총주) + '주</span>' }));

    var 목록 = 만들기('div', { class: 폰 ? 'ph-list' : 'stack' });
    var 지난날 = '';
    것들.forEach(function (r) {
      if (r.입고일 !== 지난날) {
        지난날 = r.입고일;
        if (상태.일자범위) 목록.appendChild(만들기('div', { class: '날머리', text: r.입고일 }));
      }
      var 칸 = 만들기('button', { class: 'ph-card', type: 'button' });
      칸.innerHTML =
        '<div class="r1"><div class="nm">' + u.안전(r.유통명) + '</div>' +
        '<div class="cd">' + u.안전(r.품목코드) + '</div></div>' +
        '<div class="sci">' + u.안전(r.학명 || '') + '</div>' +
        '<div class="r2">' + u.안전(r.규격 || '') +
        ' <span class="hint">' + u.안전((r.입고업체 || '').trim()) + '</span>' +
        '<span class="amt"><b>' + u.콤마(r.수량) + '</b>주 · ' + u.콤마(r.단가) + '원</span></div>';
      // 누르면 그 입고 한 건을 고친다 — 품목이 아니라 기록이라 입고 수정(05e)으로 간다
      칸.addEventListener('click', function () { ZG.입고수정.열기(r.id, 칸, 칸); });
      목록.appendChild(칸);
    });
    통.appendChild(목록);
    u.목록등장(목록.children);
    return 통;
  }

  function 폰목록(뿌리) {
    var 전부 = 목.전부요약();
    var 걸러진 = 목.거르기(전부);
    참조.목록칸 = null;

    // 🔴 「3주 내 소진」 카드를 안 낸다 — 우람님이 그 갈래를 통째로 빼셨다 (2026-09-14)
    뿌리.appendChild(만들기('div', { class: 'field' }, [목.검색칸(목록다시)]));
    뿌리.appendChild(목.필터칩들(전부, 다시));
    뿌리.appendChild(목.업체찾기(전부, 다시));

    참조.목록칸 = 만들기('div', { class: 'stack' });
    if (상태.필터 === '일자별') {
      참조.목록칸.appendChild(목.일자줄(다시));
      참조.목록칸.appendChild(일자목록(true));
    } else {
      폰목록속(걸러진).forEach(function (c) { 참조.목록칸.appendChild(c); });
    }
    뿌리.appendChild(참조.목록칸);
  }

  function 그리기(뿌리) {
    참조.뿌리 = 뿌리;
    참조.목록칸 = null; 참조.검색 = null;
    u.비우기(뿌리);
    if (u.폰인가()) {
      if (ZG.입고내부.상태.수정id) { ZG.입고수정.폰상세그리기(뿌리); return; }   // 일자별에서 연 입고 수정
      if (상태.상세코드) { ZG.재고수정.폰상세그리기(뿌리); return; }
      폰목록(뿌리);
    } else {
      상태.상세코드 = null;
      PC배치(뿌리);
    }
  }

  function 머리() {
    if (u.폰인가() && ZG.입고내부.상태.수정id) {
      var 입 = ZG.입고수정.폰상세머리();
      입.뒤로글 = '‹ 재고';          // 입고 내역이 아니라 여기서 열었다
      return 입;
    }
    if (u.폰인가() && 상태.상세코드) return ZG.재고수정.폰상세머리();
    var 요 = 목.요약글();
    return { 제목: '재고', 뒤로: null, 왼: 요.왼, 오: 요.오 };
  }

  /* 입고 수정(05e)에서 저장·삭제 뒤 부른다 — 일자별을 보고 있을 때만 갈아끼운다 */
  function 일자다시() {
    if (상태.필터 !== '일자별' || !참조.목록칸 || !참조.목록칸.isConnected) return;
    목록다시();
  }

  ZG.재고 = { 그리기: 그리기, 다시: 다시, 목록다시: 목록다시, 일자다시: 일자다시, 머리: 머리 };
})(window.ZG);
