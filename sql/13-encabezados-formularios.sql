-- 13 · Permite encabezados/secciones dentro de los formularios
alter table preguntas drop constraint if exists preguntas_tipo_check;
alter table preguntas add constraint preguntas_tipo_check
  check (tipo in ('encabezado','texto','numero','sino','unica','multiple','fecha','hora','archivo'));
