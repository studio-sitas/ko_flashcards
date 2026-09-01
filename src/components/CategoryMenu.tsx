import { useEffect, useState } from 'react';
import { Camera, Sun, Moon, Settings, AlertTriangle, X } from 'lucide-react';
import { type CategorySummary, fetchCategories, resetAllData } from '../lib/api';
import type { Theme } from '../lib/theme';

interface Props {
    onOpen: (slug: string) => void;
    onImport: () => void;
    theme: Theme;
    onToggleTheme: () => void;
}

export function CategoryMenu({ onOpen, onImport, theme, onToggleTheme }: Props) {
    const [categories, setCategories] = useState<CategorySummary[] | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    const [busy, setBusy] = useState(false);

    const load = async () => {
        try {
            setCategories(await fetchCategories());
        } catch {
            setErrorMsg('Impossible de charger les catégories.');
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleReset = async () => {
        setBusy(true);
        setErrorMsg('');
        try {
            await resetAllData();
            setConfirmReset(false);
            setShowSettings(false);
            await load();
        } catch {
            setErrorMsg('Impossible de tout effacer.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="min-h-screen bg-paper dark:bg-ink-soft px-4 py-6 pb-28 relative overflow-hidden">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -z-10 -top-24 -right-24 w-72 h-72 rounded-full opacity-40 dark:opacity-25 blur-3xl"
                style={{ background: 'radial-gradient(circle, #E2B458 0%, transparent 70%)' }}
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -z-10 top-40 -left-20 w-64 h-64 rounded-full opacity-30 dark:opacity-20 blur-3xl"
                style={{ background: 'radial-gradient(circle, #7C9A46 0%, transparent 70%)' }}
            />
            <div className="relative flex items-start justify-between mb-6 gap-2">
                <h1 className="font-display font-bold text-3xl tracking-tight text-ink dark:text-paper">
                    KO<span className="text-gold-500">/</span>CARDS
                </h1>
                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={onToggleTheme}
                        aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
                        className="p-2 rounded-full bg-white/70 dark:bg-ink border border-ink/10 dark:border-paper/10 text-ink dark:text-paper shadow-sm"
                    >
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <button
                        onClick={() => setShowSettings(true)}
                        aria-label="Réglages"
                        className="p-2 rounded-full bg-white/70 dark:bg-ink border border-ink/10 dark:border-paper/10 text-ink dark:text-paper shadow-sm"
                    >
                        <Settings size={18} />
                    </button>
                </div>
            </div>

            {errorMsg && <p className="text-red-600 dark:text-red-400 text-sm mb-4">{errorMsg}</p>}

            {categories === null ? (
                <p className="text-stone-400 dark:text-stone-500">Chargement…</p>
            ) : (
                <div className="grid grid-cols-2 gap-3 mb-6">
                    {categories.map((c) => (
                        <button
                            key={c.slug}
                            onClick={() => onOpen(c.slug)}
                            className="text-left bg-white/80 dark:bg-ink rounded-2xl shadow-sm border border-ink/5 dark:border-paper/10 p-4 hover:border-gold-300 dark:hover:border-gold-700 transition-colors"
                        >
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gold-100 dark:bg-gold-900/40 text-gold-700 dark:text-gold-300 font-display font-semibold text-sm mb-2">
                                {c.name.charAt(0)}
                            </span>
                            <p className="font-semibold text-ink dark:text-paper">{c.name}</p>
                            <p className="text-xs text-stone-400 dark:text-stone-500">
                                {c.count} mot{c.count !== 1 ? 's' : ''}
                            </p>
                        </button>
                    ))}
                </div>
            )}

            <button
                onClick={onImport}
                aria-label="Ajouter des mots par photo"
                title="Ajouter des mots par photo"
                className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center w-14 h-14 bg-gold-600 hover:bg-gold-700 text-white rounded-full shadow-lg transition-colors"
            >
                <Camera size={24} />
            </button>

            {showSettings && (
                <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-6 z-50">
                    <div className="bg-paper dark:bg-ink rounded-2xl p-6 max-w-sm w-full border border-ink/5 dark:border-paper/10">
                        <div className="flex items-center justify-between mb-4">
                            <p className="font-semibold text-ink dark:text-paper">Réglages</p>
                            <button
                                onClick={() => {
                                    setShowSettings(false);
                                    setConfirmReset(false);
                                }}
                                aria-label="Fermer"
                                className="text-stone-400 dark:text-stone-500"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {!confirmReset ? (
                            <button
                                onClick={() => setConfirmReset(true)}
                                className="w-full flex items-center justify-center gap-2 bg-red-600 text-white rounded-lg py-2.5 font-medium"
                            >
                                <AlertTriangle size={16} /> Tout effacer
                            </button>
                        ) : (
                            <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
                                <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                                    Cette action supprime définitivement tous tes mots, dans toutes les catégories. Es-tu
                                    sûr ?
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        disabled={busy}
                                        onClick={handleReset}
                                        className="flex-1 bg-red-600 text-white rounded-lg py-2 font-medium disabled:opacity-50"
                                    >
                                        Oui, tout effacer
                                    </button>
                                    <button
                                        onClick={() => setConfirmReset(false)}
                                        className="flex-1 bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-200 rounded-lg py-2"
                                    >
                                        Annuler
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
