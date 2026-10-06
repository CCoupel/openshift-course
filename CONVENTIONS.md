# Conventions du support de cours OpenShift

Support **personnel**, en **français**, pour un lecteur qui maîtrise déjà Kubernetes (ne PAS réexpliquer Pod/Deployment/Service…).
Contexte : **on-premise** (bare metal, vSphere). Chaque fois qu'un point diffère fortement en cloud managé (ROSA/ARO/OSD) ou en IaaS cloud, ajouter un callout `cloud`. Les points propres à l'on-prem (LB, DNS, stockage, air-gap, firmware…) utilisent un callout `onprem`.
Ton : direct, pédagogique, un peu ludique (emojis avec parcimonie, quiz, jeux de cartes), jamais condescendant. Référence de style : `modules/m01-k8s-vs-ocp.js`.

## Fichiers

- `index.html` : charge le moteur et un fichier par module (déjà câblé, ne pas le modifier).
- `assets/engine.js`, `assets/style.css` : moteur. Ne pas modifier sans le signaler.
- `modules/mNN-nom.js` : un module = un appel `COURSE.add({...})`.
- `tools/validate.js` : `node tools/validate.js` vérifie le schéma des modules. À lancer avant de rendre la main.

## Schéma d'un module

```js
COURSE.add({
  id: 'm05', num: 5, emoji: '📈',
  title: 'Supervision & monitoring',      // texte brut (pas de HTML)
  tagline: 'Une phrase d'accroche.',      // HTML autorisé
  duration: '≈ 45 min',
  objectives: ['…', '…'],                 // 3 à 5 objectifs
  slides: [ { title, tag?, layout?, blocks: [...] }, … ],
  takeaways: ['…']                        // 4 à 6 points « À retenir »
});
```

Le moteur génère seul la slide de couverture (titre, objectifs) et la slide « À retenir » (avec le score des quiz).
**Cible : 16 à 22 slides par module**, dont au moins 1 slide de quiz (2 à 3 quiz) et 1 lab (module 15 exclu).
Le `title` d'une slide est du **texte brut** (pas de HTML, pas de backticks). `tag` est un petit badge optionnel (« lab », « piège n°1 », « quiz »).
`layout: 'two'` met les blocs sur 2 colonnes ; `wide: true` sur un bloc le fait occuper toute la largeur.
`frag: true` sur un bloc (ou une liste) le fait apparaître progressivement au clic/→ (à utiliser pour les listes de points et les layers, pas partout).

## Blocs disponibles (`t:`)

Tous acceptent `frag` et `wide`. Les champs « HTML » acceptent `<b> <i> <code> <br> <span class="tag cloud">…`.

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

Pas de HTML dans les blocs `code` et `cmds[0]` : le moteur échappe. Dans les chaînes JS, préférer les apostrophes échappées (`\'`) ou des guillemets doubles ; attention aux backticks dans les template literals.

## Exigences de contenu

- **Exact et à jour** (OpenShift 4.x récent). Si un point dépend de la version ou n'est pas certain, le dire (« à vérifier dans les release notes ») plutôt qu'affirmer. Ne jamais inventer d'option de CLI ou de champ YAML.
- Commandes `oc` et YAML **réalistes et copiables**.
- Un **lab** et un **quiz** par module, avec des pièges réalistes (erreurs fréquentes d'un admin qui vient de K8s).
- Distinguer par callout : `onprem` (ce qui est à ta charge sur ton infra), `cloud` (ce qui change en cloud managé), `trap` (erreurs classiques), `tip` (astuces).
- Éviter les murs de texte : une idée par slide, 2 à 4 blocs, mélange de formats (pas que des listes).
- Chaque module termine par `quiz` puis `lab`, puis les `takeaways`.

## Liste des modules (id → fichier)

| num | id | fichier | sujet |
|---|---|---|---|
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
| 13 | m13 | m13-virt-serverless.js | Virtualisation & Serverless |
| 14 | m14 | m14-best-practices.js | Best practices |
| 15 | m15 | m15-aide-memoire.js | Aide-mémoire & quiz final |
