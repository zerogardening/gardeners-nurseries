-- 정원사의 널서리 — 표 만들기
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여 넣고 한 번만 실행한다.
-- 우람님 v3 에서 검증된 구조를 그대로 가져왔다 (이름만 v3_ → gn_).

-- ① 수정시각·수정자 자동 기록
create or replace function public.gn_손댐() returns trigger language plpgsql as $t$
begin new.수정시각 := now(); new.수정자 := auth.uid(); return new; end $t$;

-- ② 표 12개 + 인덱스 + Realtime
do $$
declare t text; n text;
begin
  foreach t in array array['품목','입고','출고','재고조정','업체',
                           '명세서','명세서줄','견적요청','메모',
                           '사람','업무','공유설정']
  loop
    n := 'gn_' || t;
    execute format('create table if not exists public.%I (
        id text primary key,
        내용 jsonb not null,
        삭제됨 boolean not null default false,
        수정시각 timestamptz not null default now(),
        수정자 uuid default auth.uid())', n);
    execute format('drop trigger if exists 손댐 on public.%I', n);
    execute format('create trigger 손댐 before update on public.%I
        for each row execute function public.gn_손댐()', n);
    execute format('create index if not exists %I on public.%I (수정시각)', n||'_시각', n);
    begin
      execute format('alter publication supabase_realtime add table public.%I', n);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ③ RLS — 로그인한 사람만. 로그인 안 한 사람은 전부 막는다
do $$
declare t text; n text;
begin
  foreach t in array array['품목','입고','출고','재고조정','업체',
                           '명세서','명세서줄','견적요청','메모',
                           '사람','업무','공유설정']
  loop
    n := 'gn_' || t;
    execute format('alter table public.%I enable row level security', n);
    execute format('revoke all on public.%I from anon', n);
    execute format('drop policy if exists "로그인한사람만" on public.%I', n);
    execute format('create policy "로그인한사람만" on public.%I
        for all to authenticated using (true) with check (true)', n);
  end loop;
end $$;

-- ④ 확인 — 표 12개가 나와야 한다
select table_name from information_schema.tables
 where table_schema='public' and table_name like 'gn\_%'
 order by table_name;
