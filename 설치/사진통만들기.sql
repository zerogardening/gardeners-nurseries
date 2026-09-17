-- 정원사의 널서리 — 사진 넣을 통(Storage 버킷) 만들기
-- Supabase 대시보드 → SQL Editor 에 붙여 넣고 한 번만 실행한다.
-- 🔴 버킷 이름은 'memo' 다. Supabase 는 한글 버킷 이름을 안 받는다.

-- ① 버킷 — 비공개. 10MB 까지. 사진만
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memo', 'memo', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- ② 정책 — 표와 같은 규칙. 로그인한 사람만, 익명은 전부 막힌다
drop policy if exists "메모사진_읽기"   on storage.objects;
drop policy if exists "메모사진_올리기" on storage.objects;
drop policy if exists "메모사진_지우기" on storage.objects;
create policy "메모사진_읽기"   on storage.objects for select to authenticated using (bucket_id = 'memo');
create policy "메모사진_올리기" on storage.objects for insert to authenticated with check (bucket_id = 'memo');
create policy "메모사진_지우기" on storage.objects for delete to authenticated using (bucket_id = 'memo');

-- ③ 확인 — memo 한 줄이 나와야 한다
select id, public, file_size_limit from storage.buckets where id = 'memo';
