/* 10a-업체자료 — 업체·명세서 읽기/쓰기 (3단계 설계 §2 · §3). 화면은 없다.
   명세서는 머리(gn.v1.명세서)와 줄(gn.v1.명세서줄)이 따로다.
   지우기는 반드시 이 파일의 명세서지우기() 하나를 거친다 — 고아 줄을 남기지 않기 위해서다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 구분들 = ['공급업체', '판매처', '운송·택배', '기타 협력사'];
  var 구분설명 = {
    '공급업체': '공급업체 (식물·자재 매입처)',
    '판매처': '판매처 (B2B 도매 거래처)',
    '운송·택배': '운송·택배업체',
    '기타 협력사': '기타 협력사'
  };

  function 저() { return ZG.저장소; }
  function 키() { return ZG.저장소.키; }

  function 이름키(이름) { return String(이름 || '').replace(/\s+/g, '').toLowerCase(); }

  function 목록() {
    return 저().읽기(키().업체).slice().sort(function (a, b) {
      return (b.등록일시 || 0) - (a.등록일시 || 0);
    });
  }

  function 찾기(id) {
    return 목록().find(function (c) { return c.id === id; }) || null;
  }

  function 이름으로찾기(이름, 뺄id) {
    var k = 이름키(이름);
    if (!k) return null;
    return 목록().find(function (c) {
      return 이름키(c.이름) === k && c.id !== 뺄id;
    }) || null;
  }

  function 자사() {
    return 목록().find(function (c) { return c.내업체 === true; }) || null;
  }

  /* 입고 표를 한 번만 훑어 업체 이름별 건수를 센다. 줄마다 세지 않는다 (설계 §3) */
  function 입고건수맵() {
    var 셈 = {};
    저().읽기(키().입고).forEach(function (r) {
      var s = String(r.입고업체 || '').trim();
      if (!s) return;
      셈[s] = (셈[s] || 0) + 1;
    });
    return 셈;
  }

  /* 자사는 전체에서 딱 하나다 — 새로 지정하면 나머지를 내린다 */
  function 자사내리기(뺄id) {
    목록().forEach(function (c) {
      if (c.내업체 === true && c.id !== 뺄id) 저().바꾸기(키().업체, c.id, { 내업체: false });
    });
  }

  /* 담당자전화는 폼에 칸이 없다(시안). 값이 있으면 담당자 뒤에 합쳐 넣고 칸은 비운다 (설계 §7-3) */
  function 담당자정리(값) {
    var 이름 = String(값.담당자 || '').trim();
    var 전화 = String(값.담당자전화 || '').trim();
    if (전화 && 이름.indexOf(전화) < 0) 이름 = [이름, 전화].filter(Boolean).join(' / ');
    값.담당자 = 이름;
    값.담당자전화 = '';
    return 값;
  }

  function 등록(값) {
    담당자정리(값);
    if (값.내업체) 자사내리기(null);
    값.id = 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    값.등록일시 = Date.now();
    값.마지막사용 = Date.now();
    return 저().덧붙이기(키().업체, 값);
  }

  function 수정(id, 값) {
    담당자정리(값);
    if (값.내업체) 자사내리기(id);
    값.마지막사용 = Date.now();
    return 저().바꾸기(키().업체, id, 값);
  }

  function 삭제(id) { return 저().지우기(키().업체, id); }

  /* ── 명세서 ── */
  function 명세서목록() {
    return 저().읽기(키().명세서).slice().sort(function (a, b) {
      return (b.등록일시 || 0) - (a.등록일시 || 0);
    });
  }

  function 명세서찾기(id) {
    return 명세서목록().find(function (s) { return s.id === id; }) || null;
  }

  function 명세서줄들(명세서id) {
    return 저().읽기(키().명세서줄)
      .filter(function (r) { return r.명세서id === 명세서id; })
      .sort(function (a, b) { return (a.순번 || 0) - (b.순번 || 0); });
  }

  /* 명세서 한 장에 딸린 줄 수 — 이력 목록의 「품목수」 */
  function 명세서줄셈() {
    var 셈 = {};
    저().읽기(키().명세서줄).forEach(function (r) {
      셈[r.명세서id] = (셈[r.명세서id] || 0) + 1;
    });
    return 셈;
  }

  function 명세서저장(머리, 줄들) {
    머리.id = 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    머리.등록일시 = Date.now();
    저().덧붙이기(키().명세서, 머리);
    줄들.forEach(function (줄, i) {
      줄.id = 'sl_' + Date.now().toString(36) + '_' + i.toString(36);
      줄.명세서id = 머리.id;
      줄.순번 = i + 1;
      저().덧붙이기(키().명세서줄, 줄);
    });
    return 머리;
  }

  /* 머리와 줄을 같이 지운다. 화면 코드가 저장소.지우기를 직접 부르지 않는다 (설계 §2) */
  function 명세서지우기(id) {
    var 남길줄 = 저().읽기(키().명세서줄).filter(function (r) { return r.명세서id !== id; });
    저().전체쓰기(키().명세서줄, 남길줄);
    return 저().지우기(키().명세서, id);
  }

  ZG.업체자료 = {
    구분들: 구분들, 구분설명: 구분설명,
    이름키: 이름키, 목록: 목록, 찾기: 찾기, 이름으로찾기: 이름으로찾기, 자사: 자사,
    입고건수맵: 입고건수맵, 등록: 등록, 수정: 수정, 삭제: 삭제,
    명세서목록: 명세서목록, 명세서찾기: 명세서찾기, 명세서줄들: 명세서줄들,
    명세서줄셈: 명세서줄셈, 명세서저장: 명세서저장, 명세서지우기: 명세서지우기
  };
})(window.ZG);
