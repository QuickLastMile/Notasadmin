/* ============================================================================
   DATOS DE EJEMPLO
   Solo se usan la primera vez o al pulsar "↺ Demo".
   Cuando conectemos Supabase este archivo desaparece del index.html.
   ========================================================================== */

function seed(){
  const t = masDias;   // t(-3) = hace 3 días, t(5) = en 5 días

  /* ---- Períodos de caja (mes anterior cerrado, mes actual abierto) ------- */
  const hoy = new Date();
  const iniMes  = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const finMes  = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  const iniPrev = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const finPrev = new Date(hoy.getFullYear(), hoy.getMonth(), 0);

  const periodos = [
    { id:'per0', nombre: nombreMes(iniPrev), inicio: dISO(iniPrev), fin: dISO(finPrev),
      base_asignada: 1500000, estado:'cerrado', cerrado_el: dISO(finPrev), reembolso_recibido: 1420000 },
    { id:'per1', nombre: nombreMes(iniMes),  inicio: dISO(iniMes),  fin: dISO(finMes),
      base_asignada: 1500000, estado:'abierto', cerrado_el:null, reembolso_recibido: 0 }
  ];

  /* ---- Mensajeros y proveedores ----------------------------------------- */
  const beneficiarios = [
    { id:'b1', nombre:'Jhon Alexander Ruiz',  tipo_doc:'CC',  documento:'1013456789',
      banco:'Bancolombia', tipo_cuenta:'Ahorros', cuenta:'91234567890',
      telefono:'3105558877', rol:'Mensajero', activo:true },
    { id:'b2', nombre:'Leidy Carolina Moreno', tipo_doc:'CC', documento:'52987654',
      banco:'Nequi', tipo_cuenta:'Depósito electrónico', cuenta:'3128889900',
      telefono:'3128889900', rol:'Mensajero', activo:true },
    { id:'b3', nombre:'Andrés Felipe Gómez',  tipo_doc:'CC',  documento:'80112233',
      banco:'Davivienda', tipo_cuenta:'Ahorros', cuenta:'0087654321',
      telefono:'3013334455', rol:'Mensajero', activo:true },
    { id:'b4', nombre:'Parqueadero El Dorado S.A.S', tipo_doc:'NIT', documento:'901234567-1',
      banco:'Bancolombia', tipo_cuenta:'Corriente', cuenta:'55512345678',
      telefono:'6014445566', rol:'Proveedor', activo:true }
  ];

  /* ---- Clientes ---------------------------------------------------------- */
  const clientes = [
    {id:'c1', nombre:'Cafam',              color:'#2563eb', contacto:'Coord. Logística',   activo:true},
    {id:'c2', nombre:'Diebold Nixdorf',    color:'#7c3aed', contacto:'Gestión Operativa',  activo:true},
    {id:'c3', nombre:'Alfagres',           color:'#0f9d58', contacto:'Jefe de Despachos',  activo:true},
    {id:'c4', nombre:'Lab. Inv. Hormonal', color:'#d97706', contacto:'Dirección L.I.H',    activo:true},
    {id:'c5', nombre:'Interno',            color:'#8a95a3', contacto:'—',                  activo:true}
  ];

  /* ---- Presupuestos por categoría ---------------------------------------- */
  const presupuestos = [
    { id:'pr1', categoria:'Pago mensajero', tope:900000 },
    { id:'pr2', categoria:'Parqueadero',    tope:250000 },
    { id:'pr3', categoria:'Combustible',    tope:200000 }
  ];

  /* ---- Movimientos de caja ----------------------------------------------- */
  const G = (o) => Object.assign({
    tipo:'gasto', periodo_id:'per1', categoria:'Otros', cliente_id:'c5',
    beneficiario_id:null, metodo_pago:'Transferencia',
    comprobante_pago:'', factura_num:'',
    comprobante_url:'', factura_url:'',
    tiene_comprobante:false, tiene_factura:false,
    estado:'pendiente_consignacion',
    legalizado:false, legalizado_el:null,
    reembolsado:0, observacion:'',
    perdida:false, motivo_perdida:''
  }, o);

  const caja = [
    G({ id:'g0', estado:'finalizado', tipo:'ingreso', monto:1500000, concepto:'Base asignada del mes',
        categoria:'Base', fecha:t(-20), metodo_pago:'Transferencia',
        tiene_comprobante:true, comprobante_pago:'TRF-889012',
        legalizado:true, legalizado_el:t(-20), reembolsado:0 }),

    G({ id:'g1', estado:'finalizado', monto:180000, concepto:'Pago recorrido semana 1', categoria:'Pago mensajero',
        cliente_id:'c1', fecha:t(-14), beneficiario_id:'b1',
        metodo_pago:'Transferencia', comprobante_pago:'TRF-445120', tiene_comprobante:true,
        factura_num:'CE-1201', tiene_factura:true,
        legalizado:true, legalizado_el:t(-11), reembolsado:180000,
        observacion:'Recorrido completo, sin novedad' }),

    G({ id:'g2', estado:'finalizado', monto:165000, concepto:'Pago recorrido semana 1', categoria:'Pago mensajero',
        cliente_id:'c3', fecha:t(-14), beneficiario_id:'b2',
        metodo_pago:'Nequi', comprobante_pago:'NQ-778113', tiene_comprobante:true,
        factura_num:'CE-1202', tiene_factura:true,
        legalizado:true, legalizado_el:t(-11), reembolsado:165000 }),

    G({ id:'g3', estado:'finalizado', monto:96000, concepto:'Parqueadero mensual moto 3', categoria:'Parqueadero',
        cliente_id:'c1', fecha:t(-9), beneficiario_id:'b4',
        metodo_pago:'Transferencia', comprobante_pago:'TRF-449900', tiene_comprobante:true,
        factura_num:'FE-30514', tiene_factura:true,
        legalizado:true, legalizado_el:t(-7), reembolsado:96000 }),

    G({ id:'g4', estado:'pendiente_factura', monto:190000, concepto:'Pago recorrido semana 2', categoria:'Pago mensajero',
        cliente_id:'c1', fecha:t(-7), beneficiario_id:'b3',
        metodo_pago:'Transferencia', comprobante_pago:'TRF-451003', tiene_comprobante:true,
        factura_num:'', tiene_factura:false,
        legalizado:false, reembolsado:0,
        observacion:'Falta que entregue la cuenta de cobro' }),

    G({ id:'g5', estado:'finalizado', monto:72000, concepto:'Combustible ruta norte', categoria:'Combustible',
        cliente_id:'c3', fecha:t(-5), beneficiario_id:'b2',
        metodo_pago:'Efectivo', tiene_comprobante:false,
        factura_num:'POS-88231', tiene_factura:true,
        legalizado:true, legalizado_el:t(-3), reembolsado:40000,
        observacion:'Solo reembolsaron parcial, revisar con contabilidad' }),

    G({ id:'g6', estado:'pendiente_factura', monto:96000, concepto:'Parqueadero mensual moto 5', categoria:'Parqueadero',
        cliente_id:'c1', fecha:t(-3), beneficiario_id:'b4',
        metodo_pago:'Transferencia', comprobante_pago:'TRF-452871', tiene_comprobante:true,
        factura_num:'', tiene_factura:false,
        legalizado:false, reembolsado:0,
        observacion:'Pendiente factura del parqueadero' }),

    G({ id:'g7', estado:'finalizado', monto:54000, concepto:'Recarga celular equipo', categoria:'Servicios',
        cliente_id:'c5', fecha:t(-1),
        metodo_pago:'Daviplata', comprobante_pago:'DV-11290', tiene_comprobante:true,
        legalizado:false, reembolsado:0 }),

    G({ id:'g8', estado:'pendiente_consignacion', monto:26000, concepto:'Transporte urgente documentos', categoria:'Transporte',
        cliente_id:'c2', fecha:t(0), beneficiario_id:'b1',
        metodo_pago:'Efectivo', tiene_comprobante:false, tiene_factura:false,
        legalizado:false, reembolsado:0,
        observacion:'Sin soporte todavía' }),

    G({ id:'g9', estado:'finalizado', monto:38000, concepto:'Domicilio urgente sin recibo', categoria:'Transporte',
        cliente_id:'c1', fecha:t(-12), beneficiario_id:'b2',
        metodo_pago:'Efectivo', tiene_comprobante:false, tiene_factura:false,
        legalizado:false, reembolsado:0,
        perdida:true, motivo_perdida:'Sin soporte — se perdió el recibo',
        observacion:'Se pagó en efectivo y no dieron recibo' })
  ];

  /* ---- Resto de módulos --------------------------------------------------- */
  const proyectos = [
    {id:'p1', nombre:'Dashboard Institucional',    cliente_id:'c1', estado:'en_curso',  avance:75,  vence:t(12)},
    {id:'p2', nombre:'App Biológicos (mensajero)', cliente_id:'c1', estado:'en_curso',  avance:90,  vence:t(5)},
    {id:'p3', nombre:'Informe de gestión',         cliente_id:'c2', estado:'en_riesgo', avance:40,  vence:t(2)},
    {id:'p4', nombre:'Informe 11 pestañas',        cliente_id:'c3', estado:'en_curso',  avance:60,  vence:t(9)},
    {id:'p5', nombre:'Dash operativo L.I.H',       cliente_id:'c4', estado:'hecho',     avance:100, vence:t(-6)},
    {id:'p6', nombre:'Control transferencias',     cliente_id:'c1', estado:'propuesta', avance:15,  vence:t(20)}
  ];

  const T = (o) => Object.assign(
    { repite:'', notas:'', completada_el:null, proyecto_id:null }, o);

  const tareas = [
    T({id:'t1', titulo:'Pasar las facturas al bot de WhatsApp', cliente_id:'c5',
       prioridad:'alta',  estado:'pendiente', vence:t(-2), repite:'semanal',
       notas:'Subir una por una y anotar el total que reporta el bot'}),
    T({id:'t2', titulo:'Enviar informe de gestión a Diebold', cliente_id:'c2',
       proyecto_id:'p3', prioridad:'alta',  estado:'pendiente', vence:t(-1)}),
    T({id:'t3', titulo:'Activar GitHub Pages en DASHALFAGRES', cliente_id:'c3',
       proyecto_id:'p4', prioridad:'media', estado:'pendiente', vence:t(0)}),
    T({id:'t4', titulo:'Reunión seguimiento coordinadores Cafam', cliente_id:'c1',
       proyecto_id:'p1', prioridad:'alta',  estado:'pendiente', vence:t(0)}),
    T({id:'t5', titulo:'Revisar registros HSQ de motos del mes', cliente_id:'c1',
       prioridad:'media', estado:'pendiente', vence:t(1), repite:'mensual'}),
    T({id:'t6', titulo:'Cotizar reposición de neveras portátiles', cliente_id:'c1',
       proyecto_id:'p2', prioridad:'media', estado:'pendiente', vence:t(3)}),
    T({id:'t7', titulo:'Revisar si ya consignaron lo aprobado', cliente_id:'c5',
       prioridad:'alta',  estado:'pendiente', vence:t(4),
       notas:'Suelen consignar unos 4 días después de pasar las facturas'}),
    T({id:'t8', titulo:'Actualizar Sheet maestro del Centro de Dash', cliente_id:'c5',
       prioridad:'baja',  estado:'pendiente', vence:t(6), repite:'quincenal'}),
    T({id:'t9', titulo:'Llamar al proveedor del parqueadero', cliente_id:'c1',
       prioridad:'media', estado:'pendiente', vence:null}),
    T({id:'t10', titulo:'Subir cambios del dash L.I.H', cliente_id:'c4',
       proyecto_id:'p5', prioridad:'baja',  estado:'hecho', vence:t(-3), completada_el:t(-3)})
  ];

  const novedades = [
    {id:'n1', fecha:t(0),  titulo:'Sheet de ausencias no actualiza', detalle:'Los coordinadores reportan datos viejos en la app de consulta.', cliente_id:'c1', criticidad:'alta',  estado:'abierta', accion:'Revisar permisos del gid publicado'},
    {id:'n2', fecha:t(0),  titulo:'Moto 3 sin preoperacional',      detalle:'El mensajero no registró el HSQ de hoy.',                        cliente_id:'c1', criticidad:'media', estado:'abierta', accion:'Llamar al coordinador de zona'},
    {id:'n3', fecha:t(-1), titulo:'Retraso en entrega de informe',  detalle:'Diebold pidió el informe para hoy y falta la pestaña de SLA.',   cliente_id:'c2', criticidad:'alta',  estado:'abierta', accion:'Priorizar hoy en la mañana'},
    {id:'n4', fecha:t(-2), titulo:'Factura sin soporte físico',     detalle:'Gasto de refrigerio quedó sin recibo.',                          cliente_id:'c2', criticidad:'baja',  estado:'cerrada', accion:'Se reconstruyó con voucher'}
  ];

  const dashboards = [
    {id:'d1', nombre:'Centro de Dashboards', url:'https://quicklastmile.github.io/CentroDashs/',        cliente_id:'c5'},
    {id:'d2', nombre:'DashboardCafam',       url:'https://quicklastmile.github.io/',                    cliente_id:'c1'},
    {id:'d3', nombre:'Consulta Ausencias',   url:'https://quicklastmile.github.io/consulta-ausencias/', cliente_id:'c1'},
    {id:'d4', nombre:'DASH L.I.H',           url:'#',                                                   cliente_id:'c4'},
    {id:'d5', nombre:'Gestión HSQ Motos',    url:'https://quicklastmile.github.io/Gesti-nHSQ/',         cliente_id:'c1'}
  ];

  const rutina = [
    {id:'r1', texto:'Revisar novedades reportadas por coordinadores', orden:1, hecho_el:null},
    {id:'r2', texto:'Verificar que los dashboards carguen bien',      orden:2, hecho_el:null},
    {id:'r3', texto:'Registrar pagos y gastos de caja del día',       orden:3, hecho_el:null},
    {id:'r4', texto:'Revisar correos y bandeja de solicitudes',       orden:4, hecho_el:null},
    {id:'r5', texto:'Planear las 3 tareas clave de mañana',           orden:5, hecho_el:null}
  ];

  /* ---- Banco de preguntas ------------------------------------------------ */
  const preguntas = [
    { id:'q1', texto:'¿El mensajero realizó correctamente la entrega?', tipo:'sino',
      opciones:[], proyecto_id:'p2', categoria:'Entregas', orden:1,
      obligatoria:true, activa:true },
    { id:'q2', texto:'¿En qué estado recibió la nevera portátil?', tipo:'unica',
      opciones:['Buena','Con daño leve','Con daño grave','No aplica'],
      proyecto_id:'p2', categoria:'Vehículos', orden:2, obligatoria:true, activa:true },
    { id:'q3', texto:'Kilometraje de la moto al iniciar el recorrido', tipo:'numero',
      opciones:[], proyecto_id:null, categoria:'Vehículos', orden:3,
      obligatoria:false, activa:true },
    { id:'q4', texto:'Foto del comprobante de entrega', tipo:'archivo',
      opciones:[], proyecto_id:'p1', categoria:'Entregas', orden:4,
      obligatoria:true, activa:true },
    { id:'q5', texto:'¿Qué novedades se presentaron en la ruta?', tipo:'multiple',
      opciones:['Trancón','Cliente ausente','Dirección errada','Daño mecánico','Ninguna'],
      proyecto_id:null, categoria:'Operación', orden:5, obligatoria:false, activa:true },
    { id:'q6', texto:'Hora de finalización del recorrido', tipo:'hora',
      opciones:[], proyecto_id:null, categoria:'Operación', orden:6,
      obligatoria:false, activa:false }
  ];

  return { clientes, beneficiarios, periodos, presupuestos, caja, preguntas,
           proyectos, tareas, novedades, dashboards, rutina, listas: [] };
}
