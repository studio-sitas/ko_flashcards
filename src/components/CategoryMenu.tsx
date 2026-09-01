import { useEffect, useState } from 'react';
import { Camera, BookOpen, Sun, Moon, Settings, AlertTriangle, X } from 'lucide-react';
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
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-slate-900 dark:to-slate-900 px-4 py-6 pb-28">
            <div className="flex items-start justify-between mb-1 gap-2">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">단어 카드</h1>
                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={onToggleTheme}
                        aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
                        className="p-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-sm"
                    >
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <button
                        onClick={() => setShowSettings(true)}
                        aria-label="Réglages"
                        className="p-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-sm"
                    >
                        <Settings size={18} />
                    </button>
                </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Révise ton vocabulaire coréen</p>

            {errorMsg && <p className="text-red-600 dark:text-red-400 text-sm mb-4">{errorMsg}</p>}

            {categories === null ? (
                <p className="text-slate-400 dark:text-slate-500">Chargement…</p>
            ) : (
                <div className="grid grid-cols-2 gap-3 mb-6">
                    {categories.map((c) => (
                        <button
                            key={c.slug}
                            onClick={() => onOpen(c.slug)}
                            className="text-left bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-4"
                        >
                            <BookOpen className="text-emerald-600 dark:text-emerald-400 mb-2" size={22} />
                            <p className="font-semibold text-slate-800 dark:text-slate-100">{c.name}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                                {c.count} mot{c.count !== 1 ? 's' : ''}
                            </p>
                        </button>
                    ))}
                </div>
            )}

            <button
                onClick={onImport}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-lg font-medium"
            >
                <Camera size={20} /> Ajouter des mots par photo
            </button>

            {showSettings && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-6 z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full">
                        <div className="flex items-center justify-between mb-4">
                            <p className="font-semibold text-slate-800 dark:text-slate-100">Réglages</p>
                            <button
                                onClick={() => {
                                    setShowSettings(false);
                                    setConfirmReset(false);
                                }}
                                aria-label="Fermer"
                                className="text-slate-400 dark:text-slate-500"
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
                                        className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-lg py-2"
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
