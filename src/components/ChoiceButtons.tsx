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
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1.5">{label}</p>
            <div className="flex flex-wrap gap-1.5">
                {options.map((o) => (
                    <button
                        key={o.value}
                        type="button"
                        onClick={() => onChange(o.value)}
                        aria-pressed={value === o.value}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                            value === o.value
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                        }`}
                    >
                        {o.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
