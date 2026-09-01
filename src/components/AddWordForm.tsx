import { useState } from 'react';
import { ArrowLeft, AlertTriangle, Sparkles } from 'lucide-react';
import { addWord } from '../lib/api';
import { isVerbCategory } from '../lib/verbs';

interface Props {
    categoryName: string;
    onBack: () => void;
    onAdded: () => void;
}

export function AddWordForm({ categoryName, onBack, onAdded }: Props) {
    const [term, setTerm] = useState('');
    const [pronunciation, setPronunciation] = useState('');
    const [translation, setTranslation] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const isVerbs = isVerbCategory(categoryName);

    const submit = async (force = false) => {
        setErrorMsg('');
        if (!term.trim() || !translation.trim()) {
            setErrorMsg('Le mot en coréen et la traduction sont obligatoires.');
            return;
        }
        setBusy(true);
        try {
            const res = await addWord({ categoryName, term, pronunciation, translation, force });
            if (res.duplicate && !force) {
                setDuplicateWarning(res.existingCategory || categoryName);
            } else {
                setDuplicateWarning(null);
                onAdded();
            }
        } catch {
            setErrorMsg("Échec de l'ajout du mot.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="min-h-screen bg-paper dark:bg-ink-soft px-4 py-6">
            <header className="flex items-center gap-3 mb-6">
                <button onClick={onBack} aria-label="Retour" className="p-2 -ml-2 text-ink dark:text-paper">
                    <ArrowLeft size={22} />
                </button>
                <h1 className="font-display text-xl font-semibold text-ink dark:text-paper">Ajouter un mot · {categoryName}</h1>
            </header>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    submit(false);
                }}
                className="space-y-4 max-w-sm"
            >
                <div>
                    <label className="text-sm text-stone-600 dark:text-stone-400 block mb-1" htmlFor="word-term">
                        Mot en coréen {isVerbs ? '(infinitif) ' : ''}*
                    </label>
                    <input
                        id="word-term"
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        className="w-full border border-stone-200 dark:border-stone-600 dark:bg-ink dark:text-paper rounded-lg px-3 py-2"
                        placeholder={isVerbs ? '예: 가다' : '예: 친구'}
                    />
                </div>
                <div>
                    <label className="text-sm text-stone-600 dark:text-stone-400 block mb-1" htmlFor="word-pronunciation">
                        Prononciation
                    </label>
                    <input
                        id="word-pronunciation"
                        value={pronunciation}
                        onChange={(e) => setPronunciation(e.target.value)}
                        className="w-full border border-stone-200 dark:border-stone-600 dark:bg-ink dark:text-paper rounded-lg px-3 py-2"
                        placeholder="ex: tchin'gou"
                    />
                </div>
                <div>
                    <label className="text-sm text-stone-600 dark:text-stone-400 block mb-1" htmlFor="word-translation">
                        Traduction française *
                    </label>
                    <input
                        id="word-translation"
                        value={translation}
                        onChange={(e) => setTranslation(e.target.value)}
                        className="w-full border border-stone-200 dark:border-stone-600 dark:bg-ink dark:text-paper rounded-lg px-3 py-2"
                        placeholder="ex: ami"
                    />
                </div>

                {isVerbs && (
                    <p className="flex items-start gap-1.5 text-xs text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-ink rounded-lg p-2.5">
                        <Sparkles size={14} className="shrink-0 mt-0.5 text-gold-600 dark:text-gold-400" />
                        Les conjugaisons (3 registres × 4 temps × affirmatif/négatif) seront générées automatiquement à
                        partir de cet infinitif — modifiables ensuite dans « Gérer les mots ».
                    </p>
                )}

                {errorMsg && <p className="text-red-600 dark:text-red-400 text-sm">{errorMsg}</p>}

                {duplicateWarning && (
                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-200">
                        <p className="mb-2 flex items-center gap-1">
                            <AlertTriangle size={14} /> Ce mot existe déjà dans la catégorie « {duplicateWarning} ».
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => submit(true)}
                                className="px-3 py-1.5 bg-amber-600 text-white rounded-md text-sm"
                            >
                                Ajouter quand même
                            </button>
                            <button
                                type="button"
                                onClick={() => setDuplicateWarning(null)}
                                className="px-3 py-1.5 bg-white dark:bg-ink border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 rounded-md text-sm"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={busy}
                    className="w-full bg-gold-600 hover:bg-gold-700 text-white rounded-lg py-2.5 font-medium disabled:opacity-50 transition-colors"
                >
                    {busy && isVerbs ? 'Génération des conjugaisons…' : 'Ajouter'}
                </button>
            </form>
        </div>
    );
}
