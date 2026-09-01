export type Theme = 'light' | 'dark';

export function getInitialTheme(): Theme {
    try {
        const stored = localStorage.getItem('theme');
        if (stored === 'light' || stored === 'dark') return stored;
    } catch {
        // ignore (private browsing / storage disabled)
    }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

export function applyTheme(theme: Theme): void {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
        localStorage.setItem('theme', theme);
    } catch {
        // ignore
    }
}
