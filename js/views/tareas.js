/* ============================================================================
   VISTA: TAREAS
   ----------------------------------------------------------------------------
   Agrupadas por cuándo tocan, no en una lista plana: lo vencido primero,
   después hoy, mañana, la semana, más adelante y lo que no tiene fecha.
   Una lista corrida de 40 tareas no dice qué hacer primero; esta sí.
   ========================================================================== */

let fTarea      = 'pendientes';
let buscarTarea = '';
let agruparPor  = 'fecha';      // fecha | cliente | proyecto

const abierta = t => t.estado !== 'hecho' && t.estado !== 'cancelada';

const FILTROS_TAREA = {
  pendientes: abierta,
  vencidas:   t => abierta(t) && t.vence && diasDesde(t.vence) <  0,
  hoy:        t => abierta(t) && t.vence && diasDesde(t.vence) === 0,
  semana:     t => abierta(t) && t.vence && diasDesde(t.vence) > 0 && diasDesde(t.vence) <= 7,
  espera:     t => t.estado === 'en_espera',
  sinfecha:   t => abierta(t) && !t.vence,
  hechas:     t => t.estado === 'hecho' || t.estado === 'cancelada'
};

/* Los grupos por fecha, en el orden en que importan. */
const GRUPOS_FECHA = [
  { id:'vencidas', lbl:'Vencidas',      tono:'d', test: d => d !== null && d <  0 },
  { id:'hoy',      lbl:'Hoy',           tono:'w', test: d => d === 0 },
  { id:'manana',   lbl:'Mañana',        tono:'b', test: d => d === 1 },
  { id:'semana',   lbl:'Esta semana',   tono:'n', test: d => d > 1 && d <= 7 },
  { id:'despues',  lbl:'Más adelante',  tono:'n', test: d => d > 7 },
  { id:'sinfecha', lbl:'Sin fecha',     tono:'n', test: d => d === null }
];

function setFiltroTarea(f){ fTarea = f; render(); }
function setAgrupar(v){ agruparPor = v; render(); }

/** Busca sin perder el cursor: si no, se pierde a cada tecla. */
function buscarTareaAhora(v){
  buscarTarea = v;
  render();
  const i = $('#buscaTarea');
  if(i){ i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
}

function coincideTarea(t, q){
  if(!q) return true;
  const persona = colab(t.persona_id);
  const texto = [t.titulo, t.notas, t.tipo, t.espera_que, t.resultado,
                 cli(t.cliente_id).nombre, pro(t.proyecto_id)?.nombre,
                 persona?.nombre, persona?.cargo, t.prioridad]
    .filter(Boolean).join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(p => texto.includes(p));
}

/* ========================================================================== */
function vTareas(m){
  if(!S.tareas.length) return `
    ${pageHead('Tareas', 'Nada se pierde: captura arriba con <code>t:</code> y aparece aquí.', '')}
    ${vacioCTA('✓', 'Sin tareas pendientes',
      'Escribe en la barra de arriba "t: llamar al coordinador mañana !alta" y se crea sola.',
      '+ Nueva tarea', 'modalTarea()')}`;

  const lista = S.tareas
    .filter(FILTROS_TAREA[fTarea])
    .filter(t => coincideTarea(t, buscarTarea))
    .sort(ordenTareas);

  const tabs = [
    ['pendientes', `Pendientes (${S.tareas.filter(FILTROS_TAREA.pendientes).length})`],
    ['vencidas',   `Vencidas (${m.vencidas.length})`],
    ['hoy',        `Hoy (${m.hoy.length})`],
    ['semana',     `Esta semana (${m.semana.length})`],
    ['espera',     `En espera (${m.enEspera.length})`],
    ['sinfecha',   `Sin fecha (${S.tareas.filter(FILTROS_TAREA.sinfecha).length})`],
    ['hechas',     `Hechas (${S.tareas.filter(FILTROS_TAREA.hechas).length})`]
  ];

  return `
  ${pageHead('Tareas',
    'Organiza, prioriza y controla todo lo que requiere tu atención.',
    `<button class="btn pri" onclick="modalTarea()">+ Nueva tarea</button>`)}

  <div class="grid g4" style="margin-bottom:14px">
    ${kpi('Atrasadas', m.vencidas.length, m.vencidas.length ? 'Resuélvelas primero' : 'Nada vencido',
          m.vencidas.length ? 'd' : 'o')}
    ${kpi('Vencen hoy', m.hoy.length, m.hoy.length ? 'Antes de que acabe el día' : 'Día despejado',
          m.hoy.length ? 'w' : 'o')}
    ${kpi('En espera', m.enEspera.length,
          m.esperaAtrasada.length
            ? `${m.esperaAtrasada.length} atrasada${m.esperaAtrasada.length > 1 ? 's' : ''} — vuelve a cobrar`
            : 'El balón está en otra cancha',
          m.esperaAtrasada.length ? 'd' : m.enEspera.length ? 'w' : 'o')}
    ${kpi('Alta prioridad', m.altaPendiente.length, 'Pendientes marcadas como altas',
          m.altaPendiente.length ? 'w' : 'o')}
  </div>

  <div class="tabs">
    ${tabs.map(([k, l]) =>
      `<button class="tab ${fTarea === k ? 'active' : ''}" onclick="setFiltroTarea('${k}')">${l}</button>`
    ).join('')}
  </div>

  <div class="cfg-barra" style="margin-bottom:14px">
    <div class="cfg-buscar">
      <span>${ICO.buscar}</span>
      <input id="buscaTarea" value="${esc(buscarTarea)}"
             placeholder="Buscar por título, nota, cliente o proyecto…"
             oninput="buscarTareaAhora(this.value)">
      ${buscarTarea ? `<button class="busca-x" onclick="buscarTareaAhora('')">✕</button>` : ''}
    </div>
    <select onchange="setAgrupar(this.value)" title="Cómo agrupar la lista">
      <option value="fecha"    ${agruparPor === 'fecha'    ? 'selected' : ''}>Agrupar por fecha</option>
      <option value="cliente"  ${agruparPor === 'cliente'  ? 'selected' : ''}>Agrupar por cliente</option>
      <option value="proyecto" ${agruparPor === 'proyecto' ? 'selected' : ''}>Agrupar por proyecto</option>
      <option value="ninguno"  ${agruparPor === 'ninguno'  ? 'selected' : ''}>Sin agrupar</option>
    </select>
  </div>

  ${buscarTarea ? `<div class="resultado-busqueda" style="margin-bottom:11px">
    ${lista.length} de ${S.tareas.filter(FILTROS_TAREA[fTarea]).length} tareas</div>` : ''}

  ${lista.length ? pintarGrupos(lista)
    : `<div class="card"><div class="card-b flush">${vacio('📭',
        buscarTarea ? `Nada coincide con "${buscarTarea}"` : 'No hay tareas en este filtro')}</div></div>`}`;
}

/** Vencidas primero; dentro de cada grupo, la prioridad manda. */
function ordenTareas(a, b){
  const orden = { alta:0, media:1, baja:2 };
  const da = a.vence ? diasDesde(a.vence) : 9999;
  const db = b.vence ? diasDesde(b.vence) : 9999;
  if(da !== db) return da - db;
  return (orden[a.prioridad] ?? 1) - (orden[b.prioridad] ?? 1);
}

function pintarGrupos(lista){
  if(agruparPor === 'ninguno')
    return `<div class="card"><div class="card-b flush">${lista.map(rowTarea).join('')}</div></div>`;

  let grupos;

  if(agruparPor === 'fecha'){
    grupos = GRUPOS_FECHA.map(g => ({
      lbl: g.lbl, tono: g.tono,
      items: lista.filter(t => g.test(t.vence ? diasDesde(t.vence) : null))
    }));
  } else {
    const campo = agruparPor === 'cliente' ? 'cliente_id' : 'proyecto_id';
    const claves = [...new Set(lista.map(t => t[campo] || 'sin'))];
    grupos = claves.map(k => ({
      lbl: k === 'sin'
        ? (agruparPor === 'cliente' ? 'Sin cliente' : 'Sin proyecto')
        : (agruparPor === 'cliente' ? cli(k).nombre : pro(k)?.nombre || 'Sin proyecto'),
      tono: 'n',
      color: agruparPor === 'cliente' && k !== 'sin' ? cli(k).color : null,
      items: lista.filter(t => (t[campo] || 'sin') === k)
    })).sort((a, b) => b.items.length - a.items.length);
  }

  return grupos.filter(g => g.items.length).map(g => `
    <div class="card" style="margin-bottom:12px">
      <div class="card-h">
        <h2>
          ${g.color ? `<span class="dot" style="background:${g.color}"></span>` : ''}
          ${esc(g.lbl)}
        </h2>
        <span class="chip ${g.tono}">${g.items.length}</span>
      </div>
      <div class="card-b flush">${g.items.map(rowTarea).join('')}</div>
    </div>`).join('');
}
