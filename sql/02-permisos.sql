-- ============================================================================
-- PARCHE 02 — Permisos y seguridad de la vista
-- Correr en:  Supabase → SQL Editor → New query → Run
--
-- Arregla dos cosas que faltaban en el esquema inicial:
--   1. Crear las tablas no da acceso a nadie. Sin GRANT, PostgREST responde
--      401 "permission denied" incluso a un usuario con sesión válida.
--   2. Una vista en Postgres 15+ corre con los permisos de su DUEÑO, no de
--      quien consulta. Es decir: v_arqueo se saltaba el RLS y podía mostrar
--      el arqueo de otro usuario. security_invoker lo corrige.
--
-- Es idempotente: puedes correrlo las veces que quieras.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Acceso al esquema
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Permisos sobre las tablas
--    Solo a `authenticated`: sin sesión no se toca nada. Quien filtra fila por
--    fila sigue siendo el RLS (auth.uid() = user_id); esto es el portero de
--    la puerta, el RLS es el portero de cada oficina. Hacen falta los dos.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['clientes','beneficiarios','periodos','presupuestos','caja',
                           'proyectos','tareas','novedades','dashboards','rutina']
  loop
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. La vista de arqueo debe respetar el RLS de quien consulta
-- ---------------------------------------------------------------------------
alter view v_arqueo set (security_invoker = true);
grant select on v_arqueo to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Que las tablas futuras hereden los permisos y no repetir este parche
-- ---------------------------------------------------------------------------
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
  grant usage, select on sequences to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Comprobación — debe listar las 10 tablas con RLS activo y sus permisos
-- ---------------------------------------------------------------------------
select
  c.relname                                        as tabla,
  c.relrowsecurity                                 as rls_activo,
  (select count(*) from pg_policies p
    where p.tablename = c.relname)                 as politicas,
  has_table_privilege('authenticated', c.oid, 'SELECT') as puede_leer,
  has_table_privilege('authenticated', c.oid, 'INSERT') as puede_escribir
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in ('clientes','beneficiarios','periodos','presupuestos','caja',
                    'proyectos','tareas','novedades','dashboards','rutina')
order by c.relname;
