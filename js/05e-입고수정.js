/* 05e-입고수정 — 입고 한 건 고치기 · 지우기 (설계 §16-1)
   ★ 재고 반영: 원본 입고 레코드를 실제로 고치거나 지운다.
     현재고는 조정 스냅샷 이후의 입고 · 출고 합산이라(§7) 저절로 맞는다.
     상쇄용 재고조정을 따로 만들지 않는다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 내 = ZG.입고내부, 상태 = 내.상태;
  var 열림 = null;

  function 기록찾기(id) {
    return ZG.저장소.읽기(ZG.저장소.키.입고).find(function (r) { return r.id === id; });
  }

  function 짐싸기(id) {
    var r = 기록찾기(id);
    if (!r) return null;
    /* 🔴 판매단위는 입고 기록이 아니라 품목 것이다 — 품목에서 읽고 저장도 품목에 한다 */
    var 품 = ZG.저장소.읽기(ZG.저장소.키.품목).find(function (p) { return p.품목코드 === r.품목코드; }) || {};
    return {
      기록: r, 오류: {},
      원래: { 입고일: r.입고일, 입고업체: r.입고업체, 유통명: r.유통명, 학명: r.학명, 규격: r.규격, 수량: r.수량, 매입단가: r.매입단가, 과세구분: r.과세구분, 메모: r.메모 || '',
              판매단위: 품.판매단위 || 1 },
      값: { 입고일: r.입고일, 입고업체: r.입고업체, 유통명: r.유통명, 학명: r.학명, 규격: r.규격, 규격cm: null, 수량: r.수량, 매입단가: r.매입단가, 과세구분: r.과세구분, 메모: r.메모 || '',
            판매단위: 품.판매단위 || 1 }
    };
  }

  function 바뀌었나() {
    if (!열림) return false;
    return Object.keys(열림.원래).some(function (k) { return String(열림.원래[k]) !== String(열림.값[k]); });
  }

  /* ── 폼 ── */
  function 필드(라벨, 내용, 오류이름) {
    var f = 만들기('div', { class: 'field' }, [만들기('label', { html: 라벨 }), 내용]);
    if (오류이름) {
      var e = 만들기('div', { class: 'err' });
      열림.오류[오류이름] = e;
      f.appendChild(e);
    }
    return f;
  }

  function 오류보이기(이름, 글) { if (열림.오류[이름]) 열림.오류[이름].textContent = 글; }
  function 오류지우기(이름) { 오류보이기(이름, ''); }

  function 글칸(이름, 옵션) {
    var e = 만들기('input', Object.assign({ class: 'inp', type: 'text' }, 옵션 || {}));
    e.value = 열림.값[이름] == null ? '' : String(열림.값[이름]);
    e.addEventListener('input', function () { if (!열림) return; 열림.값[이름] = e.value; 오류지우기(이름); });
    열림.칸[이름] = e;
    return e;
  }

  function 수칸(이름) {
    var e = 만들기('input', { class: 'inp num', type: 'text', inputmode: 'numeric' });
    e.value = u.콤마(열림.값[이름]);
    e.addEventListener('input', function () { if (!열림) return; 열림.값[이름] = u.숫자(e.value); 오류지우기(이름); 금액다시(); });
    // 시트를 열자마자 닫으면(Esc) 패널이 사라진 뒤에 blur 가 온다 — 그때 열림 은 이미 null
    e.addEventListener('blur', function () { if (!열림) return; e.value = u.콤마(열림.값[이름]); });
    열림.칸[이름] = e;
    return e;
  }

  function 금액다시() {
    if (열림 && 열림.금액칸) 열림.금액칸.value = u.콤마((Number(열림.값.수량) || 0) * (Number(열림.값.매입단가) || 0));
  }

  function 업체칸() {
    var 업체 = ZG.저장소.읽기(ZG.저장소.키.업체);
    var e = 글칸('입고업체', { list: 'zg-업체목록-수정' });
    var 목록 = 만들기('datalist', { id: 'zg-업체목록-수정' });
    목록.innerHTML = 업체.map(function (c) { return '<option value="' + u.안전(c.이름) + '">'; }).join('');
    return 만들기('div', { style: 'position:relative' }, [e, 목록]);
  }

  function 과세칸() {
    var 상자 = 만들기('div', { class: 'toggle' });
    ['과세', '면세'].forEach(function (값) {
      var b = 만들기('button', { type: 'button', text: 값, class: 열림.값.과세구분 === 값 ? 'on' : '' });
      b.addEventListener('click', function () {
        열림.값.과세구분 = 값;
        Array.prototype.forEach.call(상자.children, function (c) { c.classList.toggle('on', c === b); });
      });
      상자.appendChild(b);
    });
    return 상자;
  }

  /* 판매단위 = 한 번에 파는 수(구근 5구 한 묶음 등) */
  function 단위칸() {
    var e = 만들기('input', { class: 'inp num', type: 'text', inputmode: 'numeric', value: 열림.값.판매단위 });
    e.addEventListener('input', function () { if (열림) 열림.값.판매단위 = e.value; });
    e.addEventListener('blur', function () { if (!열림) return; 열림.값.판매단위 = u.숫자(e.value) || 1; e.value = 열림.값.판매단위; });
    return e;
  }

  function 폼조각() {
    열림.칸 = {};
    // 품목코드에 규격 숫자가 박혀 있다(ANW02-21 의 -21). 코드가 고정이면 규격도 고정이다
    var 규격 = 만들기('input', { class: 'inp readonly', value: 열림.값.규격, disabled: 'disabled' });
    열림.금액칸 = 만들기('input', { class: 'inp num code', readonly: 'readonly' });

    var 조각 = [
      필드('입고일 <span class="req">*</span>', 글칸('입고일', { type: 'date' }), '입고일'),
      필드('입고업체 <span class="req">*</span>', 업체칸(), '입고업체'),
      필드('유통명 <span class="req">*</span>', 글칸('유통명'), '유통명'),
      필드('학명', 글칸('학명', { class: 'inp sci' })),
      만들기('div', { class: 'pair' }, [
        필드('규격 <span class="auto">🔒 못 고침</span>', 규격, '규격'),
        필드('수량 <span class="req">*</span>', 수칸('수량'), '수량')
      ]),
      만들기('div', { class: 'pair' }, [
        필드('판매단위', 단위칸())
      ]),
      만들기('div', { class: 'pair' }, [
        필드('매입단가 <span class="req">*</span>', 수칸('매입단가'), '매입단가'),
        필드('금액 <span class="auto">자동 계산</span>', 열림.금액칸)
      ]),
      필드('과세 · 면세', 과세칸()),
      필드('메모 <span class="auto">선택</span>', 글칸('메모', { placeholder: '예) 잎 상태 좋음' })),
      필드('품목코드 <span class="auto">🔒 못 고침</span>',
        만들기('input', { class: 'inp code', value: 열림.기록.품목코드, disabled: 'disabled' }))
    ];
    금액다시();
    return 조각;
  }

  /* ── 검사 · 저장 ── */
  function 검사() {
    var 값 = 열림.값;
    Object.keys(열림.오류).forEach(오류지우기);
    function 튕김(이름, 글) {
      오류보이기(이름, 글); u.토스트(글);
      var 칸 = 열림.칸[이름];
      if (칸) { u.흔들기(칸); 칸.focus(); }
      return false;
    }
    if (!값.입고일) return 튕김('입고일', '입고일자를 넣어주세요');
    if (!String(값.입고업체).trim()) return 튕김('입고업체', '입고업체를 넣어주세요');
    if (!String(값.유통명).trim()) return 튕김('유통명', '유통명을 넣어주세요');
    if (!String(값.규격).trim()) return 튕김('규격', '규격을 넣어주세요');
    var 수량 = Number(값.수량);
    if (!(수량 >= 1) || 수량 !== Math.floor(수량)) return 튕김('수량', '수량은 1 이상 정수로 넣어주세요');
    if (!(Number(값.매입단가) >= 0)) return 튕김('매입단가', '매입단가를 확인해 주세요');
    return true;
  }

  function 저장() {
    if (!검사()) return;
    ZG.입고.업체확인(String(열림.값.입고업체).trim(), function (계속할까) {
      if (계속할까) 저장진행();
    });
  }

  function 저장진행() {
    var 값 = 열림.값, id = 열림.기록.id;
    var 변경 = {
      입고일: 값.입고일,
      입고업체: String(값.입고업체).trim(),
      유통명: String(값.유통명).trim(),
      학명: String(값.학명).trim(),
      규격: String(값.규격).trim(),
      수량: Number(값.수량),
      매입단가: Number(값.매입단가),
      과세구분: 값.과세구분,
      메모: String(값.메모).trim(),
      수정일시: Date.now()
    };
    ZG.저장소.바꾸기(ZG.저장소.키.입고, id, 변경);   // 원본을 고친다 → 현재고가 저절로 따라온다

    /* 판매단위는 품목 것이라 품목에 쓴다 — 입고 기록에는 안 남긴다 */
    var 새단위 = u.숫자(값.판매단위) || 1;
    if (String(새단위) !== String(열림.원래.판매단위)) {
      ZG.저장소.바꾸기(ZG.저장소.키.품목, 열림.기록.품목코드,
                      { 판매단위: 새단위, 수정일시: Date.now() });
    }
    ZG.입고.업체반영(변경.입고업체);

    상태.방금저장 = id;
    var 글 = '고쳤습니다 — ' + 변경.유통명 + ' ' + u.콤마(변경.수량) + '주';
    닫기(true);
    u.토스트(글);
  }

  /* ── 삭제 ── */
  function 지우기묻기(기록) {
    u.확인({
      제목: '이 입고를 지울까요?',
      본문: '<b>' + u.안전(기록.유통명) + '</b> · ' + u.콤마(기록.수량) + '주 · ' +
        u.안전(기록.입고일) + '<br>지우면 되돌릴 수 없고, 재고도 그만큼 줄어듭니다.',
      확인글: '삭제', 위험: true
    }, function (예) {
      if (!예) return;
      ZG.저장소.지우기(ZG.저장소.키.입고, 기록.id);
      if (열림 && 열림.기록.id === 기록.id) 닫기(true);
      else 다시그리기();
      u.토스트('지웠습니다 — ' + 기록.유통명 + ' ' + u.콤마(기록.수량) + '주');
    });
  }

  function 다시그리기() {
    ZG.입고내역.내역다시();
    ZG.재고 && ZG.재고.일자다시 && ZG.재고.일자다시();   // 재고 일자별에서 열었을 때 (2026-09-15)
    ZG.앱 && ZG.앱.요약다시();
  }

  /* ── 열고 닫기 — PC 는 시트, 폰은 화면 전환 ── */
  function 열기(id, 누른단추, 줄) {
    if (u.폰인가()) { 폰상세열기(id); return; }
    if (열림) 닫기(false);
    var 짐 = 짐싸기(id);
    if (!짐) return;
    열림 = 짐;
    열림.되돌릴포커스 = 누른단추;
    열림.줄 = 줄;
    if (줄 && 줄.style) 줄.style.background = 'var(--color-accent-bg)';

    var 스크림 = 만들기('div', { class: 'editscrim' });
    스크림.addEventListener('click', 닫기묻기);

    var 패널 = 만들기('div', { class: 'editpanel', role: 'dialog', 'aria-modal': 'true', 'aria-label': '입고 수정' });
    패널.appendChild(만들기('h3', { text: '입고 수정' }));
    패널.appendChild(만들기('div', {
      class: 'sub', html: u.안전(열림.기록.품목코드) + ' · ' + u.안전(열림.기록.입고일)
    }));
    폼조각().forEach(function (c) { 패널.appendChild(c); });

    var 삭제 = 만들기('button', { class: 'btn warn', type: 'button', text: '삭제' });
    삭제.addEventListener('click', function () { 지우기묻기(열림.기록); });
    var 취소 = 만들기('button', { class: 'btn', type: 'button', text: '취소' });
    취소.addEventListener('click', 닫기묻기);
    var 저장단추 = 만들기('button', { class: 'btn main', type: 'button', text: '저장' });
    저장단추.addEventListener('click', 저장);
    패널.appendChild(만들기('div', { class: 'btnrow' }, [삭제, 취소, 저장단추]));

    열림.패널 = 패널; 열림.스크림 = 스크림;
    /* 붙일 곳 — 입고 화면이면 제 감쌈, 재고 일자별에서 열었으면 지금 떠 있는 화면의 editwrap.
       입고 화면의 감쌈은 탭을 옮기면 화면에서 떨어져 나가 그대로 쓰면 창이 안 보인다 (2026-09-15) */
    var 감쌈 = 내.참조.감쌈;
    if (!감쌈 || !감쌈.isConnected) 감쌈 = document.querySelector('.editwrap');
    if (!감쌈) return;
    감쌈.appendChild(스크림);
    감쌈.appendChild(패널);
    document.body.style.overflow = 'hidden';
    패널.addEventListener('keydown', 가두기);
    document.addEventListener('keydown', 탈출);
    setTimeout(function () { if (열림 && 열림.칸.수량) 열림.칸.수량.focus(); }, 30);
  }

  function 가두기(e) {
    if (e.key !== 'Tab' || !열림 || !열림.패널) return;
    var 것들 = 열림.패널.querySelectorAll('button, input:not([disabled])');
    if (!것들.length) return;
    var 처음 = 것들[0], 끝 = 것들[것들.length - 1];
    if (e.shiftKey && document.activeElement === 처음) { e.preventDefault(); 끝.focus(); }
    else if (!e.shiftKey && document.activeElement === 끝) { e.preventDefault(); 처음.focus(); }
  }

  function 탈출(e) { if (e.key === 'Escape' && 열림 && 열림.패널) { e.preventDefault(); 닫기묻기(); } }

  function 닫기묻기() {
    if (document.querySelector('.askbox')) return;
    if (!바뀌었나()) { 닫기(false); return; }
    u.확인({ 제목: '고친 것을 버릴까요?', 확인글: '버리기', 위험: true }, function (예) { if (예) 닫기(false); });
  }

  function 닫기(고쳤나) {
    if (!열림) return;
    if (상태.수정id) {           // 폰 상세
      상태.수정id = null; 열림 = null;
      ZG.앱.다시그리기();
      window.scrollTo(0, 상태.스크롤 || 0);
      return;
    }
    var 패널 = 열림.패널, 스크림 = 열림.스크림, 되돌릴 = 열림.되돌릴포커스, 줄 = 열림.줄;
    document.removeEventListener('keydown', 탈출);
    document.body.style.overflow = '';
    열림 = null;
    if (!패널) return;
    var 시간 = u.움직임끔() ? 0 : 220;
    패널.getAnimations().forEach(function (a) { a.cancel(); });
    패널.animate([{ transform: 'none' }, { transform: 'translateX(100%)' }], { duration: 시간, easing: 'cubic-bezier(.4,0,1,1)' });
    스크림.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 시간, easing: 'cubic-bezier(.4,0,1,1)' });
    setTimeout(function () {
      if (패널.parentNode) 패널.parentNode.removeChild(패널);
      if (스크림.parentNode) 스크림.parentNode.removeChild(스크림);
      if (줄 && 줄.style) 줄.style.background = '';
      if (고쳤나) 다시그리기();
      else if (되돌릴 && 되돌릴.focus) 되돌릴.focus();
    }, 시간);
  }

  /* ── 폰 상세 (설계 §8-3 과 같은 방식) ── */
  function 폰상세열기(id) {
    상태.수정id = id;
    상태.스크롤 = window.scrollY;
    ZG.앱.다시그리기();
    window.scrollTo(0, 0);
  }

  function 폰상세그리기(뿌리) {
    var 짐 = 짐싸기(상태.수정id);
    if (!짐) { 상태.수정id = null; ZG.입고.그리기(뿌리); return; }
    열림 = 짐;
    뿌리.classList.add('화면등장');
    폼조각().forEach(function (c) { 뿌리.appendChild(c); });

    var 삭제 = 만들기('button', { class: 'btn warn', type: 'button', text: '이 입고 삭제' });
    삭제.addEventListener('click', function () { 지우기묻기(열림.기록); });
    뿌리.appendChild(삭제);

    var 저장단추 = 만들기('button', { class: 'ph-save', type: 'button', text: '저장' });
    저장단추.addEventListener('click', 저장);
    뿌리.appendChild(저장단추);
    setTimeout(function () { 뿌리.classList.remove('화면등장'); }, 340);
  }

  function 폰상세머리() {
    var r = 열림 ? 열림.기록 : 기록찾기(상태.수정id);
    if (!r) return { 제목: '입고', 뒤로: null, 왼: '', 오: '' };
    return {
      제목: r.유통명, 작게: true, 뒤로: 폰상세닫기, 뒤로글: '‹ 입고 내역',
      왼: u.안전(r.품목코드) + ' · ' + u.안전(r.규격),
      오: u.콤마(r.수량) + '주 · ' + u.안전(r.입고일)
    };
  }

  function 폰상세닫기() {
    if (!바뀌었나()) { 닫기(false); return; }
    u.확인({ 제목: '고친 것을 버릴까요?', 확인글: '버리기', 위험: true }, function (예) { if (예) 닫기(false); });
  }

  ZG.입고수정 = {
    열기: 열기, 지우기묻기: 지우기묻기,
    폰상세그리기: 폰상세그리기, 폰상세머리: 폰상세머리, 폰상세닫기: 폰상세닫기
  };
})(window.ZG);
