# Index des tests

> Tests de specification ecrits par le test-writer, ranges en lots `<famille>/<theme>/<lot>/` ; statuts tenus par le CDP.
> Convention : `context/COMMON.md` section 15. Statuts : `feature` | `regression` | `quarantaine`.

| Chemin | Niveau | Composant | Feature | Statut | Tags |
|--------|--------|-----------|---------|--------|------|
| tests/i18n/ | unitaire (fixtures `run.js` sur `validate.js` / `i18n-hash.js`, 45 cas) | tools | Parité fr/en, `--strict-i18n`, empreintes de source (i18n #3) | feature | smoke |
| tests/i18n/QA-SELECTEUR.md | manuel (procédure QA, 52 cas en 6 lots) | engine | Sélecteur de langue FR \| EN : bascule, `?lang=`, mobile, `file://`, recherche, scores, repli (i18n #3) | feature | smoke |
