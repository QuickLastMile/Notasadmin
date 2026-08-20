-- ============================================================================
-- HUB PERSONAL — Esquema para Supabase
-- Pega esto completo en:  Supabase → SQL Editor → New query → Run
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. CATÁLOGOS
-- ---------------------------------------------------------------------------

create table if not exists clientes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  nombre      text not null,
  contacto    text,
  nit         text default '',
  ceco        text default '',
  notas       text default '',
  campos      jsonb not null default '{}'::jsonb,
  color       text default '#2563eb',
  activo      boolean default true,
  created_at  timestamptz default now()
);

-- Mensajeros y proveedores a quienes se les paga
create table if not exists beneficiarios (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  nombre      text not null,
  tipo_doc    text default 'CC' check (tipo_doc in ('CC','NIT','CE','PPT')),
  documento   text,
  banco       text,
  tipo_cuenta text default 'Ahorros',
  cuenta      text,
  telefono    text,
  rol         text default 'Mensajero',
  activo      boolean default true,
  created_at  timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 2. CAJA MENOR
-- ---------------------------------------------------------------------------

-- Un período = un mes de caja: se abre con una base y se cierra al legalizar
create table if not exists periodos (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade default auth.uid(),
  nombre             text not null,
  inicio             date not null,
  fin                date not null,
  base_asignada      numeric(14,2) default 0,
  estado             text default 'abierto' check (estado in ('abierto','cerrado')),
  cerrado_el         date,
  reembolso_recibido numeric(14,2) default 0,
  created_at         timestamptz default now()
);

-- Solo un período abierto a la vez por usuario
create unique index if not exists ux_periodo_abierto
  on periodos (user_id) where estado = 'abierto';

create table if not exists caja (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  periodo_id  uuid references periodos(id) on delete set null,

  tipo        text not null check (tipo in ('ingreso','gasto')),
  fecha       date not null default current_date,
  concepto    text not null,
  categoria   text default 'Otros',
  monto       numeric(14,2) not null check (monto >= 0),
  cliente_id  uuid references clientes(id) on delete set null,

  -- A quién se le pagó y a qué cuenta
  beneficiario_id uuid references beneficiarios(id) on delete set null,
  metodo_pago     text default 'Transferencia',

  -- Soportes
  comprobante_pago  text,             -- N° de la transferencia / voucher
  comprobante_url   text,             -- foto del soporte (Storage)
  factura_num       text,             -- N° factura o cuenta de cobro
  factura_url       text,             -- foto de la factura (Storage)
  tiene_comprobante boolean default false,
  tiene_factura     boolean default false,

  -- Legalización y reembolso
  legalizado    boolean default false,
  legalizado_el date,
  reembolsado   numeric(14,2) default 0 check (reembolsado >= 0),

  observacion text,
  campos      jsonb not null default '{}'::jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),

  -- No puedes haber recibido más de lo que gastaste
  constraint reembolso_no_supera_monto check (reembolsado <= monto)
);

-- Topes de gasto por categoría y período
create table if not exists presupuestos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  categoria  text not null,
  tope       numeric(14,2) not null default 0,
  created_at timestamptz default now(),
  unique (user_id, categoria)
);

-- ---------------------------------------------------------------------------
-- 3. RESTO DE MÓDULOS
-- ---------------------------------------------------------------------------

create table if not exists proyectos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  nombre      text not null,
  cliente_id  uuid references clientes(id) on delete set null,
  estado      text default 'en_curso' check (estado in ('propuesta','en_curso','en_riesgo','hecho')),
  avance      int  default 0 check (avance between 0 and 100),
  avance_modo text default 'automatico' check (avance_modo in ('automatico','manual')),
  vence       date,
  notas       text,
  responsable_id uuid,
  repositorio_url text default '',
  base_url       text default '',
  seguimiento   jsonb default '[]'::jsonb,
  campos        jsonb not null default '{}'::jsonb,
  drive_folder_id text default '',
  drive_folder_url text default '',
  calendar_event_id text default '',
  calendar_event_url text default '',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists campos_personalizados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  nombre text not null,
  entidad text not null default 'proyectos' check (entidad in ('proyectos')),
  tipo text not null default 'texto' check (tipo in ('texto','numero','fecha','seleccion','booleano')),
  descripcion text default '', opciones jsonb not null default '[]'::jsonb,
  obligatorio boolean not null default false, activo boolean not null default true,
  orden int not null default 0, created_at timestamptz default now(), updated_at timestamptz default now(),
  unique(user_id, entidad, nombre)
);

create table if not exists tareas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  titulo      text not null,
  cliente_id  uuid references clientes(id)  on delete set null,
  proyecto_id uuid references proyectos(id) on delete set null,
  prioridad   text default 'media' check (prioridad in ('alta','media','baja')),
  estado      text default 'pendiente' check (estado in ('pendiente','en_curso','hecho')),
  vence       date,
  notas       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists novedades (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  fecha         date not null default current_date,
  titulo        text not null,
  detalle       text,
  cliente_id    uuid references clientes(id) on delete set null,
  criticidad    text default 'media' check (criticidad in ('alta','media','baja')),
  estado        text default 'abierta' check (estado in ('abierta','cerrada')),
  accion        text,
  evidencia_url text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists dashboards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  nombre      text not null,
  url         text not null,
  cliente_id  uuid references clientes(id) on delete set null,
  detalles    jsonb not null default '{"observaciones":"","enlaces":[]}'::jsonb,
  created_at  timestamptz default now()
);

create table if not exists rutina (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  texto       text not null,
  orden       int default 0,
  hecho_el    date,
  created_at  timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY  (cada quien ve solo lo suyo)
--    Sin esto, la anon key expuesta en GitHub Pages sería un problema.
-- ---------------------------------------------------------------------------

-- El RLS filtra fila por fila, pero antes hace falta el GRANT: sin él,
-- PostgREST responde 401 "permission denied" incluso con sesión válida.
-- Son dos capas distintas y hacen falta las dos.
do $$
declare t text;
begin
  foreach t in array array['clientes','beneficiarios','periodos','caja','presupuestos',
                           'proyectos','campos_personalizados','tareas','novedades','dashboards','rutina']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "solo_dueno" on %I', t);
    execute format($f$
      create policy "solo_dueno" on %I
        for all
        using (auth.uid() = user_id)
        with check (auth.uid() = user_id)
    $f$, t);
    -- Solo a authenticated: sin sesión no se toca nada
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;

grant usage on schema public to anon, authenticated;

-- Que las tablas nuevas hereden los permisos sin tener que acordarse
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;

-- ---------------------------------------------------------------------------
-- 5. ÍNDICES
-- ---------------------------------------------------------------------------

create index if not exists ix_caja_periodo   on caja (user_id, periodo_id, fecha desc);
create index if not exists ix_caja_pendiente on caja (user_id, legalizado, reembolsado);
create index if not exists ix_caja_benef     on caja (user_id, beneficiario_id);
create index if not exists ix_tareas_pend    on tareas (user_id, estado, vence);
create index if not exists ix_nov_abiertas   on novedades (user_id, estado, fecha desc);
create index if not exists ix_proy_cliente   on proyectos (user_id, cliente_id);

create index if not exists ix_tareas_fts on tareas
  using gin (to_tsvector('spanish', coalesce(titulo,'') || ' ' || coalesce(notas,'')));
create index if not exists ix_nov_fts on novedades
  using gin (to_tsvector('spanish', coalesce(titulo,'') || ' ' || coalesce(detalle,'')));

-- ---------------------------------------------------------------------------
-- 6. updated_at automático
-- ---------------------------------------------------------------------------

create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end $$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['caja','proyectos','campos_personalizados','tareas','novedades']
  loop
    execute format('drop trigger if exists trg_touch on %I', t);
    execute format('create trigger trg_touch before update on %I
                    for each row execute function touch_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 7. VISTA DE ARQUEO POR PERÍODO
--    Es exactamente lo que calcula arqueo() en js/store.js
-- ---------------------------------------------------------------------------

-- security_invoker: sin esto, en Postgres 15+ la vista corre con los permisos
-- de su DUEÑO y se salta el RLS — mostraría el arqueo de cualquier usuario.
create or replace view v_arqueo with (security_invoker = true) as
select
  c.user_id,
  c.periodo_id,
  p.nombre as periodo,
  p.estado,
  sum(c.monto) filter (where c.tipo = 'ingreso')                              as base,
  sum(c.monto) filter (where c.tipo = 'gasto')                                as gastado,
  sum(case when c.tipo = 'ingreso' then c.monto else -c.monto end)            as saldo,
  sum(c.reembolsado) filter (where c.tipo = 'gasto')                          as reembolsado,
  sum(c.monto - c.reembolsado) filter (where c.tipo = 'gasto')                as pendiente,
  -- Cobrable: legalizado y sin reembolsar. Trabado: aún sin legalizar.
  sum(c.monto - c.reembolsado) filter (where c.tipo = 'gasto' and c.legalizado)       as cobrable,
  sum(c.monto - c.reembolsado) filter (where c.tipo = 'gasto' and not c.legalizado)   as trabado,
  count(*) filter (where c.tipo = 'gasto' and not c.legalizado)                       as n_sin_legalizar,
  count(*) filter (where c.tipo = 'gasto'
                     and (not c.tiene_comprobante or not c.tiene_factura))            as n_sin_soporte
from caja c
join periodos p on p.id = c.periodo_id
group by c.user_id, c.periodo_id, p.nombre, p.estado;

grant select on v_arqueo to authenticated;

-- ---------------------------------------------------------------------------
-- 8. STORAGE  (fotos de comprobantes y facturas)
--    Cada usuario solo toca su carpeta /{uid}/...
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
-- 9. DATOS INICIALES (opcional — ejecuta ya autenticado)
-- ---------------------------------------------------------------------------

-- insert into clientes (nombre, contacto, color) values
--   ('Cafam','Coord. Logística','#2563eb'),
--   ('Diebold Nixdorf','Gestión Operativa','#7c3aed'),
--   ('Alfagres','Jefe de Despachos','#0f9d58'),
--   ('Lab. Inv. Hormonal','Dirección L.I.H','#d97706'),
--   ('Interno','—','#8a95a3');

-- insert into presupuestos (categoria, tope) values
--   ('Pago mensajero', 900000), ('Parqueadero', 250000), ('Combustible', 200000);

-- insert into rutina (texto, orden) values
--   ('Revisar novedades reportadas por coordinadores', 1),
--   ('Verificar que los dashboards carguen bien', 2),
--   ('Registrar pagos y gastos de caja del día', 3),
--   ('Revisar correos y bandeja de solicitudes', 4),
--   ('Planear las 3 tareas clave de mañana', 5);

-- ---------------------------------------------------------------------------
-- 10. NOTAS
-- ---------------------------------------------------------------------------
create table if not exists notas_carpetas (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  nombre text not null, color text not null default '#D9A03A', created_at timestamptz default now()
);
create table if not exists notas (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  carpeta_id uuid references notas_carpetas(id) on delete set null, titulo text not null default 'Sin título',
  contenido text not null default '', color text not null default '#FFF7DF', etiquetas text[] not null default '{}',
  anclada boolean not null default false, recordatorio timestamptz, created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table notas_carpetas enable row level security; alter table notas enable row level security;
drop policy if exists "solo_dueno" on notas_carpetas; drop policy if exists "solo_dueno" on notas;
create policy "solo_dueno" on notas_carpetas for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "solo_dueno" on notas for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
grant select,insert,update,delete on notas_carpetas,notas to authenticated;
create index if not exists ix_notas_usuario_actualizada on notas(user_id,updated_at desc);
create index if not exists ix_notas_carpeta on notas(user_id,carpeta_id);
drop trigger if exists trg_touch on notas;
create trigger trg_touch before update on notas for each row execute function touch_updated_at();
