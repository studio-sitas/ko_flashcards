import { useEffect, useState } from 'react';
import { Plus, Camera, Trash2, BookOpen, Sun, Moon } from 'lucide-react';
import { type CategorySummary, createCategory, deleteCategory, fetchCategories } from '../lib/api';
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
    const [showNew, setShowNew] = useState(false);
    const [newName, setNewName] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<CategorySummary | null>(null);
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

    const handleCreate = async () => {
        const name = newName.trim();
        if (!name) return;
        setBusy(true);
        setErrorMsg('');
        try {
            await createCategory(name);
            setNewName('');
            setShowNew(false);
            await load();
        } catch {
            setErrorMsg('Impossible de créer la catégorie.');
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        setBusy(true);
        setErrorMsg('');
        try {
            await deleteCategory(confirmDelete.slug);
            setConfirmDelete(null);
            await load();
        } catch {
            setErrorMsg('Impossible de supprimer la catégorie.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-slate-900 dark:to-slate-900 px-4 py-6 pb-28">
            <div className="flex items-start justify-between mb-1">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">단어 카드</h1>
                <button
                    onClick={onToggleTheme}
                    aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
                    className="p-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-sm"
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Révise ton vocabulaire coréen</p>

            {errorMsg && <p className="text-red-600 dark:text-red-400 text-sm mb-4">{errorMsg}</p>}

            {categories === null ? (
                <p className="text-slate-400 dark:text-slate-500">Chargement…</p>
            ) : categories.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                    Aucune catégorie pour le moment. Ajoute des mots par photo ou crée une catégorie ci-dessous.
                </p>
            ) : (
                <div className="grid grid-cols-2 gap-3 mb-6">
                    {categories.map((c) => (
                        <div
                            key={c.slug}
                            className="relative bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-4"
                        >
                            <button onClick={() => onOpen(c.slug)} className="w-full text-left">
                                <BookOpen className="text-emerald-600 dark:text-emerald-400 mb-2" size={22} />
                                <p className="font-semibold text-slate-800 dark:text-slate-100">{c.name}</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                    {c.count} mot{c.count !== 1 ? 's' : ''}
                                </p>
                            </button>
                            <button
                                onClick={() => setConfirmDelete(c)}
                                aria-label={`Supprimer la catégorie ${c.name}`}
                                className="absolute top-2 right-2 p-1 text-slate-300 dark:text-slate-600 hover:text-red-500"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {showNew ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-100 dark:border-slate-700 p-4 mb-4">
                    <label className="text-sm text-slate-600 dark:text-slate-400 block mb-2" htmlFor="new-category-name">
                        Nom de la nouvelle catégorie
                    </label>
                    <input
                        id="new-category-name"
                        autoFocus
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="ex : Adjectifs"
                        className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 mb-3"
                    />
                    <div className="flex gap-2">
                        <button
                            disabled={busy}
                            onClick={handleCreate}
                            className="flex-1 bg-emerald-600 text-white rounded-lg py-2 font-medium disabled:opacity-50"
                        >
                            Créer
                        </button>
                        <button
                            onClick={() => {
                                setShowNew(false);
                                setNewName('');
                            }}
                            className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-lg py-2"
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setShowNew(true)}
                    className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 rounded-2xl py-3 mb-4"
                >
                    <Plus size={18} /> Nouvelle catégorie
                </button>
            )}

            <button
                onClick={onImport}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-lg font-medium"
            >
                <Camera size={20} /> Ajouter des mots par photo
            </button>

            {confirmDelete && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-6 z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full">
                        <p className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
                            Supprimer « {confirmDelete.name} » ?
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                            Les {confirmDelete.count} mot{confirmDelete.count !== 1 ? 's' : ''} de cette catégorie seront
                            supprimés définitivement.
                        </p>
                        <div className="flex gap-2">
                            <button
                                disabled={busy}
                                onClick={handleDelete}
                                className="flex-1 bg-red-600 text-white rounded-lg py-2 font-medium disabled:opacity-50"
                            >
                                Supprimer
                            </button>
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-lg py-2"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
