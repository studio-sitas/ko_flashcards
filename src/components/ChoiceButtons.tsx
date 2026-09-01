interface Option<T extends string> {
    value: T;
    label: string;
}

interface Props<T extends string> {
    label: string;
    options: Array<Option<T>>;
    value: T;
    onChange: (value: T) => void;
}

export function ChoiceButtons<T extends string>({ label, options, value, onChange }: Props<T>) {
    return (
        <div>
            <p className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-1.5">{label}</p>
            <div className="flex flex-wrap gap-1.5">
                {options.map((o) => (
                    <button
                        key={o.value}
                        type="button"
                        onClick={() => onChange(o.value)}
                        aria-pressed={value === o.value}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                            value === o.value
                                ? 'bg-gold-600 border-gold-600 text-white'
                                : 'bg-white dark:bg-ink border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                        }`}
                    >
                        {o.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
