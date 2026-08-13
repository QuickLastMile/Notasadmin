alter table dashboards
  add column if not exists detalles jsonb not null
  default '{"observaciones":"","enlaces":[]}'::jsonb;
