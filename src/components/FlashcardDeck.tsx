import { useEffect, useRef, useState } from 'react';
import { Shuffle, ChevronLeft, ChevronRight, ArrowLeft, ListChecks } from 'lucide-react';
import type { Word } from '../lib/api';
import {
    CONJUGATION_OPTIONS,
    DEFAULT_CONJUGATION,
    DEFAULT_NEGATION,
    DEFAULT_REGISTER,
    NEGATION_OPTIONS,
    REGISTER_OPTIONS,
    formKey,
    isVerbCategory,
    type Conjugation,
    type Negation,
    type Register,
} from '../lib/verbs';
import { ChoiceButtons } from './ChoiceButtons';

const SWIPE_THRESHOLD = 80;
const EXIT_DISTANCE = 480;
const TRANSITION_MS = 240;

function shuffleArray<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

interface Props {
    words: Word[];
    categoryName: string;
    onBack: () => void;
    onManage: () => void;
}

export function FlashcardDeck({ words, categoryName, onBack, onManage }: Props) {
    const [order, setOrder] = useState<Word[]>(words);
    const [index, setIndex] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [dragX, setDragX] = useState(0);
    const [dragging, setDragging] = useState(false);
    const [animating, setAnimating] = useState(false);
    const [instant, setInstant] = useState(false);
    const [registre, setRegistre] = useState<Register>(DEFAULT_REGISTER);
    const [conjugaison, setConjugaison] = useState<Conjugation>(DEFAULT_CONJUGATION);
    const [negation, setNegation] = useState<Negation>(DEFAULT_NEGATION);
    const startX = useRef(0);
    const orderRef = useRef(order);
    orderRef.current = order;

    useEffect(() => {
        setOrder(words);
        setIndex(0);
        setFlipped(false);
        setDragX(0);
        setAnimating(false);
        setInstant(false);
    }, [words]);

    const changeCard = (delta: number) => {
        if (animating || orderRef.current.length === 0) return;
        setAnimating(true);
        setInstant(false);
        const exitX = delta > 0 ? -EXIT_DISTANCE : EXIT_DISTANCE;
        setDragX(exitX);
        window.setTimeout(() => {
            setFlipped(false);
            setIndex((i) => {
                const len = orderRef.current.length;
                if (len === 0) return 0;
                const next = i + delta;
                if (next < 0) return len - 1;
                if (next >= len) return 0;
                return next;
            });
            setInstant(true);
            setDragX(-exitX);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setInstant(false);
                    setDragX(0);
                    window.setTimeout(() => setAnimating(false), TRANSITION_MS);
                });
            });
        }, TRANSITION_MS);
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') changeCard(1);
            else if (e.key === 'ArrowLeft') changeCard(-1);
            else if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setFlipped((f) => !f);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [animating]);

    if (order.length === 0) {
        return (
            <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-50 to-white dark:from-slate-900 dark:to-slate-900">
                <header className="flex items-center px-4 py-3">
                    <button onClick={onBack} aria-label="Retour au menu" className="p-2 -ml-2 text-slate-600 dark:text-slate-300">
                        <ArrowLeft size={22} />
                    </button>
                    <p className="font-semibold text-slate-800 dark:text-slate-100 ml-1">{categoryName}</p>
                </header>
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                    <p className="text-lg text-slate-600 dark:text-slate-300 mb-4">
                        Aucun mot dans cette catégorie pour le moment.
                    </p>
                    <button onClick={onManage} className="px-4 py-2 rounded-full bg-emerald-600 text-white font-medium">
                        Ajouter un mot
                    </button>
                </div>
            </div>
        );
    }

    const current = order[index];
    const isVerbs = isVerbCategory(categoryName);
    const form = isVerbs ? current.forms?.[formKey(registre, conjugaison, negation)] : undefined;
    const displayTerm = form?.term || current.term;
    const displayPronunciation = form?.pronunciation || current.pronunciation;
    const stillGenerating = isVerbs && !current.forms;

    const handleStart = (clientX: number) => {
        if (animating) return;
        startX.current = clientX;
        setDragging(true);
    };
    const handleMove = (clientX: number) => {
        if (!dragging || animating) return;
        setDragX(clientX - startX.current);
    };
    const handleEnd = () => {
        if (!dragging) return;
        setDragging(false);
        if (animating) return;
        if (Math.abs(dragX) > SWIPE_THRESHOLD) {
            changeCard(dragX < 0 ? 1 : -1);
        } else {
            setDragX(0);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-50 to-white dark:from-slate-900 dark:to-slate-900">
            <header className="flex items-center justify-between px-4 py-3">
                <button onClick={onBack} aria-label="Retour au menu" className="p-2 -ml-2 text-slate-600 dark:text-slate-300">
                    <ArrowLeft size={22} />
                </button>
                <div className="text-center">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{categoryName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {index + 1} / {order.length}
                    </p>
                </div>
                <button
                    onClick={() => setOrder(shuffleArray(order))}
                    aria-label="Mélanger les cartes"
                    className="p-2 -mr-2 text-slate-600 dark:text-slate-300"
                >
                    <Shuffle size={20} />
                </button>
            </header>

            <div className="flex-1 flex items-center justify-center px-6 pb-2 overflow-hidden">
                <div
                    className="w-full max-w-sm select-none touch-pan-y"
                    style={{
                        transform: `translateX(${dragX}px) rotate(${dragX / 20}deg)`,
                        transition:
                            dragging || instant ? 'none' : `transform ${TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                    }}
                    onMouseDown={(e) => handleStart(e.clientX)}
                    onMouseMove={(e) => handleMove(e.clientX)}
                    onMouseUp={handleEnd}
                    onMouseLeave={() => dragging && handleEnd()}
                    onTouchStart={(e) => handleStart(e.touches[0].clientX)}
                    onTouchMove={(e) => handleMove(e.touches[0].clientX)}
                    onTouchEnd={handleEnd}
                >
                    <button
                        type="button"
                        onClick={() => setFlipped((f) => !f)}
                        className="w-full aspect-[3/4] [perspective:1200px] block"
                        aria-label="Retourner la carte pour voir la traduction"
                    >
                        <div
                            className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d]"
                            style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                        >
                            <div className="absolute inset-0 rounded-3xl bg-white dark:bg-slate-800 shadow-xl border border-emerald-100 dark:border-slate-700 flex flex-col items-center justify-center gap-3 p-8 [backface-visibility:hidden]">
                                <p className="text-4xl font-bold text-slate-800 dark:text-slate-100 text-center break-words">
                                    {displayTerm}
                                </p>
                                <p className="text-lg text-emerald-600 dark:text-emerald-400">{displayPronunciation}</p>
                                {stillGenerating && (
                                    <p className="text-xs text-amber-600 dark:text-amber-400">
                                        Conjugaisons en cours de génération…
                                    </p>
                                )}
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">Touche pour voir la traduction</p>
                            </div>
                            <div className="absolute inset-0 rounded-3xl bg-emerald-600 dark:bg-emerald-700 shadow-xl flex flex-col items-center justify-center gap-3 p-8 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                                <p className="text-3xl font-bold text-white text-center break-words">
                                    {current.translation}
                                    {isVerbs && negation === 'negatif' ? ' (négatif)' : ''}
                                </p>
                                <p className="text-sm text-emerald-100">
                                    {displayTerm} · {displayPronunciation}
                                </p>
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            {isVerbs && (
                <div className="px-6 pb-2 max-w-sm mx-auto w-full space-y-2">
                    <ChoiceButtons label="Registre" options={REGISTER_OPTIONS} value={registre} onChange={setRegistre} />
                    <ChoiceButtons label="Temps" options={CONJUGATION_OPTIONS} value={conjugaison} onChange={setConjugaison} />
                    <ChoiceButtons label="Négation" options={NEGATION_OPTIONS} value={negation} onChange={setNegation} />
                </div>
            )}

            <div className="flex items-center justify-center gap-6 py-6">
                <button
                    onClick={() => changeCard(-1)}
                    aria-label="Mot précédent"
                    className="p-3 rounded-full bg-white dark:bg-slate-800 shadow border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                >
                    <ChevronLeft />
                </button>
                <button onClick={onManage} className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 underline">
                    <ListChecks size={16} /> Gérer les mots
                </button>
                <button
                    onClick={() => changeCard(1)}
                    aria-label="Mot suivant"
                    className="p-3 rounded-full bg-white dark:bg-slate-800 shadow border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                >
                    <ChevronRight />
                </button>
            </div>
        </div>
    );
}
