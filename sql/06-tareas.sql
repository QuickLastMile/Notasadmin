-- ============================================================================
-- PARCHE 06 — Tareas: repetición y fecha de cierre
-- Correr en:  Supabase → SQL Editor → New query → Run
-- Es idempotente.
-- ============================================================================

alter table tareas add column if not exists repite        text default '';
alter table tareas add column if not exists completada_el date;

do $$
begin
  alter table tareas drop constraint if exists tareas_repite_check;
  alter table tareas add constraint tareas_repite_check
    check (repite in ('', 'diaria', 'semanal', 'quincenal', 'mensual'));
end $$;

-- Las que se repiten se consultan al cerrar cada tarea
create index if not exists ix_tareas_repite on tareas (user_id, repite) where repite <> '';

-- Comprobación
select 'columnas en tareas' as revisa,
       coalesce(string_agg(column_name, ', ' order by column_name), 'FALTAN') as resultado
from information_schema.columns
where table_name = 'tareas' and column_name in ('repite','completada_el','notas');
