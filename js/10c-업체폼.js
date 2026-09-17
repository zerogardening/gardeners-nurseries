/* 10c-업체폼 — 등록 폼(PC 4칸 격자 / 폰 세로) · 수정(PC 시트 / 폰 상세) (3단계 설계 §3)
   한글이 들어가는 칸은 전부 조합안전입력으로 감싼다 — 다시 그리지 않고 값만 받아 둔다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;

  /* 폰 등록 폼은 긴 항목(사업자번호·입금계좌·거래조건)을 뺀다 (시안 ②) */
  var 폰칸 = ['이름', '구분', '대표', '전화', '주소', '취급품목', '메모'];

  function 빈값() {
    return {
      이름: '', 구분: '공급업체', 대표: '', 사업자번호: '', 전화: '', 이메일: '', 주소: '',
      담당자: '', 담당자전화: '', 취급품목: '', 입금계좌: '', 거래조건: '', 메모: '', 내업체: false
    };
  }

  var 새것 = 빈값();     // 등록 탭이 들고 있는 값. 탭을 오가도 안 날아간다

  function 칸(라벨, 값, 넣기, 옵션) {
    옵션 = 옵션 || {};
    var 입력;
    if (옵션.여러줄) {
      입력 = 만들기('textarea', { class: 'inp ta', rows: 옵션.행 || 3 });
      입력.value = 값 || '';
    } else if (옵션.고르기) {
      입력 = 만들기('select', { class: 'inp' });
      옵션.고르기.forEach(function (쌍) {
        입력.appendChild(만들기('option', { value: 쌍[0], text: 쌍[1] }));
      });
      입력.value = 값 || 옵션.고르기[0][0];
      입력.addEventListener('change', function () { 넣기(입력.value); });
    } else {
      입력 = 만들기('input', { class: 'inp' + (옵션.숫자 ? ' num' : ''), type: 'text', value: 값 || '' });
    }
    if (!옵션.고르기) {
      // 숫자칸(사업자번호·전화)은 조합이 없다. 한글칸만 조합안전입력으로 감싼다 (설계 §6)
      if (옵션.숫자) 입력.addEventListener('input', function () { 넣기(입력.value); });
      else u.조합안전입력(입력, 넣기, 200);
      // 저장 직전에 마지막 글자까지 확실히 받도록 blur 에서도 한 번 넣는다
      입력.addEventListener('blur', function () { 넣기(입력.value); });
    }
    var 이름줄 = [document.createTextNode(라벨 + ' ')];
    if (옵션.필수) 이름줄.push(만들기('span', { class: 'req', text: '*' }));
    if (옵션.도움) 이름줄.push(만들기('span', { class: 'auto', text: 옵션.도움 }));
    var 밭 = 만들기('div', { class: 'field' + (옵션.넓이 ? ' ' + 옵션.넓이 : '') }, [
      만들기('label', {}, 이름줄), 입력
    ]);
    밭.입력 = 입력;
    return 밭;
  }

  function 자사줄(값, 넣기) {
    var 표 = 만들기('i', { class: 값.내업체 ? '' : 'off', text: '✓' });
    var 상자 = 만들기('button', { class: 'selfbox', type: 'button' }, [
      표,
      만들기('b', { text: '이 업체를 명세서 공급자(자기 회사)로 지정' }),
      만들기('span', { text: '— 명세서·견적서를 뽑을 때 오른쪽 공급자란에 자동으로 들어갑니다 (딱 한 곳만 지정)' })
    ]);
    상자.addEventListener('click', function () {
      넣기(!값.내업체);
      표.className = 값.내업체 ? '' : 'off';
    });
    return 상자;
  }

  /* 폼 칸들을 만들어 돌려준다. 값 객체에 그대로 써 넣는다 */
  function 칸들(값, 폰) {
    var 구분목록 = ZG.업체자료.구분들.map(function (g) { return [g, ZG.업체자료.구분설명[g]]; });
    var 전부 = {
      이름: 칸('업체명', 값.이름, function (v) { 값.이름 = v; }, { 필수: true }),
      구분: 칸('업체 유형', 값.구분, function (v) { 값.구분 = v; }, { 필수: true, 고르기: 구분목록 }),
      대표: 칸('대표자명', 값.대표, function (v) { 값.대표 = v; }),
      사업자번호: 칸('사업자번호', 값.사업자번호, function (v) { 값.사업자번호 = v; }, { 숫자: true }),
      전화: 칸('대표 연락처', 값.전화, function (v) { 값.전화 = v; }, { 숫자: true }),
      이메일: 칸('이메일', 값.이메일, function (v) { 값.이메일 = v; }),
      주소: 칸('주소', 값.주소, function (v) { 값.주소 = v; }, { 넓이: 's2' }),
      담당자: 칸('담당자', 값.담당자, function (v) { 값.담당자 = v; }, { 넓이: 's2' }),
      취급품목: 칸('주요 취급 품목', 값.취급품목, function (v) { 값.취급품목 = v; },
        { 넓이: 's2', 도움: '쉼표로 구분' }),
      입금계좌: 칸('입금계좌', 값.입금계좌, function (v) { 값.입금계좌 = v; }, { 넓이: 's2', 도움: '명세서에 표시됩니다' }),
      거래조건: 칸('거래조건', 값.거래조건, function (v) { 값.거래조건 = v; }, { 넓이: 's2' }),
      메모: 칸('메모', 값.메모, function (v) { 값.메모 = v; }, { 넓이: 's4', 여러줄: true, 행: 폰 ? 2 : 3 })
    };
    var 차례 = 폰 ? 폰칸 : ['이름', '구분', '대표', '사업자번호', '전화', '이메일', '주소',
      '담당자', '취급품목', '입금계좌', '거래조건', '메모'];
    return { 밭: 전부, 차례: 차례 };
  }

  /* 저장 전 검사 — 이름은 필수, 같은 이름은 물어본다 (설계 §3) */
  function 검사하고저장(값, 뺄id, 이름칸, 끝나면) {
    var 이름 = String(값.이름 || '').trim();
    if (!이름) {
      u.토스트('업체명을 입력하세요');
      u.흔들기(이름칸);
      if (이름칸) 이름칸.focus();
      return;
    }
    값.이름 = 이름;
    var 겹 = ZG.업체자료.이름으로찾기(이름, 뺄id);
    if (겹) {
      u.확인({
        제목: '이미 "' + 겹.이름 + '" 이(가) 있습니다',
        본문: '그래도 추가로 등록할까요?',
        확인글: '그래도 등록'
      }, function (예) { if (예) 끝나면(); });
      return;
    }
    끝나면();
  }

  /* ── 등록 탭 ── */
  function 그리기(부모) {
    var 폰 = u.폰인가();
    var 목 = 칸들(새것, 폰);

    function 저장() {
      검사하고저장(새것, null, 목.밭.이름.입력, function () {
        ZG.업체자료.등록(Object.assign({}, 새것));
        u.토스트('✓ ' + 새것.이름 + ' 등록 완료');
        새것 = 빈값();
        ZG.업체앱.다시그리기();
      });
    }

    if (폰) {
      목.차례.forEach(function (k) { 부모.appendChild(목.밭[k]); });
      var 저장단추 = 만들기('button', { class: 'ph-save', type: 'button', text: '저장하고 다음 등록' });
      저장단추.addEventListener('click', 저장);
      부모.appendChild(저장단추);
      부모.appendChild(만들기('div', {
        class: 'noteline',
        html: '사업자번호·입금계좌·거래조건처럼 긴 항목은 <b>PC화면</b>에서 채우시면 편합니다.'
      }));
      return;
    }

    var 격자 = 만들기('div', { class: 'fgrid' });
    목.차례.forEach(function (k) { 격자.appendChild(목.밭[k]); });
    격자.appendChild(만들기('div', { class: 's4' }, [자사줄(새것, function (v) { 새것.내업체 = v; })]));

    var 되돌리기 = 만들기('button', { class: 'btn', type: 'button', text: '초기화' });
    되돌리기.addEventListener('click', function () { 새것 = 빈값(); ZG.업체앱.다시그리기(); });
    var 등록단추 = 만들기('button', { class: 'btn main wide', type: 'button', text: '업체 등록' });
    등록단추.addEventListener('click', 저장);

    부모.appendChild(만들기('div', { class: 'card' }, [
      만들기('h3', { html: '새 업체 등록' }),
      격자,
      만들기('div', { class: 'formfoot' }, [되돌리기, 등록단추])
    ]));
  }

  function 요약() {
    var 오늘 = u.오늘문자();
    var 셈 = ZG.업체자료.목록().filter(function (c) {
      return ZG.계산.날짜문자(c.등록일시) === 오늘;
    }).length;
    return { 왼: '', 오: '오늘 등록 <b>' + 셈 + '</b>곳' };
  }

  /* ── 수정 — PC 는 시트, 폰도 같은 시트를 전체화면으로 쓴다 ── */
  function 수정열기(id) {
    var 원본 = ZG.업체자료.찾기(id);
    if (!원본) return;
    var 값 = Object.assign(빈값(), 원본);
    var 목 = 칸들(값, false);

    var 막 = 만들기('div', { class: 'pcscrim' });
    var 시트 = 만들기('div', { class: 'pcsheet', role: 'dialog', 'aria-modal': 'true' });

    function 닫기() {
      u.탈출풀기();
      if (막.parentNode) 막.remove();
      if (시트.parentNode) 시트.remove();
    }

    var 닫기단추 = 만들기('button', { class: 'x', type: 'button', text: '×', 'aria-label': '닫기' });
    닫기단추.addEventListener('click', 닫기);

    var 격자 = 만들기('div', { class: 'fgrid', style: u.폰인가() ? null : 'grid-template-columns:repeat(2,1fr)' });
    목.차례.forEach(function (k) {
      var 밭 = 목.밭[k];
      if (밭.classList.contains('s2') || 밭.classList.contains('s4')) {
        밭.classList.remove('s2'); 밭.classList.add('s4');
      }
      격자.appendChild(밭);
    });
    격자.appendChild(만들기('div', { class: 's4' }, [자사줄(값, function (v) { 값.내업체 = v; })]));

    var 지우기 = 만들기('button', { class: 'btn del', type: 'button', text: '삭제' });
    지우기.addEventListener('click', function () {
      u.확인({
        제목: '「' + (원본.이름 || '') + '」 을(를) 지울까요?',
        본문: '연관된 입고 내역은 그대로 남습니다.',
        확인글: '삭제', 위험: true
      }, function (예) {
        if (!예) return;
        ZG.업체자료.삭제(id);
        u.토스트('🗑 업체를 지웠습니다');
        닫기();
        ZG.업체앱.다시그리기();
      });
    });

    var 취소 = 만들기('button', { class: 'btn', type: 'button', text: '취소' });
    취소.addEventListener('click', 닫기);
    var 저장 = 만들기('button', { class: 'btn main', type: 'button', text: '저장' });
    저장.addEventListener('click', function () {
      검사하고저장(값, id, 목.밭.이름.입력, function () {
        ZG.업체자료.수정(id, {
          이름: 값.이름, 구분: 값.구분, 대표: 값.대표, 사업자번호: 값.사업자번호,
          전화: 값.전화, 이메일: 값.이메일, 주소: 값.주소, 담당자: 값.담당자,
          담당자전화: 값.담당자전화, 취급품목: 값.취급품목, 입금계좌: 값.입금계좌,
          거래조건: 값.거래조건, 메모: 값.메모, 내업체: 값.내업체
        });
        u.토스트('✓ 업체정보를 고쳤습니다');
        닫기();
        ZG.업체앱.다시그리기();
      });
    });

    시트.appendChild(만들기('div', { class: 'hd' }, [
      만들기('h3', { text: '업체 수정' }),
      만들기('div', { class: 'right' }, [닫기단추])
    ]));
    시트.appendChild(만들기('div', { class: 'bd' }, [
      격자,
      만들기('div', { class: 'btnrow' }, [지우기, 만들기('span', { class: 'spacer' }), 취소, 저장])
    ]));

    막.addEventListener('click', 닫기);
    document.body.appendChild(막);
    document.body.appendChild(시트);
    u.탈출걸기(닫기);          // Esc 주인은 하나다 (04-공통UI)
    setTimeout(function () { 목.밭.이름.입력.focus(); }, 30);
  }

  ZG.업체폼 = { 그리기: 그리기, 요약: 요약, 수정열기: 수정열기 };
})(window.ZG);
