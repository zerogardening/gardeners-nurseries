/* push — 새 채팅·업무가 들어오면 폰으로 알림을 보낸다 (2026-09-17 우람님)

   🔴 이 파일은 깃허브 Pages 에 올라가는 앱의 일부가 아니다.
      Supabase 쪽에 따로 올린다(대시보드 Edge Functions). 차례는 설치/푸시알림.md.

   부르는 쪽은 Supabase 의 Database Webhook 이다 —
   gn_업무 에 줄이 하나 생기면 그 줄을 이리로 보낸다.

   🔴 VAPID 비밀 열쇠는 코드에 쓰지 않는다. Edge Functions 의 비밀값으로 둔다. */
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const 공개열쇠 = Deno.env.get('VAPID_PUBLIC')!;
const 비밀열쇠 = Deno.env.get('VAPID_PRIVATE')!;
const 연락처   = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:zerogardening@naver.com';

webpush.setVapidDetails(연락처, 공개열쇠, 비밀열쇠);

/* service_role 열쇠로 붙는다 — 구독 표를 읽고, 죽은 구독을 지우려면 필요하다 */
const 서버 = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

function 짧게(s: string, n = 60) {
  s = String(s ?? '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n) + '…' : s;
}

Deno.serve(async (req) => {
  try {
    const 몸 = await req.json();
    /* Database Webhook 은 { type, table, record, old_record } 로 온다 */
    const 줄 = 몸?.record ?? 몸;
    if (!줄) return new Response('빈 요청', { status: 400 });

    const 내용 = 줄.내용 ?? 줄;
    if (줄.삭제됨) return new Response('삭제된 줄 — 안 보냄', { status: 200 });

    /* 무엇이 왔는가 — 채팅과 업무만 알린다. 갈래(카테고리) 줄은 조용히 넘긴다 */
    let 제목 = '', 글 = '', 갈래 = '', 주소 = '홈.html';
    if (내용.종류 === '채팅') {
      갈래 = '채팅';
      제목 = '새 메시지';
      글 = 짧게(내용.글 || (내용.사진 ? '사진을 보냈습니다' : ''));
      if (!글) return new Response('빈 채팅 — 안 보냄', { status: 200 });
    } else if (내용.종류 === '업무') {
      갈래 = '업무';
      제목 = '새 업무';
      글 = 짧게(내용.제목 || '업무가 등록됐습니다');
    } else {
      return new Response('알릴 갈래가 아니다', { status: 200 });
    }

    /* 보낸 사람 이름을 붙인다 — 「누가」가 없으면 알림이 심심하다 */
    const 쓴이 = String(내용.쓴이 || '').toLowerCase();
    if (쓴이) {
      const { data: 사람 } = await 서버.from('gn_사람').select('내용').eq('id', 쓴이).maybeSingle();
      const 이름 = 사람?.내용?.이름;
      if (이름) 제목 = 이름;
    }

    const { data: 구독들, error } = await 서버
      .from('gn_구독').select('id,내용').eq('삭제됨', false);
    if (error) throw error;

    const 짐 = JSON.stringify({ 제목, 글, 갈래, 주소 });
    let 보냄 = 0, 지움 = 0;

    await Promise.all((구독들 ?? []).map(async (r: any) => {
      const c = r.내용 ?? {};
      /* 🔴 보낸 사람 자신에게는 안 보낸다 — 제 말에 제가 알림을 받으면 성가시다 */
      if (쓴이 && String(c.사람 || '').toLowerCase() === 쓴이) return;
      if (!c.endpoint || !c.p256dh || !c.auth) return;
      try {
        await webpush.sendNotification(
          { endpoint: c.endpoint, keys: { p256dh: c.p256dh, auth: c.auth } },
          짐
        );
        보냄++;
      } catch (e: any) {
        /* 404·410 은 그 기기가 앱을 지웠다는 뜻이다 — 줄을 지운다.
           안 지우면 죽은 구독에 영영 보내게 된다 */
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await 서버.from('gn_구독').update({ 삭제됨: true, 내용: { id: r.id } }).eq('id', r.id);
          지움++;
        } else {
          console.error('못 보냄', e?.statusCode, e?.body ?? e?.message);
        }
      }
    }));

    return new Response(JSON.stringify({ 보냄, 지움 }), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (e) {
    console.error(e);
    return new Response(String(e), { status: 500 });
  }
});
