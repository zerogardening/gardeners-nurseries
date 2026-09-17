-- 정원사의 널서리 — 새 채팅·업무가 생기면 알림 함수를 부른다
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여 넣고 한 번만 실행한다.
--
-- 🔴 대시보드의 「Database Webhooks」 를 안 쓴다.
--    그 기능은 supabase_functions 스키마를 따로 켜야 하는데, 안 켜져 있으면
--    「schema "supabase_functions" does not exist」로 막힌다 (2026-09-17 실제로 그랬다).
--    여기서는 pg_net 으로 직접 쏜다 — 하는 일은 똑같고, 켤 것이 하나 줄어든다.

-- ① 서버가 바깥으로 요청을 보낼 수 있게
create extension if not exists pg_net;

-- ② 줄 하나를 알림 함수로 보낸다
create or replace function public.gn_알림쏘기() returns trigger
language plpgsql security definer set search_path = public, net as $$
begin
  perform net.http_post(
    url     := 'https://otenviylktbayvjqshxd.supabase.co/functions/v1/push',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'apikey',        'sb_publishable_Rl19HIvAjNsGXdv8xgK-pg_EydyVmCE'),
    body    := jsonb_build_object(
                 'type',   'INSERT',
                 'table',  'gn_업무',
                 'record', to_jsonb(new))
  );
  return new;
exception when others then
  -- 🔴 알림을 못 보냈다고 메시지 저장까지 실패하면 안 된다. 조용히 넘긴다
  raise warning '알림을 못 쏘았습니다: %', sqlerrm;
  return new;
end $$;

-- ③ 새 줄이 생길 때만. 🔴 채팅·업무만 — 갈래(카테고리)는 알릴 것이 아니다.
--    update 는 걸지 않는다. 걸면 완료 체크 한 번에 알림이 우르르 간다.
drop trigger if exists gn_알림 on public.gn_업무;
create trigger gn_알림
  after insert on public.gn_업무
  for each row
  when (new.내용->>'종류' in ('채팅','업무'))
  execute function public.gn_알림쏘기();

-- ④ 확인 — 방아쇠가 하나 나와야 한다
select tgname as 방아쇠, tgenabled as 켜짐
  from pg_trigger
 where tgrelid = 'public.gn_업무'::regclass and not tgisinternal;
