-- Conserva el período de origen y registra en cuál corte se envió o reembolsó.
alter table caja add column if not exists campos jsonb not null default '{}'::jsonb;
notify pgrst, 'reload schema';
