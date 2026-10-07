COURSE.add({
  id: 'm00', lang: 'en', num: 0, emoji: '🧪',
  title: 'Demo zero',
  tagline: 'Minimal fixture.',
  source: '777a28fa266d',
  duration: '≈ 5 min',
  objectives: ['Objective 1', 'Objective 2', 'Objective 3'],
  takeaways: ['Point 1', 'Point 2', 'Point 3', 'Point 4'],
  slides: [
    { title: 'Demo zero', blocks: [
      { t: 'text', html: '<p>Text.</p>' },
      { t: 'quiz', q: 'Question?', options: ['One', 'Two', 'Three'], answer: 1, explain: 'Because <b>two</b>.' },
      { t: 'lab', title: 'Lab', steps: ['Step 1', 'Step 2'] }
    ] }
  ]
});
