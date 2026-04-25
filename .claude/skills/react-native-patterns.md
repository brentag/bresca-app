# Skill: react-native-patterns
> Cargar cuando: creás pantallas mobile, configurás navegación, trabajás con push notifications, o preparás builds para las stores.

## Navegación (Expo Router)

```typescript
// Estructura de grupos de rutas
app/
  (auth)/          → sin layout autenticado (welcome, onboarding, signup)
  (app)/           → con layout autenticado (tab bar)
    index.tsx      → /        → Dashboard
    vault/         → /vault/  → Health Vault
    copilot.tsx    → /copilot → Copilot chat
    qr.tsx         → /qr      → Generar QR
    family/        → /family/ → Gestión familiar
    consent/       → /consent → Centro de consentimiento
  qr/[token].tsx   → /qr/:token → Vista médico (sin auth)

// Navegar programáticamente
import { router } from 'expo-router';
router.push('/vault/upload');
router.replace('/(app)');   // después de login — no puede volver atrás
```

## Patrón de pantalla

```typescript
// apps/mobile/app/(app)/vault/index.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@bresca/shared/supabase';
import type { Study } from '@bresca/shared/database.types';

export default function VaultScreen() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStudies();
  }, []);

  async function loadStudies() {
    setLoading(true);
    const { data, error } = await supabase
      .from('studies')
      .select('*')
      .eq('confirmed', true)
      .order('study_date', { ascending: false });

    if (error) setError(error.message);
    else setStudies(data ?? []);
    setLoading(false);
  }

  // ...
}
```

## Push Notifications

```typescript
// apps/mobile/hooks/useNotifications.ts
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

// Configurar handler antes del registro
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function useNotifications() {
  useEffect(() => {
    registerForPushNotifications();
    // Listener para notificaciones cuando la app está en foreground
    const sub = Notifications.addNotificationReceivedListener(handleForeground);
    // Listener para tap en notificación (background/killed)
    const sub2 = Notifications.addNotificationResponseReceivedListener(handleTap);
    return () => { sub.remove(); sub2.remove(); };
  }, []);
}

async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  });

  // Guardar token en DB para enviar notificaciones desde el backend
  await supabase.from('push_tokens').upsert({
    profile_id: currentProfileId,
    token: token.data,
    platform: Platform.OS,
  });
}

function handleTap(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data;
  if (data.type === 'study_invitation') {
    router.push(`/consent?study=${data.cro_study_id}`);
  }
  if (data.type === 'qr_expiring') {
    router.push('/qr');
  }
}
```

## Builds y distribución (EAS)

```bash
# eas.json — configuración de builds
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "staging": {
      "distribution": "internal",
      "env": { "APP_ENV": "staging" }
    },
    "production": {
      "distribution": "store",
      "env": { "APP_ENV": "production" }
    }
  }
}

# Comandos
eas build --platform ios --profile staging      # → TestFlight
eas build --platform android --profile staging  # → Play Internal Testing
eas build --platform all --profile production   # → ambas stores
eas submit --platform ios                        # → enviar a App Store review
```

## Variables de entorno en Expo

```bash
# .env.local (no commitear)
EXPO_PUBLIC_SUPABASE_URL=...     # Prefijo EXPO_PUBLIC_ = accesible en cliente
EXPO_PUBLIC_SUPABASE_ANON_KEY=...

# NUNCA exponer en cliente:
# SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, GOOGLE_DOCAI_KEY
```

## Acceso a cámara / archivos

```typescript
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

// Foto desde cámara
async function pickFromCamera() {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') return;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.8,           // comprimir para reducir tamaño de upload
    allowsEditing: false,   // no editar — queremos el documento completo
  });
  if (!result.canceled) uploadStudy(result.assets[0].uri);
}

// Archivo (PDF)
async function pickDocument() {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
  });
  if (result.assets?.[0]) uploadStudy(result.assets[0].uri);
}
```
