/* 01a-설정 — 서버 주소·열쇠와 상호를 여기 한 곳에만 둔다.
   🔴 Supabase 프로젝트를 새로 파면 아래 두 줄만 갈아끼우면 된다. 다른 파일은 손대지 않는다.
   비워 두면 서버 없이 이 기기 안에서만 돈다 (로그인도 건너뛴다). */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 서버주소 = 'https://otenviylktbayvjqshxd.supabase.co';
  var 공개키 = 'sb_publishable_Rl19HIvAjNsGXdv8xgK-pg_EydyVmCE';

  ZG.설정 = {
    서버주소: 서버주소,
    공개키: 공개키,
    켜짐: !!(서버주소 && 공개키),

    상호: '정원사의 널서리',
    영문상호: "GARDENER'S NURSERIES IWOL",
    주소: '충북 진천군 이월면',

    /* supabase-js 가 세션을 넣어 두는 열쇠 이름 — 주소에서 프로젝트 ref 를 뽑아 만든다 */
    토큰키: function () {
      var m = /https?:\/\/([^.]+)\./.exec(서버주소);
      return m ? 'sb-' + m[1] + '-auth-token' : '';
    },

    로그인화면: '로그인.html'
  };
})(window.ZG);
