import { api } from '@appdeploy/client';

export function describeApiError(err: unknown, fallback: string): string {
    const e = err as
        | { response?: { data?: { error?: string }; status?: number }; data?: { error?: string }; message?: string }
        | undefined;
    const detail = e?.response?.data?.error ?? e?.data?.error;
    if (typeof detail === 'string' && detail.trim()) return `${fallback} : ${detail.trim()}`;
    const status = e?.response?.status;
    if (typeof e?.message === 'string' && e.message.trim()) return `${fallback} : ${e.message.trim()}`;
    if (typeof status === 'number') return `${fallback} (erreur ${status})`;
    return `${fallback}.`;
}

export interface CategorySummary {
    id: string;
    name: string;
    slug: string;
    count: number;
}

export interface VerbForm {
    term: string;
    pronunciation: string;
}

export interface ExampleSentence {
    term: string;
    pronunciation: string;
    translation: string;
}

export interface Word {
    id: string;
    term: string;
    pronunciation: string;
    translation: string;
    forms?: Record<string, VerbForm>;
    formsGeneratedAt?: number;
    example?: ExampleSentence | null;
}

export interface Candidate {
    term: string;
    pronunciation: string;
    translation: string;
    suggestedCategory: string;
    duplicate: boolean;
    existingCategory?: string;
}

export async function fetchCategories(): Promise<CategorySummary[]> {
    const { data } = await api.get('/api/categories');
    return data as CategorySummary[];
}

export async function resetAllData(): Promise<void> {
    await api.post('/api/reset', {});
}

export async function fetchWords(slug: string): Promise<Word[]> {
    const { data } = await api.get(`/api/words/${encodeURIComponent(slug)}`);
    return data.words as Word[];
}

export async function addWord(params: {
    categoryName: string;
    term: string;
    pronunciation: string;
    translation: string;
    force?: boolean;
}): Promise<{ duplicate: boolean; existingCategory?: string; word?: Word & { category: string; slug: string } }> {
    const { data } = await api.post('/api/words', params);
    return data;
}

export async function updateWord(
    slug: string,
    id: string,
    params: { term: string; pronunciation: string; translation: string }
): Promise<Word> {
    const { data } = await api.put(`/api/words/${encodeURIComponent(slug)}/${id}`, params);
    return data.word as Word;
}

export async function deleteWord(slug: string, id: string): Promise<void> {
    await api.delete(`/api/words/${encodeURIComponent(slug)}/${id}`);
}

export async function regenerateVerbForms(
    slug: string,
    id: string
): Promise<{ forms: Record<string, VerbForm>; formsGeneratedAt: number }> {
    const { data } = await api.post(`/api/words/${encodeURIComponent(slug)}/${id}/regenerate-forms`, {});
    return data;
}

export async function correctVerbForm(
    slug: string,
    id: string,
    params: { registre: string; conjugaison: string; negation: string; term: string; pronunciation: string }
): Promise<{ forms: Record<string, VerbForm> }> {
    const { data } = await api.put(`/api/words/${encodeURIComponent(slug)}/${id}/form`, params);
    return data;
}

export async function regenerateExample(slug: string, id: string): Promise<{ example: ExampleSentence | null }> {
    const { data } = await api.post(`/api/words/${encodeURIComponent(slug)}/${id}/regenerate-example`, {});
    return data;
}

export async function extractWordsFromImage(
    imageData: string,
    mimeType: string,
    categoryHint?: string
): Promise<Candidate[]> {
    const { data } = await api.post('/api/extract-words', { image: imageData, mimeType, categoryHint });
    return data.candidates as Candidate[];
}

export async function bulkAddWords(
    entries: Array<{ term: string; pronunciation: string; translation: string; categoryName: string }>
): Promise<{ added: Array<{ term: string; category: string }>; skipped: Array<{ term: string; reason: string }> }> {
    const { data } = await api.post('/api/words/bulk-add', { entries });
    return data;
}
