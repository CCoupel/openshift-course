COURSE.add({
  id: 'm08', num: 8, emoji: '💾',
  title: 'Stockage',
  tagline: "Sur OpenShift on-prem, le stockage persistant n'est pas fourni : c'est toi qui choisis le backend, et c'est là que les projets déraillent.",
  duration: '≈ 60 min + lab 20 min',
  objectives: [
    "Choisir un backend de stockage on-prem adapté (vSphere CSI, LVMS, LSO, NFS, baie SAN via CSI, ODF)",
    "Maîtriser StorageClass, modes d'accès, expansion, snapshots et clones",
    "Comprendre ODF (RBD, CephFS, objet), ses topologies et son coût en ressources",
    "Connaître les exigences disque d'etcd et le stockage du registre, du monitoring et du logging",
    "Diagnostiquer les pannes classiques : PVC Pending, Multi-Attach, volume en Terminating, permissions"
  ],
  slides: [
    {
      title: "Rappel PV / PVC / StorageClass, et ce qui change",
      blocks: [
        { t: 'text', html: "<p>Les objets sont ceux de K8s : <b>PVC</b> (demande), <b>PV</b> (volume), <b>StorageClass</b> (recette de provisionnement dynamique). Sur OCP, la mécanique est la même ; ce qui change, c'est <b>qui installe et pilote les drivers</b>.</p>" },
        { t: 'bullets', frag: true, items: [
          "Les drivers CSI de plateforme (vSphere, cloud) sont installés et mis à jour par le <b>Cluster Storage Operator</b> (<code>oc get co storage</code>).",
          "Les autres backends (LVMS, ODF, LSO, CSI constructeur) arrivent par <b>OLM / OperatorHub</b>.",
          "Selon la plateforme, une StorageClass par défaut est créée à l'installation (vSphere : <code>thin-csi</code>). <b>Sur bare metal, il n'y en a pas</b>.",
          "Les pods tournent en UID aléatoire (SCC) : les permissions sur volumes deviennent un sujet (slide dédiée)."
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc get sc\n$ oc get csidriver\n$ oc get pods -n openshift-cluster-csi-drivers\n$ oc get co storage" }
      ]
    },
    {
      title: "CSI sur OpenShift : qui fait quoi",
      blocks: [
        { t: 'text', html: "<p>Un driver CSI = un <b>controller</b> (Deployment : provisionne, attache, snapshot) + un <b>node plugin</b> (DaemonSet : monte le volume sur le nœud) + des sidecars (external-provisioner, attacher, resizer, snapshotter).</p>" },
        { t: 'flow', nodes: [
          'PVC',
          { label: 'external-provisioner', sub: 'voit la StorageClass', hl: true },
          { label: 'Driver CSI controller', sub: 'crée le volume sur le backend' },
          { label: 'PV', sub: 'lié au PVC' },
          { label: 'Node plugin', sub: 'attache + monte dans le pod', hl: true }
        ], caption: "Le <code>provisioner</code> de la StorageClass doit correspondre au nom d'un CSIDriver." },
        { t: 'callout', kind: 'ocp', html: "Les drivers « in-tree » historiques sont migrés vers CSI. Pour vSphere, l'ancienne StorageClass <code>thin</code> (in-tree) est remplacée par <code>thin-csi</code> : vérifie ce que ton cluster utilise réellement avant une montée de version." }
      ]
    },
    {
      title: "Panorama des backends on-prem",
      blocks: [
        { t: 'table', head: ['Backend', 'Modes', 'Dynamique ?', 'Cas d\'usage'], rows: [
          ['<b>vSphere CSI</b>', 'RWO (VMDK) ; RWX via vSAN File Services (à vérifier)', 'Oui', 'Cluster sur vSphere, datastore existant'],
          ['<b>LVMS</b> (LVM Storage)', 'RWO bloc/fichier local', 'Oui (thin LVM)', 'SNO, edge, petits clusters'],
          ['<b>Local Storage Operator</b>', 'RWO, volumeMode Filesystem ou Block', 'Non : PV statiques sur disques locaux', 'Bare metal, disques dédiés, base pour ODF'],
          ['<b>NFS</b>', 'RWX', "Via nfs-subdir ou CSI NFS (communautaires)", 'Partage de fichiers simple ; pas pour les bases de données'],
          ['<b>iSCSI / FC / NAS constructeur</b>', 'RWO (bloc), RWX (fichier) selon la baie', 'Oui via CSI constructeur', 'Baie SAN/NAS existante (NetApp, Dell, Pure, HPE…)'],
          ['<b>ODF</b>', 'RWO (RBD), RWX (CephFS), objet S3', 'Oui', 'Stockage défini par logiciel, tout-en-un']
        ] },
        { t: 'callout', kind: 'onprem', html: "On-prem, <b>le backend est à ta charge</b> : capacité, performances, sauvegarde du stockage et support constructeur. Choisis-le avant l'installation, pas après le premier PVC Pending." }
      ]
    },
    {
      title: "vSphere CSI",
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          "Driver <code>csi.vsphere.vmware.com</code>, installé par défaut sur un cluster vSphere.",
          "Un PV = un disque virtuel (VMDK) rattaché à la VM du nœud : <b>RWO</b> uniquement en bloc.",
          "StorageClass <code>thin-csi</code> par défaut ; le paramètre <code>storagePolicyName</code> relie à une <b>politique de stockage vCenter (SPBM)</b>.",
          "Le compte vCenter utilisé par OCP doit avoir les privilèges de stockage cloud-native : à valider avec l'équipe VMware.",
          "Topologie (zones/régions via tags vCenter) possible : à planifier à l'installation."
        ] },
        { t: 'code', lang: 'yaml', file: 'sc-vsphere.yaml', code: "apiVersion: storage.k8s.io/v1\nkind: StorageClass\nmetadata:\n  name: vsphere-gold\nprovisioner: csi.vsphere.vmware.com\nparameters:\n  storagePolicyName: \"Gold-SSD\"\nreclaimPolicy: Delete\nallowVolumeExpansion: true\nvolumeBindingMode: WaitForFirstConsumer" },
        { t: 'callout', kind: 'trap', wide: true, html: "Le disque PV est un objet vCenter : <b>supprimer ou déplacer la VM d'un nœud à la main</b> (Storage vMotion, clone) peut casser l'attachement. Laisse le cluster (Machine API) gérer le cycle de vie des nœuds." }
      ]
    },
    {
      title: "LVMS et Local Storage Operator",
      layout: 'two',
      blocks: [
        { t: 'text', html: "<p><b>LVMS</b> (LVM Storage) : un opérateur qui construit un volume group LVM sur les disques locaux et provisionne dynamiquement des volumes <i>thin</i> (basé sur TopoLVM). C'est le choix naturel pour SNO et l'edge.</p>" },
        { t: 'code', lang: 'yaml', file: 'lvmcluster.yaml', code: "apiVersion: lvm.topolvm.io/v1alpha1\nkind: LVMCluster\nmetadata:\n  name: my-lvmcluster\n  namespace: openshift-storage\nspec:\n  storage:\n    deviceClasses:\n    - name: vg1\n      default: true\n      thinPoolConfig:\n        name: thin-pool-1\n        sizePercent: 90\n        overprovisionRatio: 10" },
        { t: 'callout', kind: 'tip', html: "LVMS crée une StorageClass nommée <code>lvms-&lt;deviceClass&gt;</code> (ici <code>lvms-vg1</code>). Le volume est <b>local à un nœud</b> : si le nœud tombe, les données sont indisponibles." },
        { t: 'text', html: "<p><b>Local Storage Operator (LSO)</b> : pas de provisionnement dynamique. Il découvre les disques (<code>LocalVolumeDiscovery</code>) et crée des <b>PV statiques</b> (<code>LocalVolume</code> / <code>LocalVolumeSet</code>) avec une StorageClass <code>no-provisioner</code>. Brique de base d'ODF sur bare metal.</p>" },
        { t: 'callout', kind: 'warn', wide: true, html: "Les disques fournis à LVMS ou LSO doivent être <b>vierges</b> (sans signature de filesystem ou partition). Les versions récentes de LVMS ajoutent des options de sélection de disques : options disponibles en 4.20 à vérifier dans la doc de ta version." }
      ]
    },
    {
      title: "NFS, iSCSI, FC : les baies existantes",
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          "<b>NFS</b> : pas de provisionneur dynamique livré avec OCP. Options communautaires : <code>nfs-subdir-external-provisioner</code> ou <code>csi-driver-nfs</code> (sans support Red Hat de base).",
          "NFS ne gère pas <code>fsGroup</code> : les droits dépendent de l'export (<code>root_squash</code>, UID/GID).",
          "<b>iSCSI / FC</b> : on ne monte pas les LUN à la main, on installe le <b>CSI du constructeur</b> (opérateur certifié dans OperatorHub si disponible).",
          "Pour le multipath et les paquets iSCSI sur RHCOS : config via <code>MachineConfig</code>, jamais en SSH."
        ] },
        { t: 'callout', kind: 'onprem', html: "Vérifie la <b>matrice de compatibilité</b> du constructeur (version CSI x version OCP) avant chaque montée de version OCP. Un CSI non certifié = pas de support Red Hat sur le volet stockage." },
        { t: 'callout', kind: 'trap', wide: true, html: "NFS « simple » : le pod en UID aléatoire n'a pas le droit d'écrire sur l'export. Piège classique, détaillé à la slide permissions. Et ne mets <b>jamais</b> etcd ni une base de données sensible à la latence sur NFS." }
      ]
    },
    {
      title: "StorageClass : les 4 champs qui comptent",
      blocks: [
        { t: 'code', lang: 'yaml', file: 'storageclass.yaml', code: "apiVersion: storage.k8s.io/v1\nkind: StorageClass\nmetadata:\n  name: fast-block\n  annotations:\n    storageclass.kubernetes.io/is-default-class: \"true\"\nprovisioner: csi.vsphere.vmware.com\nreclaimPolicy: Delete            # ou Retain\nallowVolumeExpansion: true\nvolumeBindingMode: WaitForFirstConsumer" },
        { t: 'table', head: ['Champ', 'Effet', 'Piège'], rows: [
          ['<code>is-default-class</code>', 'Utilisée par les PVC sans <code>storageClassName</code>', "Une seule par cluster : sinon comportement ambigu"],
          ['<code>volumeBindingMode</code>', '<code>WaitForFirstConsumer</code> : provisionne après placement du pod', "<code>Immediate</code> avec un backend à topologie : volume créé au mauvais endroit"],
          ['<code>allowVolumeExpansion</code>', 'Autorise l\'agrandissement', "Impossible de l'activer rétroactivement sur certains drivers : à vérifier"],
          ['<code>reclaimPolicy</code>', '<code>Delete</code> : PV et données supprimés avec le PVC', "<code>Retain</code> : le PV reste en <code>Released</code>, à nettoyer à la main"]
        ] }
      ]
    },
    {
      title: "Modes d'accès : RWO, RWX, RWOP",
      tag: 'piège n°1',
      blocks: [
        { t: 'table', head: ['Mode', 'Signification', 'Typiquement'], rows: [
          ['<b>RWO</b>', 'Lecture/écriture par <b>un seul nœud</b> (plusieurs pods du même nœud possibles)', 'Bloc : vSphere CSI, LVMS, RBD'],
          ['<b>ROX</b>', 'Lecture seule, plusieurs nœuds', 'Partages en lecture, snapshots'],
          ['<b>RWX</b>', 'Lecture/écriture par plusieurs nœuds', 'Fichier : CephFS, NFS, vSAN File'],
          ['<b>RWOP</b>', 'Lecture/écriture par <b>un seul pod</b> du cluster (CSI uniquement)', 'Garantie stricte de mono-writer']
        ] },
        { t: 'callout', kind: 'trap', html: "RWO ≠ « un seul pod » : c'est « un seul nœud ». Lors d'un rolling update, le nouveau pod atterrit sur un autre nœud, et tu obtiens <b>Multi-Attach error</b>. Solutions : stratégie <code>Recreate</code>, RWX, ou StatefulSet." },
        { t: 'callout', kind: 'cloud', html: "En cloud, les disques (EBS, Azure Disk, PD) sont RWO <b>et liés à une zone de disponibilité</b>. Le RWX passe par un service fichier : EFS (AWS), Azure Files, Filestore (GCP)." }
      ]
    },
    {
      title: "OpenShift Data Foundation : vue d'ensemble",
      blocks: [
        { t: 'text', html: "<p><b>ODF</b> = le stockage défini par logiciel de Red Hat, bâti sur <b>Ceph</b> (orchestré par <b>Rook</b>) et <b>NooBaa</b> (objet multi-cloud). Un seul opérateur, trois types de stockage.</p>" },
        { t: 'table', head: ['Besoin', 'Techno', 'StorageClass (internal)', 'Mode'], rows: [
          ['Bloc', 'Ceph RBD', '<code>ocs-storagecluster-ceph-rbd</code>', 'RWO (RWX en Block)'],
          ['Fichier partagé', 'CephFS', '<code>ocs-storagecluster-cephfs</code>', 'RWX'],
          ['Objet S3 (sur Ceph)', 'RGW', '<code>ocs-storagecluster-ceph-rgw</code> (selon plateforme)', 'ObjectBucketClaim'],
          ['Objet S3 (multi-cloud)', 'MCG / NooBaa', '<code>openshift-storage.noobaa.io</code>', 'ObjectBucketClaim']
        ] },
        { t: 'callout', kind: 'tip', html: "Le RWX en mode <code>volumeMode: Block</code> sur RBD est utilisé notamment pour la migration à chaud de VM (OpenShift Virtualization : VM et migration à chaud, module 13)." }
      ]
    },
    {
      title: "ODF : topologies et dimensionnement",
      layout: 'two',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '📦 Internal', items: ['Ceph déployé dans le cluster OCP', 'Disques locaux (via LSO) ou datastore', 'Nœuds workers ou nœuds dédiés', '3 réplicas, 3 nœuds minimum'] },
          right: { title: '🔌 External', items: ['Ceph hors cluster (Red Hat Ceph Storage)', 'OCP est consommateur', 'Équipe stockage séparée', 'Pas de charge Ceph sur les workers'] },
          verdict: "Stretch cluster : 2 zones de données + 1 arbiter, pour un RPO nul entre deux sites proches." },
        { t: 'bullets', frag: true, items: [
          "<b>Nœuds dédiés</b> : label <code>cluster.ocs.openshift.io/openshift-storage=\"\"</code> et taint <code>node.ocs.openshift.io/storage=true:NoSchedule</code>.",
          "Minimum <b>3 nœuds</b> avec disques, un par domaine de panne (hôte, rack ou zone).",
          "Réseau : <b>10 GbE minimum</b> recommandé ; réseaux public/cluster séparables via Multus.",
          "Stretch : latence inter-sites faible exigée (de l'ordre de 10 ms RTT, à vérifier dans le guide de planification)."
        ] },
        { t: 'callout', kind: 'onprem', html: "ODF est <b>coûteux</b> : CPU et RAM significatifs par nœud de stockage (ordre de grandeur : des dizaines de vCPU et centaines de Go de RAM sur l'ensemble du cluster Ceph), souscription dédiée, disques en SSD/NVMe. Consulte le guide de planification ODF de ta version pour les chiffres exacts." }
      ]
    },
    {
      title: "ODF : déployer",
      blocks: [
        { t: 'flow', nodes: [
          'Disques prêts (LSO ou datastore)',
          { label: 'Opérateur ODF', sub: 'namespace openshift-storage', hl: true },
          { label: 'StorageCluster', sub: 'CR ocs.openshift.io' },
          'Pods Ceph (mon, mgr, osd, mds)',
          { label: 'StorageClasses', sub: 'ocs-storagecluster-*', hl: true }
        ] },
        { t: 'code', lang: 'yaml', file: 'storagecluster.yaml', caption: 'Squelette indicatif : la console ODF le génère, préfère-la pour la 1re installation.', code: "apiVersion: ocs.openshift.io/v1\nkind: StorageCluster\nmetadata:\n  name: ocs-storagecluster\n  namespace: openshift-storage\nspec:\n  storageDeviceSets:\n  - name: ocs-deviceset\n    count: 1\n    replica: 3\n    portable: false\n    dataPVCTemplate:\n      spec:\n        accessModes: [ReadWriteOnce]\n        volumeMode: Block\n        storageClassName: localblock\n        resources:\n          requests:\n            storage: 1\n        # taille réelle : selon les PV locaux découverts" },
        { t: 'cmds', items: [
          ['oc get storagecluster -n openshift-storage', 'Phase attendue : <code>Ready</code>'],
          ['oc get pods -n openshift-storage', 'Pods osd, mon, mgr, mds, noobaa'],
          ['oc get cephcluster -n openshift-storage', 'Santé Ceph vue par Rook']
        ] }
      ]
    },
    {
      title: "Snapshots et clones",
      blocks: [
        { t: 'text', html: "<p>Les snapshots CSI passent par trois objets : <b>VolumeSnapshotClass</b> (driver + politique de suppression), <b>VolumeSnapshot</b> (la demande), <b>VolumeSnapshotContent</b> (le résultat). Le <b>restore</b> et le <b>clone</b> se font avec un PVC dont le <code>dataSource</code> pointe la source.</p>" },
        { t: 'code', lang: 'yaml', file: 'snapshot.yaml', code: "apiVersion: snapshot.storage.k8s.io/v1\nkind: VolumeSnapshot\nmetadata:\n  name: db-snap-1\nspec:\n  volumeSnapshotClassName: csi-vsphere-vsc   # nom de ta VolumeSnapshotClass\n  source:\n    persistentVolumeClaimName: db-data\n---\napiVersion: v1\nkind: PersistentVolumeClaim\nmetadata:\n  name: db-data-restored\nspec:\n  accessModes: [ReadWriteOnce]\n  resources:\n    requests:\n      storage: 10Gi\n  dataSource:\n    name: db-snap-1\n    kind: VolumeSnapshot\n    apiGroup: snapshot.storage.k8s.io" },
        { t: 'callout', kind: 'trap', html: "Un snapshot CSI vit <b>sur le même backend</b> que le volume : si la baie ou le pool est perdu, snapshot et données partent ensemble. Ce n'est <b>pas</b> une sauvegarde. Sauvegarde et migration : module 11." },
        { t: 'callout', kind: 'tip', html: "Clone : même YAML de PVC avec <code>dataSource: {kind: PersistentVolumeClaim, name: …}</code>, dans le <b>même namespace</b> et la même StorageClass." }
      ]
    },
    {
      title: "Expansion de volumes",
      layout: 'two',
      blocks: [
        { t: 'flow', nodes: [
          'StorageClass : allowVolumeExpansion',
          { label: 'Éditer le PVC', sub: 'spec.resources.requests.storage', hl: true },
          'Resize du volume (controller)',
          { label: 'Resize du filesystem', sub: 'node plugin' }
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc patch pvc db-data -p '{\"spec\":{\"resources\":{\"requests\":{\"storage\":\"50Gi\"}}}}'\n$ oc get pvc db-data -w\n$ oc describe pvc db-data\n# Conditions : Resizing / FileSystemResizePending" },
        { t: 'bullets', items: [
          "On peut <b>agrandir</b>, jamais réduire.",
          "L'expansion à chaud est supportée par la plupart des drivers CSI (à vérifier pour le tien).",
          "Si la StorageClass ne l'autorise pas, tu peux éditer la SC (le champ est modifiable), puis recommencer."
        ] },
        { t: 'callout', kind: 'warn', html: "Avec LSO (PV statiques), l'expansion n'existe pas : le PV a la taille du disque." }
      ]
    },
    {
      title: "Stockage éphémère et ephemeral-storage",
      blocks: [
        { t: 'text', html: "<p>Les couches d'image, les logs de conteneur, les <code>emptyDir</code> et la couche inscriptible consomment le disque du nœud (<code>/var</code> sur RHCOS). K8s sait le <b>demander et le limiter</b>.</p>" },
        { t: 'code', lang: 'yaml', file: 'pod-ephemeral.yaml', code: "spec:\n  containers:\n  - name: app\n    image: registry.example.com/app:1.0\n    resources:\n      requests:\n        ephemeral-storage: 1Gi\n      limits:\n        ephemeral-storage: 2Gi\n    volumeMounts:\n    - name: scratch\n      mountPath: /scratch\n  volumes:\n  - name: scratch\n    emptyDir:\n      sizeLimit: 1Gi" },
        { t: 'bullets', frag: true, items: [
          "Dépasser la limite : le pod est <b>évincé (Evicted)</b>.",
          "Un <code>ResourceQuota</code> peut plafonner <code>requests.ephemeral-storage</code> par projet.",
          "Les <i>generic ephemeral volumes</i> offrent un volume CSI jetable lié au cycle de vie du pod."
        ] },
        { t: 'callout', kind: 'onprem', html: "Dimensionne le disque système des nœuds en conséquence (images + logs + emptyDir). Un disque de 120 Go saturé provoque des <code>DiskPressure</code> et des évictions en cascade." }
      ]
    },
    {
      title: "etcd et les disques : la latence avant tout",
      tag: 'critique',
      blocks: [
        { t: 'text', html: "<p>etcd écrit son journal (WAL) avec un <code>fdatasync</code> à chaque commit : <b>la latence d'écriture synchrone du disque fait la stabilité du cluster</b>. Un disque lent = élections de leader, API lente, opérateurs Degraded.</p>" },
        { t: 'bullets', items: [
          "Cible : p99 de <code>etcd_disk_wal_fsync_duration_seconds</code> <b>inférieur à 10 ms</b>.",
          "Disque <b>SSD ou NVMe dédié</b> aux masters, pas de stockage réseau partagé et saturé.",
          "À surveiller aussi : <code>etcd_disk_backend_commit_duration_seconds</code> et les alertes etcd du monitoring (module 05)."
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', caption: 'Test fio de référence de la doc Red Hat, à lancer sur un master avant mise en prod.', code: "$ oc debug node/master-0\nsh-5.1# chroot /host\n# mkdir -p /var/lib/etcd-test && cd /var/lib/etcd-test\n# fio --rw=write --ioengine=sync --fdatasync=1 --directory=. --size=22m --bs=2300 --name=etcd-test\n# Regarder fsync/fdatasync : percentile 99 < 10 ms" },
        { t: 'callout', kind: 'onprem', html: "Sur vSphere, place les VM masters sur un datastore SSD/NVMe à faible latence, avec <b>réservation de ressources</b>. Un datastore partagé avec des VM bruyantes est la cause n°1 des instabilités etcd." },
        { t: 'callout', kind: 'cloud', html: "En cloud, on choisit des volumes à IOPS garanties pour les masters. En managé (ROSA/ARO), etcd n'est plus ton problème." }
      ]
    },
    {
      title: "Registre interne et son stockage",
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          "Configuré par l'objet <code>configs.imageregistry.operator.openshift.io/cluster</code>.",
          "<b>Sur bare metal et plateforme « none », il est désactivé</b> (<code>managementState: Removed</code>) tant que tu ne fournis pas de stockage.",
          "Stockage <b>PVC RWX</b> (CephFS, NFS) pour plusieurs réplicas, ou <b>objet S3</b> (NooBaa/RGW, MinIO, baie S3).",
          "PVC RWO : un seul réplica et <code>rolloutStrategy: Recreate</code>.",
          "<code>emptyDir</code> : <b>uniquement lab</b>, les images disparaissent au redémarrage du pod."
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "# Lab : emptyDir (non persistant)\n$ oc patch configs.imageregistry.operator.openshift.io cluster \\\n  --type merge \\\n  -p '{\"spec\":{\"managementState\":\"Managed\",\"storage\":{\"emptyDir\":{}}}}'\n\n# Production : PVC (le claim est créé s'il est vide)\n$ oc edit configs.imageregistry.operator.openshift.io cluster\n#   spec.storage.pvc.claim: \"\"\n$ oc get pvc -n openshift-image-registry" },
        { t: 'callout', kind: 'cloud', wide: true, html: "En cloud, le registre est configuré automatiquement sur le stockage objet du fournisseur (S3, Azure Blob, GCS). Aucune action requise." }
      ]
    },
    {
      title: "Stockage du monitoring et du logging",
      blocks: [
        { t: 'text', html: "<p>Par défaut, <b>Prometheus et Alertmanager n'ont pas de stockage persistant</b> sur un cluster fraîchement installé : au redémarrage du pod, les métriques sont perdues. Il faut le demander dans le ConfigMap de monitoring (configuration complète : module 05).</p>" },
        { t: 'code', lang: 'yaml', file: 'cluster-monitoring-config.yaml', code: "apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: cluster-monitoring-config\n  namespace: openshift-monitoring\ndata:\n  config.yaml: |\n    prometheusK8s:\n      retention: 15d\n      volumeClaimTemplate:\n        spec:\n          storageClassName: fast-block\n          resources:\n            requests:\n              storage: 100Gi\n    alertmanagerMain:\n      volumeClaimTemplate:\n        spec:\n          storageClassName: fast-block\n          resources:\n            requests:\n              storage: 2Gi" },
        { t: 'callout', kind: 'ocp', html: "<b>Logging</b> : le stockage des logs est désormais de l'<b>objet S3</b> via <b>LokiStack</b> (Loki Operator). Prévois un bucket (ODF/NooBaa, MinIO, baie S3) en plus d'un PVC pour les composants Loki. Elasticsearch est déprécié pour cet usage : à vérifier dans les release notes de ta version." },
        { t: 'callout', kind: 'tip', html: "Mets le monitoring sur du <b>bloc rapide</b> (RWO). Les TSDB Prometheus ne supportent pas bien NFS." }
      ]
    },
    {
      title: "Permissions : SCC, UID aléatoire et fsGroup",
      tag: 'piège n°2',
      blocks: [
        { t: 'text', html: "<p>Sous <code>restricted-v2</code>, ton conteneur reçoit un <b>UID aléatoire</b> pris dans la plage du namespace, et un <b>fsGroup</b> issu de la plage de groupes. Le volume est monté avec ce GID : <code>chown</code>/<code>chmod</code> de ton Dockerfile ne servent à rien.</p>" },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc get ns demo -o yaml | grep sa.scc\n#   openshift.io/sa.scc.mcs: s0:c26,c15\n#   openshift.io/sa.scc.supplemental-groups: 1000680000/10000\n#   openshift.io/sa.scc.uid-range: 1000680000/10000\n\n$ oc exec pod/db-0 -- id\nuid=1000680000(1000680000) gid=0(root) groups=0(root),1000680000" },
        { t: 'bullets', frag: true, items: [
          "<b>Bloc/CSI avec fsGroup</b> : le kubelet applique le GID au volume. <code>fsGroupChangePolicy: OnRootMismatch</code> évite un parcours récursif lent sur les gros volumes.",
          "<b>NFS</b> : <code>fsGroup</code> n'est pas appliqué. Les droits se règlent côté export (<code>supplementalGroups</code>, GID de l'export, <code>anyuid</code> en dernier recours).",
          "<b>SELinux</b> : le relabeling des volumes peut être long sur de gros volumes ; <code>Permission denied</code> alors que les droits unix sont bons = penser au contexte SELinux."
        ] },
        { t: 'callout', kind: 'trap', html: "Réflexe à éviter : <code>anyuid</code> « pour que ça marche ». Commence par vérifier <code>id</code> dans le pod, le <code>fsGroup</code> et les droits du point de montage. SCC en détail : module 09." }
      ]
    },
    {
      title: "Dépannage : les 3 pannes classiques",
      blocks: [
        { t: 'table', head: ['Symptôme', 'Causes fréquentes', 'Où regarder'], rows: [
          ['<b>PVC Pending</b>', "Pas de StorageClass par défaut ; <code>WaitForFirstConsumer</code> sans pod ; backend plein ; quota ; topologie sans nœud éligible ; CSI en panne", "<code>oc describe pvc</code> (Events), pods <code>openshift-cluster-csi-drivers</code>"],
          ['<b>Multi-Attach error</b>', "Volume RWO encore attaché à l'ancien nœud (rolling update, nœud <i>NotReady</i>)", "<code>oc describe pod</code>, <code>oc get volumeattachment</code>"],
          ['<b>PVC / PV en Terminating</b>', "Un pod utilise encore le PVC (finalizer <code>kubernetes.io/pvc-protection</code>)", "<code>oc get pods</code> qui montent le PVC, <code>oc get pvc -o yaml</code>"]
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc describe pvc db-data\n$ oc get events --sort-by=.lastTimestamp\n$ oc get volumeattachment\n$ oc logs -n openshift-cluster-csi-drivers <pod-controller> -c csi-driver" },
        { t: 'callout', kind: 'warn', html: "Retirer un finalizer à la main (<code>oc patch … finalizers</code>) est un <b>dernier recours</b> : tu risques de laisser un volume orphelin sur le backend ou, pire, de le détacher d'un nœud qui l'utilise encore." }
      ]
    },
    {
      title: "Quiz",
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: "Tu fais un rolling update d'un Deployment avec un PVC RWO. Le nouveau pod reste en ContainerCreating avec « Multi-Attach error ». Pourquoi ?", options: [
          "Le PVC est trop petit",
          "Le volume est encore attaché au nœud de l'ancien pod, et le nouveau pod est planifié sur un autre nœud",
          "La StorageClass n'est pas par défaut",
          "SELinux bloque le montage"
        ], answer: 1, explain: "RWO signifie un seul <b>nœud</b>. Utilise la stratégie <code>Recreate</code>, un StatefulSet, ou un volume RWX." },
        { t: 'quiz', q: "Quel est le rôle de <code>volumeBindingMode: WaitForFirstConsumer</code> ?", options: [
          "Attendre que l'utilisateur confirme la création du PV",
          "Retarder le provisionnement jusqu'à ce qu'un pod soit planifié, pour respecter sa topologie",
          "Empêcher plusieurs pods d'utiliser le volume",
          "Chiffrer le volume à la première écriture"
        ], answer: 1, explain: "Le volume est créé <b>après</b> le choix du nœud : indispensable avec les backends locaux (LVMS, LSO) ou zonaux. Un PVC reste donc <i>Pending</i> tant qu'aucun pod ne l'utilise : c'est normal." },
        { t: 'quiz', q: "Ton pod écrit sur un volume NFS et obtient « Permission denied ». Que vérifies-tu en premier ?", options: [
          "Que <code>fsGroup</code> soit défini : le kubelet fera le chown de l'export",
          "Les droits et le mapping UID/GID de l'export NFS, car fsGroup n'est pas appliqué sur NFS",
          "Que le SCC <code>privileged</code> soit attribué",
          "Que le PVC soit en RWO"
        ], answer: 1, explain: "Avec NFS, le <code>fsGroup</code> n'est pas appliqué par le kubelet. Les droits se règlent côté serveur NFS (squash, GID), pas avec un SCC plus permissif." }
      ]
    },
    {
      title: "Lab : PVC, snapshot, restore, expansion, permissions",
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'Cycle de vie complet d\'un volume', goal: "Cluster avec une StorageClass CSI qui supporte snapshot et expansion (LVMS, ODF ou vSphere CSI). Remplace &lt;SC&gt; par son nom.", steps: [
          "Prérequis : environnement E1 (SNO avec LVMS, ou cluster avec une StorageClass CSI), voir module 00",
          "Liste l'existant : <code>oc get sc</code>, <code>oc get csidriver</code>, <code>oc get volumesnapshotclass</code>. Laquelle est par défaut ?",
          "Crée un projet : <code>oc new-project lab-stockage</code>",
          "Crée un PVC 1Gi RWO sur <code>&lt;SC&gt;</code> : en <i>Pending</i> ? Lis <code>oc describe pvc</code> et explique pourquoi (WaitForFirstConsumer).",
          "Lance un pod qui monte le PVC et écrit un fichier : <code>oc run writer --image=registry.access.redhat.com/ubi9/ubi --command -- sleep infinity</code>, puis ajoute le volume (YAML), et vérifie <code>id</code> et <code>ls -ld</code> du point de montage.",
          "Crée un <code>VolumeSnapshot</code> du PVC, attends <code>readyToUse: true</code>, puis restaure-le dans un nouveau PVC (<code>dataSource</code>).",
          "Agrandis le PVC à 2Gi avec <code>oc patch pvc</code> et vérifie la taille avec <code>df -h</code> dans le pod.",
          "(bonus) Provoque une erreur : supprime le PVC pendant que le pod tourne. Observe <i>Terminating</i> et le finalizer, puis supprime le pod.",
          "Nettoie : <code>oc delete project lab-stockage</code>. Que devient le PV ? (regarde la <code>reclaimPolicy</code>)"
        ] }
      ]
    }
  ],
  takeaways: [
    "Sur OCP on-prem, le backend de stockage est un choix d'architecture à faire avant l'installation : vSphere CSI, LVMS, LSO, baie via CSI constructeur ou ODF.",
    "WaitForFirstConsumer, allowVolumeExpansion et reclaimPolicy se décident dans la StorageClass ; RWO veut dire un nœud, pas un pod.",
    "ODF apporte bloc, fichier et objet mais coûte cher en CPU, RAM, disques et réseau ; compte 3 nœuds minimum.",
    "etcd exige un disque rapide (fsync p99 sous 10 ms) ; registre, monitoring et logging ont chacun leur stockage à configurer.",
    "UID aléatoire + fsGroup expliquent la plupart des « Permission denied » sur volumes ; NFS demande de régler les droits côté serveur.",
    "Un snapshot n'est pas une sauvegarde : voir module 11."
  ]
});
