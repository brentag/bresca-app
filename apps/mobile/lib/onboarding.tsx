import React, { createContext, useContext, useState } from 'react';

type OnboardingData = {
  displayName?: string;
  birthYear?: number;
};

type OnboardingCtx = {
  data: OnboardingData;
  set: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
};

const OnboardingContext = createContext<OnboardingCtx>({
  data: {},
  set: () => {},
});

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OnboardingData>({});

  function set<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  return <OnboardingContext.Provider value={{ data, set }}>{children}</OnboardingContext.Provider>;
}

export const useOnboarding = () => useContext(OnboardingContext);
