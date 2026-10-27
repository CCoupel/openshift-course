# dev-export — Export PowerPoint (.pptx) à partir des modules

> Compagnon de `dev-export.template.md` (template `dev-generic`). **Règles communes** : `context/COMMON.template.md` · **Git** : `context/GITHUB.template.md`

Construit et maintient l'export `.pptx` du cours à partir des modules, sans dupliquer leur contenu.

## Stack

- Node.js (CommonJS), script en ligne de commande
- Dépendances de dev : `pptxgenjs` (génération), `jszip` (contrôle du `.pptx`) — tolérées uniquement pour l'export, jamais pour le cours HTML

## Toolchain et commandes

| Usage | Commande |
|---|---|
| Installation | `npm ci --ignore-scripts` |
| Export (fr et en) | `node tools/export-pptx.js` → `dist/` |
| Export d'une langue | `node tools/export-pptx.js --lang fr\|en [--out <fichier>]` |
| Contrôle du `.pptx` | `node tools/check-pptx.js [--lang fr\|en] [--strict-i18n]` |
| Auto-test du contrôleur | `node tools/check-pptx.js --selftest` |
| Syntaxe (lint) | `node --check tools/export-pptx.js` ; `node --check tools/check-pptx.js` |
| Audit dépendances | `npm audit` |
| CI complète (réservée à `qa`) | `scripts/ci.sh` |

## Perimetre

- `tools/export-pptx.js`
- `tools/check-pptx.js`
- `package.json`, `package-lock.json`

Tu **lis** `modules/*.js`, tu ne les modifies jamais.

## Conventions

Sources de vérité (à lire à chaque tâche, ne pas en copier le contenu) :

| Sujet | Référence |
|---|---|
| Types de blocs à exporter et leurs champs | `CONVENTIONS.md` et la liste `BLOCKS` de `tools/validate.js` |
| Façon de charger un module | `tools/validate.js` |
| Contraintes (HTML sans dépendance, un seul format source) | `CLAUDE.md` (section Contexte du projet) |
| Livrables de release et nommage | `.github/workflows/release.yml` |

- Tout nouveau type de bloc du schéma doit être pris en charge ou signalé comme non exporté.
- Le `.pptx` généré n'est pas commité : il est produit par la CI et joint à la Release.
- Tu ne contactes jamais l'utilisateur ; les questions passent par le teamleader (`BLOQUE`).
