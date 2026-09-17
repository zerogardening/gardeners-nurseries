/* 15b-견적PC — PC 견적 요청 화면 (5단계 설계 §4)
   등록/수정 카드 → 통계 4칸 → 표. 수정은 위 카드에서 한다. prompt 를 쓰지 않는다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기, 자 = null;
  var 쪽크기 = 20;
  var 상태 = { 글: '', 필터: '', 쪽: 1, 수정id: '', 번쩍id: '', 폼: null };
  var 채우기 = function () {};

  function 폼비우기() { 상태.폼 = { 요청일: u.오늘문자(), 고객명: '', 연락처: '', 내용: '' }; }
  function 다시() { ZG.견적앱.다시그리기(); }

  /* ── 등록 / 수정 카드 ── */
  function 폼카드() {
    var 대상 = 상태.수정id ? 자.하나(상태.수정id) : null;
    if (상태.수정id && !대상) { 상태.수정id = ''; 폼비우기(); }
    if (!상태.폼) 폼비우기();

    var 칸 = {};
    function 칸만들기(이름, 라벨, 넓이, 속성) {
      var i = 만들기('input', 속성);
      i.value = 상태.폼[이름] || '';
      u.조합안전입력(i, function (값) { 상태.폼[이름] = 값; });   // 조합 중에 다시 그리지 않는다
      칸[이름] = i;
      return 만들기('div', { class: 넓이 || '' }, [
        만들기('label', { html: 라벨 }), i
      ]);
    }

    var 내용칸 = 만들기('textarea', {
      class: 'inp ta', rows: '3',
      placeholder: '고객이 문의한 식물·수량·납기·예산 등을 자유롭게 적습니다'
    });
    내용칸.value = 상태.폼.내용 || '';
    u.조합안전입력(내용칸, function (값) { 상태.폼.내용 = 값; });
    칸.내용 = 내용칸;

    var 격자 = 만들기('div', { class: 'fgrid' }, [
      칸만들기('요청일', '요청일자 <span class="req">*</span>', 'field',
        { class: 'inp num', type: 'date' }),
      칸만들기('고객명', '고객명 <span class="req">*</span>', 'field',
        { class: 'inp', placeholder: '예: 홍길동 / OO조경' }),
      칸만들기('연락처', '연락처', 'field',
        { class: 'inp', placeholder: '010-0000-0000 / email' }),
      만들기('div', { class: 'field s4' }, [
        만들기('label', { html: '요청 내용 / 메모 <span class="req">*</span>' }), 내용칸
      ])
    ]);

    var 왼버튼 = 만들기('button', { class: 'btn', type: 'button', text: 대상 ? '취소' : '초기화' });
    왼버튼.addEventListener('click', function () {
      상태.수정id = ''; 폼비우기(); 다시();
    });
    var 저장버튼 = 만들기('button', {
      class: 'btn main wide', type: 'button', text: 대상 ? '💾 수정 저장' : '＋ 등록'
    });
    저장버튼.addEventListener('click', function () { 저장하기(칸, 대상); });

    var 제목 = 만들기('h3', {
      html: 대상
        ? '견적 요청 수정 <span class="hint">' + u.안전(대상.요청일) + ' 접수 · 마지막 수정 ' +
          u.안전(ZG.계산.날짜문자(대상.수정일시 || 대상.등록일시 || Date.now())) + '</span>' +
          '<span class="right">' + 칩글(자.보일상태(대상.상태)) + '</span>'
        : '새 견적 요청 등록'
    });

    return 만들기('div', { class: 'card' }, [
      제목, 격자,
      만들기('div', { class: 'formfoot' }, [왼버튼, 저장버튼])
    ]);
  }

  function 칩글(상태값) {
    var 반 = 상태값 === '완료' ? 'done' : (상태값 === '취소' ? 'cancel' : 'wait');
    return '<span class="st ' + 반 + '">' + u.안전(상태값) + '</span>';
  }

  function 저장하기(칸, 대상) {
    var 값 = {
      요청일: 칸.요청일.value.trim(),
      고객명: 칸.고객명.value.trim(),
      연락처: 칸.연락처.value.trim(),
      내용: 칸.내용.value.trim()
    };
    var 빠진 = !값.요청일 ? ['요청일', '요청일자를 골라 주세요']
      : !값.고객명 ? ['고객명', '고객명을 적어 주세요']
      : !값.내용 ? ['내용', '요청 내용을 적어 주세요'] : null;
    if (빠진) { u.흔들기(칸[빠진[0]]); u.토스트(빠진[1]); 칸[빠진[0]].focus(); return; }

    var 결과 = 대상 ? 자.수정(대상.id, 값) : 자.추가(값);
    상태.번쩍id = 결과 ? 결과.id : '';
    상태.수정id = '';
    폼비우기();
    u.토스트(대상 ? '견적 요청을 고쳤습니다' : '견적 요청을 접수했습니다');
    다시();
  }

  /* ── 통계 4칸 — 필터와 무관하게 전체 기준 ── */
  function 통계채우기(칸) {
    u.비우기(칸);
    var 셈 = 자.집계();
    [['전체 요청', 셈.전체], ['요청 중', 셈.요청], ['완료', 셈.완료], ['취소', 셈.취소]].forEach(function (쌍) {
      칸.appendChild(만들기('div', {}, [
        만들기('div', { class: 'k', text: 쌍[0] }),
        만들기('div', { class: 'v', text: String(쌍[1]) })
      ]));
    });
  }

  /* ── 검색줄 ── */
  function 검색줄() {
    var 검색 = 만들기('input', {
      class: 'inp grow', placeholder: '🔍 고객명 · 내용 · 연락처 검색…'
    });
    검색.value = 상태.글;
    u.조합안전입력(검색, function (값) {   // 조합이 끝난 뒤에만 목록을 다시 그린다
      상태.글 = 값; 상태.쪽 = 1; 채우기();
    });

    var 고르개 = 만들기('select', { class: 'inp', style: 'width:150px' });
    [['', '전체 상태']].concat(자.상태들.map(function (s) { return [s, s]; })).forEach(function (쌍) {
      고르개.appendChild(만들기('option', { value: 쌍[0], text: 쌍[1] }));
    });
    고르개.value = 상태.필터;
    고르개.addEventListener('change', function () {
      상태.필터 = 고르개.value; 상태.쪽 = 1; 채우기();
    });

    var 초기화 = 만들기('button', { class: 'btn', type: 'button', text: '↺ 초기화' });
    초기화.addEventListener('click', function () {
      상태.글 = ''; 상태.필터 = ''; 상태.쪽 = 1;
      검색.value = ''; 고르개.value = '';
      채우기();
    });

    return 만들기('div', {
      class: 'sbar', style: 'padding:0 var(--space-sm) var(--space-lg)'
    }, [검색, 고르개, 초기화]);
  }

  /* ── 표 ── */
  function 표그리기(것들) {
    var t = 만들기('table');
    var 열 = 만들기('colgroup');
    ['104px', '132px', '132px', '', '118px', '132px'].forEach(function (w) {
      열.appendChild(만들기('col', w ? { style: 'width:' + w } : {}));
    });
    t.appendChild(열);
    t.appendChild(만들기('tr', {}, ['요청일자', '고객명', '연락처', '요청 내용', '상태', ''].map(function (글) {
      return 만들기('th', { text: 글 });
    })));
    것들.forEach(function (q) { t.appendChild(줄(q)); });
    return t;
  }

  function 줄(q) {
    var 수정중 = 상태.수정id === q.id;
    var tr = 만들기('tr', { class: 수정중 ? 'editing' : '' });
    tr.appendChild(만들기('td', { class: 'day', text: q.요청일 || '' }));
    tr.appendChild(만들기('td', {}, [만들기('b', { text: q.고객명 || '' })]));
    tr.appendChild(만들기('td', { class: 'tel', text: q.연락처 || '' }));
    tr.appendChild(만들기('td', { class: 'memo', text: q.내용 || '' }));

    var 상태칸 = 만들기('td');
    if (수정중) 상태칸.appendChild(만들기('span', { class: 'st wait', text: '수정 중' }));
    else 상태칸.appendChild(상태고르개(q));
    tr.appendChild(상태칸);

    var 수정 = 만들기('button', { class: 'btn sm', type: 'button', text: '수정' });
    수정.addEventListener('click', function () {
      상태.수정id = q.id;
      상태.폼 = { 요청일: q.요청일 || '', 고객명: q.고객명 || '', 연락처: q.연락처 || '', 내용: q.내용 || '' };
      다시();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    var 삭제 = 만들기('button', { class: 'btn sm del', type: 'button', text: '삭제' });
    삭제.addEventListener('click', function () { 지우기(q); });
    tr.appendChild(만들기('td', {}, [수정, 만들기('span', { text: ' ' }), 삭제]));

    if (상태.번쩍id === q.id) { 상태.번쩍id = ''; requestAnimationFrame(function () { u.번쩍(tr); }); }
    return tr;
  }

  /* 바꾸는 즉시 저장한다. 저장 버튼이 없다 (§4-③) */
  function 상태고르개(q) {
    var s = 만들기('select', { class: 'inp sm', style: 'width:96px' });
    자.상태들.forEach(function (v) { s.appendChild(만들기('option', { value: v, text: v })); });
    s.value = 자.보일상태(q.상태);
    s.addEventListener('change', function () {
      자.상태바꾸기(q.id, s.value);
      u.토스트('상태를 「' + s.value + '」로 바꿨습니다');
      상태.번쩍id = q.id;
      채우기();
    });
    return s;
  }

  function 지우기(q) {
    u.확인({
      제목: '견적 요청을 지울까요?',
      본문: u.안전(q.고객명 || '') + ' 건입니다. <b>되돌릴 수 없습니다.</b>',
      확인글: '삭제', 위험: true
    }, function (예) {
      if (!예) return;
      자.삭제(q.id);
      if (상태.수정id === q.id) { 상태.수정id = ''; 폼비우기(); }
      u.토스트('견적 요청을 지웠습니다');
      다시();
    });
  }

  function 쪽줄(총쪽) {
    var 줄 = 만들기('div', { class: 'pager' });
    function 단추(글, 쪽, 막힘) {
      var b = 만들기('button', { type: 'button', text: 글, disabled: 막힘 ? 'disabled' : null });
      b.addEventListener('click', function () { 상태.쪽 = 쪽; 채우기(); });
      return b;
    }
    줄.appendChild(단추('‹', Math.max(1, 상태.쪽 - 1), 상태.쪽 <= 1));
    for (var i = 1; i <= 총쪽; i++) {
      if (i === 상태.쪽) 줄.appendChild(만들기('b', { text: String(i) }));
      else 줄.appendChild(단추(String(i), i, false));
    }
    줄.appendChild(단추('›', Math.min(총쪽, 상태.쪽 + 1), 상태.쪽 >= 총쪽));
    return 줄;
  }

  /* ── 조립 ── */
  function 그리기(칸) {
    자 = ZG.견적자료;
    칸.appendChild(폼카드());

    var 통계 = 만들기('div', { class: 'stat' });
    칸.appendChild(통계);

    var 제목 = 만들기('h3', { style: 'padding:0 var(--space-sm)' });
    var 몸 = 만들기('div');
    var 표카드 = 만들기('div', { class: 'card table-card' }, [제목]);
    표카드.appendChild(검색줄());
    표카드.appendChild(몸);
    칸.appendChild(표카드);

    채우기 = function () {
      통계채우기(통계);
      u.비우기(몸);
      var 것들 = 자.읽기({ 글: 상태.글, 상태: 상태.필터 });
      var 총쪽 = Math.max(1, Math.ceil(것들.length / 쪽크기));
      if (상태.쪽 > 총쪽) 상태.쪽 = 총쪽;
      제목.innerHTML = '견적 요청 목록 <span class="hint">' +
        (상태.필터 ? '상태 「' + u.안전(상태.필터) + '」만 보는 중 · ' : '최근 등록순 · 총 ') +
        것들.length + '건</span>';

      if (!것들.length) {
        몸.appendChild(만들기('div', {
          class: 'empty',
          text: (상태.글 || 상태.필터) ? '찾는 견적 요청이 없습니다' : '아직 접수한 견적 요청이 없습니다'
        }));
        return;
      }
      몸.appendChild(표그리기(것들.slice((상태.쪽 - 1) * 쪽크기, 상태.쪽 * 쪽크기)));
      몸.appendChild(쪽줄(총쪽));   // 시안대로 한 쪽뿐일 때도 둔다
    };
    채우기();
  }

  ZG.견적PC = { 그리기: 그리기, 상태: 상태, 칩글: 칩글 };
})(window.ZG);
