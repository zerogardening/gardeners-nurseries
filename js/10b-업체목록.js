/* 10b-업체목록 — 검색/필터/정렬 · PC 표 · 폰 카드목록 (3단계 설계 §3)
   검색칸은 다시 그리지 않는다. 표와 통계만 갈아 끼운다 — 그래야 한글 조합이 안 끊긴다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 자;

  var 상태 = { 검색: '', 대상: '전체', 유형: '전체', 정렬: '최근' };

  var 검색대상 = [
    ['전체', '전체 검색 (업체명·대표자·품목·메모)'],
    ['이름', '업체명'], ['대표', '대표자'], ['전화', '연락처'],
    ['취급품목', '취급품목'], ['주소', '주소'], ['사업자번호', '사업자번호']
  ];
  var 정렬들 = [['최근', '최근 등록순'], ['이름', '업체명순'], ['유형', '유형별']];

  var 표칸, 통계칸;

  function 고른것() {
    자 = ZG.업체자료;
    var 전부 = 자.목록();
    var q = 상태.검색.trim().toLowerCase();
    var 낮게 = function (s) { return String(s == null ? '' : s).toLowerCase(); };

    var 것들 = 전부.filter(function (c) {
      if (상태.유형 !== '전체' && (c.구분 || '') !== 상태.유형) return false;
      if (!q) return true;
      if (상태.대상 === '전체') {
        return [c.이름, c.대표, c.전화, c.이메일, c.주소, c.사업자번호, c.담당자, c.취급품목, c.메모]
          .map(낮게).some(function (x) { return x.indexOf(q) >= 0; });
      }
      return 낮게(c[상태.대상]).indexOf(q) >= 0;
    });

    if (상태.정렬 === '이름') 것들.sort(function (a, b) { return (a.이름 || '').localeCompare(b.이름 || '', 'ko'); });
    else if (상태.정렬 === '유형') 것들.sort(function (a, b) {
      var d = (a.구분 || '').localeCompare(b.구분 || '', 'ko');
      return d !== 0 ? d : (a.이름 || '').localeCompare(b.이름 || '', 'ko');
    });

    return { 전부: 전부, 것들: 것들 };
  }

  function 요약() {
    var r = 고른것();
    return { 왼: '전체 <b>' + r.전부.length + '</b>곳', 오: '검색결과 <b>' + r.것들.length + '</b>곳' };
  }

  function 초기화() {
    상태.검색 = ''; 상태.대상 = '전체'; 상태.유형 = '전체'; 상태.정렬 = '최근';
    ZG.업체앱.다시그리기();
  }

  /* 검색줄 — PC·폰 공통 부품. 값이 바뀌면 표만 다시 그린다 */
  function 검색칸만들기(폰) {
    var 검색 = 만들기('input', {
      class: 'inp' + (폰 ? '' : ' grow'), type: 'text', value: 상태.검색,
      placeholder: 폰 ? '업체명·대표자·품목 검색' : '검색어를 입력하세요…',
      'aria-label': '업체 검색'
    });
    u.조합안전입력(검색, function (값) { 상태.검색 = 값; 표다시(); }, 200);

    function 고르개(목록, 지금, 바뀜, 폭) {
      var s = 만들기('select', { class: 'inp' + (폰 ? ' sm' : ''), style: 폭 ? 'width:' + 폭 : null });
      목록.forEach(function (쌍) {
        s.appendChild(만들기('option', { value: 쌍[0], text: 쌍[1], selected: 쌍[0] === 지금 ? '' : null }));
      });
      s.value = 지금;
      s.addEventListener('change', function () { 바뀜(s.value); 표다시(); });
      return s;
    }

    var 유형목록 = [['전체', '전체 유형']].concat(ZG.업체자료.구분들.map(function (g) { return [g, g]; }));

    if (폰) {
      var 유형폰 = 고르개(유형목록, 상태.유형, function (v) { 상태.유형 = v; }, '1px');
      var 정렬폰 = 고르개(정렬들, 상태.정렬, function (v) { 상태.정렬 = v; }, '1px');
      유형폰.setAttribute('style', 'flex:1'); 정렬폰.setAttribute('style', 'flex:1');
      return [검색, 만들기('div', { class: 'sbar' }, [유형폰, 정렬폰])];
    }

    var 대상칸 = 고르개(검색대상, 상태.대상, function (v) { 상태.대상 = v; }, '250px');
    var 유형칸 = 고르개(유형목록, 상태.유형, function (v) { 상태.유형 = v; }, '132px');
    var 정렬칸 = 고르개(정렬들, 상태.정렬, function (v) { 상태.정렬 = v; }, '132px');
    var 초기 = 만들기('button', { class: 'btn', type: 'button', text: '↺ 초기화' });
    초기.addEventListener('click', 초기화);
    return [만들기('div', { class: 'sbar' }, [대상칸, 검색, 유형칸, 정렬칸, 초기])];
  }

  function 표다시() {
    if (표칸) 채우기();
    if (통계칸) 통계채우기();
    if (u.폰인가()) ZG.업체앱.요약다시();
  }

  function 통계채우기() {
    u.비우기(통계칸);
    var r = 고른것();
    function 칸(이름, 값) {
      return 만들기('div', {}, [만들기('div', { class: 'k', text: 이름 }), 만들기('div', { class: 'v', text: String(값) })]);
    }
    var 공급 = r.전부.filter(function (c) { return c.구분 === '공급업체'; }).length;
    var 판매 = r.전부.filter(function (c) { return c.구분 === '판매처'; }).length;
    [칸('전체 업체', r.전부.length), 칸('검색결과', r.것들.length), 칸('공급업체', 공급), 칸('판매처', 판매)]
      .forEach(function (e) { 통계칸.appendChild(e); });
  }

  function 글(값) { return String(값 == null ? '' : 값).trim() || '-'; }

  function 채우기() {
    u.비우기(표칸);
    var 것들 = 고른것().것들;
    var 셈 = ZG.업체자료.입고건수맵();

    if (!것들.length) {
      표칸.appendChild(만들기('div', {
        class: 'empty',
        html: '🏢 조건에 맞는 업체가 없습니다.'
      }));
      return;
    }

    if (u.폰인가()) {
      var 목록 = 만들기('div', { class: 'ph-list' });
      것들.forEach(function (c) {
        var 줄2 = [c.대표, c.전화].filter(Boolean).join(' · ') || '정보 없음';
        var 카드 = 만들기('button', { class: 'ph-card 업체카드', type: 'button' }, [
          만들기('div', { class: 'r1' }, [
            만들기('span', { class: 'nm', text: c.이름 || '-' }),
            만들기('span', { class: 'type', text: c.내업체 ? '자사' : (c.구분 || '') }),
            만들기('span', { class: 'chev', text: '›' })
          ]),
          만들기('div', {
            class: 'r2',
            html: u.안전(줄2) + '<b class="amt">입고 ' + (셈[c.이름] || 0) + '건</b>'
          })
        ]);
        카드.addEventListener('click', function () { ZG.업체폼.수정열기(c.id); });
        목록.appendChild(카드);
      });
      표칸.appendChild(목록);
      u.목록등장(목록.children);
      return;
    }

    var 표 = 만들기('table');
    var 폭 = ['180px', '110px', '90px', '170px', '', '84px', '76px'];
    var 묶 = 만들기('colgroup');
    폭.forEach(function (w) { 묶.appendChild(만들기('col', { style: w ? 'width:' + w : null })); });
    표.appendChild(묶);

    var 머리 = 만들기('tr');
    ['업체명', '유형', '대표자', '연락처', '주소'].forEach(function (t) { 머리.appendChild(만들기('th', { text: t })); });
    머리.appendChild(만들기('th', { class: 'r', text: '입고건수' }));
    머리.appendChild(만들기('th', { text: '' }));
    표.appendChild(머리);

    var 몸 = 만들기('tbody');
    것들.forEach(function (c) {
      var 이름칸 = 만들기('td');
      var 링크 = 만들기('button', {
        type: 'button', class: 'linkname',
        style: 'background:none;border:none;font:inherit;font-weight:var(--weight-bold);color:var(--color-accent-dark);cursor:pointer;padding:0;text-align:left',
        text: c.이름 || '-'
      });
      링크.addEventListener('click', function () { ZG.업체폼.수정열기(c.id); });
      이름칸.appendChild(링크);
      if (c.내업체) 이름칸.appendChild(만들기('span', { class: 'chip', text: '자사', style: 'margin-left:6px' }));

      var 연락 = 만들기('td', { class: 'dim', text: 글(c.전화) });
      if (c.이메일) 연락.appendChild(만들기('div', { class: 'sci', style: 'font-style:normal;color:var(--color-text-muted)', text: c.이메일 }));

      var 수정 = 만들기('button', { class: 'btn sm', type: 'button', text: '수정' });
      수정.addEventListener('click', function () { ZG.업체폼.수정열기(c.id); });

      몸.appendChild(만들기('tr', {}, [
        이름칸,
        만들기('td', { class: 'dim', text: 글(c.구분) }),
        만들기('td', { class: 'dim', text: 글(c.대표) }),
        연락,
        만들기('td', { class: 'dim', text: 글(c.주소) }),
        만들기('td', { class: 'r', text: String(셈[c.이름] || 0) }),
        만들기('td', {}, [수정])
      ]));
    });
    표.appendChild(몸);
    표칸.appendChild(표);
    u.목록등장(몸.children);
  }

  function 그리기(부모) {
    자 = ZG.업체자료;
    표칸 = null; 통계칸 = null;

    if (u.폰인가()) {
      검색칸만들기(true).forEach(function (e) { 부모.appendChild(e); });
      표칸 = 만들기('div');
      부모.appendChild(표칸);
      채우기();
      return;
    }

    부모.appendChild(만들기('div', { class: 'card' }, 검색칸만들기(false)));
    통계칸 = 만들기('div', { class: 'stat' });
    부모.appendChild(통계칸);
    통계채우기();

    표칸 = 만들기('div');
    부모.appendChild(만들기('div', { class: 'card table-card' }, [
      만들기('h3', {
        style: 'padding:0 var(--space-sm)',
        html: '업체 목록'
      }),
      표칸
    ]));
    채우기();
  }

  ZG.업체목록 = { 그리기: 그리기, 요약: 요약, 상태: 상태, 표다시: 표다시 };
})(window.ZG);
