import { useRef, useState } from 'react';
import { ArrowLeft, Camera, Loader2, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { image } from '@appdeploy/client';
import {
    type Candidate,
    type CategorySummary,
    bulkAddWords,
    extractWordsFromImage,
    fetchCategories,
} from '../lib/api';
import { isVerbCategory } from '../lib/verbs';

type Step = 'select' | 'analyzing' | 'review' | 'saving' | 'done' | 'error';

interface EditableCandidate extends Candidate {
    include: boolean;
}

interface Props {
    onBack: () => void;
    onImported: () => void;
}

export function ImportPhoto({ onBack, onImported }: Props) {
    const [step, setStep] = useState<Step>('select');
    const [candidates, setCandidates] = useState<EditableCandidate[]>([]);
    const [categories, setCategories] = useState<CategorySummary[]>([]);
    const [errorMsg, setErrorMsg] = useState('');
    const [summary, setSummary] = useState<{ added: number; skipped: number } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        setStep('analyzing');
        setErrorMsg('');
        try {
            const prepared = await image.resizeIfNeeded(file);
            const [cats, result] = await Promise.all([
                fetchCategories().catch(() => [] as CategorySummary[]),
                extractWordsFromImage(prepared.data, prepared.mimeType),
            ]);
            setCategories(cats);
            setCandidates(result.map((c) => ({ ...c, include: !c.duplicate })));
            setStep('review');
        } catch {
            setErrorMsg('La lecture de la photo a échoué. Vérifie ta connexion et réessaie.');
            setStep('error');
        }
    };

    const updateCandidate = (i: number, patch: Partial<EditableCandidate>) => {
        setCandidates((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
    };

    const includesVerbs = candidates.some((c) => c.include && isVerbCategory(c.suggestedCategory));

    const submit = async () => {
        const entries = candidates
            .filter((c) => c.include && c.term.trim() && c.translation.trim() && c.suggestedCategory.trim())
            .map((c) => ({
                term: c.term.trim(),
                pronunciation: c.pronunciation.trim(),
                translation: c.translation.trim(),
                categoryName: c.suggestedCategory.trim(),
            }));
        if (!entries.length) return;
        setStep('saving');
        setErrorMsg('');
        try {
            const res = await bulkAddWords(entries);
            setSummary({ added: res.added.length, skipped: res.skipped.length });
            setStep('done');
        } catch {
            setErrorMsg("Échec de l'ajout des mots.");
            setStep('error');
        }
    };

    const includedCount = candidates.filter((c) => c.include).length;

    return (
        <div className="min-h-screen bg-white dark:bg-slate-900 px-4 py-6 pb-10">
            <header className="flex items-center gap-3 mb-6">
                <button onClick={onBack} aria-label="Retour" className="p-2 -ml-2 text-slate-600 dark:text-slate-300">
                    <ArrowLeft size={22} />
                </button>
                <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Ajouter des mots par photo</h1>
            </header>

            {step === 'select' && (
                <div className="flex flex-col items-center text-center gap-4 mt-10">
                    <Camera size={48} className="text-emerald-600 dark:text-emerald-400" />
                    <p className="text-slate-600 dark:text-slate-400 max-w-xs">
                        Prends en photo une page de ton livre. L'IA va lire les mots coréens, leur prononciation et leur
                        traduction, et repérer les doublons avant de les ajouter.
                    </p>
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFile(f);
                        }}
                    />
                    <button
                        onClick={() => inputRef.current?.click()}
                        className="bg-emerald-600 text-white px-6 py-3 rounded-full font-medium"
                    >
                        Choisir une photo
                    </button>
                </div>
            )}

            {step === 'analyzing' && (
                <div className="flex flex-col items-center gap-3 mt-16 text-slate-500 dark:text-slate-400">
                    <Loader2 className="animate-spin" size={32} />
                    <p>Analyse en cours…</p>
                </div>
            )}

            {step === 'saving' && (
                <div className="flex flex-col items-center gap-3 mt-16 text-slate-500 dark:text-slate-400 text-center px-6">
                    <Loader2 className="animate-spin" size={32} />
                    <p>Ajout en cours…</p>
                    {includesVerbs && (
                        <p className="text-xs max-w-xs">
                            Génération des conjugaisons pour les verbes — ça peut prendre quelques dizaines de secondes
                            pour plusieurs verbes.
                        </p>
                    )}
                </div>
            )}

            {step === 'error' && (
                <div className="flex flex-col items-center gap-3 mt-16 text-center">
                    <AlertTriangle className="text-red-500" size={32} />
                    <p className="text-red-600 dark:text-red-400">{errorMsg}</p>
                    <button
                        onClick={() => setStep('select')}
                        className="mt-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200"
                    >
                        Réessayer
                    </button>
                </div>
            )}

            {step === 'review' && (
                <div>
                    {candidates.length === 0 ? (
                        <div className="text-center mt-10">
                            <p className="text-slate-500 dark:text-slate-400 mb-4">Aucun mot n'a été reconnu sur cette photo.</p>
                            <button
                                onClick={() => setStep('select')}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200"
                            >
                                Réessayer avec une autre photo
                            </button>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                                {candidates.length} mot{candidates.length !== 1 ? 's' : ''} détecté
                                {candidates.length !== 1 ? 's' : ''}. Vérifie, corrige et choisis les mots à ajouter.
                            </p>
                            {includesVerbs && (
                                <p className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 rounded-lg p-2.5 mb-4">
                                    <Sparkles size={14} className="shrink-0 mt-0.5" />
                                    Pour les mots catégorisés « Verbes », les conjugaisons (registres, temps, négation)
                                    seront générées automatiquement à l'ajout.
                                </p>
                            )}
                            <ul className="space-y-3 mb-6">
                                {candidates.map((c, i) => (
                                    <li
                                        key={i}
                                        className={`border rounded-xl p-3 ${
                                            c.duplicate
                                                ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30'
                                                : 'border-slate-100 dark:border-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <input
                                                type="checkbox"
                                                checked={c.include}
                                                onChange={(e) => updateCandidate(i, { include: e.target.checked })}
                                                className="mt-2"
                                                aria-label={`Inclure ${c.term || 'ce mot'}`}
                                            />
                                            <div className="flex-1 space-y-1.5">
                                                {c.duplicate && (
                                                    <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                                        <AlertTriangle size={12} /> Existe déjà dans « {c.existingCategory} »
                                                    </p>
                                                )}
                                                <input
                                                    value={c.term}
                                                    onChange={(e) => updateCandidate(i, { term: e.target.value })}
                                                    className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-md px-2 py-1 text-sm font-medium"
                                                    placeholder="Mot coréen"
                                                />
                                                <input
                                                    value={c.pronunciation}
                                                    onChange={(e) => updateCandidate(i, { pronunciation: e.target.value })}
                                                    className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-md px-2 py-1 text-sm"
                                                    placeholder="Prononciation"
                                                />
                                                <input
                                                    value={c.translation}
                                                    onChange={(e) => updateCandidate(i, { translation: e.target.value })}
                                                    className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-md px-2 py-1 text-sm"
                                                    placeholder="Traduction"
                                                />
                                                <input
                                                    value={c.suggestedCategory}
                                                    onChange={(e) => updateCandidate(i, { suggestedCategory: e.target.value })}
                                                    list="categories-datalist"
                                                    className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-md px-2 py-1 text-sm"
                                                    placeholder="Catégorie"
                                                />
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <datalist id="categories-datalist">
                                {categories.map((c) => (
                                    <option key={c.slug} value={c.name} />
                                ))}
                            </datalist>
                            <button
                                onClick={submit}
                                disabled={includedCount === 0}
                                className="w-full bg-emerald-600 text-white rounded-lg py-3 font-medium disabled:opacity-50"
                            >
                                Ajouter {includedCount} mot{includedCount !== 1 ? 's' : ''}
                            </button>
                        </>
                    )}
                </div>
            )}

            {step === 'done' && summary && (
                <div className="flex flex-col items-center text-center gap-3 mt-16">
                    <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={40} />
                    <p className="text-slate-700 dark:text-slate-200 font-medium">
                        {summary.added} mot{summary.added !== 1 ? 's' : ''} ajouté{summary.added !== 1 ? 's' : ''} !
                    </p>
                    {summary.skipped > 0 && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {summary.skipped} ignoré{summary.skipped !== 1 ? 's' : ''}.
                        </p>
                    )}
                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={() => {
                                setStep('select');
                                setCandidates([]);
                                setSummary(null);
                            }}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200"
                        >
                            Ajouter une autre photo
                        </button>
                        <button onClick={onImported} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium">
                            Terminer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
