-- ============================================================================
-- PARCHE 09 — Seguimiento y adjuntos en tareas
-- Correr en:  Supabase → SQL Editor → New query → Run
-- Es idempotente.
-- ============================================================================

-- Bitácora de la tarea: [{fecha, texto}, …]
alter table tareas add column if not exists seguimiento jsonb default '[]'::jsonb;

-- Documentos y fotos: [{ref, nombre, fecha}, …]
-- `ref` es la ruta en Storage, o un data URL en modo local.
alter table tareas add column if not exists adjuntos    jsonb default '[]'::jsonb;

-- Comprobación
select 'columnas en tareas' as revisa,
       coalesce(string_agg(column_name, ', ' order by column_name), 'FALTAN') as resultado
from information_schema.columns
where table_name = 'tareas' and column_name in ('seguimiento','adjuntos','checklist');
