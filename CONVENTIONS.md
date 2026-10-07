# Conventions du support de cours OpenShift

Support **personnel**, en **français**, pour un lecteur qui maîtrise déjà Kubernetes (ne PAS réexpliquer Pod/Deployment/Service…).
Contexte : **on-premise** (bare metal, vSphere). Chaque fois qu'un point diffère fortement en cloud managé (ROSA/ARO/OSD) ou en IaaS cloud, ajouter un callout `cloud`. Les points propres à l'on-prem (LB, DNS, stockage, air-gap, firmware…) utilisent un callout `onprem`.
Ton : direct, pédagogique, un peu ludique (emojis avec parcimonie, quiz, jeux de cartes), jamais condescendant. Référence de style : `modules/fr/m01-k8s-vs-ocp.js`.
Référence de **périmètre** (frontières entre modules, durées, labs, renvois) : `docs/PLAN.md`. Ce fichier-ci reste la référence de **forme** (schéma des modules et des blocs).

## Fichiers

- `index.html` : charge le moteur, le manifeste et un `<script>` par module **existant** (deux langues : `modules/fr/` et `modules/en/`). `dev-course` peut **uniquement** ajouter (ou retirer) une balise `<script>` du module qu'il crée dans les deux langues ; tout autre changement est signalé. Ne jamais référencer un module absent (404).
- `assets/plan.js` : manifeste des 16 modules du plan (`COURSE.plan`). Le sommaire affiche tout le plan ; un module du manifeste sans `<script>` chargé apparaît grisé « à venir » et n'est pas ouvrable. À la création d'un module : ajouter sa balise `<script>` dans `index.html` (l'entrée du manifeste existe déjà).
- `assets/engine.js`, `assets/style.css`, `assets/i18n.js` : moteur et localisation. Ne pas modifier sans le signaler.
- `modules/<lang>/mNN-nom.js` : un module par langue (`<lang>` ∈ `fr`, `en`) = un appel `COURSE.add({...})`. Voir section « Langues » ci-dessous pour les règles bilingues.
- `tools/validate.js` : `node tools/validate.js [--root <dir>] [--strict-i18n]` vérifie le schéma des modules et la parité fr/en. À lancer avant de rendre la main. Voir section « Langues » pour les options.

## Schéma d'un module

```js
COURSE.add({
  id: 'm05', num: 5, emoji: '📈',
  lang: 'fr',                             // 'fr' ou 'en' — obligatoire, doit égaler le dossier (modules/fr/ ou modules/en/)
  title: 'Supervision & monitoring',      // texte brut (pas de HTML)
  tagline: 'Une phrase d'accroche.',      // HTML autorisé
  duration: '≈ 45 min + lab 15 min',  // exposé + lab en séance (texte libre) — NON traduit
  objectives: ['…', '…'],                 // 3 à 5 objectifs — texte traduit
  slides: [ { title, tag?, layout?, blocks: [...] }, … ],
  takeaways: ['…']                        // 4 à 6 points « À retenir » — texte traduit
});
```

Le moteur génère seul la slide de couverture (titre, objectifs) et la slide « À retenir » (avec le score des quiz).
**Cible : 16 à 22 slides par module** (module 00 : 14 à 16), dont au moins 1 slide de quiz (2 à 3 quiz) et 1 lab (module 15 exclu).
`duration` suit le format `'≈ X min + lab Y min'` (budget : `docs/PLAN.md` §2). Sans lab en séance (module 00, préparation avant J1 ; module 15) : `'≈ 30 min'` seul. Le lab du module 00 reste obligatoire (en autonomie, hors budget).
Le `title` d'une slide est du **texte brut** (pas de HTML, pas de backticks). `tag` est un petit badge optionnel (« lab », « piège n°1 », « quiz »).
`layout: 'two'` met les blocs sur 2 colonnes ; `wide: true` sur un bloc le fait occuper toute la largeur.
`frag: true` sur un bloc (ou une liste) le fait apparaître progressivement au clic/→ (à utiliser pour les listes de points et les layers, pas partout).

## Blocs disponibles (`t:`)

Tous acceptent `frag` et `wide`. Les champs « HTML » acceptent `<b> <i> <em> <strong> <code> <br> <a> <span class="tag cloud"> <ul> <ol> <li> <p> <kbd> <sub> <sup> <mark> <small> <pre>` (liste blanche contrôlée par `tools/validate.js`).

| `t` | Champs | Usage |
|---|---|---|
| `text` | `html` | Paragraphe d'intro. |
| `bullets` | `items:[html]` | Liste à puces (≤ 6 items, courts). |
| `code` | `code`, `lang`, `file?`, `caption?` | Bloc terminal/YAML. Les lignes `$ cmd` ont le prompt masqué à la copie ; les lignes `# …` sont grisées. Texte BRUT (pas de HTML). |
| `cmds` | `items:[[cmd, html desc]]` | Tableau de commandes. `cmd` est du texte brut. |
| `table` | `head:[html]`, `rows:[[html]]` | Comparatifs, mappings. ≤ 10 lignes. |
| `compare` | `left:{title,items}`, `right:{title,items}`, `verdict?` | Deux colonnes (gauche bleu, droite rouge). |
| `callout` | `kind`, `html`, `title?` | `tip` 💡, `warn` ⚠️, `trap` 🪤, `cloud` ☁️ (écart cloud), `onprem` 🏢, `k8s` ☸️, `ocp` 🔴. |
| `flow` | `nodes:[string \| {label, sub?, hl?}]`, `caption?` | Chaîne horizontale de boîtes avec flèches (processus, séquences). |
| `layers` | `items:[{name, desc, hl?, base?}]` | Pile de couches (architecture), de haut en bas. |
| `cards` | `items:[{front, back}]` | Cartes retournables (jeu de vocabulaire). |
| `quiz` | `q`, `options:[html]`, `answer` (index), `explain` | QCM à réponse unique, 3 à 4 options, explication utile. |
| `reveal` | `label?`, `html` | « Réfléchis puis clique » (réponse cachée). |
| `lab` | `title`, `goal?`, `steps:[html]` | TP à cocher (5 à 9 étapes concrètes). |
| `diagram` | `html` (SVG ou HTML), `caption?` | Schéma custom, SVG responsive (`viewBox`, pas de largeur fixe), couleurs via `currentColor` ou variables CSS (`var(--accent)`, `var(--border)`, `var(--surface)`, `var(--text)`, `var(--muted)`). |

Pas de HTML dans les blocs `code` et `cmds[0]` : le moteur échappe. **Tous les autres champs sont du HTML brut** : un chevron littéral (`<version>`, `<pool>`) s'écrit `&lt;version&gt;` ; `node tools/validate.js` rejette toute balise hors liste blanche (sauf `html` des `diagram`). Dans les chaînes JS, préférer les apostrophes échappées (`\'`) ou des guillemets doubles ; attention aux backticks dans les template literals.

## Exigences de contenu

- **Exact et à jour** : **version de référence OpenShift 4.20 EUS** (cf. `docs/PLAN.md` §1.1). Dater tout comportement introduit ou retiré autour de 4.18–4.22. Si un point dépend de la version ou n'est pas certain, le dire (« à confirmer dans les release notes ») plutôt qu'affirmer ; en bilingue, utiliser le marqueur « à vérifier » / « to be verified » dans un callout pour signaler une incertitude factuelle qui sera relue en phase 4. Ne jamais inventer d'option de CLI ou de champ YAML.
- Commandes `oc` et YAML **réalistes et copiables**.
- Un **lab** et un **quiz** par module, avec des pièges réalistes (erreurs fréquentes d'un admin qui vient de K8s).
- **Labs** : le premier `step` est le prérequis d'environnement (E0 à E3, cf. `docs/PLAN.md` §3) avec renvoi au module 00 ; noyau en séance, étapes facultatives en fin de lab marquées « (bonus) ».
- **Renvois** : toujours au format « module NN » sur deux chiffres (« module 09 »), numéros stables ; **un sujet = un module propriétaire** (`docs/PLAN.md` §6), les autres n'en gardent qu'une slide au plus et renvoient.
- Distinguer par callout : `onprem` (ce qui est à ta charge sur ton infra), `cloud` (ce qui change en cloud managé), `trap` (erreurs classiques), `tip` (astuces).
- Éviter les murs de texte : une idée par slide, 2 à 4 blocs, mélange de formats (pas que des listes).
- Chaque module termine par `quiz` puis `lab`, puis les `takeaways`.

## Liste des modules (id → fichier)

| num | id | fichier fr | fichier en | sujet |
|---|---|---|---|---|
| 00 | m00 | modules/fr/m00-environnement.js | modules/en/m00-environnement.js | Environnement de lab |
| 01 | m01 | modules/fr/m01-k8s-vs-ocp.js | modules/en/m01-k8s-vs-ocp.js | K8s vs OCP |
| 02 | m02 | modules/fr/m02-architecture.js | modules/en/m02-architecture.js | Architecture |
| 03 | m03 | modules/fr/m03-installation.js | modules/en/m03-installation.js | Installation |
| 04 | m04 | modules/fr/m04-configuration.js | modules/en/m04-configuration.js | Configuration |
| 05 | m05 | modules/fr/m05-monitoring.js | modules/en/m05-monitoring.js | Supervision & monitoring |
| 06 | m06 | modules/fr/m06-rbac.js | modules/en/m06-rbac.js | HBAC / RBAC |
| 07 | m07 | modules/fr/m07-reseau.js | modules/en/m07-reseau.js | Réseau |
| 08 | m08 | modules/fr/m08-stockage.js | modules/en/m08-stockage.js | Stockage |
| 09 | m09 | modules/fr/m09-securite.js | modules/en/m09-securite.js | Sécurité avancée |
| 10 | m10 | modules/fr/m10-cicd-gitops.js | modules/en/m10-cicd-gitops.js | CI/CD & GitOps |
| 11 | m11 | modules/fr/m11-backup-dr.js | modules/en/m11-backup-dr.js | Backup & reprise d'activité |
| 12 | m12 | modules/fr/m12-jour2.js | modules/en/m12-jour2.js | Opérations jour 2 |
| 13 | m13 | modules/fr/m13-virt-serverless.js | modules/en/m13-virt-serverless.js | Virtualisation & Serverless (parts égales) |
| 14 | m14 | modules/fr/m14-best-practices.js | modules/en/m14-best-practices.js | Best practices (check-list de mise en production) |
| 15 | m15 | modules/fr/m15-aide-memoire.js | modules/en/m15-aide-memoire.js | Aide-mémoire & quiz final |

## Langues — Cours bilingue fr/en (v1.0.0+)

Le cours est publié en deux langues : français et anglais. Cette section décrit le contrat de données et les règles de synchronisation entre les deux versions.

### Arborescence et dossiers

Les modules sont organisés par langue :

```
modules/
  ├── fr/
  │   ├── m00-environnement.js
  │   ├── m01-k8s-vs-ocp.js
  │   └── … (16 fichiers)
  └── en/
      ├── m00-environnement.js      # même nom de fichier
      ├── m01-k8s-vs-ocp.js
      └── … (16 fichiers)
```

**Règle** : le slug du fichier (ex. `m00-environnement`) doit être **identique** dans `modules/fr/` et `modules/en/`, même si le titre traduit diffère.

### Champ obligatoire `lang`

Chaque module porte un champ `lang` qui **doit correspondre** au dossier parent :

```js
COURSE.add({
  id: 'm05', num: 5, lang: 'fr',
  title: 'Supervision & monitoring',
  // … reste du schéma
});

// modules/en/m05-monitoring.js
COURSE.add({
  id: 'm05', num: 5, lang: 'en',
  title: 'Supervision & Monitoring',
  // … parité structurelle avec le fichier fr
});
```

Contrôle : `node tools/validate.js` **exige** le champ `lang` (erreur s'il manque) et veille à ce que `lang` = dossier parent. Le défaut `'fr'` n'existe qu'au niveau du moteur (`COURSE.add` dans le code du module).

### Règle : index.html et chargement des modules en

Chaque module crée (qu'il soit en français ou en anglais) **doit être référencé** dans `index.html` par une balise `<script>` :

```html
<!-- français -->
<script src="modules/fr/m05-monitoring.js"></script>
<!-- anglais -->
<script src="modules/en/m05-monitoring.js"></script>
```

**Validation** :
- `node tools/validate.js` : module fr ou en non référencé par `<script>` → **avertissement** (exit 0).
- `node tools/validate.js --strict-i18n` : module en non référencé → **erreur** (exit 1, rejet en PR et release).

Le message d'erreur indique exactement quelle balise ajouter. En phase de traduction sur `feature/i18n`, tant que tous les modules en ne sont pas traduits, le avertissement est normal (la balise attend le fichier).

### Parité structurelle (contrat D1)

Les deux versions d'un même module doivent être **structurellement identiques**. `node tools/validate.js --strict-i18n` (ou simplement `validate` sur un dépôt complet) contrôle :

**Invariants (identiques fr/en)** :
- `id`, `num`, `emoji`
- `duration` (format du budget en heures/minutes, NE SE TRADUIT PAS) — **normalisée aux chiffres** : « ≈ 60 min + lab 20 min » et « ≈ 60 min + 20 min lab » sont considérés comme identiques (l'ordre des termes et les espaces variables sont acceptés)
- Nombre et ordre des `objectives`, `takeaways`, `slides`
- Pour chaque slide : `layout`, présence de `tag`, nombre et type de `blocks`, ordre des blocs
- Pour chaque bloc : `frag`, `wide`, `kind`
- Cardinalités : nombre d'`items`, de `rows`, de `head`, d'`options`, de `steps`, de `nodes`, de cartes, de couches
- Champs optionnels : si un bloc a `caption`, `verdict`, `goal`, `explain`, `label`, `title`, ou `compare.*title` en français, il doit aussi les avoir en anglais (avec le contenu traduit, mais la structure doit être identique)
- Contenus structurels : `answer` (index du quiz, l'ordre des options ne change pas), `cmds[i][0]` (commande elle-même), `lang` des blocs `code` (voir section « Ne se traduit pas » pour le champ `file`)
- Propriétés de graphes : `hl` (highlight) et `base` des `flow` et `layers` doivent être aux mêmes positions
- Marqueurs d'incertitude : nombre de « à vérifier » (fr) et « to be verified » (en), même nombre dans les deux fichiers

**Se traduit** :
- `title`, `tagline`, `objectives`, `takeaways`
- Tous les textes : titres de slide, HTML des blocs `text`, `bullets`, `table`, `compare`, `callout`, `flow`, `layers`, `cards`, `quiz`, `reveal`, `lab`, libellés SVG des `diagram`
- Commentaires `# …` des blocs `code` (un `#` précédé d'un espace : `cmd  # commentaire`) — voir limite ci-dessous

**NE se traduit PAS** :
- Noms de commandes, YAML (sauf commentaires), noms d'objets/CRD/opérateurs OpenShift
- Format et valeurs de `duration` (ex. `'≈ 45 min + lab 15 min'`)
- Lignes de code — structure, commandes, variables, identifiants
  - **Sauf commentaires** : un `#` précédé d'un espace en fin de ligne peut être traduit (ex. `echo hello  # ceci se traduit`)
  - **Sauf texte visible des YAML** : dans un bloc `code` (YAML, y compris dans un heredoc d'un autre langage comme `bash`), les **valeurs sur une seule ligne** des clés `message`, `summary`, `text`, `description`, `displayName` sont **traduites** (fr en français, en en anglais) ; la **clé reste identique**. Valeurs multilignes (`message: |…`) : seule la ligne `message: |` est libre, le contenu multi-ligne reste comparé strictement. Toute autre clé garde la comparaison stricte (identifiants, noms d'objets, commandes). Les valeurs libres restent **neutres et anglais dans les deux langues**, modifiées dans le **même commit fr + en** si neutralisées pour la première fois (ex. `mot-de-passe-a-definir` → `change-me` en fr et en) ; l'identifiant neutralisé l'est **dans tous les modules** qui le citent.
  - **Sauf commentaires `;`** (zones DNS) : supprimés UNIQUEMENT dans un bloc contenant une ligne d'enregistrement DNS (ligne avec `… IN A|AAAA|CNAME|MX|NS|PTR|SOA|SRV|TXT …`) ; ailleurs (INI, shell, etc.), `;` reste du code comparé.
- **Champ `file` des blocs `code`** : comparé partiellement selon sa forme
  - Si le champ commence par un mot ressemblant à un nom de fichier (regex `^[\w./-]+\.[A-Za-z0-9]+$` ou contient `/`) : seul ce premier mot est comparé ; le reste (description, précision entre parenthèses) se traduit
  - Si le champ est un seul mot (`terminal`, `motd`) : comparé intégralement (c'est un identifiant)
  - Si le champ contient plusieurs mots sans ressembler à un nom de fichier (« zone DNS (exemple BIND) ») : non comparé (peut se traduire librement)

**Liste blanche des clés YAML traduisibles** : `message`, `summary`, `text`, `description`, `displayName`. Pour une ligne `clé: valeur` dont la clé figure dans cette liste, la **clé reste identique** et la **valeur se traduit**. Toute autre clé garde la comparaison stricte (identifiants, noms d'objets, commandes). Exemples :

```yaml
# Bloc code fr
message: "Alerte détectée"
name: "mon-alerteur"

# Bloc code en — parité validée par validate.js
message: "Alert detected"
name: "mon-alerteur"  # identique
```

Aucune clé n'est ajoutée à la liste blanche sans décision explicite de l'utilisateur.

Exemple de parité cassée : ajouter une diapositive à l'une seulement, retirer une option d'un quiz, changer un label `kind` de callout → `validate.js` rejet.

### Marqueur « à vérifier » ↔ « to be verified »

Le marqueur « **à vérifier** » (fr) ↔ « **to be verified** » (en) est **réservé aux incertitudes factuelles**. Il signale un fait qui n'a pas pu être confirmé par rapport à la doc Red Hat et qui devra être vérifié en relecture technique (phase 4).

**Règle stricte** : `validate.js` compte **chaque occurrence** de « à vérifier » comme un marqueur et exige un équivalent exact « to be verified » en anglais. Si vous utilisez « à vérifier » pour autre chose (consigne, titre de point à contrôler), le contrôle échouera.

**Usages ordinaires** (à utiliser à la place) :
- Pour une consigne ou un titre de section : « à contrôler » (fr) / « check » ou « to verify » (en, pas « to be verified »)
- Pour une action à faire ultérieurement : « à confirmer » (fr) / « to confirm » (en)
- Pour une vérification en général : « vérifier que… » (fr) / « verify that… » (en)

Exemple d'usage correct du marqueur :
```js
// modules/fr/m05-monitoring.js
{ t: 'callout', kind: 'warn', html: 'À vérifier sur OCP 4.20 : les alertes natives…' }

// modules/en/m05-monitoring.js
{ t: 'callout', kind: 'warn', html: 'To be verified on OCP 4.20: native alerts…' }
```

Contrôle : `validate.js` compte les occurrences de « à vérifier » (fr) et « to be verified » (en) et exige une parité exacte. Toute autre forme de ces termes n'est pas comptée comme marqueur.

### Localisation (`assets/i18n.js`)

Les libellés du moteur et de l'interface utilisateur sont centralisés dans `assets/i18n.js`, chargé avant les modules :

```js
COURSE.i18n = {
  fr: {
    'course.title': 'OpenShift, du K8s à OCP',
    'callout.tip': 'Astuce',  // emoji ajouté par le moteur
    'callout.warn': 'Attention',
    'callout.trap': 'Piège',
    'callout.cloud': 'Écart cloud',
    'callout.onprem': 'On-prem',
    'callout.k8s': 'Kubernetes',
    'callout.ocp': 'OpenShift',
    'export.footer': 'OpenShift — Module {nn} · {title}',
    'export.quizAnswer': '🎯 QUIZ — réponse : {letter}. {answer}',  // emoji en clé
    'export.term': 'Terme',
    'export.definition': 'Définition',
    // … autres clés
  },
  en: {
    'course.title': 'OpenShift, from K8s to OCP',
    'callout.tip': 'Tip',
    'callout.warn': 'Warning',
    'callout.trap': 'Pitfall',
    'callout.cloud': 'Cloud gap',
    'callout.onprem': 'On-prem',
    'callout.k8s': 'Kubernetes',
    'callout.ocp': 'OpenShift',
    'export.footer': 'OpenShift — Module {nn} · {title}',
    'export.quizAnswer': '🎯 QUIZ — Answer: {letter}. {answer}',
    'export.term': 'Term',
    'export.definition': 'Definition',
    // … autres clés
  }
};
```

**Règles** :
- Clés en **notation pointée** (ex. `'callout.tip'`, `'export.footer'`).
- **Mêmes clés** dans `fr` et `en` — jamais de clé qui manquerait dans une langue.
- **Paramètres** entre accolades (`{nn}`, `{title}`, `{letter}`, `{answer}`) : mêmes noms dans les deux langues.
- Les **emojis** de callouts sont **ajoutés par le moteur** (`engine.js`), **non inclus** dans la valeur i18n.js (sauf pour certaines clés `export.*` comme `export.quizAnswer` qui portent un emoji préfixe).

Validation : `validate.js` contrôle la **parité des clés** (mêmes clés fr/en) et la correspondance des **paramètres** entre les deux langues (mêmes noms de `{…}`). Il ne contrôle pas l'usage des clés dans les modules (ce contrôle se ferait à l'exécution).

### Titres bilingues (`assets/plan.js`)

Le manifeste `assets/plan.js` contient les titres du plan, un par module. Depuis v1.0.0, les titres sont bilingues :

```js
COURSE.plan = [
  { id: 'm00', num: 0, emoji: '🔧', title: { fr: 'Environnement de lab', en: 'Lab environment' } },
  { id: 'm01', num: 1, emoji: '⚖️', title: { fr: 'K8s vs OCP', en: 'K8s vs OCP' } },
  // … 16 modules
];
```

Contrôle : `validate.js` vérifie que chaque titre **et emoji** dans `plan.js` correspond exactement au titre **et emoji** du module pour les deux langues. L'emoji et le titre français doivent correspondre au module fr (`id` et `num`), et le titre anglais au module en ; l'emoji est unique (identique fr/en).

### Empreinte de source (`source`) et synchronisation

Chaque module en porte une empreinte du fichier fr d'origine, stockée dans le champ `source` :

```js
// modules/en/m05-monitoring.js
COURSE.add({
  id: 'm05', num: 5, lang: 'en',
  source: '3a7f5b2c1e8d',  // 12 premiers caractères hex du sha256 du fichier fr/m05-monitoring.js
  title: 'Supervision & Monitoring',
  // …
});
```

**Objectif** : détecter quand le fichier fr a changé sans que le fichier en ait été mis à jour.

**Outils** :
- `node tools/i18n-hash.js --write <mNN> [--root <dir>]` : recalcule l'empreinte d'un module après le modifier (lance automatiquement après une correction de fait).
- `node tools/i18n-hash.js --check [--root <dir>]` : liste les modules en dont l'empreinte est périmée (exit 1 si des modules périmés).

**Validation** :
- `node tools/validate.js` : empreinte périmée = **avertissement** (exit 0, ne pas rejeté une branche de dev).
- `node tools/validate.js --strict-i18n` : empreinte périmée = **erreur** (exit 1, rejet en PR vers `main` et à la release).

### Règle de commit — fr + en ensemble

**Quand un fait ou une commande doit être corrigé** dans un module (suite à la relecture technique), la correction s'applique **aux deux fichiers** (fr et en) **dans le même commit**, avec recalcul de l'empreinte :

```bash
# Corriger modules/fr/m05-monitoring.js et modules/en/m05-monitoring.js
git add modules/fr/m05-monitoring.js modules/en/m05-monitoring.js

# Recalculer l'empreinte du module en
node tools/i18n-hash.js --write m05

git add modules/en/m05-monitoring.js  # le champ `source` a changé
git commit -m "fix(content): alert thresholds in module 05 (per Red Hat 4.20 release notes)"
```

Même une retouche de tournure du français (amélioration sans changement de fait) rend l'empreinte du module en **périmée** : `validate.js --strict-i18n` échouera tant que `node tools/i18n-hash.js --write mNN` n'est pas relancé. Reformuler et recalculer dans le **même commit** (vérifier que l'en reste fidèle). Les faits doivent être **identiques** dans les deux langues.

### Options de validation

#### `--root <dir>`
Désigne le répertoire racine du dépôt (par défaut : `.`). Utile pour tester sur une copie ou dans un sous-arbre.

```bash
node tools/validate.js --root _work/tmp/i18n-test
```

#### `--strict-i18n`
Active les contrôles stricts i18n :
- Module en absent → **erreur** (au lieu de avertissement).
- Empreinte périmée → **erreur** (au lieu de avertissement).
- Module fr absent quand en existe → **erreur** (dans les deux modes).

Utilisé sur les PR vers `main` et à la release pour garantir la complétude et la synchronisation.

```bash
node tools/validate.js --strict-i18n
```

### Tests de parité (`tests/i18n/`)

Les tests de parité sont lancés avec `node tests/i18n/run.js`. Ils couvrent :
- Parité structurelle (fixtures valides)
- Parité cassée par chaque règle (une fixture par cas d'erreur)
- Empreinte et `i18n-hash.js --check`
- Marqueurs « à vérifier » ↔ « to be verified »
- Clés `i18n.js` présentes des deux côtés
- Titres `plan.js` = titres des modules

Procédure QA manuelle du sélecteur FR | EN : `tests/i18n/QA-SELECTEUR.md`.

### Export PowerPoint bilingue

Depuis v1.0.0, l'export produit **deux fichiers** `.pptx` :

```bash
node tools/export-pptx.js                           # produit les deux
#  → dist/openshift-course-X.Y.Z-fr.pptx
#  → dist/openshift-course-X.Y.Z-en.pptx

node tools/export-pptx.js --lang fr                 # français seul
#  → dist/openshift-course-X.Y.Z-fr.pptx

node tools/check-pptx.js --lang en                  # vérifie l'anglais
#  → Contrôle du fichier -en.pptx
```

Les libellés de l'export (couverture, pied de page, réponses de quiz, « À retenir » / « Key takeaways ») sont lus dans `assets/i18n.js`.

**[BREAKING]** : l'ancien asset `openshift-course-X.Y.Z.pptx` n'existe plus. La release et le site publient les deux fichiers : `-fr.pptx` et `-en.pptx`, accompagnés de leurs empreintes SHA256.

### Sélecteur de langue

L'interface utilisateur affiche un **sélecteur segmenté FR | EN** dans la barre du haut, juste avant le bouton thème. Tous les modules (fr et en, 32 balises `<script>`) sont **chargés d'emblée** par `index.html` ; le changement de langue sélectionne simplement l'ensemble à afficher. Le changement de langue :
- Mémorise le choix (clé `ocp-course-v1` du `localStorage`)
- Sélectionne le rendu de la langue choisie dans `COURSE.byLang[lang]`
- Garde l'utilisateur sur la même slide et le même nombre de fragments révélés
- Bascule le titre de la page et les libellés du moteur via `COURSE.setLang(lang)`

**Raccourci clavier** : `l` bascule entre fr et en.

**Repli** : pendant le développement sur `feature/i18n` (avant la fusion unique), si un module n'existe pas en anglais, le moteur affiche le module français + un bandeau « Not translated yet — showing French ». **Le code de repli reste dans le moteur** (filet de sécurité pour un module futur non traduit) ; seul le bandeau disparaît à la release quand tous les modules sont traduits.
