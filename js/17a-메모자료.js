/* 17a-메모자료 — 메모 · 영농일지 자료 + 사진 (12단계 설계 §5·§6 · 세부설계 §3-1·§3-3)
   표는 하나(gn.v1.메모)다. 한 장이 한 줄이라 두 사람이 다른 메모를 같은 시각에 저장해도 서로를 안 덮는다.
   화면은 한 줄도 그리지 않는다 — 그리는 것은 17b 다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 저 = ZG.저장소;
  var 키 = 저.키.메모;

  /* ══════════ 자료 ══════════ */

  function 두자리(n) { return (n < 10 ? '0' : '') + n; }
  function 날짜문자(d) { return d.getFullYear() + '-' + 두자리(d.getMonth() + 1) + '-' + 두자리(d.getDate()); }
  function 오늘() { return 날짜문자(new Date()); }
  function 난수(길이) {
    var s = '';
    while (s.length < 길이) s += Math.random().toString(36).slice(2);
    return s.slice(0, 길이);
  }
  function 새id(종류, 날짜) {
    // 일지는 그날 한 장뿐이다 — id 를 날짜로 못박아 같은 날에 두 장이 생길 수 없게 한다
    return 종류 === '일지' ? '일지-' + 날짜 : 'm-' + Date.now().toString(36) + '-' + 난수(4);
  }

  function 담기(html) {
    var d = document.createElement('div');
    d.innerHTML = html || '';
    return d;
  }
  /* 🔴 카드에 HTML 을 그대로 꽂지 않는다. 언제나 textContent 로 걷어낸다 */
  function 미리보기(본문) { return (담기(본문).textContent || '').replace(/\s+/g, ' ').trim(); }
  /* 블록 하나가 한 줄이다. 첫 줄이 곧 제목이고 나머지가 카드 미리보기가 된다 */
  function 줄들뽑기(본문) {
    var d = 담기(본문), 줄 = [];
    [].slice.call(d.childNodes).forEach(function (n) {
      var t = (n.textContent || '').replace(/\s+/g, ' ').trim();
      if (t) 줄.push(t);
    });
    if (!줄.length) {
      var 통 = 미리보기(본문);
      if (통) 줄.push(통);
    }
    return 줄;
  }
  function 제목뽑기(본문) {
    var 줄 = 줄들뽑기(본문)[0] || '';
    return 줄 ? 줄.slice(0, 60) : '(제목 없음)';
  }
  function 카드미리(본문) { return 줄들뽑기(본문).slice(1).join(' '); }

  function 전부() { return 저.읽기(키); }
  function 한장(id) {
    var 것들 = 전부();
    for (var i = 0; i < 것들.length; i++) if (것들[i].id === id) return 것들[i];
    return null;
  }

  /* 진행상황은 세 가지뿐이다 — 진행중 · 보류 · 완료 (2026-08-19 우람님).
     옛 값(할일·하는중·끝)과 빈칸은 여기서 새 값으로 읽어 준다. 저장된 글자는 안 건드린다 —
     고쳐 저장하면 그때 새 값으로 바뀌고, 안 고친 옛 줄도 화면에서는 제대로 자리를 잡는다 */
  var 상태들 = ['진행중', '완료', '보류'];
  var 상태순 = { 진행중: 0, 보류: 1, 완료: 2 };
  function 상태정규화(값) {
    if (상태순[값] != null) return 값;
    if (값 === '끝') return '완료';
    return '진행중';                       // 할일 · 하는중 · 빈칸
  }

  /* 캐시를 두지 않는다 — 한 달치 수십 줄이라 그릴 때마다 돌아도 싸고, 캐시는 남이 고친 뒤 옛 값을 남긴다 */
  function 목록(조건) {
    var c = 조건 || {};
    var q = (c.검색 || '').trim().toLowerCase();
    var 줄들 = 전부().filter(function (r) {
      if (c.종류 && r.종류 !== c.종류) return false;
      if (c.달 && String(r.날짜 || '').slice(0, 7) !== c.달) return false;
      if (c.폴더 && (r.폴더 || '') !== c.폴더) return false;
      if (q) {
        var 밭 = ((r.제목 || '') + ' ' + 미리보기(r.본문) + ' ' + (r.폴더 || '') + ' ' + (r.특이사항 || '')).toLowerCase();
        if (밭.indexOf(q) < 0) return false;
      }
      return true;
    });
    function 날짜순(a, b) {
      if ((a.날짜 || '') !== (b.날짜 || '')) return (a.날짜 || '') < (b.날짜 || '') ? 1 : -1;
      return (b.만든때 || 0) - (a.만든때 || 0);
    }
    if (c.종류 === '메모') {
      // 진행중 → 보류 → 완료. 같은 칸 안에서는 손으로 옮긴 순서가 먼저, 없으면 새것부터.
      // 순서 없는 줄(-1)이 위로 오는 것은 일부러다 — 새 메모가 옛 순서 밑에 숨으면 못 찾으신다
      줄들.sort(function (a, b) {
        var ga = 상태순[상태정규화(a.상태)], gb = 상태순[상태정규화(b.상태)];
        if (ga !== gb) return ga - gb;
        var oa = a.순서 == null ? -1 : a.순서, ob = b.순서 == null ? -1 : b.순서;
        if (oa !== ob) return oa - ob;
        return 날짜순(a, b);
      });
      return 줄들;
    }
    줄들.sort(날짜순);
    return 줄들;
  }

  function 날짜묶기(줄들) {
    var 묶음 = [], 지금 = null;
    줄들.forEach(function (r) {
      if (!지금 || 지금.날짜 !== r.날짜) { 지금 = { 날짜: r.날짜, 줄들: [] }; 묶음.push(지금); }
      지금.줄들.push(r);
    });
    return 묶음;
  }

  function 폴더세기(달) {
    var 순서 = [], 셈 = {};
    목록({ 종류: '메모', 달: 달 }).forEach(function (r) {
      var 이름 = r.폴더 || '';
      if (!이름) return;
      if (셈[이름] == null) { 셈[이름] = 0; 순서.push(이름); }
      셈[이름]++;
    });
    순서.sort();
    return 순서.map(function (이름) { return { 이름: 이름, 수: 셈[이름] }; });
  }

  function 일지날들(년월) {
    var 표 = {};
    목록({ 종류: '일지', 달: 년월 }).forEach(function (r) { 표[r.날짜] = true; });
    return 표;
  }

  /* 본문이 빈 채로는 아무것도 만들지 않는다 — 새 메모를 열었다 그냥 나가면 빈 줄이 쌓인다 */
  function 알맹이있나(값) {
    if (미리보기(값.본문)) return true;
    if ((값.사진들 || []).length) return true;
    if ((값.특이사항 || '').trim()) return true;
    return false;
  }

  function 저장(값) {
    if (!알맹이있나(값)) return null;
    var 지금 = Date.now();
    var 있던것 = 값.id ? 한장(값.id) : null;
    if (있던것) return 저.바꾸기(키, 값.id, Object.assign({}, 값, { 고친때: 지금 }));
    var 레코드 = Object.assign({ 만든때: 지금 }, 값, { 고친때: 지금 });
    if (!레코드.id) 레코드.id = 새id(레코드.종류, 레코드.날짜);
    저.덧붙이기(키, 레코드);
    return 레코드;
  }

  function 지우기(id) { return 저.지우기(키, id); }

  /* 카드 순서 바꾸기 · 상태 일괄 바꾸기 (수정모드).
     🔴 순서는 「그 상태 칸 안에서만」 뜻이 있다. 옮길 때마다 그 칸 전체를 0..n-1 로 다시 매긴다 —
     반쯤 매겨 두면 순서 있는 줄과 없는 줄이 섞여 다음 이동이 엉뚱한 데로 간다 */
  function 순서되쓰기(줄들) {
    줄들.forEach(function (r, i) {
      if (r.순서 !== i) 저.바꾸기(키, r.id, { 순서: i, 고친때: Date.now() });
    });
  }

  function 옮기기(id, 걸음) {
    var 나 = 한장(id);
    if (!나) return false;
    var 칸 = 목록({ 종류: '메모' }).filter(function (r) {
      return 상태정규화(r.상태) === 상태정규화(나.상태);
    });
    var 자리 = 칸.findIndex(function (r) { return r.id === id; });
    var 갈곳 = 자리 + 걸음;
    if (자리 < 0 || 갈곳 < 0 || 갈곳 >= 칸.length) return false;
    칸.splice(갈곳, 0, 칸.splice(자리, 1)[0]);
    순서되쓰기(칸);
    return true;
  }

  function 상태바꾸기(ids, 상태) {
    var 지금 = Date.now();
    // 칸을 옮기면 옛 칸의 순서는 뜻이 없어진다 — 지워서 새 칸 맨 위로 보낸다
    ids.forEach(function (id) { 저.바꾸기(키, id, { 상태: 상태, 순서: null, 고친때: 지금 }); });
  }

  /* ══════════ 사진 ══════════ */

  /* 경로는 전부 ASCII 다 — 유니코드 파일명은 Storage 에서 사고가 잦다.
     일지 id 는 '일지-2026-08-18' 이라 경로에서만 'diary-' 로 바꿔 쓴다 */
  function 경로키(id) { return id.indexOf('일지-') === 0 ? 'diary-' + id.slice(3) : id; }

  function 그림읽기(파일) {
    // 회전을 먼저 편다 — 안 하면 아이폰 세로 사진이 눕는다
    if (window.createImageBitmap) {
      try {
        return createImageBitmap(파일, { imageOrientation: 'from-image' });
      } catch (e) { /* 아래 <img> 로 떨어진다 */ }
    }
    return new Promise(function (좋다, 안된다) {
      var 주소 = URL.createObjectURL(파일);
      var g = new Image();
      g.onload = function () { URL.revokeObjectURL(주소); 좋다(g); };
      g.onerror = function () { URL.revokeObjectURL(주소); 안된다(new Error('사진을 못 읽었습니다')); };
      g.src = 주소;
    });
  }

  /* 아이폰 원본은 한 장에 3~5MB 다. 올리기 전에 긴 변 1600 · JPEG 0.8 로 줄인다 */
  function 줄이기(파일) {
    return 그림읽기(파일).then(function (그림) {
      var w = 그림.width, h = 그림.height, 큰 = Math.max(w, h);
      if (큰 > 1600) { var 비 = 1600 / 큰; w = Math.round(w * 비); h = Math.round(h * 비); }
      var 판 = document.createElement('canvas');
      판.width = w; 판.height = h;
      판.getContext('2d').drawImage(그림, 0, 0, w, h);
      if (그림.close) 그림.close();
      return new Promise(function (좋다, 안된다) {
        판.toBlob(function (블롭) {
          if (블롭) 좋다(블롭); else 안된다(new Error('사진을 못 줄였습니다'));
        }, 'image/jpeg', 0.8);
      });
    });
  }

  function 저장통() {
    var 서 = ZG.서버;
    if (!서 || !서.켜짐 || !서.클라이언트) return null;
    return 서.클라이언트.storage.from('memo');   // 🔴 버킷 이름은 'memo' — Supabase 는 한글 버킷을 안 받는다
  }

  function 올리기(파일, 메모id) {
    var 통 = 저장통();
    if (!통) return Promise.reject(new Error('오프라인'));
    return 줄이기(파일).then(function (블롭) {
      var 날 = 오늘();
      var 경로 = 날.slice(0, 4) + '/' + 날.slice(5, 7) + '/' + 경로키(메모id) + '/' + 난수(8) + '.jpg';
      return 통.upload(경로, 블롭, { contentType: 'image/jpeg', upsert: false }).then(function (답) {
        if (답 && 답.error) throw 답.error;
        return 경로;
      });
    });
  }

  /* 본문에는 경로만 박혀 있다. 그릴 때 서명 URL(1시간)을 한 번에 묶어 받아 src 에 꽂는다 */
  function 서명걸기(뿌리) {
    // 서명은 1시간짜리다 — 이미 src 가 있어도 다시 받는다(캐시하면 어제 사진이 빈 칸이 된다)
    var 것들 = [].slice.call(뿌리.querySelectorAll('img[data-경로]'));
    if (!것들.length) return;
    var 통 = 저장통();
    if (!통) return;
    var 경로들 = 것들.map(function (g) { return g.getAttribute('data-경로'); });
    통.createSignedUrls(경로들, 3600).then(function (답) {
      var 표 = {};
      ((답 && 답.data) || []).forEach(function (한칸) { if (한칸 && 한칸.signedUrl) 표[한칸.path] = 한칸.signedUrl; });
      것들.forEach(function (g) {
        var 주소 = 표[g.getAttribute('data-경로')];
        if (주소) g.src = 주소;
      });
    }).catch(function (e) { console.warn('사진 주소를 못 받았습니다', e); });
  }

  ZG.메모자료 = {
    두자리: 두자리, 오늘: 오늘, 새id: 새id,
    제목뽑기: 제목뽑기, 미리보기: 미리보기, 카드미리: 카드미리,
    한장: 한장, 목록: 목록, 날짜묶기: 날짜묶기,
    폴더세기: 폴더세기, 일지날들: 일지날들,
    상태들: 상태들, 상태정규화: 상태정규화,
    저장: 저장, 지우기: 지우기, 옮기기: 옮기기, 상태바꾸기: 상태바꾸기,
    저장통: 저장통, 올리기: 올리기, 서명걸기: 서명걸기
  };
})(window.ZG);
