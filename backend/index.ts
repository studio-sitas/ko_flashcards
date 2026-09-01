import { router, json, error, db, ai } from '@appdeploy/sdk';

interface CategoryRecord {
    name: string;
    slug: string;
    createdAt: number;
}

interface WordRecord {
    term: string;
    pronunciation: string;
    translation: string;
    createdAt: number;
    indexId?: string;
}

interface TermIndexRecord {
    term: string;
    normalized: string;
    slug: string;
    category: string;
    wordId: string;
    createdAt: number;
}

function slugify(name: string): string {
    const base = name
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-+|-+$)/g, '');
    return base || 'categorie';
}

function normalizeTerm(term: string): string {
    return term.trim().replace(/\s+/g, '');
}

function wordsTable(slug: string): string {
    return `words_${slug}`;
}

async function listCategoryRecords(): Promise<Array<CategoryRecord & { id: string }>> {
    const { items } = await db.list<CategoryRecord>('categories', { limit: 200 });
    return items;
}

async function getCategoryBySlug(slug: string): Promise<(CategoryRecord & { id: string }) | undefined> {
    const items = await listCategoryRecords();
    return items.find((c) => c.slug === slug);
}

async function ensureCategory(name: string): Promise<{ id: string; name: string; slug: string }> {
    const trimmed = name.trim();
    const slug = slugify(trimmed);
    const items = await listCategoryRecords();
    const existing = items.find((c) => c.slug === slug);
    if (existing) return { id: existing.id, name: existing.name, slug: existing.slug };
    const [id] = await db.add('categories', [{ name: trimmed, slug, createdAt: Date.now() }]);
    if (!id) throw new Error('create-category-failed');
    return { id, name: trimmed, slug };
}

async function loadTermIndex(): Promise<Array<TermIndexRecord & { id: string }>> {
    let items: Array<TermIndexRecord & { id: string }> = [];
    let nextToken: string | undefined;
    for (let i = 0; i < 5; i++) {
        const page = await db.list<TermIndexRecord>('term_index', { limit: 500, nextToken });
        items = items.concat(page.items);
        if (!page.nextToken) break;
        nextToken = page.nextToken;
    }
    return items;
}

async function addWordRecord(
    categoryName: string,
    term: string,
    pronunciation: string,
    translation: string
): Promise<{ id: string; category: { id: string; name: string; slug: string } }> {
    const category = await ensureCategory(categoryName);
    const createdAt = Date.now();
    const [wordId] = await db.add(wordsTable(category.slug), [{ term, pronunciation, translation, createdAt }]);
    if (!wordId) throw new Error('add-word-failed');
    const [indexId] = await db.add('term_index', [
        { term, normalized: normalizeTerm(term), slug: category.slug, category: category.name, wordId, createdAt },
    ]);
    if (indexId) {
        await db.update(wordsTable(category.slug), [
            { id: wordId, record: { term, pronunciation, translation, createdAt, indexId } },
        ]);
    }
    return { id: wordId, category };
}

export const handler = router({
    'GET /api/_healthcheck': [async () => json({ message: 'Success' })],

    'GET /api/categories': [
        async () => {
            const categories = await listCategoryRecords();
            const withCounts = await Promise.all(
                categories.map(async (c) => {
                    const { items } = await db.list(wordsTable(c.slug), { limit: 1000 });
                    return { id: c.id, name: c.name, slug: c.slug, count: items.length };
                })
            );
            withCounts.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
            return json(withCounts);
        },
    ],

    'POST /api/categories': [
        async ({ body }) => {
            const b = (body || {}) as { name?: string };
            const name = (b.name || '').trim();
            if (!name) return error('Le nom de la catégorie est requis', 400);
            const category = await ensureCategory(name);
            return json({ category });
        },
    ],

    'DELETE /api/categories/:slug': [
        async ({ params }) => {
            const cat = await getCategoryBySlug(params.slug);
            if (!cat) return error('Catégorie introuvable', 404);
            const { items: words } = await db.list<WordRecord>(wordsTable(params.slug), { limit: 1000 });
            const indexIds = words.map((w) => w.indexId).filter((v): v is string => !!v);
            if (indexIds.length) await db.delete('term_index', indexIds);
            const wordIds = words.map((w) => (w as unknown as { id: string }).id);
            if (wordIds.length) await db.delete(wordsTable(params.slug), wordIds);
            await db.delete('categories', [cat.id]);
            return json({ deleted: true });
        },
    ],

    'GET /api/words/:slug': [
        async ({ params }) => {
            const { items } = await db.list<WordRecord>(wordsTable(params.slug), { limit: 1000 });
            const sorted = [...items].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            return json({ words: sorted });
        },
    ],

    'POST /api/words': [
        async ({ body }) => {
            const b = (body || {}) as {
                categoryName?: string;
                term?: string;
                pronunciation?: string;
                translation?: string;
                force?: boolean;
            };
            const term = (b.term || '').trim();
            const translation = (b.translation || '').trim();
            const categoryName = (b.categoryName || '').trim();
            const pronunciation = (b.pronunciation || '').trim();
            if (!term || !translation || !categoryName) {
                return error('Le mot, la traduction et la catégorie sont requis', 400);
            }
            if (!b.force) {
                const normalized = normalizeTerm(term);
                const index = await loadTermIndex();
                const dup = index.find((i) => i.normalized === normalized);
                if (dup) return json({ duplicate: true, existingCategory: dup.category });
            }
            const { id, category } = await addWordRecord(categoryName, term, pronunciation, translation);
            return json({
                duplicate: false,
                word: { id, term, pronunciation, translation, category: category.name, slug: category.slug },
            });
        },
    ],

    'PUT /api/words/:slug/:id': [
        async ({ params, body }) => {
            const b = (body || {}) as { term?: string; pronunciation?: string; translation?: string };
            const [existing] = await db.get<WordRecord>(wordsTable(params.slug), [params.id]);
            if (!existing) return error('Mot introuvable', 404);
            const term = (b.term ?? existing.term).trim();
            const pronunciation = (b.pronunciation ?? existing.pronunciation ?? '').trim();
            const translation = (b.translation ?? existing.translation).trim();
            if (!term || !translation) return error('Le mot et la traduction sont requis', 400);
            const [ok] = await db.update(wordsTable(params.slug), [
                { id: params.id, record: { ...existing, term, pronunciation, translation } },
            ]);
            if (!ok) return error('Échec de la mise à jour', 500);
            if (existing.indexId) {
                const cat = await getCategoryBySlug(params.slug);
                await db.update('term_index', [
                    {
                        id: existing.indexId,
                        record: {
                            term,
                            normalized: normalizeTerm(term),
                            slug: params.slug,
                            category: cat ? cat.name : params.slug,
                            wordId: params.id,
                            createdAt: existing.createdAt || Date.now(),
                        },
                    },
                ]);
            }
            return json({ word: { id: params.id, term, pronunciation, translation } });
        },
    ],

    'DELETE /api/words/:slug/:id': [
        async ({ params }) => {
            const [existing] = await db.get<WordRecord>(wordsTable(params.slug), [params.id]);
            if (existing && existing.indexId) {
                await db.delete('term_index', [existing.indexId]);
            }
            const [ok] = await db.delete(wordsTable(params.slug), [params.id]);
            if (!ok) return error('Échec de la suppression', 500);
            return json({ deleted: true });
        },
    ],

    'POST /api/extract-words': [
        async ({ body }) => {
            const b = (body || {}) as { image?: string; mimeType?: string; categoryHint?: string };
            if (!b.image || !b.mimeType) return error('Image manquante', 400);
            let result;
            try {
                result = await ai.extract({
                    system:
                        "Tu es un assistant qui aide un francophone à réviser le coréen à partir de photos de manuel scolaire.",
                    prompt:
                        "Cette image est une page de manuel de coréen contenant un lexique organisé en tableau ou en colonnes. Chaque ligne comporte : le mot en hangeul (coréen), sa romanisation/prononciation, et sa traduction en français. Le lexique peut être découpé en sections avec des titres comme \"Noms\", \"Verbes\", \"Particules\", \"Adjectifs\" : utilise le titre de la section la plus proche au-dessus de chaque ligne comme catégorie suggérée (recopie ce titre en français, par exemple \"Noms\", \"Verbes\", \"Particules\", \"Adjectifs\"). S'il n'y a aucun titre de section identifiable pour un mot, mets \"Autre\" comme catégorie." +
                        (b.categoryHint
                            ? ` Si aucune section n'est identifiable pour un mot, utilise plutôt "${b.categoryHint}" comme catégorie suggérée.`
                            : '') +
                        " Extrais TOUTES les lignes de vocabulaire visibles sur l'image. Ignore les titres de module, numéros de page et consignes d'exercice.",
                    images: [{ data: b.image, mimeType: b.mimeType }],
                    schema: {
                        type: 'object',
                        properties: {
                            words: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        term: { type: 'string' },
                                        pronunciation: { type: 'string' },
                                        translation: { type: 'string' },
                                        suggestedCategory: { type: 'string' },
                                    },
                                    required: ['term', 'translation'],
                                },
                            },
                        },
                        required: ['words'],
                    },
                    maxTokens: 4096,
                    thinkingMode: 'FAST',
                });
            } catch (err) {
                const rpcError = err as { statusCode?: number; responseText?: string };
                if (rpcError && rpcError.statusCode != null) {
                    return error(`Échec de l'analyse de l'image (${rpcError.statusCode})`, 502);
                }
                return error("Échec de l'analyse de l'image", 500);
            }
            const data = (result.data || {}) as {
                words?: Array<{ term?: string; pronunciation?: string; translation?: string; suggestedCategory?: string }>;
            };
            const rawWords = Array.isArray(data.words) ? data.words : [];
            const index = await loadTermIndex();
            const candidates = rawWords
                .map((w) => ({
                    term: (w.term || '').trim(),
                    pronunciation: (w.pronunciation || '').trim(),
                    translation: (w.translation || '').trim(),
                    suggestedCategory: (w.suggestedCategory || b.categoryHint || 'Autre').trim(),
                }))
                .filter((w) => w.term && w.translation)
                .map((w) => {
                    const normalized = normalizeTerm(w.term);
                    const dup = index.find((i) => i.normalized === normalized);
                    return { ...w, duplicate: !!dup, existingCategory: dup ? dup.category : undefined };
                });
            return json({ candidates });
        },
    ],

    'POST /api/words/bulk-add': [
        async ({ body }) => {
            const b = (body || {}) as {
                entries?: Array<{ term?: string; pronunciation?: string; translation?: string; categoryName?: string }>;
            };
            const entries = Array.isArray(b.entries) ? b.entries : [];
            if (!entries.length) return error('Aucun mot à ajouter', 400);
            const added: Array<{ term: string; category: string }> = [];
            const skipped: Array<{ term: string; reason: string }> = [];
            for (const e of entries) {
                const term = (e.term || '').trim();
                const translation = (e.translation || '').trim();
                const categoryName = (e.categoryName || '').trim();
                const pronunciation = (e.pronunciation || '').trim();
                if (!term || !translation || !categoryName) {
                    skipped.push({ term: term || '(vide)', reason: 'incomplet' });
                    continue;
                }
                try {
                    const { category } = await addWordRecord(categoryName, term, pronunciation, translation);
                    added.push({ term, category: category.name });
                } catch {
                    skipped.push({ term, reason: 'échec' });
                }
            }
            return json({ added, skipped });
        },
    ],
});
