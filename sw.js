/* sw.js — 받아 둔 파일을 폰에 두고 왕복을 없앤다 (우람님 9/3 「탭 누르면 많이 버벅거린다」)

   🔴 탭을 누를 때마다 파일 39개를 서버에 하나씩 「바뀌었나요?」 물어보고 있었다.
      캐시에 이미 있어도 그랬다 — 깃허브 Pages 가 `max-age=600` 만 주기 때문에 10분이면 다시 묻는다.
      폰 지연 150ms 에서 주문 1,368ms · 메모 668ms 로 **시간이 파일 수에 정비례**했다(CPU 는 무관).

   🔴 js·css 주소에는 이미 `?v=` 가 붙어 있다 — **주소가 곧 판 번호**라 같은 주소면 내용이 절대 안 바뀐다.
      그래서 그것만 캐시에서 바로 낸다. 물어보는 것은 HTML 하나뿐이다. 왕복 39 → 1.

   🔴 데이터는 여기 안 걸린다. Supabase 는 다른 출처라 아예 가로채지 않는다(같은 출처만 본다).
      농장 PC 에서 넣으신 것이 폰에 바로 뜨는 Realtime 은 그대로다.

   🔴 8/19 사고(새 판을 올렸는데 폰이 옛 화면을 붙들고 안 바뀜) 막는 법 —
      ① HTML 은 늘 네트워크 먼저다. 새 판이 올라와 있으면 그 자리에서 받는다
         — **`cache:'no-store'` 까지 있어야 참말이다.** 9/17 에 이것 없이 10분을 잃었다
      ② 새 HTML 은 새 `?v=` 를 부른다 → 캐시에 없는 주소라 저절로 새로 받는다
         — **고친 파일의 `?v=` 를 손으로 올려야 한다. 빠뜨리면 조용히 옛것이 나간다**
      ③ 같은 파일의 옛 `?v=` 는 새것을 담을 때 지운다 — 캐시가 안 불어난다
   🔴 이게 통째로 잘못되면 — 빈 sw.js 를 올리면 다음 접속에서 스스로 물러난다.
      브라우저는 화면을 열 때마다 이 파일이 바뀌었는지 본다(캐시를 안 탄다). */

/* 이름을 올리면 activate 가 옛 이름의 캐시를 통째로 버린다 —
   9/17 사고로 폰에 낀 옛 판을 한 번에 털어 내려고 v2 로 올렸다.
   평소엔 안 올린다. `?v=` 만으로 충분하다 */
var 캐시이름 = 'gn-v2';

self.addEventListener('install', function () {
  self.skipWaiting();                      // 새 sw 를 다음 방문까지 재우지 않는다
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (것들) {
      return Promise.all(것들.filter(function (k) { return k !== 캐시이름; })
                             .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function 판뗀주소(주소) { return String(주소).split('?')[0]; }

/* 같은 파일의 옛 `?v=` 를 지운다 — 판을 올릴 때마다 캐시가 쌓이면 폰 저장소를 먹는다 */
function 옛판지우기(캐시, 주소) {
  return 캐시.keys().then(function (것들) {
    var 길 = 판뗀주소(주소);
    return Promise.all(것들.filter(function (q) {
      return q.url !== 주소 && 판뗀주소(q.url) === 길;
    }).map(function (q) { return 캐시.delete(q); }));
  });
}

/* HTML — 늘 네트워크 먼저. 끊겼을 때만 들고 있던 것으로 뜬다(밭에서 신호가 약할 때)

   🔴 `cache:'no-store'` 가 빠지면 네트워크 먼저가 반쪽이 된다 (우람님 9/17 — 올렸는데 옛 화면).
      그냥 fetch 하면 **브라우저 HTTP 캐시를 먼저 본다.** 깃허브 Pages 가 HTML 에 max-age=600 을
      주니, 새 판을 올린 뒤 10분 동안은 네트워크에 물어도 옛 HTML 이 돌아온다.
      옛 HTML 은 옛 `?v=` 를 부르고 그건 아래 캐시에 그대로 있다 → 화면이 통째로 옛것이 된다.
      HTML 의 <meta http-equiv="Cache-Control"> 은 fetch 에 아무 힘이 없다. 여기서 꺼야 한다. */
function 네트워크먼저(요청) {
  return fetch(요청.url, { cache: 'no-store', credentials: 'same-origin' }).then(function (답) {
    if (답 && 답.ok) {
      var 사본 = 답.clone();
      caches.open(캐시이름).then(function (c) { c.put(요청, 사본); });
    }
    return 답;
  }).catch(function () {
    return caches.match(요청).then(function (있) { return 있 || Response.error(); });
  });
}

/* js·css — `?v=` 가 붙어 주소가 곧 판이다. 있으면 묻지 않고 그대로 낸다 */
function 캐시먼저(요청) {
  return caches.match(요청).then(function (있) {
    if (있) return 있;
    return fetch(요청).then(function (답) {
      if (답 && 답.ok) {
        var 사본 = 답.clone();
        caches.open(캐시이름).then(function (c) {
          c.put(요청, 사본).then(function () { return 옛판지우기(c, 요청.url); });
        });
      }
      return 답;
    });
  });
}

self.addEventListener('fetch', function (e) {
  var 요청 = e.request;
  if (요청.method !== 'GET') return;

  var 주소;
  try { 주소 = new URL(요청.url); } catch (err) { return; }

  /* 🔴 다른 출처(Supabase · CDN)는 손도 대지 않는다 — 데이터는 늘 지금처럼 서버에서 온다 */
  if (주소.origin !== self.location.origin) return;

  if (요청.mode === 'navigate' || /\.html$/.test(주소.pathname)) {
    e.respondWith(네트워크먼저(요청));
    return;
  }
  if (/\.(?:js|css)$/.test(주소.pathname)) {
    e.respondWith(캐시먼저(요청));
    return;
  }
  /* 아이콘·폰트·manifest 는 브라우저에 맡긴다 — 거의 안 바뀌고 수도 적다 */
});
