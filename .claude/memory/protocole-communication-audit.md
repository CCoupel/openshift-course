# Protocole de communication teamleader ↔ teammates : prescription, pratique, écarts

> Planner — 2026-10-07 — lecture seule (aucun fichier suivi modifié).
> Fichiers lus : `.claude/agents/context/TEAMMATES_PROTOCOL.template.md` (abrégé **TP**), `.claude/agents/teamleader.template.md` (**TL**), `.claude/agents/cdp.template.md` (**CDP**), `.claude/commands/context/CDP_WORKFLOWS.template.md` (**WF**), `.claude/agents/context/VALIDATION_COMMON.template.md` (**VC**), `CLAUDE.md` (**CM**), `.claude/agents/implementation-planner.template.md` (**IP**), les autres agents par grep.
> Mesures de pratique : extraction des transcriptions de session (`~/.claude/projects/<projet>/*.jsonl`) par un script temporaire sous `_work/tmp/`, supprimé en fin de tâche. Chiffres **approximatifs**, sur l'ensemble des échanges du 2026-10-06 au 2026-10-07.

---

## 1. Ce que le protocole prescrit

### 1.1 Adresse du teamleader
| Règle | Citation | Source |
|---|---|---|
| Adresse unique `main` | « son adresse `SendMessage` est **`main`** (c'est l'adresse la plus fiable). Tout message vers le teamleader s'écrit donc `SendMessage({ to: "main", ... })` » | TP:5-7 |
| Idem côté teamleader | « Le Claude principal IS le teamleader — adressable sous `main` » | TL:4 ; TL:73 |
| Gabarits de tous les agents | `SendMessage({ to: "main", … })` | TP:18, 27, 30, 132, 154 ; IP:23 ; code-reviewer:24 ; qa:26 ; security:23 ; infra:257 ; etc. (≈ 38 occurrences dans `.claude/agents/`) |

### 1.2 Où va la spécification de tâche (teamleader → teammate)
| Règle | Citation | Source |
|---|---|---|
| **Message complet** | `SendMessage({ to: "<nom-canonique>", content: "<tâche complète>" })` | CM:145 ; TL:35 |
| Contexte d'une phase précédente **par référence** | « dans tout SendMessage contenant du contexte d'une phase précédente, référencer le fichier handoff/rapport par son chemin — jamais copier le contenu inline » | CDP:143-145 |
| Gabarits de dispatch | « Implemente : [tache precise du batch] / Handoff planner : _work/handoff/planner-[timestamp].md / … / Reponse : DONE/FAILED + fichiers modifies + SHA commit. » | CDP:286-295 ; WF:383-400 ; WF:419-432 ; WF:533-542 |
| Le teammate lit les fichiers référencés | « Si la tâche référence un handoff (`_work/handoff/...`) ou un rapport (`_work/reports/...`) → lire le fichier avant de commencer » | TP:122 |
| **Aucune limite de taille** du message de tâche ; **aucun fichier de tâche** prévu (pas de `_work/tasks/`) | — | (absence) |

→ Le protocole prescrit donc un message de tâche **autoporteur** (« tâche complète »), où le contexte hérité est donné **par référence**. Le gabarit CDP:286 suggère une forme courte de 5 à 8 lignes.

### 1.3 Où vont les résultats
| Règle | Citation | Source |
|---|---|---|
| Tout en fichier | « **Tout résultat est écrit dans un fichier. Jamais de contenu inline dans un message.** » | TP:38 |
| Emplacements | « planner, code-reviewer, qa, security → Rapport → `_work/reports/[agent]-[YYYYMMDD-HHmmss].md` ; Tous → Handoff → `_work/handoff/[agent]-[YYYYMMDD-HHmmss].md` ; dev-*, test-writer → Code commité → SHA uniquement » | TP:41-44 |
| Relire avant d'envoyer | « Ecrire le rapport complet dans `_work/reports/…` ; Relire le fichier ecrit… ; Envoyer au teamleader uniquement la reference » | VC:53-56 |

### 1.4 Contenu autorisé des messages
| Message | Prescription | Source |
|---|---|---|
| **ACTIF** | `[NOM] ACTIF`, au démarrage et à **chaque** tâche reçue, avant d'agir | TP:18, 27, 118 |
| **DONE** | « `[NOM] DONE` / `Handoff : …` / `Rapport : …` (si applicable) / `SHA : …` (si applicable) » ; « Un `DONE` valide ne contient **jamais** de contenu inline (code, diff, extraits). Format attendu : références fichiers uniquement » | TP:46-52 ; CM:191-192 ; TL:62-63 |
| Variantes tolérées | « Reponse : DONE/FAILED + fichiers modifies + SHA commit » ; « Retourne : APPROVED / … + rapport » (verdict en un mot) | CDP:294 ; WF:425 |
| **EN COURS** | « `[NOM] EN COURS — <unité> i/N (<nom>) — <mesure>, <anomalies>` » ; « Un jalon = une ligne, métadonnées uniquement » ; « Obligatoire dès que la tâche compte plus d'une unité significative » | TP:132, 137, 139 |
| **BLOQUE** | `[NOM] BLOQUE` + `Raison :` une ligne + `Rapport :` + `Questions :` (1 à 4, 2 à 4 options chacune, une « (Recommandé) », conséquence par option) ; le contexte long va dans le rapport, « jamais inline » | TP:54-97 |
| Taille | Aucun plafond chiffré ; seulement « une ligne » (EN COURS, Raison) et « références uniquement » (DONE) | TP:56, 137 |

### 1.5 Format et préfixes
| Règle | Citation | Source |
|---|---|---|
| Préfixe = libellé court | « `[NOM]` est le libellé court que `cdp.md` utilise pour dispatcher et attendre cet agent (ex. `doc-updater` répond `DOC DONE`…) — jamais de synonyme improvisé » | TP:105-111 |
| Mots-clés | `ACTIF`, `DONE`, `EN COURS`, `BLOQUE`, (`BLOCKED`/`FAILED` pour le planner), états propres documentés des deux côtés | TP:105-111, 141 ; IP:20-45 |
| Préfixe côté teamleader | **Aucun** (pas de `TÂCHE :` prescrit) | (absence) |

### 1.6 Rôle de `_work/handoff/`
| Point | Ce que disent les textes | Source |
|---|---|---|
| Qui l'écrit | **Les teammates** (« Tous | Handoff ») ; les sous-agents aussi | TP:44, 196 |
| Qui le lit | Le teamleader (« lecture autorisée pour valider les livrables ») et les teammates suivants | CDP:53 ; TP:122 |
| Le teamleader peut-il y écrire ? | **Non** : `Edit`/`Write`/`MultiEdit` interdits sans exception ; Read seul autorisé sur `_work/handoff/*.md` | CM:128-135 ; CDP:45, 53 |
| Contenu attendu | **Non défini** : aucun gabarit de handoff dans les fichiers lus | (absence) |
| Handoff du planner | Référencé partout (« Handoff planner : _work/handoff/planner-[timestamp].md ») **alors que** le DONE du planner ne produit qu'un `Rapport : _work/reports/plan-…md` | CDP:289, 302, 439 ; WF:387-431 vs IP:23 |
| Cycle de vie | `_work/` gitignoré, purgé au `/start-session` | end-session:145 ; start-session:56 |

### 1.7 Notifications d'inactivité / « dernier tour »
- **Aucune règle** dans les fichiers lus sur les `idle_notification`, sur le texte de fin de tour d'un teammate ou sur un message « dernier tour ». Le seul point voisin : « Rester en IDLE après DONE — ne pas fermer ce pane » (TP:120).
- Le protocole suppose implicitement que seul `SendMessage` transporte de l'information ; il ignore que la plateforme renvoie au teamleader le **texte final** du tour du teammate (champ `result` de l'`idle_notification`).

---

## 2. La pratique dans cette session (approximative)

| Indicateur | Mesure | Commentaire |
|---|---|---|
| Messages teamleader → teammates | **≈ 183** (dev-course 63, code-reviewer 40, deployer 29, qa 26, doc-updater 10, dev-export 8, planner 4, test-writer 2) | |
| Taille des messages de tâche | médiane **≈ 1 360 caractères**, 118 > 1 000, 44 > 2 000, 3 > 4 000 (max ≈ 5 000) | Tâches longues, détaillées inline |
| Préfixe `TÂCHE :` | ≈ 125 / 183 | Convention de fait, non prescrite |
| Références dans les tâches | `_work/reports/` cité ≈ 144 fois ; `_work/handoff/` **1 fois** | Le handoff n'existe pas en pratique |
| Dossier `_work/handoff/` | **absent** ; `_work/reports/` ≈ 122 fichiers | Tous les livrables sont des « rapports » |
| Messages teammates → teamleader (hors inactivité) | ≈ 250 (dev-course 74, code-reviewer 73, qa 48, deployer 28…) | |
| DONE | ≈ 159, médiane **≈ 635 caractères**, **134 > 300** (max ≈ 2 100) | Références **+ résumé** quasi systématique |
| ACTIF | ≈ 71, alors que les tâches reçues sont plus nombreuses | ACTIF souvent omis ou fusionné avec le DONE |
| EN COURS | ≈ 11 | Rare, malgré des tâches multi-unités (rédaction de module, QA) |
| BLOQUE / BLOCKED | 2 | |
| `idle_notification` reçues | **≈ 153**, médiane **≈ 1 650 caractères**, 130 > 1 000 (max ≈ 3 100) | Chaque fin de tour d'un teammate remonte son texte final : c'est un second résumé, en doublon du DONE |
| Corrections « Rapport invalide » | 0 | La règle de validation des DONE n'a jamais été appliquée |
| Premier envoi à `main` | échec pour **chaque** teammate (« You are the main conversation… »), puis bascule sur `team-lead` | Adresse prescrite inutilisable |
| Planner (ce teammate) | 8 envois : ACTIF/DONE de 13 à 60 caractères (conformes), 1 accusé de règle de 447 caractères ; mais un **long texte de fin de tour** à chaque tâche, remonté en `idle_notification` (≈ 2 000 caractères) | |

---

## 3. Écarts, classés par gravité

### Critique
1. **Adresse `main` inutilisable** (TP:5-7 et ≈ 38 gabarits). Chaque teammate perd un envoi, puis improvise `team-lead`. Le protocole affirme le contraire de la réalité.
   → Remplacer `main` par **`team-lead`** dans TP, TL, CM et tous les gabarits d'agents (ou utiliser une variable `{{LEAD}}` résolue au `/start-session`), et supprimer la phrase « c'est l'adresse la plus fiable ».
2. **Double canal de résultat** : DONE avec résumé (médiane 635 car.) **plus** `idle_notification` longue (médiane 1 650 car.). Le principe « tout en fichier, références seulement » (TP:38) est contourné deux fois par message, ce qui coûte du contexte au teamleader. C'est précisément ce que le protocole voulait éviter.
   → Teammates : DONE strict (gabarit §3.6) **et** texte de fin de tour réduit à une ligne (« `[NOM] IDLE — voir DONE` »). Teamleader : lire le rapport, ignorer le `result` des `idle_notification`.

### Majeur
3. **`_work/handoff/` mort** : jamais écrit, alors que WF et CDP le référencent partout (« Handoff planner ») et que le planner ne produit qu'un rapport. Les gabarits de dispatch pointent donc vers des fichiers inexistants.
   → Soit **supprimer** le handoff et utiliser `_work/reports/` partout (le plus simple, déjà la pratique), soit le **définir** (gabarit §3.6) et l'imposer dans les DONE de chaque agent, planner compris.
4. **Tâches longues inline** (médiane 1 360 car., jusqu'à 5 000). C'est conforme à la lettre de CM:145 (« tâche complète »), mais contraire à l'esprit de CDP:143 dès qu'elles recopient du contexte (décisions utilisateur, extraits de rapport). Le teamleader ne peut pas écrire de fichier de tâche (Write interdit).
   → Gabarit de tâche court (§3.6), plafonné à **≈ 800 caractères** ; tout contexte au-delà va dans un fichier référencé (voir §4.3 pour savoir qui l'écrit).
5. **Validation des DONE jamais appliquée** (0 « Rapport invalide » sur 134 DONE avec contenu inline). La règle CM:194-199 est restée lettre morte.
   → Soit l'appliquer, soit l'assouplir officiellement (voir §4.4 : verdict d'une ligne autorisé).

### Mineur
6. **ACTIF omis** (≈ 71 pour davantage de tâches). → Rendre l'ACTIF facultatif pour les tâches courtes (< 1 tour), ou l'exiger strictement ; aujourd'hui l'usage est flou.
7. **Jalons EN COURS rares** (≈ 11) malgré des tâches multi-unités. → Rappeler TP:139 dans le gabarit de tâche (« jalons : 1 par module/lot »).
8. **Préfixe `TÂCHE :`** utilisé mais non prescrit, et `[NOM]` des DONE inégal (`PLANNER DONE` conforme ; d'autres variantes non mesurées). → Prescrire `TÂCHE <id> :` côté teamleader, ce qui permet de corréler tâche et DONE.
9. **Références de fichiers cassées** : TP, TL et les agents citent `TEAMMATES_PROTOCOL.md`, `cdp.md`, `teamleader.md`, `implementation-planner.md`, alors que seuls les `.template.md` existent (CM:70 dit pourtant que le compagnon `.md` est optionnel). → Pointer vers les `.template.md`.

### 3.6 Gabarits proposés pour être conforme

**Tâche (teamleader → teammate)**, ≤ 800 caractères :
```
TÂCHE T<nn> — <titre court>
Entrées : <chemins à lire : docs/PLAN.md, _work/reports/…, contrats>
Attendu : <livrable(s) + chemin(s) exact(s)>
Contraintes : <2–4 puces max ; décisions utilisateur par référence si > 2 lignes>
Jalons : <unité> (ou « aucun »)
Retour : `[NOM] DONE` + références uniquement, à team-lead
```

**ACTIF / EN COURS / DONE / BLOQUE (teammate → team-lead)** :
```
[NOM] ACTIF T<nn>
[NOM] EN COURS T<nn> — <unité> i/N (<nom>) — <mesure>, <anomalies>
[NOM] DONE T<nn>
Rapport : _work/reports/<agent>-<YYYYMMDD-HHmmss>.md
SHA : <sha>                        (si commit)
Verdict : <mot-clé>                (si l'agent en rend un : APPROVED, VALIDATED…)
[NOM] BLOQUE T<nn>  (format TP:73-86 inchangé)
```
Texte de fin de tour du teammate : **une ligne**, `[NOM] IDLE — T<nn> terminée, voir DONE`.

**Handoff** (si on le conserve) `_work/handoff/<agent>-<ts>.md` :
```
# Handoff <agent> — T<nn>
Livré : <fichiers / SHA>
Décisions prises (et pourquoi) : …
Non fait / reporté : …
À savoir pour la suite (agent suivant) : …
Points à vérifier : …
```

---

## 4. Ambiguïtés et impossibilités dans cet environnement

| # | Point | Constat | Proposition |
|---|---|---|---|
| 4.1 | Adresse `main` | Dans cette version de Claude Code, `main` désigne la session de l'appelant : depuis un teammate, `to: "main"` est refusé ; l'adresse réelle du chef d'équipe est `team-lead` (identifiant de l'expéditeur des ordres). | Utiliser **`team-lead`**, ou consigne « répondre à l'identifiant `teammate_id` de l'expéditeur de la tâche » (robuste à un renommage). |
| 4.2 | Fin de tour d'un teammate | Un agent ne peut pas terminer un tour **sans** texte final, et la plateforme le transmet automatiquement au teamleader (`idle_notification.result`). Le « zéro contenu inline » est donc **irréalisable à la lettre**. | Accepter une ligne finale normée (`[NOM] IDLE — voir DONE`) et la documenter dans TP §3 comme seul texte de fin de tour autorisé. |
| 4.3 | Fichier de tâche | Le teamleader n'a pas le droit d'écrire, alors que le principe « par référence » suppose quelqu'un pour écrire le contexte. | (a) Autoriser `Write` au teamleader **uniquement** sur `_work/tasks/*.md` (symétrique de l'exception de lecture CDP:53) ; ou (b) faire écrire les décisions utilisateur par l'agent qui les a demandées (ex. le planner consigne les réponses GATE dans son rapport) ; ou (c) garder l'inline avec le plafond de §3.6. Recommandé : **(a)**. |
| 4.4 | « Références uniquement » vs verdicts | Les gabarits CDP/WF demandent eux-mêmes « fichiers modifies + SHA » et des verdicts (APPROVED…). | Autoriser explicitement une ligne `Verdict :` et une ligne `Fichiers :` (chemins seulement) ; interdire toute phrase de résumé. |
| 4.5 | Handoff vs rapport | Deux notions redondantes et non définies ; le planner n'a pas de handoff. | Fusionner : **un seul livrable** `_work/reports/<agent>-<ts>.md`, avec une section finale « Pour la suite » qui joue le rôle du handoff. |
| 4.6 | ACTIF à chaque tâche | Un aller-retour supplémentaire par tâche ; de fait souvent omis. | ACTIF obligatoire seulement si la tâche dure plus d'un tour d'outils significatif ; sinon DONE direct. |
| 4.7 | Noms de fichiers protocolaires | Références à des `.md` inexistants (seuls les `.template.md` existent). | Corriger les liens, ou générer les `.md` au `/start-session`. |
| 4.8 | Lecture des transcriptions | Mesurer la pratique exige de lire `~/.claude/projects/…` (hors projet, en lecture). Aucune écriture hors projet n'a été faite. | Si l'on veut suivre ces métriques, prévoir un outil `tools/` qui écrit sous `_work/tmp/`. |

## Modifications à prévoir (non faites — tâche en lecture seule)
`.claude/agents/context/TEAMMATES_PROTOCOL.template.md` (adresse, fin de tour, gabarits, handoff), `.claude/agents/teamleader.template.md` et la section `TEAMLEADER_PROTOCOL` de `CLAUDE.md` (gabarit de tâche, adresse, validation des DONE), `.claude/agents/cdp.template.md` et `CDP_WORKFLOWS.template.md` (références au handoff), et chaque `*.template.md` d'agent (gabarits `to: "main"`). Ces fichiers étant maintenus par le template (sync), la correction doit être portée **en amont du template** pour ne pas être écrasée au prochain `/init-project`.
