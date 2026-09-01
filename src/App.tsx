import { useEffect, useState } from 'react';
import { CategoryMenu } from './components/CategoryMenu';
import { FlashcardDeck } from './components/FlashcardDeck';
import { WordList } from './components/WordList';
import { AddWordForm } from './components/AddWordForm';
import { ImportPhoto } from './components/ImportPhoto';
import { type CategorySummary, fetchCategories } from './lib/api';
import { type Theme, applyTheme, getInitialTheme } from './lib/theme';

type Route =
    | { name: 'menu' }
    | { name: 'revise'; slug: string }
    | { name: 'list'; slug: string }
    | { name: 'add'; slug: string }
    | { name: 'import' };

function parseHash(hash: string): Route {
    const clean = hash.replace(/^#/, '');
    const segs = clean.split('/').filter(Boolean);
    if (segs[0] === 'import') return { name: 'import' };
    if (segs[0] === 'category' && segs[1]) {
        const slug = decodeURIComponent(segs[1]);
        if (segs[2] === 'list') return { name: 'list', slug };
        if (segs[2] === 'add') return { name: 'add', slug };
        return { name: 'revise', slug };
    }
    return { name: 'menu' };
}

function goto(path: string) {
    window.location.hash = path;
}

function App() {
    const [hash, setHash] = useState(window.location.hash);
    const [categories, setCategories] = useState<CategorySummary[]>([]);
    const [theme, setTheme] = useState<Theme>(getInitialTheme);

    useEffect(() => {
        const onChange = () => setHash(window.location.hash);
        window.addEventListener('hashchange', onChange);
        return () => window.removeEventListener('hashchange', onChange);
    }, []);

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

    const route = parseHash(hash);

    useEffect(() => {
        fetchCategories()
            .then(setCategories)
            .catch(() => {});
    }, [route.name]);

    const nameFor = (slug: string) => categories.find((c) => c.slug === slug)?.name || slug;

    if (route.name === 'import') {
        return <ImportPhoto onBack={() => goto('/')} onImported={() => goto('/')} />;
    }

    if (route.name === 'revise') {
        return (
            <FlashcardDeck
                slug={route.slug}
                categoryName={nameFor(route.slug)}
                onBack={() => goto('/')}
                onManage={() => goto(`/category/${route.slug}/list`)}
            />
        );
    }

    if (route.name === 'list') {
        return (
            <WordList
                slug={route.slug}
                categoryName={nameFor(route.slug)}
                onBack={() => goto(`/category/${route.slug}`)}
                onAdd={() => goto(`/category/${route.slug}/add`)}
            />
        );
    }

    if (route.name === 'add') {
        return (
            <AddWordForm
                categoryName={nameFor(route.slug)}
                onBack={() => goto(`/category/${route.slug}/list`)}
                onAdded={() => goto(`/category/${route.slug}/list`)}
            />
        );
    }

    return (
        <CategoryMenu
            onOpen={(slug) => goto(`/category/${slug}`)}
            onImport={() => goto('/import')}
            theme={theme}
            onToggleTheme={toggleTheme}
        />
    );
}

export default App;
