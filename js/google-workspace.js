/* Google Workspace — Drive, Sheets y Calendar usando el token OAuth de Supabase. */

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/calendar.events'
].join(' ');

const googleToken = () => sesionNube?.provider_token || '';
const googleWorkspaceConectado = () => !!googleToken() && localStorage.getItem('nexa_google_workspace') === '1';

async function conectarGoogleWorkspace(){
  if(!NUBE){ toast('Google Workspace requiere iniciar sesión'); return; }
  localStorage.setItem('nexa_google_workspace','1');
  const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{
    redirectTo:RETORNO(),scopes:GOOGLE_SCOPES,
    queryParams:{access_type:'offline',prompt:'consent'}
  }});
  if(error){localStorage.removeItem('nexa_google_workspace');toast(traducir(error.message));}
}

function desconectarGoogleWorkspace(){
  localStorage.removeItem('nexa_google_workspace');
  toast('Integración desactivada en este dispositivo');
  repintarPanel();
}

async function googleApi(url,opciones={}){
  const token=googleToken();
  if(!token){toast('Reconecta Google Workspace');return null;}
  const r=await fetch(url,{...opciones,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(opciones.headers||{})}});
  if(!r.ok){
    const e=await r.json().catch(()=>({}));
    if(r.status===401||r.status===403) toast('Google necesita autorización otra vez');
    else toast(e.error?.message||'No se pudo completar en Google');
    return null;
  }
  return r.status===204?{}:r.json();
}

async function crearCarpetaDrive(proyectoId){
  const p=pro(proyectoId); if(!p)return;
  if(!googleWorkspaceConectado()){toast('Conecta Google Workspace en Configuración');return;}
  const data=await googleApi('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink',{method:'POST',
    body:JSON.stringify({name:`NEXA · ${p.nombre}`,mimeType:'application/vnd.google-apps.folder'})});
  if(!data)return;
  await db.update('proyectos',p.id,{drive_folder_id:data.id,drive_folder_url:data.webViewLink||`https://drive.google.com/drive/folders/${data.id}`});
  verProyecto(p.id);toast('Carpeta creada en Drive ✓');
}

function filasFormularioGoogle(formularioId){
  const qs=preguntasForm(formularioId).filter(q=>q.tipo!=='encabezado');
  const rs=respuestasForm(formularioId).sort((a,b)=>a.created_at.localeCompare(b.created_at));
  return [['Fecha','Hora','Nombre','Documento',...qs.map(q=>q.texto)],...rs.map(r=>{const d=new Date(r.created_at);return[
    d.toLocaleDateString('es-CO'),d.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'}),r.nombre||'',r.documento||'',
    ...qs.map(q=>Array.isArray(r.datos?.[q.id])?r.datos[q.id].join(', '):(r.datos?.[q.id]??''))];})];
}

async function sincronizarGoogleSheet(formularioId){
  const f=S.formularios.find(x=>x.id===formularioId); if(!f)return;
  if(!googleWorkspaceConectado()){toast('Conecta Google Workspace en Configuración');return;}
  let sheetId=f.google_sheet_id, sheetUrl=f.google_sheet_url;
  if(!sheetId){
    const creado=await googleApi('https://sheets.googleapis.com/v4/spreadsheets?fields=spreadsheetId,spreadsheetUrl',{method:'POST',
      body:JSON.stringify({properties:{title:`NEXA · ${f.nombre}`},sheets:[{properties:{title:'Respuestas'}}]})});
    if(!creado)return; sheetId=creado.spreadsheetId;sheetUrl=creado.spreadsheetUrl;
    const p=pro(f.proyecto_id);
    if(p?.drive_folder_id) await googleApi(`https://www.googleapis.com/drive/v3/files/${sheetId}?addParents=${p.drive_folder_id}&fields=id,parents`,{method:'PATCH',body:'{}'});
  }
  await googleApi(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Respuestas!A:ZZ:clear`,{method:'POST',body:'{}'});
  const actualizado=await googleApi(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Respuestas!A1?valueInputOption=RAW`,{method:'PUT',
    body:JSON.stringify({majorDimension:'ROWS',values:filasFormularioGoogle(formularioId)})});
  if(!actualizado)return;
  await db.update('formularios',f.id,{google_sheet_id:sheetId,google_sheet_url:sheetUrl,google_sheet_synced_at:new Date().toISOString()});
  verFormularioAdmin(f.id);toast('Google Sheets actualizado ✓');
}

async function crearEventoGoogleCalendar(proyectoId){
  const p=pro(proyectoId);if(!p)return;
  if(!p.vence){toast('Agrega una fecha de entrega al proyecto');return;}
  if(!googleWorkspaceConectado()){toast('Conecta Google Workspace en Configuración');return;}
  const fin=new Date(p.vence+'T00:00:00');fin.setDate(fin.getDate()+1);
  const cuerpo={summary:`NEXA · Entrega: ${p.nombre}`,description:p.notas||'Proyecto administrado desde NEXA',
    start:{date:p.vence},end:{date:fin.toISOString().slice(0,10)}};
  const data=await googleApi('https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=none',{method:'POST',body:JSON.stringify(cuerpo)});
  if(!data)return;
  await db.update('proyectos',p.id,{calendar_event_id:data.id,calendar_event_url:data.htmlLink||''});
  verProyecto(p.id);toast('Evento creado en Google Calendar ✓');
}
