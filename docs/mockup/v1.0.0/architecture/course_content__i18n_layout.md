---
mockup:
  composant: course_content
  feature: i18n_layout
  version: 1.0.0
  type: architecture
  issue: "#3"
  validee_le: 2026-10-07
  complete: []
  remplace: []
---

# Contenu du cours bilingue : fichiers, chargement, outils

Option recommandée (plan `_work/reports/planner-i18n.md`, décision Q1) : un fichier par module et par langue,
structure identique imposée par `tools/validate.js`.

## Arborescence et consommateurs

```mermaid
flowchart LR
  subgraph src["Sources (dépôt)"]
    I18N["assets/i18n.js<br/>COURSE.i18n = { fr:{…}, en:{…} }<br/>libellés du moteur et de l'export"]
    PLAN["assets/plan.js<br/>COURSE.plan : title {fr, en}"]
    FR["modules/fr/mNN-*.js<br/>COURSE.add({ lang:'fr', … })"]
    EN["modules/en/mNN-*.js<br/>COURSE.add({ lang:'en', … })"]
  end
  IDX["index.html<br/>engine.js, i18n.js, plan.js,<br/>16 × fr + 16 × en"]
  ENG["assets/engine.js<br/>COURSE.byLang[lang]<br/>t(key) · setLang()"]
  VAL["tools/validate.js<br/>schéma par fichier<br/>+ parité fr ↔ en"]
  EXP["tools/export-pptx.js --lang fr|en"]
  CHK["tools/check-pptx.js (par langue)"]
  FR --> IDX
  EN --> IDX
  I18N --> IDX
  PLAN --> IDX
  IDX --> ENG
  FR --> VAL
  EN --> VAL
  I18N --> VAL
  PLAN --> VAL
  FR --> EXP
  EN --> EXP
  I18N --> EXP
  EXP --> PPTXFR["dist/openshift-course-X.Y.Z-fr.pptx"]
  EXP --> PPTXEN["dist/openshift-course-X.Y.Z-en.pptx"]
  PPTXFR --> CHK
  PPTXEN --> CHK
```

## Choix de la langue au chargement et au changement

```mermaid
stateDiagram-v2
  [*] --> Resolve
  Resolve --> FromURL: ?lang=fr|en valide
  Resolve --> FromStore: sinon state.lang mémorisé
  Resolve --> FromBrowser: sinon navigator.languages commence par fr ou en
  Resolve --> Default: sinon
  FromURL --> Ready
  FromStore --> Ready
  FromBrowser --> Ready
  Default --> Ready: fr (Q2)
  Ready --> Switching: clic FR/EN ou touche l
  Switching --> Ready: save state.lang · html lang · ?lang= (replaceState, try/catch) · build(lang) · show(même uid, mêmes fragments) · annonce
```

## Repli pendant la traduction (branche feature/i18n)

Module absent en `en` : le moteur affiche le module `fr` avec le bandeau « Not translated yet — showing French ».
`node tools/validate.js` : avertissement ; `node tools/validate.js --strict-i18n` (PR vers main et release) : erreur.
