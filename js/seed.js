/* ============================================================================
   DATOS DE EJEMPLO
   Solo se usan la primera vez o al pulsar "↺ Demo".
   Cuando conectemos Supabase este archivo desaparece del index.html.
   ========================================================================== */

function seed(){
  const t = masDias;   // t(-3) = hace 3 días, t(5) = en 5 días

  const clientes = [
    {id:'c1', nombre:'Cafam',              color:'#2563eb', contacto:'Coord. Logística',   activo:true},
    {id:'c2', nombre:'Diebold Nixdorf',    color:'#7c3aed', contacto:'Gestión Operativa',  activo:true},
    {id:'c3', nombre:'Alfagres',           color:'#0f9d58', contacto:'Jefe de Despachos',  activo:true},
    {id:'c4', nombre:'Lab. Inv. Hormonal', color:'#d97706', contacto:'Dirección L.I.H',    activo:true},
    {id:'c5', nombre:'Interno',            color:'#8a95a3', contacto:'—',                  activo:true}
  ];

  const proyectos = [
    {id:'p1', nombre:'Dashboard Institucional',    cliente_id:'c1', estado:'en_curso',  avance:75,  vence:t(12)},
    {id:'p2', nombre:'App Biológicos (mensajero)', cliente_id:'c1', estado:'en_curso',  avance:90,  vence:t(5)},
    {id:'p3', nombre:'Informe de gestión',         cliente_id:'c2', estado:'en_riesgo', avance:40,  vence:t(2)},
    {id:'p4', nombre:'Informe 11 pestañas',        cliente_id:'c3', estado:'en_curso',  avance:60,  vence:t(9)},
    {id:'p5', nombre:'Dash operativo L.I.H',       cliente_id:'c4', estado:'hecho',     avance:100, vence:t(-6)},
    {id:'p6', nombre:'Control transferencias',     cliente_id:'c1', estado:'propuesta', avance:15,  vence:t(20)}
  ];

  const tareas = [
    {id:'t1', titulo:'Legalizar gastos de caja menor de la semana', cliente_id:'c5', proyecto_id:null, prioridad:'alta',  estado:'pendiente', vence:t(-2)},
    {id:'t2', titulo:'Enviar informe de gestión a Diebold',         cliente_id:'c2', proyecto_id:'p3', prioridad:'alta',  estado:'pendiente', vence:t(-1)},
    {id:'t3', titulo:'Activar GitHub Pages en DASHALFAGRES',        cliente_id:'c3', proyecto_id:'p4', prioridad:'media', estado:'pendiente', vence:t(0)},
    {id:'t4', titulo:'Reunión seguimiento coordinadores Cafam',     cliente_id:'c1', proyecto_id:'p1', prioridad:'alta',  estado:'pendiente', vence:t(0)},
    {id:'t5', titulo:'Revisar registros HSQ de motos del mes',      cliente_id:'c1', proyecto_id:null, prioridad:'media', estado:'pendiente', vence:t(1)},
    {id:'t6', titulo:'Cotizar reposición de neveras portátiles',    cliente_id:'c1', proyecto_id:'p2', prioridad:'media', estado:'pendiente', vence:t(3)},
    {id:'t7', titulo:'Solicitar reembolso de caja menor',           cliente_id:'c5', proyecto_id:null, prioridad:'alta',  estado:'pendiente', vence:t(4)},
    {id:'t8', titulo:'Actualizar Sheet maestro del Centro de Dash', cliente_id:'c5', proyecto_id:null, prioridad:'baja',  estado:'pendiente', vence:t(6)},
    {id:'t9', titulo:'Subir cambios del dash L.I.H',                cliente_id:'c4', proyecto_id:'p5', prioridad:'baja',  estado:'hecho',     vence:t(-3)}
  ];

  const caja = [
    {id:'g1', tipo:'ingreso', monto:600000, concepto:'Base asignada del mes',      categoria:'Base',         cliente_id:'c5', fecha:t(-20), legalizado:true,  soporte:true},
    {id:'g2', tipo:'gasto',   monto:48000,  concepto:'Taxi a bodega Cafam',        categoria:'Transporte',   cliente_id:'c1', fecha:t(-9),  legalizado:true,  soporte:true},
    {id:'g3', tipo:'gasto',   monto:125000, concepto:'Papelería e impresiones',    categoria:'Papelería',    cliente_id:'c5', fecha:t(-7),  legalizado:true,  soporte:true},
    {id:'g4', tipo:'gasto',   monto:32000,  concepto:'Refrigerio visita cliente',  categoria:'Alimentación', cliente_id:'c2', fecha:t(-4),  legalizado:false, soporte:false},
    {id:'g5', tipo:'gasto',   monto:89000,  concepto:'Domicilio insumos neveras',  categoria:'Insumos',      cliente_id:'c1', fecha:t(-3),  legalizado:false, soporte:true},
    {id:'g6', tipo:'gasto',   monto:26000,  concepto:'Transporte mensajero',       categoria:'Transporte',   cliente_id:'c3', fecha:t(-1),  legalizado:false, soporte:false},
    {id:'g7', tipo:'gasto',   monto:54000,  concepto:'Recarga celular equipo',     categoria:'Servicios',    cliente_id:'c5', fecha:t(0),   legalizado:false, soporte:true}
  ];

  const novedades = [
    {id:'n1', fecha:t(0),  titulo:'Sheet de ausencias no actualiza', detalle:'Los coordinadores reportan datos viejos en la app de consulta.', cliente_id:'c1', criticidad:'alta',  estado:'abierta', accion:'Revisar permisos del gid publicado'},
    {id:'n2', fecha:t(0),  titulo:'Moto 3 sin preoperacional',      detalle:'El mensajero no registró el HSQ de hoy.',                        cliente_id:'c1', criticidad:'media', estado:'abierta', accion:'Llamar al coordinador de zona'},
    {id:'n3', fecha:t(-1), titulo:'Retraso en entrega de informe',  detalle:'Diebold pidió el informe para hoy y falta la pestaña de SLA.',   cliente_id:'c2', criticidad:'alta',  estado:'abierta', accion:'Priorizar hoy en la mañana'},
    {id:'n4', fecha:t(-2), titulo:'Factura sin soporte físico',     detalle:'Gasto de refrigerio quedó sin recibo.',                          cliente_id:'c2', criticidad:'baja',  estado:'cerrada', accion:'Se reconstruyó con voucher'}
  ];

  const dashboards = [
    {id:'d1', nombre:'Centro de Dashboards', url:'https://quicklastmile.github.io/CentroDashs/',          cliente_id:'c5'},
    {id:'d2', nombre:'DashboardCafam',       url:'https://quicklastmile.github.io/',                      cliente_id:'c1'},
    {id:'d3', nombre:'Consulta Ausencias',   url:'https://quicklastmile.github.io/consulta-ausencias/',   cliente_id:'c1'},
    {id:'d4', nombre:'DASH L.I.H',           url:'#',                                                     cliente_id:'c4'},
    {id:'d5', nombre:'Gestión HSQ Motos',    url:'https://quicklastmile.github.io/Gesti-nHSQ/',           cliente_id:'c1'}
  ];

  const rutina = [
    {id:'r1', texto:'Revisar novedades reportadas por coordinadores', orden:1, hecho_el:null},
    {id:'r2', texto:'Verificar que los dashboards carguen bien',      orden:2, hecho_el:null},
    {id:'r3', texto:'Registrar gastos de caja menor del día',         orden:3, hecho_el:null},
    {id:'r4', texto:'Revisar correos y bandeja de solicitudes',       orden:4, hecho_el:null},
    {id:'r5', texto:'Planear las 3 tareas clave de mañana',           orden:5, hecho_el:null}
  ];

  return { clientes, proyectos, tareas, caja, novedades, dashboards, rutina };
}
