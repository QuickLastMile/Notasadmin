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
    <div style="text-align:center;padding:12px 4px">
      <div style="font-size:34px;margin-bottom:10px">📬</div>
      <h2 style="font-size:16px;margin-bottom:6px">Revisa tu correo</h2>
      <p style="color:var(--text-2);font-size:13px">
        Te enviamos un enlace a <strong>${esc(email)}</strong>.<br>
        Ábrelo desde este mismo dispositivo y entras directo.
      </p>
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

/* ---- Pantalla de acceso -------------------------------------------------- */
function mostrarLogin(){
  document.body.innerHTML = `
  <div style="min-height:100vh;display:grid;place-items:center;padding:24px;background:var(--bg)">
    <div class="card" style="max-width:400px;width:100%">
      <div class="card-b" id="loginCard" style="padding:28px 24px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
          <div class="brand-mark" style="width:34px;height:34px;font-size:15px">HP</div>
          <div>
            <strong style="font-size:15px;display:block">Hub Personal</strong>
            <span style="font-size:11px;color:var(--text-3);text-transform:uppercase;
                  letter-spacing:.4px">Centro de control</span>
          </div>
        </div>

        <p style="color:var(--text-2);font-size:13px;margin-bottom:16px">
          Entra con tu correo. Te llega un enlace y listo — sin contraseñas.
        </p>

        <div class="f">
          <label>Correo</label>
          <input id="loginMail" type="email" placeholder="tucorreo@gmail.com"
                 onkeydown="if(event.key==='Enter')enviarEnlace()">
        </div>

        <div id="loginErr" class="alert d" style="display:none;margin-top:12px;font-size:12.5px"></div>

        <button class="btn pri" id="loginBtn" onclick="enviarEnlace()"
                style="width:100%;margin-top:16px;padding:10px">Enviar enlace de acceso</button>
      </div>
    </div>
  </div>
  <div class="toast" id="toast"></div>`;
  setTimeout(() => $('#loginMail')?.focus(), 60);
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

  S = {};
  resultados.forEach((r, i) => {
    const tabla = COLECCIONES[i];
    if(r.error){ console.error(`Error leyendo ${tabla}:`, r.error.message); S[tabla] = []; }
    else S[tabla] = r.data || [];
  });

  // Orden estable: lo más nuevo primero donde importa
  S.rutina.sort((a, b) => (a.orden || 0) - (b.orden || 0));
  S.periodos.sort((a, b) => a.inicio < b.inicio ? -1 : 1);
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
