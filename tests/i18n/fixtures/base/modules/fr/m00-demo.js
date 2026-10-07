COURSE.add({
  id: 'm00', lang: 'fr', num: 0, emoji: '🧪',
  title: 'Démo zéro',
  tagline: 'Fixture minimale.',
  duration: '≈ 5 min',
  objectives: ['Objectif 1', 'Objectif 2', 'Objectif 3'],
  takeaways: ['Point 1', 'Point 2', 'Point 3', 'Point 4'],
  slides: [
    { title: 'Démo zéro', blocks: [
      { t: 'text', html: '<p>Texte.</p>' },
      { t: 'quiz', q: 'Question ?', options: ['Un', 'Deux', 'Trois'], answer: 1, explain: 'Parce que <b>deux</b>.' },
      { t: 'lab', title: 'Lab', steps: ['Étape 1', 'Étape 2'] }
    ] }
  ]
});
