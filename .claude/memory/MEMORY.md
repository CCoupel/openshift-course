# MEMORY — openshift-course

> Source de vérité au démarrage de session. Mise à jour via `/end-session`.

## État
- **Version courante** : 0.1.0 (dev) — aucun tag publié
- **Branche** : `feature/agents-contenu` (non fusionnée dans `main`)
- **Template** : claude_project_template v3.10.0 (c620b204)
- **Site vitrine** : https://ccoupel.github.io/openshift-course/ (gh-pages)

## Travail en cours
- Contenu : 4/15 modules rédigés (01, 02, 06, 08) ; 03-05, 07, 09-15 à écrire (`dev-course`)
- Export PPTX : à faire (`dev-export`)
- Agents `dev-course` / `dev-export` réécrits (commit 0b798a9)

## Décisions
- Cours OpenShift on-premise, FR, public admins K8s ; HTML interactif = source unique (`index.html` + `modules/*.js`) + export PPTX
- Plan : 15 modules (9 + 6 ajouts), ~3 jours ; conventions dans `CONVENTIONS.md`
- Environnements : QUALIF (promote) → PROD (rebuild-ci sur tag) ; déploiement = Release GitHub (paas)
- Branches `feature/*` / `bugfix/*`, Conventional Commits

## Règles critiques
- Teamleader : pas d'Edit/Write/Bash technique — déléguer aux agents ; questions via `AskUserQuestion`
- Validation : `node tools/validate.js` doit passer ; points incertains marqués « à vérifier dans les release notes »
