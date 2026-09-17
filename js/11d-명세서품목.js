/* 11d-명세서품목 — 명세서에 품목을 넣는 칸 세 가지 (3단계 설계 §4)
   PC 는 문서 아래 한 줄 · 폰은 창 · 미등록 품목은 직접 입력창. 넣은 뒤 표 갱신은 11b 가 한다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  function 명 () { return ZG.명세서; }
  function 계 () { return ZG.명세서계산; }

  /* ── 문서 아래 한 줄 (폰 창에서도 같은 것을 쓴다) ── */
  function 품목부품() {
    var 고른 = null;
    var 검색 = 만들기('input', { class: 'inp wide', type: 'text', placeholder: '🔍 품목코드·유통명으로 찾기', 'aria-label': '품목 찾기' });
    var 감쌈 = 만들기('div', { class: 'wide acwrap' }, [검색]);
    var 수량 = 만들기('input', { class: 'inp num', type: 'number', min: '1', style: 'width:90px', placeholder: '수량', 'aria-label': '수량' });
    var 단가 = 만들기('input', { class: 'inp num', type: 'number', min: '0', style: 'width:110px', placeholder: '단가', 'aria-label': '단가' });

    u.자동완성({
      입력: 검색, 담을곳: 감쌈,
      고름: function (g) {
        고른 = 명().묶음에서품목(g);
        검색.value = (고른.품목코드 ? '[' + 고른.품목코드 + '] ' : '') + 고른.유통명;
        if (고른.매입단가) 단가.value = String(계().단가(고른.매입단가, 명().할인율()));
        수량.focus();
      }
    });
    검색.addEventListener('input', function () { 고른 = null; });   // 값만 지운다 — 다시 그리지 않으니 조합이 안 끊긴다

    function 추가() {
      if (!고른) {
        var 후보 = u.후보찾기(검색.value.trim());
        if (후보.length) 고른 = 명().묶음에서품목(후보[0]);
      }
      var 수 = Number(수량.value) || 1;
      var 값 = Number(단가.value) || 0;

      if (!고른) {                                   // 목록에 없으면 적은 글자를 그대로 미등록 품목으로 넣는다
        var 이름 = 검색.value.trim();
        if (!이름) { u.토스트('품목명을 입력해 주세요'); 검색.focus(); return; }
        if (값 <= 0) { u.토스트('단가를 입력해 주세요'); 단가.focus(); return; }
        if (!명().줄넣기({ 품목코드: '', 유통명: 이름, 학명: '', 규격: '', 수량: 수, 단가: 값, 매입단가: 0, 과세구분: '면세' })) return;
      } else {
        if (값 <= 0 && 고른.매입단가) 값 = 계().단가(고른.매입단가, 명().할인율());
        if (값 <= 0) { u.토스트('단가를 입력해 주세요 (또는 매입가가 있는 품목을 고르세요)'); 단가.focus(); return; }
        if (!명().줄넣기({
          품목코드: 고른.품목코드, 유통명: 고른.유통명, 학명: 고른.학명, 규격: 고른.규격,
          수량: 수, 단가: 값, 매입단가: 고른.매입단가, 과세구분: 고른.과세구분
        })) { 검색.focus(); return; }
      }
      검색.value = ''; 수량.value = ''; 단가.value = ''; 고른 = null; 검색.focus();
    }

    [검색, 수량, 단가].forEach(function (칸) {
      칸.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); 추가(); }
      });
    });
    return { 감쌈: 감쌈, 수량: 수량, 단가: 단가, 추가: 추가 };
  }

  /* ── 등록 안 된 품목을 손으로 넣는 창 ── */
  function 직접입력창() {
    var 막 = 만들기('div', { class: 'pcscrim' });
    var 시트 = 만들기('div', { class: 'pcsheet', role: 'dialog', 'aria-modal': 'true' });
    function 닫기() { u.탈출풀기(); 막.remove(); 시트.remove(); }

    function 밭(라벨, 옵션) {
      var 입력 = 만들기('input', Object.assign({ class: 'inp', type: 'text' }, 옵션 || {}));
      var 상자 = 만들기('div', { class: 'field' }, [만들기('label', { text: 라벨 }), 입력]);
      상자.입력 = 입력;
      return 상자;
    }
    var 이름 = 밭('품목명 *'), 규격 = 밭('규격'), 학명 = 밭('학명');
    var 수량 = 밭('수량', { type: 'number', min: '1', value: '1', class: 'inp num' });
    var 단가 = 밭('단가', { type: 'number', min: '0', class: 'inp num' });
    [이름, 규격, 학명].forEach(function (f) { u.조합안전입력(f.입력, function () {}, 200); });

    var 과세 = 만들기('input', { type: 'checkbox' });
    var 과세줄 = 만들기('label', { class: 'field', style: 'flex-direction:row;align-items:center;gap:8px' }, [
      과세, 만들기('span', { text: '과세 품목 (세액 10%)' })
    ]);

    var 취소 = 만들기('button', { class: 'btn', type: 'button', text: '취소' });
    취소.addEventListener('click', 닫기);
    var 넣기 = 만들기('button', { class: 'btn main', type: 'button', text: '넣기' });
    넣기.addEventListener('click', function () {
      var n = 이름.입력.value.trim(), q = Number(수량.입력.value) || 0, p = Number(단가.입력.value) || 0;
      if (!n) { u.토스트('품목명을 입력해 주세요'); u.흔들기(이름.입력); return; }
      if (q <= 0) { u.토스트('수량을 1 이상 넣어 주세요'); u.흔들기(수량.입력); return; }
      if (p <= 0) { u.토스트('단가를 0보다 크게 넣어 주세요'); u.흔들기(단가.입력); return; }
      var 됨 = 명().줄넣기({
        품목코드: '', 유통명: n, 학명: 학명.입력.value.trim(), 규격: 규격.입력.value.trim(),
        수량: q, 단가: p, 매입단가: 0, 과세구분: 과세.checked ? '과세' : '면세'
      });
      if (됨) 닫기();
    });

    var 닫기x = 만들기('button', { class: 'x', type: 'button', text: '×', 'aria-label': '닫기' });
    닫기x.addEventListener('click', 닫기);
    시트.appendChild(만들기('div', { class: 'hd' }, [
      만들기('h3', { text: '✏️ 직접 입력' }), 만들기('div', { class: 'right' }, [닫기x])
    ]));
    시트.appendChild(만들기('div', { class: 'bd' }, [
      이름, 만들기('div', { class: 'pair' }, [규격, 학명]),
      만들기('div', { class: 'pair' }, [수량, 단가]), 과세줄,
      만들기('div', { class: 'btnrow' }, [취소, 넣기])
    ]));
    막.addEventListener('click', 닫기);
    document.body.appendChild(막); document.body.appendChild(시트);
    u.탈출걸기(닫기);
    setTimeout(function () { 이름.입력.focus(); }, 30);
  }

  /* ── 폰 — 같은 부품을 창에 담는다 ── */
  function 폰품목창() {
    var 막 = 만들기('div', { class: 'pcscrim' });
    var 시트 = 만들기('div', { class: 'pcsheet', role: 'dialog', 'aria-modal': 'true' });
    function 닫기() { u.탈출풀기(); 막.remove(); 시트.remove(); }
    var 넣기 = 품목부품();
    var 추가 = 만들기('button', { class: 'btn main wide', type: 'button', text: '＋ 넣기' });
    추가.addEventListener('click', function () { 넣기.추가(); });
    var 직접 = 만들기('button', { class: 'btn', type: 'button', text: '✏️ 직접 입력' });
    직접.addEventListener('click', function () { 닫기(); 직접입력창(); });
    var 닫기x = 만들기('button', { class: 'x', type: 'button', text: '×', 'aria-label': '닫기' });
    닫기x.addEventListener('click', 닫기);
    시트.appendChild(만들기('div', { class: 'hd' }, [
      만들기('h3', { text: '품목 넣기' }), 만들기('div', { class: 'right' }, [닫기x])
    ]));
    시트.appendChild(만들기('div', { class: 'bd' }, [
      넣기.감쌈,
      만들기('div', { class: 'pair' }, [넣기.수량, 넣기.단가]),
      만들기('div', { class: 'btnrow' }, [직접, 추가])
    ]));
    막.addEventListener('click', 닫기);
    document.body.appendChild(막); document.body.appendChild(시트);
    u.탈출걸기(닫기);
  }

  ZG.명세서품목 = { 품목부품: 품목부품, 직접입력창: 직접입력창, 폰품목창: 폰품목창 };
})(window.ZG);
