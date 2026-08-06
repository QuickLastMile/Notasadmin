-- ============================================================================
-- HUB PERSONAL — Esquema para Supabase
-- Pega esto completo en:  Supabase → SQL Editor → New query → Run
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABLAS
-- ---------------------------------------------------------------------------

create table if not exists clientes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  nombre      text not null,
  contacto    text,
  color       text default '#2563eb',
  activo      boolean default true,
  created_at  timestamptz default now()
);

create table if not exists proyectos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  nombre      text not null,
  cliente_id  uuid references clientes(id) on delete set null,
  estado      text default 'en_curso' check (estado in ('propuesta','en_curso','en_riesgo','hecho')),
  avance      int  default 0 check (avance between 0 and 100),
  vence       date,
  notas       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
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

create table if not exists caja (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  tipo        text not null check (tipo in ('ingreso','gasto')),
  monto       numeric(14,2) not null check (monto >= 0),
  concepto    text not null,
  categoria   text default 'Otros',
  cliente_id  uuid references clientes(id) on delete set null,
  fecha       date not null default current_date,
  legalizado  boolean default false,
  soporte     boolean default false,
  soporte_url text,                    -- ruta en Storage (foto del recibo)
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists novedades (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  fecha       date not null default current_date,
  titulo      text not null,
  detalle     text,
  cliente_id  uuid references clientes(id) on delete set null,
  criticidad  text default 'media' check (criticidad in ('alta','media','baja')),
  estado      text default 'abierta' check (estado in ('abierta','cerrada')),
  accion      text,
  evidencia_url text,                  -- ruta en Storage
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists dashboards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  nombre      text not null,
  url         text not null,
  cliente_id  uuid references clientes(id) on delete set null,
  created_at  timestamptz default now()
);

-- Checklist diario: la plantilla vive aquí, el "hecho" se marca por fecha
create table if not exists rutina (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  texto       text not null,
  orden       int default 0,
  hecho_el    date,
  created_at  timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY  (cada quien ve solo lo suyo)
--    Sin esto, la anon key expuesta en GitHub Pages sería un problema.
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['clientes','proyectos','tareas','caja','novedades','dashboards','rutina']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "solo_dueno" on %I', t);
    execute format($f$
      create policy "solo_dueno" on %I
        for all
        using (auth.uid() = user_id)
        with check (auth.uid() = user_id)
    $f$, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. ÍNDICES  (lo que la app consulta a diario)
-- ---------------------------------------------------------------------------

create index if not exists ix_tareas_pend  on tareas (user_id, estado, vence);
create index if not exists ix_caja_fecha   on caja   (user_id, fecha desc);
create index if not exists ix_nov_abiertas on novedades (user_id, estado, fecha desc);
create index if not exists ix_proy_cliente on proyectos (user_id, cliente_id);

-- Búsqueda en español sobre tareas y novedades
create index if not exists ix_tareas_fts on tareas
  using gin (to_tsvector('spanish', coalesce(titulo,'') || ' ' || coalesce(notas,'')));
create index if not exists ix_nov_fts on novedades
  using gin (to_tsvector('spanish', coalesce(titulo,'') || ' ' || coalesce(detalle,'')));

-- ---------------------------------------------------------------------------
-- 4. updated_at automático
-- ---------------------------------------------------------------------------

create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end $$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['proyectos','tareas','caja','novedades']
  loop
    execute format('drop trigger if exists trg_touch on %I', t);
    execute format('create trigger trg_touch before update on %I
                    for each row execute function touch_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5. VISTA DE ARQUEO DE CAJA MENOR  (la app puede leerla directo)
-- ---------------------------------------------------------------------------

create or replace view v_arqueo_caja as
select
  user_id,
  sum(monto) filter (where tipo = 'ingreso')                        as base_recibida,
  sum(monto) filter (where tipo = 'gasto')                          as total_gastado,
  sum(case when tipo = 'ingreso' then monto else -monto end)        as saldo,
  sum(monto) filter (where tipo = 'gasto' and not legalizado)       as sin_legalizar,
  count(*)   filter (where tipo = 'gasto' and not soporte)          as sin_soporte
from caja
group by user_id;

-- ---------------------------------------------------------------------------
-- 6. STORAGE  (fotos de recibos y evidencias)
--    Crea el bucket y deja que cada usuario solo toque su carpeta /{uid}/...
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
-- 7. DATOS INICIALES (opcional — ejecuta ya autenticado)
-- ---------------------------------------------------------------------------

-- insert into clientes (nombre, contacto, color) values
--   ('Cafam','Coord. Logística','#2563eb'),
--   ('Diebold Nixdorf','Gestión Operativa','#7c3aed'),
--   ('Alfagres','Jefe de Despachos','#0f9d58'),
--   ('Lab. Inv. Hormonal','Dirección L.I.H','#d97706'),
--   ('Interno','—','#8a95a3');

-- insert into rutina (texto, orden) values
--   ('Revisar novedades reportadas por coordinadores', 1),
--   ('Verificar que los dashboards carguen bien', 2),
--   ('Registrar gastos de caja menor del día', 3),
--   ('Revisar correos y bandeja de solicitudes', 4),
--   ('Planear las 3 tareas clave de mañana', 5);
