import { router, json, error, db, ai } from '@appdeploy/sdk';

const REGISTERS = ['ultra-formel', 'poli', 'familier'] as const;
const CONJUGATIONS = ['infinitif', 'present', 'passe', 'futur'] as const;
const NEGATIONS = ['affirmatif', 'negatif'] as const;

// Basé sur les 9 classes grammaticales traditionnelles du coréen (품사),
// plus deux catégories pratiques (Expressions, Autre) qui ne sont pas des
// classes grammaticales à proprement parler mais utiles pour un lexique.
const FIXED_CATEGORIES: Array<{ name: string; slug: string }> = [
    { name: 'Noms', slug: 'noms' }, // 명사
    { name: 'Pronoms', slug: 'pronoms' }, // 대명사
    { name: 'Numéraux', slug: 'numeraux' }, // 수사 (chiffres et nombres coréens)
    { name: 'Verbes', slug: 'verbes' }, // 동사
    { name: 'Adjectifs', slug: 'adjectifs' }, // 형용사
    { name: 'Déterminants', slug: 'determinants' }, // 관형사
    { name: 'Adverbes', slug: 'adverbes' }, // 부사
    { name: 'Particules', slug: 'particules' }, // 조사
    { name: 'Interjections', slug: 'interjections' }, // 감탄사
    { name: 'Expressions', slug: 'expressions' },
    { name: 'Autre', slug: 'autre' },
];

interface VerbFormValue {
    term: string;
    pronunciation: string;
}

interface ExampleSentence {
    term: string;
    pronunciation: string;
    translation: string;
}

interface WordRecord {
    term: string;
    pronunciation: string;
    translation: string;
    createdAt: number;
    indexId?: string;
    forms?: Record<string, VerbFormValue>;
    formsGeneratedAt?: number;
    example?: ExampleSentence | null;
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
    return base || 'autre';
}

function resolveCategory(nameInput: string): { name: string; slug: string } {
    const normalized = slugify(nameInput);
    return FIXED_CATEGORIES.find((c) => c.slug === normalized) || FIXED_CATEGORIES[FIXED_CATEGORIES.length - 1];
}

function getFixedCategoryBySlug(slug: string): { name: string; slug: string } | undefined {
    return FIXED_CATEGORIES.find((c) => c.slug === slug);
}

function normalizeTerm(term: string): string {
    return term.trim().replace(/\s+/g, '');
}

function wordsTable(slug: string): string {
    return `words_${slug}`;
}

function isVerbsCategoryName(name: string): boolean {
    return name.trim().toLowerCase() === 'verbes';
}

function formKey(registre: string, conjugaison: string, negation: string): string {
    return `${registre}|${conjugaison}|${negation}`;
}

async function generateVerbForms(term: string, translation: string): Promise<Record<string, VerbFormValue>> {
    let result;
    try {
        result = await ai.extract({
            system:
                "Tu es un expert en grammaire coréenne qui aide un francophone à réviser la conjugaison des verbes.",
            prompt:
                `Le verbe coréen "${term}" (forme au dictionnaire / infinitif) signifie "${translation}" en français. ` +
                "Conjugue-le pour TOUTES les combinaisons de registre (ultra-formel, poli, familier), de temps (infinitif, présent, passé, futur) et de négation (affirmatif, négatif), soit 24 formes au total. " +
                "Pour le temps \"infinitif\", la forme ne varie pas selon le registre (répète la même forme du dictionnaire pour les 3 registres), seule la négation la fait changer. " +
                "Pour les temps présent/passé/futur, applique correctement les règles de conjugaison coréenne (terminaisons de politesse, verbes réguliers et irréguliers, règles de batchim) pour chaque registre et pour la négation (utilise la forme négative la plus naturelle et la plus courante). " +
                "Donne pour chaque forme le mot en hangeul et sa romanisation phonétique simple, lisible par un francophone.",
            schema: {
                type: 'object',
                properties: {
                    forms: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                registre: { type: 'string', enum: [...REGISTERS] },
                                conjugaison: { type: 'string', enum: [...CONJUGATIONS] },
                                negation: { type: 'string', enum: [...NEGATIONS] },
                                term: { type: 'string' },
                                pronunciation: { type: 'string' },
                            },
                            required: ['registre', 'conjugaison', 'negation', 'term', 'pronunciation'],
                        },
                    },
                },
                required: ['forms'],
            },
            maxTokens: 4096,
            thinkingMode: 'FAST',
        });
    } catch {
        return {};
    }
    const data = (result.data || {}) as {
        forms?: Array<{ registre?: string; conjugaison?: string; negation?: string; term?: string; pronunciation?: string }>;
    };
    const raw = Array.isArray(data.forms) ? data.forms : [];
    const map: Record<string, VerbFormValue> = {};
    for (const f of raw) {
        if (!f.registre || !f.conjugaison || !f.negation || !f.term) continue;
        map[formKey(f.registre, f.conjugaison, f.negation)] = {
            term: f.term.trim(),
            pronunciation: (f.pronunciation || '').trim(),
        };
    }
    return map;
}

async function generateExampleSentence(
    term: string,
    translation: string,
    categoryName: string
): Promise<ExampleSentence | null> {
    let result;
    try {
        result = await ai.extract({
            system: "Tu es un assistant qui aide un francophone à apprendre le coréen avec des phrases d'exemple simples.",
            prompt:
                `Le mot coréen "${term}" (catégorie : ${categoryName}) signifie "${translation}" en français. ` +
                "Rédige UNE phrase courte et naturelle en coréen, de niveau débutant à intermédiaire, qui utilise ce mot. " +
                "Donne la phrase en hangeul, sa romanisation phonétique simple lisible par un francophone, et sa traduction en français.",
            schema: {
                type: 'object',
                properties: {
                    term: { type: 'string' },
                    pronunciation: { type: 'string' },
                    translation: { type: 'string' },
                },
                required: ['term', 'translation'],
            },
            maxTokens: 512,
            thinkingMode: 'FAST',
        });
    } catch {
        return null;
    }
    const data = (result.data || {}) as { term?: string; pronunciation?: string; translation?: string };
    if (!data.term || !data.translation) return null;
    return {
        term: data.term.trim(),
        pronunciation: (data.pronunciation || '').trim(),
        translation: data.translation.trim(),
    };
}

// Runs `fn` over `items` with at most `concurrency` in flight at once. Used for
// the per-word AI calls (verb forms / example sentences) so that importing or
// opening a category with many words doesn't run them one-by-one — sequential
// AI calls for 5+ words routinely exceeded the request timeout and surfaced as
// a network error on the client.
async function mapWithConcurrency<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let next = 0;
    async function worker() {
        while (next < items.length) {
            const i = next++;
            results[i] = await fn(items[i]);
        }
    }
    const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, () => worker());
    await Promise.all(workers);
    return results;
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
): Promise<{ id: string; category: { name: string; slug: string } }> {
    const category = resolveCategory(categoryName);
    const createdAt = Date.now();
    const [wordId] = await db.add(wordsTable(category.slug), [{ term, pronunciation, translation, createdAt }]);
    if (!wordId) throw new Error('add-word-failed');
    const [indexId] = await db.add('term_index', [
        { term, normalized: normalizeTerm(term), slug: category.slug, category: category.name, wordId, createdAt },
    ]);
    const record: Record<string, unknown> = { term, pronunciation, translation, createdAt };
    if (indexId) record.indexId = indexId;
    if (isVerbsCategoryName(category.name)) {
        record.forms = await generateVerbForms(term, translation);
        record.formsGeneratedAt = Date.now();
    }
    record.example = await generateExampleSentence(term, translation, category.name);
    await db.update(wordsTable(category.slug), [{ id: wordId, record }]);
    return { id: wordId, category };
}

export const handler = router({
    'GET /api/_healthcheck': [async () => json({ message: 'Success' })],

    'GET /api/categories': [
        async () => {
            const withCounts = await Promise.all(
                FIXED_CATEGORIES.map(async (c) => {
                    const { items } = await db.list(wordsTable(c.slug), { limit: 1000 });
                    return { id: c.slug, name: c.name, slug: c.slug, count: items.length };
                })
            );
            return json(withCounts);
        },
    ],

    'POST /api/reset': [
        async () => {
            for (const cat of FIXED_CATEGORIES) {
                const { items } = await db.list(wordsTable(cat.slug), { limit: 1000 });
                const ids = items.map((w) => (w as unknown as { id: string }).id);
                if (ids.length) await db.delete(wordsTable(cat.slug), ids);
            }
            let nextToken: string | undefined;
            for (let i = 0; i < 20; i++) {
                const page = await db.list('term_index', { limit: 500, nextToken });
                const ids = page.items.map((w) => (w as unknown as { id: string }).id);
                if (ids.length) await db.delete('term_index', ids);
                if (!page.nextToken) break;
                nextToken = page.nextToken;
            }
            return json({ reset: true });
        },
    ],

    'GET /api/words/:slug': [
        async ({ params }) => {
            const cat = getFixedCategoryBySlug(params.slug);
            const isVerbs = cat ? isVerbsCategoryName(cat.name) : false;
            const categoryName = cat ? cat.name : params.slug;
            const { items } = await db.list<WordRecord>(wordsTable(params.slug), { limit: 1000 });
            const withDefaults = await mapWithConcurrency(items, 6, async (item) => {
                const { id, ...rest } = item as WordRecord & { id: string };
                let forms = rest.forms;
                let formsGeneratedAt = rest.formsGeneratedAt;
                let example = rest.example;
                let needsUpdate = false;
                if (isVerbs && !forms) {
                    forms = await generateVerbForms(rest.term, rest.translation);
                    formsGeneratedAt = Date.now();
                    needsUpdate = true;
                }
                if (!example) {
                    example = await generateExampleSentence(rest.term, rest.translation, categoryName);
                    needsUpdate = true;
                }
                if (needsUpdate) {
                    await db.update(wordsTable(params.slug), [{ id, record: { ...rest, forms, formsGeneratedAt, example } }]);
                }
                return { id, ...rest, forms: forms || {}, formsGeneratedAt, example };
            });
            const sorted = [...withDefaults].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
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
            const [saved] = await db.get<WordRecord>(wordsTable(category.slug), [id]);
            return json({
                duplicate: false,
                word: {
                    id,
                    term,
                    pronunciation,
                    translation,
                    forms: saved?.forms || {},
                    formsGeneratedAt: saved?.formsGeneratedAt,
                    example: saved?.example,
                    category: category.name,
                    slug: category.slug,
                },
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
            const cat = getFixedCategoryBySlug(params.slug);
            const categoryName = cat ? cat.name : params.slug;
            const isVerbs = isVerbsCategoryName(categoryName);
            const contentChanged = term !== existing.term || translation !== existing.translation;
            let forms = existing.forms;
            let formsGeneratedAt = existing.formsGeneratedAt;
            if (isVerbs && (contentChanged || !forms)) {
                forms = await generateVerbForms(term, translation);
                formsGeneratedAt = Date.now();
            }
            let example = existing.example;
            if (contentChanged || !example) {
                example = await generateExampleSentence(term, translation, categoryName);
            }
            const record: Record<string, unknown> = { ...existing, term, pronunciation, translation, example };
            if (isVerbs) {
                record.forms = forms;
                record.formsGeneratedAt = formsGeneratedAt;
            }
            const [ok] = await db.update(wordsTable(params.slug), [{ id: params.id, record }]);
            if (!ok) return error('Échec de la mise à jour', 500);
            if (existing.indexId) {
                await db.update('term_index', [
                    {
                        id: existing.indexId,
                        record: {
                            term,
                            normalized: normalizeTerm(term),
                            slug: params.slug,
                            category: categoryName,
                            wordId: params.id,
                            createdAt: existing.createdAt || Date.now(),
                        },
                    },
                ]);
            }
            return json({ word: { id: params.id, term, pronunciation, translation, forms, formsGeneratedAt, example } });
        },
    ],

    'POST /api/words/:slug/:id/regenerate-forms': [
        async ({ params }) => {
            const [existing] = await db.get<WordRecord>(wordsTable(params.slug), [params.id]);
            if (!existing) return error('Mot introuvable', 404);
            const forms = await generateVerbForms(existing.term, existing.translation);
            const formsGeneratedAt = Date.now();
            const [ok] = await db.update(wordsTable(params.slug), [
                { id: params.id, record: { ...existing, forms, formsGeneratedAt } },
            ]);
            if (!ok) return error('Échec de la régénération', 500);
            return json({ forms, formsGeneratedAt });
        },
    ],

    'PUT /api/words/:slug/:id/form': [
        async ({ params, body }) => {
            const b = (body || {}) as {
                registre?: string;
                conjugaison?: string;
                negation?: string;
                term?: string;
                pronunciation?: string;
            };
            const registre = (b.registre || '').trim();
            const conjugaison = (b.conjugaison || '').trim();
            const negation = (b.negation || '').trim();
            const term = (b.term || '').trim();
            const pronunciation = (b.pronunciation || '').trim();
            if (!registre || !conjugaison || !negation || !term) return error('Champs manquants', 400);
            const [existing] = await db.get<WordRecord>(wordsTable(params.slug), [params.id]);
            if (!existing) return error('Mot introuvable', 404);
            const forms = { ...(existing.forms || {}) };
            forms[formKey(registre, conjugaison, negation)] = { term, pronunciation };
            const [ok] = await db.update(wordsTable(params.slug), [{ id: params.id, record: { ...existing, forms } }]);
            if (!ok) return error('Échec de la mise à jour', 500);
            return json({ forms });
        },
    ],

    'POST /api/words/:slug/:id/regenerate-example': [
        async ({ params }) => {
            const [existing] = await db.get<WordRecord>(wordsTable(params.slug), [params.id]);
            if (!existing) return error('Mot introuvable', 404);
            const cat = getFixedCategoryBySlug(params.slug);
            const example = await generateExampleSentence(existing.term, existing.translation, cat ? cat.name : params.slug);
            const [ok] = await db.update(wordsTable(params.slug), [{ id: params.id, record: { ...existing, example } }]);
            if (!ok) return error('Échec de la régénération', 500);
            return json({ example });
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
                        "Cette image est une page de manuel de coréen contenant un lexique organisé en tableau ou en colonnes. Chaque ligne comporte : le mot en hangeul (coréen), sa romanisation/prononciation, et sa traduction en français. Le lexique peut être découpé en sections avec des titres. Choisis la catégorie grammaticale suggérée pour chaque ligne UNIQUEMENT parmi cette liste fermée, basée sur les classes grammaticales du coréen : \"Noms\" (명사), \"Pronoms\" (대명사), \"Numéraux\" (수사, chiffres/nombres), \"Verbes\" (동사), \"Adjectifs\" (형용사), \"Déterminants\" (관형사), \"Adverbes\" (부사), \"Particules\" (조사), \"Interjections\" (감탄사), \"Expressions\" (locutions/expressions figées), \"Autre\". Utilise le titre de section le plus proche au-dessus de chaque ligne ainsi que la nature grammaticale du mot pour choisir la catégorie la plus proche de cette liste ; si rien ne correspond clairement, mets \"Autre\"." +
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
                                        suggestedCategory: {
                                            type: 'string',
                                            enum: FIXED_CATEGORIES.map((c) => c.name),
                                        },
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
                .map((w) => {
                    const cat = resolveCategory(w.suggestedCategory || b.categoryHint || 'Autre');
                    return {
                        term: (w.term || '').trim(),
                        pronunciation: (w.pronunciation || '').trim(),
                        translation: (w.translation || '').trim(),
                        suggestedCategory: cat.name,
                    };
                })
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
            const results = await mapWithConcurrency(entries, 6, async (e) => {
                const term = (e.term || '').trim();
                const translation = (e.translation || '').trim();
                const categoryName = (e.categoryName || '').trim();
                const pronunciation = (e.pronunciation || '').trim();
                if (!term || !translation || !categoryName) {
                    return { ok: false as const, term: term || '(vide)', reason: 'incomplet' };
                }
                try {
                    const { category } = await addWordRecord(categoryName, term, pronunciation, translation);
                    return { ok: true as const, term, category: category.name };
                } catch {
                    return { ok: false as const, term, reason: 'échec' };
                }
            });
            const added: Array<{ term: string; category: string }> = [];
            const skipped: Array<{ term: string; reason: string }> = [];
            for (const r of results) {
                if (r.ok) added.push({ term: r.term, category: r.category });
                else skipped.push({ term: r.term, reason: r.reason });
            }
            return json({ added, skipped });
        },
    ],
});
