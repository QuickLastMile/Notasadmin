/* ============================================================================
   CAPTURA RÁPIDA — el antídoto contra "se me olvidó"
   ----------------------------------------------------------------------------
   Sintaxis:
     t: tarea     g: gasto     i: ingreso
     n: novedad   l: enlace    p: proyecto
   Modificadores:
     @cliente          →  imputa a un cliente (busca por prefijo)
     !alta|media|baja  →  prioridad / criticidad
     $45000  ó  45000  →  monto (en gasto/ingreso basta el número)
     hoy | mañana | viernes | +3d  →  fecha de vencimiento
   ========================================================================== */

const TIPOS = { t:'tarea', g:'gasto', i:'ingreso', n:'novedad', l:'enlace', p:'proyecto', e:'evento' };
const DIAS  = { domingo:0, lunes:1, martes:2, miercoles:3, 'miércoles':3,
                jueves:4, viernes:5, sabado:6, 'sábado':6 };

const ICONO_TIPO = {
  tarea:'✓ Tarea', gasto:'💸 Gasto', ingreso:'💰 Ingreso',
  novedad:'⚠️ Novedad', enlace:'🔗 Enlace', proyecto:'📁 Proyecto', evento:'📅 Evento'
};

/** Convierte el texto libre en un objeto estructurado. Devuelve null si no hay nada. */
function parse(entrada){
  let t = (entrada || '').trim();
  if(!t) return null;

  // Prefijo de tipo
  const mt = t.match(/^([tgnilpe])\s*:\s*/i);
  const tipo = mt ? TIPOS[mt[1].toLowerCase()] : 'tarea';
  if(mt) t = t.slice(mt[0].length);

  const r = { tipo, prioridad:'media', cliente_id:null, vence:null, monto:0, url:null };

  // @cliente — coincide por prefijo, ignorando tildes y espacios
  const norm = s => s.toLowerCase().normalize('NFD')
                     .replace(/[\u0300-\u036f]/g, '')   // quita tildes
                     .replace(/[^a-z0-9]/g, '');
  const mc = t.match(/@(\S+)/);
  if(mc){
    const q = norm(mc[1]);
    const c = S.clientes.find(x => norm(x.nombre).startsWith(q));
    if(c) r.cliente_id = c.id;
    t = t.replace(mc[0], '').trim();
  }

  // !prioridad
  const mp = t.match(/!(alta|media|baja|critica|crítica|urgente)/i);
  if(mp){
    r.prioridad = /crit|urgen/i.test(mp[1]) ? 'alta' : mp[1].toLowerCase();
    t = t.replace(mp[0], '').trim();
  }

  // Monto: $45.000 explícito, o un número suelto si es movimiento de caja
  const md = t.match(/\$\s?([\d.,]+)/)
          || ((tipo === 'gasto' || tipo === 'ingreso') ? t.match(/\b(\d{3,})\b/) : null);
  if(md){
    r.monto = parseInt(md[1].replace(/[.,]/g, ''), 10) || 0;
    t = t.replace(md[0], '').trim();
  }

  // URL
  const mu = t.match(/https?:\/\/\S+/);
  if(mu){ r.url = mu[0]; t = t.replace(mu[0], '').trim(); }

  // Fecha
  const rel = t.match(/\+(\d+)\s?d\b/i);
  if(rel){
    r.vence = masDias(+rel[1]);
    t = t.replace(rel[0], '').trim();
  } else if(/\bhoy\b/i.test(t)){
    r.vence = hoyISO();
    t = t.replace(/\bhoy\b/i, '').trim();
  } else if(/\bma(ñ|n)ana\b/i.test(t)){
    r.vence = masDias(1);
    t = t.replace(/\bma(ñ|n)ana\b/i, '').trim();
  } else {
    for(const d in DIAS){
      const re = new RegExp('\\b' + d + '\\b', 'i');
      if(re.test(t)){
        const dif = (DIAS[d] - new Date().getDay() + 7) % 7 || 7;
        r.vence = masDias(dif);
        t = t.replace(re, '').trim();
        break;
      }
    }
  }

  r.texto = t.replace(/\s{2,}/g, ' ').trim();
  if(!r.texto && !r.monto) return null;
  if(!r.vence && (tipo === 'tarea' || tipo === 'evento')) r.vence = hoyISO();
  return r;
}

/** Muestra en vivo lo que se va a crear, antes de pulsar Enter. */
function previewCap(){
  const p = parse($('#cap').value);
  const box = $('#prev');
  if(!p){ box.classList.remove('on'); return; }

  let h = `<span class="chip b">${ICONO_TIPO[p.tipo]}</span><strong>${esc(p.texto) || '—'}</strong>`;
  if(p.cliente_id)                  h += `<span class="chip n">${cliTag(p.cliente_id)}</span>`;
  if(p.monto)                       h += `<span class="chip o">${cop(p.monto)}</span>`;
  if(p.vence && p.tipo === 'tarea') h += `<span class="chip w">${fechaTxt(p.vence)}</span>`;
  if(p.tipo === 'tarea' || p.tipo === 'novedad')
                                    h += `<span class="chip ${PRI[p.prioridad].c}">${PRI[p.prioridad].l}</span>`;
  box.innerHTML = h;
  box.classList.add('on');
}

/** Guarda lo capturado en la tabla que corresponda. */
async function commitCap(){
  const p = parse($('#cap').value);
  if(!p){ toast('Escribe algo para capturar'); return; }

  // Sin cliente indicado cae en el primero de la lista (o sin cliente si no hay ninguno)
  const cid = p.cliente_id || S.clientes[0]?.id || null;

  // Los movimientos de caja necesitan un período abierto donde caer
  if((p.tipo === 'gasto' || p.tipo === 'ingreso') && !periodoActivo()){
    toast('Primero abre un período de caja');
    go('caja');
    return;
  }

  switch(p.tipo){
    case 'tarea':
      await db.insert('tareas', { titulo:p.texto, cliente_id:cid, proyecto_id:null,
        prioridad:p.prioridad, estado:'pendiente', vence:p.vence });
      break;
    case 'gasto':
    case 'ingreso':
      // Captura mínima: entra al período abierto y queda por completar
      // (beneficiario, cuenta y soportes se agregan luego con el lápiz)
      await db.insert('caja', {
        tipo:p.tipo, monto:p.monto, concepto:p.texto || 'Sin concepto',
        categoria: p.tipo === 'ingreso' ? 'Base' : 'Otros',
        cliente_id:cid, periodo_id: periodoActivo()?.id, fecha:hoyISO(),
        beneficiario_id:null, metodo_pago:'Efectivo',
        comprobante_pago:'', factura_num:'',
        tiene_comprobante: p.tipo === 'ingreso', tiene_factura: p.tipo === 'ingreso',
        legalizado: p.tipo === 'ingreso', legalizado_el: p.tipo === 'ingreso' ? hoyISO() : null,
        reembolsado:0, observacion:''
      });
      break;
    case 'novedad':
      await db.insert('novedades', { fecha:hoyISO(), titulo:p.texto, detalle:'',
        cliente_id:cid, criticidad:p.prioridad, estado:'abierta', accion:'',
        tipo:'', persona_id:null, beneficiario_id:null, reportado_por:'',
        cerrada_el:null, solucion:'', seguimiento:[], evidencias:[] });
      break;
    case 'enlace':
      await db.insert('dashboards', { nombre:p.texto || p.url, url:p.url || '#', cliente_id:cid });
      break;
    case 'proyecto':
      await db.insert('proyectos', { nombre:p.texto, cliente_id:cid,
        estado:'propuesta', avance:0, vence:p.vence });
      break;
    case 'evento':
      // Captura mínima: recordatorio en la fecha indicada. El tipo y lo
      // demás se ajustan después desde el calendario.
      await db.insert('eventos', {
        tipo:'recordatorio', titulo:p.texto, fecha: p.vence || hoyISO(),
        fecha_fin:null, hora:'', hora_fin:'', lugar:'', asistentes:'', agenda:'',
        monto:0, persona_id:null, beneficiario_id:null, cliente_id: p.cliente_id || null,
        aviso:1, notas:''
      });
      break;
  }

  $('#cap').value = '';
  $('#prev').classList.remove('on');
  toast('Guardado ✓');
  render();
}
