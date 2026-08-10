/* ============================================================================
   VISTA: ACCESOS RÁPIDOS
   Una agenda de enlaces: los dashboards, hojas y páginas que abres a diario,
   para no buscarlos entre marcadores cada vez.
   ========================================================================== */

function vEnlaces(){
  if(!S.dashboards.length) return `
    ${pageHead('Accesos rápidos',
      'Guarda aquí los enlaces que abres todos los días para tenerlos a un clic.', '')}

    <div class="card" style="max-width:620px">
      <div class="card-b" style="padding:30px 26px">
        <div style="font-size:34px;opacity:.4;margin-bottom:12px">${ICO.enlaces}</div>
        <h2 style="font-size:17px;margin-bottom:8px">¿Para qué sirve esta sección?</h2>
        <p style="color:var(--text-2);font-size:13.5px;line-height:1.65;margin-bottom:14px">
          Es tu agenda de enlaces. Si todos los días entras al dashboard de Cafam,
          a la hoja de ausencias y al informe de Diebold, aquí los guardas una vez
          y los abres desde el celular sin buscarlos entre los marcadores.
        </p>
        <p style="color:var(--text-2);font-size:13.5px;line-height:1.65;margin-bottom:20px">
          Cada enlace se guarda con su cliente, así sabes de un vistazo a quién
          pertenece cada tablero.
        </p>
        <button class="btn pri" onclick="modalEnlace()">+ Guardar mi primer enlace</button>
      </div>
    </div>`;

  // Agrupados por cliente: así se encuentra más rápido
  const porCliente = {};
  S.dashboards.forEach(d => (porCliente[d.cliente_id || 'sin'] ||= []).push(d));

  return `
  ${pageHead('Accesos rápidos',
    'Los enlaces que abres a diario, agrupados por cliente.',
    `<button class="btn pri" onclick="modalEnlace()">+ Nuevo enlace</button>`)}

  <div class="grid" style="gap:14px">
    ${Object.entries(porCliente).map(([cid, enlaces]) => {
      const c = cid === 'sin' ? { nombre:'Sin cliente', color:'#9B8570' } : cli(cid);
      return `
      <div class="card">
        <div class="card-h">
          <h2><span class="dot" style="background:${c.color}"></span>${esc(c.nombre)}</h2>
          <span class="chip n">${enlaces.length}</span>
        </div>
        <div class="card-b flush">
          ${enlaces.map(d => `
            <div class="row">
              <div class="row-main">
                <div class="row-t">${esc(d.nombre)}</div>
                <div class="row-s">
                  <span style="font-family:var(--mono);font-size:11px">${esc(dominio(d.url))}</span>
                </div>
              </div>
              <a class="btn sm pri" href="${esc(d.url)}" target="_blank" rel="noopener">Abrir ↗</a>
              <div class="row-act">
                <button class="btn sm" onclick="modalEnlace('${d.id}')">✎</button>
                <button class="btn sm dgr" onclick="borrar('dashboards','${d.id}')">✕</button>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
    }).join('')}
  </div>

  <p style="font-size:12px;color:var(--text-3);margin-top:16px">
    Atajo: en la barra de captura escribe <code>l: https://… Nombre</code> y se guarda solo.
  </p>`;
}

/** Muestra solo el dominio: la URL completa no aporta y ensucia. */
function dominio(url){
  try{ return new URL(url).hostname.replace(/^www\./, ''); }
  catch{ return url; }
}
