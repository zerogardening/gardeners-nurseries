/* 01-저장소 — localStorage 읽기/쓰기 (설계 §3, 7단계 §4-1)
   표마다 키 하나. 한 덩어리 JSON 은 만들지 않는다.
   쓰기는 언제나 「다시 읽기 → 한 건만 손대기 → 쓰기」다.
   다른 탭이 그 사이에 넣은 것을 지우지 않기 위해서다.

   7단계에서 캐시와 서버 큐가 붙었다.
   내부용 저장(캐시+localStorage)과 외부용 전체쓰기(대조 후 큐)를 이름부터 나눈다 —
   덧붙이기·바꾸기·지우기가 전부 저장을 부르므로, 대조를 저장 안에 넣으면 같은 줄이 큐에 두 번 실린다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 키 = {
    품목:     'gn.v1.품목',
    입고:     'gn.v1.입고',
    출고:     'gn.v1.출고',
    재고조정: 'gn.v1.재고조정',
    업체:     'gn.v1.업체',
    명세서:   'gn.v1.명세서',
    명세서줄: 'gn.v1.명세서줄',   // 명세서 품목 한 줄. 머리(명세서)와 나눠 둔다
    견적요청: 'gn.v1.견적요청',
    메모:     'gn.v1.메모',      // 메모 · 체크리스트 · 영농일지. 한 장이 한 줄이다
    설정:     'gn.v1.설정'
  };
  var 스키마버전 = 1;   // 정원사의 널서리 1판. 올리면 기존 목데이터를 지우고 다시 심는다

  /* 캐시는 「키 → 값의 JSON 문자열」로 든다.
     읽기가 매번 parse 하므로 호출부는 언제나 자기만의 사본을 받는다(지금까지와 동작이 같다).
     문자열로 두면 전체쓰기의 줄 단위 대조도 parse 한 번으로 끝난다. */
  var 캐시 = {};
  var 조용함 = false;   // 켜 두면 전체쓰기가 큐를 건너뛴다 (시드·이사분이 서버로 새어 나가지 않게)

  /* 다른 탭이 쓴 값은 이 탭 캐시에 안 잡힌다 — 그 키의 캐시를 버려 다음 읽기가 localStorage 를 다시 타게 한다.
     안 버리면 탭 A 가 넣은 줄을 탭 B 가 못 본 채 다음 쓰기 때 덮어 지운다 */
  window.addEventListener('storage', function (e) {
    if (e.key) delete 캐시[e.key];
    else 캐시 = {};   // key 가 없으면 storage 전체가 비워진 것이다
  });

  function 객체키인가(k) { return k === 키.설정; }
  function 아이디(r) { return r && (r.id || r.품목코드); }

  /* 🔴 표마다 PK 가 무엇인가 — 여기 한 곳에서만 정한다. 서버 층(대조·01c)이 전부 이걸 본다 */
  var 표키 = { 품목: '품목코드' };
  function 표이름(k) { return String(k).replace('gn.v1.', ''); }
  function 키필드(표) { return 표키[표] || 'id'; }
  function 레코드키(표, r) {
    var v = r && r[키필드(표)];
    return (v == null || v === '') ? null : String(v);
  }

  function 원문(k) {
    if (캐시[k] != null) return 캐시[k];
    var s = null;
    try { s = localStorage.getItem(k); } catch (e) { console.warn('저장소를 못 읽었습니다', k, e); }
    캐시[k] = s == null ? '' : s;
    return 캐시[k];
  }

  function 읽기(k) {
    var 빈값 = 객체키인가(k) ? {} : [];
    var s = 원문(k);
    if (!s) return 빈값;
    try {
      var 값 = JSON.parse(s);
      if (객체키인가(k)) return (값 && typeof 값 === 'object') ? 값 : {};
      return Array.isArray(값) ? 값 : [];
    } catch (e) {
      console.warn('저장소 값이 깨졌습니다 — 빈 값으로 봅니다', k, e);
      return 빈값;
    }
  }

  /* 살아 있는 품목만. 화면은 전부 이걸 쓴다 (8/6 재고 선택 삭제).
     🔴 지운 품목은 표에서 빼지 않고 `삭제됨:true` 표시만 남긴다 —
        빼 버리면 02-품목코드 다음번호()가 그 일련번호를 다시 내주고,
        지운 품목 앞으로 쌓인 옛 입고 기록이 새 품목 재고로 붙는다.
     코드계산(05a)과 입고저장(05c)만 전체 목록을 본다 — 그래야 번호를 피하고 되살릴 수 있다. */
  function 품목들() {
    return 읽기(키.품목).filter(function (p) { return !p.삭제됨; });
  }

  /* 내부 전용. 밖으로 안 내보낸다 — 큐를 건드리지 않는다 */
  function 저장(k, 값) {
    var s = JSON.stringify(값);
    캐시[k] = s;
    try { localStorage.setItem(k, s); }
    catch (e) { console.warn('저장소에 못 썼습니다', k, e); }
  }

  function 보내기() { return (!조용함 && ZG.보내기) ? ZG.보내기 : null; }

  function 덧붙이기(k, 레코드) {
    var 목록 = 읽기(k);
    목록.push(레코드);
    저장(k, 목록);
    var b = 보내기(); if (b) b.줄(k, 레코드);
    return 레코드;
  }

  function 바꾸기(k, id, 변경) {
    var 목록 = 읽기(k);
    var 대상 = 목록.find(function (r) { return 아이디(r) === id; });
    if (!대상) return null;
    Object.assign(대상, 변경);
    저장(k, 목록);
    var b = 보내기(); if (b) b.줄(k, 대상);
    return 대상;
  }

  /* 원본 레코드를 실제로 지운다. 상쇄 레코드를 따로 만들지 않는다 —
     현재고가 입고 합산으로 계산되므로 지운 만큼 저절로 빠진다 (설계 §16-1)
     서버는 행을 지우지 않고 삭제됨=true 로 둔다 (업무규칙 §8) */
  function 지우기(k, id) {
    var 목록 = 읽기(k);
    var 자리 = 목록.findIndex(function (r) { return 아이디(r) === id; });
    if (자리 < 0) return false;
    목록.splice(자리, 1);
    저장(k, 목록);
    var b = 보내기(); if (b) b.삭제(k, id);
    return true;
  }

  /* 배열 통째로 갈아끼우기. 이전 값과 줄 단위로 대조해 달라진 것만 큐에 싣는다 */
  function 전체쓰기(k, 값) {
    var b = 보내기();
    if (b && k !== 키.설정) {
      if (객체키인가(k)) b.설정(k, 값);
      else 대조(k, 값, b);
    }
    저장(k, 값);
  }

  function 대조(k, 새것, b) {
    var 표 = 표이름(k);
    var 옛것 = 읽기(k);
    var 옛맵 = {};
    옛것.forEach(function (r) { var i = 레코드키(표, r); if (i) 옛맵[i] = JSON.stringify(r); });
    (새것 || []).forEach(function (r) {
      var i = 레코드키(표, r); if (!i) return;
      var s = JSON.stringify(r);
      if (옛맵[i] !== s) b.줄(k, r);
      delete 옛맵[i];
    });
    Object.keys(옛맵).forEach(function (i) { b.삭제(k, i); });
  }

  function 조용히(참거짓) { 조용함 = !!참거짓; }

  function 설정읽기() { return 읽기(키.설정); }

  /* 설정은 기기마다 달라야 하는 값이다 — 서버에 안 보낸다 */
  function 설정쓰기(변경) {
    var s = 설정읽기();
    Object.assign(s, 변경);
    저장(키.설정, s);
    return s;
  }

  /* 로컬·캐시·큐만 지운다. 서버는 안 지운다 — 새로고침하면 다시 내려온다 */
  function 전부지우기() {
    Object.keys(키).forEach(function (이름) {
      try { localStorage.removeItem(키[이름]); } catch (e) { console.warn(e); }
    });
    캐시 = {};
    if (ZG.보내기) ZG.보내기.비우기();
  }

  function 부팅() {
    var 초기화요청 = /[?&]reset=1\b/.test(location.search);
    if (초기화요청) 전부지우기();

    var 설정 = 설정읽기();
    // 🔴 실데이터를 이사해 넣었으면 무슨 일이 있어도 다시 심지 않는다. 목데이터가 실주문을 덮는다
    if (설정.실데이터 === true) return;
    // 로그인했으면 서버 것이 곧 내려온다 — 목데이터를 잠깐 깔았다 덮지 않는다
    if (ZG.서버 && ZG.서버.로그인됨) return;
    if (초기화요청 || 설정.스키마버전 !== 스키마버전 || 설정.시드완료 !== true) {
      ZG.시드.심기();
      설정쓰기({ 스키마버전: 스키마버전, 시드완료: true, 마지막입고업체: '한아름농원' });
    }
  }

  ZG.저장소 = {
    키: 키,
    스키마버전: 스키마버전,
    읽기: 읽기,
    품목들: 품목들,
    덧붙이기: 덧붙이기,
    바꾸기: 바꾸기,
    지우기: 지우기,
    전체쓰기: 전체쓰기,
    조용히: 조용히,
    설정읽기: 설정읽기,
    설정쓰기: 설정쓰기,
    전부지우기: 전부지우기,
    키필드: 키필드,
    레코드키: 레코드키,
    부팅: 부팅
  };
})(window.ZG);
