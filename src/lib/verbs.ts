export type Register = 'ultra-formel' | 'poli' | 'familier';
export type Conjugation = 'infinitif' | 'present' | 'passe' | 'futur';

export const DEFAULT_REGISTER: Register = 'poli';
export const DEFAULT_CONJUGATION: Conjugation = 'infinitif';

export const REGISTER_OPTIONS: Array<{ value: Register; label: string }> = [
    { value: 'ultra-formel', label: 'Ultra formel' },
    { value: 'poli', label: 'Poli' },
    { value: 'familier', label: 'Familier' },
];

export const CONJUGATION_OPTIONS: Array<{ value: Conjugation; label: string }> = [
    { value: 'infinitif', label: 'Infinitif' },
    { value: 'present', label: 'Présent' },
    { value: 'passe', label: 'Passé' },
    { value: 'futur', label: 'Futur' },
];

export function isVerbCategory(name: string): boolean {
    return name.trim().toLowerCase() === 'verbes';
}

export function registerLabel(value?: string): string {
    return REGISTER_OPTIONS.find((o) => o.value === value)?.label || REGISTER_OPTIONS[1].label;
}

export function conjugationLabel(value?: string): string {
    return CONJUGATION_OPTIONS.find((o) => o.value === value)?.label || CONJUGATION_OPTIONS[0].label;
}
