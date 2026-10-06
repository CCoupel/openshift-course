COURSE.add({
  id: 'm03', num: 3, emoji: '🚀',
  title: 'Installation',
  tagline: 'Du DNS au premier <code>oc get co</code> : choisir sa méthode, préparer l\'infra, installer, y compris en réseau déconnecté.',
  duration: '≈ 75 min + lab 20 min',
  objectives: [
    'Choisir entre Agent-based, Assisted, IPI et UPI selon ta plateforme on-prem',
    'Préparer les prérequis : DNS, load balancers ou VIP, NTP, certificats, pull secret',
    'Rédiger et comprendre <code>install-config.yaml</code> et <code>agent-config.yaml</code>',
    'Suivre le déroulé d\'une installation (bootstrap, CSR, <code>wait-for</code>) et la valider',
    'Mettre en place une installation déconnectée avec un registre miroir et <code>oc-mirror</code>'
  ],
  slides: [
    {
      title: 'Quatre méthodes, une seule destination',
      blocks: [
        { t: 'text', html: "<p>Sur K8s, tu connais <code>kubeadm</code> ou un outil maison. Sur OCP, le programme est <code>openshift-install</code> (ou l'Assistant) : il génère les configurations <b>Ignition</b> et pilote le premier démarrage. Le <b>quoi</b> (rôles, topologies, ports) est au module 02 ; ici, le <b>comment</b>.</p>" },
        { t: 'table', head: ['Méthode', 'Principe', 'Ce que tu fournis'], rows: [
          ['<b>Agent-based</b>', 'Une ISO générée localement ; les nœuds bootent dessus, un nœud « rendezvous » orchestre', 'Les machines, le réseau, DNS et LB (ou VIP), un poste avec <code>openshift-install</code>'],
          ['<b>Assisted Installer</b>', 'Service web (console.redhat.com, ou version locale) : on découvre les hôtes via une ISO et on configure dans une UI', 'Les machines, le réseau, DNS et LB (ou VIP) ; accès au service'],
          ['<b>IPI</b> (installer-provisioned)', 'L\'installeur provisionne lui-même les machines (vSphere : VM ; bare metal : via BMC)', 'Credentials vCenter ou BMC, DNS, VIP réservées'],
          ['<b>UPI</b> (user-provisioned)', 'Tu crées toi-même machines, réseau, LB, DNS et sers les fichiers Ignition', 'Tout : c\'est le mode le plus manuel']
        ] },
        { t: 'callout', kind: 'k8s', html: "Contrairement à <code>kubeadm init</code>, tu ne configures pas les composants un par un : tu décris le cluster dans un seul fichier (<code>install-config.yaml</code>) et l'installeur déroule la séquence." }
      ]
    },
    {
      title: 'Laquelle choisir ?',
      layout: 'two',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '🧩 Tu veux un chemin guidé', items: ['<b>Agent-based</b> : fonctionne déconnecté, idéal pour bare metal et SNO', '<b>Assisted</b> : UI + validations des hôtes (réseau, disque, NTP) avant installation', 'Pas besoin de BMC ni de provisioning réseau'] },
          right: { title: '🔧 Tu veux tout piloter', items: ['<b>IPI</b> : moins de tâches manuelles, VIP gérées pour toi (vSphere, bare metal avec BMC)', '<b>UPI</b> : maximum de contrôle, maximum de travail ; imposé quand la plateforme ou le process l\'exige', 'Les nœuds sont à ajouter à la main ensuite (CSR)'] },
          verdict: 'Règle de départ : <b>Agent-based</b> si tu as des serveurs nus ou du déconnecté ; <b>IPI vSphere</b> si ton infra est déjà vSphere et que tu as les droits.' },
        { t: 'callout', kind: 'cloud', wide: true, html: "En cloud (AWS, Azure, GCP), IPI crée aussi les <b>load balancers, le DNS, les groupes de sécurité</b> : il n'y a quasiment rien à préparer. En managé (ROSA/ARO/OSD), tu n'installes rien : tout ce module ne te concerne pas. On-prem, la préparation de l'infra <b>est</b> le projet." }
      ]
    },
    {
      title: 'Plateformes : baremetal, vsphere, none',
      blocks: [
        { t: 'table', head: ['Valeur de <code>platform</code>', 'Quand', 'Ce que ça change'], rows: [
          ['<code>baremetal</code>', 'Serveurs physiques (ou VM sans intégration hyperviseur) avec VIP', 'API/Ingress VIP via keepalived ; Machine API via Metal3 en IPI'],
          ['<code>vsphere</code>', 'Cluster sur vCenter', 'CSI vSphere, VIP gérées (IPI), Machine API (IPI), failure domains'],
          ['<code>none</code>', 'Toute infra sans intégration (UPI, SNO, edge)', 'Pas de VIP, pas de Machine API ; LB et DNS entièrement à toi'],
          ['<i>autres</i>', 'Nutanix, OpenStack, cloud…', 'Hors périmètre de ce cours (à vérifier selon ton contexte)']
        ] },
        { t: 'callout', kind: 'warn', html: "Les combinaisons méthode × plateforme supportées dépendent de la version (par exemple l'Agent-based sur chaque plateforme) : <b>à vérifier dans les release notes de 4.20</b> et la matrice de support avant de figer ta conception." },
        { t: 'callout', kind: 'tip', html: "Le choix <code>platform</code> est <b>structurant</b> : il détermine la Machine API, le stockage par défaut (module 08) et les VIP. Il ne se change pas après coup." }
      ]
    },
    {
      title: 'Prérequis : machines et poste de travail',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Rôle', 'vCPU', 'RAM', 'Disque'], rows: [
          ['Bootstrap (temporaire)', '4', '16 Go', '100 Go'],
          ['Control plane (×3)', '4', '16 Go', '100 Go'],
          ['Worker (×N)', '2', '8 Go', '100 Go'],
          ['SNO', '8', '16 Go', '120 Go']
        ] },
        { t: 'bullets', items: [
          '<b>Ordres de grandeur minimaux</b> : à vérifier dans la doc 4.20 ; dimensionne plus large (monitoring, logging, virtualisation).',
          'Disque control plane : <b>rapide</b> (latence etcd, voir module 08).',
          '<b>Architecture et firmware</b> : x86_64 (autres archi : hors périmètre), UEFI recommandé.',
          'Poste d\'installation avec accès aux nœuds et à Internet (ou au miroir).'
        ] },
        { t: 'cmds', wide: true, items: [
          ['openshift-install version', 'Version de l\'installeur (et release embarquée)'],
          ['oc version --client', 'Version du client oc'],
          ['oc adm release info quay.io/openshift-release-dev/ocp-release:<version>-x86_64', 'Contenu d\'une release (composants, images) ; remplace <version>'],
          ['butane --version', 'Outil pour écrire des MachineConfig / Ignition en YAML (utile en UPI)']
        ] }
      ]
    },
    {
      title: 'Prérequis : DNS et load balancers',
      blocks: [
        { t: 'text', html: "<p>Trois noms à résoudre, <b>avant</b> d'installer. Ports et flux : module 02 ; ici, la mise en œuvre.</p>" },
        { t: 'code', lang: 'bash', file: 'zone DNS (exemple BIND)', code: "; cluster ocp4 dans example.com\napi.ocp4.example.com.        IN A 192.168.10.5   ; LB API (ou VIP API)\napi-int.ocp4.example.com.    IN A 192.168.10.5   ; même cible, nom utilisé par les nœuds\n*.apps.ocp4.example.com.     IN A 192.168.10.6   ; LB Ingress (ou VIP Ingress)\n; + A (et PTR) pour chaque nœud en UPI" },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ dig +short api.ocp4.example.com\n192.168.10.5\n$ dig +short test.apps.ocp4.example.com   # le wildcard doit répondre\n192.168.10.6\n$ dig +short -x 192.168.10.21             # résolution inverse d'un nœud" },
        { t: 'bullets', frag: true, items: [
          '<b>UPI / platform none</b> : deux LB L4 à toi (API 6443 + MCS 22623 ; Ingress 80 + 443), avec health checks.',
          '<b>IPI / Agent avec VIP</b> : deux VIP libres dans le sous-réseau des nœuds (<code>apiVIPs</code>, <code>ingressVIPs</code>) ; le DNS pointe dessus.',
          'La résolution <b>inverse</b> des nœuds est exigée selon la méthode : à vérifier dans la doc 4.20.'
        ] },
        { t: 'callout', kind: 'trap', html: "Le wildcard <code>*.apps</code> oublié est la panne n°1 : l'installation <b>semble avancer</b>, puis <code>install-complete</code> n'aboutit jamais (console et OAuth injoignables)." }
      ]
    },
    {
      title: 'Prérequis : NTP, adressage, certificats, pull secret',
      layout: 'two',
      blocks: [
        { t: 'bullets', frag: true, items: [
          '<b>NTP</b> : tous les nœuds sur la même source de temps. Un décalage casse les certificats et etcd (module 02).',
          '<b>Adressage</b> : DHCP avec réservations, ou IP statiques décrites en <b>NMState</b> (Agent-based). Pas de changement d\'IP après coup.',
          '<b>Réseaux internes</b> : <code>clusterNetwork</code>, <code>serviceNetwork</code>, <code>machineNetwork</code> ne doivent pas chevaucher ton réseau (VPN, datacenters).',
          '<b>Pull secret</b> : récupéré sur console.redhat.com, injecté dans <code>install-config.yaml</code>.',
          '<b>Certificats</b> : l\'installeur crée une PKI interne ; les certificats de l\'API et de l\'Ingress se remplacent <b>après</b> (module 04).'
        ] },
        { t: 'callout', kind: 'onprem', html: "Réseau, DNS, NTP, firewall et PKI de l'entreprise : <b>ce sont des tickets à ouvrir en amont</b> avec d'autres équipes. Compte des semaines, pas des heures." },
        { t: 'callout', kind: 'cloud', html: "En cloud, le temps, le DNS et le réseau sont fournis ; seul le chevauchement de CIDR reste un sujet." }
      ]
    },
    {
      title: 'install-config.yaml : l\'unique fichier de vérité',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'install-config.yaml (squelette)', code: `apiVersion: v1
baseDomain: example.com
metadata:
  name: ocp4                 # => api.ocp4.example.com
compute:
- name: worker
  replicas: 3                # 0 pour un compact ou un SNO
controlPlane:
  name: master
  replicas: 3                # 1 pour un SNO
networking:
  networkType: OVNKubernetes
  clusterNetwork:
  - cidr: 10.128.0.0/14      # réseau des pods
    hostPrefix: 23
  serviceNetwork:
  - 172.30.0.0/16
  machineNetwork:
  - cidr: 192.168.10.0/24    # réseau des nœuds
platform:
  none: {}                   # ou baremetal / vsphere (slides suivantes)
pullSecret: '{"auths":{...}}'
sshKey: 'ssh-ed25519 AAAA...'` },
        { t: 'bullets', items: [
          'Les CIDR ci-dessus sont les valeurs par défaut courantes : à adapter à ton réseau.',
          'Champs optionnels utiles : <code>additionalTrustBundle</code> (CA d\'un registre ou proxy), <code>proxy</code>, <code>fips</code>, <code>capabilities</code>.',
          'Génération guidée : <code>openshift-install create install-config</code>.'
        ] },
        { t: 'callout', kind: 'trap', html: "L'installeur <b>consomme</b> <code>install-config.yaml</code> (il le supprime du dossier). Fais-en une copie avant <code>create</code> : sans elle, impossible de rejouer ou de comprendre ce qui a été installé." }
      ]
    },
    {
      title: 'install-config : spécificités vSphere (IPI)',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'install-config.yaml (extrait vsphere)', code: `platform:
  vsphere:
    apiVIPs:
    - 192.168.10.5
    ingressVIPs:
    - 192.168.10.6
    vcenters:
    - server: vcenter.example.com
      user: svc-ocp@vsphere.local
      password: mot-de-passe-a-definir
      datacenters:
      - DC1
    failureDomains:
    - name: fd-a
      region: dc1
      zone: cluster-a
      server: vcenter.example.com
      topology:
        datacenter: DC1
        computeCluster: /DC1/host/cluster-a
        datastore: /DC1/datastore/ds-ocp
        networks:
        - VM Network` },
        { t: 'bullets', items: [
          'Les <b>failure domains</b> décrivent où placer les VM (cluster, datastore, réseau) : base pour la HA entre clusters ou datacenters.',
          'Le compte vCenter doit avoir les <b>privilèges</b> documentés (VM, dossiers, datastore) : à vérifier dans la doc 4.20.',
          'Forme exacte (<code>vcenters</code> + <code>failureDomains</code>) : à vérifier selon la version.'
        ] },
        { t: 'callout', kind: 'onprem', html: "Réserve les deux VIP dans l'IPAM <b>avant</b> : une VIP déjà utilisée provoque des erreurs intermittentes très difficiles à relier à l'installation." }
      ]
    },
    {
      title: 'IPI bare metal : BMC et provisioning',
      layout: 'two',
      blocks: [
        { t: 'text', html: "<p>En IPI bare metal, l'installeur pilote les serveurs <b>via leur BMC</b> (Metal3 / Ironic). Chaque hôte est décrit dans <code>install-config.yaml</code>.</p>" },
        { t: 'code', lang: 'yaml', file: 'install-config.yaml (extrait baremetal)', code: `platform:
  baremetal:
    apiVIPs: [192.168.10.5]
    ingressVIPs: [192.168.10.6]
    provisioningNetwork: Managed   # ou Unmanaged / Disabled
    hosts:
    - name: master-0
      role: master
      bmc:
        address: redfish-virtualmedia://10.0.0.11/redfish/v1/Systems/1
        username: admin
        password: mot-de-passe-a-definir
      bootMACAddress: 52:54:00:aa:bb:01
      rootDeviceHints:
        deviceName: /dev/sda` },
        { t: 'bullets', items: [
          '<b>BMC</b> : Redfish (virtual media) ou IPMI ; il faut un chemin réseau installeur → BMC.',
          '<b>Provisioning network</b> : un réseau dédié (PXE) ; en alternative, virtual media seul.',
          '<code>rootDeviceHints</code> : indique le disque à utiliser (sinon risque d\'écraser le mauvais).'
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: "Un BMC mal accessible ou un firmware ancien (Redfish incomplet) bloque l'inspection. Valide la connectivité BMC <b>avant</b> de lancer l'installation." }
      ]
    },
    {
      title: 'Agent-based : agent-config.yaml',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'agent-config.yaml (SNO)', code: `apiVersion: v1alpha1
kind: AgentConfig
metadata:
  name: ocp4
rendezvousIP: 192.168.10.10     # IP du nœud qui orchestre l'installation
hosts:
- hostname: sno-0
  interfaces:
  - name: eno1
    macAddress: 52:54:00:aa:bb:10
  networkConfig:                 # syntaxe NMState
    interfaces:
    - name: eno1
      type: ethernet
      state: up
      mac-address: 52:54:00:aa:bb:10
      ipv4:
        enabled: true
        dhcp: false
        address:
        - ip: 192.168.10.10
          prefix-length: 24
    dns-resolver:
      config:
        server:
        - 192.168.10.2
    routes:
      config:
      - destination: 0.0.0.0/0
        next-hop-address: 192.168.10.1
        next-hop-interface: eno1` },
        { t: 'callout', kind: 'tip', html: "<code>agent-config.yaml</code> complète <code>install-config.yaml</code> (cluster, pull secret, réseau global) avec ce qui est <b>propre aux hôtes</b> : IP statiques, interfaces, rôle. Détail réseau des nœuds (NMState) : module 07." },
        { t: 'callout', kind: 'warn', html: "Version exacte de l'<code>apiVersion</code> et champs disponibles : à vérifier dans les release notes de 4.20." }
      ]
    },
    {
      title: 'Agent-based : le déroulé',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Rédiger', sub: 'install-config + agent-config' },
          { label: 'Générer l\'ISO', sub: 'openshift-install agent create image', hl: true },
          { label: 'Booter', sub: 'virtual media, USB ou PXE' },
          { label: 'Rendezvous', sub: 'orchestre, héberge le bootstrap' },
          { label: 'Cluster', sub: 'les autres nœuds rejoignent' }
        ], caption: "Pas de machine bootstrap séparée : un des nœuds fait office de <b>rendezvous</b> et joue ce rôle pendant l'installation." },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ mkdir ocp4 && cp install-config.yaml agent-config.yaml ocp4/\n$ cp -r ocp4 ocp4.bak                      # les fichiers sont consommés\n$ openshift-install agent create image --dir ocp4\n# => ocp4/agent.x86_64.iso (monter sur chaque serveur)\n$ openshift-install agent wait-for bootstrap-complete --dir ocp4 --log-level=info\n$ openshift-install agent wait-for install-complete  --dir ocp4" },
        { t: 'callout', kind: 'warn', html: "Sous-commandes exactes (<code>agent create image</code>, <code>wait-for</code>, <code>create cluster-manifests</code>) et nom du fichier ISO : à vérifier dans la doc de 4.20." }
      ]
    },
    {
      title: 'UPI : ce que tu fais toi-même',
      layout: 'two',
      blocks: [
        { t: 'flow', wide: true, nodes: [
          'create install-config',
          { label: 'create manifests', sub: 'éventuellement éditer' },
          { label: 'create ignition-configs', sub: 'bootstrap.ign, master.ign, worker.ign', hl: true },
          'héberger les .ign',
          'booter les VM / serveurs'
        ], caption: 'Après le démarrage : <code>wait-for bootstrap-complete</code>, approbation des CSR, puis <code>wait-for install-complete</code>.' },
        { t: 'bullets', frag: true, items: [
          'Tu crées <b>les machines</b>, le réseau, <b>les LB</b>, le DNS et le serveur HTTP des fichiers Ignition.',
          'Les nœuds démarrent sur une image RHCOS (ISO, PXE, template vSphere) avec un Ignition « <i>pointeur</i> » vers le MCS (port 22623).',
          'Le bootstrap est retiré du LB à la fin : <b>à toi de le faire</b>.'
        ] },
        { t: 'callout', kind: 'trap', html: "Les fichiers Ignition ont une <b>durée de validité limitée</b> (certificats de bootstrap : de l'ordre de 24 h, à vérifier). Si l'installation traîne, regénère-les." },
        { t: 'callout', kind: 'onprem', html: "UPI est le seul mode où tu peux accumuler des écarts entre nœuds (templates, firmware). Documente et <b>automatise</b> (Terraform, Ansible) dès le début." }
      ]
    },
    {
      title: 'Ce qui se passe pendant l\'installation',
      blocks: [
        { t: 'diagram', caption: 'Séquence simplifiée : le bootstrap démarre un control plane temporaire qui sert d\'amorce aux vrais masters.', html: '<svg viewBox="0 0 760 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Séquence d\'installation" style="width:100%;height:auto"><defs><marker id="ar3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs><g fill="var(--surface)" stroke="var(--border)" stroke-width="1.5"><rect x="10" y="20" width="140" height="60" rx="8"/><rect x="190" y="20" width="160" height="60" rx="8"/><rect x="390" y="20" width="160" height="60" rx="8"/><rect x="590" y="20" width="160" height="60" rx="8"/></g><g fill="var(--accent)" fill-opacity="0.15" stroke="var(--accent)" stroke-width="1.5"><rect x="190" y="120" width="160" height="60" rx="8"/><rect x="390" y="120" width="160" height="60" rx="8"/></g><g fill="currentColor" text-anchor="middle" font-size="13"><text x="80" y="46">1. Boot Ignition</text><text x="80" y="64" fill="var(--muted)">image RHCOS</text><text x="270" y="46">2. Bootstrap</text><text x="270" y="64" fill="var(--muted)">control plane temporaire</text><text x="470" y="46">3. Masters</text><text x="470" y="64" fill="var(--muted)">rejoignent, etcd</text><text x="670" y="46">4. Bootstrap retiré</text><text x="670" y="64" fill="var(--muted)">le cluster est autonome</text><text x="270" y="146">CVO</text><text x="270" y="164" fill="var(--muted)">déploie les opérateurs</text><text x="470" y="146">Workers</text><text x="470" y="164" fill="var(--muted)">rejoignent (CSR à approuver)</text></g><g stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#ar3)"><path d="M150 50 H188"/><path d="M350 50 H388"/><path d="M550 50 H588"/><path d="M270 80 V118"/><path d="M470 80 V118"/></g></svg>' },
        { t: 'bullets', frag: true, items: [
          'Les nœuds tirent leur Ignition depuis le <b>Machine Config Server</b> (22623) et le bootstrap héberge d\'abord l\'API temporaire.',
          'Le <b>CVO</b> (module 02) déploie ensuite les Cluster Operators : c\'est la phase la plus longue.',
          'Durée typique : de l\'ordre de 30 à 60 min selon l\'infra et le débit vers les images (à ajuster).'
        ] }
      ]
    },
    {
      title: 'Suivre l\'installation et approuver les CSR',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ export KUBECONFIG=ocp4/auth/kubeconfig\n$ openshift-install wait-for bootstrap-complete --dir ocp4 --log-level=debug\n$ openshift-install wait-for install-complete  --dir ocp4\n\n# Les workers apparaissent seulement après approbation des CSR\n$ oc get csr | grep Pending\n$ oc get csr -o go-template='{{range .items}}{{if not .status}}{{.metadata.name}}{{\"\\n\"}}{{end}}{{end}}' \\\n    | xargs oc adm certificate approve" },
        { t: 'bullets', items: [
          '<b>Deux vagues</b> de CSR par nœud : le client (kubelet-bootstrap), puis le serving.',
          'En <b>IPI/Machine API</b>, l\'approbation est automatique ; en UPI et Agent-based sur <code>none</code>, c\'est à toi.',
          'Si ça bloque : <code>openshift-install gather bootstrap</code> (UPI/IPI) ou <code>oc adm must-gather</code> sur un cluster déjà vivant.'
        ] },
        { t: 'callout', kind: 'tip', wide: true, html: "Un worker absent de <code>oc get nodes</code> en UPI, c'est presque toujours <b>un CSR en Pending</b>. Pense à relancer la commande une fois la première vague approuvée : la seconde apparaît ensuite." }
      ]
    },
    {
      title: 'Déconnecté : le registre miroir',
      blocks: [
        { t: 'text', html: "<p>Un cluster sans accès Internet doit tirer <b>toutes</b> ses images (plateforme, opérateurs, tes applis) depuis un <b>registre interne</b>. Il faut donc d'abord <b>mirrorer</b> le contenu.</p>" },
        { t: 'flow', nodes: [
          { label: 'Internet', sub: 'registry.redhat.io, quay.io' },
          { label: 'Poste connecté', sub: 'oc-mirror', hl: true },
          { label: 'Disque / média', sub: 'transfert (air gap)' },
          { label: 'Registre miroir', sub: 'dans ton réseau', hl: true },
          { label: 'Cluster', sub: 'tire via IDMS/ITMS' }
        ], caption: 'Si le poste de mirroring voit Internet <b>et</b> le miroir : un seul saut (mirror-to-mirror). Sinon : mirror-to-disk, transfert, disk-to-mirror.' },
        { t: 'bullets', frag: true, items: [
          'Registre : <b>mirror registry for Red Hat OpenShift</b> (petit registre Quay fourni par Red Hat), ou Quay, Harbor, Artifactory… (support selon ton choix : à vérifier).',
          'Il doit supporter les <b>manifestes multi-arch / OCI</b> et être joignable par tous les nœuds, avec un certificat de confiance.',
          'Dimensionnement : plusieurs dizaines à centaines de Go selon les opérateurs mirrorés.'
        ] },
        { t: 'callout', kind: 'onprem', html: "Le registre miroir est un <b>service critique</b> : sa disponibilité conditionne les installations, mises à jour et rescheduling d'images. Sauvegarde-le (module 11) et supervise-le." }
      ]
    },
    {
      title: 'Déconnecté : ImageSetConfiguration',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'imageset-config.yaml', code: `kind: ImageSetConfiguration
apiVersion: mirror.openshift.io/v2alpha1   # v1alpha2 pour oc-mirror v1
mirror:
  platform:
    channels:
    - name: stable-4.20
      minVersion: 4.20.0           # versions à adapter
      maxVersion: 4.20.2
  operators:
  - catalog: registry.redhat.io/redhat/redhat-operator-index:v4.20
    packages:
    - name: lvms-operator
  additionalImages:
  - name: registry.redhat.io/ubi9/ubi:latest` },
        { t: 'bullets', items: [
          '<b>platform</b> : la release OCP (canal + plage de versions) ; pour une mise à jour EUS, prévois toutes les versions intermédiaires nécessaires (module 12).',
          '<b>operators</b> : sélectionne <b>uniquement</b> les paquets utiles : un catalogue entier est énorme.',
          '<b>additionalImages</b> : tes images de base, d\'outillage, etc.'
        ] },
        { t: 'callout', kind: 'warn', wide: true, html: "<code>apiVersion</code> de l'<code>ImageSetConfiguration</code> (v2alpha1 ou autre), statut d'<b>oc-mirror v2</b> (GA ou non en 4.20) et champs disponibles : <b>à vérifier dans les release notes</b>." }
      ]
    },
    {
      title: 'Déconnecté : lancer oc-mirror, appliquer IDMS et ITMS',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: "# 1. Mirror vers un disque (poste connecté)\n$ oc-mirror --v2 -c imageset-config.yaml file:///data/mirror\n\n# 2. Après transfert : disque -> registre miroir\n$ oc-mirror --v2 -c imageset-config.yaml --from file:///data/mirror docker://registry.example.com:8443\n\n# 3. Ressources générées pour le cluster\n$ ls /data/mirror/working-dir/cluster-resources/\n$ oc apply -f /data/mirror/working-dir/cluster-resources/" },
        { t: 'table', head: ['Ressource', 'Rôle'], rows: [
          ['<code>ImageDigestMirrorSet</code> (IDMS)', 'Redirige les pulls <b>par digest</b> vers le miroir'],
          ['<code>ImageTagMirrorSet</code> (ITMS)', 'Redirige les pulls <b>par tag</b> vers le miroir'],
          ['<code>CatalogSource</code>', 'Expose le catalogue miroité à OLM (module 04)'],
          ['<code>ImageContentSourcePolicy</code> (ICSP)', 'Ancien mécanisme, <b>déprécié</b> au profit d\'IDMS/ITMS']
        ] },
        { t: 'callout', kind: 'warn', html: "Les options (<code>--v2</code>, <code>--from</code>, <code>--workspace</code>), l'arborescence de sortie et les ressources produites (dont les catalogues) : <b>à vérifier</b> dans la doc <code>oc-mirror</code> de 4.20. Avant la mise en œuvre réelle, utilise l'option <code>--dry-run</code> si elle existe dans ta version." }
      ]
    },
    {
      title: 'Déconnecté : pull secret, CA et sources par défaut',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: "# Ajouter les identifiants du miroir au pull secret\n$ podman login --authfile ./pull-secret.json registry.example.com:8443\n# => pull-secret.json contient maintenant aussi le miroir\n\n# Désactiver les catalogues par défaut (inaccessibles hors ligne)\n$ oc patch OperatorHub cluster --type json \\\n    -p '[{\"op\":\"add\",\"path\":\"/spec/disableAllDefaultSources\",\"value\":true}]'" },
        { t: 'bullets', items: [
          'Le <b>pull secret</b> de l\'installation contient les identifiants du miroir (en plus ou à la place de ceux de Red Hat).',
          '<code>additionalTrustBundle</code> dans <code>install-config.yaml</code> : la <b>CA</b> du registre, pour que les nœuds lui fassent confiance.',
          'Les IDMS/ITMS sont soit générés à l\'installation à partir d\'<code>imageContentSources</code> (à vérifier pour 4.20), soit appliqués après.',
          'Utilisation des catalogues miroités (<code>CatalogSource</code>, OLM) : module 04.'
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: "Un cluster déconnecté affiche des <b>OperatorHub vides</b> et des pods en <code>ImagePullBackOff</code> tant que les catalogues par défaut tentent d'atteindre Internet ou que les IDMS manquent. Vérifie aussi que tes <b>images applicatives</b> sont mirrorées (<code>additionalImages</code>)." }
      ]
    },
    {
      title: 'Vérifications post-installation',
      blocks: [
        { t: 'cmds', items: [
          ['oc get clusterversion', 'Version, progression, Available=True ?'],
          ['oc get co', 'Tous les Cluster Operators Available / non Degraded ?'],
          ['oc get nodes -o wide', 'Tous les nœuds Ready, rôles et IP attendus ?'],
          ['oc get csr | grep Pending', 'Plus aucun CSR en attente ?'],
          ['oc get mcp', 'Pools à jour (UPDATED=True, DEGRADED=False) ?'],
          ['oc get pods -A | grep -v -E "Running|Completed"', 'Pods en erreur après installation'],
          ['oc whoami --show-console', 'URL de la console'],
          ['oc get route -n openshift-ingress', 'L\'Ingress répond : test du DNS wildcard']
        ] },
        { t: 'bullets', frag: true, items: [
          'Récupère le mot de passe <code>kubeadmin</code> dans <code>auth/kubeadmin-password</code> ; remplace-le par un vrai IdP (module 06), puis supprime-le.',
          'Sauvegarde etcd <b>tout de suite</b> (module 11) et conserve le dossier d\'installation (<code>auth/</code>, <code>metadata.json</code>).',
          'Remplace les certificats API et Ingress (module 04).'
        ] }
      ]
    },
    {
      title: 'Les erreurs classiques',
      tag: 'pièges',
      blocks: [
        { t: 'cards', items: [
          { front: 'Install bloquée à 80-90 %', back: '<b>Wildcard *.apps</b> absent ou LB Ingress mal configuré.' },
          { front: 'Bootstrap qui n\'avance pas', back: 'Port <b>22623</b> fermé ou LB mal configuré ; heure décalée (certificats).' },
          { front: 'Workers absents', back: '<b>CSR en Pending</b> (UPI / platform none).' },
          { front: 'ImagePullBackOff partout', back: 'Pull secret sans le miroir, <b>CA non fournie</b> ou IDMS manquants.' },
          { front: 'Install-config perdu', back: 'Le fichier est <b>consommé</b> : sauvegarde-le avant <code>create</code>.' },
          { front: 'VIP qui flottent mal', back: 'VIP hors du <b>machineNetwork</b>, ou conflit d\'IP sur le sous-réseau.' }
        ] },
        { t: 'callout', kind: 'tip', html: "Face à une installation qui coince, <b>lis le journal</b> (<code>.openshift_install.log</code> dans le dossier d'installation, ou <code>oc get co</code> / <code>oc get events -A</code>) avant de tout relancer." }
      ]
    },
    {
      title: 'Quiz',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Installation UPI : <code>wait-for bootstrap-complete</code> passe, mais <code>install-complete</code> ne se termine jamais ; la console est injoignable. Quelle cause est la plus probable ?', options: ['Le port 6443 est fermé', 'L\'enregistrement DNS wildcard <code>*.apps</code> ou le LB Ingress est absent ou incorrect', 'Le pull secret est expiré', 'Le bootstrap n\'a pas été supprimé'], answer: 1, explain: 'Le bootstrap passe, donc l\'API (6443) et le MCS (22623) fonctionnent. La console, OAuth et le registre passent par l\'Ingress : sans wildcard ou LB Ingress, les opérateurs concernés restent non disponibles.' },
        { t: 'quiz', q: 'Cluster déconnecté : les images sont miroitées, mais les manifests référencent encore <code>quay.io/...</code>. Comment les nœuds tirent-ils depuis le miroir ?', options: ['Il faut modifier chaque Deployment', 'Via les ressources <code>ImageDigestMirrorSet</code> / <code>ImageTagMirrorSet</code>', 'Un proxy transparent est obligatoire', 'En remplaçant /etc/hosts sur chaque nœud'], answer: 1, explain: 'IDMS et ITMS redirigent les pulls (par digest et par tag) vers le miroir au niveau du runtime ; on ne modifie pas les workloads. ICSP est l\'ancien mécanisme (déprécié).' },
        { t: 'quiz', q: 'Après une installation UPI, un worker n\'apparaît pas dans <code>oc get nodes</code>. Premier réflexe ?', options: ['Redémarrer le bootstrap', 'Regarder <code>oc get csr</code> et approuver les demandes en Pending', 'Recréer le cluster', 'Modifier le MachineConfigPool worker'], answer: 1, explain: 'Sans Machine API, les CSR du kubelet (client, puis serving) ne sont pas auto-approuvées : il faut les approuver à la main, en deux vagues.' }
      ]
    },
    {
      title: 'Lab : préparer l\'installation d\'un SNO',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'Rédiger install-config et agent-config, générer les manifests', goal: 'Noyau en séance : poste de travail seul, sans cluster. Les étapes (bonus) nécessitent un cluster de lab.', steps: [
          'Prérequis : un poste Linux avec <code>openshift-install</code> et <code>oc</code> (ceux du module 00) ; E0 suffit pour le noyau, E1 pour les étapes bonus.',
          'Crée un dossier <code>sno/</code> et rédige <code>install-config.yaml</code> : <code>controlPlane.replicas: 1</code>, <code>compute.replicas: 0</code>, <code>platform: none: {}</code>, ton pull secret, ta clé SSH.',
          'Rédige <code>agent-config.yaml</code> : un hôte, une IP statique, une route par défaut, un DNS ; fixe <code>rendezvousIP</code> sur cette IP.',
          'Fais une <b>copie de sauvegarde</b> des deux fichiers hors du dossier (ils seront consommés).',
          'Génère les manifests : <code>openshift-install agent create cluster-manifests --dir sno</code> (sous-commande à vérifier) ; liste le contenu de <code>sno/cluster-manifests/</code>.',
          'Relis les manifests générés : où retrouves-tu ton pull secret, ta clé SSH et ton réseau ? Quel fichier décrit l\'hôte ?',
          'Vérifie ton DNS fictif : écris les trois enregistrements (<code>api</code>, <code>api-int</code>, <code>*.apps</code>) pour ton SNO et explique pourquoi ils pointent tous vers la même IP.',
          '(bonus) Sur le cluster du module 00 : <code>oc get clusterversion -o yaml</code> ; retrouve l\'historique des versions et les conditions.',
          '(bonus) Rédige un <code>ImageSetConfiguration</code> minimal (une release, un paquet d\'opérateur) et lance <code>oc-mirror</code> en simulation (<code>--dry-run</code>, à vérifier) ; estime le volume à transférer.'
        ] }
      ]
    }
  ],
  takeaways: [
    'Quatre méthodes (Agent-based, Assisted, IPI, UPI) : le choix dépend de la plateforme (baremetal, vsphere, none) et de ce que tu veux piloter.',
    'DNS (api, api-int, *.apps), LB ou VIP, NTP : préparés <b>avant</b>. Le wildcard oublié est la panne n°1.',
    '<code>install-config.yaml</code> (et <code>agent-config.yaml</code>) décrit tout ; l\'installeur le consomme : fais-en une copie.',
    'En UPI et sur <code>none</code>, tu approuves les CSR et retires le bootstrap toi-même.',
    'Déconnecté = registre miroir + <code>oc-mirror</code> + IDMS/ITMS + CA et pull secret ; versions d\'oc-mirror et d\'<code>ImageSetConfiguration</code> à vérifier.',
    'Après l\'installation : valider (<code>oc get co</code>), sauvegarder etcd, remplacer kubeadmin et les certificats.'
  ]
});
