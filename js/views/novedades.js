/* ============================================================================
   VISTA: NOVEDADES
   ----------------------------------------------------------------------------
   Tres cosas: seguirle el rastro a lo que pasó, dejar el registro con su
   evidencia, y poder responder cuántas salieron en el mes.
   ========================================================================== */

let fNovedad     = 'abiertas';
let buscarNov    = '';
let novVista     = 'lista';    // lista | resumen

const FILTROS_NOV = {
  abiertas:  n => n.estado !== 'cerrada',
  criticas:  n => n.estado !== 'cerrada' && n.criticidad === 'alta',
  gestion:   n => n.estado === 'en_gestion',
  estancadas:n => n.estado !== 'cerrada' && diasResolucion(n) > 7,
  mes:       n => (n.fecha || '').startsWith(hoyISO().slice(0, 7)),
  cerradas:  n => n.estado === 'cerrada',
  todas:     n => true
};

function setFiltroNov(f){ fNovedad = f; render(); }
function setNovVista(v){ novVista = v; render(); }

function buscarNovAhora(v){
  buscarNov = v;
  render();
  const i = $('#buscaNov');
  if(i){ i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
}

function coincideNov(n, q){
  if(!q) return true;
  const texto = [n.titulo, n.detalle, n.accion, n.tipo, n.solucion, n.reportado_por,
                 cli(n.cliente_id).nombre, colab(n.persona_id)?.nombre,
                 ben(n.beneficiario_id)?.nombre,
                 ...(n.seguimiento || []).map(s => s.texto)]
    .filter(Boolean).join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(p => texto.includes(p));
}

/* ========================================================================== */
function vNovedades(m){
  if(!S.novedades.length) return `
    ${pageHead('Novedades',
      'Lo que se sale del guion: qué pasó, qué se hizo y cómo se resolvió.', '')}
    ${vacioCTA('⚠', 'Sin novedades registradas',
      'Aquí queda el registro de lo que falla en la operación, con su evidencia. Es el respaldo cuando el cliente pregunte qué pasó.',
      '+ Registrar novedad', 'modalNovedad()')}`;

  const e = estadisticasNovedades();

  const lista = S.novedades
    .filter(FILTROS_NOV[fNovedad])
    .filter(n => coincideNov(n, buscarNov))
    .sort((a, b) => {
      // Sin cerrar primero, y dentro de eso lo más viejo arriba: lleva más esperando
      const ac = a.estado === 'cerrada', bc = b.estado === 'cerrada';
      if(ac !== bc) return ac ? 1 : -1;
      return ac ? (b.cerrada_el || '').localeCompare(a.cerrada_el || '')
                : a.fecha.localeCompare(b.fecha);
    });

  const tabs = [
    ['abiertas',  `Sin cerrar (${S.novedades.filter(FILTROS_NOV.abiertas).length})`],
    ['criticas',  `Críticas (${m.novCriticas.length})`],
    ['estancadas',`Estancadas (${m.novEstancadas.length})`],
    ['mes',       `Este mes (${e.esteMes.total})`],
    ['cerradas',  `Cerradas (${S.novedades.filter(FILTROS_NOV.cerradas).length})`],
    ['todas',     `Todas (${S.novedades.length})`]
  ];

  return `
  ${pageHead('Novedades',
    'Lo que se sale del guion: qué pasó, qué se hizo y cómo se resolvió.',
    `<button class="btn pri" onclick="modalNovedad()">+ Registrar novedad</button>`)}

  <div class="grid g4" style="margin-bottom:14px">
    ${kpi('Este mes', e.esteMes.total,
      e.variacion === null ? 'Sin mes anterior para comparar'
        : e.variacion === 0 ? 'Igual que el mes pasado'
        : `${e.variacion > 0 ? '▲' : '▼'} ${Math.abs(e.variacion)}% vs. ${e.mesPasado.etiqueta}`,
      e.variacion > 0 ? 'd' : e.variacion < 0 ? 'o' : '')}
    ${kpi('Sin cerrar', m.novAbiertas.length,
      `${m.novCriticas.length} crítica${m.novCriticas.length === 1 ? '' : 's'}`,
      m.novCriticas.length ? 'd' : m.novAbiertas.length ? 'w' : 'o')}
    ${kpi('Estancadas', m.novEstancadas.length,
      m.novEstancadas.length ? 'Más de 7 días sin cerrar' : 'Ninguna se está durmiendo',
      m.novEstancadas.length ? 'd' : 'o')}
    ${kpi('Se resuelven en', e.promedioDias === null ? '—' : `${e.promedioDias} d`,
      e.promedioDias === null ? 'Aún no hay cerradas' : `Promedio de ${e.cerradas.length} cerradas`, 'p')}
  </div>

  <div class="seg" style="margin-bottom:14px;width:fit-content">
    <button class="${novVista === 'lista' ? 'on' : ''}" onclick="setNovVista('lista')">Lista</button>
    <button class="${novVista === 'resumen' ? 'on' : ''}" onclick="setNovVista('resumen')">Resumen del mes</button>
  </div>

  ${novVista === 'resumen' ? resumenNovedades(e) : listaNovedades(lista, tabs)}`;
}

/* ---- Lista ---------------------------------------------------------------- */
function listaNovedades(lista, tabs){
  return `
  <div class="tabs">
    ${tabs.map(([k, l]) =>
      `<button class="tab ${fNovedad === k ? 'active' : ''}" onclick="setFiltroNov('${k}')">${l}</button>`
    ).join('')}
  </div>

  <div class="cfg-barra" style="margin-bottom:14px">
    <div class="cfg-buscar">
      <span>${ICO.buscar}</span>
      <input id="buscaNov" value="${esc(buscarNov)}"
             placeholder="Buscar en título, detalle, seguimiento o solución…"
             oninput="buscarNovAhora(this.value)">
      ${buscarNov ? `<button class="busca-x" onclick="buscarNovAhora('')">✕</button>` : ''}
    </div>
  </div>

  <div class="card"><div class="card-b flush">
    ${lista.length ? lista.map(filaNovedad).join('')
      : vacio('📭', buscarNov ? `Nada coincide con "${buscarNov}"` : 'No hay novedades en este filtro')}
  </div></div>`;
}

function filaNovedad(n){
  const est = estadoNov(n);
  const cerrada = n.estado === 'cerrada';
  const dias = diasResolucion(n);
  const estancada = !cerrada && dias > 7;
  const ev = (n.evidencias || []).length;
  const seg = (n.seguimiento || []).length;

  return `
  <div class="row ${cerrada ? 'done' : ''}">
    <span style="font-size:19px;flex-shrink:0">${est.ico}</span>

    <div class="row-main" style="cursor:pointer" onclick="verNovedad('${n.id}')">
      <div class="row-t">${esc(n.titulo)}
        ${n.criticidad === 'alta' && !cerrada ? '<span class="chip d">Crítica</span>' : ''}
        ${n.tipo ? `<span class="chip n">${esc(n.tipo)}</span>` : ''}
        ${estancada ? `<span class="chip d">${dias} días sin cerrar</span>` : ''}
        ${ev ? `<span class="chip n" title="${ev} evidencia(s)">📷 ${ev}</span>` : ''}
        ${seg ? `<span class="chip n" title="${seg} anotación(es)">💬 ${seg}</span>` : ''}
      </div>
      <div class="row-s">
        <span>${fechaCorta(n.fecha)}</span>
        ${n.cliente_id ? `<span>${cliTag(n.cliente_id)}</span>` : ''}
        ${cerrada ? `<span>Resuelta en ${dias} d</span>` : `<span>${est.l}</span>`}
        ${n.detalle ? `<span title="${esc(n.detalle)}">${esc(n.detalle.slice(0, 45))}${n.detalle.length > 45 ? '…' : ''}</span>` : ''}
      </div>
      ${n.accion && !cerrada
        ? `<div class="row-s" style="color:var(--brand);margin-top:3px">→ ${esc(n.accion)}</div>` : ''}
    </div>

    ${menuAcciones([
      ['Abrir',        `verNovedad('${n.id}')`],
      ['Editar datos', `modalNovedad('${n.id}')`],
      ['Crear tarea',  `novedadATarea('${n.id}')`],
      [cerrada ? 'Reabrir' : 'Cerrar', cerrada ? `reabrirNovedad('${n.id}')` : `cerrarNovedadCon('${n.id}')`],
      ['Eliminar',     `eliminarNovedad('${n.id}')`, 'peligro']
    ])}
  </div>`;
}

/* ---- Resumen: cuántas salieron y de qué ----------------------------------- */
function resumenNovedades(e){
  return `
  <div class="card" style="margin-bottom:14px">
    <div class="card-h"><h2>Novedades por mes</h2>
      <span class="chip n">Últimos ${e.periodos.length} meses</span></div>
    <div class="card-b">
      <div class="barras">
        ${e.periodos.map(p => `
          <div class="barra-col" title="${esc(p.nombre)}: ${p.total} novedades">
            <div class="barra-valor">${p.total || ''}</div>
            <div class="barra-pila">
              <div class="barra-cuerpo" style="height:${p.total / e.maximo * 100}%">
                ${p.criticas ? `<div class="barra-critica"
                  style="height:${p.criticas / p.total * 100}%"
                  title="${p.criticas} críticas"></div>` : ''}
              </div>
            </div>
            <div class="barra-mes ${p.ym === hoyISO().slice(0,7) ? 'actual' : ''}">${esc(p.etiqueta)}</div>
          </div>`).join('')}
      </div>
      <div class="barras-leyenda">
        <span><i style="background:var(--brand)"></i> Total</span>
        <span><i style="background:var(--danger)"></i> Críticas</span>
      </div>
    </div>
  </div>

  <div class="grid g2">
    ${bloqueConteo('Por tipo', e.porTipo, v => v === 'sin' ? 'Sin tipo' : esc(v), () => 'var(--brand)')}
    ${bloqueConteo('Por cliente', e.porCliente,
      v => v === 'sin' ? 'Sin cliente' : cliTag(v),
      v => v === 'sin' ? 'var(--text-3)' : cli(v).color)}
  </div>

  <div class="card" style="margin-top:14px">
    <div class="card-h"><h2>Detalle de ${esc(e.esteMes.nombre)}</h2>
      <span class="chip ${e.esteMes.total ? 'w' : 'o'}">${e.esteMes.total}</span></div>
    <div class="card-b flush">
      ${e.esteMes.total
        ? e.esteMes.novedades.sort((a,b)=>a.fecha.localeCompare(b.fecha)).map(filaNovedad).join('')
        : vacio('🟢', 'Ninguna novedad este mes')}
    </div>
  </div>`;
}

function bloqueConteo(titulo, filas, etiqueta, color){
  const total = suma(filas, f => f[1]) || 1;
  return `
  <div class="card">
    <div class="card-h"><h2>${esc(titulo)}</h2></div>
    <div class="card-b" style="display:grid;gap:11px">
      ${filas.length ? filas.map(([k, v]) => `
        <div>
          <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px">
            <span>${etiqueta(k)}</span>
            <strong>${v} <span style="color:var(--text-3);font-weight:400">
              · ${Math.round(v / total * 100)}%</span></strong>
          </div>
          ${barra(v / total * 100, color(k))}
        </div>`).join('') : vacio('📊', 'Sin datos')}
    </div>
  </div>`;
}
