-- ============================================================================
-- 11 · PROYECTOS OPERATIVOS
-- Ejecutar una sola vez en Supabase > SQL Editor para instalaciones existentes.
-- ============================================================================

alter table proyectos add column if not exists avance_modo text default 'automatico';
alter table proyectos add column if not exists responsable_id uuid references colaboradores(id) on delete set null;
alter table proyectos add column if not exists repositorio_url text default '';
alter table proyectos add column if not exists base_url text default '';
alter table proyectos add column if not exists seguimiento jsonb default '[]'::jsonb;

do $$ begin
  alter table proyectos add constraint proyectos_avance_modo_check
    check (avance_modo in ('automatico','manual'));
exception when duplicate_object then null;
end $$;

update proyectos
set avance_modo = 'manual'
where avance is not null and avance > 0 and avance_modo = 'automatico';

comment on column proyectos.repositorio_url is 'Repositorio de código o archivos del proyecto, si aplica';
comment on column proyectos.base_url is 'Base de trabajo: Sheets, Drive u otra URL, si aplica';
