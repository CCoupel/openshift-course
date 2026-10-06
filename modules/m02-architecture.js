COURSE.add({
  id: 'm02', num: 2, emoji: '🏗️',
  title: 'Architecture',
  tagline: 'Sous le capot : nœuds, OS immuable, etcd, opérateurs et Machine API. Qui fait quoi, et qui parle à qui.',
  duration: '≈ 60 min + lab 20 min',
  objectives: [
    'Décrire un cluster OCP : control plane, workers, nœuds infra',
    'Comprendre RHCOS, rpm-ostree, CRI-O et Ignition',
    'Expliquer le rôle d\'etcd, du CVO, des Cluster Operators et du Machine Config Operator',
    'Choisir une topologie (HA, compact, SNO, Hosted Control Planes)',
    'Suivre le trajet d\'une requête et connaître les ports clés du cluster'
  ],
  slides: [
    {
      title: 'Vue d\'ensemble d\'un cluster',
      blocks: [
        { t: 'text', html: '<p>Un cluster OCP standard, c\'est <b>3 control planes</b> + <b>N workers</b>, auxquels s\'ajoutent éventuellement des <b>nœuds infra</b> (des workers étiquetés pour héberger les services de la plateforme).</p>' },
        { t: 'layers', frag: true, items: [
          { name: '🧠 Control plane (3 masters)', desc: 'kube-apiserver, etcd, scheduler, controllers, opérateurs. RHCOS obligatoire.', hl: true },
          { name: '🏗️ Nœuds infra (optionnels)', desc: 'Routeurs, registre, monitoring, logging : étiquetés <code>infra</code>' },
          { name: '⚙️ Workers', desc: 'Tes charges applicatives (kubelet + CRI-O + OVN-Kubernetes)' },
          { name: '🔌 Infrastructure', desc: 'Bare metal / vSphere / cloud : réseau, DNS, load balancers, stockage', base: true }
        ] },
        { t: 'callout', kind: 'k8s', html: 'Rien d\'exotique : c\'est le même découpage que ton cluster kubeadm, mais le control plane est <b>géré par des opérateurs</b> et non par des manifests que tu édites.' }
      ]
    },
    {
      title: 'Les rôles de nœuds',
      blocks: [
        { t: 'table', head: ['Rôle', 'Label', 'Contient', 'À savoir'], rows: [
          ['<b>master</b> (control plane)', '<code>node-role.kubernetes.io/master</code> (et <code>control-plane</code>)', 'apiserver, etcd, scheduler, controller-manager, opérateurs', 'Taint <code>NoSchedule</code> par défaut. RHCOS uniquement.'],
          ['<b>worker</b>', '<code>node-role.kubernetes.io/worker</code>', 'Pods applicatifs', 'RHCOS (nœuds de calcul RHEL : déprécié / retrait à vérifier dans les release notes)'],
          ['<b>infra</b>', '<code>node-role.kubernetes.io/infra</code>', 'Router, registre, Prometheus, logging', 'Convention : ce n\'est pas un rôle natif, tu le crées toi-même'],
          ['<b>arbiter</b> / edge', 'selon topologie', 'Topologies 2 nœuds', 'Récent : statut en 4.20 (technology preview ou GA) à vérifier dans les release notes']
        ] },
        { t: 'callout', kind: 'trap', html: 'Un nœud est « worker » parce qu\'il porte le label <code>worker</code> <b>et</b> appartient au MachineConfigPool <code>worker</code>. Le label seul ne change pas la configuration OS : c\'est le pool qui compte (slide MCO).' }
      ]
    },
    {
      title: 'Schéma d\'un cluster on-prem',
      blocks: [
        { t: 'diagram', caption: 'Le DNS et les deux load balancers (API, Ingress) sont à ta charge en UPI ; en IPI on-prem, des VIP keepalived les remplacent.', html: '<svg viewBox="0 0 760 330" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Schéma cluster" style="width:100%;height:auto;font-family:inherit;font-size:13px">' +
          '<defs><marker id="ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>' +
          '<g fill="var(--surface)" stroke="var(--border)" stroke-width="1.5">' +
          '<rect x="10" y="20" width="110" height="50" rx="8"/><rect x="10" y="240" width="110" height="50" rx="8"/>' +
          '<rect x="170" y="20" width="130" height="50" rx="8"/><rect x="170" y="240" width="130" height="50" rx="8"/>' +
          '<rect x="350" y="10" width="400" height="120" rx="10"/><rect x="350" y="150" width="400" height="160" rx="10"/></g>' +
          '<g fill="var(--accent)" fill-opacity="0.15" stroke="var(--accent)" stroke-width="1.5">' +
          '<rect x="365" y="45" width="110" height="60" rx="6"/><rect x="495" y="45" width="110" height="60" rx="6"/><rect x="625" y="45" width="110" height="60" rx="6"/></g>' +
          '<g fill="var(--surface)" stroke="var(--border)" stroke-width="1.2">' +
          '<rect x="365" y="205" width="100" height="45" rx="6"/><rect x="480" y="205" width="100" height="45" rx="6"/><rect x="595" y="205" width="100" height="45" rx="6"/>' +
          '<rect x="365" y="258" width="150" height="40" rx="6"/><rect x="535" y="258" width="150" height="40" rx="6"/></g>' +
          '<g fill="currentColor" text-anchor="middle">' +
          '<text x="65" y="42">oc / kubectl</text><text x="65" y="58" fill="var(--muted)">kubelets</text>' +
          '<text x="65" y="262">Navigateurs</text><text x="65" y="278" fill="var(--muted)">apps clientes</text>' +
          '<text x="235" y="42">LB API</text><text x="235" y="58" fill="var(--muted)">6443 + 22623</text>' +
          '<text x="235" y="262">LB Ingress</text><text x="235" y="278" fill="var(--muted)">80 + 443</text>' +
          '<text x="550" y="32" font-weight="bold">Control plane</text>' +
          '<text x="420" y="72">master-0</text><text x="420" y="90" fill="var(--muted)">api + etcd</text>' +
          '<text x="550" y="72">master-1</text><text x="550" y="90" fill="var(--muted)">api + etcd</text>' +
          '<text x="680" y="72">master-2</text><text x="680" y="90" fill="var(--muted)">api + etcd</text>' +
          '<text x="550" y="172" font-weight="bold">Workers / infra</text>' +
          '<text x="415" y="232">worker-0</text><text x="530" y="232">worker-1</text><text x="645" y="232">worker-2</text>' +
          '<text x="440" y="283">infra-0 (router)</text><text x="610" y="283">infra-1 (router)</text></g>' +
          '<g stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#ar2)">' +
          '<path d="M120,45 L168,45"/><path d="M300,45 L348,60"/><path d="M120,265 L168,265"/><path d="M300,265 L363,275"/></g>' +
          '</svg>' }
      ]
    },
    {
      title: 'RHCOS : un OS fait pour K8s',
      layout: 'two',
      blocks: [
        { t: 'bullets', frag: true, items: [
          '<b>Red Hat Enterprise Linux CoreOS</b> : OS minimal, <b>immuable</b> (<code>/usr</code> en lecture seule).',
          'Mises à jour <b>transactionnelles</b> via <code>rpm-ostree</code> : une image complète, avec rollback au reboot.',
          '<b>CRI-O</b> comme runtime (pas Docker, pas containerd) : conçu pour Kubernetes.',
          '<b>Ignition</b> configure le nœud au 1er boot (disques, fichiers, units systemd, users).',
          'Une image d\'OS par release : <b>elle est embarquée dans l\'image de release</b> et mise à jour par le cluster.'
        ] },
        { t: 'callout', kind: 'ocp', html: 'L\'OS fait partie du cluster : quand tu fais <code>oc adm upgrade</code>, les nœuds redémarrent sur la <b>nouvelle image d\'OS</b>. Tu ne fais pas de <code>dnf update</code> séparé.' },
        { t: 'callout', kind: 'trap', wide: true, html: 'Pas de <code>yum install tcpdump</code> sur un nœud ! Utilise <code>oc debug node/&lt;n&gt;</code> (image outillée) ou <code>toolbox</code>. Les modifications locales hors MachineConfig sont fragiles et peuvent mettre le pool en Degraded.' }
      ]
    },
    {
      title: 'Ignition, rpm-ostree, CRI-O en pratique',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Boot 1', sub: 'image RHCOS générique' },
          { label: 'Ignition', sub: 'lit sa config (HTTP / metadata / guestinfo)', hl: true },
          { label: 'Config appliquée', sub: 'disques, fichiers, units' },
          { label: 'kubelet + CRI-O', sub: 'le nœud rejoint le cluster' },
          { label: 'MCD', sub: 'Machine Config Daemon prend le relais' }
        ], caption: 'Ignition ne tourne qu\'<b>une fois</b>, au premier démarrage. Ensuite, c\'est le MCD qui gère les changements.' },
        { t: 'cmds', items: [
          ['oc debug node/<n> -- chroot /host rpm-ostree status', 'Image OS déployée, version, déploiement précédent'],
          ['oc debug node/<n> -- chroot /host crictl ps', 'Conteneurs vus par CRI-O sur le nœud'],
          ['oc adm node-logs <n> -u kubelet', 'Logs d\'une unit systemd du nœud'],
          ['oc get node <n> -o wide', 'Version kernel, OS image, runtime (CONTAINER-RUNTIME)']
        ] },
        { t: 'callout', kind: 'onprem', html: 'Sur bare metal / vSphere en UPI, c\'est <b>toi</b> qui fournis le fichier Ignition au premier boot (ISO, PXE, <code>guestinfo</code> vSphere). En IPI, l\'installeur s\'en charge.' }
      ]
    },
    {
      title: 'etcd : le cœur à ne jamais abîmer',
      layout: 'two',
      blocks: [
        { t: 'bullets', frag: true, items: [
          'Base clé-valeur de <b>tout</b> l\'état du cluster, déployée en <b>pods statiques</b> sur les 3 masters et gérée par l\'<b>etcd Operator</b>.',
          '<b>Quorum = ⌊n/2⌋ + 1</b> : avec 3 membres, il faut 2 vivants. Tu tolères <b>1 panne</b>.',
          'Passer à 2 membres ne protège de rien (quorum = 2). 4 non plus (quorum = 3, tolérance 1) : <b>nombre impair</b>.',
          'Très sensible à la <b>latence disque</b> (fsync) et réseau entre masters.',
          'Sans quorum : API en lecture seule puis indisponible.'
        ] },
        { t: 'table', head: ['Membres', 'Quorum', 'Pannes tolérées'], rows: [
          ['1 (SNO)', '1', '0'],
          ['3', '2', '1'],
          ['5', '3', '2 (non standard en OCP)']
        ] },
        { t: 'callout', kind: 'onprem', wide: true, html: 'On-prem, <b>le disque est ton risque n°1</b> : SSD/NVMe local ou LUN rapide dédiée, jamais de datastore saturé partagé. Objectif classique : p99 du <code>fdatasync</code> sous ~10 ms (valeur à confirmer dans la doc de ta version). Sur vSphere, prévois une réservation de ressources pour les VMs masters.' }
      ]
    },
    {
      title: 'etcd : inspecter et se protéger',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: `# Pods etcd (un par master) et état de l'opérateur
$ oc get pods -n openshift-etcd -l app=etcd
$ oc get co etcd

# Santé des membres, depuis le conteneur etcdctl d'un pod etcd
$ oc rsh -n openshift-etcd -c etcdctl etcd-master-0
sh-5$ etcdctl endpoint status --cluster -w table
sh-5$ etcdctl endpoint health --cluster -w table` },
        { t: 'callout', kind: 'tip', html: 'Un script de sauvegarde est fourni sur les masters : <code>/usr/local/bin/cluster-backup.sh</code>, à lancer via <code>oc debug node/&lt;master&gt;</code> puis <code>chroot /host</code>. Le sujet est traité au module Backup &amp; DR.' },
        { t: 'callout', kind: 'trap', html: 'Ne redimensionne pas/ne supprime pas à la main des membres etcd, et ne restaure pas un snapshot sans suivre la procédure officielle : un restore mal fait casse le cluster entier.' }
      ]
    },
    {
      title: 'Le control plane : qui sert quelle API ?',
      blocks: [
        { t: 'table', head: ['Composant', 'Namespace', 'Rôle'], rows: [
          ['<b>kube-apiserver</b>', '<code>openshift-kube-apiserver</code>', 'API Kubernetes standard (pod statique, port 6443). Point d\'entrée unique.'],
          ['<b>openshift-apiserver</b>', '<code>openshift-apiserver</code>', 'API OCP « historiques » : Route, ImageStream, Build, Project… (API agrégées)'],
          ['<b>oauth-apiserver</b>', '<code>openshift-oauth-apiserver</code>', 'Stocke et sert User, Group, OAuthAccessToken, OAuthClient…'],
          ['<b>oauth-openshift</b>', '<code>openshift-authentication</code>', 'Le serveur OAuth (login, délivrance de tokens, Identity Providers)'],
          ['<b>kube-controller-manager</b>, <b>kube-scheduler</b>', '<code>openshift-kube-*</code>', 'Contrôleurs et placement, comme en K8s (pods statiques)'],
          ['<b>openshift-controller-manager</b>', '<code>openshift-controller-manager</code>', 'Contrôleurs OCP : builds, routes, deployer config, SCC…']
        ] },
        { t: 'callout', kind: 'ocp', html: 'Les API OCP sont <b>agrégées</b> : le kube-apiserver redirige (APIService) les groupes comme <code>route.openshift.io</code> vers openshift-apiserver. Pour le client, c\'est transparent. Le découpage exact évolue selon les versions : à vérifier dans les release notes.' }
      ]
    },
    {
      title: 'Le trajet d\'une requête',
      blocks: [
        { t: 'flow', nodes: [
          'oc / kubectl',
          { label: 'DNS', sub: 'api.cluster.domaine' },
          { label: 'LB API', sub: 'TCP 6443', hl: true },
          { label: 'kube-apiserver', sub: 'authn → authz → admission' },
          { label: 'etcd', sub: 'persistance (quorum)', hl: true }
        ], caption: 'Les nœuds, eux, passent par <b>api-int</b> (entrée interne) : même chemin, autre nom DNS.' },
        { t: 'bullets', frag: true, items: [
          '<b>Authn</b> : certificat client, ou token OAuth (validé via les API OAuth agrégées).',
          '<b>Authz</b> : RBAC (module 06). <b>Admission</b> : SCC (module 09), quotas, webhooks…',
          'Pour une ressource <code>route.openshift.io</code> : l\'apiserver relaie à <b>openshift-apiserver</b>, qui écrit aussi dans etcd.',
          'Le LB fait du <b>TCP passthrough</b> : le TLS est terminé par le kube-apiserver lui-même.'
        ] },
        { t: 'callout', kind: 'onprem', html: 'Le LB API est un <b>SPOF</b> si tu le montes mal. Il doit faire un health check (<code>/readyz</code> sur 6443) et retirer un master non prêt, sinon l\'API répond « par intermittence ».' }
      ]
    },
    {
      title: 'LB API, DNS et VIP : le point on-prem',
      layout: 'two',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '🏢 UPI / platform none', items: ['LB externe à fournir (HAProxy, F5, NSX-ALB…)', 'DNS : <code>api</code>, <code>api-int</code>, <code>*.apps</code>', 'Un LB L4 pour 6443/22623, un pour 80/443', 'Tu gères la HA du LB lui-même'] },
          right: { title: '🏢 IPI bare metal / vSphere', items: ['Deux <b>VIP</b> : <code>apiVIPs</code> et <code>ingressVIPs</code>', 'keepalived (VRRP) les fait flotter entre nœuds', 'Un haproxy interne répartit sur les masters', 'DNS à créer quand même, vers les VIP'] },
          verdict: 'Dans les deux cas, le DNS est à toi. Les VIP IPI exigent un même domaine L2 pour VRRP. Mise en œuvre à l\'installation : module 03.' },
        { t: 'callout', kind: 'cloud', wide: true, html: 'En cloud (IaaS), l\'installeur crée les <b>LB natifs</b> (ELB, Azure LB…) et les enregistrements DNS. Aucun VIP keepalived, aucune zone DNS à construire à la main.' }
      ]
    },
    {
      title: 'CVO et Cluster Operators',
      blocks: [
        { t: 'text', html: '<p>Le <b>Cluster Version Operator</b> lit l\'<b>image de release</b> (liste des versions de tous les composants) et réconcilie chaque <b>Cluster Operator</b>. Chaque opérateur publie un objet <code>ClusterOperator</code> avec ses conditions.</p>' },
        { t: 'table', head: ['Condition', 'Sens', 'Réaction'], rows: [
          ['<b>Available</b>', 'Le service est fourni', 'Si <code>False</code> : panne réelle'],
          ['<b>Progressing</b>', 'Un changement est en cours', 'Normal pendant une upgrade'],
          ['<b>Degraded</b>', 'Ça marche mal ou à moitié', 'Lire le message, c\'est ton point de départ'],
          ['<b>Upgradeable</b>', 'La mise à jour mineure est permise', '<code>False</code> bloque la mineure suivante']
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: `$ oc get clusterversion
$ oc get co
$ oc describe co authentication     # message de la condition Degraded
$ oc adm release info                 # contenu de la release courante` }
      ]
    },
    {
      title: 'Machine API : des nœuds déclaratifs',
      blocks: [
        { t: 'text', html: '<p>Le <b>Machine API Operator</b> (namespace <code>openshift-machine-api</code>) apporte l\'équivalent de Cluster API : un nœud = un objet <b>Machine</b>, un groupe homogène = un <b>MachineSet</b> (comme un ReplicaSet de machines).</p>' },
        { t: 'flow', nodes: [
          { label: 'MachineSet', sub: 'replicas: N' },
          { label: 'Machine', sub: 'une VM ou un serveur' },
          { label: 'Provider', sub: 'vSphere / Metal3 / cloud', hl: true },
          { label: 'Node', sub: 'rejoint le cluster' }
        ] },
        { t: 'cmds', items: [
          ['oc get machinesets -n openshift-machine-api', 'Groupes de machines et réplicas'],
          ['oc get machines -n openshift-machine-api', 'Une Machine par nœud (phase, provider ID)'],
          ['oc scale machineset <ms> --replicas=5 -n openshift-machine-api', 'Ajouter des workers en une commande'],
          ['oc get bmh -n openshift-machine-api', 'BareMetalHost (Metal3) en IPI bare metal']
        ] },
        { t: 'callout', kind: 'cloud', html: 'En cloud, scaler un MachineSet <b>crée réellement des VM</b> via l\'API du fournisseur, et le <b>ClusterAutoscaler</b> + <b>MachineAutoscaler</b> ajustent le nombre de nœuds tout seuls. C\'est le grand confort du cloud.' }
      ]
    },
    {
      title: 'Machine API on-prem : ça dépend de la plateforme',
      layout: 'two',
      blocks: [
        { t: 'table', wide: true, head: ['Installation', 'Machine API ?', 'Ajouter un worker'], rows: [
          ['<b>IPI vSphere</b>', 'Oui (provider vSphere)', 'Scale du MachineSet, clone de template'],
          ['<b>IPI bare metal</b>', 'Oui (Metal3 / BareMetalHost)', 'Ajouter un <code>BareMetalHost</code> puis scaler : provisioning via BMC'],
          ['<b>UPI vSphere</b>', 'Pas de Machine par défaut', 'Cloner la VM, fournir <code>worker.ign</code>, approuver les CSR (à vérifier : ajout possible du Machine API après coup)'],
          ['<b>Agent / Assisted, platform none</b>', 'Non', 'Booter le serveur sur l\'ISO, approuver les CSR'],
          ['<b>Cloud IPI</b> ☁️', 'Oui, complet + autoscaling', 'Scale du MachineSet']
        ] },
        { t: 'callout', kind: 'onprem', wide: true, html: 'Sans Machine API, <code>oc get machines</code> peut être vide : <b>c\'est normal</b>, pas un bug. Il n\'y a alors ni MachineHealthCheck ni autoscaling natif, et la remédiation d\'un nœud mort est un process humain. Le Machine API de bare metal sans BMO/Metal3 n\'existe pas.' }
      ]
    },
    {
      title: 'MachineHealthCheck : l\'auto-guérison',
      blocks: [
        { t: 'text', html: '<p>Un <b>MachineHealthCheck</b> surveille les nœuds d\'un ensemble de machines et <b>supprime la Machine</b> si le nœud reste malade ; le MachineSet en recrée une. Il nécessite donc un Machine API fonctionnel.</p>' },
        { t: 'code', lang: 'yaml', file: 'mhc-worker.yaml', code: `apiVersion: machine.openshift.io/v1beta1
kind: MachineHealthCheck
metadata:
  name: worker-mhc
  namespace: openshift-machine-api
spec:
  selector:
    matchLabels:
      machine.openshift.io/cluster-api-machine-role: worker
  unhealthyConditions:
  - type: Ready
    status: Unknown
    timeout: 300s
  - type: Ready
    status: "False"
    timeout: 300s
  maxUnhealthy: 40%
  nodeStartupTimeout: 10m` },
        { t: 'callout', kind: 'trap', html: '<code>maxUnhealthy</code> est ton garde-fou : si trop de nœuds sont malades en même temps (panne réseau, par exemple), le MHC <b>ne remédie plus</b> pour ne pas tout détruire. Ne le mets jamais à 100 %. Sur bare metal, la remédiation peut impliquer un reboot via BMC : vérifie la doc de ta version.' }
      ]
    },
    {
      title: 'Machine Config Operator : l\'OS déclaratif',
      blocks: [
        { t: 'layers', frag: true, items: [
          { name: 'MachineConfig', desc: 'Un fragment de config OS (fichiers, units systemd, kernel args…) avec un rôle cible' },
          { name: 'MachineConfigPool', desc: 'Un groupe de nœuds (<code>master</code>, <code>worker</code>, <code>infra</code>…) et ses MachineConfig', hl: true },
          { name: 'rendered-<pool>-<hash>', desc: 'MachineConfig <b>fusionné</b> et immuable généré par le controller à chaque changement', hl: true },
          { name: 'Machine Config Daemon (MCD)', desc: 'DaemonSet sur chaque nœud : applique, drain, reboot si nécessaire' },
          { name: 'Machine Config Server (MCS)', desc: 'Sert l\'Ignition aux nouveaux nœuds sur le port 22623', base: true }
        ] },
        { t: 'cmds', items: [
          ['oc get mc', 'MachineConfig, dont les <code>rendered-*</code>'],
          ['oc get mcp', 'Pools : UPDATED / UPDATING / DEGRADED, nombre de machines'],
          ['oc describe mcp worker', 'Quel rendered est visé, quels nœuds en retard']
        ] }
      ]
    },
    {
      title: 'Appliquer un MachineConfig (et ses effets)',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'mc-chrony.yaml', code: `apiVersion: machineconfiguration.openshift.io/v1
kind: MachineConfig
metadata:
  name: 99-worker-motd
  labels:
    machineconfiguration.openshift.io/role: worker
spec:
  config:
    ignition:
      version: 3.2.0   # version supportée par ta release
    storage:
      files:
      - path: /etc/motd
        mode: 0644
        overwrite: true
        contents:
          source: data:,Noeud%20gere%20par%20MCO%0A` },
        { t: 'bullets', frag: true, items: [
          'Le label <code>role</code> choisit le <b>pool</b> ciblé.',
          'Un nouveau <code>rendered-worker-…</code> est généré, puis les nœuds sont traités <b>un par un</b> (<code>maxUnavailable</code> = 1 par défaut) : <b>drain → apply → reboot</b>.',
          'Pour suspendre : <code>oc patch mcp/worker --type merge -p \'{"spec":{"paused":true}}\'</code> (ne pas oublier de reprendre !).',
          'Certains changements peuvent éviter le reboot (node disruption policies) : statut en 4.20 à vérifier dans les release notes. MachineConfig d\'usage (chrony, kargs) : module 04.'
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: 'Un MachineConfig, c\'est <b>un rolling reboot de tout un pool</b>. 3 masters = 3 reboots successifs ; 40 workers = long. Regroupe tes changements, planifie-les, et vérifie les PodDisruptionBudgets avant. Un pool <b>Degraded</b> (fichier modifié à la main, mauvais Ignition) bloque aussi les upgrades.' }
      ]
    },
    {
      title: 'Topologies de déploiement',
      blocks: [
        { t: 'table', head: ['Topologie', 'Nœuds', 'HA ?', 'Usage'], rows: [
          ['<b>Standard (3+N)</b>', '3 masters + N workers (+ infra)', 'Oui', 'Production générale'],
          ['<b>Compact 3 nœuds</b>', '3 masters <b>schedulables</b>, 0 worker', 'Oui (control plane)', 'Petits sites, labo, edge'],
          ['<b>SNO</b> (Single Node)', '1 nœud : master + worker', 'Non', 'Edge, télécom, labo'],
          ['<b>2 nœuds</b> (arbiter / fencing)', '2 nœuds + arbitre ou fencing', 'Partielle', 'Edge, récent : statut en 4.20 à vérifier dans les release notes'],
          ['<b>Hosted Control Planes</b>', 'Control plane en pods, workers séparés', 'Oui', 'Parc de clusters, densification']
        ] },
        { t: 'callout', kind: 'tip', html: 'Compact : dans <code>install-config.yaml</code>, <code>compute.replicas: 0</code> ; l\'installeur rend alors les masters schedulables (<code>mastersSchedulable</code>). Prévois du CPU/RAM en conséquence : les opérateurs consomment déjà beaucoup.' },
        { t: 'callout', kind: 'warn', html: 'SNO = pas de HA : un reboot (ou un MachineConfig) interrompt <b>tout</b>, plan de contrôle compris. Les mises à jour sont des indisponibilités planifiées.' }
      ]
    },
    {
      title: 'Hosted Control Planes (HyperShift)',
      layout: 'two',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '🧠 Standard', items: ['3 masters dédiés (VM ou serveurs)', 'etcd sur les masters', 'Un cluster = 3 machines de control plane', 'Simple à raisonner'] },
          right: { title: '☁️ Hosted Control Planes', items: ['Control plane = <b>pods</b> dans un cluster « de management »', 'etcd par cluster hébergé, en pods', 'Workers séparés (agent, KubeVirt, vSphere…)', 'Création de clusters rapide, moins de ressources'] },
          verdict: 'Idéal pour beaucoup de petits clusters ; ROSA HCP en est la version managée.' },
        { t: 'callout', kind: 'onprem', wide: true, html: 'On-prem, HCP s\'appuie sur le cluster de management (avec MCE/ACM) et typiquement le provider <b>Agent</b> (bare metal) ou <b>KubeVirt</b>. Les plateformes supportées et le niveau de maturité évoluent vite : plateformes on-prem supportées en 4.20 à vérifier dans la doc « Hosted control planes ».' }
      ]
    },
    {
      title: 'Nœuds infra',
      blocks: [
        { t: 'text', html: '<p>Un nœud <b>infra</b> est un worker dédié aux services de la plateforme : <b>routeurs, registre interne, monitoring, logging</b>. Intérêt : isoler ces charges et, selon le contrat, ne pas les compter dans la souscription (à valider avec ta souscription Red Hat).</p>' },
        { t: 'code', lang: 'bash', file: 'terminal', code: `# Rôle infra, et retirer le rôle worker pour ne pas compter ce nœud en worker
$ oc label node infra-0 node-role.kubernetes.io/infra=
$ oc label node infra-0 node-role.kubernetes.io/worker-

# Taint pour que les apps n'y atterrissent pas
$ oc adm taint nodes infra-0 node-role.kubernetes.io/infra=reserved:NoSchedule` },
        { t: 'bullets', frag: true, items: [
          'Crée un <b>MachineConfigPool <code>infra</code></b> pour piloter ces nœuds (<code>machineConfigSelector</code> sur worker <b>et</b> infra).',
          'Déplace ensuite les composants : <code>IngressController</code> (<code>nodePlacement</code>), registre (<code>spec.nodeSelector</code> dans l\'opérateur), monitoring (ConfigMap <code>cluster-monitoring-config</code>).',
          'Les pods doivent <b>tolérer le taint</b> : sinon ils restent Pending.'
        ] },
        { t: 'callout', kind: 'trap', html: 'Mettre un label ne déplace rien. Et le taint sans tolérations dans la config des opérateurs laisse des pods plateforme Pending. Seuls les composants de plateforme autorisés (liste dans la doc de souscription) sont exonérés : n\'y mets pas d\'applis métier.' }
      ]
    },
    {
      title: 'Ports et flux réseau importants',
      blocks: [
        { t: 'table', head: ['Port', 'Flux', 'Qui → qui'], rows: [
          ['<b>6443/TCP</b>', 'API Kubernetes', 'Clients, nœuds → LB API → masters'],
          ['<b>22623/TCP</b>', 'Machine Config Server (Ignition)', 'Nouveaux nœuds → masters. <b>Jamais exposé hors cluster</b>'],
          ['<b>2379-2380/TCP</b>', 'etcd client / pairs', 'Masters ↔ masters'],
          ['<b>10250/TCP</b>', 'API kubelet', 'Masters → tous les nœuds'],
          ['<b>80, 443/TCP</b>', 'Ingress (routeurs)', 'Clients → LB Ingress → nœuds routeurs'],
          ['<b>6081/UDP</b>', 'Geneve (overlay OVN-Kubernetes)', 'Entre tous les nœuds'],
          ['<b>500, 4500/UDP + ESP</b>', 'IPsec (si activé)', 'Entre tous les nœuds'],
          ['<b>30000-32767</b>', 'NodePort', 'Selon tes Services'],
          ['<b>123/UDP</b>', 'NTP', 'Nœuds → serveurs de temps']
        ] },
        { t: 'callout', kind: 'onprem', html: 'Ouvre ces ports entre <b>tous les nœuds</b> (firewalls, security groups NSX/vSphere). Liste exhaustive et à jour : doc « Network connectivity requirements ». Mise en œuvre à l\'installation : module 03. Sur vSphere, un pare-feu distribué qui bloque Geneve donne des pods qui ne se parlent pas entre nœuds.' }
      ]
    },
    {
      title: 'Quiz',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Ton cluster a 3 masters et 1 est définitivement perdu. Que se passe-t-il ?', options: ['Le cluster est cassé : plus de quorum', 'Le cluster fonctionne : 2 membres sur 3 = quorum', 'Seul le master restant sert l\'API en lecture', 'Les workers continuent mais l\'API est coupée'], answer: 1, explain: 'Quorum = 2 sur 3 : une panne est tolérée. Mais tu n\'as plus aucune marge : la deuxième panne fait perdre le quorum. Remplace vite le membre.' },
        { t: 'quiz', q: 'Tu ajoutes un MachineConfig ciblant le pool worker. Qu\'attends-tu ?', options: ['Application immédiate sur tous les workers en même temps', 'Rendu d\'un nouveau rendered-worker, puis drain et reboot des workers un par un', 'Rien tant que tu ne redémarres pas les nœuds toi-même', 'Seuls les nouveaux workers sont concernés'], answer: 1, explain: 'Le MCO fusionne en un <b>rendered-worker-&lt;hash&gt;</b> puis le MCD traite les nœuds selon <code>maxUnavailable</code> (1 par défaut), avec drain et reboot si nécessaire.' },
        { t: 'quiz', q: 'Sur un cluster bare metal en UPI, <code>oc get machines -n openshift-machine-api</code> ne renvoie rien. Pourquoi ?', options: ['Le Machine API est en panne', 'Il n\'y a pas de provider : les nœuds n\'ont pas été créés via des Machines', 'Il faut être cluster-admin', 'Les Machines sont dans le namespace default'], answer: 1, explain: 'Sans provider (UPI, platform none), il n\'y a pas de Machine/MachineSet par défaut. Pas de MHC ni d\'autoscaler natif : c\'est normal et à connaître.' }
      ]
    },
    {
      title: 'Lab : explorer l\'architecture',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'Disséquer ton cluster', goal: 'Cluster de test en cluster-admin (un SNO ou un cluster de labo suffit).', steps: [
          'Prérequis : environnement E1 (SNO) ou plus, accès cluster-admin, voir module 00',
          'Liste les nœuds : <code>oc get nodes -o wide</code>. Repère rôles, OS image et runtime (CRI-O).',
          'Affiche la version et la santé : <code>oc get clusterversion</code> puis <code>oc get co</code>. Y a-t-il un opérateur <i>Degraded</i> ?',
          'Cherche les pods du control plane : <code>oc get pods -n openshift-kube-apiserver</code>, <code>-n openshift-etcd</code>, <code>-n openshift-apiserver</code>.',
          'Lance <code>oc debug node/&lt;master&gt;</code> puis <code>chroot /host</code> et <code>rpm-ostree status</code> : quelle image OS ?',
          'Dans un pod etcd, exécute <code>etcdctl endpoint status --cluster -w table</code> : qui est leader ?',
          'Regarde les pools : <code>oc get mcp</code> et <code>oc get mc</code>. Identifie les <code>rendered-*</code>.',
          '<code>oc get machinesets,machines -n openshift-machine-api</code> : vide ou non ? Explique pourquoi selon ton mode d\'installation.',
          '(bonus) Crée un MachineConfig inoffensif (<code>/etc/motd</code>) sur un pool de test et observe <code>oc get mcp -w</code>. Supprime-le ensuite.'
        ] }
      ]
    }
  ],
  takeaways: [
    'Control plane = 3 masters RHCOS (apiserver, etcd, controllers) ; workers et nœuds infra par-dessus.',
    'RHCOS est immuable : rpm-ostree, CRI-O, Ignition au 1er boot, puis MachineConfig via le MCO (rolling reboot).',
    'etcd demande un nombre impair de membres et un disque rapide : c\'est le point sensible de l\'on-prem.',
    'Le CVO orchestre les Cluster Operators ; <code>oc get co</code> est ton premier réflexe de diagnostic.',
    'Le Machine API n\'existe que si la plateforme a un provider : IPI (vSphere, bare metal avec Metal3) oui, UPI/none non.',
    'On-prem : LB API, DNS, VIP et ports ouverts sont à ta charge ; en cloud, l\'installeur et le Machine API s\'en occupent.'
  ]
});
