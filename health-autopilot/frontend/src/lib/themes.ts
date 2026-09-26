export type ThemeName = 'midnight' | 'solar' | 'aura' | 'arctic';

export const THEME_ACCENTS: Record<ThemeName, string> = {
  midnight: '#00E5FF',
  solar:    '#E8622A',
  aura:     '#C084FC',
  arctic:   '#1B6FEB',
};

export const THEME_LABELS: Record<ThemeName, string> = {
  midnight: 'Midnight',
  solar:    'Solar',
  aura:     'Aura',
  arctic:   'Arctic',
};

export function applyTheme(theme: ThemeName): void {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('autopilot-theme', theme);
}

export function getStoredTheme(): ThemeName {
  if (typeof window === 'undefined') return 'midnight';
  const stored = localStorage.getItem('autopilot-theme') as ThemeName;
  return (stored && THEME_ACCENTS[stored]) ? stored : 'midnight';
}

export function initTheme(): void {
  const theme = getStoredTheme();
  document.documentElement.setAttribute('data-theme', theme);
}
