COURSE.add({
  id: 'm01', lang: 'en', num: 1, emoji: '⚖️',
  title: 'Demo module',
  tagline: 'fr/en parity fixture.',
  source: '803f797d34d4',
  duration: '≈ 10 min',
  objectives: ['Objective 1', 'Objective 2', 'Objective 3'],
  takeaways: ['Point 1', 'Point 2', 'Point 3', 'Point 4'],
  slides: [
    { title: 'Slide one', blocks: [
      { t: 'text', html: '<p>Introductory text.</p>' },
      { t: 'bullets', frag: true, items: ['Item A', 'Item B'] }
    ] },
    { title: 'Slide two', blocks: [
      { t: 'cmds', items: [['oc get co', 'Lists the operators'], ['oc get nodes', 'Lists the nodes']] },
      { t: 'code', lang: 'bash', file: 'demo.sh', code: '# Platform health\n$ oc get clusterversion\n# End' },
      { t: 'table', head: ['Term', 'Definition'], rows: [['A', 'One'], ['B', 'Two']] }
    ] },
    { title: 'Slide three', blocks: [
      { t: 'quiz', q: 'Question?', options: ['One', 'Two', 'Three'], answer: 1, explain: 'Because <b>two</b>.' },
      { t: 'callout', kind: 'tip', html: 'Value to confirm (to be verified).' }
    ] }/*S4*/,
    { title: 'Slide four', blocks: [
      { t: 'lab', title: 'Lab', steps: ['Step 1', 'Step 2'] }
    ] }/*E4*/
  ]
});
