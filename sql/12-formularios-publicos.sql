-- 12 · Formularios públicos, preguntas asociadas y respuestas

create table if not exists formularios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  proyecto_id uuid references proyectos(id) on delete cascade,
  nombre text not null,
  descripcion text default '',
  estado text not null default 'borrador' check (estado in ('borrador','publicado','cerrado')),
  public_token uuid not null default gen_random_uuid() unique,
  abre timestamptz,
  cierra timestamptz,
  permitir_repetidas boolean default true,
  mensaje text default 'Tu respuesta fue registrada correctamente.',
  created_at timestamptz default now(), updated_at timestamptz default now()
);

alter table preguntas add column if not exists formulario_id uuid references formularios(id) on delete cascade;

create table if not exists respuestas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  formulario_id uuid not null references formularios(id) on delete cascade,
  nombre text default '', documento text default '',
  datos jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create or replace function asignar_dueno_respuesta() returns trigger language plpgsql security definer set search_path=public as $$
begin select user_id into new.user_id from formularios where id=new.formulario_id; return new; end $$;
drop trigger if exists trg_dueno_respuesta on respuestas;
create trigger trg_dueno_respuesta before insert on respuestas for each row execute function asignar_dueno_respuesta();

alter table formularios enable row level security;
alter table respuestas enable row level security;

drop policy if exists formularios_dueno on formularios;
create policy formularios_dueno on formularios for all to authenticated
  using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists formularios_publicos on formularios;
create policy formularios_publicos on formularios for select to anon
  using (estado='publicado' and (abre is null or abre<=now()) and (cierra is null or cierra>=now()));

drop policy if exists preguntas_publicas on preguntas;
create policy preguntas_publicas on preguntas for select to anon using (
  activa=true and formulario_id is not null and exists(
    select 1 from formularios f where f.id=formulario_id and f.estado='publicado'
      and (f.abre is null or f.abre<=now()) and (f.cierra is null or f.cierra>=now())));

drop policy if exists respuestas_dueno on respuestas;
create policy respuestas_dueno on respuestas for all to authenticated
  using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists respuestas_publicas_insert on respuestas;
create policy respuestas_publicas_insert on respuestas for insert to anon with check (
  exists(select 1 from formularios f where f.id=formulario_id and f.estado='publicado'
    and (f.abre is null or f.abre<=now()) and (f.cierra is null or f.cierra>=now())));

grant select on formularios,preguntas to anon;
grant insert on respuestas to anon;
grant select,insert,update,delete on formularios,respuestas to authenticated;
create index if not exists ix_preguntas_formulario on preguntas(formulario_id,activa,orden);
create index if not exists ix_respuestas_formulario on respuestas(formulario_id,created_at desc);
