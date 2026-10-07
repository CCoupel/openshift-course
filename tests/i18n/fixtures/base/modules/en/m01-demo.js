COURSE.add({
  id: 'm01', lang: 'en', num: 1, emoji: '⚖️',
  title: 'Demo module',
  tagline: 'fr/en parity fixture.',
  source: '11f3365de964',
  duration: '≈ 10 min + 5 min lab',
  objectives: ['Objective 1', 'Objective 2', 'Objective 3'],
  takeaways: ['Point 1', 'Point 2', 'Point 3', 'Point 4'],
  slides: [
    { title: 'Slide one', blocks: [
      { t: 'text', html: '<p>Introductory text.</p>' },
      { t: 'bullets', frag: true, items: ['Item A', 'Item B'] },
      { t: 'flow', nodes: [{ label: 'CVO', sub: 'Master operator', hl: true }, { label: 'Operators', sub: 'Every component' }], caption: 'The CVO drives the operators.' }
    ] },
    { title: 'Slide two', blocks: [
      { t: 'cmds', items: [['oc get co', 'Lists the operators'], ['oc get nodes', 'Lists the nodes']] },
      { t: 'code', lang: 'bash', file: 'demo.sh (lab example)', caption: 'Code caption.', code: '# Platform health\n$ oc get clusterversion\n$ echo "a # b"\n$ oc get nodes  # note\n# End' },
      { t: 'table', head: ['Term', 'Definition'], rows: [['A', 'One'], ['B', 'Two']] }
    ] },
    { title: 'Slide three', blocks: [
      { t: 'quiz', q: 'Question?', options: ['One', 'Two', 'Three'], answer: 1, explain: 'Because <b>two</b>.' },
      { t: 'callout', kind: 'tip', html: 'Value to confirm (to be verified).' },
      { t: 'compare', left: { title: 'Left', items: ['a'] }, right: { title: 'Right', items: ['b'] }, verdict: 'Verdict.' }
    ] }/*S4*/,
    { title: 'Slide four', blocks: [
      { t: 'lab', title: 'Lab', steps: ['Step 1', 'Step 2'] }
    ] }/*E4*/
  ]
});
