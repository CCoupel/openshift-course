# MEMORY — openshift-course

> Source de vérité au démarrage de session. Mise à jour via `/end-session`.

## État

- **Version publiée** : 0.9.1 (pré-release ; tag `v0.9.1` sur ad1d8b7 ; version en VERSION file = 0.9.1)
- **Branche principale** : `main` (c155b53, après fusion README + LICENSE MIT) ; une seule branche productive
- **Template** : claude_project_template v3.10.0
- **Site vitrine** : https://ccoupel.github.io/openshift-course/ (publié sur tag, pas sur push main)
- **Release** : https://github.com/CCoupel/openshift-course/releases (GitHub Releases avec pré-release auto pour 0.x)
- **Contenu** : 16 modules (m00 à m15) rédigés et publiés ; HTML interactif + export PPTX 498+ slides
- **Infrastructure** : GitHub Actions (ci.yml, release.yml, pages.yml) ; ruleset `protect-release-tags` (id 24634998, bypass Admin) ; regex version SemVer stricte (pas de `-rc`) ; reprise manuelle du site : `gh workflow run pages.yml --ref vX.Y.Z`
- **Procédures de déploiement** : publish.prod.md / deploy.prod.md = gabarits PaaS inexécutables (la release GitHub tient lieu de déploiement prod)

## Travail en cours

- Aucun ; session de fin (documentation complétée)
- Prochaine : relecture technique des faits avant 1.0.0 ; critères de 1.0.0 à décider

## Décisions

- Cours OpenShift on-premise (4.20 EUS, Kubernetes 1.33 ; note 4.22), en français, pour admins K8s+plateforme, public
- Format : HTML interactif source unique (`index.html` + `modules/mNN-*.js`) sans dépendance ; export PPTX pptxgenjs (devDependency)
- Plan : 16 modules (m00 Environnement + m01-m15 contenu formateur), ≈3 jours (1105 min, modules 01-15 uniquement)
- Environnements : E0 (poste/OpenShift Local/cluster cluster-admin), E1 (SNO), E2 (Compact 3), E3 (Bare metal/virtualisation imbriquée)
- Mise en production : tag `vX.Y.Z` → release.yml (vérifie tag = VERSION + CHANGELOG obligatoire) → export PPTX → zip + pptx + sha256 → Release GitHub (prerelease auto si 0.x) → pages.yml (site après release, pas après push main)
- Licence : MIT pour tout (copyright « CCoupel » ; à corriger si nom légal) ; voir `LICENSE`
- Validation : `node tools/validate.js` obligatoire ; points incertains marqués « à vérifier » dans modules (convention du projet)

## Règles critiques

- **Adresse teamleader** : `team-lead` (pas `main`)
- **Spécifications de tâche** : le teamleader écrit dans `_work/tasks/*.md` (seule exception à son interdiction d'écrire)
- **Livrables** : `_work/reports/` uniquement ; DONE = références fichiers seules
- **Pas de push direct sur main** : branche + CI + fusion --no-ff ; supprimer la branche après fusion (locale + distante)
- **Aucun dossier de travail hors projet** : temporaires sous `_work/tmp/` uniquement
- **Ne rien publier sans décision utilisateur** : tag, release, réglages GitHub
- **Qualité** : agents Web-enabled (WebSearch/WebFetch) ; faits recoupés par résumés auto (confiance variable) ; « à vérifier » conservés ; ne jamais lever un « à vérifier » sans source ; ne jamais amender un commit annoncé

## Pour la prochaine session

- Relecture technique des faits par un humain avant 1.0.0
- Décider des critères de 1.0.0
- Ajouter au CHANGELOG de la prochaine version : entrée « Ajouté : Licence MIT + README »
- Adapter `publish.prod.md` / `deploy.prod.md` (gabarits PaaS actuellement inexécutables)
- Utilisateur corrige les templates d'agents : adresse `team-lead`, fin de tour, gabarits (voir `.claude/memory/protocole-communication-audit.md`)
- Vérification visuelle du HTML en navigateur réel (jamais faite)
- Relecture du document d'homogénéisation copié en `ANSIBLE/docs/HOMOGENEISATION-OPENSHIFT.md`
- Détails : v0.9.0 `.pptx.sha256` à chemin `dist/…` ; `project-config.json` et `package-lock.json` restés en 0.1.0 (décision)
- Optionnel : actions GitHub épinglées par SHA
