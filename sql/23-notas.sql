-- MÓDULO DE NOTAS — ejecutar una sola vez en Supabase → SQL Editor
create table if not exists notas_carpetas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  nombre text not null,
  color text not null default '#D9A03A',
  created_at timestamptz default now()
);

create table if not exists notas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  carpeta_id uuid references notas_carpetas(id) on delete set null,
  titulo text not null default 'Sin título',
  contenido text not null default '',
  color text not null default '#FFF7DF',
  etiquetas text[] not null default '{}',
  anclada boolean not null default false,
  recordatorio timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table notas_carpetas enable row level security;
alter table notas enable row level security;
drop policy if exists "solo_dueno" on notas_carpetas;
drop policy if exists "solo_dueno" on notas;
create policy "solo_dueno" on notas_carpetas for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "solo_dueno" on notas for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
grant select,insert,update,delete on notas_carpetas,notas to authenticated;
create index if not exists ix_notas_usuario_actualizada on notas(user_id,updated_at desc);
create index if not exists ix_notas_carpeta on notas(user_id,carpeta_id);

drop trigger if exists trg_touch on notas;
create trigger trg_touch before update on notas for each row execute function touch_updated_at();

