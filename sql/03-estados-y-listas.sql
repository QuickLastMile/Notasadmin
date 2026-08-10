-- ============================================================================
-- PARCHE 03 — Estado del pago, adjuntos y listas editables
-- Correr en:  Supabase → SQL Editor → New query → Run
-- Es idempotente: puedes correrlo las veces que quieras.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Estado del pago
--    Un solo campo cubre el ciclo: se registró → se pagó → llegó la factura.
-- ---------------------------------------------------------------------------
alter table caja add column if not exists estado text default 'pendiente_consignacion';

do $$
begin
  alter table caja drop constraint if exists caja_estado_check;
  alter table caja add constraint caja_estado_check
    check (estado in ('pendiente_consignacion','pendiente_factura','finalizado'));
end $$;

-- Los movimientos que ya existían quedan coherentes con lo que tienen
update caja set estado = case
    when tipo = 'ingreso'                          then 'finalizado'
    when tiene_comprobante and tiene_factura       then 'finalizado'
    when tiene_comprobante and not tiene_factura   then 'pendiente_factura'
    else 'pendiente_consignacion'
  end
where estado is null;

-- ---------------------------------------------------------------------------
-- 2. Adjuntos (por si el esquema base es anterior)
-- ---------------------------------------------------------------------------
alter table caja add column if not exists comprobante_url text;
alter table caja add column if not exists factura_url     text;

-- ---------------------------------------------------------------------------
-- 3. Listas editables — lo que sale en cada desplegable de la app
-- ---------------------------------------------------------------------------
create table if not exists listas (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  tipo       text not null,     -- categoria_caja, metodo_pago, banco, tipo_doc…
  valor      text not null,
  orden      int  default 0,
  activo     boolean default true,
  created_at timestamptz default now(),
  unique (user_id, tipo, valor)
);

alter table listas enable row level security;
drop policy if exists "solo_dueno" on listas;
create policy "solo_dueno" on listas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on listas to authenticated;

create index if not exists ix_listas_tipo on listas (user_id, tipo, orden);

-- ---------------------------------------------------------------------------
-- 4. Storage: que se puedan leer y borrar los soportes propios
--    La política del esquema base ya cubre esto, pero se reafirma por si
--    el bucket se creó a mano.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('soportes', 'soportes', false)
on conflict (id) do nothing;

drop policy if exists "soportes_propios" on storage.objects;
create policy "soportes_propios" on storage.objects
  for all
  using      (bucket_id = 'soportes' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'soportes' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 5. Comprobación
-- ---------------------------------------------------------------------------
select 'columnas de caja' as revisa, string_agg(column_name, ', ' order by column_name) as resultado
from information_schema.columns
where table_name = 'caja'
  and column_name in ('estado','comprobante_url','factura_url')
union all
select 'tabla listas',
       case when to_regclass('public.listas') is null then 'FALTA' else 'creada ✓' end
union all
select 'permisos listas',
       case when has_table_privilege('authenticated','listas','INSERT')
            then 'authenticated puede escribir ✓' else 'FALTA GRANT' end
union all
select 'bucket soportes',
       case when exists(select 1 from storage.buckets where id='soportes')
            then 'creado ✓' else 'FALTA' end;
