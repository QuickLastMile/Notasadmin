-- 14 · Campos personalizados reutilizables en proyectos

create table if not exists campos_personalizados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  nombre text not null,
  entidad text not null default 'proyectos' check (entidad in ('proyectos')),
  tipo text not null default 'texto' check (tipo in ('texto','numero','fecha','seleccion','booleano')),
  descripcion text default '',
  opciones jsonb not null default '[]'::jsonb,
  obligatorio boolean not null default false,
  activo boolean not null default true,
  orden int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, entidad, nombre)
);

alter table proyectos add column if not exists campos jsonb not null default '{}'::jsonb;
alter table campos_personalizados enable row level security;
drop policy if exists campos_personalizados_dueno on campos_personalizados;
create policy campos_personalizados_dueno on campos_personalizados for all to authenticated
  using (auth.uid()=user_id) with check (auth.uid()=user_id);
grant select,insert,update,delete on campos_personalizados to authenticated;
create index if not exists ix_campos_personalizados_entidad on campos_personalizados(user_id,entidad,activo,orden);

drop trigger if exists trg_touch on campos_personalizados;
create trigger trg_touch before update on campos_personalizados
  for each row execute function touch_updated_at();
