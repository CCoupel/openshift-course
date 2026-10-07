# openshift-course — Support de formation OpenShift on-premise

**[English: Overview below](#english-overview)**

Support de formation OpenShift on-premise, en français, pour administrateurs Kubernetes qui passent à OpenShift et ingénieurs plateforme. Format hybride : HTML interactif (source unique) sans dépendance, ouvrable en double-clic ; export PowerPoint. **Disponible en français et anglais** (sélecteur de langue FR | EN).

**Hors périmètre** : OpenShift managé (ROSA/ARO/OSD) en détail, développement applicatif.

---

## English Overview {#english-overview}

**OpenShift on-premise training course** for Kubernetes administrators and platform engineers. **16 modules** covering K8s vs OCP, architecture, installation, configuration, networking, storage, security, CI/CD, backup, and operations. **Bilingual course** (French / English) with a language selector (FR | EN toggle, keyboard shortcut `l`, URL parameter `?lang=en`).

Format: Interactive HTML (standalone, no dependencies, opens with double-click) + PowerPoint export (one `.pptx` per language: `-fr.pptx` and `-en.pptx`). See **[CONVENTIONS.md](CONVENTIONS.md)** section « Langues » for the i18n contract and how to contribute.

---

---

## Accès

- **Vitrine en ligne** : https://ccoupel.github.io/openshift-course/
- **Télécharger** : page [Releases](https://github.com/CCoupel/openshift-course/releases) → dernière version (pré-version 0.x)
  - `openshift-course-X.Y.Z.zip` : cours HTML complet (bilingue fr/en)
  - `openshift-course-X.Y.Z-fr.pptx` : PowerPoint français
  - `openshift-course-X.Y.Z-en.pptx` : PowerPoint anglais
- **Ouvrir le cours** : extraire le ZIP, double-clic sur `index.html` (navigateur, hors ligne, sans installation)
  - **Sélecteur de langue** : FR | EN dans la barre du haut (raccourci clavier : `l`) ; langue mémorisée (localStorage)
  - **Lien partiel** : `…/openshift-course/?lang=en#m07/5` (langue + slide + fragments révélés)
- **Vérifier l'intégrité** : `sha256sum -c` sur les fichiers `.sha256` fournis avec la release (SHA256 du ZIP et des deux PPTX)

---

## Contenu

### 16 modules

| # | Titre | # | Titre |
|---|-------|---|-------|
| 00 | Environnement de lab | 08 | Stockage |
| 01 | K8s vs OCP | 09 | Sécurité avancée |
| 02 | Architecture | 10 | CI/CD & GitOps |
| 03 | Installation | 11 | Backup & reprise d'activité |
| 04 | Configuration | 12 | Opérations jour 2 |
| 05 | Supervision & monitoring | 13 | Virtualisation & Serverless |
| 06 | HBAC / RBAC | 14 | Best practices |
| 07 | Réseau | 15 | Aide-mémoire & quiz final |

### Durée

1 105 minutes ≈ **18 h 25** sur 3 jours pour les modules 01 à 15 (exposés 13 h 50 + labs 4 h 35). Le module 00 (environnement de lab, ≈ 30 min plus l'installation du cluster, 2 à 3 h) se prépare avant le jour 1 et n'est pas compté.

### Référence technique

- **OpenShift 4.20 EUS** (Kubernetes 1.33)
- Note : 4.22 mentionnée où pertinent

### Environnements de lab

- **E0** : poste de travail seul, OpenShift Local (ex-CRC) ou tout cluster avec `cluster-admin` ; suffit pour les labs E0 (modules 01, 03, 06, 10 selon le plan), mais pas pour tout : un seul nœud, pas de Machine API, pas de mise à jour
- **E1** : Single Node OpenShift (SNO) sur KVM, vSphere ou bare metal ; recommandé pour suivre presque tout le cours (essai de 60 jours possible, conditions à vérifier)
- **E2** : Compact 3 nœuds (ou 3 masters + 2 workers)
- **E3** : Bare metal ou virtualisation imbriquée

Voir module 00 pour les prérequis détaillés.

---

## Structure du dépôt

```
.
├── index.html                 # Entrée HTML (charge le moteur + modules)
├── CLAUDE.md                  # Cadrage du projet et consignes pour l'assistant Claude Code
├── CONVENTIONS.md             # Schéma des modules et des blocs
├── VERSION                    # Version courante (X.Y.Z)
├── CHANGELOG.md               # Historique
├── LICENSE                    # Licence MIT
├── package.json               # Dépendances de dev (pptxgenjs, jszip)
├── package-lock.json          # Verrouillage des dépendances
├── assets/                    # Moteur et style
│   ├── engine.js              # Navigation, rendu, bilingue (vanilla JS)
│   ├── i18n.js                # Localisation : libellés du moteur et de l'export (fr/en)
│   ├── plan.js                # Manifeste des 16 modules (titres fr/en)
│   └── style.css              # Thème
├── modules/                   # Modules du cours
│   ├── fr/                    # Français (mNN-*.js)
│   └── en/                    # English (mNN-*.js)
├── tools/                     # Outils de dev
│   ├── validate.js            # Validateur (schéma, HTML, parité fr/en, --strict-i18n, --root)
│   ├── i18n-hash.js           # Synchronisation empreinte source (modules en)
│   ├── export-pptx.js         # Export PowerPoint par langue (--lang fr|en)
│   └── check-pptx.js          # Contrôle de l'export (des deux langues)
├── docs/
│   ├── PLAN.md                # Plan détaillé (périmètre, durées, environnements)
│   ├── i18n/
│   │   └── GLOSSARY.md        # Glossaire et guide de style (traduction fr→en)
│   └── mockup/                # Maquette et décisions de conception
├── tests/                     # Index et métriques des tests
├── .github/workflows/         # CI/CD (ci.yml, release.yml, pages.yml)
└── .claude/                   # Configuration Claude Code (agents, mémoire)
```

---

## Développer / Contribuer

### Valider les modules

```bash
node tools/validate.js                    # Tous les modules (fr + en)
node tools/validate.js --strict-i18n      # Contrôle strict : parité fr/en, empreintes (pour PR et release)
node tools/validate.js --root <dir>       # Valider un sous-arbre
node tools/i18n-hash.js --check           # Vérifier l'empreinte de source des modules en
node tools/i18n-hash.js --write mNN       # Recalculer l'empreinte d'un module après mise à jour
node tests/i18n/run.js                    # 87 cas de test de parité fr/en
```

Signale en erreur : schéma invalide, `objectives` (3 minimum) ou `takeaways` (4 minimum) manquants, balise HTML interdite, parité fr/en cassée (sous `--strict-i18n`) ; en avertissement : absence de quiz ou de lab (exigés pour tous les modules sauf le 15), nombre de slides hors cible, module en absent (sans `--strict-i18n`), empreinte périmée (sans `--strict-i18n`).

### Export PowerPoint

```bash
npm ci                                    # Installer dépendances de dev (pptxgenjs, jszip)
node tools/export-pptx.js                # Générer les deux : dist/openshift-course-X.Y.Z-fr.pptx et -en.pptx
node tools/export-pptx.js --lang fr      # Français seul
node tools/export-pptx.js --lang en      # Anglais seul
node tools/check-pptx.js                 # Contrôler les deux PPTX
node tools/check-pptx.js --lang en       # Vérifier l'anglais seul
```

Les fichiers `.pptx` utilisent les libellés de `assets/i18n.js` (couverture, pied de page, réponses de quiz, « À retenir » / « Key takeaways »). 

Prérequis : Node.js LTS (la CI utilise `lts/*` ; aucune version minimale n'est déclarée). Le cours HTML lui-même n'a besoin d'aucun outil.

### Conventions

- Voir `CONVENTIONS.md` : schéma des modules, 14 types de blocs, exigences de contenu, **section « Langues »** pour la traduction bilingue (contrat de parité fr/en, règles de synchronisation)
- Voir `docs/PLAN.md` : périmètre des 16 modules, frontières, renvois
- Voir `docs/i18n/GLOSSARY.md` : glossaire et guide de style pour la traduction (termes anglais, ton, formes grammaticales)
- **Points techniques incertains** : marqués « à vérifier » / « to be verified » (convention du projet, comptés et synchronisés par `validate.js`)

### Branches et commits

- Branches : `main` + `feature/*` / `bugfix/*`
- Commits : [Conventional Commits](https://www.conventionalcommits.org/fr/v1.0.0/) (feat, fix, docs, refactor, test, chore)
- Issues bienvenues : suggestions, corrections, améliorations

---

## CI et publication

### Validation (ci.yml)

À chaque push sur `feature/**`, `bugfix/**` et pull request sur `main` : syntaxe JavaScript (engine.js, plan.js), schéma modules, contrôle de l'export PowerPoint (`check-pptx.js`, avec auto-test).

### Release (release.yml)

Un tag `vX.Y.Z` déclenche :
1. Vérification : tag SemVer strict (`X.Y.Z`) et égal au fichier `VERSION` ; syntaxe JS ; schéma des modules ; **parité fr/en** (`validate.js --strict-i18n`)
2. Export PowerPoint : `dist/openshift-course-X.Y.Z-fr.pptx` et `-en.pptx` (deux fichiers, un par langue)
3. Archive ZIP : HTML + modules bilingues (`modules/fr/` + `modules/en/`) + assets
4. Checksums SHA256 : zip + deux PPTX
5. Création de la Release GitHub (marquée `prerelease` si version 0.x) avec les trois fichiers + checksums
6. Déploiement du site (appelé après succès de la Release)

### Site (pages.yml)

Mise à jour après la création d'une Release sur un tag `vX.Y.Z`, ou par lancement manuel du workflow `Pages` (`workflow_dispatch`).

Le site reflète la dernière release : un push sur `main` ne le met pas à jour. Reprise manuelle : `gh workflow run pages.yml --ref vX.Y.Z`.

### Versioning

Format `X.Y.Z` (Semantic Versioning). Développement `0.x` marqué pré-release.

---

## Limites

- **Pré-version** : structure et cohérence vérifiées par des tests automatisés (schéma, syntaxe, renvois, parité fr/en) ; le contenu technique n'est pas garanti.
- **Faits recoupés** : recoupés avec la documentation officielle Red Hat 4.20 de façon automatisée (confiance variable) ; relecture technique complète reportée après fusion de la branche i18n ; certains points restent à confirmer et sont marqués « à vérifier » / « to be verified » dans les modules (dans les deux langues, même nombre).
- **Rendu** : validation fonctionnelle seule, pas de vérification visuelle en navigateur réel ou PowerPoint.
- **Avant toute procédure sensible** : relire la documentation officielle Red Hat (restauration etcd, mises à jour de version, configurations critiques).

Les noms OpenShift® et Red Hat® sont des marques de Red Hat, Inc. ; ce projet n'est pas affilié à Red Hat.

---

## Licence

Ce dépôt (cours, documentation, code des outils et du moteur) est distribué sous licence MIT. Voir le fichier `LICENSE`.

---

## Liens

- **Vitrine** : https://ccoupel.github.io/openshift-course/
- **Dépôt GitHub** : https://github.com/CCoupel/openshift-course
- **Releases** : https://github.com/CCoupel/openshift-course/releases
