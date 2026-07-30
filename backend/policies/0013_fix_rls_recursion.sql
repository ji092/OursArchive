-- 긴급 버그 수정 (2026-07-30): partner 역할로는 love/wedding/pregnancy 데이터가 전부 안 보이던 문제.
-- 원인: is_master()/can_access_couple_content() 등 헬퍼 함수가 security definer가 아니어서, 함수
-- 내부에서 membership 테이블을 조회할 때 호출자의 RLS(membership_select 정책)가 그대로 다시 걸린다.
-- membership_select 정책 자체가 "user_id = auth.uid() or is_master(workspace_id)"라서 is_master()를
-- 다시 호출하게 되고 -> 그 안에서 또 membership을 조회 -> 다시 RLS -> 다시 is_master() ... 무한 재귀에
-- 빠져 "stack depth limit exceeded"로 쿼리가 실패한다. master는 자기 자신의 행에서 첫 조건이 바로
-- 참이 되어 재귀에 안 걸렸지만(운좋게 우회), partner/family/guest는 항상 이 재귀를 타서 실패했다.
--
-- 해결: 아래 8개 헬퍼 함수를 전부 security definer + search_path 고정으로 바꾼다. 함수 소유자(postgres)가
-- 테이블 소유자라 RLS를 우회하므로, 함수 내부 조회에서 재귀가 끊긴다. 이 함수들은 boolean 하나만
-- 반환하고 임의 데이터를 노출하지 않으므로 definer로 바꿔도 권한 상승 위험이 없다.

create or replace function is_active_member(ws uuid)
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1 from membership
    where workspace_id = ws and user_id = auth.uid() and status = 'active'
  );
$$;

create or replace function is_master(ws uuid)
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1 from membership
    where workspace_id = ws and user_id = auth.uid() and role = 'master' and status = 'active'
  );
$$;

create or replace function can_access_couple_content(ws uuid)
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1 from membership
    where workspace_id = ws and user_id = auth.uid()
      and status = 'active' and role in ('master', 'partner')
  );
$$;

create or replace function love_comment_accessible(target uuid)
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1 from love_record lr
    where lr.id = target and can_access_couple_content(lr.workspace_id)
  );
$$;

create or replace function can_read_pregnancy_content(ws uuid, vis content_visibility)
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1 from membership m
    where m.workspace_id = ws and m.user_id = auth.uid() and m.status = 'active'
      and (
        m.role in ('master', 'partner')
        or (m.role = 'family' and vis = 'family')
        or (m.role = 'guest' and vis = 'guest')
      )
  );
$$;

create or replace function can_comment_pregnancy_content(ws uuid, vis content_visibility)
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1 from membership m
    where m.workspace_id = ws and m.user_id = auth.uid() and m.status = 'active'
      and (m.role in ('master', 'partner') or (m.role = 'family' and vis = 'family'))
  );
$$;

-- pregnancy_comment_accessible은 0009_pregnancy_family_revoke.sql에서 couple 전용으로 교체된 최신
-- 본문을 그대로 유지하면서 security definer만 추가한다 (want_write 인자는 호환용으로 남겨둠).
create or replace function pregnancy_comment_accessible(target uuid, want_write boolean)
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1 from pregnancy_diary d
    where d.id = target and can_access_couple_content(d.workspace_id)
  );
$$;

create or replace function baby_comment_accessible(target uuid, want_write boolean)
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1 from baby_record b
    where b.id = target
      and (
        case when want_write then can_comment_pregnancy_content(b.workspace_id, b.visibility)
             else can_read_pregnancy_content(b.workspace_id, b.visibility) end
      )
  );
$$;
