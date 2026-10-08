# MEMORY — openshift-course

> Source de vérité au démarrage de session. Mise à jour via `/end-session`.

## État

- **Version publiée** : **1.0.0** (stable, tag annoté `v1.0.0` sur 936023a, 2026-10-07/08) ; Release : https://github.com/CCoupel/openshift-course/releases/tag/v1.0.0 (zip + `-fr.pptx` + `-en.pptx` + 3 sha256) ; VERSION = 1.0.0 ; `project-config.json` et `package-lock.json` restent en 0.1.0 (décision).
- **Branche principale** : `main` (936023a), une seule branche productive ; milestone v1.0.0 fermé (13 issues fermées) ; issue #1 « Web Training » ouverte, sans contenu (non traitée).
- **Template** : claude_project_template **v3.13.1** (synchronisé en session ; protocole : ordres > 3 lignes dans `_work/tasks/*.md`, format `[NOM] BLOQUE` + `Questions:`).
- **Site** : https://ccoupel.github.io/openshift-course/ (publié sur tag).
- **Contenu** : **16 modules bilingues fr/en** (`modules/fr/`, `modules/en/`), sélecteur de langue FR | EN (raccourci `l`, `?lang=`, langue en `localStorage`), `assets/i18n.js`, export PPTX par langue ; 66 marqueurs « à vérifier » / « to be verified » restent (m00 11, m02 5, m03 6, m04 4, m05 5, m06 3, m07 8, m09 4, m10 3, m11 2, m12 2, m13 6, m14 1, m15 6).
- **Outils** : `tools/validate.js` (`--strict-i18n`, `--root`, liste blanche de clés de texte visible : message, summary, text, description, displayName), `tools/i18n-hash.js`, `tests/i18n/run.js` (87 cas, dossier temporaire unique), `docs/i18n/GLOSSARY.md`, `docs/mockup/v1.0.0/`.
- **CI** : `ci.yml` (strict sur PR vers main), `release.yml` (strict, 2 pptx, 3 sha256), `pages.yml` ; ruleset `protect-release-tags` (id 24634998, bypass Admin).
- **Procédures de déploiement** : `publish.prod.md` / `deploy.prod.md` = gabarits PaaS inexécutables (la Release GitHub tient lieu de déploiement) ; l'approche gh-pages a été étudiée puis abandonnée (trop complexe, tout reste sur main).

## Travail en cours

- Aucun.

## Décisions (ajouts à conserver avec l'existant)

- **i18n** : un fichier par langue, parité structurelle exacte, empreinte de source, une seule branche longue fusionnée (PR #16) ; relecture des faits après la traduction (PR #17) ; texte visible des YAML traduisible via liste blanche de clés ; marqueur « à vérifier » réservé aux incertitudes (usage ordinaire : « à contrôler »/« à confirmer ») ; « on-prem » forme unique ; identifiants d'exemple neutres fr+en (`change-me`, `my-sa`, …).
- **Les levées de marqueurs** sur sources hors doc 4.20 ou communautaires (9, confiance « moyenne ») ont été gardées par l'utilisateur ; liste dans le rapport de la phase 4 (non versionné).
- **Version 1.0.0** choisie par l'utilisateur malgré les 66 marqueurs restants et l'absence de test en navigateur réel (limites écrites dans le CHANGELOG).

## Règles critiques (ajouts)

- **Messages perdus pendant le traitement** : donner un ordre à part entière (fichier `_work/tasks/`) et exiger son DONE ; vérifier `git log` plutôt que les affirmations.
- **Notes de Release** : extraites du CHANGELOG (`## [X.Y.Z]` exact) ; rien de provisoire ni d'inventé dedans ; faire relire l'extraction avant le tag.
- **Tags poussés** : ne se déplacent pas ; jamais de force ni de suppression ; correction = nouvelle version.
- **Faits techniques issus d'agents Web** : appliqués qu'après validation de l'utilisateur ; un constat peut être faux (ex. ACM pull 2.8 TP) ; toujours recouper.

## Pour la prochaine session

- **Smoke navigateur réel jamais fait** (Chrome, Firefox, `file://`) : `tests/i18n/QA-SELECTEUR.md` (53 cas) ; priorités : sélecteur, diagrammes SVG m02 s3 et m03 s13, tableaux longs (m09 s3, m00 s3), mobile ; rendu PowerPoint des deux .pptx.
- **Relecture humaine des 66 marqueurs** et des 9 levées de confiance moyenne ; décider d'une issue de suivi (#13 est fermée).
- **7 doutes consignés** dont « K8s 1.35 » pour 4.22, ANP « TP dès 4.14 », `localhost-recovery.kubeconfig` (doc 4.12), `crc config set …` (communautaire) : voir le CHANGELOG et le rapport phase 4 (non versionné).
- **`CLAUDE.md` ligne 13** cite encore `modules/*.js` (→ `modules/fr/*.js`) ; adapter `publish.prod.md` / `deploy.prod.md` ou les retirer ; motd encodé de m02 reste en français ; issue #1 à traiter ou fermer ; optionnel : actions GitHub épinglées par SHA, `chore/**` dans les déclencheurs de `ci.yml`.
