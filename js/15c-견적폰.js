/* 15c-견적폰 — 폰 견적 요청 화면 (5단계 설계 §5)
   밭에서 전화를 받으며 적는 화면이다. 내용 글씨가 제일 크고, 상태는 세 칸 토글이다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기, 자 = null;
  var 상태 = { 뷰: '목록', id: '', 글: '', 필터: '', 폼: null };

  function 다시() { ZG.견적앱.다시그리기(); }
  function 폼비우기() { 상태.폼 = { 요청일: u.오늘문자(), 고객명: '', 연락처: '', 내용: '' }; }
  function 지금건() { return 상태.id ? 자.하나(상태.id) : null; }
  function 목록으로() { 상태.뷰 = '목록'; 상태.id = ''; 다시(); }

  function 제목() {
    if (상태.뷰 === '등록') return '새 견적 요청';
    if (상태.뷰 === '상세') { var g = 지금건(); return g ? (g.고객명 || '견적 요청') : '견적 요청'; }
    return '견적 요청';
  }

  function 요약() {
    자 = ZG.견적자료;
    if (상태.뷰 === '등록') {
      var 오늘 = u.오늘문자();
      var 오늘것 = 자.전부().filter(function (q) { return q.요청일 === 오늘; }).length;
      return { 왼: '', 오: '오늘 접수 <b>' + 오늘것 + '</b>건' };
    }
    if (상태.뷰 === '상세') {
      var g = 지금건();
      if (!g) return { 왼: '', 오: '' };
      return {
        왼: '요청일 <b>' + u.안전(g.요청일 || '') + '</b>',
        오: '수정 ' + ZG.계산.날짜문자(g.수정일시 || g.등록일시 || Date.now()).slice(5)
      };
    }
    var 셈 = 자.집계();
    return { 왼: '전체 <b>' + 셈.전체 + '</b>건', 오: '요청 중 <b>' + 셈.요청 + '</b>건' };
  }

  /* ── 목록 ── */
  function 목록그리기(칸) {
    var 검색 = 만들기('input', { class: 'inp', style: 'flex:1; min-width:120px', placeholder: '🔍 고객명 · 내용' });
    검색.value = 상태.글;
    var 몸 = 만들기('div', { class: 'ph-list' });

    function 채우기() {
      u.비우기(몸);
      var 것들 = 자.읽기({ 글: 상태.글, 상태: 상태.필터 });
      if (!것들.length) {
        몸.appendChild(만들기('div', {
          class: 'empty',
          text: (상태.글 || 상태.필터) ? '찾는 견적 요청이 없습니다' : '아직 접수한 견적 요청이 없습니다'
        }));
        return;
      }
      것들.forEach(function (q) { 몸.appendChild(카드(q)); });
      u.목록등장(몸.children);
    }

    u.조합안전입력(검색, function (값) { 상태.글 = 값; 채우기(); });

    var 고르개 = 만들기('select', { class: 'inp sm', style: 'width:112px' });
    [['', '전체 상태']].concat(자.상태들.map(function (s) { return [s, s]; })).forEach(function (쌍) {
      고르개.appendChild(만들기('option', { value: 쌍[0], text: 쌍[1] }));
    });
    고르개.value = 상태.필터;
    고르개.addEventListener('change', function () { 상태.필터 = 고르개.value; 채우기(); });

    칸.appendChild(만들기('div', { class: 'sbar' }, [검색, 고르개]));
    칸.appendChild(몸);

    var 더하기 = 만들기('button', { class: 'addbtn', type: 'button', text: '＋ 새 견적 요청' });
    더하기.addEventListener('click', function () { 폼비우기(); 상태.뷰 = '등록'; 다시(); });
    칸.appendChild(더하기);

    채우기();
  }

  function 카드(q) {
    var 보임 = 자.보일상태(q.상태);
    var 반 = 보임 === '완료' ? 'done' : (보임 === '취소' ? 'cancel' : 'wait');
    var c = 만들기('div', { class: 'ph-card qcard', tabindex: '0', role: 'button' }, [
      만들기('div', { class: 'r1' }, [
        만들기('span', { class: 'nm', text: q.고객명 || '' }),
        만들기('span', { class: 'st ' + 반, text: 보임 }),
        만들기('span', { class: 'day', text: (q.요청일 || '').slice(5) })
      ]),
      만들기('div', { class: 'memo', text: q.내용 || '' })
    ]);

    var 바닥 = 만들기('div', { class: 'foot' }, [만들기('span', { class: 'tel', text: q.연락처 || '연락처 없음' })]);
    var 숫 = 자.숫자만(q.연락처);
    if (숫.length >= 8) {
      var 전화 = 만들기('a', { class: 'call', href: 'tel:' + 숫, text: '📞 전화' });
      전화.addEventListener('click', function (e) { e.stopPropagation(); });
      바닥.appendChild(전화);
    }
    c.appendChild(바닥);

    function 들어가기() { 상태.id = q.id; 상태.뷰 = '상세'; 다시(); }
    c.addEventListener('click', 들어가기);
    c.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); 들어가기(); }
    });
    return c;
  }

  /* ── 새 견적 요청 ── */
  function 등록그리기(칸) {
    if (!상태.폼) 폼비우기();
    var 칸들 = {};
    칸.appendChild(글칸(칸들, '요청일', '요청일자 <span class="req">*</span>', { class: 'inp num', type: 'date' }));
    칸.appendChild(글칸(칸들, '고객명', '고객명 <span class="req">*</span>', { class: 'inp', placeholder: '예: 홍길동 / OO조경' }));
    칸.appendChild(글칸(칸들, '연락처', '연락처', { class: 'inp', placeholder: '010-0000-0000' }));
    칸.appendChild(내용칸(칸들, '요청 내용 / 메모 <span class="req">*</span>', 5,
      '문의한 식물·수량·납기·예산을 들리는 대로 적으시면 됩니다'));

    var 저장 = 만들기('button', { class: 'ph-save', type: 'button', text: '등록' });
    저장.addEventListener('click', function () {
      var 값 = 읽어오기(칸들);
      if (!검사(칸들, 값)) return;
      자.추가(값);
      u.토스트('견적 요청을 접수했습니다');
      폼비우기();
      목록으로();
    });
    칸.appendChild(저장);
  }

  /* ── 상세 ── */
  function 상세그리기(칸) {
    var g = 지금건();
    if (!g) { 목록으로(); return; }

    칸.appendChild(만들기('div', { class: 'field' }, [
      만들기('label', { text: '상태' }), 상태고르개(g)
    ]));

    var 칸들 = {};
    상태.폼 = { 요청일: g.요청일, 고객명: g.고객명, 연락처: g.연락처 || '', 내용: g.내용 || '' };
    칸.appendChild(글칸(칸들, '연락처', '연락처', { class: 'inp' }));
    칸.appendChild(내용칸(칸들, '요청 내용 / 메모', 6, ''));

    var 저장 = 만들기('button', { class: 'ph-save', type: 'button', text: '저장' });
    저장.addEventListener('click', function () {
      var 값 = {
        요청일: g.요청일, 고객명: g.고객명,
        연락처: 칸들.연락처.value.trim(), 내용: 칸들.내용.value.trim()
      };
      if (!값.내용) { u.흔들기(칸들.내용); u.토스트('요청 내용을 적어 주세요'); return; }
      자.수정(g.id, 값);
      u.토스트('견적 요청을 고쳤습니다');
      목록으로();
    });
    칸.appendChild(저장);

    var 삭제 = 만들기('button', {
      class: 'addbtn', type: 'button', text: '🗑 이 견적 요청 삭제',
      style: 'border-color:var(--color-danger-border); color:var(--color-danger)'
    });
    삭제.addEventListener('click', function () {
      u.확인({
        제목: '견적 요청을 지울까요?',
        본문: u.안전(g.고객명 || '') + ' 건입니다. <b>되돌릴 수 없습니다.</b>',
        확인글: '삭제', 위험: true
      }, function (예) {
        if (!예) return;
        자.삭제(g.id);
        u.토스트('견적 요청을 지웠습니다');
        목록으로();
      });
    });
    칸.appendChild(삭제);
  }

  /* 누르는 즉시 저장한다 — 장갑 낀 손을 위해 드롭다운을 안 쓴다 (§5)
     🔴 여기서 화면을 다시 그리지 않는다. 다시 그리면 아직 저장 안 한 내용 입력값과
        조합 중인 한글이 원문으로 되돌아간다(밭에서 적던 메모가 사라진다). 칩만 바꿔 단다. */
  function 상태고르개(g) {
    var 줄 = 만들기('div', { class: 'stpick' });
    var 칩들 = [];
    자.상태들.forEach(function (s) {
      var b = 만들기('button', { type: 'button', class: 자.보일상태(g.상태) === s ? 'on' : '', text: s });
      b.addEventListener('click', function () {
        if (자.보일상태(g.상태) === s) return;
        자.상태바꾸기(g.id, s);
        g.상태 = s;   // 하나()가 준 것은 사본이라 화면이 쥔 값도 맞춰 둔다
        칩들.forEach(function (짝) { 짝[0].className = 짝[1] === s ? 'on' : ''; });
        u.토스트('상태를 「' + s + '」로 바꿨습니다');
      });
      칩들.push([b, s]);
      줄.appendChild(b);
    });
    return 줄;
  }

  /* ── 입력칸 도우미 ── */
  function 글칸(칸들, 이름, 라벨, 속성) {
    var i = 만들기('input', 속성);
    i.value = (상태.폼 && 상태.폼[이름]) || '';
    u.조합안전입력(i, function (값) { 상태.폼[이름] = 값; });
    칸들[이름] = i;
    return 만들기('div', { class: 'field' }, [만들기('label', { html: 라벨 }), i]);
  }

  function 내용칸(칸들, 라벨, 줄수, 안내) {
    var t = 만들기('textarea', { class: 'inp ta', rows: String(줄수), placeholder: 안내 || null });
    t.value = (상태.폼 && 상태.폼.내용) || '';
    u.조합안전입력(t, function (값) { 상태.폼.내용 = 값; });
    칸들.내용 = t;
    return 만들기('div', { class: 'field' }, [만들기('label', { html: 라벨 }), t]);
  }

  function 읽어오기(칸들) {
    return {
      요청일: 칸들.요청일 ? 칸들.요청일.value.trim() : u.오늘문자(),
      고객명: 칸들.고객명 ? 칸들.고객명.value.trim() : '',
      연락처: 칸들.연락처 ? 칸들.연락처.value.trim() : '',
      내용: 칸들.내용 ? 칸들.내용.value.trim() : ''
    };
  }

  function 검사(칸들, 값) {
    var 빠진 = !값.요청일 ? ['요청일', '요청일자를 골라 주세요']
      : !값.고객명 ? ['고객명', '고객명을 적어 주세요']
      : !값.내용 ? ['내용', '요청 내용을 적어 주세요'] : null;
    if (!빠진) return true;
    u.흔들기(칸들[빠진[0]]);
    u.토스트(빠진[1]);
    return false;
  }

  function 그리기(칸) {
    자 = ZG.견적자료;
    if (상태.뷰 === '등록') 등록그리기(칸);
    else if (상태.뷰 === '상세') 상세그리기(칸);
    else 목록그리기(칸);
  }

  ZG.견적폰 = { 그리기: 그리기, 상태: 상태, 제목: 제목, 요약: 요약, 목록으로: 목록으로 };
})(window.ZG);
