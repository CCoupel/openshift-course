# Glossaire et guide de style de la traduction (fr → en)

Destiné aux contributeurs. Valide la traduction des 16 modules ; établi sur le pilote `modules/en/m01-k8s-vs-ocp.js`. Le contrat de données (parité, `lang`, empreinte) est dans `CONVENTIONS.md` section « Langues ». Les libellés du moteur sont dans `assets/i18n.js`.

## Principes

1. **Fidélité** : aucun fait ajouté, retiré ni « corrigé » pendant la traduction. Un doute sur un fait va dans `_work/reports/i18n-faits-a-verifier.md` (phase 4), pas dans le texte.
2. **Anglais naturel**, pas calqué : on réécrit la phrase si nécessaire, sans changer le sens ni le nombre d'éléments (listes, lignes, options, cartes).
3. **Ce qui ne se traduit pas** : commandes (`oc …`, `kubectl …`), YAML et code hors commentaires, noms d'objets/CRD/opérateurs/API (`Route`, `MachineConfig`, `ClusterOperator`…), noms de produits, URL, emojis, `duration` (les nombres comptent, l'ordre des termes est libre).
4. **Ce qui se traduit** : tout texte, titres, `tag`, commentaires `# …` des blocs `code`, libellés SVG des `diagram`, `file` jamais (identique).
5. **Terminologie Red Hat** : employer le terme de la documentation anglaise Red Hat et de la console. Ne pas retraduire ce qui est déjà anglais dans le cours français (*Project*, *Route*, *control plane*, *worker*, *cattle*, *opinionated*, *vanilla*).

## Ton

- Tutoiement → **you** (jamais « one », « the user »). Impératif direct : *Click to flip…*, *Log in:*.
- Même registre direct, même dose d'humour et mêmes emojis que le français. Pas de formules plus corporate.
- Guillemets français « … » → guillemets typographiques anglais “…” (dans `html`/texte). Apostrophes droites échappées en JS (`\'`).
- Espaces avant `:` `?` `!` : supprimées en anglais. « n° » → « # » (*Diagnostic reflex #1*, *pitfall #1*).
- Titres de slide : casse de phrase (*What is OCP, really?*), pas de Title Case.
- Titre du cours : **OpenShift, from K8s to OCP** (`course.title`).

## Termes du cours

| Français | Anglais | Note |
|---|---|---|
| écart cloud | cloud gap | callout `cloud` |
| piège | pitfall | callout `trap` ; tag « piège n°1 » → *pitfall #1* |
| astuce | tip | callout `tip` |
| attention | warning | callout `warn` |
| on-prem / on-premise | on-prem / on-premises | *On-prem* en libellé court, *on-premises* en phrase |
| côté K8s / côté OCP | K8s side / OCP side | callouts `k8s`, `ocp` |
| à vérifier | to be verified | **même nombre** dans les deux langues ; contrôlé par `validate.js` |
| À retenir | Key takeaways | `recap.title` |
| À la fin de ce module | By the end of this module | `cover.objectives` |
| Réfléchis, puis clique | Think, then click | `block.reveal` |
| souscription | subscription | |
| déprécié / retiré | deprecated / removed | |
| mise à jour | update (cluster) ; upgrade quand la commande/doc dit *upgrade* (`oc adm upgrade`) | cohérent avec la doc Red Hat |
| nœud de calcul / worker | compute node / worker | |
| réseau déconnecté / isolé | disconnected / air-gapped | *disconnected* = terme officiel Red Hat |
| support (au sens Red Hat) | support | |
| multi-tenance | multi-tenancy | |
| cycle de vie | life cycle | deux mots, comme la doc Red Hat |
| jeu (tag) | game | |
| carrosserie (image du tagline) | bodywork | |
| colle (à maintenir) | glue | |
| dette d'intégration | integration debt | |
| réflexe n°1 de diagnostic | diagnostic reflex #1 | |
| suivi d'un déploiement | follows a rollout | verbe d'action en tête dans les tableaux `cmds` (3e personne) |

## Termes qui restent tels quels

OpenShift, OCP, OKD, SNO, K8s, Kubernetes, RHCOS, MachineConfig, MachineSet, MachineConfigPool, Cluster Operator, CVO, OLM, OperatorHub, SCC, PSA, Project, Route, Ingress, ImageStream, S2I, IPI/UPI, Assisted/Agent installer, Hosted Control Planes, MicroShift, ROSA/ARO/OSD, EUS, pull secret, must-gather, control plane, cattle, opinionated, vanilla, edge, passthrough/re-encrypt.

## Libellés de callouts (cohérents avec `assets/i18n.js`)

| Clé | fr | en |
|---|---|---|
| `callout.tip` | Astuce | Tip |
| `callout.warn` | Attention | Warning |
| `callout.trap` | Piège | Pitfall |
| `callout.cloud` | Écart cloud | Cloud gap |
| `callout.onprem` | On-prem | On-prem |
| `callout.k8s` | Côté K8s | K8s side |
| `callout.ocp` | Côté OCP | OCP side |

## Pièges de parité

- Garder le même nombre de lignes dans les listes, tableaux (`head`, `rows`), `options`, `cards`, `steps`, `nodes`, `layers`.
- Ne pas déplacer ni retirer un `caption`, `verdict`, `explain`, `goal`, `label`, `title`, `hl`, `base`, `frag`, `wide`, `tag`.
- Ne jamais modifier l'ordre des `options` d'un quiz : `answer` reste identique.
- Dans un bloc `code`, toute ligne non commentaire reste identique, y compris les espaces ; seuls les commentaires ` # …` (précédés d'un blanc, hors guillemets) se traduisent.
- Nouveau module en : ajouter sa balise `<script src="modules/en/…">` dans `index.html`, puis `node tools/i18n-hash.js --write mNN`.
- Titres de `assets/plan.js` : l'entrée `en` doit être identique au `title` du module en.

## Choix de traduction notables (pilote m01)

- `K8s vs OCP` reste tel quel (titre de module et de plan).
- *Même moteur, autre carrosserie* → *Same engine, different bodywork*.
- *Souplesse maximale… et dette d'intégration* → *Maximum flexibility… and integration debt*.
- *Sur-ensemble de kubectl* → *Superset of kubectl*.
- *Mises à jour par version mineure séquentielle* → *Sequential minor-version updates*.
