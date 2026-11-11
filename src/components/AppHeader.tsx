import React from 'react';
import { useT } from '../hooks/useT';
import { IconButton } from './ui/IconButton';

export interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  showBack = false,
  onBack,
  rightAction
}) => {
  const { t, locale, toggleLocale } = useT();
  const displayTitle = title || t('app.title');

  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    if (typeof document !== 'undefined') {
      const attr = document.documentElement.getAttribute('data-theme');
      if (attr === 'light' || attr === 'dark') return attr;
      if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    setTheme(next);
  };

  return (
    <header className="flex items-center justify-between h-12 px-2 border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-[var(--z-sticky)] select-none">
      <div className="flex items-center gap-1 min-w-0">
        {showBack && onBack ? (
          <IconButton
            label={t('nav.back')}
            variant="ghost"
            onClick={onBack}
            className="text-[18px] font-bold shrink-0"
          >
            ‹
          </IconButton>
        ) : (
          <div className="w-8 h-8 rounded-[var(--radius-control)] bg-[var(--action-primary)] flex items-center justify-center text-[var(--text-inverse)] font-bold text-[14px] ml-2 shrink-0">
            TJ
          </div>
        )}

        <h1 className="text-[16px] leading-[24px] font-bold text-[var(--text-primary)] truncate px-2">
          {displayTitle}
        </h1>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {rightAction !== undefined ? (
          rightAction
        ) : (
          <>
            <button
              type="button"
              onClick={toggleTheme}
              className="min-h-[var(--touch-target-min)] px-2.5 flex items-center justify-center text-[12px] leading-[16px] font-bold text-[var(--action-primary)] hover:bg-[var(--surface-raised)] active:bg-[var(--surface-active)] rounded-[var(--radius-control)] cursor-pointer tactile-press"
              aria-label="Ganti Tema / Switch Theme"
            >
              {theme === 'dark' ? t('theme.toggle_light') : t('theme.toggle_dark')}
            </button>
            <button
              type="button"
              onClick={toggleLocale}
              className="min-w-[var(--touch-target-min)] min-h-[var(--touch-target-min)] px-2.5 flex items-center justify-center text-[12px] leading-[16px] font-bold text-[var(--action-primary)] hover:bg-[var(--surface-raised)] active:bg-[var(--surface-active)] rounded-[var(--radius-control)] cursor-pointer tactile-press"
              aria-label="Ganti Bahasa / Switch Language"
            >
              {locale === 'id' ? 'EN' : 'ID'}
            </button>
          </>
        )}
      </div>
    </header>
  );
};
