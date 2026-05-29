'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

type ThemeToggleProps = {
  collapsed?: boolean;
  mobile?: boolean;
};

export function ThemeToggle({ collapsed = false, mobile = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        className={cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
          collapsed && !mobile && 'justify-center px-2'
        )}
      >
        <Sun className="w-4 h-4 shrink-0" />
        {(!collapsed || mobile) && 'Toggle theme'}
      </button>
    );
  }

  return (
    <button
      type="button"
      name="theme-toggle"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={cn(
        'theme-toggle w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
        collapsed && !mobile && 'justify-center px-2'
      )}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 shrink-0" />
      ) : (
        <Moon className="w-4 h-4 shrink-0" />
      )}
      {(!collapsed || mobile) && (
        <span>Toggle theme</span>
      )}
    </button>
  );
}
