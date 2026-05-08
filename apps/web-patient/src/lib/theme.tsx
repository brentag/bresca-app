import { createContext, useContext, useEffect, useState } from 'react';

type ThemeCtx = { isDark: boolean; toggle: () => void };
const Ctx = createContext<ThemeCtx>({ isDark: false, toggle: () => {} });

const KEY = 'bresca_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(() => localStorage.getItem(KEY) === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem(KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <Ctx.Provider value={{ isDark, toggle: () => setIsDark(v => !v) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() { return useContext(Ctx); }

// Color tokens for inline-style dark/light theming
export function themeColors(isDark: boolean) {
  return {
    bg:          isDark ? '#0F172A' : '#F7F9FC',
    card:        isDark ? '#1E293B' : '#ffffff',
    cardAlt:     isDark ? '#162032' : '#F8FAFC',
    border:      isDark ? '#334155' : '#E2E8F0',
    borderLight: isDark ? '#1E293B' : '#F1F5F9',
    text:        isDark ? '#F1F5F9' : '#0F172A',
    textSub:     isDark ? '#94A3B8' : '#64748B',
    textMuted:   isDark ? '#64748B' : '#94A3B8',
    iconBg:      isDark ? '#1E293B' : '#F7F9FC',
    brand:       '#00C87A',
  };
}
