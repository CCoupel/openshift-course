COURSE.add({
  id: 'm07', num: 7, emoji: '🌐',
  title: 'Réseau',
  tagline: 'Du pod à la sortie du cluster : OVN-Kubernetes, Services et Routes, NetworkPolicy, egress, MetalLB, NMState, réseaux secondaires et UDN.',
  duration: '≈ 70 min + lab 20 min',
  objectives: [
    'Décrire le réseau d\'un cluster OCP : OVN-Kubernetes, plages pod / service / machine et leurs limites de modification',
    'Exposer une application : Service, Route (edge, passthrough, reencrypt), IngressController et sharding',
    'Isoler le trafic avec NetworkPolicy et AdminNetworkPolicy, et maîtriser la sortie (EgressFirewall, EgressIP)',
    'Fournir des LoadBalancer on-prem avec MetalLB et configurer les nœuds avec NMState',
    'Situer les réseaux secondaires (Multus), les UDN et savoir diagnostiquer un problème réseau'
  ],
  slides: [
    {
      title: 'Le réseau d\'un cluster : vue d\'ensemble',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Underlay', sub: 'VLAN, bonds, DNS, LB (modules 02-03)' },
          { label: 'OVN-Kubernetes', sub: 'réseau des pods', hl: true },
          { label: 'Services', sub: 'ClusterIP, NodePort, LoadBalancer' },
          { label: 'Routes / Ingress', sub: 'HAProxy, entrée HTTP(S)', hl: true },
          { label: 'Egress', sub: 'sortie contrôlée' }
        ], caption: 'Ce module couvre ce qui est <b>à l\'intérieur et à la frontière</b> du cluster ; l\'underlay d\'installation est au module 03, les ports au module 02.' },
        { t: 'bullets', frag: true, items: [
          '<b>Frontières</b> : topologie, VIP et DNS d\'installation → module 03 ; ports et flux → module 02 ; observabilité réseau → module 05 ; sécurité des pods → module 09 ; VM sur réseaux secondaires → module 13.',
          'Version de référence : <b>4.20 EUS</b>.'
        ] },
        { t: 'callout', kind: 'cloud', html: "En cloud, le fournisseur apporte les load balancers et le DNS. <b>On-prem, tu apportes tout</b> : c'est le sujet n°1 de ce module (LoadBalancer, VIP, DNS, VLAN)." }
      ]
    },
    {
      title: 'OVN-Kubernetes : le seul CNI',
      blocks: [
        { t: 'bullets', frag: true, items: [
          '<b>OVN-Kubernetes</b> est le plugin réseau par défaut et <b>unique</b> d\'OCP.',
          '<b>OpenShift SDN</b> : déprécié depuis 4.14, installations neuves en OVN-Kubernetes dès 4.15, 4.16 dernière version supportée, <b>retiré en 4.17</b> ; un cluster encore en SDN doit migrer vers OVN-Kubernetes <b>avant</b> de passer en 4.17 (migration hors ligne ou « live » limitée).',
          'Overlay <b>Geneve</b> entre les nœuds (6081/UDP, module 02) ; politiques réseau, services, egress et UDN sont implémentés par OVN.',
          'Le CNI est géré par le <b>Cluster Network Operator</b> : on le règle via la CR <code>Network</code> (<code>operator.openshift.io</code>), pas à la main sur les nœuds.'
        ] },
        { t: 'callout', kind: 'k8s', html: "Sur K8s, tu choisis Calico, Cilium, Flannel… Sur OCP, <b>le choix est fait</b> : cela supprime une source de variabilité (et de support) mais te lie aux fonctions d'OVN." },
        { t: 'callout', kind: 'warn', html: "Un cluster hérité en SDN n'est plus mettable à jour au-delà de 4.16 sans migration : à traiter avant tout projet de mise à niveau (module 12)." }
      ]
    },
    {
      title: 'Plages réseau : ce qui se change, ce qui ne se change pas',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Plage', 'Rôle', 'Après l\'installation'], rows: [
          ['<code>clusterNetwork</code>', 'IP des pods (<code>10.128.0.0/14</code>, <code>hostPrefix: 23</code> par défaut)', 'Le masque du CIDR peut être <b>réduit</b> (plus d\'IP, donc plus de nœuds) ; <code>hostPrefix</code> <b>non modifiable</b>'],
          ['<code>serviceNetwork</code>', 'IP des Services (<code>172.30.0.0/16</code>)', '<b>Non extensible</b> : à fixer à l\'installation'],
          ['<code>machineNetwork</code>', 'Réseau des nœuds', '<b>Non modifiable</b>']
        ] },
        { t: 'code', lang: 'yaml', file: 'install-config.yaml (extrait)', code: `networking:
  networkType: OVNKubernetes
  clusterNetwork:
  - cidr: 10.128.0.0/14
    hostPrefix: 23
  serviceNetwork:
  - 172.30.0.0/16
  machineNetwork:
  - cidr: 192.168.10.0/24` },
        { t: 'callout', kind: 'trap', wide: true, html: "Les plages <b>ne doivent pas chevaucher</b> tes réseaux d'entreprise (VPN, autres clusters, datacenters) et se choisissent <b>avant</b> l'installation (module 03). Étendre <code>clusterNetwork</code> demande OVN-Kubernetes et un déploiement de configuration qui peut prendre jusqu'à environ 30 minutes (doc 4.20)." }
      ]
    },
    {
      title: 'Services et DNS interne',
      blocks: [
        { t: 'table', head: ['Type de Service', 'Usage', 'Remarque on-prem'], rows: [
          ['<code>ClusterIP</code>', 'Accès interne', 'Défaut ; plage <code>serviceNetwork</code>'],
          ['<code>NodePort</code>', 'Port ouvert sur chaque nœud (30000-32767)', 'Le firewall doit laisser passer (module 02)'],
          ['<code>LoadBalancer</code>', 'IP externe fournie par un équipement', '<b>Reste en <code>&lt;pending&gt;</code> sans implémentation</b> : MetalLB ou un LB externe (slides suivantes)'],
          ['<code>ExternalName</code>', 'Alias DNS', 'Comme sur K8s']
        ] },
        { t: 'bullets', items: [
          '<b>DNS interne</b> : CoreDNS, géré par le <b>DNS Operator</b> (CR <code>dns.operator.openshift.io</code> « default », pods dans <code>openshift-dns</code>) ; le domaine de service est <code>cluster.local</code>.',
          'Redirection de domaines d\'entreprise : section <code>servers</code> de la CR DNS (forwarding par zone).',
          '<code>externalTrafficPolicy: Local</code> conserve l\'IP source mais n\'envoie le trafic qu\'aux nœuds hébergeant des pods.'
        ] },
        { t: 'callout', kind: 'tip', html: "Un Service sans <code>endpoints</code> (<code>oc get endpoints</code>) est presque toujours un <b>sélecteur de labels</b> qui ne correspond à aucun pod." }
      ]
    },
    {
      title: 'Routes, Ingress et Gateway API',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          'Une <b>Route</b> (<code>route.openshift.io</code>) publie un Service sur un nom DNS, servie par les <b>routeurs HAProxy</b> de l\'<b>Ingress Operator</b> (namespace <code>openshift-ingress</code>).',
          'Les objets <b>Ingress</b> K8s sont acceptés : l\'Ingress Operator crée des Routes correspondantes.',
          '<b>Gateway API</b> : GA depuis <b>4.19</b>, implémentée par l\'Ingress Operator avec OpenShift Service Mesh 3 (<code>GatewayClass</code> avec <code>controllerName: openshift.io/gateway-controller/v1</code>) ; à ne pas confondre avec les Routes.',
          'Le wildcard <code>*.apps.&lt;cluster&gt;.&lt;domaine&gt;</code> (DNS, module 03) pointe vers les routeurs.'
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc get ingresscontroller -n openshift-ingress-operator\n$ oc get pods -n openshift-ingress\n$ oc get route -A | head" },
        { t: 'callout', kind: 'tip', wide: true, html: "Pour de nouveaux projets, les Routes restent le chemin le plus simple et le mieux supporté ; la Gateway API est à évaluer pour la portabilité et les cas avancés (détails et limites en 4.20 : à vérifier dans la doc « Configuring Gateway API »)." }
      ]
    },
    {
      title: 'Routes TLS : edge, passthrough, reencrypt',
      blocks: [
        { t: 'table', head: ['Type', 'TLS terminé où ?', 'Cas d\'usage'], rows: [
          ['<b>edge</b>', 'Au routeur ; HTTP en clair vers le pod', 'Cas courant ; le certificat est celui du routeur ou celui de la Route'],
          ['<b>passthrough</b>', 'Dans le pod ; le routeur ne déchiffre pas', 'TLS de bout en bout, routage sur le SNI ; pas d\'en-têtes HTTP exploitables'],
          ['<b>reencrypt</b>', 'Au routeur, puis re-chiffré vers le pod', 'Chiffrement interne imposé avec certificat public en façade']
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc create route edge web --service=web --hostname=web.apps.ocp4.example.com\n$ oc get route web\n$ curl -kI https://web.apps.ocp4.example.com\n\n# Délai du routeur (annotation HAProxy)\n$ oc annotate route web haproxy.router.openshift.io/timeout=60s" },
        { t: 'callout', kind: 'ocp', html: "Le <b>certificat par défaut</b> du routeur (<code>*.apps</code>) se remplace sur l'<code>IngressController</code> : voir le module 04. Ici : <b>un certificat par Route</b> et le choix du type de TLS." }
      ]
    },
    {
      title: 'IngressController : domaine, placement, sharding',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'ingresscontroller-partenaires.yaml', code: `apiVersion: operator.openshift.io/v1
kind: IngressController
metadata:
  name: partenaires
  namespace: openshift-ingress-operator
spec:
  domain: partenaires.apps.ocp4.example.com
  replicas: 2
  nodePlacement:
    nodeSelector:
      matchLabels:
        node-role.kubernetes.io/infra: ""
  routeSelector:
    matchLabels:
      zone: partenaires
  endpointPublishingStrategy:
    type: HostNetwork` },
        { t: 'bullets', items: [
          '<b>Sharding</b> : plusieurs IngressControllers, chacun avec son <code>domain</code> et son <code>routeSelector</code> ou <code>namespaceSelector</code> (exposition interne / partenaires, charges séparées).',
          '<code>replicas</code> : 2 par défaut ; <code>nodePlacement</code> pour les nœuds infra (module 02).',
          '<code>endpointPublishingStrategy</code> : <code>LoadBalancerService</code>, <code>HostNetwork</code>, <code>NodePortService</code> ou <code>Private</code>.'
        ] },
        { t: 'callout', kind: 'onprem', html: "Sans fournisseur cloud (plateforme <code>None</code>, bare metal, vSphere UPI), la stratégie par défaut est <b><code>HostNetwork</code></b> : les routeurs écoutent sur 80/443 des nœuds, derrière ton LB ou tes VIP. Valeur par défaut exacte selon la plateforme en 4.20 : à vérifier." }
      ]
    },
    {
      title: 'Exposer HTTP et TCP on-prem : VIP, LB, MetalLB',
      layout: 'two',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '🌐 HTTP(S) : les routeurs', items: ['Wildcard <code>*.apps</code> → <b>VIP Ingress</b> (IPI) ou <b>LB externe</b> (UPI)', 'Les routeurs en <code>HostNetwork</code> sur les nœuds ciblés', 'Une VIP, un LB : peu de ressources', 'Le plus courant pour les applis web'] },
          right: { title: '🔌 TCP/UDP : Service LoadBalancer', items: ['<b>MetalLB</b> attribue une IP depuis un pool', 'Annonce en <b>L2</b> (ARP/NDP) ou <b>BGP</b>', 'Une IP par Service exposé', 'Bases de données, protocoles non HTTP'] },
          verdict: 'HTTP(S) → Route. TCP/UDP exposé hors cluster → Service <code>LoadBalancer</code> + MetalLB (ou LB d\'entreprise + NodePort).' },
        { t: 'callout', kind: 'trap', wide: true, html: "Créer un Service <code>LoadBalancer</code> sur bare metal sans MetalLB : il reste indéfiniment en <code>&lt;pending&gt;</code>. Ce n'est pas un bug, c'est l'absence d'implémentation (module 02, 03 : le LB de l'API est un autre sujet)." }
      ]
    },
    {
      title: 'NetworkPolicy : isoler les projets',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'networkpolicies.yaml', code: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
  namespace: team-a
spec:
  podSelector: {}
  policyTypes:
  - Ingress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-openshift-ingress
  namespace: team-a
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          policy-group.network.openshift.io/ingress: ""
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-hostnetwork
  namespace: team-a
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          policy-group.network.openshift.io/host-network: ""
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-same-namespace
  namespace: team-a
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector: {}` },
        { t: 'bullets', items: [
          'Même API que sur K8s : <b>deny-all</b> puis <b>ouvertures ciblées</b>. Les quatre policies ci-dessus (noms de la doc 4.20) vont dans le <b>project template</b> (module 06).',
          '<b>Piège OCP</b> : un deny-all coupe aussi les <b>routeurs</b> : prévois <code>allow-from-openshift-ingress</code> (label <code>policy-group.network.openshift.io/ingress</code>) et, avec des routeurs en <b>HostNetwork</b> (défaut on-prem), <code>allow-from-hostnetwork</code> (label <code>policy-group.network.openshift.io/host-network</code>).'
        ] },
        { t: 'callout', kind: 'warn', html: "Les deux YAML <code>allow-from-openshift-ingress</code> et <code>allow-from-hostnetwork</code> sont ceux de la doc 4.20. <b>Laquelle suffit selon le mode de publication</b> de l'<code>IngressController</code> (HostNetwork ou LoadBalancerService/NodePort) n'est pas énoncé explicitement dans les pages lues : <b>à vérifier</b> ; en pratique, applique les deux puis teste. Attention : un deny-all mal ouvert te coupe l'accès à tes propres applications." }
      ]
    },
    {
      title: 'AdminNetworkPolicy : les règles de l\'admin',
      layout: 'two',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '👮 AdminNetworkPolicy (ANP)', items: ['Objet <b>cluster</b>, évalué <b>avant</b> les NetworkPolicy', 'Actions : <code>Allow</code>, <code>Deny</code>, <code>Pass</code>', '<code>priority</code> de 0 à 99 (100 ANP au plus ; plus la valeur est basse, plus la priorité est haute ; la doc conseille 30-70)', 'Les équipes ne peuvent pas la contourner'] },
          right: { title: '🛟 BaselineAdminNetworkPolicy (BANP)', items: ['<b>Un seul</b> objet par cluster', 'Garde-fou <b>par défaut</b> si aucune NetworkPolicy ne correspond', 'Les NetworkPolicy des équipes peuvent la <b>surcharger</b>'] },
          verdict: 'ANP = ce que personne ne peut ouvrir ; BANP = le défaut que les équipes peuvent assouplir ; NetworkPolicy = règles des projets.' },
        { t: 'code', lang: 'yaml', file: 'anp-exemple.yaml', code: `apiVersion: policy.networking.k8s.io/v1alpha1
kind: AdminNetworkPolicy
metadata:
  name: bloque-vers-admin
spec:
  priority: 40
  subject:
    namespaces:
      matchLabels:
        env: prod
  egress:
  - name: no-admin-net
    action: Deny
    to:
    - networks:
      - 10.99.0.0/16` },
        { t: 'callout', kind: 'warn', wide: true, html: "L'API est en <code>policy.networking.k8s.io/v1alpha1</code> dans la doc 4.20. Historique : Technology Preview dès 4.14 (feature set <code>TechPreviewNoUpgrade</code>). <b>Statut GA en 4.20</b> : non confirmé dans les release notes lues (la doc 4.20 la présente comme fonctionnalité standard, sans marque Tech Preview) : à vérifier. Priorité : la doc 4.20 indique « 0-99 » pour OVN-Kubernetes (une autre section de la même doc parle de 0-100) ; champs <code>to</code> / <code>networks</code> de l'exemple : à vérifier." }
      ]
    },
    {
      title: 'Egress : contrôler la sortie',
      blocks: [
        { t: 'table', head: ['Objet (<code>k8s.ovn.org/v1</code>)', 'Rôle', 'Remarque'], rows: [
          ['<code>EgressFirewall</code>', 'Autorise ou refuse les connexions sortantes d\'un namespace (CIDR, DNS)', 'Un par namespace ; sans règle correspondante, le trafic est <b>autorisé</b>'],
          ['<code>EgressIP</code>', 'IP source fixe pour le trafic sortant de pods sélectionnés', 'IP à fournir sur le réseau des nœuds (on-prem)'],
          ['<code>EgressService</code>', 'Sortie liée à un Service <code>LoadBalancer</code>', 'Réservé aux usages avancés ; détails à vérifier']
        ] },
        { t: 'code', lang: 'yaml', file: 'egress.yaml', code: `apiVersion: k8s.ovn.org/v1
kind: EgressFirewall
metadata:
  name: default
  namespace: team-a
spec:
  egress:
  - type: Allow
    to:
      cidrSelector: 10.0.0.0/8
  - type: Deny
    to:
      cidrSelector: 0.0.0.0/0
---
apiVersion: k8s.ovn.org/v1
kind: EgressIP
metadata:
  name: egressip-team-a
spec:
  egressIPs:
  - 192.168.10.50
  namespaceSelector:
    matchLabels:
      env: prod` },
        { t: 'callout', kind: 'onprem', html: "Pour que l'EgressIP serve, il faut des nœuds portant le label <code>k8s.ovn.org/egress-assignable=\"\"</code> et une IP libre <b>dans le sous-réseau des nœuds</b> ; le pare-feu d'entreprise doit connaître cette IP. En cloud, l'allocation est automatisée par le fournisseur." }
      ]
    },
    {
      title: 'MetalLB : L2 ou BGP ?',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '🟦 Mode L2', items: ['Un nœud répond ARP/NDP pour l\'IP', 'Aucun équipement spécial', 'Un seul nœud porte l\'IP à un instant donné', 'Basculement en quelques secondes'] },
          right: { title: '🟧 Mode BGP', items: ['Annonce l\'IP aux routeurs (pairs BGP)', 'Répartition du trafic sur plusieurs nœuds', 'Exige des routeurs BGP et une coordination réseau', 'Plus adapté à la production à l\'échelle'] },
          verdict: 'Lab et petits sites : L2. Production avec équipe réseau et plusieurs racks : BGP.' },
        { t: 'bullets', items: [
          '<b>MetalLB Operator</b> (OLM, module 04) ; namespace typique <code>metallb-system</code> ; l\'IPAddressPool doit être dans le namespace de l\'Operator.',
          'Objets : <code>IPAddressPool</code>, <code>L2Advertisement</code>, <code>BGPPeer</code>, <code>BGPAdvertisement</code>, API <code>metallb.io/v1beta1</code>.'
        ] },
        { t: 'callout', kind: 'warn', html: "Détails d'installation (canal, nom exact de la CR <code>MetalLB</code>, version FRR en BGP) : à lire dans « Load balancing with MetalLB » de ta version (à vérifier)." }
      ]
    },
    {
      title: 'MetalLB : un pool et une annonce',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'metallb.yaml', code: `apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: pool-lab
  namespace: metallb-system
spec:
  addresses:
  - 192.168.10.200-192.168.10.220
  autoAssign: true
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: l2-lab
  namespace: metallb-system
spec:
  ipAddressPools:
  - pool-lab` },
        { t: 'bullets', items: [
          '<code>addresses</code> : CIDR ou plage ; <code>autoAssign</code> (défaut : vrai) décide si MetalLB pioche seul dans le pool.',
          '<code>serviceAllocation</code> : réserver un pool à certains namespaces ou labels, avec priorité.',
          'Un <code>Service</code> de type <code>LoadBalancer</code> reçoit alors une IP externe (<code>oc get svc</code>).'
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: "Le pool doit être une plage <b>libre</b> du sous-réseau (hors DHCP, VIP d'installation, EgressIP). Une IP en double donne des pertes de paquets intermittentes très difficiles à relier à MetalLB." }
      ]
    },
    {
      title: 'NMState : configurer le réseau des nœuds',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'nncp-vlan.yaml', code: `apiVersion: nmstate.io/v1
kind: NodeNetworkConfigurationPolicy
metadata:
  name: vlan100-ens4
spec:
  nodeSelector:
    node-role.kubernetes.io/worker: ""
  desiredState:
    interfaces:
    - name: ens4.100
      type: vlan
      state: up
      vlan:
        base-iface: ens4
        id: 100` },
        { t: 'bullets', items: [
          '<b>Kubernetes NMState Operator</b> : observe l\'état réseau des nœuds et applique des <code>NodeNetworkConfigurationPolicy</code> (bonds, VLAN, bridges, DNS, routes).',
          'Les nœuds sont reconfigurés <b>à chaud</b> et la politique est annulée si le nœud perd sa connectivité.',
          'Pour les <b>IP statiques à l\'installation</b> : Agent-based et NMState dans <code>agent-config.yaml</code> (module 03).'
        ] },
        { t: 'callout', kind: 'trap', html: "Tu ne peux <b>pas modifier</b> le bridge <code>br-ex</code> géré par OVN-Kubernetes, ni les interfaces, bonds ou VLAN qui lui sont rattachés. Plusieurs NNCP sur un nœud : ordre alphanumérique des noms (doc 4.20). API <code>nmstate.io/v1</code> (doc 4.20)." }
      ]
    },
    {
      title: 'Réseaux secondaires : Multus',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'nad-macvlan.yaml', code: `apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: macvlan-net
  namespace: team-a
spec:
  config: |-
    {
      "cniVersion": "0.3.1",
      "type": "macvlan",
      "master": "ens4",
      "mode": "bridge",
      "ipam": { "type": "whereabouts", "range": "192.168.20.0/24" }
    }
---
# Dans le pod : annotation k8s.v1.cni.cncf.io/networks: macvlan-net` },
        { t: 'bullets', items: [
          '<b>Multus</b> ajoute des interfaces supplémentaires à un pod, décrites par des <code>NetworkAttachmentDefinition</code> (macvlan, ipvlan, bridge, SR-IOV…).',
          'Gérées par le <b>Cluster Network Operator</b> (<code>additionalNetworks</code>) ou créées directement ; <b>SR-IOV</b> : opérateur dédié, réseaux gérables dans les namespaces d\'application depuis 4.20.',
          'Usages : télécoms, stockage ou trafic séparé, <b>VM</b> (module 13).'
        ] },
        { t: 'callout', kind: 'tip', wide: true, html: "Le réseau secondaire n'est pas protégé par les NetworkPolicy du réseau principal : traite-le comme un réseau <b>d'infrastructure</b> avec ses propres contrôles." }
      ]
    },
    {
      title: 'User-Defined Networks (UDN)',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'udn.yaml', code: `apiVersion: k8s.ovn.org/v1
kind: UserDefinedNetwork
metadata:
  name: udn-1
  namespace: team-a
spec:
  topology: Layer2
  layer2:
    role: Primary
    subnets:
    - "10.0.0.0/24"` },
        { t: 'bullets', frag: true, items: [
          '<b>UDN</b> (par namespace) et <b>ClusterUserDefinedNetwork</b> (plusieurs namespaces) : segmentation et isolation avancées au niveau d\'OVN-Kubernetes ; topologies <code>Layer3</code>, <code>Layer2</code> et <code>Localnet</code>.',
          'Un UDN <b>primaire</b> exige un label sur le namespace : <code>k8s.ovn.org/primary-user-defined-network</code>, posé à la création du namespace.',
          '<b>Statut</b> : UDN en GA depuis 4.18. En 4.20 : annonce des routes des CUDN, BGP dans le Cluster Network Operator, « Preconfigured UDN endpoints » en Technology Preview.',
          'Limites de la doc : pas dans les namespaces <code>openshift-*</code> ni <code>default</code>.'
        ] },
        { t: 'callout', kind: 'ocp', html: "Intérêt principal : <b>VM et charges multi-tenant</b> avec leur propre réseau routé (module 13). Pour un usage conteneurs classique, NetworkPolicy et ANP suffisent le plus souvent." }
      ]
    },
    {
      title: 'Diagnostiquer un problème réseau',
      layout: 'two',
      blocks: [
        { t: 'flow', wide: true, nodes: [
          'Le pod existe ?',
          { label: 'DNS', sub: 'nslookup du Service' },
          { label: 'Service', sub: 'endpoints' },
          { label: 'Route / routeur', sub: 'oc get route, logs HAProxy' },
          { label: 'Policy', sub: 'NetworkPolicy, ANP, EgressFirewall', hl: true }
        ], caption: 'Va du <b>plus simple au plus profond</b> : nom, Service, exposition, politiques, puis OVN.' },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc get endpoints web\n$ oc exec deploy/web -- curl -sI http://autre-svc:8080\n$ oc get networkpolicy,adminnetworkpolicy -A\n\n# Sur un nœud (jamais en production sans raison)\n$ oc debug node/worker-0\nsh-5.1# chroot /host\nsh-5.1# ip a ; ss -lntp | head" },
        { t: 'bullets', items: [
          '<b>ovnkube-trace</b> : trace des paquets simulés TCP/UDP entre deux points d\'un cluster OVN-Kubernetes (ovn-trace + ovs-appctl + ovn-detrace) ; disponible dans la doc 4.20.',
          '<b>must-gather</b> : l\'option <code>--gather_network_logs</code> ne s\'utilise que sur demande du support.'
        ] },
        { t: 'callout', kind: 'warn', wide: true, html: "L'observabilité réseau (flux, qui parle à qui) est un <b>opérateur à part</b> : Network Observability, module 05. Ne pas confondre avec le diagnostic ponctuel de ce slide." }
      ]
    },
    {
      title: 'Quiz',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Sur un cluster bare metal, un Service <code>type: LoadBalancer</code> reste en <code>&lt;pending&gt;</code>. Pourquoi ?', options: ['Le Service est mal écrit : il manque l\'annotation <code>route</code>', 'Le quota de projet est atteint et empêche l\'attribution d\'une IP', 'Rien ne fournit d\'IP externe : il faut MetalLB ou un load balancer d\'entreprise', 'Les routeurs HAProxy doivent être redéployés pour prendre en charge les Services LoadBalancer'], answer: 2, explain: 'Sans fournisseur cloud, aucune implémentation de LoadBalancer n\'existe par défaut. MetalLB (L2 ou BGP) attribue des IP depuis un pool ; les routeurs HAProxy servent les Routes HTTP(S), pas les Services LoadBalancer.' },
        { t: 'quiz', q: 'Après avoir appliqué une NetworkPolicy <code>deny-all</code> dans un projet, la Route ne répond plus ; les routeurs de ton cluster sont en <code>HostNetwork</code>. Que faut-il autoriser ?', options: ['Un nouvel <code>IngressController</code> dédié à ce projet, sinon la Route ne peut pas être servie', 'Le trafic des routeurs : <code>allow-from-openshift-ingress</code> et, pour des routeurs en HostNetwork, <code>allow-from-hostnetwork</code>', 'Les connexions sortantes des routeurs, avec un EgressFirewall explicite pour le namespace', 'Rien : les Routes ne sont jamais concernées par les NetworkPolicy du projet'], answer: 1, explain: 'Le deny-all bloque aussi le trafic entrant des routeurs. La doc fournit deux policies : une pour le groupe « ingress » et une pour le trafic « host-network » (cas des routeurs en HostNetwork). L\'EgressFirewall concerne la sortie du cluster.' },
        { t: 'quiz', q: 'Peut-on étendre la <code>serviceNetwork</code> d\'un cluster déjà installé ?', options: ['Oui, en modifiant la CR <code>Network</code> comme pour <code>clusterNetwork</code>', 'Oui, mais seulement avec l\'API ServiceCIDR de Kubernetes', 'Oui, en ajoutant un nœud infra avec un second réseau de Services', 'Non : elle se fixe à l\'installation et ne peut pas être étendue'], answer: 3, explain: 'La doc 4.20 indique que le CIDR des Services ne peut pas être étendu après l\'installation (ni directement, ni par l\'API ServiceCIDR) ; seul le masque de <code>clusterNetwork</code> peut être réduit pour ajouter de l\'espace.' }
      ]
    },
    {
      title: 'Lab : exposer une appli et la isoler',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'Route, NetworkPolicy deny-all et ouverture ciblée', goal: 'Noyau en séance sur un SNO (cluster-admin) ; les étapes (bonus) sont à faire en autonomie.', steps: [
          'Prérequis : environnement E1 (SNO) avec <code>cluster-admin</code>, voir module 00.',
          'Crée un projet, déploie une appli web (par exemple <code>oc new-app --image=quay.io/redhattraining/hello-world-nginx</code>), puis expose-la avec <code>oc create route edge</code> et teste avec <code>curl -k</code>.',
          'Applique la NetworkPolicy <code>deny-all</code> de la slide dédiée : la Route répond-elle encore ? Lis <code>oc get networkpolicy</code> et explique.',
          'Ajoute <code>allow-from-openshift-ingress</code> et <code>allow-from-hostnetwork</code> (labels vérifiables avec <code>oc get ns openshift-ingress --show-labels</code>) : la Route redevient-elle accessible avec chacune seule ? Note ce qui suffit sur ton cluster. <b>Risque</b> : un deny-all peut te couper l\'accès ; <b>retour arrière</b> : <code>oc delete networkpolicy deny-all -n &lt;projet&gt;</code>.',
          'Depuis un second projet, tente d\'atteindre le Service du premier avec <code>oc exec … -- curl</code> : constate le blocage, puis ouvre un accès limité à ce projet avec une policy ciblée.',
          '(bonus, E1) Pose un <code>EgressFirewall</code> <code>default</code> qui refuse <code>0.0.0.0/0</code> sauf un CIDR choisi et teste une sortie autorisée et une refusée. <b>Nettoyage</b> : <code>oc delete egressfirewall default -n &lt;projet&gt;</code>.',
          '(bonus, E1 avec plage IP libre du sous-réseau) Installe le MetalLB Operator, crée un <code>IPAddressPool</code> et une <code>L2Advertisement</code> sur une plage libre de ton réseau, puis un Service <code>LoadBalancer</code>. <b>Nettoyage</b> : <code>oc delete svc &lt;service&gt;</code>, puis l\'<code>IPAddressPool</code> et la <code>L2Advertisement</code>.',
          '(bonus, E1) Crée un <code>UserDefinedNetwork</code> primaire <code>Layer2</code> dans un nouveau namespace (avec le label requis) et compare les adresses IP des pods. <b>Nettoyage</b> : <code>oc delete userdefinednetwork udn-1 -n &lt;namespace&gt;</code>, puis le namespace.',
          '(bonus, E2 de préférence) EgressIP (nœud labellisé, IP libre) ; sur SNO, à tenter avec prudence (à vérifier). <b>Nettoyage</b> : <code>oc delete egressip &lt;nom&gt;</code> et <code>oc label node &lt;nœud&gt; k8s.ovn.org/egress-assignable-</code>. NMState : seulement sur un cluster jetable (E1 ou plus), avec accès console aux nœuds ; retour arrière : politique avec <code>state: absent</code> pour l\'interface, puis suppression du NNCP (comportement à vérifier).'
        ] }
      ]
    }
  ],
  takeaways: [
    'OVN-Kubernetes est le seul CNI (SDN retiré en 4.17) ; <code>serviceNetwork</code>, <code>hostPrefix</code> et <code>machineNetwork</code> sont figés après l\'installation, seul le masque de <code>clusterNetwork</code> peut être réduit.',
    'HTTP(S) : Route (edge, passthrough, reencrypt) et IngressController (domaine, sharding, <code>HostNetwork</code> par défaut sans cloud) ; Gateway API GA depuis 4.19.',
    'TCP/UDP : un Service <code>LoadBalancer</code> n\'a pas de LB natif on-prem : MetalLB (L2 ou BGP) ou équipement externe.',
    'NetworkPolicy deny-all + <code>allow-from-openshift-ingress</code> / <code>allow-from-hostnetwork</code> ; AdminNetworkPolicy (priorité 0-99) et BANP pour les règles de l\'admin ; EgressFirewall et EgressIP pour la sortie.',
    'NMState configure les nœuds (bonds, VLAN) sauf <code>br-ex</code> ; Multus et SR-IOV pour les réseaux secondaires ; UDN (GA 4.18) pour la segmentation avancée et les VM.',
    'Diagnostic du simple au profond : DNS, Service et endpoints, Route, policies, puis <code>ovnkube-trace</code> ; must-gather réseau seulement sur demande du support.'
  ]
});
