# 단어 카드 — Flashcards Coréen

App de révision de vocabulaire coréen : cartes avec terme coréen, prononciation et
traduction française, organisées par catégorie (Noms, Verbes, Particules, Adjectifs, ...),
avec ajout de mots par photo (OCR + extraction IA + détection de doublons).

## Fonctionnement

- **Menu principal** : grille des catégories, avec compteur de mots, création/suppression
  de catégorie.
- **Révision** : une carte affiche le mot en coréen + la prononciation ; un tap/clic la
  retourne pour voir la traduction française. Swipe (ou flèches ←/→ au clavier) pour
  passer au mot précédent/suivant. Bouton mélanger.
- **Gestion des mots** : liste des mots d'une catégorie, édition et suppression.
- **Ajout par photo** : prends en photo une page de manuel, l'IA lit le tableau de
  vocabulaire (terme, prononciation, traduction, et devine la catégorie à partir des
  titres de section comme "Noms"/"Verbes"), compare avec les mots déjà enregistrés pour
  repérer les doublons, puis affiche une liste à corriger/valider avant l'ajout définitif.
- **Ajout manuel** : formulaire simple, avec avertissement si le mot existe déjà.

## Stack technique

Frontend React + Vite + Tailwind, backend serverless (routes dans `backend/index.ts`)
avec base de données et IA d'extraction d'image, le tout hébergé et géré via la
plateforme **AppDeploy**.

`@appdeploy/client` (frontend) et `@appdeploy/sdk` (backend) sont des paquets injectés
par la plateforme AppDeploy au moment du build/déploiement : ils ne sont pas publiés sur
npm et **un `npm install` classique en dehors d'AppDeploy ne les résoudra pas**. Ce dépôt
sert de source de vérité versionnée pour le code ; le déploiement réel (build, base de
données, stockage des photos, appel IA) se fait via l'outil AppDeploy à partir de cet
arbre de fichiers.

## Structure

- `src/` — frontend React (composants dans `src/components/`, appels API dans
  `src/lib/api.ts`), routage par hash fait main (pas de dépendance externe).
- `backend/index.ts` — routes API : catégories, mots (CRUD), extraction IA depuis une
  photo, ajout en masse.
- `tests/tests.txt` — suite de tests end-to-end au format attendu par AppDeploy.
