/* 01c-보내기 — 보낼것 큐 · upsert 전송 · 재시도 · 온라인 감지 (7단계 설계 §4-1·§6)
   쓰기는 언제나 localStorage 부터 들어간다. 여기는 그 뒤다 — 끊겨도 입력한 것은 남는다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 큐키 = 'gn.v1.보낼것';
  var 큐 = {};   // '표|id' → {표, id, 값 또는 삭제}. 같은 줄은 마지막 것 하나로 합친다
  try { 큐 = JSON.parse(localStorage.getItem(큐키) || '{}') || {}; } catch (e) { 큐 = {}; }

  var 예약 = null, 보내는중 = false, 보내기시작 = 0;
  var 굳음한계 = 60000;   // 보내기가 이만큼 지나도 안 끝나면 죽은 것으로 보고 다시 건다

  function 큐저장() {
    try { localStorage.setItem(큐키, JSON.stringify(큐)); } catch (e) { console.warn('큐를 못 썼습니다', e); }
  }
  function 표이름(k) { return String(k).replace('gn.v1.', ''); }

  function 담기(항목) {
    큐[항목.표 + '|' + 항목.id] = 항목;
    큐저장();
    if (예약) return;
    예약 = setTimeout(function () { 예약 = null; 보내기(); }, 300);
  }

  /* 키는 표마다 다르다(품목=품목코드 · 즐겨찾기=키워드 · 분류폴더=이름). 01-저장소가 한 곳에서 정한다 */
  function 줄(k, 레코드) {
    var 표 = 표이름(k);
    var id = ZG.저장소.레코드키(표, 레코드);
    if (!id) { console.warn('키가 없어 서버로 못 보냅니다', 표, ZG.저장소.키필드(표), 레코드); return; }
    담기({ 표: 표, id: id, 값: 레코드, 시각: Date.now() });
  }
  function 삭제(k, id) {
    if (!id) return;
    담기({ 표: 표이름(k), id: String(id), 삭제: true, 시각: Date.now() });
  }
  function 설정(k, 값) {
    담기({ 표: '공유설정', id: 표이름(k), 값: 값, 시각: Date.now() });
  }

  /* 🔴 navigator.onLine 을 문지기로 쓰지 않는다 (8/19 우람님 맥).
     인터넷이 멀쩡한데 크롬이 false 를 물고 있는 일이 실제로 있다 —
     그날 콘솔에서 onLine 은 false 인데 같은 자리 upsert 는 201 OK 였다.
     그 값을 믿고 막았더니 8/9부터 24건이 아무 표시 없이 쌓였다.
     끊겼으면 upsert 가 실패하고 큐에 남으므로, 미리 막을 필요가 없다. */
  function 보낼수있나() {
    return ZG.서버 && ZG.서버.켜짐 && ZG.서버.클라이언트;
  }

  function 보내기() {
    /* 🔴 「보내는중」이 켜진 채 굳으면 그 탭은 새로고침 전까지 영영 안 보낸다.
       요청 하나가 응답도 실패도 없이 매달려 있으면 실제로 그렇게 된다 —
       한계를 넘기면 죽은 것으로 보고 새로 건다 (옛 요청이 늦게 성공해도 큐에서 빼기만 한다) */
    if (보내는중 && Date.now() - 보내기시작 < 굳음한계) return Promise.resolve();
    if (!보낼수있나()) return Promise.resolve();
    var 열쇠들 = Object.keys(큐).slice(0, 100);
    if (!열쇠들.length) { 표시(); return Promise.resolve(); }
    보내는중 = true; 보내기시작 = Date.now();

    var 표별 = {};
    열쇠들.forEach(function (열쇠) {
      var it = 큐[열쇠];
      (표별[it.표] = 표별[it.표] || []).push({ 열쇠: 열쇠, it: it });
    });

    var supa = ZG.서버.클라이언트;
    var 일 = Object.keys(표별).map(function (표) {
      var 묶음 = 표별[표];
      var 행들 = 묶음.map(function (m) {
        // 메아리는 받는 쪽에서 「로컬과 같은가」로 거른다 — 보낸 값을 따로 적어 둘 필요가 없다
        return { id: m.it.id, 내용: m.it.삭제 ? { id: m.it.id } : m.it.값, 삭제됨: !!m.it.삭제 };
      });
      return supa.from('gn_' + 표).upsert(행들, { onConflict: 'id' }).then(function (r) {
        if (r.error) throw r.error;
        묶음.forEach(function (m) { delete 큐[m.열쇠]; });   // 성공한 것만 큐에서 뺀다
      }).catch(function (e) {
        console.warn('서버로 못 보냈습니다 — 큐에 남겨 둡니다', 표, e.message || e);
      });
    });

    function 끝냄() {
      보내는중 = false;
      큐저장();
      표시();
      if (Object.keys(큐).length && 열쇠들.length === 100) 담기0();
    }
    return Promise.all(일).then(끝냄, 끝냄);
  }

  // 100건씩 끊어 보내므로 남은 게 있으면 곧바로 이어서 한 번 더
  function 담기0() { setTimeout(보내기, 100); }

  /* ── 못 올린 게 오래 남으면 화면에 띄운다 (8/19 사고) ────────────────────────
     8/9부터 24건이 아무 표시 없이 쌓여 있었다. 그게 이번 일의 본체다.
     방금 저장한 것이 잠깐 큐에 있는 건 정상이라 「1분 넘게 못 나간 것」만 센다.
     누르면 그 자리서 다시 보낸다. */
  var 알림칸 = null;
  function 밀린건수() {
    var 이제 = Date.now(), n = 0;
    Object.keys(큐).forEach(function (열쇠) { if (이제 - (큐[열쇠].시각 || 0) > 60000) n++; });
    return n;
  }
  function 표시() {
    var n = 밀린건수();
    if (!n) {
      if (알림칸 && 알림칸.parentNode) 알림칸.parentNode.removeChild(알림칸);
      알림칸 = null;
      return;
    }
    if (!알림칸) {
      if (!document.body) return;
      알림칸 = document.createElement('button');
      알림칸.type = 'button';
      알림칸.className = 'gn-못올림';
      // 폰 아래 탭바를 가리지 않게 76px 띄운다
      알림칸.style.cssText = 'position:fixed;right:12px;bottom:76px;z-index:70;padding:9px 13px;' +
        'font-size:13px;line-height:1.3;border:1px solid #f59e0b;border-radius:9px;' +
        'background:#fef3c7;color:#92400e;box-shadow:0 1px 5px rgba(0,0,0,.18)';
      알림칸.addEventListener('click', function () { 알림칸.textContent = '☁ 보내는 중…'; 깨우기(); });
      document.body.appendChild(알림칸);
    }
    알림칸.textContent = '☁ 아직 못 올린 것 ' + n + '건 — 눌러서 다시 보내기';
  }

  function 깨우기() { return 보내기(); }
  function 건수() { return Object.keys(큐).length; }
  function 비우기() { 큐 = {}; 큐저장(); 표시(); }

  window.addEventListener('online', 깨우기);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) 깨우기(); });
  setInterval(깨우기, 30000);
  setInterval(표시, 15000);
  // 열자마자 한 번 — 지난 판에서 못 올린 게 있으면 15초 기다리지 않고 바로 알린다
  if (document.body) 표시(); else document.addEventListener('DOMContentLoaded', 표시);

  ZG.보내기 = { 줄: 줄, 삭제: 삭제, 설정: 설정, 깨우기: 깨우기, 건수: 건수, 비우기: 비우기 };
})(window.ZG);
