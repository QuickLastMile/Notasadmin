alter table campos_personalizados drop constraint if exists campos_personalizados_entidad_check;
alter table campos_personalizados drop constraint if exists campos_personalizados_tipo_check;
alter table campos_personalizados add constraint campos_personalizados_entidad_check check (entidad in ('proyectos','tareas','novedades','clientes','caja'));
alter table campos_personalizados add constraint campos_personalizados_tipo_check check (tipo in ('texto','url','numero','fecha','seleccion','booleano'));
alter table proyectos add column if not exists campos jsonb not null default '{}'::jsonb;
alter table tareas add column if not exists campos jsonb not null default '{}'::jsonb;
alter table novedades add column if not exists campos jsonb not null default '{}'::jsonb;
alter table clientes add column if not exists campos jsonb not null default '{}'::jsonb;
alter table caja add column if not exists campos jsonb not null default '{}'::jsonb;
