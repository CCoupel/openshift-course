COURSE.add({
  id: 'm01', lang: 'fr', num: 1, emoji: '⚖️',
  title: 'Module démo',
  tagline: 'Fixture de parité fr/en.',
  duration: '≈ 10 min + lab 5 min',
  objectives: ['Objectif 1', 'Objectif 2', 'Objectif 3'],
  takeaways: ['Point 1', 'Point 2', 'Point 3', 'Point 4'],
  slides: [
    { title: 'Slide un', blocks: [
      { t: 'text', html: '<p>Texte introductif.</p>' },
      { t: 'bullets', frag: true, items: ['Élément A', 'Élément B'] },
      { t: 'flow', nodes: [{ label: 'CVO', sub: 'Opérateur maître', hl: true }, { label: 'Opérateurs', sub: 'Tous les composants' }], caption: 'Le CVO pilote les opérateurs.' }
    ] },
    { title: 'Slide deux', blocks: [
      { t: 'cmds', items: [['oc get co', 'Liste les opérateurs'], ['oc get nodes', 'Liste les nœuds']] },
      { t: 'code', lang: 'bash', file: 'demo.sh', caption: 'Légende du code.', code: '# Santé de la plateforme\n$ oc get clusterversion\n$ echo "a # b"\n$ oc get nodes  # note\n# Fin' },
      { t: 'table', head: ['Terme', 'Définition'], rows: [['A', 'Un'], ['B', 'Deux']] }
    ] },
    { title: 'Slide trois', blocks: [
      { t: 'quiz', q: 'Question ?', options: ['Un', 'Deux', 'Trois'], answer: 1, explain: 'Parce que <b>deux</b>.' },
      { t: 'callout', kind: 'tip', html: 'Valeur à confirmer (à vérifier).' },
      { t: 'compare', left: { title: 'Gauche', items: ['a'] }, right: { title: 'Droite', items: ['b'] }, verdict: 'Verdict.' }
    ] }/*S4*/,
    { title: 'Slide quatre', blocks: [
      { t: 'lab', title: 'Lab', steps: ['Étape 1', 'Étape 2'] }
    ] }/*E4*/
  ]
});
