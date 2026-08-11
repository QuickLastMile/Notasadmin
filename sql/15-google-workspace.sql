-- 15 · Referencias de Google Workspace asociadas a proyectos y formularios

alter table proyectos add column if not exists drive_folder_id text default '';
alter table proyectos add column if not exists drive_folder_url text default '';
alter table proyectos add column if not exists calendar_event_id text default '';
alter table proyectos add column if not exists calendar_event_url text default '';

alter table formularios add column if not exists google_sheet_id text default '';
alter table formularios add column if not exists google_sheet_url text default '';
alter table formularios add column if not exists google_sheet_synced_at timestamptz;

comment on column proyectos.drive_folder_id is 'ID de carpeta creada por NEXA mediante Drive API';
comment on column formularios.google_sheet_id is 'ID de hoja de respuestas creada por NEXA mediante Sheets API';
