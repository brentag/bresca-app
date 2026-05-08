# Plan de Respuesta a Incidentes — Bresca

**Versión:** 1.0 — 2026-05-08  
**Propietario:** Bresca Dev  
**Revisión:** semestral o tras cada incidente mayor

---

## Clasificación de severidad

| Nivel | Descripción | Tiempo de respuesta inicial |
|---|---|---|
| **P1 — Crítico** | Brecha de datos PII/PHI confirmada o probable · RLS bypassed · servicio de producción caído > 30 min | < 1 hora |
| **P2 — Alto** | Acceso no autorizado sin exfiltración confirmada · degradación de servicio significativa · fallo de backup | < 4 horas |
| **P3 — Medio** | Error funcional con workaround disponible · anomalía de logs sin impacto confirmado | < 24 horas |
| **P4 — Bajo** | Mejora de seguridad preventiva · alerta de dependencia | Próxima sprint |

---

## Contactos de escalada

| Rol | Contacto | Canal |
|---|---|---|
| Responsable técnico | esteban.rubens@gmail.com | Email + WhatsApp |
| Supabase Support | support.supabase.com | Portal (plan Pro: SLA 24h) |
| Render.com Support | render.com/support | Portal |
| Vercel Support | vercel.com/support | Portal |
| AAIP (Agencia datos AR) | infodgpdp@jus.gob.ar | Email (obligatorio P1 en 72h) |

---

## Playbooks por tipo

### PL-01 — Brecha de datos / acceso no autorizado

```
1. CONTENCIÓN (< 30 min)
   a. Revocar service role key comprometida en Supabase → Dashboard → Settings → API
   b. Revocar DEEPSEEK_API_KEY en deepseek.com si el vector fue el Copilot
   c. Si el vector es la API Express: `render service suspend` o DNS cutover
   d. Supabase: habilitar "Pause project" como último recurso

2. EVALUACIÓN (< 2 horas)
   a. Revisar Supabase logs: Dashboard → Logs → PostgREST + Auth (últimas 24h)
   b. Revisar access log de la API en Render (JSON estructurado, filtrar por userId afectado)
   c. Determinar: qué datos, de quién, desde qué IP, en qué timeframe
   d. Consultar consent_audit para ver si el perfil afectado tenía consents activos

3. NOTIFICACIÓN
   a. < 24h: notificar al/los usuario/s afectados por email
   b. < 72h: notificar a la AAIP si afecta datos personales (Ley 25.326 Art. 26)
   c. Documentar en docs/07_PostMortem_Bresca.md con timeline

4. RECUPERACIÓN
   a. Rotar todas las API keys (SUPABASE_SERVICE_ROLE_KEY, DEEPSEEK_API_KEY, QR_TOKEN_SECRET)
   b. Regenerar JWT secret en Supabase si Auth fue comprometido
   c. Verificar RLS policies: `node scripts/post-deploy-qa.mjs`
   d. Restaurar desde PITR si hubo corrupción de datos (Supabase Dashboard → Backups)
```

### PL-02 — Caída de servicio productivo

```
1. VERIFICACIÓN (< 10 min)
   a. GET https://bresca-api.onrender.com/health → debe retornar { status: "ok" }
   b. GET https://bresca-app-api.vercel.app → debe cargar sin error 500
   c. Supabase status: status.supabase.com

2. ACCIONES POR COMPONENTE
   API caída (Render):
     - Verificar logs en Render Dashboard → "Logs"
     - Si OOM: escalar a plan Starter ($7/mo mínimo) o reiniciar servicio
     - Si deploy roto: Render → "Rollback to previous deploy"
   
   Frontend caído (Vercel):
     - Vercel Dashboard → "Deployments" → revertir al deploy anterior
   
   Base de datos caída (Supabase):
     - Verificar status.supabase.com
     - Si es el proyecto pausado por inactividad: "Restore project" en Dashboard
     - Si es regional outage: esperar + comunicar en status page propia

3. COMUNICACIÓN
   - Actualizar estado en canal interno (WhatsApp/Telegram del equipo)
   - Si > 1 hora de caída: email a usuarios registrados con ETA
```

### PL-03 — Vulnerabilidad en dependencia (npm audit / Dependabot)

```
1. Evaluar CVSS score y si el path es alcanzable desde Bresca
2. Si CVSS >= 7 y alcanzable: patchear en < 48h
3. Si CVSS >= 9: tratar como P1 con contención inmediata
4. Actualizar dependencia, correr tests: `pnpm test --filter=api`
5. Deploy inmediato sin esperar sprint
```

### PL-04 — Abuso de rate limiting / DoS

```
1. Identificar userId o IP atacante en access log (apps/api, JSON estructurado)
2. Agregar bloqueo temporal en CORS_ORIGIN o en Render firewall rules
3. Si es ataque al Copilot: reducir QR_MAX_PER_HOUR y RATE_LIMIT temporalmente
4. Para DoS persistente: activar Cloudflare delante de Render (DDoS mitigation)
```

---

## Checklist post-incidente

- [ ] Timeline documentado en `docs/07_PostMortem_Bresca.md`
- [ ] Root cause identificado y categorizado (humano / proceso / técnico)
- [ ] Acción correctiva creada como Issue en GitHub con label `security`
- [ ] Keys rotadas si estuvieron expuestas
- [ ] AAIP notificada si aplica (P1 con PII)
- [ ] Test plan re-corrido: `node scripts/post-deploy-qa.mjs`
- [ ] Lección aprendida incorporada en CLAUDE.md o en reglas absolutas

---

## Backups y recuperación de datos

| Sistema | Mecanismo | RPO | RTO |
|---|---|---|---|
| Supabase DB | PITR (Point-in-Time Recovery) — plan Pro | 1 hora | < 2 horas |
| Supabase Storage | Replication automática en us-east-2 | N/A | N/A |
| Código fuente | Git + GitHub | Último commit | Inmediato |
| Secrets | Render + Supabase Vault | Manual rotation log | < 30 min |

**Nota:** Verificar que PITR esté habilitado en Supabase Dashboard → Settings → Backups antes del go-live.

---

## Rotación de credenciales

| Credential | Frecuencia mínima | Dónde rotar |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Semestral o post-incidente | Supabase → Settings → API → Regenerate |
| `DEEPSEEK_API_KEY` | Mensual | platform.deepseek.com → API Keys |
| `QR_TOKEN_SECRET` | Semestral | Render env vars + redeploy |
| JWT Secret (Supabase Auth) | Solo post-incidente | Supabase → Settings → Auth → JWT |

Registrar cada rotación en el PostMortem o en un log privado con fecha.
