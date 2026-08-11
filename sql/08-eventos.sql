-- ============================================================================
-- PARCHE 08 — Agenda: eventos y fechas especiales
-- Correr en:  Supabase → SQL Editor → New query → Run
-- Es idempotente.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Los eventos NO son tareas: un cumpleaños no se completa, se repite cada
-- año y no vence. Mezclarlos ensuciaría los KPIs de tareas atrasadas.
-- Viven aparte, pero se pintan en el mismo calendario.
-- ---------------------------------------------------------------------------
create table if not exists eventos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),

  tipo        text not null default 'recordatorio'
              check (tipo in ('cumple','reunion','evento','vencimiento','recordatorio')),
  titulo      text not null,

  -- En los cumpleaños solo importan mes y día; el año da la edad si se sabe
  fecha       date not null,
  fecha_fin   date,
  hora        text default '',
  hora_fin    text default '',

  lugar       text default '',
  asistentes  text default '',
  agenda      text default '',
  monto       numeric(14,2) default 0,

  persona_id      uuid references colaboradores(id) on delete set null,
  beneficiario_id uuid references beneficiarios(id) on delete set null,
  cliente_id      uuid references clientes(id)      on delete set null,

  -- Días de anticipación del aviso
  aviso       int  default 1 check (aviso >= 0 and aviso <= 365),
  notas       text default '',

  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),

  constraint fin_no_antes_del_inicio check (fecha_fin is null or fecha_fin >= fecha)
);

alter table eventos enable row level security;
drop policy if exists "solo_dueno" on eventos;
create policy "solo_dueno" on eventos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on eventos to authenticated;

create index if not exists ix_eventos_fecha   on eventos (user_id, fecha);
create index if not exists ix_eventos_persona on eventos (user_id, persona_id);

drop trigger if exists trg_touch on eventos;
create trigger trg_touch before update on eventos
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- Comprobación
-- ---------------------------------------------------------------------------
select 'tabla eventos' as revisa,
       case when to_regclass('public.eventos') is null then 'FALTA' else 'creada ✓' end as resultado
union all
select 'permisos',
       case when has_table_privilege('authenticated','eventos','INSERT')
            then 'authenticated puede escribir ✓' else 'FALTA GRANT' end
union all
select 'columnas',
       coalesce(string_agg(column_name, ', ' order by column_name), 'FALTAN')
from information_schema.columns
where table_name = 'eventos'
  and column_name in ('tipo','fecha','fecha_fin','hora','aviso','persona_id','monto');
