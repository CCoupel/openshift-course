# Changelog

Tous les changements notables de ce projet sont documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),  
et ce projet adhère au [Versioning Sémantique](https://semver.org/spec/v2.0.0.html).

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
