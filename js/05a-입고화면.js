/* 05a-입고화면 — 입고 등록 폼 (설계 §4-1 · §6-5) */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = ZG.ui.만들기;

  var 상태 = {
    입고일: '', 입고업체: '', 유통명: '', 학명: '',
    규격cm: null, 직접규격: '', 수량: '', 매입단가: '', 과세구분: '면세', 메모: '',
    코드결과: null, 고른갈래: null, 기존품목: null, 코드: '',
    기간: '오늘', 수정id: null
  };
  var 참조 = { 오류: {} };

  /* ── 인라인 오류 — 문제 있는 칸 바로 아래 빨간 줄 (설계 §16-4) ── */
  function 오류보이기(이름, 글) {
    var e = 참조.오류[이름];
    if (e) e.textContent = 글;
  }
  function 오류지우기(이름) { 오류보이기(이름, ''); }
  function 오류전부지우기() { Object.keys(참조.오류).forEach(오류지우기); }

  function 필드(라벨, 내용, 스타일, 오류이름) {
    var f = 만들기('div', { class: 'field', style: 스타일 || null });
    if (라벨) f.appendChild(만들기('label', { html: 라벨 }));
    f.appendChild(내용);
    if (오류이름) {
      var e = 만들기('div', { class: 'err' });
      참조.오류[오류이름] = e;
      f.appendChild(e);
    }
    return f;
  }

  function 입력칸(이름, 옵션) {
    var e = 만들기('input', Object.assign({ class: 'inp', type: 'text' }, 옵션 || {}));
    e.value = 상태[이름] == null ? '' : 상태[이름];
    e.addEventListener('input', function () { 상태[이름] = e.value; 오류지우기(이름); });
    참조[이름] = e;
    return e;
  }

  /* ── 규격 .seg ── */
  var 규격목록 = [[10, '4치'], [15, '5치'], [18, '6치'], [21, '7치'], [27, '9치']];

  function 규격칸() {
    var 상자 = 만들기('div', { class: 'seg' });
    참조.규격단추 = [];
    규격목록.forEach(function (쌍) {
      var b = 만들기('button', { type: 'button', html: 쌍[0] + 'cm<i>' + 쌍[1] + '</i>' });
      b.dataset.cm = 쌍[0];
      b.addEventListener('click', function () { 규격고름(쌍[0]); });
      참조.규격단추.push(b);
      상자.appendChild(b);
    });
    var 직접 = 만들기('button', { type: 'button', html: '직접입력<i>그 밖의 규격</i>' });
    직접.dataset.cm = '직접';
    직접.addEventListener('click', function () { 직접규격묻기(); });
    참조.규격단추.push(직접);
    상자.appendChild(직접);

    참조.규격오류 = 만들기('div', { class: 'err' });
    참조.오류.규격 = 참조.규격오류;
    var 감쌈 = 만들기('div', { class: 'stack' }, [상자, 참조.규격오류]);
    규격표시();
    return 감쌈;
  }

  function 규격표시() {
    if (!참조.규격단추) return;
    참조.규격단추.forEach(function (b) {
      var 기본 = b.dataset.cm !== '직접' && Number(b.dataset.cm) === 상태.규격cm;
      var 직접켜짐 = b.dataset.cm === '직접' && 상태.규격cm != null &&
        !규격목록.some(function (쌍) { return 쌍[0] === 상태.규격cm; });
      b.classList.toggle('on', 기본 || 직접켜짐);
      // 「화분묘 아님」은 그대로, 숫자 규격은 단추가 좁아 「15cm」로 줄여 쓴다
      if (직접켜짐) b.innerHTML = ZG.품목코드.규격이름(상태.규격cm).replace(/cm 포트$/, 'cm') + '<i>직접입력</i>';
      else if (b.dataset.cm === '직접') b.innerHTML = '직접입력<i>그 밖의 규격</i>';
    });
  }

  function 규격고름(cm) {
    상태.규격cm = cm;
    참조.규격오류.textContent = '';
    규격표시();
    코드갱신();
  }

  function 직접규격묻기() {
    var 답 = window.prompt('규격을 넣어주세요 (숫자만 · 「7치」처럼 치도 됩니다)', 상태.직접규격 || '');
    if (답 == null) return;
    var 결과 = ZG.품목코드.규격정규화(답);
    if (결과.오류) { 참조.규격오류.textContent = 결과.오류; u.흔들기(참조.규격오류.parentNode); return; }
    상태.직접규격 = 답;
    규격고름(결과.규격cm);
  }

  /* ── 품목코드 계산 · 중복경고 (설계 §6-5) ── */
  function 코드갱신() {
    var 경고 = 참조.경고칸;
    if (경고) u.비우기(경고);
    상태.코드결과 = null; 상태.기존품목 = null;

    if (!상태.학명.trim() || 상태.규격cm == null) { 코드칸쓰기('', '자동 생성'); 저장잠금(false); return; }

    var 품목 = ZG.저장소.읽기(ZG.저장소.키.품목);
    var 결과 = ZG.품목코드.코드계산(상태.학명, 상태.규격cm, 품목);
    상태.코드결과 = 결과;

    if (결과.상태 === '오류') { 코드칸쓰기('', '만들 수 없음'); 경고그리기단문(결과.메시지); 저장잠금(true); return; }
    if (결과.상태 === '새것') { 상태.코드 = 결과.코드; 코드칸쓰기(결과.코드, '자동 생성 · 새 품목'); 저장잠금(false); return; }
    if (결과.상태 === '이미있음') {
      상태.코드 = 결과.코드; 상태.기존품목 = 결과.기존품목;
      코드칸쓰기(결과.코드, '기존 품목');
      저장잠금(false);
      return;
    }
    // 확인필요
    if (결과.기본선택 === '같은식물') { 상태.고른갈래 = '같은식물'; 상태.코드 = 결과.확정코드; 저장잠금(false); }
    else { 상태.고른갈래 = null; 상태.코드 = ''; 저장잠금(true); }
    코드칸쓰기(상태.코드, 상태.코드 ? '자동 생성' : '어느 쪽인지 골라주세요');
    경고그리기(결과);
  }

  function 코드칸쓰기(코드, 라벨) {
    상태.코드 = 코드;
    if (참조.코드) 참조.코드.value = 코드;
    if (참조.코드라벨) 참조.코드라벨.textContent = 라벨;
  }

  function 저장잠금(잠글까) {
    (참조.저장단추들 || []).forEach(function (b) { b.disabled = 잠글까; });
  }

  function 경고그리기단문(글) {
    if (!참조.경고칸) return;
    참조.경고칸.appendChild(만들기('div', { class: 'alert', role: 'alert' }, [
      만들기('h4', { text: '⚠ ' + 글 })
    ]));
  }

  function 충돌표(충돌) {
    var 장 = ZG.계산.장부();
    var 표 = 만들기('table', { style: 'margin-top:var(--space-lg); background:var(--color-surface); border-radius:var(--radius-md); overflow:hidden' });
    표.innerHTML = '<colgroup><col style="width:112px"><col style="width:150px"><col>' +
      '<col style="width:104px"><col style="width:78px"></colgroup>' +
      '<tr><th>품목코드</th><th>유통명</th><th>학명</th><th>규격</th><th class="r">현재고</th></tr>';
    충돌.forEach(function (p) {
      표.innerHTML += '<tr><td class="code" style="color:var(--color-danger)">' + u.안전(p.품목코드) + '</td>' +
        '<td>' + u.안전(p.유통명) + '</td><td class="sci">' + u.안전(p.학명) + '</td>' +
        '<td class="dim">' + u.안전(p.규격) + '</td>' +
        '<td class="r">' + u.콤마(ZG.계산.현재고(p.품목코드, 장)) + '</td></tr>';
    });
    return 표;
  }

  function 갈래단추(제목, 설명, 코드, 좋음, 갈래) {
    var b = 만들기('button', { type: 'button' }, [
      만들기('div', {}, [만들기('div', { class: 't', text: 제목 }), 만들기('div', { class: 's', text: 설명 })]),
      만들기('div', { class: 'c ' + (좋음 ? 'ok' : 'no'), text: 코드 })
    ]);
    b.addEventListener('click', function () {
      상태.고른갈래 = 갈래;
      코드칸쓰기(코드, '자동 생성');
      저장잠금(false);
      Array.prototype.forEach.call(b.parentNode.children, function (c) { c.classList.remove('go'); });
      b.classList.add('go');
    });
    return b;
  }

  function 경고그리기(결과) {
    if (!참조.경고칸) return;
    var 폰 = u.폰인가();
    var 상자 = 만들기('div', { class: 'alert', role: 'alert', style: 'margin-top:var(--space-xl)' });
    상자.appendChild(만들기('h4', {
      html: '⚠ 앞 5자 ' + u.안전(결과.접두) + ' 이 이미 쓰이고 있습니다' +
            '<span class="right">' + 결과.충돌.length + '건</span>'
    }));

    if (폰) {
      상자.appendChild(만들기('p', {
        html: 결과.충돌.map(function (p) { return u.안전(p.품목코드) + ' ' + u.안전(p.유통명); }).join(' · ') +
          '<br><b>같은 식물인지 먼저 확인해 주세요.</b>'
      }));
    } else {
      상자.appendChild(만들기('p', {
        html: '이미 쓰고 있는 품목이 <b>' + u.안전(결과.접두) + '</b> 으로 시작합니다. <b>같은 식물인지 먼저 확인해 주세요.</b><br>' +
          '같은 식물이면 번호를 그대로 쓰고, 다른 식물이면 일련번호를 올려야 합니다.'
      }));
      상자.appendChild(충돌표(결과.충돌));
    }

    var 고르기 = 만들기('div', { class: 'pick', style: 폰 ? 'flex-direction:column; gap:var(--space-sm)' : null });
    var 왼 = 갈래단추('같은 식물입니다 — 규격만 다릅니다', '일련번호 ' + 결과.번호같음 + ' 을 그대로 씁니다',
      결과.확정코드, true, '같은식물');
    var 오 = 갈래단추('다른 식물입니다', '일련번호를 ' + 결과.번호다름 + ' 로 올립니다',
      결과.대안코드, false, '다른식물');
    if (결과.기본선택 === '같은식물') 왼.classList.add('go');
    고르기.appendChild(왼); 고르기.appendChild(오);
    상자.appendChild(고르기);

    상자.appendChild(만들기('p', {
      style: 'margin-top:var(--space-lg)',
      html: '🔒 <b>품목코드는 한 번 저장하면 바꿀 수 없습니다.</b> 주문 · 재고 · 명세서가 전부 이 코드로 이어집니다.'
    }));
    참조.경고칸.appendChild(상자);
  }

  /* ── 자동완성으로 고른 것 채우기 (설계 §6-6) ── */
  function 후보채우기(묶음) {
    var 고른 = 묶음.품목들.find(function (p) { return p.규격cm === 상태.규격cm; }) || 묶음.대표;
    오류지우기('유통명'); 오류지우기('학명'); 오류지우기('규격');
    상태.유통명 = 고른.유통명; 상태.학명 = 고른.학명;
    상태.규격cm = 고른.규격cm; 상태.매입단가 = String(고른.매입단가); 상태.과세구분 = 고른.과세구분;
    if (참조.유통명) 참조.유통명.value = 상태.유통명;
    if (참조.학명) 참조.학명.value = 상태.학명;
    if (참조.매입단가) 참조.매입단가.value = u.콤마(상태.매입단가);
    규격표시(); 과세표시(); 금액갱신(); 코드갱신();
    if (참조.수량) 참조.수량.focus();
  }

  function 과세표시() {
    (참조.과세단추 || []).forEach(function (b) { b.classList.toggle('on', b.dataset.값 === 상태.과세구분); });
  }

  function 과세칸() {
    var 상자 = 만들기('div', { class: 'toggle' });
    참조.과세단추 = ['과세', '면세'].map(function (값) {
      var b = 만들기('button', { type: 'button', text: 값 });
      b.dataset.값 = 값;
      b.addEventListener('click', function () { 상태.과세구분 = 값; 과세표시(); });
      상자.appendChild(b);
      return b;
    });
    과세표시();
    return 상자;
  }

  function 금액갱신() {
    if (!참조.금액) return;
    참조.금액.value = u.콤마(u.숫자(상태.수량) * u.숫자(상태.매입단가));
  }

  function 숫자칸(이름, 옵션) {
    var e = 입력칸(이름, Object.assign({ class: 'inp num', inputmode: 'numeric' }, 옵션 || {}));
    if (상태[이름] !== '') e.value = u.콤마(상태[이름]);
    e.addEventListener('input', function () { 상태[이름] = e.value; 오류지우기(이름); 금액갱신(); });
    e.addEventListener('blur', function () { if (e.value.trim()) { e.value = u.콤마(u.숫자(e.value)); 상태[이름] = e.value; } });
    return e;
  }

  ZG.입고내부 = {
    상태: 상태, 참조: 참조, 필드: 필드, 입력칸: 입력칸, 숫자칸: 숫자칸,
    규격칸: 규격칸, 규격표시: 규격표시, 과세칸: 과세칸, 과세표시: 과세표시,
    금액갱신: 금액갱신, 코드갱신: 코드갱신, 후보채우기: 후보채우기, 저장잠금: 저장잠금,
    오류보이기: 오류보이기, 오류지우기: 오류지우기, 오류전부지우기: 오류전부지우기
  };
})(window.ZG);
