# Skill: post-deploy-qa
> Cargar cuando: acabás de hacer un deploy (git push main, vercel --prod, render deploy).
> Ejecuta pruebas de usuario reales. Usa Haiku para análisis. Crea GitHub issues.

---

## Cuándo invocar (obligatorio)

- Después de cualquier `git push origin main` con cambios funcionales
- Después de redeploy manual en Vercel o Render
- Después de aplicar migraciones en Supabase producción
- Cuando el usuario reporta una regresión

## Cómo ejecutar

```bash
node scripts/post-deploy-qa.mjs
```

Flags útiles:
```bash
node scripts/post-deploy-qa.mjs --no-issues   # solo reporte, sin crear issues
node scripts/post-deploy-qa.mjs --dry-run     # verificar config sin tocar prod
```

## Variables de entorno necesarias

El script las carga automáticamente de `.env`, `.env.local` o `apps/api/.env`.
Si no están, configurar en el sistema:

| Var | Obligatoria | Descripción |
|-----|-------------|-------------|
| `VITE_SUPABASE_URL` | ✅ | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Anon key pública |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Para crear/borrar usuarios de prueba |
| `ANTHROPIC_API_KEY` | Recomendada | Análisis Haiku + redacción de issues |
| `QA_WEB_PATIENT_URL` | ✅ | URL deploy web-patient |
| `QA_WEB_CRO_URL` | Recomendada | URL deploy web-cro |
| `QA_API_URL` | ✅ | URL API en Render |

## Suite de tests (12 tests)

| ID | Flujo | Severidad | Descripción |
|----|-------|-----------|-------------|
| T01a | HTTP | CRITICAL | web-patient responde 200 |
| T01b | HTTP | HIGH | web-cro responde 200 |
| T01c | HTTP | CRITICAL | API /health responde 200 |
| T02 | Auth | CRITICAL | Crear usuario de prueba (admin API) |
| T03 | Auth | CRITICAL | Login con anon key → access_token |
| T04 | Perfil | CRITICAL | Crear perfil primario con RLS activo |
| T05 | Vault | HIGH | Listar estudios (array vacío esperado) |
| T06 | Upload | CRITICAL | Insertar estudio confirmado |
| T07 | Vault | HIGH | Estudio insertado aparece en Vault |
| T08 | Familia | HIGH | Agregar familiar (sin cuenta propia) |
| T09 | Familia | HIGH | Vault del familiar accesible por owner |
| T10 | RLS | CRITICAL | Usuario B NO puede leer datos de usuario A |
| T11 | QR | HIGH | API genera token QR válido |
| T12 | Consent | CRITICAL | consent_audit rechaza UPDATE (append-only) |

## Output

1. **Reporte** → `docs/qa-reports/YYYY-MM-DD_HH-MM_<sha>.md`
2. **GitHub issues** → uno por test fallado, labels `qa,bug,{critical|high}`
3. **Exit code** → 0 si todo pasa, 1 si hay fallas (útil para CI)

## Modelo usado

`claude-haiku-4-5-20251001` — una sola llamada al final del run para:
- Analizar los patrones de falla
- Redactar el resumen ejecutivo del reporte
- Generar el cuerpo de cada GitHub issue

Los tests en sí son código determinístico (fetch al REST API de Supabase).
Haiku solo entra en juego si hay fallas.

## Cómo spawn como subagente Haiku (alternativa)

Si el script falla por algún error de entorno, como agente principal podés:

```
Agent({
  subagent_type: "general-purpose",
  model: "haiku",
  prompt: "Correr el QA de Bresca. Ejecutar `node scripts/post-deploy-qa.mjs` desde la raíz del repo. Leer el reporte generado en docs/qa-reports/. Si hay fallas, crear GitHub issues con `gh issue create`. Reportar el resultado final."
})
```

## Checklist previo al run

- [ ] Las URLs de deploy están activas (verificar en browser)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` está disponible en el entorno
- [ ] `gh auth status` muestra autenticado (para crear issues)
- [ ] La migración más reciente fue aplicada en producción
