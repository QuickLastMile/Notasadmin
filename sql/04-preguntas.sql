-- ============================================================================
-- PARCHE 04 — Banco de preguntas
-- Correr en:  Supabase → SQL Editor → New query → Run
-- Es idempotente.
-- ============================================================================

create table if not exists preguntas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  texto       text not null,
  tipo        text not null default 'texto'
              check (tipo in ('texto','numero','sino','unica','multiple','fecha','hora','archivo')),
  opciones    jsonb default '[]'::jsonb,   -- solo para 'unica' y 'multiple'
  proyecto_id uuid references proyectos(id) on delete set null,
  categoria   text,
  orden       int     default 0,
  obligatoria boolean default false,
  activa      boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table preguntas enable row level security;
drop policy if exists "solo_dueno" on preguntas;
create policy "solo_dueno" on preguntas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on preguntas to authenticated;

create index if not exists ix_preguntas_orden on preguntas (user_id, activa, orden);
create index if not exists ix_preguntas_fts on preguntas
  using gin (to_tsvector('spanish', coalesce(texto,'')));

drop trigger if exists trg_touch on preguntas;
create trigger trg_touch before update on preguntas
  for each row execute function touch_updated_at();

-- Comprobación
select
  case when to_regclass('public.preguntas') is null then 'FALTA' else 'creada ✓' end as tabla,
  case when has_table_privilege('authenticated','preguntas','INSERT')
       then 'authenticated puede escribir ✓' else 'FALTA GRANT' end as permisos;
