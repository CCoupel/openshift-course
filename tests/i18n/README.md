# tests/i18n — parité fr/en (phase 1, T6)

Fixtures et procédure QA de la feature « cours bilingue » (issue #3, milestone v1.0.0). Plan : `_work/reports/planner-i18n.md` (D1, D5, D6).

| Fichier | Rôle |
|---|---|
| `run.js` | Lance `tools/validate.js` et `tools/i18n-hash.js` sur 45 cas (1 paire valide, puis 1 paire cassée par règle). Sans dépendance. |
| `fixtures/base/` | Arbre minimal de type dépôt : `index.html`, `assets/{engine,i18n,plan}.js`, `modules/{fr,en}/m00-demo.js` + `m01-demo.js`. Valide tel quel. |
| `QA-SELECTEUR.md` | Procédure manuelle du sélecteur FR \| EN (lots de ≤ 50 cas). |

## Lancer

```
node tests/i18n/run.js                  # tous les cas
node tests/i18n/run.js --only P03       # un cas
node tests/i18n/run.js --exit-only      # ne contrôle que les codes de sortie (libellés non figés)
node tests/i18n/run.js --verbose        # affiche la sortie des outils en cas d'échec
node tests/i18n/run.js --dry            # applique les éditions sans lancer les outils (contrôle des fixtures)
node tests/i18n/run.js --refresh-hashes # recalcule `source` dans fixtures/base/ si on touche un module fr
```

Chaque cas copie `fixtures/base/` dans `_work/tmp/i18n-fixtures/<id>/`, applique une mutation, recalcule l'empreinte `source`
(sauf cas « périmé »), lance l'outil et compare : code de sortie (dur) et motifs de message (larges, `out` / `notOut`).

## Contrat supposé (à confirmer par dev-course en T4)

Écrit avant `tools/validate.js` T4 ; tout est isolé dans la section CONFIG de `run.js` et dans le champ `expect` des cas.

- **A1** `validate.js --root <dir>` : `<dir>` est un arbre de type dépôt. Même option pour `i18n-hash.js`.
- **A2** `--strict-i18n` : module en absent ou empreinte périmée/absente = erreur (exit 1) ; sans l'option = `warn` (exit 0). Module fr absent alors que en existe = erreur dans les deux modes.
- **A3** Erreur = ligne `ERREUR …` + exit 1 ; avertissement = ligne `warn …`. Les motifs de message sont larges ; en cas de désaccord de libellé seulement, utiliser `--exit-only` puis ajuster `CASES`.
- **A4** Empreinte = 12 premiers hex du sha256 des octets du fichier fr, champ `source` du module en.
- **A5** `i18n-hash.js --check` : exit 1 et nomme les modules périmés, exit 0 et silencieux sinon ; `--write <module>` recalcule.
- Parité contrôlée (D1) : nombre de slides, type/suite de blocs, `frag`, `answer`, cardinalités (`options`, `rows`, `head`, `items`…), `cmds[i][0]`, lignes de code hors commentaires `#`, `file`/`lang` des blocs `code`, `id`/`num`/`emoji`/`duration`, nombre d'`objectives`/`takeaways`, marqueur « à vérifier » ↔ « to be verified » (même nombre), `lang` = dossier, mêmes clés dans `i18n.js` fr/en, titres `plan.js` = titres des modules.
- Hors fixtures (non couvert ici, à tester par dev-export / QA) : `layout`, `tag`, `kind` des diagrammes ; `check-pptx.js --selftest` ; export des deux langues.

## Table des cas

`V` valide · `P` parité structurelle · `M` marqueur · `L` champ `lang` · `I` `i18n.js` · `T` titres `plan.js` · `S` module manquant · `H` empreinte · `K` `i18n-hash.js`.
Tags `smoke` : V01, V02, S02, H02 (à rejouer en tête de QA).
