-- ============================================================================
-- PARCHE 10 — Novedades: seguimiento, evidencia y medición
-- Correr en:  Supabase → SQL Editor → New query → Run
-- Es idempotente.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Estados
--    Se agrega "en_gestion": una novedad que ya se está trabajando no es lo
--    mismo que una que nadie ha tocado.
-- ---------------------------------------------------------------------------
do $$
begin
  alter table novedades drop constraint if exists novedades_estado_check;
  alter table novedades add constraint novedades_estado_check
    check (estado in ('abierta','en_gestion','cerrada'));
end $$;

-- ---------------------------------------------------------------------------
-- 2. Clasificación y quiénes
-- ---------------------------------------------------------------------------
alter table novedades add column if not exists tipo            text default '';
alter table novedades add column if not exists persona_id      uuid references colaboradores(id) on delete set null;
alter table novedades add column if not exists beneficiario_id uuid references beneficiarios(id) on delete set null;
alter table novedades add column if not exists reportado_por   text default '';

-- ---------------------------------------------------------------------------
-- 3. Cierre y medición
--    cerrada_el permite calcular cuánto tardó en resolverse.
-- ---------------------------------------------------------------------------
alter table novedades add column if not exists cerrada_el  date;
alter table novedades add column if not exists solucion    text default '';

-- ---------------------------------------------------------------------------
-- 4. Seguimiento y evidencia
-- ---------------------------------------------------------------------------
alter table novedades add column if not exists seguimiento jsonb default '[]'::jsonb;
alter table novedades add column if not exists evidencias  jsonb default '[]'::jsonb;

-- Coherencia: si está cerrada tiene fecha de cierre, y si no lo está, no
do $$
begin
  alter table novedades drop constraint if exists novedades_cierre_coherente;
  alter table novedades add constraint novedades_cierre_coherente
    check ((estado = 'cerrada' and cerrada_el is not null)
        or (estado <> 'cerrada' and cerrada_el is null));
exception when others then
  -- Si hay filas viejas que no cumplen, se avisa pero no se bloquea el parche
  raise notice 'La restricción de cierre no se aplicó: hay novedades cerradas sin fecha. Ábrelas y ciérralas de nuevo desde la app.';
end $$;

create index if not exists ix_nov_fecha   on novedades (user_id, fecha desc);
create index if not exists ix_nov_persona on novedades (user_id, persona_id);

-- ---------------------------------------------------------------------------
-- 5. Cuántas novedades salieron por mes
--    La misma cuenta que hace la app, disponible para consultas o reportes.
-- ---------------------------------------------------------------------------
drop view if exists v_novedades_mes;

create view v_novedades_mes with (security_invoker = true) as
select
  user_id,
  to_char(fecha, 'YYYY-MM')                                        as mes,
  count(*)                                                          as total,
  count(*) filter (where criticidad = 'alta')                       as criticas,
  count(*) filter (where estado = 'cerrada')                        as cerradas,
  count(*) filter (where estado <> 'cerrada')                       as sin_cerrar,
  round(avg(cerrada_el - fecha) filter (where estado = 'cerrada'), 1) as dias_promedio
from novedades
group by user_id, to_char(fecha, 'YYYY-MM');

grant select on v_novedades_mes to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Comprobación
-- ---------------------------------------------------------------------------
select 'columnas en novedades' as revisa,
       coalesce(string_agg(column_name, ', ' order by column_name), 'FALTAN') as resultado
from information_schema.columns
where table_name = 'novedades'
  and column_name in ('tipo','persona_id','beneficiario_id','reportado_por',
                      'cerrada_el','solucion','seguimiento','evidencias')
union all
select 'vista por mes',
       case when to_regclass('public.v_novedades_mes') is null then 'FALTA' else 'creada ✓' end;
