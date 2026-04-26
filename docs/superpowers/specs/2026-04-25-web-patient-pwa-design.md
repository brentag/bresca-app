# Bresca — `apps/web-patient` PWA: Spec de Diseño

**Fecha:** 2026-04-25  
**Decisión:** Opción A — PWA React + Vite en lugar de React Native para V1  
**Driver:** Velocidad de iteración, cero burocracia de App Stores, pivot-friendly

---

## Contexto y rationale

El MVP nativo (Expo/React Native) está construido pero no deployado. El driver principal para V1 es velocidad de feedback con usuarios reales. Una PWA permite deploy instantáneo vía Vercel, actualizaciones sin review, e iteración diaria. Cuando se valide la propuesta de valor, la app nativa se lanza como evento de marketing con usuarios y métricas reales ya existentes.

La cámara —feature central para escanear estudios— funciona en browsers móviles vía `<input type="file" capture="environment">`. La UX es ligeramente inferior a nativa pero funcional para validación.

---

## Stack

| Capa | Tech |
|---|---|
| Framework | React 18 + Vite 6 + TypeScript |
| Routing | React Router v7 |
| PWA | vite-plugin-pwa (Workbox autoUpdate) |
| Auth + DB | Supabase (email OTP, anon client) |
| API | `apps/api` vía fetch (mismo backend existente) |
| Estilo | CSS Variables (Design System tokens) + inline styles |
| Iconos | Lucide React |
| Deploy | Vercel (SPA rewrites) |

---

## Estructura de archivos

```
apps/web-patient/
├── index.html                    # iOS meta tags, font link
├── vite.config.ts                # PWA plugin, alias @/
├── tsconfig.json
├── package.json
├── public/
│   ├── manifest.json             # PWA manifest
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
└── src/
    ├── main.tsx
    ├── App.tsx                   # Router raíz + SessionProvider
    ├── styles/
    │   ├── tokens.css            # Design System/colors_and_type.css
    │   └── global.css            # reset, base, utilities
    ├── lib/
    │   ├── supabase.ts           # cliente anon (porta web-cro pattern)
    │   ├── session.tsx           # SessionProvider + useSession (porta mobile)
    │   ├── useProfile.ts         # hook profile (porta mobile)
    │   ├── vault.ts              # CATEGORIES, formatDate, mockExtract (porta mobile)
    │   └── api.ts                # calls a /copilot, /qr
    ├── components/
    │   ├── ProtectedRoute.tsx    # redirect si no auth
    │   ├── Layout.tsx            # wrapper con bottom nav (4 tabs)
    │   ├── StudyCard.tsx
    │   ├── CategoryChip.tsx
    │   └── Spinner.tsx
    └── pages/
        ├── auth/
        │   ├── Welcome.tsx       # pantalla splash + CTA
        │   ├── Email.tsx         # input email
        │   └── Verify.tsx        # input OTP
        ├── onboarding/
        │   ├── Name.tsx
        │   ├── Year.tsx
        │   ├── Conditions.tsx
        │   └── ConsentIntro.tsx
        └── app/
            ├── Vault.tsx         # lista estudios + filtros
            ├── Upload.tsx        # 3 pasos: pick → review → save
            ├── StudyDetail.tsx
            ├── QRGenerate.tsx    # genera token + muestra QR
            ├── QRView.tsx        # vista médico (pública)
            ├── Copilot.tsx       # chat IA
            ├── Family.tsx        # (MVP: placeholder)
            └── Menu.tsx          # perfil + consentimiento + logout
```

---

## Flows de navegación

```
/ → redirect (auth check)
  ├─ no session → /welcome
  │     → /auth/email → /auth/verify
  │           → /onboarding/name → /year → /conditions → /consent
  │                 → /app/vault
  └─ session → /app/vault

/app/* (ProtectedRoute + Layout con bottom nav)
  ├─ /app/vault
  ├─ /app/vault/upload
  ├─ /app/vault/:id
  ├─ /app/vault/qr
  ├─ /app/copilot
  ├─ /app/family
  └─ /app/menu

/qr/:token  (pública — vista médico sin auth)
```

---

## Cámara en web

```html
<input
  type="file"
  accept="image/jpeg,image/png,image/webp,application/pdf"
  capture="environment"
/>
```

- Móvil Android/iOS: abre cámara trasera directamente
- Desktop: abre file picker (fallback válido para testing)
- Sin SDKs extra, sin permisos de browser API complejos

---

## PWA: instalabilidad

**Android (Chrome):** banner de instalación automático si el manifest está correcto.

**iOS (Safari):** sin banner automático. Solución:
- Meta tag `apple-mobile-web-app-capable` en index.html
- Prompt manual "Añadir a inicio" mostrado en-app (modal explicativo la primera vez)
- `apple-touch-icon` en public/

**Service worker:** Workbox con `registerType: 'autoUpdate'`. Cachea assets estáticos. No cachea llamadas al API.

---

## Reutilización del código existente

| Archivo fuente | Destino | Cambios |
|---|---|---|
| `apps/mobile/lib/session.tsx` | `src/lib/session.tsx` | Copiar directo — ya son hooks React puros |
| `apps/mobile/lib/useProfile.ts` | `src/lib/useProfile.ts` | Copiar directo |
| `apps/mobile/lib/vault.ts` | `src/lib/vault.ts` | Eliminar tipos `Json` de RN, conservar lógica |
| `apps/web-cro/src/lib/supabase.ts` | `src/lib/supabase.ts` | Copiar, cambiar a VITE_PATIENT_SUPABASE_URL |
| `Design System/colors_and_type.css` | `src/styles/tokens.css` | Copiar directo |
| `packages/shared/*` | importar `@bresca/shared` | Sin cambios |

---

## Critical fixes del API (incluidos en el plan)

1. **`apps/api/src/qr/router.ts:99`** — Filtrar `extracted_fields` contra allowlist antes de devolver al médico
2. **`apps/api/src/copilot/router.ts:67`** — Envolver llamada Anthropic en try/catch → responder 503
3. **`apps/api/src/cro/router.ts:14`** — Fail-closed: denegar acceso si allowlist vacío en prod

---

## Criterios de éxito para V1

- [ ] Usuario puede registrarse con email en mobile browser (Android + iOS)
- [ ] Usuario puede subir foto de estudio con cámara del dispositivo
- [ ] Usuario ve sus estudios en vault, puede filtrar por categoría
- [ ] Usuario puede chatear con Copilot IA sobre sus estudios
- [ ] Usuario puede generar QR y el médico puede verlo en browser sin instalar nada
- [ ] App instalable en Android (Chrome install prompt)
- [ ] Deploy en Vercel, URL pública, sin App Store
