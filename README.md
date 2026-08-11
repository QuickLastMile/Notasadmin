# 🎯 Hub Personal

Centro de control diario para trabajo operativo: **tareas, caja menor, novedades, proyectos, clientes y dashboards** en una sola página.

Pensado para mitigar las novedades del día a día: nada se queda en la memoria, todo queda capturado y con una alerta que lo persigue.

---

## Cómo usarlo

Abre `index.html` en el navegador. No necesita servidor, ni instalación, ni internet.

**La app arranca en blanco.** Inicio te muestra cuatro primeros pasos:

1. **Crea tus clientes** — todo lo demás se imputa a uno.
2. **Registra tus mensajeros y proveedores** — nombre, CC/NIT, banco y cuenta. Se guardan una vez y se reutilizan en cada pago.
3. **Abre el período de caja del mes** — con la base asignada. Sin período no se pueden registrar pagos.
4. **Arma tu rutina diaria** — lo que revisas sin falta cada día.

Los datos viven en el navegador (`localStorage`), así que son tuyos y no salen del equipo. Botones en la barra lateral:

- **◔ Ejemplo** — carga datos de muestra para ver cómo se comporta lleno.
- **🗑 Vaciar** — borra todo y vuelve a dejarla en blanco (pide confirmación dos veces).

### ⚡ Captura rápida

La barra de arriba es el corazón de la app. Tecla `/` la enfoca desde cualquier parte.

| Prefijo | Crea | Ejemplo |
|---|---|---|
| `t:` | Tarea | `t: enviar informe a Diebold viernes !alta` |
| `g:` | Gasto de caja menor | `g: 45000 taxi a bodega @Cafam` |
| `i:` | Ingreso a caja menor | `i: 600000 base del mes` |
| `n:` | Novedad | `n: falla el dashboard de ausencias @Cafam !alta` |
| `l:` | Enlace / dashboard | `l: https://... Informe mensual` |
| `p:` | Proyecto | `p: Nuevo tablero de indicadores @Alfagres` |

**Modificadores** (en cualquier orden, dentro del mismo texto):

- `@cliente` — imputa al cliente (basta el prefijo: `@Cafa`, `@Die`)
- `!alta` `!media` `!baja` — prioridad o criticidad
- `$45000` o simplemente `45000` en gastos — monto
- `hoy` · `mañana` · `viernes` · `+3d` — fecha de vencimiento

Antes de pulsar Enter, un panel muestra exactamente lo que se va a crear.

---

---

## 💵 Caja menor

No es una caja de gastos propios: es el registro de **pagos a mensajeros y proveedores**, con el rastro completo de cada peso.

Cada movimiento guarda:

| Campo | Para qué |
|---|---|
| Beneficiario | Mensajero o proveedor, con CC/NIT |
| Cuenta de pago | Banco, tipo y número — se muestran al elegirlo, para verificar antes de transferir |
| Método | Transferencia, Nequi, Daviplata, efectivo… |
| N° comprobante | El de la transferencia o voucher |
| N° factura | Factura del parqueadero o cuenta de cobro del mensajero |
| Legalizado | Si ya pasó por contabilidad, y en qué fecha |
| **Reembolsado** | **Lo que realmente te pagaron** |
| **Pendiente** | **Lo que aún te deben** (monto − reembolsado, calculado) |
| Observación | El "por qué" de lo que se salió de lo normal |

### Períodos

Un período = un mes de caja. Se abre con una base asignada, recibe los movimientos y se cierra. Al cerrar, la app avisa qué queda sin legalizar y sin reembolsar. El histórico queda consultable en la pestaña **Períodos**.

### Reembolso

El botón **💰 Reembolso** aplica el monto recibido a los gastos legalizados más antiguos que sigan pendientes (FIFO). No toca ir uno por uno. Si sobra plata sin asignar, te lo dice.

La diferencia clave que muestra el arqueo:
- **Cobrable** — legalizado y sin reembolsar: ya lo puedes exigir.
- **Trabado** — sin legalizar: no te lo van a pagar hasta que lo legalices.

### Presupuesto

Topes por categoría. Cuando el gasto pasa el 80% avisa, y si lo excede sale como alerta roja en Inicio.

### Exportar

El botón **⬇ Excel** baja el período completo en CSV (con BOM, para que Excel en español respete las tildes), incluyendo datos bancarios, soportes y totales — listo para adjuntar a la legalización.

---

## Estructura

```
index.html              Cascarón: sidebar, barra de captura, contenedor
css/styles.css          Todo el diseño (cambia los tokens de :root y cambia la app)
sql/supabase-schema.sql Esquema listo para pegar en Supabase (tablas + RLS + Storage)

js/
  config.js       Parámetros: tope de alerta, categorías, bancos, credenciales
  utils.js        Helpers puros: fechas, dinero, escape de HTML, toast
  db.js           ⭐ CAPA DE DATOS — el único archivo que cambia al migrar a Supabase
  seed.js         Datos de ejemplo (desaparece al conectar la nube)
  store.js        Estado global `S`, `arqueo()` y `metricas()`: fuente de todas las alertas
  ui.js           Piezas visuales compartidas: modal, KPI, chips, fila de tarea
  capture.js      Parser de la captura rápida
  acciones.js     Cambios de datos + formularios (tareas, novedades, proyectos, clientes)
  acciones-caja.js  Todo lo de caja: pagos, legalización, reembolso, períodos, export
  app.js          Menú, enrutado, tema, atajos, arranque

  views/          Una vista por módulo — se editan sin tocar las demás
    inicio.js  tareas.js  caja.js  novedades.js
    proyectos.js  clientes.js  enlaces.js
```

> Los `<script>` llevan `?v=N`. **Súbelo en cada despliegue** o los navegadores seguirán con el JS viejo en caché.

**Regla de oro:** las vistas solo dibujan. Cualquier cambio de datos pasa por `acciones.js`, que a su vez solo habla con `db.js`.

### Agregar un módulo nuevo

1. Crea `js/views/mimodulo.js` con una función `vMiModulo(m)` que devuelva HTML.
2. Añade el `<script>` en `index.html`.
3. Añade una línea al array `MENU` en `js/app.js`.

---

## Conectar Supabase

La integración **ya está escrita**. La app mira `CFG.supabase` en `js/config.js` y decide sola:

| `CFG.supabase` | Modo | Qué pasa |
|---|---|---|
| Vacío | **Local** | `localStorage`. Sin cuenta, sin internet, solo este equipo. |
| Con credenciales | **Nube** | Supabase + acceso por correo. Los datos te siguen al celular. |

Pasos:

1. Crea el proyecto en [supabase.com](https://supabase.com) (el plan gratuito alcanza de sobra).
2. **SQL Editor** → pega `sql/supabase-schema.sql` → **Run**.
3. **Settings → API** → copia *Project URL* y *anon public*.
4. Pégalos en `CFG.supabase` dentro de `js/config.js`.
5. **Authentication → URL Configuration** → agrega tu URL de Pages
   (`https://quicklastmile.github.io/Notasadmin/`) en *Redirect URLs*, o el enlace
   del correo no te va a devolver a la app.
6. Sube `?v=N` en `index.html` y despliega.

No hay que tocar ningún otro archivo.

> La **anon key** es pública por diseño: puede ir al repo sin problema. Quien protege
> los datos es **RLS** (`auth.uid() = user_id`), activo en todas las tablas del esquema.
> La clave **`service_role` nunca** va al frontend — salta el RLS y expone toda la base.

### Cómo se entra

Acceso por **enlace mágico**: escribes tu correo, te llega un enlace, lo abres y quedas
adentro. No hay contraseñas que recordar ni que guardar en ningún lado.

> La **anon key** es pública por diseño: puede ir al repo sin problema. Quien protege los datos es **RLS** (`auth.uid() = user_id`), que ya viene activo en todas las tablas del esquema. La clave `service_role` **nunca** va al frontend.

---

## Publicar en GitHub Pages

Settings → Pages → Branch `main` / carpeta `/ (root)` → Save.

---

## Estado

| Módulo | Estado |
|---|---|
| Arranque en blanco | ✅ La app inicia vacía, con primeros pasos guiados |
| Caja menor | ✅ Completo: beneficiarios, cuentas, soportes, legalización, reembolso, períodos, topes, export |
| Captura rápida | ✅ Funcionando |
| Inicio (alertas, foco, rutina) | ✅ Funcionando |
| Tareas | 🔧 Por revisar con el usuario |
| Novedades | 🔧 Por revisar con el usuario |
| Diseño general | 🔧 Por revisar con el usuario |
| Menú / módulos | 🔧 Por revisar con el usuario |
| Proyectos | ✅ Ficha operativa: edición, tareas, avance, seguimiento y enlaces |
| Formularios | ✅ Formularios públicos por proyecto, respuestas, indicadores y exportación CSV |
| Clientes | ✅ Solo lectura — falta editar |
| Dashboards | ✅ Funcionando |
| Supabase | 🔌 Integración escrita y probada — falta pegar las credenciales |
| Fotos de comprobantes | ⏳ Pendiente (requiere Supabase Storage) |
