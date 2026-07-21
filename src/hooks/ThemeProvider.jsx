import { useEffect } from 'react';
import { useThemeStore } from '@/store/appStateStore';
import useSettingsStore from '@/store/settingsStore';

export function ThemeProvider({ children }) {
  const theme = useThemeStore((state) => state.theme);
  const selectedTheme = useSettingsStore((state) => state.generalSettings?.selectedTheme || 'theme2');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'theme-1', 'theme-2', 'theme-3', 'theme-4');

    // Safety check to ensure theme is a valid string
    const safeTheme = theme && typeof theme === 'string' ? theme : 'light';

    if (safeTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else if (safeTheme && ['light', 'dark'].includes(safeTheme)) {
      // Only add valid string themes
      root.classList.add(safeTheme);
    }

    if (selectedTheme === 'theme1') {
      root.classList.add('theme-1');
    } else if (selectedTheme === 'theme2') {
      root.classList.add('theme-2');
    } else if (selectedTheme === 'theme3') {
      root.classList.add('theme-3');
    } else if (selectedTheme === 'theme4') {
      root.classList.add('theme-4');
    }
  }, [theme, selectedTheme]);

  return <>{children}</>;
}
