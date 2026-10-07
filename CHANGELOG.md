# Changelog

Tous les changements notables de ce projet sont documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),  
et ce projet adhère au [Versioning Sémantique](https://semver.org/spec/v2.0.0.html).

---

## Non publié

(À remplir pour la prochaine version)

---

## [1.0.0] - 2026-10-07

### Ajouté

- **Traduction anglaise complète** — 16 modules traduits en anglais, structure bilingue `modules/fr/` et `modules/en/`, parité structurelle fr/en contrôlée par `validate.js`
- **Sélecteur de langue FR | EN** — dans la barre du haut, interrupteur segmenté entre le compteur et le bouton thème ; conserve la position de l'utilisateur et les fragments révélés lors du changement de langue ; raccourci clavier `l` pour basculer ; langue mémorisée en `localStorage` ; ordre de résolution : `?lang=`, localStorage, navigateur (fr/en), défaut français
- **Localisation du moteur** — `assets/i18n.js` centralise les libellés du moteur et de l'export (callouts, boutons, aide clavier, etc.) ; titres du plan bilingues dans `assets/plan.js` ; moteur charge les deux langues (32 balises `<script>`)
- **Validation de parité** — `tools/validate.js` : option `--strict-i18n` pour erreurs sur parité cassée (en PR vers main et release) ; `--root <dir>` pour valider un sous-arbre ; détecte : nombre de slides/blocs/options identique, cardinalités, champs optionnels `caption`/`verdict`/`explain`/etc., marqueurs « à vérifier » / « to be verified » (même nombre), `lang` = dossier, clés `i18n.js` présentes
- **Synchronisation empreinte** — `tools/i18n-hash.js --write <mNN>` recalcule l'empreinte SHA256 d'un module en après mise à jour ; `--check` liste les modules périmés
- **Suite de tests i18n** — `tests/i18n/run.js` : 87 cas couvrant parité structurelle, champs optionnels, marqueurs, `lang`, empreinte, `i18n.js`, titres `plan.js`, module en manquant ; procédure QA manuelle du sélecteur `QA-SELECTEUR.md`
- **Glossaire et guide de style** — `docs/i18n/GLOSSARY.md` : termes du cours, terminologie Red Hat, ton, formes grammaticales, pièges de parité, règle d'identifiants neutres (fr+en : `my-sa`, `change-me`, `platform-team`, etc.)
- **Export PowerPoint bilingue** — `tools/export-pptx.js --lang fr|en` produit deux fichiers `-fr.pptx` et `-en.pptx` ; libellés lus dans `assets/i18n.js` (couverture, pied « Module NN · titre », réponses de quiz, « À retenir » / « Key takeaways ») ; `check-pptx.js` valide les deux
- **Workflow de release bilingue** — release.yml : `validate.js --strict-i18n`, export des deux PPTX, calcul SHA256 des trois fichiers (zip + 2 pptx), création Release avec tous les fichiers
- **Licence MIT** — Voir fichier `LICENSE` ; `package.json` indique la licence
- **README bilingue** — Section courte en anglais, sélecteur de langue, commandes de validation bilingues, nomenclature des artefacts

### Modifié

- **Chemins des modules** — `modules/` → `modules/fr/` (français) et nouveau `modules/en/` (anglais) ; même nom de fichier dans les deux dossiers (ex. `modules/fr/m05-monitoring.js` et `modules/en/m05-monitoring.js`)
- **Identifiants et valeurs d'exemple** — Neutralisés en français et en anglais pour éviter traduction ; modifiés dans le même commit fr+en (empreinte recalculée)
- **Corrections de contenu français (depuis 0.9.1)** — m06 : annotation `autoupdate` ; reformulations « à vérifier » en « à contrôler » (usage ordinaire, non marqueur i18n) ; identifiants neutres en m02, m04, m05, m07
- **Contrôles CI** — `validate.js` (push sur branches feature) : avertissements i18n ; pull request vers main : `validate.js --strict-i18n` (erreurs bloquantes pour parité, empreintes)

### Corrigé (Relecture technique OCP 4.20)

Vérification des faits techniques contre la documentation officielle Red Hat (release notes, console, documentation produit) :
- **Module 00, 01** : accès en offres managées clarifié — `dedicated-admin` par défaut sur ROSA/OSD, `cluster-admin` possible avec restrictions, `kubeadmin` sur ARO (le cours disait à tort « pas d'accès cluster-admin »)
- **Module 05** : monitoring plugin COO partiellement GA — détection d'incidents et panneau de dépannage GA (COO 1.3, OCP 4.19+) ; dashboard APM en Developer Preview
- **Module 06, 07, 15** : NetworkPolicy en multi-tenant — la formulation « les quatre politiques de la doc 4.20 » était inexacte ; le cours renvoie désormais aux sections About network policy et Configuring multitenant isolation ; la question de la politique suffisante avec routeurs HostNetwork reste marquée à vérifier
- **Module 10** : Builds corrigé — Builds 1.7 (GA 10/02/2026) pour OCP 4.16–4.21 ; Builds 1.6 pour 4.16–4.19 (le cours disait à tort Builds 1.6 pour 4.20)
- **Module 11** : Subscription OADP corrigée — Subscription `redhat-oadp-operator`, canal `stable-1.5` (OADP 1.5 pour OCP 4.19–4.21)
- **Module 12, 14** : `autoSizingReserved` confirmation depuis OCP 4.21
- **Module 01** : dates mise à jour — 4.22 GA le 9 juin 2026, EUS annoncé
- **Module 07** : plage ANP confirmée 0-99
- **Module 10** : phrase ACM pull rectifiée

### [BREAKING]

- **Nom du fichier PowerPoint** — `openshift-course-X.Y.Z.pptx` (unique) → `openshift-course-X.Y.Z-fr.pptx` et `openshift-course-X.Y.Z-en.pptx` (deux fichiers, un par langue)
- **Chemin des modules** — `modules/` → `modules/fr/` et `modules/en/` ; mise à jour requise pour les scripts y faisant référence

### Limites connues

- **66 marqueurs « à vérifier » / « to be verified »** restent — relecture technique sur sources officielles Red Hat faite par agent automatisé, à compléter par une relecture humaine exhaustive
- **Pas de vérification visuelle** — Aucune vérification visuelle en navigateur réel ni dans PowerPoint n'a été faite

---

## [0.9.1] - 2026-10-07

### Modifié

- **Déploiement du site sur les tags de production** — GitHub Pages n'est plus mis à jour par push main ; le site est désormais publié après la création de la Release GitHub, si elle réussit (sources : `.github/workflows/release.yml`, `.github/workflows/pages.yml`)
- **Extraction des notes de release bornée et obligatoire** — Les notes de release sont extraites du CHANGELOG avec une borne exacte (`## [X.Y.Z]`) ; le workflow échoue explicitement si l'entrée est manquante (source : `.github/workflows/release.yml`)
- **Checksum du PowerPoint en chemin relatif** — Le fichier `.sha256` du PPTX est généré avec le nom court uniquement (compatible `sha256sum -c`) (source : `.github/workflows/release.yml`)
- **Marquage automatique des pré-releases** — Les versions `0.x` sont marquées `prerelease` à la création de la Release GitHub (source : `.github/workflows/release.yml`)
- **Permissions par job dans le workflow de release** — Permissions décentralisées pour chaque job (release : contents write ; pages : pages write + id-token write) (source : `.github/workflows/release.yml`)
- **Le contenu du cours est identique à la 0.9.0** — Aucun module, convention ou documentation n'a été modifié (vérification : seuls les fichiers sous `.github/workflows/` ont changé)

---

## [0.9.0] - 2026-10-06

### Ajouté

- **16 modules du plan de formation** (m00 à m15) : Environnement de lab, K8s vs OCP, Architecture, Installation, Configuration, Supervision & monitoring, HBAC / RBAC, Réseau, Stockage, Sécurité avancée, CI/CD & GitOps, Backup & reprise d'activité, Opérations jour 2, Virtualisation & Serverless, Best practices, Aide-mémoire & quiz final (sources : `modules/mNN-*.js`, `assets/plan.js`)
- **Support de cours HTML interactif** — Ouvrable en double-clic (file://), sans dépendance externe, avec navigation, sommaire complet et suivi de progression utilisateur (sources : `index.html`, `assets/engine.js`, `assets/style.css`)
- **Moteur de rendu avec 14 types de blocs** : texte, listes, code, commandes, tableaux, comparatifs, encarts, diagrammes de flux, couches, cartes retournables, quiz, zones masquées, labs, schémas (source : `assets/engine.js`)
- **Sommaire interactif** — Plan complet des 16 modules ; le moteur sait afficher en grisé, sans l'ouvrir, un module du plan non encore rédigé (sources : `assets/plan.js`, `assets/engine.js`)
- **Export PowerPoint** — Archive .pptx (498 slides) générée automatiquement à partir des modules et jointe à chaque release (sources : `tools/export-pptx.js`, `.github/workflows/release.yml`)
- **Validateur automatisé** — Contrôles de cohérence entre manifeste, modules et index.html, validation des schémas obligatoires (sources : `tools/validate.js`, `.github/workflows/ci.yml`)
- **Publication GitHub Pages** — Workflow de construction et déploiement sur push main (avec filtrage des chemins sensibles) et déclenché manuellement (sources : `.github/workflows/pages.yml`)
- **Plan de formation documenté** — 16 modules sur 3 jours (≈ 18 h 25), budget horaire par module, environnements de lab (E0–E3), matrice des prérequis (source : `docs/PLAN.md`)
- **Conventions et schémas** — Format des modules, exigences de contenu (objectifs, takeaways, labs et quiz obligatoires), directives (ton pédagogique, encarts thématiques, renvois entre modules) (source : `CONVENTIONS.md`)

### Modifié

- **Référence mise à jour** — Les 4 modules initiaux (01, 02, 06, 08) ont été mis à niveau pour la référence OpenShift 4.20 EUS (source : commits c131ccd, a5a21d6, 0de1cee, 13252b2)

---

## Limites connues

- **Pré-version (0.9.x)** — Structure et cohérence vérifiées par des tests automatisés (schéma, syntaxe, renvois) ; le contenu technique n'est pas garanti. Pas de vérification visuelle en navigateur réel ni en PowerPoint.
- **Vérification des faits** — Les faits techniques ont été recoupés avec la documentation officielle Red Hat 4.20 à l'aide d'outils de lecture automatique (résumés) ; la confiance est variable ; les points non confirmés sont marqués « à vérifier » dans les modules.
- **Sans affiliation** — Projet communautaire, sans affiliation avec Red Hat, sans support Red Hat. Relire la documentation officielle Red Hat avant toute procédure sensible (restauration etcd, mises à jour de version).

---

## Versioning et Release

- **Format de version** : `X.Y.Z` (SemVer)
- **Artefacts** : archive ZIP (cours complet, index.html, assets, modules, VERSION) + PPTX + checksums sha256
