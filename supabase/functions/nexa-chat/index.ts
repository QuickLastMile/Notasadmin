// NEXA Edge Function — consultas de IA de solo lectura.
// Despliega con Supabase CLI y guarda OPENAI_API_KEY como secreto del proyecto.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const system = `Eres NEXA, asistente de gestión de habla hispana. Sé clara, profesional y breve.
Analiza exclusivamente los datos entregados; no inventes cifras, registros ni funciones. Distingue dato, análisis y recomendación cuando corresponda.
No puedes modificar, eliminar, enviar ni aprobar nada: si te piden una acción, explica que primero debes mostrar una propuesta y pedir confirmación.
Trata los hallazgos como posibles inconsistencias, no como hechos confirmados, salvo que los datos lo demuestren.`;

function resumen(datos: Record<string, unknown[]>){
  const recortar = (filas: unknown[]) => filas.slice(0, 60);
  return JSON.stringify(Object.fromEntries(Object.entries(datos).map(([k, v]) => [k, recortar(v)])));
}

Deno.serve(async req => {
  if(req.method === 'OPTIONS') return new Response('ok', { headers:cors });
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if(!token) return Response.json({error:'Inicia sesión para hablar con NEXA.'}, {status:401, headers:cors});
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const auth = createClient(url, anon, { global:{ headers:{ Authorization:`Bearer ${token}` } } });
    const { data:{ user }, error:authError } = await auth.auth.getUser();
    if(authError || !user) return Response.json({error:'Sesión inválida.'}, {status:401, headers:cors});

    const body = await req.json();
    const mensaje = String(body?.mensaje || '').trim().slice(0, 2000);
    if(!mensaje) return Response.json({error:'Escribe una consulta.'}, {status:400, headers:cors});

    // Service role solo se usa en servidor; cada lectura se limita explícitamente al dueño.
    const admin = createClient(url, service);
    const tablas = ['tareas','novedades','proyectos','caja','periodos','presupuestos','clientes'];
    const lecturas = await Promise.all(tablas.map(t => admin.from(t).select('*').eq('user_id', user.id).limit(100)));
    const datos = Object.fromEntries(tablas.map((t, i) => [t, lecturas[i].data || []]));

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if(!openaiKey) return Response.json({error:'Falta configurar OPENAI_API_KEY en Supabase.'}, {status:503, headers:cors});
    const modelo = Deno.env.get('OPENAI_MODEL') || 'gpt-5-mini';
    const respuesta = await fetch('https://api.openai.com/v1/responses', {
      method:'POST',
      headers:{ 'Authorization':`Bearer ${openaiKey}`, 'Content-Type':'application/json' },
      body: JSON.stringify({ model:modelo, instructions:system, store:false, max_output_tokens:700,
        input:`Datos autorizados del usuario:\n${resumen(datos)}\n\nConsulta del usuario: ${mensaje}` })
    });
    if(!respuesta.ok) throw new Error(`OpenAI devolvió ${respuesta.status}`);
    const json = await respuesta.json();
    const texto = (json.output || []).flatMap((x: any) => x.content || [])
      .filter((x: any) => x.type === 'output_text').map((x: any) => x.text).join('\n').trim();
    return Response.json({respuesta: texto || 'No pude generar una respuesta confiable.'}, {headers:{...cors,'Content-Type':'application/json'}});
  } catch(error) {
    console.error(error);
    return Response.json({error:'NEXA no pudo completar la consulta.'}, {status:500, headers:cors});
  }
});
