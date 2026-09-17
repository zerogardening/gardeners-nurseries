/* 01f-알림 — 푸시 알림 켜기 (2026-09-17 우람님)

   앱이 꺼져 있어도 새 채팅·업무가 오면 폰에 알림이 뜬다.
   여기는 **받을 준비**만 한다 — 실제로 보내는 것은 Supabase Edge Function 이다.
   차린 차례는 설치/푸시알림.md 에 있다.

   🔴 아이폰은 조건이 까다롭다 —
      ① iOS 16.4 이상 ② **홈 화면에 담은 앱**에서만 (사파리 탭에서는 안 된다)
      ③ 사람이 직접 누른 그 순간에만 허락을 물을 수 있다
      그래서 「알림 켜기」를 눌렀을 때만 묻는다. 저절로 묻지 않는다.

   🔴 구독은 **기기마다** 다르다. 한 사람이 폰과 PC 를 쓰면 줄이 둘이다. 그게 맞다 —
      두 기기 다 알림이 와야 한다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  /* 🔴 이 열쇠는 남이 봐도 되는 **공개** 열쇠다. 짝이 되는 비밀 열쇠는
     Supabase 쪽 비밀값으로만 두고 저장소에 올리지 않는다 (설치/푸시알림.md). */
  var 공개열쇠 = 'BBkzqhLEpDusGXcezTwyVDFFp2bTMbLFNC_10GIeBtgo9OSTDFQwreLug74IJdKBgzIEslipGbDnxMcWP1lQKAk';

  var 저 = ZG.저장소;

  function 열쇠바꾸기(문자) {
    var 채움 = '='.repeat((4 -문자.length % 4) % 4);
    var 보통 = (문자 + 채움).replace(/-/g, '+').replace(/_/g, '/');
    var 날것 = atob(보통);
    var 통 = new Uint8Array(날것.length);
    for (var i = 0; i < 날것.length; i++) 통[i] = 날것.charCodeAt(i);
    return 통;
  }

  /* 이 기기에서 쓸 수 있나 */
  function 될까() {
    return !!(window.Notification && navigator.serviceWorker && window.PushManager);
  }

  /* 아이폰인데 아직 홈 화면에 안 담았으면 알림을 못 켠다 — 그 사정을 알려 줘야 한다 */
  function 아이폰인가() { return /iPad|iPhone|iPod/.test(navigator.userAgent); }
  function 담은앱인가() {
    return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  }

  function 지금상태() {
    if (!될까()) return '못함';
    if (아이폰인가() && !담은앱인가()) return '홈화면필요';
    return Notification.permission;   // 'default' | 'granted' | 'denied'
  }

  /* 구독 한 줄을 서버에 남긴다. id 는 endpoint 를 눌러 만든다 —
     같은 기기가 두 번 켜도 줄이 하나다 */
  function 구독id(endpoint) {
    var n = 0, s = String(endpoint);
    for (var i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) % 2147483647;
    return 'sub-' + n.toString(36) + '-' + s.slice(-12).replace(/[^a-zA-Z0-9]/g, '');
  }

  function 남기기(구독) {
    var j = 구독.toJSON ? 구독.toJSON() : 구독;
    var 키들 = j.keys || {};
    저.덧붙이기(저.키.구독, {
      id: 구독id(j.endpoint),
      endpoint: j.endpoint,
      p256dh: 키들.p256dh || '',
      auth: 키들.auth || '',
      사람: (ZG.사람 && ZG.사람.나키()) || '',
      기기: navigator.userAgent.slice(0, 120),
      만든때: Date.now()
    });
  }

  /* 사람이 「알림 켜기」를 눌렀을 때만 부른다 */
  function 켜기(그때) {
    그때 = 그때 || function () {};
    var u = ZG.ui;

    if (!될까()) { u.토스트('이 기기에서는 알림을 못 씁니다'); return 그때(false); }
    if (아이폰인가() && !담은앱인가()) {
      u.확인({
        제목: '먼저 홈 화면에 담아주세요',
        본문: '아이폰은 <b>홈 화면에 담은 앱</b>에서만 알림을 받을 수 있습니다.<br>' +
              '사파리 아래 공유 단추(↑) → 「홈 화면에 추가」 → 그 아이콘으로 열고 다시 켜주세요.',
        확인글: '알겠습니다', 취소글: '닫기'
      }, function () {});
      return 그때(false);
    }

    Notification.requestPermission().then(function (답) {
      if (답 !== 'granted') {
        u.토스트(답 === 'denied' ? '알림이 거부돼 있습니다 — 설정에서 풀어주세요' : '알림을 안 켰습니다');
        return 그때(false);
      }
      return navigator.serviceWorker.ready.then(function (등록) {
        return 등록.pushManager.getSubscription().then(function (있던것) {
          if (있던것) return 있던것;
          return 등록.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: 열쇠바꾸기(공개열쇠)
          });
        });
      }).then(function (구독) {
        남기기(구독);
        저.설정쓰기({ 알림켬: true });
        u.토스트('알림을 켰습니다');
        그때(true);
      });
    }).catch(function (e) {
      console.warn('알림을 못 켰습니다', e);
      ZG.ui.토스트('알림을 못 켰습니다');
      그때(false);
    });
  }

  function 끄기(그때) {
    그때 = 그때 || function () {};
    저.설정쓰기({ 알림켬: false });
    if (!될까()) return 그때();
    navigator.serviceWorker.ready.then(function (등록) {
      return 등록.pushManager.getSubscription();
    }).then(function (구독) {
      if (!구독) return;
      저.지우기(저.키.구독, 구독id(구독.endpoint));   // 서버에서도 지운다 — 안 그러면 계속 보낸다
      return 구독.unsubscribe();
    }).then(function () {
      ZG.ui.토스트('알림을 껐습니다');
      그때();
    }).catch(function (e) { console.warn(e); 그때(); });
  }

  function 켜져있나() {
    try { return 지금상태() === 'granted' && !!저.설정읽기().알림켬; } catch (e) { return false; }
  }

  ZG.알림 = { 될까: 될까, 지금상태: 지금상태, 켜져있나: 켜져있나, 켜기: 켜기, 끄기: 끄기 };
})(window.ZG);
