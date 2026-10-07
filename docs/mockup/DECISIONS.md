# Contraintes de conception

> Contraintes durables issues des refus/corrections de l utilisateur, par composant.
> Le planner les respecte, QA les vérifie. Tenu par le CDP.

## course_shell
- Sélecteur de langue : interrupteur segmenté FR | EN dans la barre du haut, juste avant le bouton thème ; pas de menu déroulant tant qu'il n'y a que deux langues. _(v1.0.0, i18n_fr_en)_
- Pas de drapeaux pour les langues : codes texte (FR, EN), nom complet en infobulle et pour les lecteurs d'écran. _(v1.0.0, i18n_fr_en)_
- Aucune couleur nouvelle : le sélecteur réutilise les jetons CSS existants (accent doux pour l'état actif), clair et sombre. _(v1.0.0, i18n_fr_en)_
- Changer de langue ne recharge pas la page et garde la même slide et les fragments déjà révélés. _(v1.0.0, i18n_fr_en)_
- Langue au premier chargement : `?lang=`, puis langue mémorisée, puis langue du navigateur (fr/en), sinon français. _(v1.0.0, i18n_fr_en)_

## course_content
- Un fichier par module et par langue (`modules/fr/`, `modules/en/`), même nom de fichier, structure identique contrôlée par `validate.js`. _(v1.0.0, i18n_layout)_
- Un site, une URL, une archive bilingue ; un PowerPoint par langue suffixé `-fr` / `-en`. _(v1.0.0, i18n_layout)_
