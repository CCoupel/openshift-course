COURSE.add({
  id: 'm01', num: 1, emoji: '⚖️',
  title: 'K8s vs OCP',
  tagline: 'Même moteur, autre carrosserie : ce qu\'OpenShift ajoute, impose et renomme.',
  duration: '≈ 45 min',
  objectives: [
    'Situer OCP par rapport à un Kubernetes « vanilla » que tu connais déjà',
    'Maîtriser le dictionnaire K8s ↔ OCP (Project, Route, SCC, ImageStream…)',
    'Savoir ce qu\'OCP verrouille volontairement',
    'Connaître les éditions, le cycle de vie et le modèle de souscription',
    'Décider quand OCP est (ou n\'est pas) le bon choix'
  ],
  slides: [
    {
      title: 'OCP, c\'est quoi vraiment ?',
      blocks: [
        { t: 'text', html: '<p><b>OpenShift = Kubernetes + une distribution opinionated + un OS géré + des Operators pour tout.</b> Tu ne montes plus ta plateforme brique par brique : elle est livrée, versionnée et mise à jour comme un seul produit.</p>' },
        { t: 'layers', frag: true, items: [
          { name: '🖥️ Console web', desc: 'Vues admin et développeur, intégrées, extensibles' },
          { name: '🛠️ Outils dev', desc: 'Pipelines (Tekton), GitOps (Argo CD), S2I, Helm' },
          { name: '📦 Services plateforme', desc: 'Monitoring, logging, registre interne, OperatorHub (OLM)', hl: true },
          { name: '🔐 Sécurité par défaut', desc: 'OAuth intégré, SCC, RBAC strict, pods non-root' },
          { name: '💽 OS immuable', desc: 'RHCOS + MachineConfig : les nœuds sont du « cattle »', hl: true },
          { name: '☸️ Kubernetes', desc: 'Upstream, figé et patché par Red Hat à chaque release', base: true }
        ] }
      ]
    },
    {
      title: 'La philosophie : tout est un Operator',
      blocks: [
        { t: 'text', html: '<p>Sur K8s vanilla, tu choisis et assembles CNI, ingress, monitoring, auth… Sur OCP, <b>chaque composant du cluster est piloté par un Cluster Operator</b>, lui-même orchestré par un opérateur maître.</p>' },
        { t: 'flow', nodes: [
          { label: 'CVO', sub: 'Cluster Version Operator', hl: true },
          { label: 'Cluster Operators', sub: '≈ 30 : network, ingress, auth, monitoring…' },
          { label: 'Composants', sub: 'Pods, DaemonSets, configs' }
        ], caption: 'Le CVO réconcilie l\'état voulu par la release (image de release) vers chaque opérateur.' },
        { t: 'code', lang: 'bash', file: 'terminal', code: '# Santé de la plateforme en une commande\n$ oc get clusteroperators   # alias : oc get co\n$ oc get clusterversion\n# Chaque opérateur : Available / Progressing / Degraded' },
        { t: 'callout', kind: 'tip', html: 'Réflexe n°1 de diagnostic : <code>oc get co</code>. Un opérateur <b>Degraded</b> te dit déjà dans quelle brique chercher.' }
      ]
    },
    {
      title: 'Kubernetes vanilla vs OpenShift',
      layout: 'two',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '☸️ K8s vanilla / distro', items: ['Tu assembles ta plateforme', 'OS au choix, tu le patches', 'CNI, Ingress, monitoring : à choisir', 'Upgrade composant par composant', 'Souplesse maximale… et dette d\'intégration'] },
          right: { title: '🔴 OpenShift', items: ['Plateforme intégrée, testée en bloc', 'RHCOS imposé sur le control plane', 'OVN-Kubernetes, Router HAProxy, Prometheus fournis', 'Upgrade orchestré par le CVO', 'Moins de liberté, beaucoup moins de colle à maintenir'] },
          verdict: 'OCP échange de la liberté contre de la cohérence et du support.' }
      ]
    },
    {
      title: 'Comparatif détaillé',
      blocks: [
        { t: 'table', head: ['Sujet', '☸️ K8s vanilla', '🔴 OpenShift'], rows: [
          ['Installation', 'kubeadm, Kubespray, Cluster API…', '<code>openshift-install</code> (IPI/UPI), Assisted/Agent installer'],
          ['OS des nœuds', 'Libre (Ubuntu, RHEL…)', 'RHCOS (control plane), RHCOS ou RHEL (workers, RHEL déconseillé)'],
          ['Réseau (CNI)', 'Calico, Cilium, Flannel…', 'OVN-Kubernetes (Cilium non supporté nativement)'],
          ['Exposition HTTP', 'Ingress + contrôleur à choisir', 'Router HAProxy via l\'Ingress Operator, objets <code>Route</code>'],
          ['Authentification', 'OIDC / webhook à configurer', 'OAuth server intégré + Identity Providers'],
          ['Sécurité des pods', 'Pod Security Admission', 'SCC <i>et</i> PSA (les SCC restent le vrai garde-fou)'],
          ['Registre', 'À déployer', 'Registre interne + ImageStreams'],
          ['Monitoring', 'À installer (kube-prometheus…)', 'Stack Prometheus/Alertmanager intégrée'],
          ['Mises à jour', 'Manuelles, composant par composant', '<code>oc adm upgrade</code>, canaux, CVO'],
          ['Support', 'Communauté / éditeur de la distro', 'Red Hat, matrice de compatibilité fermée']
        ] }
      ]
    },
    {
      title: 'Le dictionnaire de traduction',
      blocks: [
        { t: 'table', head: ['Tu dis (K8s)', 'OpenShift dit', 'À savoir'], rows: [
          ['Namespace', '<b>Project</b>', 'Namespace + annotations + template de création + <code>self-provisioner</code>'],
          ['Ingress', '<b>Route</b>', 'Ingress reste supporté (converti en Route en coulisses)'],
          ['Deployment', 'Deployment', '<code>DeploymentConfig</code> existe encore mais est <b>déprécié</b> : ne l\'utilise plus'],
          ['Pod Security (PSA)', '<b>SCC</b>', 'Objets cluster, liés via RBAC aux ServiceAccounts'],
          ['Image + tag', '<b>ImageStream</b>', 'Pointeur vers des images, avec triggers de redéploiement'],
          ['Dockerfile / Kaniko', '<b>BuildConfig</b> / S2I', 'Remplacé progressivement par Tekton / Shipwright'],
          ['kubeadm join / OS à la main', '<b>MachineSet / MachineConfig</b>', 'Les nœuds sont provisionnés et configurés de façon déclarative'],
          ['kubectl', '<b>oc</b>', 'Sur-ensemble de kubectl : <code>oc login</code>, <code>oc new-app</code>, <code>oc debug</code>…']
        ] }
      ]
    },
    {
      title: 'À toi : retrouve l\'équivalent',
      tag: 'jeu',
      blocks: [
        { t: 'text', html: '<p>Clique pour retourner chaque carte et vérifie ta réponse.</p>' },
        { t: 'cards', items: [
          { front: 'Namespace', back: '<b>Project</b>' },
          { front: 'Ingress', back: '<b>Route</b> (HAProxy)' },
          { front: 'PodSecurityPolicy', back: '<b>SCC</b> (SecurityContextConstraints)' },
          { front: 'Tag d\'image mutable', back: '<b>ImageStreamTag</b>' },
          { front: 'Ajouter un worker (kubeadm join)', back: '<b>MachineSet</b> → Machine → Node' },
          { front: 'Éditer /etc sur un nœud', back: '<b>MachineConfig</b> (ou ne pas le faire)' },
          { front: 'Helm chart d\'un opérateur', back: '<b>OLM</b> / OperatorHub (Subscription)' },
          { front: 'kubectl', back: '<b>oc</b>, mais kubectl marche aussi' }
        ] }
      ]
    },
    {
      title: 'Route vs Ingress',
      layout: 'two',
      blocks: [
        { t: 'text', html: '<p>Une <b>Route</b> est plus riche qu\'un Ingress classique : terminaison TLS intégrée (<i>edge</i>, <i>passthrough</i>, <i>re-encrypt</i>), poids pour le <i>A/B</i>, annotations HAProxy. On la crée en une ligne.</p>' },
        { t: 'callout', kind: 'onprem', html: 'On-prem, c\'est <b>toi</b> qui fournis le load balancer devant les routeurs et le wildcard DNS <code>*.apps.&lt;cluster&gt;.&lt;domaine&gt;</code>. En cloud, l\'installeur crée les LB à ta place.' },
        { t: 'code', lang: 'yaml', file: 'route.yaml', wide: true, code: 'apiVersion: route.openshift.io/v1\nkind: Route\nmetadata:\n  name: web\nspec:\n  to:\n    kind: Service\n    name: web\n  port:\n    targetPort: 8080\n  tls:\n    termination: edge\n    insecureEdgeTerminationPolicy: Redirect\n# Créée aussi par : oc expose svc/web ; oc create route edge …' }
      ]
    },
    {
      title: 'Project ≠ juste un Namespace',
      blocks: [
        { t: 'bullets', frag: true, items: [
          'Un <b>Project</b> est un Namespace avec des annotations et un cycle de création contrôlé (<code>ProjectRequest</code>).',
          'Les utilisateurs créent leurs projets via le rôle <code>self-provisioner</code> ; un <b>template de projet</b> peut y injecter quotas, LimitRange et NetworkPolicy.',
          'Les namespaces <code>openshift-*</code> et <code>kube-*</code> appartiennent à la plateforme : ne pas y déployer d\'applis.',
          '<code>oc new-project</code> te place dedans automatiquement (contexte courant).'
        ] },
        { t: 'callout', kind: 'tip', html: 'Pour la multi-tenance propre, on retire <code>self-provisioner</code> aux utilisateurs et on pousse un template de projet : on y reviendra aux modules RBAC et Configuration.' }
      ]
    },
    {
      title: 'SCC : la 1ère surprise en migrant',
      tag: 'piège n°1',
      blocks: [
        { t: 'text', html: '<p>Par défaut, un pod tourne avec le SCC <code>restricted-v2</code> : <b>UID aléatoire dans une plage attribuée au namespace, aucun root, capabilities supprimées, pas de hostPath, etc.</b> Beaucoup d\'images « Docker Hub » plantent à cause de ça.</p>' },
        { t: 'code', lang: 'bash', file: 'terminal', code: '# Quel SCC un pod a-t-il reçu ?\n$ oc get pod web-abc -o jsonpath=\'{.metadata.annotations.openshift\\.io/scc}\'\nrestricted-v2\n\n# Simuler : quel SCC accepterait ce ServiceAccount ?\n$ oc adm policy who-can use scc anyuid\n$ oc get scc' },
        { t: 'callout', kind: 'trap', html: 'Le réflexe « <code>oc adm policy add-scc-to-user anyuid</code> » règle le symptôme mais ouvre une faille. La bonne réponse : <b>réparer l\'image</b> (écoute sur un port &gt; 1024, dossiers en <code>g=u</code>, pas de <code>USER</code> en dur).' },
        { t: 'quiz', q: 'Une image nginx officielle ne démarre pas sur OCP (« permission denied » sur le port 80). Quelle est la meilleure correction ?', options: [
          'Donner le SCC <code>privileged</code> au ServiceAccount',
          'Utiliser une image nginx « unprivileged » qui écoute sur 8080',
          'Passer le cluster en mode permissif',
          'Forcer <code>runAsUser: 0</code> dans le Deployment'
        ], answer: 1, explain: 'Un UID aléatoire ne peut pas binder un port &lt; 1024 ni écrire dans des dossiers root-only. Adapter l\'image est la solution propre ; <code>privileged</code> est à éviter, et <code>runAsUser: 0</code> sera refusé par <code>restricted-v2</code>.' }
      ]
    },
    {
      title: 'ImageStreams & S2I',
      blocks: [
        { t: 'text', html: '<p>Un <b>ImageStream</b> est un pointeur logique vers des images (internes ou externes). Un changement de tag peut <b>déclencher un build ou un rollout</b> automatiquement. <b>S2I</b> (Source-to-Image) construit l\'image à partir du code source sans Dockerfile.</p>' },
        { t: 'flow', nodes: [
          'Code source (Git)',
          { label: 'Build S2I', sub: 'image builder + source', hl: true },
          'Image → ImageStream',
          { label: 'Trigger', sub: 'nouveau tag détecté' },
          'Rollout Deployment'
        ] },
        { t: 'callout', kind: 'ocp', html: 'Aujourd\'hui, beaucoup d\'équipes préfèrent <b>Tekton + Buildah</b> et un registre externe. Les ImageStreams restent utiles : l\'import de tags, la mise en cache et les <i>triggers</i> s\'y appuient, et le catalogue d\'images de base OCP en dépend.' }
      ]
    },
    {
      title: 'Ce qu\'OCP verrouille (volontairement)',
      layout: 'two',
      blocks: [
        { t: 'bullets', frag: true, items: [
          '<b>Pas de SSH « admin » sur les nœuds</b> : on utilise <code>oc debug node/…</code>.',
          '<b>RHCOS immuable</b> : <code>/usr</code> est en lecture seule, on ne <code>yum install</code> rien.',
          '<b>Config de l\'OS = MachineConfig</b> ; config kubelet = <code>KubeletConfig</code>.',
          '<b>Le control plane n\'est pas à toi</b> : tu ne modifies pas ses manifests à la main.',
          '<b>Mises à jour par version mineure séquentielle</b> (4.16 → 4.17 → 4.18).'
        ] },
        { t: 'callout', kind: 'trap', html: 'Modifier un fichier à la main sur un nœud : il sera écrasé (ou le <b>MachineConfigPool</b> passera en Degraded) au prochain rendu. Toute modif OS passe par un objet déclaratif.' },
        { t: 'callout', kind: 'onprem', wide: true, html: 'Sur bare metal et vSphere, ces règles s\'appliquent pleinement, avec en plus la gestion du firmware, de l\'IPAM et du stockage à ta charge. C\'est le prix de l\'autonomie.' }
      ]
    },
    {
      title: 'Éditions & déclinaisons',
      blocks: [
        { t: 'table', head: ['Produit', 'C\'est quoi', 'Qui gère quoi'], rows: [
          ['<b>OCP</b> (self-managed)', 'La distribution officielle, installée sur ton infra', 'Toi : tout, y compris control plane'],
          ['<b>OKD</b>', 'Version communautaire (base Fedora CoreOS)', 'Toi, sans support Red Hat'],
          ['<b>SNO</b> / compact 3 nœuds', 'Topologies réduites d\'OCP (edge, lab)', 'Toi'],
          ['<b>Hosted Control Planes</b>', 'Control plane hébergé comme des pods d\'un autre cluster', 'Toi, mais control plane mutualisé'],
          ['<b>MicroShift</b>', 'Version allégée pour devices edge', 'Toi, sans console ni Operators complets'],
          ['<b>ROSA / ARO / OSD</b> ☁️', 'OpenShift managé (AWS / Azure / Google)', 'Red Hat + cloud : control plane, upgrades, SRE']
        ] },
        { t: 'callout', kind: 'cloud', html: 'En managé, tu n\'es pas <code>cluster-admin</code> : tu as <code>dedicated-admin</code>. Pas de MachineConfig libre, pas d\'accès aux namespaces plateforme, upgrades planifiés avec le fournisseur. Beaucoup de modules de ce cours (installation, MachineConfig, etcd) <b>ne te concerneraient plus</b>.' }
      ]
    },
    {
      title: 'Versions & cycle de vie',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          'Une release mineure OCP environ <b>tous les 4 mois</b>.',
          'Règle pratique : <b>K8s 1.(N+13) = OCP 4.N</b> (4.16 → K8s 1.29, 4.18 → 1.31). À vérifier dans les release notes.',
          'Les releases <b>paires</b> (4.14, 4.16, 4.18…) bénéficient d\'<b>EUS</b> (Extended Update Support) : support plus long, chemin de mise à jour EUS → EUS.',
          'Canaux de mise à jour : <code>stable-4.x</code>, <code>fast-4.x</code>, <code>eus-4.x</code>, <code>candidate-4.x</code>.'
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: '$ oc get clusterversion\n$ oc adm upgrade\n# Versions disponibles dans le canal courant\n$ oc adm upgrade channel stable-4.18' },
        { t: 'callout', kind: 'warn', wide: true, html: 'Les dates de fin de support évoluent : consulte toujours le <b>Red Hat OpenShift Container Platform Life Cycle Policy</b> avant de planifier. Ne cale jamais une roadmap sur ce que tu as en mémoire.' }
      ]
    },
    {
      title: 'Souscription & pull secret',
      blocks: [
        { t: 'bullets', frag: true, items: [
          'OCP est un produit sous <b>souscription</b> : comptée par paires de cœurs (ou sockets en bare metal) sur les <b>workers</b>.',
          'Il faut un <b>pull secret</b> (console.redhat.com) pour tirer les images de release : il est requis à l\'installation et dans la config du cluster.',
          'Sur un cluster <b>déconnecté</b>, on <b>miroite</b> les images (<code>oc-mirror</code>) vers un registre interne et on remplace le pull secret par celui du miroir.',
          'Les control plane et infra nodes ne sont en général pas comptés (à valider avec ton contrat).'
        ] },
        { t: 'callout', kind: 'onprem', html: 'En réseau isolé, prévois dès le départ le registre miroir, le DNS et la gestion des certificats : c\'est 40 % de l\'effort d\'un projet on-prem (module 3).' }
      ]
    },
    {
      title: 'Quand choisir OCP ? (et quand non)',
      layout: 'two',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '✅ OCP est un bon choix si…', items: ['Tu veux une plateforme supportée de bout en bout', 'Tu as besoin de conformité et de sécurité par défaut', 'Beaucoup d\'équipes, besoin de multi-tenance', 'Cycle de vie et mises à jour pilotés', 'Écosystème Red Hat déjà en place'] },
          right: { title: '🤔 Autre chose peut mieux convenir si…', items: ['Petit cluster, une seule équipe, peu de budget', 'Besoin d\'un CNI ou d\'un OS très spécifique', 'Tu veux la dernière version K8s dès sa sortie', 'Culture « on assemble tout nous-mêmes »', 'Edge très contraint (voir MicroShift, k3s)'] } }
      ]
    },
    {
      title: 'oc : ce que tu ajoutes à kubectl',
      blocks: [
        { t: 'cmds', items: [
          ['oc login --web', 'Authentification via OAuth (navigateur)'],
          ['oc whoami --show-console', 'URL de la console'],
          ['oc new-project demo', 'Crée un Project et s\'y place'],
          ['oc new-app <image|git>', 'Déploie une app depuis une image ou un dépôt (S2I)'],
          ['oc expose svc/web', 'Crée une Route'],
          ['oc rollout status deploy/web', 'Suivi d\'un déploiement'],
          ['oc debug node/<n>', 'Shell privilégié sur un nœud (<code>chroot /host</code>)'],
          ['oc adm top nodes', 'Consommation des nœuds'],
          ['oc adm must-gather', 'Collecte de diagnostic pour le support'],
          ['oc get co', 'Santé des Cluster Operators'],
          ['oc explain route.spec.tls', 'Doc des API, aussi pour les CRD OCP']
        ] }
      ]
    },
    {
      title: 'Quiz éclair',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Quel objet remplace le plus naturellement un Ingress dans OpenShift ?', options: ['Gateway', 'Route', 'Service type LoadBalancer', 'ImageStream'], answer: 1, explain: 'La <b>Route</b> est l\'objet natif OCP servi par le Router HAProxy. L\'Ingress standard reste supporté.' },
        { t: 'quiz', q: 'Tu veux changer un paramètre sysctl sur tous les workers. Que fais-tu ?', options: ['SSH sur chaque nœud et éditer /etc/sysctl.d', 'Créer un MachineConfig ciblant le pool worker', 'Éditer le kubelet à la main', 'Redéployer le cluster'], answer: 1, explain: 'RHCOS est géré de façon déclarative : le <b>MachineConfig</b> est rendu puis appliqué par le Machine Config Operator, avec reboot contrôlé.' },
        { t: 'quiz', q: 'Quel outil déclenche la mise à jour de tous les composants de la plateforme ?', options: ['kubeadm upgrade', 'Le Cluster Version Operator (CVO)', 'Helm', 'Le kubelet'], answer: 1, explain: 'Le <b>CVO</b> applique l\'image de release et pilote les Cluster Operators.' }
      ]
    },
    {
      title: 'Lab : premiers pas avec oc',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'Explorer un cluster OCP', goal: 'Cluster de test : OpenShift Local (CRC), SNO ou ton cluster de lab.', steps: [
          'Connecte-toi : <code>oc login --web https://api.&lt;cluster&gt;:6443</code>',
          'Liste la santé : <code>oc get co</code> — y a-t-il un opérateur non <i>Available</i> ?',
          'Crée un projet : <code>oc new-project demo</code>',
          'Déploie une appli : <code>oc new-app --image=quay.io/redhattraining/hello-world-nginx</code>',
          'Expose-la : <code>oc expose svc/hello-world-nginx</code> puis <code>oc get route</code>',
          'Regarde le SCC attribué au pod : annotation <code>openshift.io/scc</code>',
          'Ouvre un shell sur un nœud : <code>oc debug node/&lt;n&gt;</code> puis <code>chroot /host</code>',
          'Nettoie : <code>oc delete project demo</code>'
        ] }
      ]
    }
  ],
  takeaways: [
    'OCP = K8s + plateforme intégrée + OS géré ; chaque brique est un Operator piloté par le CVO.',
    'Project, Route, SCC, ImageStream, MachineConfig : le vocabulaire à avoir en tête.',
    'Les SCC par défaut (non-root, UID aléatoire) sont la 1re source de friction en migration.',
    'L\'OS est immuable : toute modification passe par un objet déclaratif, jamais à la main.',
    'En managé (ROSA/ARO), tu perds l\'accès au control plane et à beaucoup de réglages : vérifie le périmètre.'
  ]
});
