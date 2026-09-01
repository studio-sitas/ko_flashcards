import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Pencil, Trash2, Plus, Check, X, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { type Word, deleteWord, fetchWords, regenerateExample, updateWord } from '../lib/api';
import { VerbFormsPanel } from './VerbFormsPanel';
import { isVerbCategory } from '../lib/verbs';

interface Props {
    slug: string;
    categoryName: string;
    onBack: () => void;
    onAdd: () => void;
}

interface Draft {
    term: string;
    pronunciation: string;
    translation: string;
}

export function WordList({ slug, categoryName, onBack, onAdd }: Props) {
    const [words, setWords] = useState<Word[] | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [draft, setDraft] = useState<Draft>({ term: '', pronunciation: '', translation: '' });
    const [confirmDelete, setConfirmDelete] = useState<Word | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [regeneratingExampleId, setRegeneratingExampleId] = useState<string | null>(null);
    const isVerbs = isVerbCategory(categoryName);
    const activeSlug = useRef(slug);

    const load = async () => {
        const requestedSlug = slug;
        try {
            const ws = await fetchWords(requestedSlug);
            if (activeSlug.current === requestedSlug) setWords(ws);
        } catch {
            if (activeSlug.current === requestedSlug) setErrorMsg('Impossible de charger les mots.');
        }
    };

    useEffect(() => {
        activeSlug.current = slug;
        setWords(null);
        setErrorMsg('');
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug]);

    const startEdit = (w: Word) => {
        setEditingId(w.id);
        setDraft({ term: w.term, pronunciation: w.pronunciation, translation: w.translation });
        setErrorMsg('');
    };

    const saveEdit = async () => {
        if (!editingId) return;
        if (!draft.term.trim() || !draft.translation.trim()) {
            setErrorMsg('Le mot et la traduction sont requis.');
            return;
        }
        try {
            await updateWord(slug, editingId, draft);
            setEditingId(null);
            await load();
        } catch {
            setErrorMsg('Échec de la mise à jour.');
        }
    };

    const confirmAndDelete = async () => {
        if (!confirmDelete) return;
        try {
            await deleteWord(slug, confirmDelete.id);
            setConfirmDelete(null);
            await load();
        } catch {
            setErrorMsg('Échec de la suppression.');
        }
    };

    const updateWordInPlace = (updated: Word) => {
        setWords((ws) => (ws ? ws.map((w) => (w.id === updated.id ? updated : w)) : ws));
    };

    const handleRegenerateExample = async (w: Word) => {
        setRegeneratingExampleId(w.id);
        setErrorMsg('');
        try {
            const res = await regenerateExample(slug, w.id);
            updateWordInPlace({ ...w, example: res.example });
        } catch {
            setErrorMsg("Échec de la régénération de l'exemple.");
        } finally {
            setRegeneratingExampleId(null);
        }
    };

    return (
        <div className="min-h-screen bg-paper dark:bg-ink-soft px-4 py-6 pb-24">
            <header className="flex items-center gap-3 mb-4">
                <button onClick={onBack} aria-label="Retour" className="p-2 -ml-2 text-ink dark:text-paper">
                    <ArrowLeft size={22} />
                </button>
                <h1 className="font-display text-xl font-semibold uppercase tracking-wide text-ink dark:text-paper">
                    {categoryName}
                </h1>
            </header>

            {errorMsg && <p className="text-red-600 dark:text-red-400 text-sm mb-3">{errorMsg}</p>}

            {words === null ? (
                <p className="text-stone-400 dark:text-stone-500">Chargement…</p>
            ) : words.length === 0 ? (
                <p className="text-stone-500 dark:text-stone-400">Aucun mot pour le moment.</p>
            ) : (
                <ul className="space-y-2">
                    {words.map((w) => (
                        <li key={w.id} className="border border-stone-200 dark:border-stone-700 bg-white/60 dark:bg-ink/60 rounded-xl p-3">
                            {editingId === w.id ? (
                                <div className="space-y-3">
                                    <input
                                        value={draft.term}
                                        onChange={(e) => setDraft({ ...draft, term: e.target.value })}
                                        placeholder="Mot en coréen"
                                        className="w-full border border-stone-200 dark:border-stone-600 dark:bg-ink dark:text-paper rounded-lg px-2 py-1"
                                    />
                                    <input
                                        value={draft.pronunciation}
                                        onChange={(e) => setDraft({ ...draft, pronunciation: e.target.value })}
                                        placeholder="Prononciation"
                                        className="w-full border border-stone-200 dark:border-stone-600 dark:bg-ink dark:text-paper rounded-lg px-2 py-1"
                                    />
                                    <input
                                        value={draft.translation}
                                        onChange={(e) => setDraft({ ...draft, translation: e.target.value })}
                                        placeholder="Traduction"
                                        className="w-full border border-stone-200 dark:border-stone-600 dark:bg-ink dark:text-paper rounded-lg px-2 py-1"
                                    />
                                    {isVerbs && (
                                        <p className="text-xs text-stone-400 dark:text-stone-500">
                                            Si tu changes le mot en coréen, toutes les conjugaisons seront régénérées automatiquement.
                                        </p>
                                    )}
                                    <div className="flex gap-2">
                                        <button onClick={saveEdit} className="flex items-center gap-1 text-gold-600 dark:text-gold-400 text-sm font-medium">
                                            <Check size={16} /> Enregistrer
                                        </button>
                                        <button
                                            onClick={() => setEditingId(null)}
                                            className="flex items-center gap-1 text-stone-500 dark:text-stone-400 text-sm"
                                        >
                                            <X size={16} /> Annuler
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center justify-between gap-2">
                                        <button
                                            className="text-left flex-1"
                                            onClick={() => isVerbs && setExpandedId(expandedId === w.id ? null : w.id)}
                                        >
                                            <p className="font-medium text-ink dark:text-paper">
                                                {w.term}{' '}
                                                <span className="text-stone-400 dark:text-stone-500 font-normal">· {w.pronunciation}</span>
                                            </p>
                                            <p className="text-sm text-stone-500 dark:text-stone-400">{w.translation}</p>
                                            {w.example && (
                                                <p className="text-xs text-stone-400 dark:text-stone-500 italic mt-1">
                                                    {w.example.term} — {w.example.translation}
                                                </p>
                                            )}
                                        </button>
                                        <div className="flex gap-1 shrink-0 items-center">
                                            <button
                                                onClick={() => handleRegenerateExample(w)}
                                                disabled={regeneratingExampleId === w.id}
                                                aria-label={`Régénérer la phrase d'exemple pour ${w.term}`}
                                                className="p-2 text-stone-400 dark:text-stone-500 hover:text-gold-600 disabled:opacity-50"
                                            >
                                                <RefreshCw size={16} className={regeneratingExampleId === w.id ? 'animate-spin' : ''} />
                                            </button>
                                            {isVerbs && (
                                                <button
                                                    onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
                                                    aria-label="Voir les conjugaisons"
                                                    className="p-2 text-stone-400 dark:text-stone-500 hover:text-gold-600"
                                                >
                                                    {expandedId === w.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => startEdit(w)}
                                                aria-label={`Modifier ${w.term}`}
                                                className="p-2 text-stone-400 dark:text-stone-500 hover:text-gold-600"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => setConfirmDelete(w)}
                                                aria-label={`Supprimer ${w.term}`}
                                                className="p-2 text-stone-400 dark:text-stone-500 hover:text-red-500"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    {isVerbs && expandedId === w.id && (
                                        <VerbFormsPanel slug={slug} word={w} onUpdated={updateWordInPlace} />
                                    )}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            <button
                onClick={onAdd}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-white px-6 py-3 rounded-full shadow-lg font-medium transition-colors"
            >
                <Plus size={18} /> Ajouter un mot
            </button>

            {confirmDelete && (
                <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-6 z-50">
                    <div className="bg-paper dark:bg-ink rounded-2xl p-6 max-w-sm w-full border border-ink/5 dark:border-paper/10">
                        <p className="font-semibold text-ink dark:text-paper mb-4">
                            Supprimer « {confirmDelete.term} » ?
                        </p>
                        <div className="flex gap-2">
                            <button onClick={confirmAndDelete} className="flex-1 bg-red-600 text-white rounded-lg py-2 font-medium">
                                Supprimer
                            </button>
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="flex-1 bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-200 rounded-lg py-2"
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
