/* 11c-명세서이력 — 발행 이력 목록 · 불러오기 · 삭제 (3단계 설계 §5)
   페이지 넘김은 만들지 않는다(§9). 검색칸은 다시 그리지 않고 표만 갈아 끼운다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 상태 = { 검색: '', 유형: '전체' };
  var 표칸;

  function 고른것() {
    var q = 상태.검색.trim().toLowerCase();
    return ZG.업체자료.명세서목록().filter(function (s) {
      if (상태.유형 !== '전체' && (s.종류 || '') !== 상태.유형) return false;
      if (!q) return true;
      return String((s.받는곳 && s.받는곳.이름) || '').toLowerCase().indexOf(q) >= 0 ||
        String(s.번호 || '').toLowerCase().indexOf(q) >= 0;
    });
  }

  function 요약() {
    var 전부 = ZG.업체자료.명세서목록();
    var 이달 = u.오늘문자().slice(0, 7);
    var 이번달 = 전부.filter(function (s) { return String(s.작성일 || '').slice(0, 7) === 이달; }).length;
    return { 왼: '발행 이력 <b>' + 전부.length + '</b>건', 오: '이번 달 <b>' + 이번달 + '</b>건' };
  }

  function 표다시() {
    if (표칸) 채우기();
    if (u.폰인가()) ZG.업체앱.요약다시();
  }

  function 불러오기(id) {
    ZG.명세서.불러오기(id);
    ZG.업체앱.명세서탭으로('작성');
  }

  function 지우기(s) {
    u.확인({
      제목: '「' + (s.번호 || '') + '」 발행 이력을 지울까요?',
      본문: '문서와 품목 줄이 함께 지워집니다.',
      확인글: '삭제', 위험: true
    }, function (예) {
      if (!예) return;
      ZG.업체자료.명세서지우기(s.id);
      u.토스트('🗑 지웠습니다');
      표다시();
    });
  }

  function 검색칸(폰) {
    var 검색 = 만들기('input', {
      class: 'inp' + (폰 ? '' : ' grow'), type: 'text', value: 상태.검색,
      placeholder: 폰 ? '🔍 고객사명 · NO 검색' : '고객사명 · NO 검색…', 'aria-label': '명세서 검색'
    });
    u.조합안전입력(검색, function (값) { 상태.검색 = 값; 표다시(); }, 200);

    var 유형 = 만들기('select', { class: 'inp' + (폰 ? ' sm' : ''), style: 폰 ? null : 'width:150px', 'aria-label': '유형' });
    ['전체', '거래명세서', '견적서'].forEach(function (t) {
      유형.appendChild(만들기('option', { value: t, text: t === '전체' ? '전체 유형' : t }));
    });
    유형.value = 상태.유형;
    유형.addEventListener('change', function () { 상태.유형 = 유형.value; 표다시(); });

    if (폰) return [검색, 유형];

    var 초기 = 만들기('button', { class: 'btn', type: 'button', text: '↺ 초기화' });
    초기.addEventListener('click', function () {
      상태.검색 = ''; 상태.유형 = '전체';
      ZG.업체앱.다시그리기();
    });
    return [만들기('div', { class: 'sbar' }, [검색, 유형, 초기])];
  }

  function 채우기() {
    u.비우기(표칸);
    var 것들 = 고른것();
    var 셈 = ZG.업체자료.명세서줄셈();

    if (!것들.length) {
      표칸.appendChild(만들기('div', {
        class: 'empty',
        html: '📭 발행 이력이 없습니다.<br>작성 탭에서 💾 저장을 누르면 여기에 쌓입니다.'
      }));
      return;
    }

    if (u.폰인가()) {
      var 목록 = 만들기('div', { class: 'ph-list' });
      것들.forEach(function (s) {
        var 카드 = 만들기('button', { class: 'ph-card', type: 'button' }, [
          만들기('div', { class: 'r1' }, [
            만들기('span', { class: 'nm', text: (s.받는곳 && s.받는곳.이름) || '-' }),
            만들기('span', { class: 'type', text: s.종류 || '' }),
            만들기('span', { class: 'chev', text: '›' })
          ]),
          만들기('div', {
            class: 'r2',
            html: u.안전(s.작성일 || '') + ' · ' + (셈[s.id] || 0) + '품목' +
              '<b class="amt">' + u.콤마(s.합계 || 0) + '</b>'
          })
        ]);
        카드.addEventListener('click', function () { 불러오기(s.id); });
        목록.appendChild(카드);
      });
      표칸.appendChild(목록);
      표칸.appendChild(만들기('div', {
        class: 'noteline', html: '카드를 누르면 그 명세서를 <b>작성 탭으로 다시 불러옵니다.</b>'
      }));
      u.목록등장(목록.children);
      return;
    }

    var 표 = 만들기('table');
    var 묶 = 만들기('colgroup');
    ['104px', '104px', '140px', '', '70px', '110px', '170px'].forEach(function (w) {
      묶.appendChild(만들기('col', { style: w ? 'width:' + w : null }));
    });
    표.appendChild(묶);
    var 머리 = 만들기('tr');
    ['발행일', '유형', 'NO.', '고객사'].forEach(function (t) { 머리.appendChild(만들기('th', { text: t })); });
    머리.appendChild(만들기('th', { class: 'r', text: '품목수' }));
    머리.appendChild(만들기('th', { class: 'r', text: '합계' }));
    머리.appendChild(만들기('th', { text: '' }));
    표.appendChild(머리);

    var 몸 = 만들기('tbody');
    것들.forEach(function (s) {
      var 열기 = 만들기('button', { class: 'btn sm', type: 'button', text: '불러오기' });
      열기.addEventListener('click', function () { 불러오기(s.id); });
      var 삭제 = 만들기('button', { class: 'btn sm del', type: 'button', text: '삭제', style: 'margin-left:4px' });
      삭제.addEventListener('click', function () { 지우기(s); });
      몸.appendChild(만들기('tr', {}, [
        만들기('td', { class: 'dim', text: s.작성일 || '-' }),
        만들기('td', { class: 'dim', text: s.종류 || '-' }),
        만들기('td', { class: 'code', text: s.번호 || '-' }),
        만들기('td', {}, [만들기('b', { text: (s.받는곳 && s.받는곳.이름) || '-' })]),
        만들기('td', { class: 'r', text: String(셈[s.id] || 0) }),
        만들기('td', { class: 'r', text: u.콤마(s.합계 || 0) }),
        만들기('td', {}, [열기, 삭제])
      ]));
    });
    표.appendChild(몸);
    표칸.appendChild(표);
    u.목록등장(몸.children);
  }

  function 그리기(부모) {
    표칸 = null;
    if (u.폰인가()) {
      검색칸(true).forEach(function (e) { 부모.appendChild(e); });
      표칸 = 만들기('div');
      부모.appendChild(표칸);
      채우기();
      return;
    }
    부모.appendChild(만들기('div', { class: 'card' }, [
      만들기('h3', { html: '발행 이력' })
    ].concat(검색칸(false))));
    표칸 = 만들기('div');
    부모.appendChild(만들기('div', { class: 'card table-card' }, [표칸]));
    채우기();
  }

  ZG.명세서이력 = { 그리기: 그리기, 요약: 요약, 표다시: 표다시, 상태: 상태 };
})(window.ZG);
