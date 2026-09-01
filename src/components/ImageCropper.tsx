import { useEffect, useRef, useState } from 'react';

interface CropRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

interface Props {
    src: string;
    naturalWidth: number;
    naturalHeight: number;
    onConfirm: (result: { dataUrl: string; mimeType: string }) => void;
    onCancel: () => void;
}

const MIN_SIZE = 32;
const MAX_UPLOAD_DIMENSION = 1600;
const MAX_UPLOAD_PIXELS = 2_000_000;

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se';

export function ImageCropper({ src, naturalWidth, naturalHeight, onConfirm, onCancel }: Props) {
    const imgRef = useRef<HTMLImageElement>(null);
    const [rendered, setRendered] = useState<{ w: number; h: number } | null>(null);
    const [crop, setCrop] = useState<CropRect | null>(null);

    useEffect(() => {
        const el = imgRef.current;
        const measure = () => {
            if (!el || !el.clientWidth || !el.clientHeight) return;
            setRendered({ w: el.clientWidth, h: el.clientHeight });
            setCrop({ x: 0, y: 0, w: el.clientWidth, h: el.clientHeight });
        };
        if (el?.complete) measure();
        el?.addEventListener('load', measure);
        window.addEventListener('resize', measure);
        return () => {
            el?.removeEventListener('load', measure);
            window.removeEventListener('resize', measure);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);

    const clamp = (r: CropRect, bounds: { w: number; h: number }): CropRect => {
        let { x, y, w, h } = r;
        w = Math.max(MIN_SIZE, Math.min(w, bounds.w));
        h = Math.max(MIN_SIZE, Math.min(h, bounds.h));
        x = Math.max(0, Math.min(x, bounds.w - w));
        y = Math.max(0, Math.min(y, bounds.h - h));
        return { x, y, w, h };
    };

    const startDrag = (mode: DragMode) => (e: React.PointerEvent) => {
        if (!crop || !rendered) return;
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const start = crop;
        const bounds = rendered;
        const handleMove = (ev: PointerEvent) => {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;
            const next = { ...start };
            if (mode === 'move') {
                next.x = start.x + dx;
                next.y = start.y + dy;
            } else {
                if (mode.includes('n')) {
                    next.y = start.y + dy;
                    next.h = start.h - dy;
                }
                if (mode.includes('s')) next.h = start.h + dy;
                if (mode.includes('w')) {
                    next.x = start.x + dx;
                    next.w = start.w - dx;
                }
                if (mode.includes('e')) next.w = start.w + dx;
            }
            setCrop(clamp(next, bounds));
        };
        const handleUp = () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
        };
        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
    };

    const reset = () => {
        if (rendered) setCrop({ x: 0, y: 0, w: rendered.w, h: rendered.h });
    };

    const confirm = () => {
        if (!crop || !rendered) return;
        const scaleX = naturalWidth / rendered.w;
        const scaleY = naturalHeight / rendered.h;
        const sx = crop.x * scaleX;
        const sy = crop.y * scaleY;
        const sw = crop.w * scaleX;
        const sh = crop.h * scaleY;

        let outW = sw;
        let outH = sh;
        const dimScale = Math.min(1, MAX_UPLOAD_DIMENSION / Math.max(outW, outH));
        outW *= dimScale;
        outH *= dimScale;
        const pixelScale = Math.min(1, Math.sqrt(MAX_UPLOAD_PIXELS / (outW * outH)));
        outW = Math.max(1, Math.round(outW * pixelScale));
        outH = Math.max(1, Math.round(outH * pixelScale));

        const source = imgRef.current;
        if (!source) return;
        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(source, sx, sy, sw, sh, 0, 0, outW, outH);
        onConfirm({ dataUrl: canvas.toDataURL('image/jpeg', 0.85), mimeType: 'image/jpeg' });
    };

    return (
        <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                Ajuste la zone à analyser si besoin (utile pour exclure du texte indésirable), puis valide.
            </p>
            <div
                className="relative mx-auto max-h-[60vh] overflow-auto border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-800"
                style={{ touchAction: 'none' }}
            >
                <div className="relative inline-block">
                    <img
                        ref={imgRef}
                        src={src}
                        alt="Photo à recadrer"
                        className="block max-w-full select-none"
                        draggable={false}
                    />
                    {crop && rendered && (
                        <div
                            onPointerDown={startDrag('move')}
                            className="absolute border-2 border-emerald-400 cursor-move"
                            style={{
                                left: crop.x,
                                top: crop.y,
                                width: crop.w,
                                height: crop.h,
                                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                                touchAction: 'none',
                            }}
                        >
                            {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
                                <div
                                    key={corner}
                                    onPointerDown={startDrag(corner)}
                                    style={{ touchAction: 'none' }}
                                    className={`absolute w-6 h-6 bg-emerald-400 rounded-full border-2 border-white ${
                                        corner === 'nw'
                                            ? '-left-3 -top-3 cursor-nwse-resize'
                                            : corner === 'ne'
                                              ? '-right-3 -top-3 cursor-nesw-resize'
                                              : corner === 'sw'
                                                ? '-left-3 -bottom-3 cursor-nesw-resize'
                                                : '-right-3 -bottom-3 cursor-nwse-resize'
                                    }`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex gap-2 mt-4">
                <button
                    onClick={onCancel}
                    className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 text-sm"
                >
                    Annuler
                </button>
                <button
                    onClick={reset}
                    className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 text-sm"
                >
                    Image entière
                </button>
                <button onClick={confirm} className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg font-medium text-sm">
                    Valider
                </button>
            </div>
        </div>
    );
}
