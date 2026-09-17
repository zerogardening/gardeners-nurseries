/* 06c-재고수정 — PC 시트 · 폰 상세 (설계 §8-2 · §8-3) */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 목 = ZG.재고목록, 상태 = 목.상태, 참조 = 목.참조;
  var 열림 = null;   // { 품목, 원래, 값, 패널, 스크림, 되돌릴포커스, 줄 }

  function 품목찾기(코드) {
    return ZG.저장소.품목들().find(function (p) { return p.품목코드 === 코드; });
  }

  /* 옛 자료에 남아 있는 특성을 지우지 않으려고 비교만 한다 — 화면에는 더 이상 안 낸다 */
  function 특성글(값) {
    if (!값 || typeof 값 !== 'object') return '';
    return Object.keys(값).sort().map(function (k) {
      return k + '=' + String(값[k] == null ? '' : 값[k]).trim();
    }).join('|');
  }

  function 상자만들기(코드) {
    var 품목 = 품목찾기(코드);
    if (!품목) return null;
    var 장 = ZG.계산.장부();
    var 요 = ZG.계산.요약(품목, 장);
    return {
      품목: 품목, 요약: 요,
      원래: { 현재고: 요.현재고, 유통명: 품목.유통명, 학명: 품목.학명, 규격: 품목.규격, 매입단가: 품목.매입단가, 과세구분: 품목.과세구분, 상태: 품목.상태 },
      원래특성: 특성글(품목.특성),
      값: { 현재고: 요.현재고, 유통명: 품목.유통명, 학명: 품목.학명, 규격: 품목.규격, 규격cm: 품목.규격cm, 매입단가: 품목.매입단가, 과세구분: 품목.과세구분, 상태: 품목.상태 }
    };
  }

  function 바뀌었나() {
    if (!열림) return false;
    if (열림.특성 && 특성글(열림.특성.읽기()) !== 열림.원래특성) return true;
    return Object.keys(열림.원래).some(function (k) { return String(열림.원래[k]) !== String(열림.값[k]); });
  }

  /* ── 폼 ── */
  function 필드(라벨, 내용) {
    var f = 만들기('div', { class: 'field' });
    f.appendChild(만들기('label', { html: 라벨 }));
    f.appendChild(내용);
    return f;
  }

  function 계산칸다시() {
    if (!열림) return;
    var 가짜 = Object.assign({}, 열림.품목, { 상태: 열림.값.상태 });
    var 월 = 열림.요약.월출고;
    var 결과;
    if (열림.값.현재고 <= 0) 결과 = { 종류: '소진', 표시: '소진' };
    else if (월 <= 0) 결과 = { 종류: '출고없음', 표시: '—' };
    else 결과 = { 종류: '일수', 일수: Math.floor(열림.값.현재고 / (월 / 30)), 표시: Math.floor(열림.값.현재고 / (월 / 30)) + '일' };
    if (열림.소진칸) 열림.소진칸.value = 결과.표시;
  }

  function 폼조각() {
    var 값 = 열림.값, 품목 = 열림.품목;

    var 직접 = 만들기('input', { class: 'inp num', type: 'text', inputmode: 'numeric', style: 'margin-top:var(--space-xs)' });
    직접.value = String(값.현재고);
    var 계단 = u.스테퍼(값.현재고, function (n) { 값.현재고 = n; 직접.value = String(n); 계산칸다시(); });
    직접.addEventListener('input', function () {
      var n = Math.max(0, Math.floor(u.숫자(직접.value)));
      값.현재고 = n; 계단.맞추기(n); 계산칸다시();
    });
    열림.첫칸 = 직접;

    var 현재고칸 = 만들기('div', { class: 'field' }, [
      만들기('label', { html: '현재고' }), 계단, 직접
    ]);

    function 글칸(이름, 반, 옵션) {
      var e = 만들기('input', Object.assign({ class: 'inp', type: 'text' }, 옵션 || {}));
      e.value = 값[이름];
      e.addEventListener('input', function () { 값[이름] = e.value; });
      return e;
    }

    var 유통명 = 글칸('유통명');
    var 학명 = 글칸('학명', null, { class: 'inp sci' });
    var 규격 = 글칸('규격');
    규격.addEventListener('blur', function () {
      var r = ZG.품목코드.규격정규화(규격.value);
      if (r.오류) { u.토스트(r.오류); 규격.value = 값.규격; return; }
      값.규격 = r.규격; 값.규격cm = r.규격cm; 규격.value = r.규격;
    });
    var 단가 = 만들기('input', { class: 'inp num', type: 'text', inputmode: 'numeric' });
    단가.value = u.콤마(값.매입단가);
    단가.addEventListener('input', function () { 값.매입단가 = u.숫자(단가.value); });
    단가.addEventListener('blur', function () { 단가.value = u.콤마(값.매입단가); });

    var 상태칸 = 만들기('div', { class: 'seg' });
    /* 🔴 2026-09-14 우람님 — 「일시중지는 필요없는 표현. 있다>판매중, 없다>품절 둘만」 */
    ['판매중', '품절'].forEach(function (이름) {
      var b = 만들기('button', { type: 'button', text: 이름, class: 값.상태 === 이름 ? 'on' : '' });
      b.addEventListener('click', function () {
        값.상태 = 이름;
        Array.prototype.forEach.call(상태칸.children, function (c) { c.classList.toggle('on', c === b); });
        계산칸다시();
      });
      상태칸.appendChild(b);
    });

    var 코드칸 = 만들기('input', { class: 'inp code', value: 품목.품목코드, disabled: 'disabled' });
    열림.소진칸 = 만들기('input', { class: 'inp readonly', value: 열림.요약.소진.표시, disabled: 'disabled' });
    var 월칸 = 만들기('input', { class: 'inp readonly', value: u.콤마(열림.요약.월출고) + '주', disabled: 'disabled' });

    /* 이름 · 규격 · 단가가 먼저, 수량은 그 아래다 (8/6 우람님).
       설명 문구는 전부 뺐다 — 밭에서 보는 화면이라 글자가 많으면 손이 늦어진다. */
    return [
      필드('유통명 <span class="req">*</span>', 유통명),
      필드('학명', 학명),
      만들기('div', { class: 'pair' }, [필드('규격', 규격), 필드('매입단가 <span class="req">*</span>', 단가)]),
      현재고칸,
      필드('상태', 상태칸),
      필드('품목코드', 코드칸),
      만들기('div', { class: 'pair' }, [
        필드('소진일', 열림.소진칸),
        필드('월 출고량', 월칸)
      ])
    ];
  }

  /* ── 저장 ── */
  function 저장() {
    var 값 = 열림.값, 원래 = 열림.원래, 코드 = 열림.품목.품목코드;
    if (!String(값.유통명).trim()) { u.토스트('유통명을 넣어주세요'); return; }
    if (!(값.매입단가 >= 0)) { u.토스트('매입단가를 확인해 주세요'); return; }
    if (!(값.현재고 >= 0) || 값.현재고 !== Math.floor(값.현재고)) { u.토스트('현재고는 0 이상 정수여야 합니다'); return; }

    if (값.현재고 !== 원래.현재고) {
      // 조정은 지우지 않고 쌓기만 한다. 품목에 현재고를 쓰지 않는다
      ZG.저장소.덧붙이기(ZG.저장소.키.재고조정, {
        id: 'adj_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
        품목코드: 코드, 조정수량: 값.현재고, 조정일시: Date.now(), 사유: '재고 수정'
      });
    }
    var 바뀐것 = {};
    ['유통명', '학명', '규격', '매입단가', '과세구분', '상태'].forEach(function (k) {
      if (String(값[k]) !== String(원래[k])) 바뀐것[k] = 값[k];
    });
    if (열림.특성) {
      var 새특성 = 열림.특성.읽기();
      if (특성글(새특성) !== 열림.원래특성) 바뀐것.특성 = 새특성;
    }
    if (바뀐것.규격) 바뀐것.규격cm = 값.규격cm;
    if (바뀐것.학명) 바뀐것.학명키 = ZG.품목코드.학명키(값.학명);
    if (Object.keys(바뀐것).length) {
      바뀐것.수정일시 = Date.now();
      ZG.저장소.바꾸기(ZG.저장소.키.품목, 코드, 바뀐것);
    }

    var 폰 = u.폰인가();
    if (폰) { 상태.상세코드 = null; 닫힘정리(); ZG.앱.다시그리기(); }
    else { 시트닫기(true); }
    u.토스트('저장했습니다');
  }

  /* ── PC 시트 ── */
  function 시트열기(코드, 누른단추, 줄) {
    if (열림) 시트닫기(true);
    var 짐 = 상자만들기(코드);
    if (!짐) return;
    열림 = 짐;
    열림.되돌릴포커스 = 누른단추;
    열림.줄 = 줄;
    if (줄) 줄.style.background = 'var(--color-accent-bg)';

    var 스크림 = 만들기('button', { class: 'editscrim', type: 'button', 'aria-label': '닫기' });
    스크림.addEventListener('click', function () { 닫기묻기(); });

    var 패널 = 만들기('div', { class: 'editpanel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 열림.품목.유통명 + ' 수정' });
    패널.appendChild(만들기('h3', { text: 열림.품목.유통명 + ' 수정' }));
    패널.appendChild(만들기('div', {
      class: 'sub',
      html: u.안전(열림.품목.품목코드) + ' · ' + u.안전(열림.품목.규격) +
        ' · <span class="days ' + 열림.요약.등급 + '">' + u.안전(열림.요약.소진.표시) + '</span>'
    }));
    폼조각().forEach(function (c) { 패널.appendChild(c); });

    var 취소 = 만들기('button', { class: 'btn', type: 'button', text: '취소' });
    취소.addEventListener('click', 닫기묻기);
    var 저장단추 = 만들기('button', { class: 'btn main', type: 'button', text: '저장' });
    저장단추.addEventListener('click', 저장);
    패널.appendChild(만들기('div', { class: 'btnrow' }, [취소, 저장단추]));

    열림.패널 = 패널; 열림.스크림 = 스크림;
    참조.감쌈.appendChild(스크림);
    참조.감쌈.appendChild(패널);
    document.body.style.overflow = 'hidden';
    패널.addEventListener('keydown', 가두기);
    document.addEventListener('keydown', 탈출);
    setTimeout(function () { 열림.첫칸.focus(); 열림.첫칸.select(); }, 30);
  }

  function 가두기(e) {
    if (e.key !== 'Tab' || !열림) return;
    var 것들 = 열림.패널.querySelectorAll('button, input:not([disabled])');
    if (!것들.length) return;
    var 처음 = 것들[0], 끝 = 것들[것들.length - 1];
    if (e.shiftKey && document.activeElement === 처음) { e.preventDefault(); 끝.focus(); }
    else if (!e.shiftKey && document.activeElement === 끝) { e.preventDefault(); 처음.focus(); }
  }

  function 탈출(e) { if (e.key === 'Escape' && 열림) { e.preventDefault(); 닫기묻기(); } }

  function 닫기묻기() {
    if (바뀌었나() && !window.confirm('고친 것을 버릴까요?')) return;
    시트닫기(false);
  }

  function 닫힘정리() {
    document.removeEventListener('keydown', 탈출);
    document.body.style.overflow = '';
    열림 = null;
  }

  function 시트닫기(저장했나) {
    if (!열림) return;
    var 패널 = 열림.패널, 스크림 = 열림.스크림, 되돌릴 = 열림.되돌릴포커스, 줄 = 열림.줄;
    var 시간 = u.움직임끔() ? 0 : 220;
    패널.getAnimations().forEach(function (a) { a.cancel(); });
    패널.animate([{ transform: 'none' }, { transform: 'translateX(100%)' }], { duration: 시간, easing: 'cubic-bezier(.4,0,1,1)' });
    스크림.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 시간, easing: 'cubic-bezier(.4,0,1,1)' });
    setTimeout(function () {
      if (패널.parentNode) 패널.parentNode.removeChild(패널);
      if (스크림.parentNode) 스크림.parentNode.removeChild(스크림);
      if (줄) 줄.style.background = '';
      if (저장했나) ZG.재고.다시();
      else if (되돌릴 && 되돌릴.focus) 되돌릴.focus();
    }, 시간);
    닫힘정리();
  }

  /* ── 폰 상세 (설계 §8-3) ── */
  function 폰상세열기(코드) {
    상태.상세코드 = 코드;
    상태.스크롤 = window.scrollY;
    ZG.앱.다시그리기();
    window.scrollTo(0, 0);
  }

  function 폰상세닫기() {
    if (바뀌었나() && !window.confirm('고친 것을 버릴까요?')) return;
    상태.상세코드 = null;
    닫힘정리();
    ZG.앱.다시그리기();
    window.scrollTo(0, 상태.스크롤 || 0);
  }

  /* 이름 · 코드 · 규격은 바로 아래 폼 첫 칸에 그대로 있다 —
     위쪽에 또 적지 않고 뒤로가기만 크게 남긴다 (8/6 우람님) */
  function 폰상세머리() {
    var 품목 = 품목찾기(상태.상세코드);
    if (!품목) return { 제목: '재고', 뒤로: null, 왼: '', 오: '' };
    return { 제목: '', 뒤로: 폰상세닫기, 뒤로글: '재고 목록', 왼: '', 오: '' };
  }

  function 폰상세그리기(뿌리) {
    var 짐 = 상자만들기(상태.상세코드);
    if (!짐) { 상태.상세코드 = null; ZG.재고.그리기(뿌리); return; }
    열림 = 짐;
    뿌리.classList.add('화면등장');
    폼조각().forEach(function (c) { 뿌리.appendChild(c); });
    var 저장단추 = 만들기('button', { class: 'ph-save', type: 'button', text: '저장' });
    저장단추.addEventListener('click', 저장);
    뿌리.appendChild(저장단추);
    setTimeout(function () { 뿌리.classList.remove('화면등장'); }, 340);
  }

  /* ── 골라 지우기 (8/6 우람님) ────────────────────────────────────────────────
     🔴 입고 · 주문 · 명세서 기록은 손대지 않는다 — 세금계산의 근거다 (업무규칙).
     🔴 품목 줄도 표에서 빼지 않고 `삭제됨` 표시만 남긴다. 빼 버리면 02-품목코드가
        그 일련번호를 다음 품목에 다시 내주고, 지운 품목 앞으로 쌓인 옛 입고 기록이
        새 품목 재고로 붙는다. 표시만 남기면 그 번호는 영영 안 돌아간다. */
  function 딸린기록(코드들) {
    var 저 = ZG.저장소, 셈 = { 입고: 0, 명세서: 0 };
    var 봄 = {};
    코드들.forEach(function (c) { 봄[c] = 1; });
    저.읽기(저.키.입고).forEach(function (r) { if (봄[r.품목코드]) 셈.입고++; });
    저.읽기(저.키.명세서줄).forEach(function (r) { if (봄[r.품목코드]) 셈.명세서++; });
    return 셈;
  }

  function 선택삭제() {
    var 코드들 = 목.고른것들();
    if (!코드들.length) { u.토스트('지울 품목을 먼저 골라주세요'); return; }

    var 품목 = ZG.저장소.품목들();
    var 이름 = 코드들.map(function (c) {
      var p = 품목.find(function (x) { return x.품목코드 === c; });
      return p ? p.유통명 : c;
    });
    var 셈 = 딸린기록(코드들);
    var 붙은것 = [];
    if (셈.입고) 붙은것.push('입고 ' + 셈.입고 + '건');
    if (셈.명세서) 붙은것.push('명세서 ' + 셈.명세서 + '줄');

    var 본문 = '<b>' + u.안전(이름.slice(0, 5).join(' · ')) +
      (이름.length > 5 ? ' 외 ' + (이름.length - 5) + '종' : '') + '</b>';
    본문 += 붙은것.length
      ? '<br><br>이 품목에 ' + 붙은것.join(' · ') + '이 남아 있습니다.<br>' +
        '<b>기록은 지우지 않습니다</b> — 매입 · 명세서는 세금계산의 근거라 그대로 둡니다.<br>' +
        '재고 목록에서만 안 보이게 됩니다.'
      : '<br><br>재고 목록에서 안 보이게 됩니다. 딸린 기록은 없습니다.';

    u.확인({
      제목: 코드들.length + '종을 지울까요?', 본문: 본문, 확인글: '삭제', 위험: true
    }, function (예) {
      if (!예) return;
      var 이제 = Date.now();
      코드들.forEach(function (c) {
        ZG.저장소.바꾸기(ZG.저장소.키.품목, c, { 삭제됨: true, 수정일시: 이제 });
      });
      목.선택비우기();
      상태.선택모드 = false;
      상태.상세코드 = null;
      ZG.앱.다시그리기();
      u.토스트(코드들.length + '종 지웠습니다');
    });
  }

  ZG.재고수정 = {
    시트열기: 시트열기, 폰상세열기: 폰상세열기, 폰상세그리기: 폰상세그리기,
    폰상세머리: 폰상세머리, 폰상세닫기: 폰상세닫기, 선택삭제: 선택삭제
  };
})(window.ZG);
