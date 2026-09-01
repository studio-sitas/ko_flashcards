import { useState } from 'react';
import { Pencil, RefreshCw, Check, X } from 'lucide-react';
import { type Word, correctVerbForm, regenerateVerbForms } from '../lib/api';
import { ChoiceButtons } from './ChoiceButtons';
import {
    CONJUGATION_OPTIONS,
    DEFAULT_CONJUGATION,
    DEFAULT_NEGATION,
    DEFAULT_REGISTER,
    NEGATION_OPTIONS,
    REGISTER_OPTIONS,
    formKey,
    type Conjugation,
    type Negation,
    type Register,
} from '../lib/verbs';

interface Props {
    slug: string;
    word: Word;
    onUpdated: (word: Word) => void;
}

export function VerbFormsPanel({ slug, word, onUpdated }: Props) {
    const [registre, setRegistre] = useState<Register>(DEFAULT_REGISTER);
    const [conjugaison, setConjugaison] = useState<Conjugation>(DEFAULT_CONJUGATION);
    const [negation, setNegation] = useState<Negation>(DEFAULT_NEGATION);
    const [editing, setEditing] = useState(false);
    const [draftTerm, setDraftTerm] = useState('');
    const [draftPronunciation, setDraftPronunciation] = useState('');
    const [busy, setBusy] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const key = formKey(registre, conjugaison, negation);
    const form = word.forms?.[key];
    const stillGenerating = !word.forms;

    const startEdit = () => {
        setDraftTerm(form?.term || '');
        setDraftPronunciation(form?.pronunciation || '');
        setEditing(true);
        setErrorMsg('');
    };

    const saveForm = async () => {
        if (!draftTerm.trim()) {
            setErrorMsg('Le mot est requis.');
            return;
        }
        setBusy(true);
        setErrorMsg('');
        try {
            const res = await correctVerbForm(slug, word.id, {
                registre,
                conjugaison,
                negation,
                term: draftTerm.trim(),
                pronunciation: draftPronunciation.trim(),
            });
            onUpdated({ ...word, forms: res.forms });
            setEditing(false);
        } catch {
            setErrorMsg('Échec de la correction.');
        } finally {
            setBusy(false);
        }
    };

    const regenerateAll = async () => {
        setBusy(true);
        setErrorMsg('');
        try {
            const res = await regenerateVerbForms(slug, word.id);
            onUpdated({ ...word, forms: res.forms, formsGeneratedAt: res.formsGeneratedAt });
        } catch {
            setErrorMsg('Échec de la régénération.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mt-3 border-t border-slate-100 dark:border-slate-700 pt-3 space-y-2">
            <ChoiceButtons label="Registre" options={REGISTER_OPTIONS} value={registre} onChange={setRegistre} />
            <ChoiceButtons label="Temps" options={CONJUGATION_OPTIONS} value={conjugaison} onChange={setConjugaison} />
            <ChoiceButtons label="Négation" options={NEGATION_OPTIONS} value={negation} onChange={setNegation} />

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 mt-2">
                {stillGenerating ? (
                    <p className="text-sm text-amber-600 dark:text-amber-400">Conjugaisons en cours de génération…</p>
                ) : editing ? (
                    <div className="space-y-2">
                        <input
                            value={draftTerm}
                            onChange={(e) => setDraftTerm(e.target.value)}
                            placeholder="Mot en coréen"
                            className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 rounded-lg px-2 py-1 text-sm"
                        />
                        <input
                            value={draftPronunciation}
                            onChange={(e) => setDraftPronunciation(e.target.value)}
                            placeholder="Prononciation"
                            className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 rounded-lg px-2 py-1 text-sm"
                        />
                        <div className="flex gap-2">
                            <button
                                disabled={busy}
                                onClick={saveForm}
                                className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm font-medium"
                            >
                                <Check size={14} /> Enregistrer
                            </button>
                            <button onClick={() => setEditing(false)} className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-sm">
                                <X size={14} /> Annuler
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <p className="font-medium text-slate-800 dark:text-slate-100">{form?.term || word.term}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{form?.pronunciation || word.pronunciation}</p>
                        </div>
                        <button onClick={startEdit} aria-label="Corriger cette forme" className="p-2 text-slate-400 dark:text-slate-500 hover:text-emerald-600">
                            <Pencil size={16} />
                        </button>
                    </div>
                )}
            </div>

            {errorMsg && <p className="text-red-600 dark:text-red-400 text-sm">{errorMsg}</p>}

            <button
                disabled={busy}
                onClick={regenerateAll}
                className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 disabled:opacity-50"
            >
                <RefreshCw size={14} className={busy ? 'animate-spin' : ''} /> Régénérer toutes les conjugaisons
            </button>
        </div>
    );
}
