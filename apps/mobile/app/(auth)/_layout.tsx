import { Stack } from 'expo-router';
import { OnboardingProvider } from '../../lib/onboarding';

export default function AuthLayout() {
  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </OnboardingProvider>
  );
}
