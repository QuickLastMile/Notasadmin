-- ============================================================================
-- PARCHE 07 — Clientes con NIT/CECO, colaboradores, y tareas ampliadas
-- Correr en:  Supabase → SQL Editor → New query → Run
-- Es idempotente.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Clientes: NIT, CECO y notas
--    El CECO es solo el código del cliente, no una entidad aparte.
-- ---------------------------------------------------------------------------
alter table clientes add column if not exists nit   text default '';
alter table clientes add column if not exists ceco  text default '';
alter table clientes add column if not exists notas text default '';

-- ---------------------------------------------------------------------------
-- 2. Colaboradores: contactos de la operación, NO usuarios de la app
-- ---------------------------------------------------------------------------
create table if not exists colaboradores (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  cliente_id  uuid references clientes(id) on delete set null,
  nombre      text not null,
  cedula      text default '',
  cargo       text default '',
  celular     text default '',
  correo      text default '',
  area        text default '',
  ciudad      text default '',
  activo      boolean default true,
  notas       text default '',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table colaboradores enable row level security;
drop policy if exists "solo_dueno" on colaboradores;
create policy "solo_dueno" on colaboradores
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on colaboradores to authenticated;

create index if not exists ix_colab_cliente on colaboradores (user_id, cliente_id);

drop trigger if exists trg_touch on colaboradores;
create trigger trg_touch before update on colaboradores
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Tareas: estados nuevos, tipo, persona, hora, espera, checklist, resultado
-- ---------------------------------------------------------------------------
do $$
begin
  alter table tareas drop constraint if exists tareas_estado_check;
  -- 'en_curso' se conserva por si quedó algún registro viejo con ese valor
  alter table tareas add constraint tareas_estado_check
    check (estado in ('pendiente','en_curso','en_proceso','en_espera','hecho','cancelada'));
end $$;

alter table tareas add column if not exists tipo         text default '';
alter table tareas add column if not exists persona_id   uuid references colaboradores(id) on delete set null;
alter table tareas add column if not exists hora         text default '';
alter table tareas add column if not exists espera_que   text default '';
alter table tareas add column if not exists espera_fecha date;
alter table tareas add column if not exists checklist    jsonb default '[]'::jsonb;
alter table tareas add column if not exists resultado    text default '';

create index if not exists ix_tareas_persona on tareas (user_id, persona_id);
create index if not exists ix_tareas_espera  on tareas (user_id, espera_fecha)
  where estado = 'en_espera';

-- ---------------------------------------------------------------------------
-- 4. Comprobación
-- ---------------------------------------------------------------------------
select 'clientes' as revisa,
       coalesce(string_agg(column_name, ', ' order by column_name), 'FALTAN') as resultado
from information_schema.columns
where table_name = 'clientes' and column_name in ('nit','ceco','notas')
union all
select 'colaboradores',
       case when to_regclass('public.colaboradores') is null then 'FALTA' else 'creada ✓' end
union all
select 'permiso colaboradores',
       case when has_table_privilege('authenticated','colaboradores','INSERT')
            then 'authenticated puede escribir ✓' else 'FALTA GRANT' end
union all
select 'tareas',
       coalesce(string_agg(column_name, ', ' order by column_name), 'FALTAN')
from information_schema.columns
where table_name = 'tareas'
  and column_name in ('tipo','persona_id','hora','espera_que','espera_fecha','checklist','resultado');
