/* 18-메모앱 — 메모.html 셸. 2탭 라우팅 · 폭 전환 (12단계 세부설계 §4)
   패턴은 14-소싱앱과 같다. 다른 것은 달(‹ ›)과 「열어 둔 것」을 여기서 든다는 것뿐이다.
   연것: null(목록) | '새'(새 메모) | 메모 id. 폰에서만 목록/쓰기를 오간다 — PC는 늘 좌우분할이다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 뿌리, 본문;
  var 탭 = '메모';                      // '메모' | '체크' | '일지' | '견적' — 들어오면 메모가 먼저다 (2026-09-17 우람님)
  var 탭이름 = { 메모: '메모', 체크: '체크리스트', 일지: '영농일지', 견적: '견적요청' };
  /* 🔴 폰은 칸이 넷이라 이름을 줄여 단다. 길면 탭줄이 두세 줄로 접힌다 (9/17 명세서발행에서 겪었다) */
  var 폰탭이름 = { 메모: '메모', 체크: '체크', 일지: '일지', 견적: '견적' };
  var 탭들 = ['메모', '체크', '일지', '견적'];
  var 달, 고른날값, 연것값 = null;

  /* 견적은 제 화면(견적.html)이 있었는데 2026-09-17 에 여기 넷째 탭으로 들어왔다.
     15b/15c 는 셸과 계약이 거의 같다 — 이름만 얇게 맞춰 준다. */
  function 견적모듈() {
    var m = u.폰인가() ? ZG.견적폰 : ZG.견적PC;
    return {
      그리기: m.그리기,
      요약: m.요약,
      폰머리: function () { return { 제목: ZG.견적폰.제목() }; }
    };
  }

  function 지금모듈() { return 탭 === '견적' ? 견적모듈() : ZG.메모[탭 + '탭']; }
  function 길() { return '메모 › ' + 탭이름[탭]; }

  /* ── PC ── */
  function PC뼈대() {
    var 옆 = u.옆메뉴('메모');
    var 머리 = 만들기('div', { class: 'pc-head' }, [
      만들기('h2', { text: '메모' }), 만들기('div', { class: 'path', text: 길() })
    ]);

    var 탭줄 = 만들기('div', { class: 'pc-tabs', role: 'tablist' });
    탭들.forEach(function (이름) {
      var b = 만들기('button', {
        type: 'button', role: 'tab', text: 탭이름[이름],
        class: 탭 === 이름 ? 'on' : '', 'aria-selected': 탭 === 이름 ? 'true' : 'false'
      });
      b.addEventListener('click', function () { 탭으로(이름); });
      탭줄.appendChild(b);
    });

    본문 = 만들기('div', { class: 'pc-본문' });
    뿌리.appendChild(만들기('div', { class: 'shell' }, [옆, 만들기('div', { class: 'pc-main' }, [머리, 탭줄, 본문])]));
  }

  /* ── 폰 ── */
  function 폰뼈대() {
    var m = 지금모듈();
    var 머리 = m.폰머리 ? m.폰머리() : { 제목: 탭이름[탭] };
    var 정보 = m.요약 ? m.요약() : { 왼: '', 오: '' };
    /* 견적은 제 안에 뷰(목록/등록/상세)를 든다 — 목록이 아니면 메모의 「쓰는 중」과 같이 다룬다.
       그래야 탭줄이 숨고 ‹ 가 목록으로 돌아간다 */
    var 견적속 = 탭 === '견적' && ZG.견적폰.상태.뷰 !== '목록';
    var 쓰는중 = !!연것값 || 견적속;

    var 왼쪽 = 만들기('div', { class: '왼', style: 'min-width:0' });
    var 뒤 = 만들기('button', { class: 'ph-back', type: 'button', text: '‹', 'aria-label': '뒤로' });
    뒤.addEventListener('click', function () {
      if (견적속) ZG.견적폰.목록으로();
      else if (연것값) 닫기();
      else location.href = 'index.html';
    });
    왼쪽.appendChild(뒤);
    왼쪽.appendChild(만들기('h1', { text: 머리.제목, style: 쓰는중 ? 'font-size:var(--font-4xl)' : null }));

    var 오른 = 만들기('span', { style: 'display:flex; gap:var(--space-sm); align-items:center' });
    if (머리.삭제) {
      var 삭제b = 만들기('button', { class: 'btn sm', type: 'button', text: '삭제' });
      삭제b.addEventListener('click', 머리.삭제);   // 확인창은 17b 삭제누름 이 띄운다
      오른.appendChild(삭제b);
    }
    if (머리.저장) {
      var 저장b = 만들기('button', { class: 'btn main sm', type: 'button', text: '저장' });
      저장b.addEventListener('click', 머리.저장);
      오른.appendChild(저장b);
    }
    var 위 = 만들기('div', { class: 'ph-top' }, [왼쪽, 오른]);

    var 조각 = [위];
    if (정보.왼 || 정보.오) {
      조각.push(만들기('div', { class: 'ph-sub' }, [
        만들기('span', { html: 정보.왼 || '' }), 만들기('span', { html: 정보.오 || '' })
      ]));
    }

    본문 = 만들기('div', { class: 'ph-body tight' });
    if (!쓰는중) {
      var 탭줄 = 만들기('div', { class: 'toggle', style: 'height:36px' });
      탭들.forEach(function (이름) {
        var b = 만들기('button', {
          type: 'button', class: 탭 === 이름 ? 'on' : '', text: 폰탭이름[이름], style: 'flex:1; padding:0'
        });
        b.addEventListener('click', function () { 탭으로(이름); });
        탭줄.appendChild(b);
      });
      본문.appendChild(탭줄);
    }
    조각.push(본문);

    // 「메모」 칸을 다시 눌러도 페이지를 새로 열지 않는다 — 적던 것이 날아간다
    조각.push(u.탭바('메모', function (이름) {
      if (이름 !== '메모') return false;
      if (견적속) ZG.견적폰.목록으로();
      else if (연것값) 닫기();
      return true;
    }));

    뿌리.appendChild(만들기('div', { class: 'ph-shell' }, 조각));
  }

  function 다시그리기() {
    u.비우기(뿌리);
    if (u.폰인가()) 폰뼈대(); else PC뼈대();
    지금모듈().그리기(본문);
  }

  function 요약다시() {
    if (!u.폰인가()) return;
    var m = 지금모듈();
    if (!m.요약) return;
    var 정보 = m.요약();
    var 줄 = 뿌리.querySelector('.ph-sub');
    if (!줄) return;
    줄.children[0].innerHTML = 정보.왼 || '';
    줄.children[1].innerHTML = 정보.오 || '';
  }

  function 탭으로(이름) {
    if (탭 !== 이름) {
      연것값 = null;   // 메모 id 를 일지 화면이 물고 가지 않게
      // 견적을 상세/등록 뷰에 둔 채 나갔다가 돌아오면 그 화면이 그대로 떠 있다 — 목록으로 되돌려 둔다
      if (ZG.견적폰 && ZG.견적폰.상태) { ZG.견적폰.상태.뷰 = '목록'; ZG.견적폰.상태.id = ''; }
    }
    탭 = 이름;
    다시그리기();
  }

  /* 🔴 달을 바꾸는 문은 이 하나다(메모 목록의 ‹ ›, 달력의 ‹ › 둘 다 여기로 온다).
     달이 바뀌면 그 달에 매인 것이 둘 있다 —
       ① 폴더 거르개: 그 달에 없는 폴더면 끄는 칩조차 안 보여 목록이 빈 채로 멈춘다 → 여기서 푼다
       ② 고른 날: 고른날값 은 손대지 않는다. 달과 어긋나면 고른날() 이 그때만 1일로 답한다.
          지워 버리면 메모 탭에서 달을 왕복한 것만으로 일지의 오늘이 1일로 밀린다 */
  function 달로(값) {
    if (달 === 값) return;
    달 = 값;
    연것값 = null;
    if (ZG.메모.달바뀜) ZG.메모.달바뀜();
    다시그리기();
  }

  function 고른날() {
    return 고른날값.slice(0, 7) === 달 ? 고른날값 : 달 + '-01';
  }

  function 날고르기(날짜) {
    고른날값 = 날짜;
    연것값 = null;
    다시그리기();
  }

  function 열기(id) { 연것값 = id; 다시그리기(); }
  function 닫기() { 연것값 = null; 다시그리기(); }

  function 시작() {
    뿌리 = document.getElementById('앱');
    ZG.저장소.부팅();
    고른날값 = ZG.메모.오늘();
    달 = 고른날값.slice(0, 7);
    다시그리기();
    u.폰질의.addEventListener('change', 다시그리기);
    window.addEventListener('storage', function (e) {
      if (e.key && e.key.indexOf('gn.v1.') === 0) 다시그리기();
    });
  }

  /* 🔴 이름은 '메모앱'이다 — 01b-서버.js 의 다시그리기 목록이 이 이름으로 찾는다 */
  ZG.메모앱 = {
    시작: 시작, 다시그리기: 다시그리기, 요약다시: 요약다시, 탭으로: 탭으로,
    달: function () { return 달; }, 달로: 달로,
    고른날: 고른날, 날고르기: 날고르기,
    연것: function () { return 연것값; }, 열기: 열기, 닫기: 닫기
  };
  document.addEventListener('DOMContentLoaded', 시작);
})(window.ZG);
