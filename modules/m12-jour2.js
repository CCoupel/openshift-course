COURSE.add({
  id: 'm12', num: 12, emoji: '🔧',
  title: 'Opérations jour 2',
  tagline: 'Mettre à jour sans mauvaise surprise, étendre le cluster, diagnostiquer et tenir la capacité : ce qui occupe un admin OCP au quotidien.',
  duration: '≈ 60 min + lab 20 min',
  objectives: [
    'Préparer et conduire une mise à jour : canaux, <code>oc adm upgrade</code>, acquittements (admin-acks) et <code>Upgradeable=False</code>',
    'Maîtriser la cadence des workers (pause des MachineConfigPools) et le principe de l\'EUS-to-EUS',
    'Ajouter, retirer et maintenir des nœuds on-prem, et gérer les CSR et les certificats des nœuds',
    'Diagnostiquer avec <code>must-gather</code>, <code>oc adm inspect</code>, <code>oc adm node-logs</code> et reconnaître les incidents courants',
    'Suivre la capacité : requests, quotas, réservations des nœuds, autoscaling en survol'
  ],
  slides: [
    {
      title: 'Jour 2 : quatre chantiers',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Mettre à jour', sub: 'CVO, canaux, MCO', hl: true },
          { label: 'Étendre', sub: 'nœuds, CSR, certificats' },
          { label: 'Diagnostiquer', sub: 'must-gather, logs', hl: true },
          { label: 'Dimensionner', sub: 'quotas, réservations' }
        ], caption: 'Le cluster est installé (module 03), configuré (04), observé (05) : il faut maintenant le <b>faire vivre</b> des années.' },
        { t: 'bullets', frag: true, items: [
          'Frontières : installation → module 03 ; certificat par défaut et config jour 1 → module 04 ; supervision → module 05 ; réseau → module 07 ; sécurité → module 09 ; sauvegarde et restauration etcd → module 11.',
          'Référence : <b>4.20 EUS</b> ; exemple de chemin EUS → EUS : <b>4.20 → 4.22</b> (4.22 : dernière EUS, module 01).'
        ] },
        { t: 'callout', kind: 'cloud', html: "En ROSA/ARO/OSD, les mises à jour du control plane sont <b>planifiées avec le fournisseur</b> et les nœuds gérés pour toi. On-prem, <b>tout ce module est à ta charge</b>." }
      ]
    },
    {
      title: 'Comment fonctionne une mise à jour',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Canal', sub: 'stable-4.20, eus-4.20…' },
          { label: 'Graphe', sub: 'chemins recommandés (OSUS)' },
          { label: 'CVO', sub: 'orchestre les opérateurs', hl: true },
          { label: 'Control plane', sub: 'opérateurs, masters' },
          { label: 'Workers', sub: 'MCO : drain, reboot, un par un' }
        ], caption: 'Le <b>Cluster Version Operator</b> interroge le service de mise à jour, met à jour les Cluster Operators, puis le <b>MCO</b> met à jour les nœuds (module 02).' },
        { t: 'cmds', items: [
          ['oc get clusterversion', 'Version courante, canal, conditions'],
          ['oc adm upgrade', 'Mises à jour disponibles dans le canal'],
          ['oc get co', 'État des Cluster Operators (Available, Progressing, Degraded)']
        ] },
        { t: 'callout', kind: 'k8s', html: "Pas de <code>kubeadm upgrade</code> nœud par nœud : tu déclares la <b>version cible</b> et les opérateurs font le reste. Ton rôle : <b>préparer</b>, <b>déclencher</b> et <b>surveiller</b>." }
      ]
    },
    {
      title: 'Canaux de mise à jour',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Canal', 'Contenu'], rows: [
          ['<code>candidate-4.x</code>', 'Nouvelles releases dès leur construction, avant les tests finaux'],
          ['<code>fast-4.x</code>', 'Releases testées et supportées, publiées avec un erratum'],
          ['<code>stable-4.x</code>', 'Après un délai sur <code>fast</code> : de l\'ordre d\'une à deux semaines pour un correctif, plus long (de l\'ordre de 45 à 90 jours) pour le tout premier chemin vers une nouvelle version mineure'],
          ['<code>eus-4.x</code>', 'Releases du <code>stable</code> en même temps ; sert surtout aux mises à jour <b>Control Plane Only</b> (EUS → EUS)']
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc adm upgrade channel stable-4.20\n$ oc get clusterversion version -o jsonpath='{.spec.channel}{\"\\n\"}'" },
        { t: 'callout', kind: 'tip', wide: true, html: "En production : <b>stable</b>. <b>candidate</b> et <b>fast</b> pour tester avant les autres clusters. Le choix du canal ne met rien à jour : il décide ce qui t'est <b>proposé</b>." }
      ]
    },
    {
      title: 'Préparer : la check-list avant de lancer',
      blocks: [
        { t: 'table', head: ['Contrôle', 'Pourquoi / comment'], rows: [
          ['<b>Sauvegarde etcd</b>', 'Procédure du module 11 ; la doc la demande avant toute mise à jour'],
          ['<b>Opérateurs sains</b>', '<code>oc get co</code> : tous Available, pas Degraded ; la condition <code>Upgradeable</code> doit être <code>True</code> (sinon <code>ClusterNotUpgradeable</code> après plus d\'une heure)'],
          ['<b>APIs retirées</b>', 'Alertes <code>APIRemovedInNextReleaseInUse</code> et <code>APIRemovedInNextEUSReleaseInUse</code> : migre les usages avant d\'acquitter'],
          ['<b>PodDisruptionBudgets</b>', 'Un PDB trop strict (<code>minAvailable: 1</code> sur 1 réplica) bloque le drain d\'un nœud'],
          ['<b>Capacité</b>', 'Assez de nœuds libres pour déplacer les pods pendant le drain'],
          ['<b>Pools MCO</b>', 'Valeur par défaut <code>maxUnavailable: 1</code> ; pas de pool Degraded (module 02)'],
          ['<b>Operators OLM</b>', 'Compatibles avec la version cible (module 04, <code>olm.maxOpenShiftVersion</code>)'],
          ['<b>Réseau</b>', 'Cluster encore en OpenShift SDN : migration obligatoire avant la 4.17 (module 07)']
        ] },
        { t: 'callout', kind: 'tip', html: "<code>oc adm upgrade recommend</code> (slide suivante) fait une partie de ces contrôles à ta place (alertes, opérateurs) ; il ne remplace ni ta sauvegarde ni ton plan de retour." }
      ]
    },
    {
      title: 'Admin-acks et Upgradeable=False',
      layout: 'two',
      blocks: [
        { t: 'bullets', frag: true, items: [
          'Avant certaines montées de version mineure, OCP exige un <b>acquittement manuel</b> : le cluster passe <code>Upgradeable=False</code> avec la raison <code>AdminAckRequired</code>.',
          'Objectif : t\'obliger à vérifier que <b>des APIs Kubernetes retirées</b> ne sont plus utilisées par tes charges et tes outils.',
          'L\'acquittement se fait dans la ConfigMap <code>admin-acks</code> du namespace <code>openshift-config</code>.',
          '<b>Exemple de la doc 4.20</b> (montée 4.19 → 4.20) : clé <code>ack-4.19-admissionregistration-v1beta1-api-removals-in-4.20</code> ; la clé change à chaque version.'
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc -n openshift-config patch cm admin-acks --patch \\\n    '{\"data\":{\"ack-4.19-admissionregistration-v1beta1-api-removals-in-4.20\":\"true\"}}' --type=merge" },
        { t: 'callout', kind: 'trap', wide: true, html: "N'acquitte <b>jamais à l'aveugle</b> : la doc rappelle que l'admin est responsable de repérer et migrer les APIs retirées (le cluster ne voit pas les outils externes ni les charges inactives). Pour la 4.22, la doc indique <b>aucune suppression d'API Kubernetes</b>." }
      ]
    },
    {
      title: 'Autres causes de refus : exemple d\'une politique d\'image',
      blocks: [
        { t: 'bullets', frag: true, items: [
          '<b>Upgradeable=False</b> peut aussi venir d\'un Operator qui déclare une version maximale (<code>olm.maxOpenShiftVersion</code>, module 04) ou d\'un composant dégradé.',
          '<b>Montée vers 4.21 et sigstore</b> : les release notes 4.21 indiquent que si ton cluster 4.20 (ou antérieur) possède déjà une cluster image policy nommée <code>openshift</code>, la mise à jour le marque <b>non mettable à jour</b> (<code>Upgradeable=False</code>) à cause de la politique par défaut.',
          'La doc sigstore 4.20 liste, pour les clusters avec ImageContentSourcePolicy ou ImageDigestMirrorSet, un prérequis : <b>miroiter les signatures sigstore</b> avant la mise à jour, puis acquitter dans <code>admin-acks</code> (clé citée : <code>ack-4.20-sigstore-in-4.21</code>).'
        ] },
        { t: 'callout', kind: 'warn', html: "Le texte exact et la clé d'acquittement de ce cas sont <b>à relire dans « Preparing to update to 4.21 »</b> avant ta montée : la clé n'a pas été retrouvée dans les release notes 4.21 lues. C'est un exemple de plus : <b>lis les notes de la version cible</b> à chaque mineure (module 09 pour les images signées)." }
      ]
    },
    {
      title: 'Lancer la mise à jour',
      blocks: [
        { t: 'cmds', items: [
          ['oc adm upgrade recommend', 'Recommandation de version et pré-contrôle (alertes, opérateurs) ; lecture seule'],
          ['oc adm upgrade --to-latest=true', 'Vers la dernière version recommandée du canal'],
          ['oc adm upgrade --to=4.20.z', 'Vers une version précise (remplace z par la valeur choisie)'],
          ['oc adm upgrade --allow-not-recommended --to=4.20.z', 'Vers une version non recommandée : tu acceptes le risque connu (à éviter)'],
          ['oc adm upgrade status', 'Progression de la mise à jour'],
          ['watch oc get co', 'Opérateurs pendant la mise à jour']
        ] },
        { t: 'callout', kind: 'ocp', html: "<code>oc adm upgrade recommend</code> est <b>GA en 4.20</b> (Technology Preview en 4.18) ; il signale par exemple des alertes <code>ClusterOperatorDown</code> qui peuvent empêcher la fin d'une mise à jour. Les options exactes de ta version : <code>oc adm upgrade --help</code>." },
        { t: 'callout', kind: 'trap', html: "Une mise à jour <b>vers une version non recommandée</b> signifie qu'un risque est connu pour ton chemin : lis la raison affichée (<code>oc adm upgrade</code>) avant d'insister." }
      ]
    },
    {
      title: 'Suivre et garder la main sur les workers',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc adm upgrade status\n$ oc get co\n$ oc get mcp\n$ oc get nodes\n\n# Suspendre les mises à jour d'un pool (ex. workers)\n$ oc patch mcp/worker --type merge --patch '{\"spec\":{\"paused\":true}}'\n# ... et reprendre\n$ oc patch mcp/worker --type merge --patch '{\"spec\":{\"paused\":false}}'" },
        { t: 'bullets', items: [
          'Les <b>opérateurs</b> du control plane se mettent à jour d\'abord, puis le MCO fait <b>drain → mise à jour → reboot</b>, nœud par nœud (<code>maxUnavailable: 1</code> par défaut).',
          '<b>Pool en pause</b> : ses nœuds ne sont pas mis à jour ; utile pour une fenêtre de maintenance ou une montée « canary » pool par pool.',
          'Un nœud en cours de mise à jour redémarre : prévois des PDB cohérents et des réplicas suffisants.'
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: "Un pool laissé <b>en pause</b> bloque les mises à jour mineures suivantes et <b>inhibe des tâches de maintenance comme la rotation des certificats</b> (avertissement de la doc) : ne l'oublie jamais. Sur SNO, mise à jour = redémarrage de l'unique nœud : fenêtre de maintenance (module 02)." }
      ]
    },
    {
      title: 'EUS vers EUS : mettre à jour deux mineures',
      blocks: [
        { t: 'flow', nodes: [
          { label: '4.20 EUS', sub: 'départ' },
          { label: 'Pause des pools', sub: 'workers (non-master)', hl: true },
          { label: 'Control plane', sub: '→ 4.21 puis → 4.22' },
          { label: 'Reprise des pools', sub: 'paused: false', hl: true },
          { label: '4.22 EUS', sub: 'workers à jour' }
        ], caption: 'Procédure « <b>Control Plane Only</b> » : le control plane traverse la version intermédiaire ; les workers, eux, ne sont mis à jour qu\'<b>une fois</b> (4.20 → 4.22).' },
        { t: 'bullets', frag: true, items: [
          'Le canal <code>eus-4.x</code> sert à cette procédure ; seuls les clusters avec des pools <b>non control plane</b> peuvent la suivre avec ces pools en pause.',
          'Étapes : mettre en pause tous les pools non-master, passer le control plane à la mineure intermédiaire puis à la cible, puis <b>reprendre</b> les pools pour mettre à jour les workers.',
          'Pas de mise à jour automatique intermédiaire des workers : moins de reboots, mais <b>les écarts de version</b> sont limités : lis les contraintes de la doc.'
        ] },
        { t: 'callout', kind: 'warn', html: "Commandes exactes, conditions préalables (skew control plane / workers) et enchaînement des canaux : <b>à relire dans « Performing a Control Plane Only update »</b> de ta version avant de l'utiliser en production (non relues en détail pour 4.20 ici)." }
      ]
    },
    {
      title: 'Mettre à jour un cluster déconnecté',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          'Pas d\'accès au service public : le CVO ne peut pas lire le graphe de mise à jour.',
          'Solution : installer <b>OpenShift Update Service (OSUS)</b> en local : Operator, image de <b>graph data</b>, application <code>UpdateService</code>, puis pointer les clusters dessus.',
          'Les <b>images de release</b> cibles doivent être mirroées avant (<code>oc-mirror</code>, module 03) vers ton registre.',
          'Une instance OSUS peut servir des milliers de clusters (réplicas ajustables).'
        ] },
        { t: 'callout', kind: 'onprem', html: "En déconnecté, une mise à jour = <b>miroir à jour + graphe à jour + fenêtre</b>. Prévois le <b>process de synchronisation</b> du miroir (fréquence, validation) en même temps que le calendrier de mises à jour." },
        { t: 'callout', kind: 'warn', wide: true, html: "Procédure détaillée, options de mise à jour d'une release précise sans graphe et rôle des <code>ImageDigestMirrorSet</code> : doc « Updating a cluster in a disconnected environment » de ta version (à vérifier)." }
      ]
    },
    {
      title: 'Ajouter des nœuds on-prem',
      blocks: [
        { t: 'table', head: ['Situation', 'Comment', 'Remarque'], rows: [
          ['<b>IPI vSphere / bare metal</b> (Machine API)', 'Scaler un <code>MachineSet</code> (ou ajouter un <code>BareMetalHost</code>)', 'Création et CSR automatisés (module 02)'],
          ['<b>Agent / sans Machine API</b>', '<code>oc adm node-image create</code> : ISO pour démarrer un ou plusieurs workers', 'Documenté pour clusters on-prem ; <b>Machine ou BareMetalHost non créés automatiquement</b>'],
          ['<b>UPI</b>', 'Image RHCOS + Ignition worker, puis approbation des CSR', 'Comme à l\'installation (module 03)'],
          ['<b>Worker RHEL</b>', 'Non : nœuds de calcul RHEL retirés depuis la 4.19', 'RHCOS uniquement (module 01)']
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "# Après démarrage du nouveau nœud\n$ oc get csr | grep Pending\n$ oc adm certificate approve NOM_DU_CSR\n$ oc get nodes" },
        { t: 'callout', kind: 'tip', html: "Ne scale jamais un MachineSet sans avoir vérifié <b>capacité réseau</b> (DHCP, IPAM), <b>DNS</b> et stockage du template : c'est la cause n°1 de Machines bloquées en <code>Provisioning</code>." }
      ]
    },
    {
      title: 'CSR et certificats des nœuds',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          'Les certificats des nœuds sont <b>signés par le cluster</b> et <b>renouvelés automatiquement</b> (tous les 30 jours d\'après la doc 4.20).',
          '<b>Deux familles de CSR</b> : <code>kubernetes.io/kube-apiserver-client-kubelet</code> (demande du kubelet, dont <code>node-bootstrapper</code>) et <code>kubernetes.io/kubelet-serving</code> (certificat de serveur, à approuver sur les installations UPI).',
          'Le CA des kubelets se renouvelle automatiquement (292 jours) ; un renouvellement manuel anticipé est possible par annotation du secret <code>kube-apiserver-to-kubelet-signer</code>.',
          'Après un <b>long arrêt</b> du cluster, des certificats peuvent avoir expiré : la doc a une procédure de reprise (« scenario 3 : expired certs ») qui passe par l\'approbation de CSR.'
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc get csr | grep -i pending\n$ oc get csr -o name | xargs oc adm certificate approve   # à n'utiliser que si tu as vérifié l'origine" },
        { t: 'callout', kind: 'trap', wide: true, html: "N'approuve pas en masse sans <b>contrôler les demandeurs</b> (nom du nœud attendu) : un CSR frauduleux donne un faux nœud dans ton cluster. Remplacement des certificats API et Ingress : module 04." }
      ]
    },
    {
      title: 'Retirer un nœud, faire une maintenance',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: "# 1. Interdire les nouveaux pods\n$ oc adm cordon worker-3\n\n# 2. Évacuer proprement\n$ oc adm drain worker-3 --ignore-daemonsets --delete-emptydir-data\n\n# 3. Maintenance (matériel, firmware...)\n\n# 4. Retour en service\n$ oc adm uncordon worker-3" },
        { t: 'bullets', items: [
          '<b>Retrait définitif</b> : drain, puis suppression de la Machine (ou du <code>BareMetalHost</code>) si la Machine API gère le nœud ; sinon <code>oc delete node</code> après arrêt.',
          'Un <b>PDB trop strict</b> ou des pods sans contrôleur font échouer le drain : le message dit lequel.',
          'Sur bare metal : si ton firmware impose un reboot, <b>drain avant</b> ; le MCO n\'est pas au courant de tes opérations manuelles.'
        ] },
        { t: 'callout', kind: 'tip', html: "<code>--delete-emptydir-data</code> supprime les données <code>emptyDir</code> : elles sont éphémères, mais vérifie qu'aucune appli ne s'en sert comme cache critique." }
      ]
    },
    {
      title: 'Diagnostiquer : la boîte à outils',
      blocks: [
        { t: 'table', head: ['Outil', 'Usage'], rows: [
          ['<code>oc adm must-gather</code>', 'Collecte des données de diagnostic dans un pod temporaire (nouveau projet) ; sortie dans <code>must-gather.local.*</code> ou <code>--dest-dir</code> ; <code>--image</code> pour un plugin'],
          ['<code>oc adm inspect ns/…</code>', 'Collecte ciblée d\'un namespace ou d\'une ressource'],
          ['<code>oc adm node-logs NŒUD -u kubelet</code>', 'Journal d\'une unité systemd d\'un nœud (via l\'API)'],
          ['<code>oc debug node/NŒUD</code>', 'Pod privilégié puis <code>chroot /host</code> (module 06 pour les droits)'],
          ['<code>oc adm top nodes</code> / <code>pods</code>', 'Consommation (Metrics Server, module 05)'],
          ['<code>oc describe co NOM</code>', 'Pourquoi un Cluster Operator est Degraded']
        ] },
        { t: 'callout', kind: 'tip', html: "Pour un ticket Red Hat : <b>must-gather</b> joint à la demande. Le <b>Insights Operator</b> envoie par défaut des données de configuration à Red Hat toutes les deux heures, consultables dans l'Advisor de la console cloud Red Hat (si le cluster est connecté et que tu l'acceptes)." },
        { t: 'callout', kind: 'onprem', html: "Réseau isolé : pas d'envoi automatique. Prévois un <b>circuit de transfert</b> du must-gather vers le support (clé USB, passerelle)." }
      ]
    },
    {
      title: 'Incidents courants',
      tag: 'à reconnaître',
      blocks: [
        { t: 'cards', items: [
          { front: 'Nœud NotReady', back: '<b>kubelet / CRI-O / réseau</b> : <code>oc adm node-logs</code>, <code>oc debug node</code>, CSR en attente après arrêt long.' },
          { front: 'Cluster Operator Degraded', back: '<code>oc describe co NOM</code> puis les pods de son namespace ; souvent un certificat, un PVC ou un nœud.' },
          { front: 'Pool MCO Degraded', back: 'Fichier modifié à la main ou MachineConfig invalide : bloque les mises à jour (module 02, 04).' },
          { front: 'etcd lent', back: 'Latence disque ou réseau : module 02 et 08 ; sauvegarde et restauration : module 11.' },
          { front: 'Mise à jour bloquée', back: 'Pool en pause, PDB, <code>Upgradeable=False</code> ou opérateur Degraded : <code>oc adm upgrade status</code>.' },
          { front: 'Pods Pending', back: 'Capacité, quotas ou <code>nodeSelector</code> : <code>oc describe pod</code>, <code>oc describe quota</code>.' }
        ] },
        { t: 'callout', kind: 'tip', html: "Méthode : <b>cluster d'abord</b> (<code>oc get co</code>, <code>oc get mcp</code>, <code>oc get nodes</code>), puis le nœud, puis le pod. Un symptôme applicatif vient souvent d'un opérateur dégradé." }
      ]
    },
    {
      title: 'Capacité et quotas',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          '<b>Requests / limits</b> : les requests décident du placement ; surveille l\'<b>overcommit</b> (somme des limits &gt; capacité).',
          '<b>Quotas par projet</b> : <code>ResourceQuota</code>, <code>LimitRange</code>, <code>ClusterResourceQuota</code> via le project template (module 06).',
          '<b>Réservations des nœuds</b> : <code>system-reserved</code> et kubelet ; <code>autoSizingReserved</code> (<code>KubeletConfig</code>) calcule la réservation selon la capacité du nœud (par défaut activé sur les workers d\'après la doc ; à vérifier pour ta version).',
          '<b>Nœuds infra</b> : héberger routeurs, monitoring et logging sur des nœuds dédiés (module 02).'
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc adm top nodes\n$ oc describe node worker-1 | grep -A8 'Allocated resources'\n$ oc get resourcequota,limitrange -A" },
        { t: 'callout', kind: 'ocp', wide: true, html: "<b>Autoscaling</b> : <code>ClusterAutoscaler</code> et <code>MachineAutoscaler</code> exigent la <b>Machine API</b> (IPI vSphere ou bare metal, module 02) ; sans elle, la capacité se gère à la main. Hors périmètre ici : à étudier avec ton architecte." }
      ]
    },
    {
      title: 'Quiz',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Avant une montée vers la mineure suivante, le cluster est <code>Upgradeable=False</code> avec la raison <code>AdminAckRequired</code>. Que fais-tu ?', options: ['Forcer la mise à jour avec une option pour ignorer la condition', 'Vérifier que tes charges n\'utilisent plus les APIs retirées, puis acquitter dans la ConfigMap <code>admin-acks</code>', 'Supprimer la ConfigMap <code>admin-acks</code> pour réinitialiser le blocage', 'Changer de canal pour que la condition disparaisse'], answer: 1, explain: 'L\'acquittement est volontaire : il confirme que tu as évalué les APIs retirées. On le fait dans <code>admin-acks</code> (<code>openshift-config</code>) après vérification, pas en contournant ni en supprimant la ConfigMap.' },
        { t: 'quiz', q: 'Tu veux passer un cluster de la 4.20 EUS à la 4.22 EUS en limitant les redémarrages des workers. Quelle approche ?', options: ['Mettre à jour chaque worker à la main avec <code>oc debug</code> avant le control plane', 'Passer en canal <code>candidate</code> pour sauter la version intermédiaire', 'Mettre à jour d\'abord les workers, puis le control plane, sans pause', 'Mettre en pause les MachineConfigPools non-master, monter le control plane (4.21 puis 4.22), puis reprendre les pools'], answer: 3, explain: 'C\'est la procédure Control Plane Only : les workers ne sont mis à jour qu\'une fois, vers la cible. Ne laisse jamais un pool en pause : cela bloque les mises à jour suivantes et la rotation des certificats.' },
        { t: 'quiz', q: 'Après le redémarrage d\'un cluster de lab arrêté deux semaines, des workers restent <code>NotReady</code> et des CSR sont en <code>Pending</code>. Que fais-tu ?', options: ['Contrôler les CSR (demandeur, nœud attendu) et les approuver avec <code>oc adm certificate approve</code>', 'Redéployer le cluster entièrement', 'Supprimer tous les nœuds <code>NotReady</code> et attendre qu\'ils se recréent', 'Modifier le MachineConfigPool worker pour forcer le reboot'], answer: 0, explain: 'Après un long arrêt, les certificats des kubelets peuvent avoir expiré : les nœuds redemandent des certificats via CSR, qu\'il faut approuver après contrôle. Redéployer ou supprimer les nœuds est inutilement destructif.' }
      ]
    },
    {
      title: 'Lab : lire l\'état du cluster et simuler une maintenance',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'État de mise à jour, must-gather, quotas, drain', goal: 'Noyau en séance sur un SNO (cluster-admin). Les étapes (bonus), dont la mise à jour réelle, sont à faire en autonomie sur un cluster jetable.', steps: [
          'Prérequis : environnement E1 (SNO) avec <code>cluster-admin</code>, voir module 00.',
          'Lis l\'état de mise à jour : <code>oc get clusterversion</code>, <code>oc adm upgrade</code>, <code>oc adm upgrade recommend</code> ; quel canal ? des mises à jour sont-elles proposées ? des conditions <code>Upgradeable</code> ?',
          'Lance un <code>oc adm must-gather --dest-dir=./mg</code>, parcours le dossier (opérateurs, nœuds, événements) puis une collecte ciblée avec <code>oc adm inspect ns/openshift-ingress</code>.',
          'Dans un projet de test, crée un <code>ResourceQuota</code> et un <code>LimitRange</code> ; dépasse le quota avec un déploiement et lis l\'erreur ; vérifie avec <code>oc describe quota</code>.',
          'Simule une maintenance : <code>oc adm cordon</code> puis <code>oc adm drain --ignore-daemonsets --delete-emptydir-data</code> sur ton nœud SNO (sur SNO, le drain évince tes pods applicatifs, pas le control plane), observe puis <code>oc adm uncordon</code> et vérifie le retour des pods.',
          '(bonus, E1 jetable ou E2) Mise à jour mineure réelle : sauvegarde etcd (module 11), vérification des pré-contrôles, <code>oc adm upgrade --to=…</code>, suivi avec <code>oc adm upgrade status</code> (sur SNO : le nœud redémarre).',
          '(bonus, E2) Mets en pause le pool <code>worker</code> (<code>spec.paused</code>), lance une mise à jour du control plane et observe que les workers ne bougent pas ; reprends le pool ensuite.',
          '(bonus, E2 ou plus) Ajoute un worker avec <code>oc adm node-image create</code> (ou en scalant un MachineSet) et approuve les CSR.'
        ] }
      ]
    }
  ],
  takeaways: [
    'Une mise à jour = canal + graphe + CVO + MCO : prépare (sauvegarde etcd, opérateurs sains, PDB, APIs retirées), déclenche (<code>oc adm upgrade recommend</code> puis <code>--to-latest</code> ou <code>--to</code>), surveille (<code>oc adm upgrade status</code>).',
    'Les acquittements <code>admin-acks</code> et <code>Upgradeable=False</code> demandent d\'évaluer, pas de contourner ; lis les notes de chaque version cible (exemple : politique d\'image <code>openshift</code> avant la 4.21).',
    'EUS → EUS (4.20 → 4.22) : Control Plane Only, pools non-master en pause puis repris ; un pool oublié en pause bloque les mises à jour et la rotation des certificats.',
    'On-prem, les nœuds s\'ajoutent via Machine API, <code>oc adm node-image create</code> ou UPI ; les workers RHEL n\'existent plus depuis la 4.19 ; les CSR se contrôlent avant approbation.',
    'Diagnostic : cluster d\'abord (<code>oc get co</code>, <code>mcp</code>, <code>nodes</code>), puis <code>must-gather</code>, <code>oc adm inspect</code>, <code>oc adm node-logs</code> ; le must-gather accompagne tout ticket support.',
    'Capacité : requests, quotas (module 06), réservations des nœuds, nœuds infra ; l\'autoscaling suppose la Machine API.'
  ]
});
