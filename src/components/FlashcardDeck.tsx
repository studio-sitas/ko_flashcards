import { useEffect, useRef, useState } from 'react';
import { Shuffle, ChevronLeft, ChevronRight, ArrowLeft, ListChecks } from 'lucide-react';
import type { Word } from '../lib/api';

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
    const startX = useRef(0);

    useEffect(() => {
        setOrder(words);
        setIndex(0);
        setFlipped(false);
    }, [words]);

    const goTo = (delta: number) => {
        setFlipped(false);
        setIndex((i) => {
            const next = i + delta;
            if (order.length === 0) return 0;
            if (next < 0) return order.length - 1;
            if (next >= order.length) return 0;
            return next;
        });
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') goTo(1);
            else if (e.key === 'ArrowLeft') goTo(-1);
            else if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setFlipped((f) => !f);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [order.length]);

    if (order.length === 0) {
        return (
            <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-50 to-white">
                <header className="flex items-center px-4 py-3">
                    <button onClick={onBack} aria-label="Retour au menu" className="p-2 -ml-2 text-slate-600">
                        <ArrowLeft size={22} />
                    </button>
                    <p className="font-semibold text-slate-800 ml-1">{categoryName}</p>
                </header>
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                    <p className="text-lg text-slate-600 mb-4">Aucun mot dans cette catégorie pour le moment.</p>
                    <button onClick={onManage} className="px-4 py-2 rounded-full bg-emerald-600 text-white font-medium">
                        Ajouter un mot
                    </button>
                </div>
            </div>
        );
    }

    const current = order[index];

    const handleStart = (clientX: number) => {
        startX.current = clientX;
        setDragging(true);
    };
    const handleMove = (clientX: number) => {
        if (!dragging) return;
        setDragX(clientX - startX.current);
    };
    const handleEnd = () => {
        if (Math.abs(dragX) > 80) goTo(dragX < 0 ? 1 : -1);
        setDragX(0);
        setDragging(false);
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-50 to-white">
            <header className="flex items-center justify-between px-4 py-3">
                <button onClick={onBack} aria-label="Retour au menu" className="p-2 -ml-2 text-slate-600">
                    <ArrowLeft size={22} />
                </button>
                <div className="text-center">
                    <p className="font-semibold text-slate-800">{categoryName}</p>
                    <p className="text-xs text-slate-500">
                        {index + 1} / {order.length}
                    </p>
                </div>
                <button
                    onClick={() => setOrder(shuffleArray(order))}
                    aria-label="Mélanger les cartes"
                    className="p-2 -mr-2 text-slate-600"
                >
                    <Shuffle size={20} />
                </button>
            </header>

            <div className="flex-1 flex items-center justify-center px-6 pb-6">
                <div
                    className="w-full max-w-sm select-none touch-pan-y"
                    style={{
                        transform: `translateX(${dragX}px) rotate(${dragX / 20}deg)`,
                        transition: dragging ? 'none' : 'transform 0.25s ease',
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
                            <div className="absolute inset-0 rounded-3xl bg-white shadow-xl border border-emerald-100 flex flex-col items-center justify-center gap-4 p-8 [backface-visibility:hidden]">
                                <p className="text-4xl font-bold text-slate-800 text-center break-words">{current.term}</p>
                                <p className="text-lg text-emerald-600">{current.pronunciation}</p>
                                <p className="text-xs text-slate-400 mt-6">Touche pour voir la traduction</p>
                            </div>
                            <div className="absolute inset-0 rounded-3xl bg-emerald-600 shadow-xl flex flex-col items-center justify-center gap-3 p-8 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                                <p className="text-3xl font-bold text-white text-center break-words">{current.translation}</p>
                                <p className="text-sm text-emerald-100">
                                    {current.term} · {current.pronunciation}
                                </p>
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-center gap-6 pb-8">
                <button
                    onClick={() => goTo(-1)}
                    aria-label="Mot précédent"
                    className="p-3 rounded-full bg-white shadow border border-slate-200 text-slate-700"
                >
                    <ChevronLeft />
                </button>
                <button onClick={onManage} className="flex items-center gap-1 text-sm text-slate-500 underline">
                    <ListChecks size={16} /> Gérer les mots
                </button>
                <button
                    onClick={() => goTo(1)}
                    aria-label="Mot suivant"
                    className="p-3 rounded-full bg-white shadow border border-slate-200 text-slate-700"
                >
                    <ChevronRight />
                </button>
            </div>
        </div>
    );
}
