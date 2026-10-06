# Conventions du support de cours OpenShift

Support **personnel**, en **français**, pour un lecteur qui maîtrise déjà Kubernetes (ne PAS réexpliquer Pod/Deployment/Service…).
Contexte : **on-premise** (bare metal, vSphere). Chaque fois qu'un point diffère fortement en cloud managé (ROSA/ARO/OSD) ou en IaaS cloud, ajouter un callout `cloud`. Les points propres à l'on-prem (LB, DNS, stockage, air-gap, firmware…) utilisent un callout `onprem`.
Ton : direct, pédagogique, un peu ludique (emojis avec parcimonie, quiz, jeux de cartes), jamais condescendant. Référence de style : `modules/m01-k8s-vs-ocp.js`.
Référence de **périmètre** (frontières entre modules, durées, labs, renvois) : `docs/PLAN.md`. Ce fichier-ci reste la référence de **forme** (schéma des modules et des blocs).

## Fichiers

- `index.html` : charge le moteur, le manifeste et un `<script>` par module **existant**. `dev-course` peut **uniquement** ajouter (ou retirer) la balise `<script>` du module qu'il crée ; tout autre changement est signalé. Ne jamais référencer un module absent (404).
- `assets/plan.js` : manifeste des 16 modules du plan (`COURSE.plan`). Le sommaire affiche tout le plan ; un module du manifeste sans `<script>` chargé apparaît grisé « à venir » et n'est pas ouvrable. À la création d'un module : ajouter sa balise `<script>` dans `index.html` (l'entrée du manifeste existe déjà).
- `assets/engine.js`, `assets/style.css` : moteur. Ne pas modifier sans le signaler.
- `modules/mNN-nom.js` : un module = un appel `COURSE.add({...})`.
- `tools/validate.js` : `node tools/validate.js` vérifie le schéma des modules. À lancer avant de rendre la main.

## Schéma d'un module

```js
COURSE.add({
  id: 'm05', num: 5, emoji: '📈',
  title: 'Supervision & monitoring',      // texte brut (pas de HTML)
  tagline: 'Une phrase d'accroche.',      // HTML autorisé
  duration: '≈ 45 min + lab 15 min',  // exposé + lab en séance (texte libre)
  objectives: ['…', '…'],                 // 3 à 5 objectifs
  slides: [ { title, tag?, layout?, blocks: [...] }, … ],
  takeaways: ['…']                        // 4 à 6 points « À retenir »
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

- **Exact et à jour** : **version de référence OpenShift 4.20 EUS** (cf. `docs/PLAN.md` §1.1). Dater tout comportement introduit ou retiré autour de 4.18–4.22. Si un point dépend de la version ou n'est pas certain, le dire (« à vérifier dans les release notes ») plutôt qu'affirmer. Ne jamais inventer d'option de CLI ou de champ YAML.
- Commandes `oc` et YAML **réalistes et copiables**.
- Un **lab** et un **quiz** par module, avec des pièges réalistes (erreurs fréquentes d'un admin qui vient de K8s).
- **Labs** : le premier `step` est le prérequis d'environnement (E0 à E3, cf. `docs/PLAN.md` §3) avec renvoi au module 00 ; noyau en séance, étapes facultatives en fin de lab marquées « (bonus) ».
- **Renvois** : toujours au format « module NN » sur deux chiffres (« module 09 »), numéros stables ; **un sujet = un module propriétaire** (`docs/PLAN.md` §6), les autres n'en gardent qu'une slide au plus et renvoient.
- Distinguer par callout : `onprem` (ce qui est à ta charge sur ton infra), `cloud` (ce qui change en cloud managé), `trap` (erreurs classiques), `tip` (astuces).
- Éviter les murs de texte : une idée par slide, 2 à 4 blocs, mélange de formats (pas que des listes).
- Chaque module termine par `quiz` puis `lab`, puis les `takeaways`.

## Liste des modules (id → fichier)

| num | id | fichier | sujet |
|---|---|---|---|
| 00 | m00 | m00-environnement.js | Environnement de lab |
| 01 | m01 | m01-k8s-vs-ocp.js | K8s vs OCP |
| 02 | m02 | m02-architecture.js | Architecture |
| 03 | m03 | m03-installation.js | Installation |
| 04 | m04 | m04-configuration.js | Configuration |
| 05 | m05 | m05-monitoring.js | Supervision & monitoring |
| 06 | m06 | m06-rbac.js | HBAC / RBAC |
| 07 | m07 | m07-reseau.js | Réseau |
| 08 | m08 | m08-stockage.js | Stockage |
| 09 | m09 | m09-securite.js | Sécurité avancée |
| 10 | m10 | m10-cicd-gitops.js | CI/CD & GitOps |
| 11 | m11 | m11-backup-dr.js | Backup & reprise d'activité |
| 12 | m12 | m12-jour2.js | Opérations jour 2 |
| 13 | m13 | m13-virt-serverless.js | Virtualisation & Serverless (parts égales) |
| 14 | m14 | m14-best-practices.js | Best practices (check-list de mise en production) |
| 15 | m15 | m15-aide-memoire.js | Aide-mémoire & quiz final |
