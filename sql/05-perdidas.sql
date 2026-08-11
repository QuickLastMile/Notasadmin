-- ============================================================================
-- PARCHE 05 — Pérdidas en caja menor
-- Correr en:  Supabase → SQL Editor → New query → Run
-- Es idempotente.
-- ============================================================================

alter table caja add column if not exists perdida        boolean default false;
alter table caja add column if not exists motivo_perdida text;

-- Para el filtro "Pérdidas" y el KPI del arqueo
create index if not exists ix_caja_perdidas on caja (user_id, periodo_id) where perdida;

-- ---------------------------------------------------------------------------
-- La vista de arqueo separa lo perdido de lo pendiente.
-- Mezclarlos inflaba "por cobrar" con plata que nadie va a devolver.
--
-- Va DROP y no CREATE OR REPLACE: reemplazar una vista solo permite agregar
-- columnas al final, no renombrarlas ni cambiarlas de orden, y aquí entra
-- "perdido" en medio. Postgres responde:
--   ERROR 42P16: cannot change name of view column "cobrable" to "perdido"
-- Soltarla no pierde nada: una vista es una consulta con nombre, no datos.
-- ---------------------------------------------------------------------------
drop view if exists v_arqueo;

create view v_arqueo with (security_invoker = true) as
select
  c.user_id,
  c.periodo_id,
  p.nombre as periodo,
  p.estado,
  sum(c.monto) filter (where c.tipo = 'ingreso')                   as base,
  sum(c.monto) filter (where c.tipo = 'gasto')                     as gastado,
  sum(case when c.tipo = 'ingreso' then c.monto else -c.monto end) as saldo,
  sum(c.reembolsado) filter (where c.tipo = 'gasto')               as reembolsado,

  -- Pendiente: solo lo recuperable
  sum(c.monto - c.reembolsado)
    filter (where c.tipo = 'gasto' and not c.perdida)              as pendiente,
  -- Pérdidas: lo que ya se dio por no recuperable
  sum(c.monto - c.reembolsado)
    filter (where c.tipo = 'gasto' and c.perdida)                  as perdido,

  sum(c.monto - c.reembolsado)
    filter (where c.tipo = 'gasto' and not c.perdida and c.legalizado)     as cobrable,
  sum(c.monto - c.reembolsado)
    filter (where c.tipo = 'gasto' and not c.perdida and not c.legalizado) as trabado,

  count(*) filter (where c.tipo = 'gasto' and not c.perdida and not c.legalizado) as n_sin_legalizar,
  count(*) filter (where c.tipo = 'gasto' and c.perdida)                          as n_perdidas,
  count(*) filter (where c.tipo = 'gasto' and not c.perdida
                     and (not c.tiene_comprobante or not c.tiene_factura))        as n_sin_soporte
from caja c
join periodos p on p.id = c.periodo_id
group by c.user_id, c.periodo_id, p.nombre, p.estado;

grant select on v_arqueo to authenticated;

-- ---------------------------------------------------------------------------
-- Comprobación
-- ---------------------------------------------------------------------------
select 'columnas en caja' as revisa,
       coalesce(string_agg(column_name, ', ' order by column_name), 'FALTAN') as resultado
from information_schema.columns
where table_name = 'caja' and column_name in ('perdida','motivo_perdida')
union all
select 'vista v_arqueo',
       case when to_regclass('public.v_arqueo') is null then 'FALTA' else 'recreada ✓' end
union all
select 'permiso de lectura',
       case when has_table_privilege('authenticated','v_arqueo','SELECT')
            then 'authenticated puede leerla ✓' else 'FALTA GRANT' end;
