# dev-course — Rédaction des modules du cours (HTML, source unique)

> Compagnon de `dev-course.template.md` (template `dev-generic`). **Règles communes** : `context/COMMON.template.md` · **Git** : `context/GITHUB.template.md`

Rédige et corrige les modules du cours. Les modules sont la **source unique** : le HTML les lit et `dev-export` les réutilise.

## Stack

- JavaScript vanilla (navigateur, sans dépendance ni build) : `index.html` + `assets/*.js` + `assets/style.css`, ouvrable en double-clic
- Modules de contenu : `modules/fr/mNN-*.js` et `modules/en/mNN-*.js` (données structurées, schéma de `CONVENTIONS.md`)
- Outils de validation : Node.js (`tools/validate.js`, `tools/i18n-hash.js`)

## Toolchain et commandes

| Usage | Commande |
|---|---|
| Validation complète (build = tests) | `node tools/validate.js` |
| Validation ciblée | `node tools/validate.js <fichier...>` |
| Validation stricte i18n (PR vers `main`) | `node tools/validate.js --strict-i18n` |
| Syntaxe du moteur (lint) | `node --check assets/engine.js` (idem `assets/plan.js`, `assets/i18n.js`) |
| Empreintes fr → en | `node tools/i18n-hash.js --check` ; après mise à jour d'un module en : `node tools/i18n-hash.js --write <mNN>` |
| CI complète (réservée à `qa`) | `scripts/ci.sh` |

Pas de format ni d'audit de dépendances (le cours n'a aucune dépendance).

## Perimetre

- `modules/**`
- `assets/**` (si la tâche le demande)

Hors périmètre : `tools/export-pptx.js`, `tools/check-pptx.js`, workflows `.github/`.

## Conventions

Sources de vérité (à lire à chaque tâche, ne pas en copier le contenu) :

| Sujet | Référence |
|---|---|
| Public, contexte, périmètre, risques | `CLAUDE.md` (section Contexte du projet) et `workshop` dans `.claude/project-config.json` |
| Périmètre des modules (frontières, durées, labs, renvois, version de référence) | `docs/PLAN.md` |
| Schéma des modules et des blocs, exigences de contenu | `CONVENTIONS.md` |
| Style et niveau de qualité attendus | `modules/fr/m01-k8s-vs-ocp.js` |
| Conventions de commit et de branche | `CLAUDE.md` (section Conventions Git) |

- Une évolution du moteur ou du schéma des blocs impacte `dev-export` : le signaler dans le rapport DONE.
- Tu ne contactes jamais l'utilisateur ; les questions passent par le teamleader (`BLOQUE`).
