/* ============================================================================
   ICONOS Y LOGO
   ----------------------------------------------------------------------------
   Antes el menú usaba glifos de texto (◉ ✓ ▤ ▣ ◍ ◈). Se veían disparejos,
   cambiaban de tamaño entre sistemas y en la barra colapsada eran ilegibles.
   Aquí van como SVG: mismo trazo, mismo peso, y heredan el color.
   ========================================================================== */

/** Envuelve un trazo en un <svg> de línea. */
const svg = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}${extra}</svg>`;

const ICO = {
  inicio:    svg('<path d="M3 10.2 12 3l9 7.2V20a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20z"/><path d="M9.2 21.5v-7h5.6v7"/>'),
  tareas:    svg('<path d="M9 5h11M9 12h11M9 19h11"/><path d="m3 5 1.6 1.6L7.4 3.8"/><path d="m3 12 1.6 1.6 2.8-2.8"/><path d="m3 19 1.6 1.6 2.8-2.8"/>'),
  caja:      svg('<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H19a2 2 0 0 1 2 2v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17z"/><path d="M3 8.5V7a2 2 0 0 1 2-2h11"/><circle cx="16.8" cy="12.5" r="1.3"/>'),
  novedades: svg('<path d="M10.3 3.9 2.6 17.4A1.9 1.9 0 0 0 4.3 20.3h15.4a1.9 1.9 0 0 0 1.7-2.9L13.7 3.9a1.9 1.9 0 0 0-3.4 0Z"/><path d="M12 9.5v4"/><circle cx="12" cy="16.8" r=".9" fill="currentColor" stroke="none"/>'),
  proyectos: svg('<path d="M3 7.5A2 2 0 0 1 5 5.5h3.7a2 2 0 0 1 1.6.8l1 1.4H19a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  clientes:  svg('<circle cx="9" cy="8" r="3.4"/><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0"/><path d="M16.2 5.2a3.4 3.4 0 0 1 0 5.6"/><path d="M17.6 14.4A6.2 6.2 0 0 1 21.2 20"/>'),
  enlaces:   svg('<rect x="3" y="3.5" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="3.5" width="7.5" height="7.5" rx="1.8"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8"/>'),
  config:    svg('<path d="M4 6.5h6M14 6.5h6M4 12h10M18 12h2M4 17.5h4M12 17.5h8"/><circle cx="12" cy="6.5" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="17.5" r="2"/>'),
  mas:       svg('<circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/>'),

  // Configuración
  preguntas: svg('<circle cx="12" cy="12" r="9"/><path d="M9.4 9.3a2.7 2.7 0 0 1 5.2.9c0 1.8-2.6 2.3-2.6 3.9"/><circle cx="12" cy="17.3" r=".9" fill="currentColor" stroke="none"/>'),
  listados:  svg('<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4.5" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1.3" fill="currentColor" stroke="none"/>'),
  etiquetas: svg('<path d="M3 11.3V4.8A1.8 1.8 0 0 1 4.8 3h6.5a2 2 0 0 1 1.4.6l7.7 7.7a2 2 0 0 1 0 2.8l-6.3 6.3a2 2 0 0 1-2.8 0L3.6 12.7a2 2 0 0 1-.6-1.4Z"/><circle cx="7.8" cy="7.8" r="1.4"/>'),
  campos:    svg('<rect x="3" y="5" width="18" height="6" rx="1.8"/><rect x="3" y="14" width="11" height="5" rx="1.8"/><path d="M17.5 16.5h3.5"/>'),
  apariencia:svg('<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none"/>'),
  campana:   svg('<path d="M18 8.6a6 6 0 1 0-12 0c0 5-2 6.4-2 6.4h16s-2-1.4-2-6.4"/><path d="M13.7 19a2 2 0 0 1-3.4 0"/>'),
  ajustes:   svg('<circle cx="12" cy="12" r="3.2"/><path d="M19.5 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7h-.3a2 2 0 1 1 0-4h.2A1.6 1.6 0 0 0 4.5 6.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1v-.3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.8 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.3.9Z"/>'),
  enchufe:   svg('<path d="M9 3v6M15 3v6"/><path d="M6 9h12v3a6 6 0 0 1-12 0z"/><path d="M12 18v3"/>'),
  rayo:      svg('<path d="M13.5 2.5 4 13.6h6.5L10.5 21.5 20 10.4h-6.5z"/>'),
  historial: svg('<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.2 4.4v4h4"/><path d="M12 7.6V12l3 1.8"/>'),
  usuarios:  svg('<circle cx="12" cy="8" r="3.6"/><path d="M5 20.2a7 7 0 0 1 14 0"/>'),
  escudo:    svg('<path d="M12 2.8 4.5 6v6c0 4.5 3.1 8.2 7.5 9.2 4.4-1 7.5-4.7 7.5-9.2V6z"/><path d="m9 12 2.2 2.2L15.2 10"/>'),

  // Acciones
  buscar:    svg('<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>'),
  mover:     svg('<path d="M8 6h8M8 12h8M8 18h8"/>'),
  plegar:    svg('<path d="m14.5 7-5 5 5 5"/>'),
  desplegar: svg('<path d="m9.5 7 5 5-5 5"/>')
};

/* ============================================================================
   LOGO NEXA
   Recreado en SVG para que escale bien y cambie de color con el tema.
   ========================================================================== */
function logoNexa(alto = 34, id = 'l'){
  return `
  <svg viewBox="0 0 100 100" height="${alto}" width="${alto}" aria-label="NEXA">
    <defs>
      <linearGradient id="v${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#8E2E4E"/><stop offset=".55" stop-color="#6E1A38"/>
        <stop offset="1" stop-color="#4A0F24"/>
      </linearGradient>
      <linearGradient id="o${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#F0C265"/><stop offset=".5" stop-color="#D9A03A"/>
        <stop offset="1" stop-color="#B87A18"/>
      </linearGradient>
    </defs>
    <!-- Trazo diagonal de la N -->
    <path d="M16 11 H39 L67 79 H44 Z" fill="url(#v${id})"/>
    <!-- Asta izquierda, con la esquina inferior redondeada -->
    <path d="M16 29 H38 V70 Q38 80 28 80 H16 Z" fill="url(#v${id})"/>
    <!-- Triángulo dorado -->
    <path d="M62 11 H84 V46 Z" fill="url(#o${id})"/>
    <!-- Asta derecha -->
    <path d="M67 48 H84 V80 H67 Z" fill="url(#v${id})"/>
  </svg>`;
}

/** Versión reducida para el favicon (sin degradados, para que pese poco). */
const LOGO_FAVICON = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
  `<rect width="100" height="100" rx="22" fill="#2A0C1A"/>` +
  `<path d="M16 11H39L67 79H44Z" fill="#7E2545"/>` +
  `<path d="M16 29H38V70Q38 80 28 80H16Z" fill="#7E2545"/>` +
  `<path d="M62 11H84V46Z" fill="#D9A03A"/>` +
  `<path d="M67 48H84V80H67Z" fill="#7E2545"/></svg>`
);
