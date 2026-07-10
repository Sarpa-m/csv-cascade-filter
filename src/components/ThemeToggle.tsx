import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark' | 'pastel';

const THEME_KEY = 'csv-cascade-theme';

/** Temas escuros: precisam tanto de `data-theme` quanto da classe `.dark` no <html> */
const DARK_THEMES: Set<string> = new Set(['dark']);

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'pastel' || stored === 'light') return stored;
  } catch { /* localStorage indisponível */ }
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

/**
 * Aplica um tema ao documento.
 * - Seta `data-theme` no <html> para ativar os tokens de camada 1.
 * - Seta/remove a classe `.dark` para compatibilidade com utilitários `dark:` do Tailwind.
 */
function applyTheme(theme: Theme): void {
  const html = document.documentElement;
  html.setAttribute('data-theme', theme);
  html.classList.toggle('dark', DARK_THEMES.has(theme));
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignora */ }
}

const themes: Array<{ key: Theme; icon: typeof Sun; label: string }> = [
  { key: 'light', icon: Sun, label: 'Claro' },
  { key: 'dark', icon: Moon, label: 'Escuro' },
  { key: 'pastel', icon: Palette, label: 'Pastel' },
];

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const stored = getStoredTheme();
    setTheme(stored);
    applyTheme(stored);
  }, []);

  const cycle = useCallback(() => {
    setTheme((prev) => {
      const idx = themes.findIndex((t) => t.key === prev);
      const next = themes[(idx + 1) % themes.length];
      applyTheme(next.key);
      return next.key;
    });
  }, []);

  const Icon = themes.find((t) => t.key === theme)?.icon ?? Sun;

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={cycle}
      className={cn(
        'h-9 w-9 rounded-lg transition-all duration-300',
        theme === 'dark' && 'border-slate-600 bg-slate-800 text-yellow-400 hover:bg-slate-700 hover:text-yellow-300',
        theme === 'pastel' && 'border-pink-200 bg-pink-50 text-pink-500 hover:bg-pink-100 dark:bg-pink-950 dark:border-pink-800 dark:text-pink-300',
        theme === 'light' && 'border-border bg-card text-amber-500 hover:bg-muted',
      )}
      title={`Tema: ${themes.find((t) => t.key === theme)?.label}`}
    >
      <Icon className="w-4 h-4" />
    </Button>
  );
};
