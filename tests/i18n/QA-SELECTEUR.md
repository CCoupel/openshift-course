# Procédure de Test — Sélecteur de langue FR | EN

**Version** : 1.0.0 (branche `feature/i18n`)
**Date** : ____ **Testeur** : QA
**Référence visuelle** : `docs/mockup/v1.0.0/ui/course_shell__i18n_fr_en.html` (ouvrir à côté, sections 1 à 5)
**Contrat** : `_work/reports/planner-i18n.md` D2, D3 et critères d'acceptation.

> Lots : 6 lots, 53 cas au total, ≤ 50 par lot. Un cas = une ligne de tableau. Ne rien cocher « OK » sans l'avoir observé.

## Prérequis

- [ ] `index.html` ouvert **en double-clic** (`file://`), jamais via un serveur, sauf mention contraire (cas D3-02).
- [ ] Navigateurs : Chrome et Firefox (dernières versions) ; Edge optionnel.
- [ ] Avant chaque lot : vider le stockage du site (`localStorage.clear()` dans la console, puis F5) sauf mention contraire.
- [ ] Clé de stockage du cours : `ocp-course-v1` (champ `lang` attendu après un choix manuel).
- [ ] Les 16 modules existent en fr et en (sinon le bandeau de repli apparaît : voir lot 6).
- [ ] Lecteur d'écran (NVDA ou Narrateur) pour les cas marqués 🔊 ; sinon les ignorer et le noter.

---

## Lot 1 — Bascule sur les écrans clés (smoke : A01, A02) — 10 cas

| # | Écran / action | Résultat attendu | Obtenu | OK ? |
|---|---|---|---|---|
| A01 ⭐ | Ouvrir `index.html` en `file://`, navigateur en français | Accueil en français ; sélecteur **FR \| EN** dans la barre du haut, entre le compteur et 🌓 ; FR actif (fond accent doux) | | |
| A02 ⭐ | Cliquer **EN** sur l'accueil | Sans rechargement : sous-titre, légende, bouton « reprendre » / « réinitialiser », sommaire, aide clavier en anglais ; plus aucun texte français résiduel | | |
| A03 | Revenir en FR (clic **FR**) | Tout repasse en français ; la barre d'adresse et la position sont inchangées | | |
| A04 | Aller sur la couverture d'un module (ex. m07), cliquer **EN** | Titre, tagline, objectifs et durée traduits ; emoji et durée numérique identiques ; adresse `#m07` inchangée | | |
| A05 | Aller sur une slide avec fragments (ex. m01 slide 2), révéler 2 blocs (touche →), cliquer **EN** | Même slide (`#m01/2`), **mêmes 2 blocs déjà révélés**, les suivants masqués ; compteur identique | | |
| A06 | Même slide, avancer d'un fragment en EN, repasser en FR | Fragments révélés conservés dans l'autre sens | | |
| A07 | Slide de commandes (`cmds`) et bloc de code, basculer | Commandes strictement identiques ; seuls les commentaires `#` et les descriptions changent | | |
| A08 | Slide « callout » (astuce / piège / écart cloud), basculer | Libellé du callout traduit (ex. « Tip », « Pitfall », « Cloud gap ») | | |
| A09 | Slide de quiz, basculer | Question et options traduites, **même ordre** des options, même bonne réponse après validation | | |
| A10 | Slide « À retenir » (dernière du module), basculer | Titre « Key takeaways » en EN ; même nombre de points | | |

## Lot 2 — Première visite : `?lang=`, mémorisation, navigateur — 9 cas

| # | Action | Résultat attendu | Obtenu | OK ? |
|---|---|---|---|---|
| B01 | Stockage vide, navigateur en `fr-FR` | Cours en français | | |
| B02 | Stockage vide, navigateur réglé sur `en-GB` seul (Paramètres → Langues) | Cours en anglais, EN actif | | |
| B03 | Stockage vide, navigateur en `de-DE` seul | Repli sur le français | | |
| B04 | Ouvrir `index.html?lang=en` (stockage vide, navigateur fr) | Cours en anglais ; l'URL garde `?lang=en` | | |
| B05 | Ouvrir `index.html?lang=en#m07/5` | Slide 5 du module 07 en anglais | | |
| B06 | Ouvrir `index.html?lang=de` (invalide) | Ignoré sans erreur console ; langue = mémorisée, sinon navigateur, sinon fr | | |
| B07 | Choisir EN, fermer l'onglet, rouvrir `index.html` sans paramètre | Cours en anglais (langue mémorisée) | | |
| B08 | Langue mémorisée = fr (`localStorage` : `lang` = `fr`), ouvrir `index.html?lang=en`, ne pas cliquer le sélecteur ; relire `localStorage` puis rouvrir `index.html` sans paramètre | `?lang=` prioritaire : anglais affiché, mais **la langue mémorisée reste fr** (le paramètre ne mémorise pas) ; la réouverture sans paramètre est en français | | |
| B09 | Même départ qu'en B08, puis cliquer **FR** puis **EN** (première bascule manuelle) | La langue est mémorisée à la bascule manuelle : `lang` = `en` dans `ocp-course-v1` ; rouvrir sans paramètre → anglais | | |

## Lot 3 — Clavier, accessibilité, raccourci `l` — 8 cas

| # | Action | Résultat attendu | Obtenu | OK ? |
|---|---|---|---|---|
| C01 | Presser `l` hors champ de saisie | Bascule fr ↔ en ; bulle « Langue : français » / « Language: English » ≈ 1,5 s | | |
| C02 | Presser `l` deux fois de suite | Retour à la langue initiale, même slide et mêmes fragments | | |
| C03 | Focus dans le champ de recherche, taper « l » | La lettre est saisie ; **pas** de bascule | | |
| C04 | Ordre de tabulation depuis ☰ | ☰ → FR → EN → 🌓 | | |
| C05 | Focus sur EN, Entrée puis Espace | Bascule une fois ; le focus reste sur le sélecteur (pas de perte) | | |
| C06 | Inspecter le sélecteur | `role="group"`, nom accessible « Langue » / « Language » ; boutons `aria-pressed` (true sur la langue active) ; `lang="fr"` / `lang="en"` sur les boutons ; infobulles « Français » / « English » | | |
| C07 | Inspecter `<html>` et l'onglet après bascule | `<html lang>` = langue active ; `document.title` traduit | | |
| C08 🔊 | Lecteur d'écran, bascule | La nouvelle langue est annoncée (zone `aria-live`) ; l'aide en bas de page mentionne `l` | | |

## Lot 4 — Mobile — 8 cas

Outils de développement → mode appareil, ou fenêtre réduite.

| # | Largeur | Action | Résultat attendu | Obtenu | OK ? |
|---|---|---|---|---|---|
| D01 | 900 px | Observer la barre du haut | Sélecteur toujours visible, ≈ 70 px, avant 🌓 ; le fil d'Ariane se tronque avant lui | | |
| D02 | 900 px | Ouvrir le menu ☰ | Rappel « Langue du cours » avec FR \| EN en bas du menu latéral | | |
| D03 | 900 px | Basculer depuis le rappel du menu | Même effet que dans la barre ; état des deux sélecteurs synchronisé | | |
| D04 | 480 px | Observer la barre du haut | Compteur de slides masqué ; sélecteur visible ; pas de défilement horizontal de la page | | |
| D05 | 480 px | Basculer sur une slide avec fragments | Slide, fragments et position conservés | | |
| D06 | 360 px | Barre du haut | Aucun chevauchement ni débordement (☰, fil d'Ariane, FR \| EN, 🌓) | | |
| D07 | 480 px | Bulle de confirmation de langue | Lisible, non coupée, disparaît seule | | |
| D08 | 480 px | Thème sombre puis bascule | Sélecteur lisible en sombre (mêmes jetons CSS, aucune couleur nouvelle) | | |

## Lot 5 — `file://` sans stockage, recherche, scores — 12 cas

| # | Action | Résultat attendu | Obtenu | OK ? |
|---|---|---|---|---|
| E01 | Navigation privée Chrome, ouvrir `index.html` en `file://` | Cours fonctionnel, **aucune erreur console** liée au stockage ou à `history.replaceState` | | |
| E02 | Même fenêtre, bascule EN puis navigation entre slides | Langue conservée pendant la session ; pas d'exception | | |
| E03 | Fermer puis rouvrir la fenêtre privée | Langue redemandée (navigateur, sinon fr) ; aucune erreur | | |
| E04 | Firefox, `file://`, stockage bloqué (`dom.storage.enabled` = false, ou profil strict) | Idem E01 | | |
| E05 | `file://?lang=en` : l'URL est-elle réécrite ? | Noter le comportement (la réécriture peut être refusée en `file://`) ; la bascule marche dans tous les cas | | |
| E06 | Rechercher « operator » en FR, noter les résultats, basculer EN | Le texte saisi est **conservé** dans le champ ; la liste de résultats est réindexée dans la langue active (titres et extraits en anglais) | | |
| E07 | En EN, rechercher « Route » | Résultats en anglais, ouvrent la bonne slide | | |
| E08 | En EN, rechercher un mot français courant (ex. « réseau ») | Aucun résultat (aucun texte fr résiduel dans les modules en) | | |
| E09 | Répondre juste à un quiz en FR, basculer EN | Quiz marqué comme réussi ; score identique | | |
| E10 | Répondre faux à un quiz en EN, basculer FR | État et score conservés (clés `uid` communes) | | |
| E11 | Progression : voir 3 slides en FR, basculer EN | Pourcentages du sommaire identiques ; slides vues cochées | | |
| E12 | Recharger (F5) après bascule, hors navigation privée | Même slide, même langue, progression et scores intacts ; `localStorage` `ocp-course-v1` contient `lang` | | |

## Lot 6 — Bandeau de repli (module en absent) — 6 cas

Réservé à `feature/i18n` pendant la traduction. Retirer **temporairement** (sur une copie, jamais commité) une ligne
`<script src="modules/en/mNN-….js">` d'`index.html`, ou travailler sur un état de la branche où le module en n'existe pas encore.

| # | Action | Résultat attendu | Obtenu | OK ? |
|---|---|---|---|---|
| F01 | Module en retiré, FR actif, aller sur ce module | Rendu normal en français, sans bandeau | | |
| F02 | Basculer EN sur ce module | Contenu français affiché avec le bandeau « Not translated yet — showing French » | | |
| F03 | Quitter ce module pour un module traduit en EN | Le bandeau disparaît ; contenu en anglais | | |
| F04 | Sommaire en EN | Le module non traduit reste listé et ouvrable (titre repris du `plan.js` en) ; progression comptée | | |
| F05 | Revenir en FR sur le module | Pas de bandeau | | |
| F06 | Remettre `index.html` à l'identique (`git diff` vide) ; `node tools/validate.js --strict-i18n` | Passe, aucun avertissement de module absent | | |

---

## Critères de validation

- [ ] A01 et A02 (smoke) passent sur Chrome **et** Firefox en `file://`
- [ ] Aucune erreur console sur l'ensemble de la procédure (hors cas E05 documenté)
- [ ] Même slide et mêmes fragments conservés à chaque bascule (A05, A06, D05)
- [ ] Aucun texte français résiduel en mode EN (A02, A08, E08)
- [ ] Progression et scores partagés entre les deux langues (E09 à E12)
- [ ] Pas de régression : navigation, thème clair/sombre, copier-coller de code, recherche en FR identiques à `main`

## Notes QA

[Navigateurs et versions, anomalies, captures]
