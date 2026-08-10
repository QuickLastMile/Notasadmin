/* ============================================================================
   NUBE — conexión con Supabase
   ----------------------------------------------------------------------------
   La app funciona en dos modos y decide sola cuál usar:

     · Sin credenciales en CFG.supabase  →  MODO LOCAL (localStorage)
     · Con credenciales                  →  MODO NUBE  (Supabase + login)

   Mientras CFG.supabase esté vacío, este archivo no hace absolutamente nada.
   ========================================================================== */

const NUBE = !!(CFG.supabase.url && CFG.supabase.anonKey);

let sb = null;      // cliente de supabase-js
let usuario = null; // sesión activa

if(NUBE){
  if(typeof supabase === 'undefined')
    console.error('Falta el script de supabase-js en index.html');
  else
    sb = supabase.createClient(CFG.supabase.url, CFG.supabase.anonKey);
}

/* ---- Sesión -------------------------------------------------------------- */
async function sesionActual(){
  if(!sb) return null;
  const { data } = await sb.auth.getSession();
  usuario = data.session?.user || null;
  return usuario;
}

/** Envía el enlace mágico al correo. No hay contraseñas que recordar ni guardar. */
async function enviarEnlace(){
  const email = $('#loginMail').value.trim();
  if(!email){ toast('Escribe tu correo'); return; }

  const btn = $('#loginBtn');
  btn.disabled = true; btn.textContent = 'Enviando…';

  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.origin + location.pathname }
  });

  btn.disabled = false; btn.textContent = 'Enviar enlace de acceso';

  if(error){ mostrarErrorLogin(error.message); return; }
  $('#loginCard').innerHTML = `
    <div style="text-align:center;padding:14px 4px">
      <div style="font-size:46px;margin-bottom:14px">📬</div>
      <h2>Revisa tu correo</h2>
      <p style="margin-top:8px">
        Te enviamos un enlace a<br><strong style="color:#fff">${esc(email)}</strong>
      </p>
      <p style="margin-top:14px;font-size:12.5px">
        Ábrelo desde este mismo dispositivo y entras directo.<br>
        Si no llega en un minuto, mira en spam.
      </p>
      <button class="glass-btn" onclick="location.reload()"
              style="margin-top:22px">Volver</button>
    </div>`;
}

async function salir(){
  await sb.auth.signOut();
  location.reload();
}

const mostrarErrorLogin = msg => {
  const e = $('#loginErr');
  e.textContent = msg;
  e.style.display = 'block';
};

/* ---- Pantalla de acceso — vidrio esmerilado sobre cabernet ---------------- */
function mostrarLogin(){
  document.body.innerHTML = `
  <div class="login-bg">
    <div class="glass" id="loginCard">

      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
        <div class="brand-mark" style="width:44px;height:44px;font-size:17px;border-radius:14px">HP</div>
        <div>
          <strong style="font-size:17px;display:block;letter-spacing:-.3px">Hub Personal</strong>
          <span style="font-size:10.5px;color:rgba(255,255,255,.6);
                text-transform:uppercase;letter-spacing:1px">Centro de control</span>
        </div>
      </div>

      <h2>Bienvenida 👋</h2>
      <p style="margin-bottom:22px">
        Entra con tu correo. Te llega un enlace y listo — sin contraseñas que recordar.
      </p>

      <label for="loginMail">Correo</label>
      <input id="loginMail" type="email" inputmode="email" autocomplete="email"
             placeholder="tucorreo@gmail.com"
             onkeydown="if(event.key==='Enter')enviarEnlace()">

      <div id="loginErr" class="glass-err" style="display:none"></div>

      <button class="glass-btn" id="loginBtn" onclick="enviarEnlace()">
        Enviar enlace de acceso
      </button>

      <div class="glass-pie">Tus datos viajan cifrados y solo tú los ves</div>
    </div>
  </div>
  <div class="toast" id="toast"></div>`;
  setTimeout(() => $('#loginMail')?.focus(), 80);
}

/* ---- Carga inicial ------------------------------------------------------- */
/**
 * Trae todas las tablas de una vez y las deja en S.
 * A partir de ahí las vistas siguen leyendo S de forma síncrona, igual que en
 * modo local: db.insert/update/remove escriben en Supabase Y actualizan S.
 */
async function cargarNube(){
  const resultados = await Promise.all(
    COLECCIONES.map(t => sb.from(t).select('*'))
  );

  // Si faltan tablas es que no se corrió sql/supabase-schema.sql.
  // Mejor decirlo que mostrar una app vacía sin explicación.
  const faltantes = resultados
    .map((r, i) => (r.error?.code === 'PGRST205' || /does not exist|schema cache/i.test(r.error?.message || ''))
                    ? COLECCIONES[i] : null)
    .filter(Boolean);
  if(faltantes.length){ mostrarFaltaEsquema(faltantes); return false; }

  S = {};
  resultados.forEach((r, i) => {
    const tabla = COLECCIONES[i];
    if(r.error){ console.error(`Error leyendo ${tabla}:`, r.error.message); S[tabla] = []; }
    else S[tabla] = r.data || [];
  });

  // Orden estable: lo más nuevo primero donde importa
  S.rutina.sort((a, b) => (a.orden || 0) - (b.orden || 0));
  S.periodos.sort((a, b) => a.inicio < b.inicio ? -1 : 1);
  return true;
}

/** Pantalla de "falta correr el esquema", con los pasos exactos. */
function mostrarFaltaEsquema(faltantes){
  const proyecto = CFG.supabase.url.replace('https://', '').split('.')[0];
  document.body.innerHTML = `
  <div style="min-height:100vh;display:grid;place-items:center;padding:24px;background:var(--bg)">
    <div class="card" style="max-width:560px;width:100%">
      <div class="card-b" style="padding:28px 24px">
        <div style="font-size:34px;margin-bottom:10px">🗄️</div>
        <h2 style="font-size:17px;margin-bottom:6px">Falta crear las tablas en Supabase</h2>
        <p style="color:var(--text-2);font-size:13px;margin-bottom:18px">
          El proyecto responde bien, pero la base todavía está vacía.
          Faltan ${faltantes.length} tablas: <code>${faltantes.join('</code>, <code>')}</code>
        </p>

        <div style="display:grid;gap:12px;font-size:13px">
          <div><strong>1.</strong> Abre
            <a href="https://supabase.com/dashboard/project/${proyecto}/sql/new"
               target="_blank" rel="noopener" style="color:var(--brand)">el SQL Editor de tu proyecto ↗</a></div>
          <div><strong>2.</strong> Pega todo el contenido de <code>sql/supabase-schema.sql</code></div>
          <div><strong>3.</strong> Pulsa <strong>Run</strong></div>
          <div><strong>4.</strong> Vuelve aquí y recarga</div>
        </div>

        <button class="btn pri" onclick="location.reload()"
                style="width:100%;margin-top:20px;padding:10px">Ya lo hice — recargar</button>

        <p style="color:var(--text-3);font-size:11.5px;margin-top:14px;text-align:center">
          Mientras tanto tus datos locales siguen intactos en este navegador.
        </p>
      </div>
    </div>
  </div>
  <div class="toast" id="toast"></div>`;
}

/** Borra todo lo del usuario en la nube (lo llama vaciarTodo en modo nube). */
async function vaciarNube(){
  // En orden inverso a las dependencias, para no chocar con las llaves foráneas
  const orden = ['caja','tareas','novedades','dashboards','rutina','presupuestos',
                 'periodos','proyectos','beneficiarios','clientes'];
  for(const t of orden){
    const { error } = await sb.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if(error) console.error(`Error vaciando ${t}:`, error.message);
  }
  await cargarNube();
}
