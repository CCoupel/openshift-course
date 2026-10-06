COURSE.add({
  id: 'm14', num: 14, emoji: '✅',
  title: 'Best practices',
  tagline: 'Une check-list de mise en production, transverse et réutilisable en mission : chaque point renvoie au module qui le traite, rien n\'est répété ici.',
  duration: '≈ 30 min + lab 15 min',
  objectives: [
    'Utiliser une check-list par phase (avant l\'installation, jour 1, avant la production, exploitation, mise à jour, reprise après sinistre) où chaque point renvoie à son module',
    'Dimensionner un cluster on-prem : control plane, workers, nœuds d\'infra, densité, et ce que Red Hat garantit ou non',
    'Poser les décisions d\'architecture transverses : nœuds d\'infra et licences, multi-tenance, haute disponibilité des applications',
    'Reconnaître les anti-patterns et les erreurs fréquentes en mission, et décider d\'un go / no-go de passage en production',
    'Situer l\'ouverture multi-cluster (ACM) et la gouvernance (qui fait quoi, support)'
  ],
  slides: [
    {
      title: 'Une check-list, pas un recueil',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Avant l\'installation', sub: 'DNS, LB, NTP, taille' },
          { label: 'Jour 1', sub: 'accès, certificats', hl: true },
          { label: 'Avant la production', sub: 'sécurité, supervision', hl: true },
          { label: 'Exploitation', sub: 'capacité, alertes' },
          { label: 'Mise à jour', sub: 'avant chaque montée' },
          { label: 'Reprise', sub: 'DR testé', hl: true }
        ], caption: 'Les phases de la check-list de ce module. L\'installation proprement dite est regroupée avec « avant l\'installation ».' },
        { t: 'bullets', frag: true, items: [
          'Chaque module du cours a déjà ses bonnes pratiques : <b>elles ne sont pas recopiées</b>. Ici, chaque ligne est une <b>action à vérifier</b> suivie du <b>module propriétaire</b> à ouvrir pour le détail.',
          'Contenu propre à ce module : dimensionnement, nœuds d\'infra, multi-tenance, haute disponibilité des applications, multi-cluster, critères de go / no-go.',
          'Usage en mission : une colonne « état » (vert, orange, rouge) et un responsable par ligne ; un rouge sur un point <b>bloquant</b> (slide go / no-go) arrête la mise en production.'
        ] },
        { t: 'callout', kind: 'tip', html: 'Version de référence du cours : <b>OpenShift 4.20 EUS</b>. Les chiffres de dimensionnement viennent de la documentation 4.20 ; les règles de pratique (cadences, rôles) sont des <b>propositions à adapter</b> à ton contexte.' }
      ]
    },
    {
      title: 'Gouvernance et support : qui fait quoi',
      blocks: [
        { t: 'table', head: ['Rôle (proposition)', 'Possède', 'Modules'], rows: [
          ['Équipe plateforme', 'Cluster, mises à jour, nœuds, sauvegarde etcd, capacité', 'modules 02, 11, 12'],
          ['Réseau, DNS, PKI, NTP', 'DNS (<code>api</code>, <code>*.apps</code>), LB, pare-feu, certificats d\'entreprise, source de temps', 'modules 03, 04, 07'],
          ['Stockage', 'Baies, ODF ou LVMS, snapshots', 'module 08'],
          ['Sécurité / conformité', 'SCC, PSA, scans, audit, secrets, images', 'modules 06, 09'],
          ['Équipes applicatives', 'Quotas demandés, NetworkPolicy, PDB, répliques, sauvegarde des applications', 'modules 06, 07, 11'],
          ['Red Hat', 'Support, souscription, Insights', 'modules 01, 12']
        ] },
        { t: 'bullets', frag: true, items: [
          'Souscription : comptée par paires de cœurs (ou sockets en bare metal) sur les workers ; control plane et nœuds d\'infra en général non comptés, <b>à valider avec ton contrat</b> (module 01, et slide « Nœuds d\'infra » plus loin).',
          'Un ticket support part avec un <code>must-gather</code> ; l\'Insights Operator envoie des données de configuration à Red Hat si le cluster est connecté (module 12).'
        ] },
        { t: 'callout', kind: 'cloud', html: 'En ROSA/ARO/OSD, le fournisseur porte le control plane et etcd (module 11). On-prem, <b>tout le tableau ci-dessus est à toi</b> : sans propriétaire nommé par ligne, la check-list ne sert à rien.' }
      ]
    },
    {
      title: 'Dimensionner le control plane',
      blocks: [
        { t: 'table', head: ['Nœuds de calcul', 'Densité (namespaces)', 'vCPU control plane', 'RAM (Go)'], rows: [
          ['24', '500', '4', '16'],
          ['120', '1000', '8', '32'],
          ['252', '4000', '24 (avec OVN-Kubernetes)', '128 (avec OVN-Kubernetes)']
        ] },
        { t: 'bullets', frag: true, items: [
          'Ordre de grandeur de la doc 4.20, mesuré sur AWS (<code>r5.4xlarge</code> en control plane) : à prendre comme <b>base de départ</b>, pas comme garantie. La doc précise que le dimensionnement varie avec le nombre d\'objets et leur activité.',
          '<b>Règle des 60 %</b> : garde l\'usage CPU et mémoire du control plane à <b>60 % au plus</b> de la capacité. Quand un master tombe, redémarre ou est mis à jour (drain et reboot en série), les deux autres absorbent la charge.',
          'Les minimums d\'installation (4 vCPU, 16 Go, 100 Go) sont au module 03 ; la latence disque d\'etcd au module 08.',
          'OLM tourne sur le control plane : sa mémoire croît avec le nombre de namespaces et d\'Operators installés (module 04).'
        ] },
        { t: 'callout', kind: 'warn', html: 'La doc 4.20 le dit elle-même : Red Hat ne fournit pas de <b>guide de dimensionnement</b> direct, elle valide des <b>maximums testés</b> (slide suivante). Valide ta taille par une mesure sur ton cluster, pas par un tableau.' }
      ]
    },
    {
      title: 'Workers, réservations et densité',
      blocks: [
        { t: 'table', head: ['Maximum testé (4.x)', 'Valeur', 'À savoir'], rows: [
          ['Nœuds', '2 000', 'Test avec des pods « pause », pas une charge réelle'],
          ['Pods', '150 000', 'Nombre de pods de test'],
          ['Namespaces', '10 000', 'Un keyspace etcd trop gros dégrade les performances : défragmentation périodique'],
          ['CRD', '1 024', 'Au-delà, des requêtes <code>oc</code> peuvent être limitées'],
          ['Routes par déploiement de 2 routeurs', '9 000', 'Sharding des routeurs : module 07']
        ] },
        { t: 'bullets', frag: true, items: [
          '<b>Pods par nœud</b> : 250 par défaut (paramètre <code>maxPods</code> du kubelet). 2 500 est un maximum testé, qui exige un <code>hostPrefix</code> à 20 et un <code>maxPods</code> à 2500 : pas un objectif.',
          'Nombre de nœuds = pods attendus ÷ pods par nœud, puis <b>vérifie CPU, mémoire et disque</b> de l\'application.',
          'Réservations système : par défaut <b>500m de CPU et 1 Gi de mémoire</b> pour <code>system-reserved</code> ; l\'ajustement automatique (<code>autoSizingReserved: true</code> dans une <code>KubeletConfig</code>) est <b>désactivé par défaut</b>.'
        ] },
        { t: 'callout', kind: 'trap', html: 'Les maximums sont testés <b>un par un</b> : viser plusieurs maximums à la fois n\'est pas garanti. Un cluster qui dépasse ces chiffres reste exploitable mais sort de ce que Red Hat a validé. Quotas et capacité au quotidien : modules 06 et 12.' }
      ]
    },
    {
      title: 'Nœuds d\'infra : quoi y mettre, et la licence',
      blocks: [
        { t: 'bullets', items: [
          '<b>Éligibles</b> à l\'exonération d\'après la doc 4.20 : services du control plane, routeur par défaut et Ingress Controller HAProxy, registre interne, monitoring (y compris celui des projets utilisateur), logging, Quay, Red Hat storage (ODF), ACM, ACS, OpenShift GitOps, OpenShift Pipelines, Service Mesh.',
          'Règle de la doc : seuls les composants qui <b>supportent le cluster</b> et ne font pas partie d\'une application utilisateur ; <b>tout autre nœud qui exécute un autre pod est un worker</b> que la souscription doit couvrir.',
          '<b>Trois</b> nœuds d\'infra par cluster sont recommandés par la doc.'
        ] },
        { t: 'table', head: ['Workers', 'Namespaces', 'vCPU infra', 'RAM infra (Go)'], rows: [
          ['27', '500', '4', '24'],
          ['120', '1000', '8', '48'],
          ['252', '4000', '16', '128'],
          ['501', '4000', '32', '128']
        ] },
        { t: 'callout', kind: 'warn', html: 'Ces tailles s\'appliquent aux nœuds qui hébergent <b>monitoring, Ingress et registre</b> seulement ; Prometheus est gourmand en mémoire et dépend de l\'âge du cluster et du nombre de séries. Le <b>contrat de souscription</b> fait foi pour l\'exonération.' }
      ]
    },
    {
      title: 'Nœuds d\'infra : pool dédié et pièges',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'infra-mcp.yaml', code: 'apiVersion: machineconfiguration.openshift.io/v1\nkind: MachineConfigPool\nmetadata:\n  name: infra\nspec:\n  machineConfigSelector:\n    matchExpressions:\n      - {key: machineconfiguration.openshift.io/role, operator: In, values: [worker,infra]}\n  nodeSelector:\n    matchLabels:\n      node-role.kubernetes.io/infra: ""' },
        { t: 'bullets', frag: true, items: [
          'Label <code>node-role.kubernetes.io/infra</code> ; <b>conserve aussi le label <code>worker</code></b> : la doc recommande de garder le double label <code>infra,worker</code> et de gérer le placement par <b>taint</b> et tolérations. Sans le label <code>worker</code>, il faut un pool personnalisé, sinon le MCO ne gère pas le nœud.',
          'Un pool personnalisé <b>écrase</b> la configuration du pool <code>worker</code> quand ils touchent le même fichier ou la même unité.',
          'Déplacer ensuite : <code>nodePlacement</code> de l\'IngressController (module 07), <code>nodeSelector</code> et <code>tolerations</code> du registre, ConfigMap <code>cluster-monitoring-config</code> (module 05).',
          'Mécanique du MCO et des pools : module 02.'
        ] },
        { t: 'callout', kind: 'trap', html: 'Un <code>defaultNodeSelector</code> sur <code>node-role.kubernetes.io/infra=""</code> peut rendre des pods <b>non planifiables</b> (par exemple un pod qui demande un nœud <code>master</code>) : préfère un sélecteur par projet. Taint sans tolérations dans la config des composants : pods <code>Pending</code>.' }
      ]
    },
    {
      title: 'Multi-tenance : le modèle en couches',
      blocks: [
        { t: 'table', head: ['Couche', 'Mécanisme', 'Module'], rows: [
          ['Identité', 'IdP, groupes (synchronisés LDAP ou claims OIDC)', 'module 06'],
          ['Droits', 'RoleBinding par projet, rôles par défaut, pas de cluster-admin permanent', 'module 06'],
          ['Création de projets', 'Project template, <code>self-provisioner</code> retiré', 'module 06'],
          ['Ressources', '<code>ResourceQuota</code>, <code>LimitRange</code>, <code>ClusterResourceQuota</code>', 'modules 06, 12'],
          ['Réseau', '<code>NetworkPolicy</code> deny-all, AdminNetworkPolicy, EgressFirewall', 'module 07'],
          ['Pods', 'SCC, PSA, images autorisées', 'module 09'],
          ['Calcul dédié', 'Nœuds avec taint et tolérations (même mécanique que les nœuds d\'infra)', 'module 02'],
          ['Supervision', 'Monitoring des projets utilisateur, rôles de monitoring', 'module 05']
        ] },
        { t: 'callout', kind: 'tip', html: 'Un projet naît avec ses garde-fous : le <b>project template</b> (module 06) est le point d\'ancrage, versionné en Git (module 10). Un projet créé à la main hors template est un projet sans quota.' },
        { t: 'callout', kind: 'warn', html: 'La multi-tenance d\'un cluster est « douce » : les projets partagent le noyau des nœuds et le control plane. Pour un isolement fort (réglementaire, clients différents), la règle de pratique est de séparer en <b>clusters distincts</b> (slide multi-cluster).' }
      ]
    },
    {
      title: 'Haute disponibilité des applications : survol',
      blocks: [
        { t: 'table', head: ['Levier', 'Rôle', 'Piège'], rows: [
          ['<code>replicas</code> ≥ 2', 'Pas de point de défaillance sur un seul pod', 'Deux répliques sur le même nœud : même panne'],
          ['<code>topologySpreadConstraints</code>', 'Répartit les pods entre domaines (zones, nœuds) selon un <code>maxSkew</code>', '<code>DoNotSchedule</code> peut laisser des pods <code>Pending</code>'],
          ['Anti-affinité de pod', 'Préférence (ou règle) de ne pas placer deux pods ensemble', 'Une préférence n\'est pas une garantie'],
          ['<code>PodDisruptionBudget</code>', 'Nombre minimal de pods disponibles lors d\'une éviction <b>volontaire</b> (drain, mise à jour)', '<code>minAvailable</code> à 100 % ou <code>maxUnavailable: 0</code> bloque le drain']
        ] },
        { t: 'code', lang: 'yaml', file: 'extrait de Deployment et PDB', code: '# Dans le template de pod\ntopologySpreadConstraints:\n- maxSkew: 1\n  topologyKey: topology.kubernetes.io/zone\n  whenUnsatisfiable: DoNotSchedule\n  labelSelector:\n    matchLabels:\n      app: web\n---\napiVersion: policy/v1\nkind: PodDisruptionBudget\nmetadata:\n  name: web\nspec:\n  maxUnavailable: 1\n  selector:\n    matchLabels:\n      app: web' },
        { t: 'callout', kind: 'onprem', html: 'Un PDB n\'est honoré que pour les <b>évictions volontaires</b>, pas pour une panne de nœud. Les zones : en vSphere, les <code>failureDomains</code> se déclarent dans <code>install-config.yaml</code> (module 03) ; ailleurs, les nœuds doivent porter un label de zone pour que la répartition fonctionne (à vérifier selon ta plateforme). Les PDB qui bloquent une mise à jour : module 12.' }
      ]
    },
    {
      title: 'Check-list 1 : avant et pendant l\'installation',
      tag: 'check-list',
      blocks: [
        { t: 'table', head: ['Phase', 'Point à vérifier', 'Module'], rows: [
          ['Avant', 'Méthode d\'installation et plateforme choisies (IPI, Agent, UPI, déconnecté)', 'module 03'],
          ['Avant', 'DNS (<code>api</code>, <code>api-int</code>, <code>*.apps</code>) et load balancers ou VIP prêts', 'module 03 (flux : module 02)'],
          ['Avant', 'NTP, adressage, CIDR sans chevauchement, pull secret', 'module 03'],
          ['Avant', 'Ports ouverts entre tous les nœuds (dont Geneve)', 'module 02'],
          ['Avant', 'Registre miroir et <code>oc-mirror</code> si le réseau est isolé', 'module 03'],
          ['Avant', 'Disques des masters : test <code>fio</code>, p99 fdatasync inférieur à 10 ms', 'module 08'],
          ['Avant', 'Taille validée (slides de dimensionnement), souscription et pull secret disponibles', 'ce module, module 01'],
          ['Pendant', 'Suivi de l\'installation, CSR contrôlés avant approbation', 'module 03'],
          ['Pendant', 'Dossier d\'installation conservé (<code>auth/</code>, <code>metadata.json</code>)', 'module 03']
        ] },
        { t: 'callout', kind: 'onprem', html: 'DNS, NTP, firewall, PKI : des <b>tickets à ouvrir en amont</b> avec d\'autres équipes, qui prennent des semaines (module 03). C\'est le planning, pas la technique, qui retarde une installation on-prem.' }
      ]
    },
    {
      title: 'Check-list 2 : jour 1',
      tag: 'check-list',
      blocks: [
        { t: 'text', html: 'La liste détaillée de la configuration post-installation est dans le <b>module 04</b> (slide « Check-list de configuration post-installation »). Ici, seulement les points qui engagent d\'autres domaines.' },
        { t: 'table', head: ['Point à vérifier', 'Module'], rows: [
          ['Installation validée : <code>oc get co</code>, nœuds, pools, CSR', 'module 03'],
          ['IdP en place, <code>kubeadmin</code> supprimé, kubeconfig admin au coffre', 'module 06'],
          ['Certificats Ingress et API, proxy et CA d\'entreprise, NTP des nœuds', 'module 04'],
          ['Sources de l\'OperatorHub (miroir, catalogues communautaires)', 'module 04'],
          ['Project template : quotas, deny-all, <code>self-provisioner</code> retiré', 'module 06'],
          ['Stockage persistant du registre, du monitoring et du logging', 'modules 08, 05'],
          ['Première sauvegarde etcd, sortie du nœud, planification', 'module 11'],
          ['Canal de mise à jour choisi', 'module 12'],
          ['Nœuds d\'infra et pool dédié si prévus', 'ce module, module 02'],
          ['Configuration versionnée en Git (GitOps)', 'module 10']
        ] }
      ]
    },
    {
      title: 'Check-list 3 : avant la production',
      tag: 'check-list',
      blocks: [
        { t: 'table', head: ['Domaine', 'Point à vérifier', 'Module'], rows: [
          ['Supervision', 'Alertes routées vers un récepteur ; <code>Watchdog</code> reçu régulièrement', 'module 05'],
          ['Supervision', 'PVC du monitoring, rétention choisie ; monitoring utilisateur si besoin', 'module 05'],
          ['Sécurité', 'Images compatibles <code>restricted-v2</code> ; pas de SCC large accordée « pour que ça marche »', 'module 09'],
          ['Sécurité', 'PSA, images autorisées et signatures, secrets hors de Git', 'modules 09, 10'],
          ['Sécurité', 'Chiffrement etcd ; audit expédié vers le SIEM', 'modules 04, 06, 05'],
          ['Sécurité', 'Scan de conformité (Compliance Operator) lu et traité', 'module 09'],
          ['Réseau', 'NetworkPolicy par défaut, sortie contrôlée, exposition HTTP et TCP', 'module 07'],
          ['Stockage', 'StorageClass par défaut, RWX si besoin, snapshots testés', 'module 08'],
          ['Sauvegarde', 'OADP configuré, une restauration d\'application réussie', 'module 11'],
          ['GitOps', 'Dérive traitée, dépôt organisé', 'module 10']
        ] }
      ]
    },
    {
      title: 'Check-list 4 : en exploitation',
      tag: 'check-list',
      blocks: [
        { t: 'table', head: ['Point à vérifier', 'Module'], rows: [
          ['Alertes triées, silences datés et commentés', 'module 05'],
          ['Capacité : requests, quotas, control plane sous 60 %', 'module 12, ce module'],
          ['CSR des nœuds approuvés après vérification du demandeur', 'module 12'],
          ['Revue périodique des bindings RBAC et des SCC accordées', 'module 06'],
          ['Operators critiques en approbation manuelle, <code>InstallPlan</code> traités', 'module 04'],
          ['Incident : cluster d\'abord (<code>oc get co</code>, <code>mcp</code>, nœuds), puis <code>must-gather</code> pour le ticket', 'module 12']
        ] },
        { t: 'callout', kind: 'tip', html: 'Mets une <b>date de revue</b> en face de chaque ligne (mensuelle, trimestrielle) : une check-list sans cadence reste un document, pas une pratique.' }
      ]
    },
    {
      title: 'Check-list 5 : avant chaque mise à jour',
      tag: 'check-list',
      blocks: [
        { t: 'table', head: ['Point à vérifier', 'Module'], rows: [
          ['Sauvegarde etcd toute fraîche, hors du cluster', 'module 11'],
          ['Opérateurs sains, condition <code>Upgradeable</code>, <code>admin-acks</code> lus (jamais acquittés à l\'aveugle)', 'module 12'],
          ['APIs retirées : alertes <code>APIRemoved…</code> traitées', 'module 12'],
          ['PDB trop stricts, capacité pour le drain, pools sans <code>Degraded</code>', 'modules 12, 02'],
          ['Operators OLM compatibles avec la version cible', 'module 04'],
          ['<code>MachineHealthCheck</code> mis en pause pendant l\'opération', 'module 12'],
          ['Canal, chemin (dont EUS → EUS), mise à jour testée avant sur un autre cluster', 'module 12'],
          ['Cluster déconnecté : miroir à jour', 'module 12 (outil : module 03)']
        ] },
        { t: 'callout', kind: 'warn', html: 'Cluster encore en OpenShift SDN : migration vers OVN-Kubernetes obligatoire avant la 4.17 (module 07). Une mise à jour est une <b>fenêtre de changement</b> : annonce-la et garde un plan de retour.' }
      ]
    },
    {
      title: 'Check-list 6 : reprise après sinistre',
      tag: 'check-list',
      blocks: [
        { t: 'table', head: ['Point à vérifier', 'Module'], rows: [
          ['Procédure de reprise choisie selon la situation (quorum perdu, retour arrière, membre défaillant)', 'module 11'],
          ['RPO et RTO fixés, modèle de DR choisi (reconstruire, passif, étendu)', 'module 11'],
          ['Ce qui n\'est dans aucune sauvegarde (DNS, LB, certificats d\'entreprise, secrets externes) documenté ailleurs', 'module 11'],
          ['Configuration rejouable depuis Git', 'module 10'],
          ['Exercices datés : restauration d\'un namespace, restauration etcd sur un cluster jetable', 'module 11'],
          ['Procédure et accès (SSH, kubeconfig, stockage objet) <b>hors du cluster</b>', 'module 11']
        ] },
        { t: 'callout', kind: 'trap', html: 'Une sauvegarde jamais restaurée n\'est qu\'une hypothèse, et une procédure stockée dans un wiki hébergé sur le cluster en panne est illisible le jour du sinistre (module 11).' }
      ]
    },
    {
      title: 'Écart cloud : ce qui n\'est pas fourni on-prem',
      blocks: [
        { t: 'table', head: ['Sujet', 'En cloud', 'On-prem : à ta charge', 'Module'], rows: [
          ['Load balancers', 'Créés par l\'installeur', 'LB externe ou VIP keepalived, HA du LB incluse', 'module 02, 03'],
          ['DNS', 'Enregistrements créés', 'Zone, <code>api</code>, <code>api-int</code>, <code>*.apps</code>', 'module 03'],
          ['Stockage', 'Classes et registre automatiques', 'Backend CSI, LVMS ou ODF, stockage du registre', 'module 08'],
          ['Certificats', 'Services du fournisseur', 'PKI d\'entreprise : API et Ingress à remplacer', 'module 04'],
          ['NTP', 'Fourni', 'Sources internes, MachineConfig chrony', 'module 03, 04'],
          ['Nœuds', 'Machine API et autoscaling', 'Machine API selon la méthode d\'installation, sinon process humain', 'module 02, 12'],
          ['Control plane / etcd', 'Géré en ROSA/ARO', 'Sauvegarde, restauration, exercices', 'module 11']
        ] },
        { t: 'callout', kind: 'cloud', html: 'Ce tableau est la raison d\'être du cours on-prem : chaque ligne « fournie » en cloud devient un <b>point de la check-list avec un propriétaire</b>.' }
      ]
    },
    {
      title: 'Ouverture multi-cluster : ACM en survol',
      blocks: [
        { t: 'bullets', items: [
          'Red Hat Advanced Cluster Management for Kubernetes (ACM) : quatre capacités d\'après la doc : <b>cycle de vie des clusters</b> (créer, importer, gérer), <b>cycle de vie des applications</b>, <b>gouvernance</b> (politiques de conformité) et <b>observabilité</b> (état et métriques des clusters gérés).',
          'S\'installe comme Operator sur un cluster « hub » (ressource <code>MultiClusterHub</code>) qui pilote des clusters gérés.',
          'ACM 2.14 : la matrice de support liste <b>OCP 4.20 EUS</b> pour le hub et pour les clusters gérés. Version d\'ACM à retenir pour ton cluster : <b>à vérifier</b> sur la matrice de support.',
          'Lien avec le cours : l\'application d\'une politique ou d\'une configuration <b>sur plusieurs clusters</b> (module 10) ; les Hosted Control Planes s\'appuient sur MCE/ACM (module 02).'
        ] },
        { t: 'callout', kind: 'tip', html: 'ACM fait partie des composants que la doc 4.20 cite comme éligibles à l\'exécution sur des <b>nœuds d\'infra</b> (slide « quoi y mettre »). Souscription et prérequis du hub : <b>à vérifier</b> auprès de Red Hat.' },
        { t: 'callout', kind: 'warn', html: 'Hors périmètre du cours : installation et exploitation d\'ACM. À étudier quand la check-list doit s\'appliquer à plusieurs clusters : une politique ACM remplace alors une vérification manuelle par cluster.' }
      ]
    },
    {
      title: 'Anti-patterns courants',
      blocks: [
        { t: 'table', head: ['Anti-pattern', 'Conséquence', 'Module'], rows: [
          ['Sauvegarde etcd jamais sortie du nœud ni restaurée', 'Pas de reprise le jour du sinistre', 'module 11'],
          ['<code>kubeadmin</code> conservé, <code>cluster-admin</code> partagé', 'Pas d\'attribution des actes, accès permanent', 'module 06'],
          ['Applications métier sur les nœuds d\'infra', 'Nœuds à compter en souscription, composants plateforme étouffés', 'module 02, ce module'],
          ['Réglages faits à la main sur le cluster, non versionnés', 'Cluster impossible à reconstruire, dérive', 'module 10'],
          ['Operators en mise à jour automatique partout', 'Changement non planifié sur le stockage, le réseau', 'module 04'],
          ['Mise à jour sans lire les <code>admin-acks</code>, PDB ignorés', 'Mise à jour bloquée ou API retirée utilisée', 'module 12'],
          ['Monitoring sans PVC ni routage d\'alertes', 'Métriques perdues, personne n\'est prévenu', 'module 05'],
          ['Secrets en clair dans Git', 'Secret à révoquer, historique compromis', 'module 10'],
          ['SCC <code>anyuid</code> ou <code>privileged</code> accordées largement', 'Garde-fous supprimés', 'module 09'],
          ['Masters sur un datastore partagé et saturé', 'etcd instable, opérateurs Degraded', 'module 08']
        ] }
      ]
    },
    {
      title: 'Critères de passage en production : go / no-go',
      blocks: [
        { t: 'table', head: ['Critère', 'Preuve attendue', 'Bloquant ?', 'Module'], rows: [
          ['Sauvegarde etcd', 'Archive hors du cluster, une restauration testée', 'Oui', 'module 11'],
          ['Accès', 'IdP actif, <code>kubeadmin</code> supprimé, groupes en place', 'Oui', 'module 06'],
          ['Alerting', '<code>Watchdog</code> reçu, receiver testé', 'Oui', 'module 05'],
          ['Stockage du monitoring', 'PVC en place', 'Oui', 'module 05'],
          ['Certificats', 'API et Ingress de la PKI d\'entreprise', 'Oui', 'module 04'],
          ['Capacité', 'Control plane sous 60 %, plan de croissance', 'Oui', 'ce module'],
          ['Mises à jour', 'Canal et fenêtre définis, chemin décrit', 'Oui', 'module 12'],
          ['GitOps', 'Configuration versionnée', 'Non (à planifier)', 'module 10'],
          ['Conformité', 'Scan lu, écarts traités ou acceptés', 'Selon le contexte', 'module 09'],
          ['Support', 'Abonnement actif, procédure de ticket connue', 'Oui', 'module 01, 12']
        ] },
        { t: 'callout', kind: 'tip', html: 'Les colonnes « bloquant » sont une <b>proposition à adapter</b> : ce qui compte, c\'est que le go / no-go soit décidé avant la mise en production, par les propriétaires de la slide gouvernance, et pas par le planning.' }
      ]
    },
    {
      title: 'Erreurs fréquentes en mission',
      blocks: [
        { t: 'cards', items: [
          { front: 'Le DNS arrive en dernier', back: 'Le wildcard <code>*.apps</code> oublié bloque la fin de l\'installation (module 03).' },
          { front: 'Deux masters « pour économiser »', back: 'Deux membres etcd ne protègent de rien : quorum de 2 (module 02).' },
          { front: 'Le SNO vendu comme HA', back: 'Un seul nœud : tout s\'arrête au reboot ou à la mise à jour (module 02).' },
          { front: 'Tout le monde cluster-admin', back: 'Le cluster marche, jusqu\'au premier acte non attribuable (module 06).' },
          { front: 'On met à jour la prod en premier', back: 'Teste sur un cluster moins critique, avec candidate ou fast (module 12).' },
          { front: 'La sauvegarde, plus tard', back: 'Jamais restaurée, donc non prouvée (module 11).' }
        ] },
        { t: 'callout', kind: 'trap', html: 'Le point commun : on traite en dernier ce qui dépend d\'une autre équipe (DNS, PKI, stockage, sauvegarde). Mets ces lignes <b>en tête du planning</b>.' }
      ]
    },
    {
      title: 'Quiz',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Ton control plane à trois nœuds tourne à 80 % de CPU en régime normal. Pourquoi est-ce un problème ?', options: ['Aucun problème tant que les nœuds ne sont pas saturés', 'Quand un master tombe, redémarre ou est mis à jour, les deux autres doivent absorber la charge ; la doc demande de rester à 60 % au plus', 'OpenShift refuse de démarrer au-dessus de 75 %', 'Le CPU des masters n\'est pas pris en compte par le scheduler'], answer: 1, explain: 'Le control plane est mis à jour en série (drain, reboot) et subit les pannes : la capacité restante doit suffire. La doc 4.20 demande de garder l\'usage à 60 % au plus.' },
        { t: 'quiz', q: 'Tu veux un nœud d\'infra. Tu lui retires le label <code>worker</code> sans créer de pool personnalisé. Quel est le risque ?', options: ['Aucun : le label <code>infra</code> suffit', 'Le MCO ne reconnaît plus le nœud : sans pool personnalisé, il n\'est géré ni par le pool <code>worker</code> ni par un pool <code>infra</code>', 'Le nœud est facturé deux fois', 'Les pods d\'infra ne peuvent plus s\'y exécuter'], answer: 1, explain: 'La doc recommande de garder le double label <code>infra,worker</code> et d\'utiliser des taints. Un nœud avec un label autre que master ou worker n\'est pas reconnu par le MCO sans pool personnalisé.' },
        { t: 'quiz', q: 'Un <code>PodDisruptionBudget</code> avec <code>minAvailable: 100%</code> sur un Deployment de 3 répliques, pendant une mise à jour du cluster. Que se passe-t-il ?', options: ['Les nœuds sont mis à jour sans problème grâce au PDB', 'Le drain d\'un nœud qui héberge un de ces pods peut être bloqué, donc la mise à jour avec lui', 'Le PDB est ignoré pendant les mises à jour', 'OpenShift supprime le PDB'], answer: 1, explain: 'Un PDB à 100 % de disponibilité interdit toute éviction volontaire : il peut bloquer le drain d\'un nœud et donc la mise à jour (module 12).' }
      ]
    },
    {
      title: 'Lab : audite ton cluster avec la check-list',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'Audit en lecture seule d\'un cluster', goal: 'Remplis la check-list sur ton propre cluster de lab : quels points sont verts, orange, rouges ? Rien n\'est modifié.', steps: [
          'Prérequis : environnement E1 (SNO) avec <code>cluster-admin</code>, voir module 00. Les commandes ci-dessous sont en <b>lecture seule</b>.',
          'Inventaire : <code>oc get clusterversion</code>, <code>oc get co</code>, <code>oc get nodes</code>, <code>oc get mcp</code>, <code>oc get csr</code> ; canal : <code>oc get clusterversion version -o jsonpath=\'{.spec.channel}{"\\n"}\'</code>. Qu\'en dit la check-list 2 ?',
          'Dimensionnement : <code>oc adm top nodes</code> et <code>oc describe node &lt;nœud&gt; | grep -A8 \'Allocated resources\'</code> ; compare avec la slide control plane et la règle des 60 % ; <code>oc get pdb -A</code> et <code>oc get resourcequota -A</code>.',
          'Accès et supervision : <code>oc get secret kubeadmin -n kube-system</code> (existe-t-il encore ?), <code>oc get oauth cluster -o jsonpath=\'{.spec.identityProviders[*].name}{"\\n"}\'</code>, <code>oc get pvc -n openshift-monitoring</code>, <code>oc get apiserver cluster -o jsonpath=\'{.spec.audit.profile}{"\\n"}\'</code>.',
          'Synthèse : note chaque ligne des check-lists 2 et 3 (vert, orange, rouge), puis liste les trois rouges les plus bloquants avec le module à relire. Quel est ton go / no-go ?',
          '(bonus) Cluster fictif : 3 masters de 4 vCPU et 16 Go sur un datastore partagé, 120 workers, <code>kubeadmin</code> actif, monitoring sans PVC, aucune sauvegarde etcd, Operators en mise à jour automatique. Donne le go / no-go en cinq minutes et les trois premières actions, avec le module à ouvrir.',
          '(bonus) <code>oc get subscriptions.operators.coreos.com -A -o custom-columns=NS:.metadata.namespace,NOM:.metadata.name,APPROBATION:.spec.installPlanApproval</code> : quels Operators sont en approbation automatique, et lesquels devraient passer en manuelle (module 04) ?'
        ] }
      ]
    }
  ],
  takeaways: [
    'Une check-list de mise en production par phase, où chaque point renvoie à son module : on la remplit avec un propriétaire et une date de revue par ligne.',
    'Dimensionnement : repère de la doc 4.20 pour le control plane (4 vCPU et 16 Go pour 24 nœuds de calcul), usage maintenu sous 60 %, 250 pods par nœud par défaut, maximums testés et non garantis.',
    'Nœuds d\'infra : seuls les composants de support du cluster sont exonérés, le contrat de souscription fait foi ; garde le double label <code>infra,worker</code> et gère le placement par taints.',
    'Multi-tenance en couches (identité, droits, quotas, réseau, pods) ancrée dans le project template ; haute disponibilité des applications : répliques, <code>topologySpreadConstraints</code>, PDB raisonnables.',
    'Go / no-go avant la production : sauvegarde etcd restaurée, accès par IdP, alerting reçu, monitoring persistant, certificats, capacité, plan de mise à jour.',
    'ACM ouvre vers le multi-cluster (gouvernance par politiques) : un survol, à approfondir quand la check-list doit s\'appliquer à plusieurs clusters.'
  ]
});
