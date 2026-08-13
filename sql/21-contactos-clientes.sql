-- Ejecutar una vez en Supabase > SQL Editor.
-- Habilita la información extendida y los contactos múltiples de clientes.
alter table clientes add column if not exists nit text default '';
alter table clientes add column if not exists ceco text default '';
alter table clientes add column if not exists notas text default '';
alter table clientes add column if not exists campos jsonb not null default '{}'::jsonb;

-- Fuerza a PostgREST a refrescar su caché después de modificar la tabla.
notify pgrst, 'reload schema';
