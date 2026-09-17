/* 03-계산 — 현재고 · 월출고량 · 소진일 · 상태 (설계 §7)
   현재고는 저장하지 않는다. 입고 · 출고 · 조정 기록에서 매번 계산한다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 하루 = 86400000;

  function 날짜문자(밀리초) {
    var d = new Date(밀리초);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
           '-' + String(d.getDate()).padStart(2, '0');
  }

  /* 화면 한 번 그릴 때 저장소를 세 번만 읽고 그 스냅샷으로 전부 계산한다 */
  function 장부() {
    var 저 = ZG.저장소;
    return {
      입고: 저.읽기(저.키.입고),
      출고: 저.읽기(저.키.출고),
      조정: 저.읽기(저.키.재고조정)
    };
  }

  function 합(목록) {
    return 목록.reduce(function (a, r) { return a + (Number(r.수량) || 0); }, 0);
  }

  function 현재고(품목코드, 장) {
    장 = 장 || 장부();
    var 내조정 = 장.조정.filter(function (r) { return r.품목코드 === 품목코드; });
    var 내입고 = 장.입고.filter(function (r) { return r.품목코드 === 품목코드; });
    var 내출고 = 장.출고.filter(function (r) { return r.품목코드 === 품목코드; });

    var 조정 = null;
    내조정.forEach(function (r) { if (!조정 || r.조정일시 > 조정.조정일시) 조정 = r; });

    if (조정) {
      var 기준 = 조정.조정일시;
      return Number(조정.조정수량) +
        합(내입고.filter(function (r) { return r.등록일시 > 기준; })) -
        합(내출고.filter(function (r) { return r.등록일시 > 기준; }));
    }
    return 합(내입고) - 합(내출고);
  }

  function 월출고량(품목코드, 장) {
    장 = 장 || 장부();
    var 경계 = 날짜문자(Date.now() - 30 * 하루);
    return 합(장.출고.filter(function (r) {
      return r.품목코드 === 품목코드 && String(r.출고일) >= 경계;
    }));
  }

  function 마지막입고일(품목코드, 장) {
    장 = 장 || 장부();
    var 최근 = '';
    장.입고.forEach(function (r) {
      if (r.품목코드 === 품목코드 && String(r.입고일) > 최근) 최근 = String(r.입고일);
    });
    return 최근;
  }

  function 소진일(품목, 장) {
    장 = 장 || 장부();
    var 재고 = 현재고(품목.품목코드, 장);
    if (재고 <= 0) return { 종류: '소진', 일수: 0, 표시: '소진' };
    var 월 = 월출고량(품목.품목코드, 장);
    if (월 <= 0) return { 종류: '출고없음', 표시: '—' };
    var 일수 = Math.floor(재고 / (월 / 30));
    return { 종류: '일수', 일수: 일수, 표시: 일수 + '일' };
  }

  function 소진등급(결과) {
    if (결과.종류 === '소진') return 'd0';
    if (결과.종류 === '일수' && 결과.일수 <= 21) return 'd1';
    return 'd2';
  }

  function 재입고필요(품목, 장) {
    if (품목.상태 !== '판매중') return false;   // 품절은 판정 대상이 아니다
    var 등급 = 소진등급(소진일(품목, 장));
    return 등급 === 'd0' || 등급 === 'd1';
  }

  /* 한 품목의 화면용 값을 한꺼번에 — 목록을 그릴 때 이걸 쓴다 */
  function 요약(품목, 장) {
    장 = 장 || 장부();
    var 결과 = 소진일(품목, 장);
    return {
      품목: 품목,
      현재고: 현재고(품목.품목코드, 장),
      월출고: 월출고량(품목.품목코드, 장),
      소진: 결과,
      등급: 소진등급(결과),
      재입고: 재입고필요(품목, 장),
      마지막입고: 마지막입고일(품목.품목코드, 장)
    };
  }

  /* 정렬 기본값 — 소진일 빠른 순 (설계 §7) */
  function 순서값(요) {
    var 종류 = 요.소진.종류;
    if (종류 === '소진') return [0, 0];
    if (종류 === '일수') return [1, 요.소진.일수];
    if (종류 === '출고없음') return [2, 0];
    return [3, 0];
  }

  function 소진순정렬(요약목록) {
    return 요약목록.slice().sort(function (a, b) {
      var x = 순서값(a), y = 순서값(b);
      if (x[0] !== y[0]) return x[0] - y[0];
      if (x[1] !== y[1]) return x[1] - y[1];
      return a.품목.품목코드 < b.품목.품목코드 ? -1 : 1;
    });
  }

  ZG.계산 = {
    장부: 장부,
    현재고: 현재고,
    월출고량: 월출고량,
    마지막입고일: 마지막입고일,
    소진일: 소진일,
    소진등급: 소진등급,
    재입고필요: 재입고필요,
    요약: 요약,
    소진순정렬: 소진순정렬,
    날짜문자: 날짜문자
  };
})(window.ZG);
