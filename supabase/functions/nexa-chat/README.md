# Desplegar NEXA

NEXA ya funciona en modo local dentro de la aplicación. Para habilitar respuestas de IA:

```powershell
supabase login
supabase link --project-ref jxfyiqisrnexjocqwicx
supabase secrets set OPENAI_API_KEY="TU_CLAVE_DE_OPENAI"
supabase secrets set OPENAI_MODEL="gpt-5-mini"
supabase functions deploy nexa-chat
```

No agregues `OPENAI_API_KEY` a `js/config.js`, `.env` publicado ni GitHub. La función valida la sesión y lee únicamente las filas cuyo `user_id` corresponde al usuario conectado. Las consultas son solo de lectura.
