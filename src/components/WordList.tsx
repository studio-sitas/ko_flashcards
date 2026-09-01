import { useEffect, useState } from 'react';
import { ArrowLeft, Pencil, Trash2, Plus, Check, X } from 'lucide-react';
import { type Word, deleteWord, fetchWords, updateWord } from '../lib/api';
import { ChoiceButtons } from './ChoiceButtons';
import {
    CONJUGATION_OPTIONS,
    DEFAULT_CONJUGATION,
    DEFAULT_REGISTER,
    REGISTER_OPTIONS,
    conjugationLabel,
    isVerbCategory,
    registerLabel,
    type Conjugation,
    type Register,
} from '../lib/verbs';

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
    registre: Register;
    conjugaison: Conjugation;
}

export function WordList({ slug, categoryName, onBack, onAdd }: Props) {
    const [words, setWords] = useState<Word[] | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<Draft>({
        term: '',
        pronunciation: '',
        translation: '',
        registre: DEFAULT_REGISTER,
        conjugaison: DEFAULT_CONJUGATION,
    });
    const [confirmDelete, setConfirmDelete] = useState<Word | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const isVerbs = isVerbCategory(categoryName);

    const load = async () => {
        try {
            setWords(await fetchWords(slug));
        } catch {
            setErrorMsg('Impossible de charger les mots.');
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug]);

    const startEdit = (w: Word) => {
        setEditingId(w.id);
        setDraft({
            term: w.term,
            pronunciation: w.pronunciation,
            translation: w.translation,
            registre: (w.registre as Register) || DEFAULT_REGISTER,
            conjugaison: (w.conjugaison as Conjugation) || DEFAULT_CONJUGATION,
        });
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

    return (
        <div className="min-h-screen bg-white dark:bg-slate-900 px-4 py-6 pb-24">
            <header className="flex items-center gap-3 mb-4">
                <button onClick={onBack} aria-label="Retour" className="p-2 -ml-2 text-slate-600 dark:text-slate-300">
                    <ArrowLeft size={22} />
                </button>
                <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{categoryName}</h1>
            </header>

            {errorMsg && <p className="text-red-600 dark:text-red-400 text-sm mb-3">{errorMsg}</p>}

            {words === null ? (
                <p className="text-slate-400 dark:text-slate-500">Chargement…</p>
            ) : words.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400">Aucun mot pour le moment.</p>
            ) : (
                <ul className="space-y-2">
                    {words.map((w) => (
                        <li key={w.id} className="border border-slate-100 dark:border-slate-700 rounded-xl p-3">
                            {editingId === w.id ? (
                                <div className="space-y-3">
                                    <input
                                        value={draft.term}
                                        onChange={(e) => setDraft({ ...draft, term: e.target.value })}
                                        placeholder="Mot en coréen"
                                        className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-lg px-2 py-1"
                                    />
                                    <input
                                        value={draft.pronunciation}
                                        onChange={(e) => setDraft({ ...draft, pronunciation: e.target.value })}
                                        placeholder="Prononciation"
                                        className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-lg px-2 py-1"
                                    />
                                    <input
                                        value={draft.translation}
                                        onChange={(e) => setDraft({ ...draft, translation: e.target.value })}
                                        placeholder="Traduction"
                                        className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-lg px-2 py-1"
                                    />
                                    {isVerbs && (
                                        <>
                                            <ChoiceButtons
                                                label="Registre"
                                                options={REGISTER_OPTIONS}
                                                value={draft.registre}
                                                onChange={(registre) => setDraft({ ...draft, registre })}
                                            />
                                            <ChoiceButtons
                                                label="Conjugaison"
                                                options={CONJUGATION_OPTIONS}
                                                value={draft.conjugaison}
                                                onChange={(conjugaison) => setDraft({ ...draft, conjugaison })}
                                            />
                                        </>
                                    )}
                                    <div className="flex gap-2">
                                        <button onClick={saveEdit} className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                                            <Check size={16} /> Enregistrer
                                        </button>
                                        <button
                                            onClick={() => setEditingId(null)}
                                            className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-sm"
                                        >
                                            <X size={16} /> Annuler
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <p className="font-medium text-slate-800 dark:text-slate-100">
                                            {w.term}{' '}
                                            <span className="text-slate-400 dark:text-slate-500 font-normal">· {w.pronunciation}</span>
                                        </p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{w.translation}</p>
                                        {isVerbs && (
                                            <div className="flex gap-1.5 mt-1">
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800">
                                                    {registerLabel(w.registre)}
                                                </span>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800">
                                                    {conjugationLabel(w.conjugaison)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <button
                                            onClick={() => startEdit(w)}
                                            aria-label={`Modifier ${w.term}`}
                                            className="p-2 text-slate-400 dark:text-slate-500 hover:text-emerald-600"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            onClick={() => setConfirmDelete(w)}
                                            aria-label={`Supprimer ${w.term}`}
                                            className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            <button
                onClick={onAdd}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-lg font-medium"
            >
                <Plus size={18} /> Ajouter un mot
            </button>

            {confirmDelete && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-6 z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full">
                        <p className="font-semibold text-slate-800 dark:text-slate-100 mb-4">
                            Supprimer « {confirmDelete.term} » ?
                        </p>
                        <div className="flex gap-2">
                            <button onClick={confirmAndDelete} className="flex-1 bg-red-600 text-white rounded-lg py-2 font-medium">
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
