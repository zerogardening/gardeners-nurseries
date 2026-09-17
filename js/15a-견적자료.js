/* 15a-견적자료 — 견적 요청 읽기·검색·정렬·집계·쓰기 (5단계 설계 §2 · §6 · §7)
   화면은 없다. 저장은 언제나 한 건 단위다 — 배열을 통째로 쓰지 않는다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 저 = ZG.저장소, 키 = 저.키.견적요청;
  var 상태들 = ['요청', '완료', '취소'];

  function 새id() { return 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8); }

  /* 저장된 값이 셋 밖이면 화면에서만 「요청」으로 본다. 값을 몰래 고쳐 쓰지 않는다 (§7) */
  function 보일상태(값) { return 상태들.indexOf(값) >= 0 ? 값 : '요청'; }

  function 이름키(s) { return String(s == null ? '' : s).replace(/\s+/g, '').toLowerCase(); }
  function 숫자만(s) { return String(s == null ? '' : s).replace(/[^0-9]/g, ''); }

  /* ── 누구 것인가 ── (2026-09-17 우람님: 메모탭 넷을 다 개인화)
     🔴 메모·체크·일지와 **똑같은 한 규칙**이다 — 쓴이가 없는 줄은 모두에게,
        쓴이가 있는 줄은 그 사람에게만. 그래서 이미 쌓인 옛 견적은 손대지 않아도 그대로 남는다.
     🔴 나키()가 비면(서버 꺼짐·로컬 전용) 거르개가 통째로 잠들어 지금까지와 똑같이 돈다.
        하나()는 거르지 않는다 — 목록에서 고른 줄을 여는 길이라 거기서 또 거르면 헛돈다. */
  function 나() { return (ZG.사람 && ZG.사람.나키()) || ''; }

  function 전부() {
    var 나메일 = 나();
    var 것들 = 저.읽기(키);
    if (!나메일) return 것들;
    return 것들.filter(function (q) { return !q.쓴이 || q.쓴이 === 나메일; });
  }

  /* 정렬은 고정이다 — 요청일 내림차순, 같으면 등록일시 내림차순 (§6) */
  function 정렬(목록) {
    return 목록.slice().sort(function (a, b) {
      var x = String(a.요청일 || ''), y = String(b.요청일 || '');
      if (x !== y) return x < y ? 1 : -1;
      return (Number(b.등록일시) || 0) - (Number(a.등록일시) || 0);
    });
  }

  function 읽기(조건) {
    조건 = 조건 || {};
    var 글 = 이름키(조건.글), 숫 = 숫자만(조건.글);
    var 것들 = 전부().filter(function (q) {
      if (조건.상태 && 보일상태(q.상태) !== 조건.상태) return false;
      if (!글) return true;
      if (이름키(q.고객명).indexOf(글) >= 0) return true;
      if (이름키(q.내용).indexOf(글) >= 0) return true;
      if (이름키(q.연락처).indexOf(글) >= 0) return true;
      // 연락처는 숫자만 남겨서도 한 번 더 본다 — 「01098」로도 찾히게 (§6)
      return !!숫 && 숫자만(q.연락처).indexOf(숫) >= 0;
    });
    return 정렬(것들);
  }

  function 하나(id) {
    var 것들 = 저.읽기(키);   // 거르지 않는다 — 위 주석 참조
    for (var i = 0; i < 것들.length; i++) if (것들[i].id === id) return 것들[i];
    return null;
  }

  /* 통계는 필터와 무관하게 언제나 전체 기준이다 (§4-②) */
  function 집계() {
    var 셈 = { 전체: 0, 요청: 0, 완료: 0, 취소: 0 };
    전부().forEach(function (q) {
      셈.전체 += 1;
      셈[보일상태(q.상태)] += 1;
    });
    return 셈;
  }

  function 다듬기(값) {
    return {
      요청일: String(값.요청일 || '').trim(),
      고객명: String(값.고객명 || '').trim(),
      연락처: String(값.연락처 || '').trim(),
      내용: String(값.내용 || '').trim()   // 가운데 줄바꿈·빈 줄은 그대로 둔다 (§7)
    };
  }

  function 추가(값) {
    var 지금 = Date.now();
    var 새것 = 다듬기(값);
    새것.id = 새id();
    새것.상태 = '요청';           // 새로 넣으면 무조건 「요청」이다
    새것.등록일시 = 지금;
    새것.수정일시 = 지금;
    // 🔴 새로 넣는 줄에만 쓴이를 찍는다. 옛 줄을 고쳐도 안 찍는다 — 찍는 순간 남들 화면에서 사라진다
    var 나메일 = 나();
    if (나메일) 새것.쓴이 = 나메일;
    return 저.덧붙이기(키, 새것);
  }

  function 수정(id, 값) {
    var 변경 = 다듬기(값);
    변경.수정일시 = Date.now();
    return 저.바꾸기(키, id, 변경);
  }

  function 상태바꾸기(id, 상태) {
    if (상태들.indexOf(상태) < 0) return null;
    return 저.바꾸기(키, id, { 상태: 상태, 수정일시: Date.now() });
  }

  function 삭제(id) { return 저.지우기(키, id); }

  ZG.견적자료 = {
    상태들: 상태들, 보일상태: 보일상태, 숫자만: 숫자만,
    전부: 전부, 읽기: 읽기, 하나: 하나, 집계: 집계,
    추가: 추가, 수정: 수정, 상태바꾸기: 상태바꾸기, 삭제: 삭제
  };
})(window.ZG);
