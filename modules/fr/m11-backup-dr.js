COURSE.add({
  id: 'm11', lang: 'fr', num: 11, emoji: '🗄️',
  title: 'Backup & reprise d\'activité',
  tagline: 'etcd, applications, volumes : ce qu\'on sauvegarde, comment on restaure, et pourquoi une sauvegarde jamais testée n\'existe pas.',
  duration: '≈ 45 min + lab 20 min',
  objectives: [
    'Distinguer ce que contient etcd de ce qu\'il ne contient pas (volumes, images, données applicatives)',
    'Réaliser, vérifier et exporter une sauvegarde etcd (<code>cluster-backup.sh</code>) et en connaître les règles',
    'Choisir la bonne procédure de reprise : quorum perdu, état antérieur, membre défaillant, certificats expirés',
    'Mettre en place OADP pour sauvegarder des applications et leurs volumes',
    'Construire une stratégie DR (RPO, RTO, GitOps) et la tester'
  ],
  slides: [
    {
      title: 'Sauvegarde et DR : à qui la responsabilité ?',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Sauvegarder', sub: 'etcd + applications', hl: true },
          { label: 'Sortir du cluster', sub: 'stockage séparé' },
          { label: 'Restaurer', sub: 'procédure documentée', hl: true },
          { label: 'Tester', sub: 'exercice régulier' }
        ], caption: 'Une sauvegarde qui n\'a jamais été <b>restaurée</b> n\'est qu\'une hypothèse.' },
        { t: 'bullets', frag: true, items: [
          'Frontières : architecture d\'etcd → module 02 ; activation du chiffrement etcd → module 04 ; snapshots CSI et stockage → module 08 ; mises à jour → module 12 ; GitOps → module 10.',
          'Deux niveaux : le <b>cluster</b> (etcd) et les <b>applications</b> (ressources + volumes, avec OADP).',
          'Version de référence : <b>4.20 EUS</b>.'
        ] },
        { t: 'callout', kind: 'cloud', html: "En ROSA/ARO/OSD, le fournisseur s'occupe d'etcd et du control plane. <b>On-prem, c'est toi</b> : sauvegarde, stockage hors cluster, restauration et exercices sont ta responsabilité." }
      ]
    },
    {
      title: 'Ce que contient etcd, ce qu\'il ne contient pas',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '✅ Dans etcd (donc dans la sauvegarde etcd)', items: ['Tous les <b>objets de l\'API</b> : Deployments, Services, Secrets, ConfigMaps, RBAC, CR…', 'L\'état des opérateurs et la configuration du cluster', 'Les références aux volumes (PV/PVC) comme <b>objets</b>'] },
          right: { title: '❌ Pas dans etcd', items: ['Le <b>contenu des volumes persistants</b> : « contents of persistent volumes (PVs) are never part of the etcd snapshot »', 'Les images du registre interne', 'Les données des applications (bases de données…)', 'Les journaux et les métriques'] },
          verdict: 'La sauvegarde etcd restaure le <b>cluster</b> ; elle ne protège <b>pas les données</b> de tes applications.' },
        { t: 'callout', kind: 'trap', html: "Restaurer etcd sur un cluster dont les volumes ont changé crée des incohérences (PV référencés mais absents, ou l'inverse). La doc de restauration le signale : prévois de réconcilier les volumes à la main après coup." }
      ]
    },
    {
      title: 'Réaliser une sauvegarde etcd',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: "# Accès à UN nœud du control plane\n$ oc debug --as-root node/master-0\nsh-5.1# chroot /host\n\n# (si un proxy est configuré : exporter HTTP_PROXY, HTTPS_PROXY, NO_PROXY)\n\nsh-5.1# /usr/local/bin/cluster-backup.sh /home/core/assets/backup" },
        { t: 'bullets', items: [
          'Le script <code>cluster-backup.sh</code> est fourni sur les nœuds du control plane ; il écrit dans le répertoire que tu lui passes.',
          'Il se lance sur <b>un seul</b> nœud du control plane (module 02 pour l\'architecture).',
          'Impact sur le cluster en service : à valider sur ton environnement (non précisé dans les pages lues).'
        ] },
        { t: 'callout', kind: 'warn', wide: true, html: "Ne sauvegarde <b>pas chaque nœud du control plane</b> : un seul snapshot suffit (doc). Attends aussi <b>24 heures après l'installation</b> avant la première sauvegarde (rotation initiale des certificats)." }
      ]
    },
    {
      title: 'Le contenu de l\'archive',
      blocks: [
        { t: 'table', head: ['Fichier', 'Contenu'], rows: [
          ['<code>snapshot_&lt;horodatage&gt;.db</code>', 'Le <b>snapshot etcd</b> lui-même'],
          ['<code>static_kuberesources_&lt;horodatage&gt;.tar.gz</code>', 'Les ressources des <b>static pods</b> et, si le chiffrement etcd est activé, les <b>clés de chiffrement</b>']
        ] },
        { t: 'bullets', frag: true, items: [
          'Les <b>deux fichiers</b> sont nécessaires à une restauration : le fichier des clés « est requis pour restaurer depuis le snapshot etcd ».',
          'Avec le <b>chiffrement etcd</b> (module 04) : le snapshot est chiffré, <b>les clés sont dans l\'archive <code>static_kuberesources</code></b>. Protège-la comme un secret.',
          'Ne sauvegarde pas etcd avant la fin du chiffrement initial (doc) et refais une sauvegarde après l\'activation.',
          'Restauration possible avec une sauvegarde de la <b>même version z-stream</b> du cluster.'
        ] },
        { t: 'callout', kind: 'tip', html: "Conserve avec chaque sauvegarde la <b>version du cluster</b> (<code>oc get clusterversion</code>) : sans elle, tu ne sais pas si l'archive est utilisable." }
      ]
    },
    {
      title: 'Stocker et planifier les sauvegardes',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'bash', file: 'bastion (exemple)', code: "# Sortir l'archive du nœud, hors du cluster\n$ DEST=/srv/backups/etcd/$(date +%F)\n$ mkdir -p $DEST\n$ scp core@master-0:/home/core/assets/backup/* $DEST/\n$ oc get clusterversion version -o jsonpath='{.status.desired.version}{\"\\n\"}' > $DEST/VERSION" },
        { t: 'bullets', items: [
          '<b>Hors du cluster</b> : la doc demande de stocker la sauvegarde en dehors de l\'environnement (un cluster perdu ne doit pas emporter sa sauvegarde).',
          '<b>Rotation</b> : garde plusieurs générations (par exemple quotidiennes sur 7 jours, hebdomadaires plus longtemps) ; c\'est une recommandation de pratique, à adapter à ton RPO.',
          '<b>Planification</b> : un job sur un bastion ou un orchestrateur d\'entreprise.'
        ] },
        { t: 'callout', kind: 'warn', wide: true, html: "La doc 4.20 décrit une <b>automatisation native</b> (CR <code>EtcdBackup</code> et <code>Backup</code>) mais en <b>Technology Preview</b>, avec le feature set <code>TechPreviewNoUpgrade</code> : <b>irréversible et bloque les mises à jour</b> (module 04). Pas pour la production." }
      ]
    },
    {
      title: 'Quelle procédure de reprise ?',
      blocks: [
        { t: 'table', head: ['Situation', 'Procédure', 'Sauvegarde nécessaire ?'], rows: [
          ['<b>Quorum perdu</b>, API en lecture seule', '<code>quorum-restore.sh</code> sur un hôte de reprise', '<b>Non</b> : on repart de l\'état local d\'un membre'],
          ['Erreur grave, retour à un <b>état antérieur</b>', 'Restauration depuis une sauvegarde (<code>cluster-restore.sh</code>)', '<b>Oui</b> : les deux fichiers, même z-stream'],
          ['<b>Un membre etcd</b> défaillant', 'Remplacement du membre malsain', '<b>Oui, avant</b> : prérequis de la doc (« You have taken an etcd backup ») pour pouvoir restaurer en cas de souci'],
          ['<b>Certificats</b> du control plane expirés', 'Approbation des CSR <code>node-bootstrapper</code> (et <code>kubelet-serving</code> en UPI)', '<b>Non</b> (prérequis : <code>cluster-admin</code> et <code>oc</code>)']
        ] },
        { t: 'callout', kind: 'warn', html: "Toute reprise suppose <b>au moins un nœud de control plane sain</b>. La restauration à un état antérieur est un <b>dernier recours</b> : tu choisis la procédure la <b>moins destructrice</b> qui résout ton problème." },
        { t: 'callout', kind: 'trap', html: "<b>Règle de prudence</b> : <b>prends une sauvegarde etcd avant toute intervention sur etcd</b> quand c'est possible, même si la doc ne l'exige pas pour ta procédure : c'est ton filet de sécurité si l'opération tourne mal." },
        { t: 'callout', kind: 'tip', html: "Avant tout geste : <code>oc get co</code>, <code>oc get nodes</code> et l'état des pods <code>openshift-etcd</code> disent <b>dans quelle situation</b> tu es (module 12 pour le diagnostic)." }
      ]
    },
    {
      title: 'Perte du quorum : quorum-restore.sh',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          'Cas : cluster à haute disponibilité dont le <b>quorum etcd est perdu</b> ; l\'API devient <b>en lecture seule</b>.',
          '<code>quorum-restore.sh</code> recrée un cluster etcd à <b>un seul membre</b> à partir des données locales de l\'hôte de reprise et marque les autres membres comme invalides.',
          'Les nœuds restés en ligne <b>rejoignent automatiquement</b> le nouveau cluster etcd.',
          'Les nœuds hors ligne : <b>supprimer et recréer</b> les Machines (Machine API ou ton infrastructure), puis attendre la synchronisation.'
        ] },
        { t: 'code', lang: 'bash', file: 'hôte de reprise', code: "$ sudo -E /usr/local/bin/quorum-restore.sh" },
        { t: 'callout', kind: 'trap', wide: true, html: "« Il peut y avoir <b>perte de données</b> si l'hôte qui lance la restauration n'a pas toutes les données répliquées. » Choisis l'hôte avec les données <b>les plus récentes</b> et n'utilise pas cette procédure pour <b>réduire</b> le nombre de nœuds hors du cadre de la reprise." }
      ]
    },
    {
      title: 'Restaurer à un état antérieur : prérequis et risques',
      blocks: [
        { t: 'bullets', frag: true, items: [
          '<b>Dernier recours</b> : la doc parle d\'une action « destructive et déstabilisante » sur un cluster qui tourne.',
          '<b>Accès</b> : <code>cluster-admin</code> avec kubeconfig à certificat, et <b>SSH vers tous les nœuds du control plane</b> ; ceux-ci doivent être accessibles ou démarrables.',
          '<b>Sauvegarde</b> : un répertoire contenant <b>les deux fichiers</b> (<code>snapshot_*.db</code> et <code>static_kuberesources_*.tar.gz</code>) pris sur la <b>même version z-stream</b> que le cluster (exemple de la doc : une sauvegarde 4.20.2 pour un cluster 4.20.2).',
          '<b>Effets</b> : agitation des opérateurs si le contenu d\'etcd diffère des fichiers sur disque, charges supprimées si elles n\'existent pas dans le snapshot, <b>volumes à réconcilier</b> à la main.'
        ] },
        { t: 'callout', kind: 'warn', html: "Le <b>SNO</b> a sa propre procédure (slide suivante). Pour un cluster <b>compact</b> : procédure multi-nœuds ; contraintes éventuelles à relire dans la doc de ta version. Exerce-toi toujours sur un <b>cluster jetable</b> d'abord." }
      ]
    },
    {
      title: 'Restaurer à un état antérieur : les étapes',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'SSH', sub: 'choisir l\'hôte de reprise ; SSH vers tous les nœuds' },
          { label: 'Désactiver etcd', sub: 'disable-etcd.sh sur « each control plane node » (hôte de reprise inclus ? à confirmer)' },
          { label: 'Copier la sauvegarde', sub: 'vers /home/core de l\'hôte de reprise' },
          { label: 'cluster-restore.sh', sub: 'sur l\'hôte de reprise seulement', hl: true },
          { label: 'Quitter SSH', sub: 'exit, avant de reprendre avec oc' },
          { label: 'Quorum guard', sub: 'désactiver' },
          { label: 'Attendre', sub: 'oc adm wait-for-stable-cluster (≈ 15 min)' },
          { label: 'Quorum guard', sub: 'réactiver', hl: true }
        ] },
        { t: 'code', lang: 'bash', file: 'commandes citées par la doc 4.20', code: "# 1. Par SSH sur chaque nœud du control plane (doc : « each control plane node » ;\n#    hôte de reprise inclus ? à confirmer sur la page OCP 4.20)\n$ sudo -E /usr/local/bin/disable-etcd.sh\n\n# 2. Copier le répertoire de sauvegarde (snapshot + static_kuberesources) dans /home/core\n#    de l'hôte de reprise (méthode au choix : la doc ne la précise pas)\n\n# 3. Par SSH sur l'hôte de reprise UNIQUEMENT\n$ sudo -E /usr/local/bin/cluster-restore.sh /home/core/<backup-directory>\n\n# 4. Quitter la session SSH\n$ exit\n\n# 5. Quand l'API répond : désactiver le garde-fou de quorum, puis attendre\n$ oc patch etcd/cluster --type=merge -p '{\"spec\": {\"unsupportedConfigOverrides\": {\"useUnsupportedUnsafeNonHANonProductionUnstableEtcd\": true}}}'\n$ oc adm wait-for-stable-cluster\n\n# 6. Réactiver le garde-fou\n$ oc patch etcd/cluster --type=merge -p '{\"spec\": {\"unsupportedConfigOverrides\": null}}'" },
        { t: 'callout', kind: 'warn', html: "L'ordre ci-dessus est celui de la procédure officielle 4.20 (SSH vers tous les nœuds, <code>disable-etcd.sh</code> sur « <b>each control plane node</b> », copie de la sauvegarde, <code>cluster-restore.sh</code> sur l'<b>hôte de reprise seulement</b>, puis <b>sortie de la session SSH</b> avant les <code>oc patch</code> du quorum guard). La doc 4.20 <b>ne demande pas d'arrêt manuel des static pods</b>. <b>Réserve</b> : la doc écrit, à l'étape 2, « Establish SSH connectivity to each of the control plane nodes, <b>including the recovery host</b> » puis, à l'étape 3, « connect to each control plane node to disable etcd » sans répéter « including the recovery host » : l'<b>inclusion de l'hôte de reprise pour <code>disable-etcd.sh</code> n'est pas énoncée explicitement</b> (lecture probable : oui) : <b>à confirmer sur la page OCP 4.20</b> en relisant la procédure officielle. <b>Ne restaure jamais depuis ces seules lignes</b> : relis la procédure complète avant et pendant l'opération." }
      ]
    },
    {
      title: 'Restaurer sur un SNO',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'bash', file: 'SNO (doc 4.20)', code: `# 1. Copier le répertoire de sauvegarde dans /home/core du nœud
$ cp ETCD_BACKUP_DIRECTORY /home/core

# 2. Restaurer
$ sudo -E /usr/local/bin/cluster-restore.sh /home/core/ETCD_BACKUP_DIRECTORY

# 3. Quitter la session SSH puis suivre le retour du cluster
$ oc adm wait-for-stable-cluster` },
        { t: 'bullets', items: [
          'La doc 4.20 décrit une section distincte « Restoring to a previous cluster state for a single node ».',
          'Différences avec le multi-nœuds : <b>pas de <code>disable-etcd.sh</code></b> et <b>pas de manipulation du quorum guard</b> ; une seule commande de restauration sur le nœud ; retour sous environ 15 minutes.',
          'Prérequis identiques : kubeconfig à certificat, accès SSH, répertoire avec les <b>deux fichiers</b> issu de la même version z-stream.'
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: "Sur un SNO, le cluster <b>est</b> l'unique nœud : la restauration l'interrompt complètement. Fenêtre de maintenance, sauvegarde <b>stockée hors du nœud</b>, et <b>aucun test de restauration sur ton seul SNO de travail</b>. Page lue via le miroir OKD 4.20 : à relire dans la doc OCP 4.20 avant usage." }
      ]
    },
    {
      title: 'OADP : sauvegarder les applications',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          '<b>OADP</b> (OpenShift API for Data Protection) protège <b>applications, ressources du cluster qui leur sont liées, volumes persistants et images internes</b>.',
          'API : <code>Backup</code>, <code>Restore</code>, <code>Schedule</code>, <code>BackupStorageLocation</code>, <code>VolumeSnapshotLocation</code>.',
          '<b>Limite essentielle</b> : « OADP ne constitue pas une solution de reprise pour <code>etcd</code> ni pour les Operators OpenShift ». Les deux sauvegardes sont <b>complémentaires</b>.',
          'Compatibilité (matrice de la doc 4.20) : <b>OADP 1.5</b> pour OCP 4.19, 4.20 et 4.21 (GA le 17 juin 2025, support complet jusqu\'à la sortie de la 1.6) ; <b>OADP 1.4</b> pour 4.14 à 4.18. <b>OADP 1.6</b> vise <b>OCP 4.22 et suivants</b>, pas la 4.20 (matrice de la doc 4.22). Le cours retient <b>OADP 1.5</b> pour la 4.20.'
        ] },
        { t: 'callout', kind: 'onprem', wide: true, html: "Il faut un <b>stockage objet S3</b> (ODF/NooBaa, MinIO, baie S3) <b>hors du cluster protégé</b> pour y déposer les sauvegardes (module 08)." },
        { t: 'callout', kind: 'ocp', wide: true, html: "Installation par OLM (module 04) dans le namespace <code>openshift-adp</code> (OperatorGroup limité à ce namespace, canal <code>stable</code>, paquet <code>oadp-operator</code> d'après la doc OCP 4.15) : <b>nom du paquet et canal en 4.20</b> à vérifier dans « Installing the OADP Operator »." }
      ]
    },
    {
      title: 'OADP : configurer le stockage de sauvegarde',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'dpa.yaml (OADP 1.5, exemple S3 compatible)', code: `apiVersion: oadp.openshift.io/v1alpha1
kind: DataProtectionApplication
metadata:
  name: dpa-lab
  namespace: openshift-adp
spec:
  configuration:
    velero:
      defaultPlugins:
      - openshift
      - aws
      - csi
    nodeAgent:
      enable: true
      uploaderType: kopia
  backupLocations:
  - velero:
      provider: aws
      default: true
      credential:
        name: cloud-credentials
        key: cloud
      objectStorage:
        bucket: oadp-backups
        prefix: cluster-a
      config:
        region: minio
        s3Url: https://minio.example.com:9000
        s3ForcePathStyle: "true"` },
        { t: 'bullets', items: [
          'Les <b>identifiants</b> du bucket vont dans un Secret (ici <code>cloud-credentials</code>) du namespace <code>openshift-adp</code>.',
          '<code>csi</code> active les snapshots CSI ; le <b>nodeAgent</b> avec <code>kopia</code> sert à la copie de données (slide suivante).',
          'Vérifie l\'état : <code>oc get backupstoragelocation -n openshift-adp</code> (phase <code>Available</code>).'
        ] },
        { t: 'callout', kind: 'warn', html: "Cet exemple suit la structure des docs OADP récentes (apiVersion, plugins, <code>nodeAgent</code>) ; les <b>champs exacts de ta version d'OADP</b> sont à vérifier dans la doc (<code>oc explain dataprotectionapplication.spec</code>)." }
      ]
    },
    {
      title: 'OADP : Backup, Restore, Schedule',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'backup-restore.yaml', code: `apiVersion: velero.io/v1
kind: Backup
metadata:
  name: app-a-daily
  namespace: openshift-adp
spec:
  includedNamespaces:
  - app-a
  snapshotMoveData: true
  ttl: 720h0m0s
---
apiVersion: velero.io/v1
kind: Restore
metadata:
  name: app-a-restore
  namespace: openshift-adp
spec:
  backupName: app-a-daily` },
        { t: 'bullets', items: [
          '<code>includedNamespaces</code> : ce que tu sauvegardes ; des exclusions de ressources sont possibles.',
          '<b>Schedule</b> : même contenu qu\'un Backup avec une planification (cron) : c\'est ce qui rend OADP <b>automatique</b>.',
          'Un <b>Restore</b> peut aussi viser <b>un autre cluster</b> qui pointe sur le même bucket (reprise après sinistre : à vérifier pour ta version) ou un autre namespace (<code>namespaceMapping</code>).'
        ] },
        { t: 'callout', kind: 'tip', wide: true, html: "Restaure d'abord dans un <b>namespace de test</b> pour valider le contenu (ressources, volumes, secrets) avant de t'en servir en situation réelle." }
      ]
    },
    {
      title: 'Volumes : snapshot, copie de données, fs-backup',
      blocks: [
        { t: 'table', head: ['Méthode', 'Principe', 'À savoir'], rows: [
          ['<b>Snapshot CSI</b>', 'Snapshot du volume par le driver (rapide)', 'Reste <b>sur le même backend de stockage</b> : si la baie est perdue, le snapshot aussi (module 08)'],
          ['<b>Copie de données</b> (<code>snapshotMoveData: true</code>)', 'Déplace le snapshot CSI vers le <b>stockage objet</b>', 'Vraie sauvegarde hors baie ; plus lent, utilise le <code>nodeAgent</code> (kopia)'],
          ['<b>Sauvegarde du système de fichiers</b> (<code>defaultVolumesToFsBackup</code>)', 'Copie fichier par fichier depuis le pod', 'Pour les volumes sans CSI snapshot ; pas de cohérence applicative garantie']
        ] },
        { t: 'callout', kind: 'trap', html: "<b>Un snapshot n'est pas une sauvegarde</b> (module 08) : il vit avec le volume. Pour un vrai DR, déplace les données hors de la baie (copie de données) ou utilise la réplication du stockage." },
        { t: 'callout', kind: 'tip', html: "Pour les bases de données, prévois une <b>cohérence applicative</b> (quiesce, dump, hooks de sauvegarde) : une copie de fichiers à chaud peut être inutilisable." }
      ]
    },
    {
      title: 'Stratégie DR : RPO, RTO, modèles',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Modèle', 'Principe', 'Compromis'], rows: [
          ['<b>Reconstruire</b>', 'Réinstaller un cluster (module 03), rejouer la configuration par GitOps (module 10), restaurer les données avec OADP', 'RTO long, coût faible ; exige de la discipline GitOps'],
          ['<b>Cluster passif</b>', 'Second cluster à jour, prêt à recevoir une restauration OADP', 'RTO court ; coût de l\'infrastructure doublée'],
          ['<b>Étendu (stretch)</b>', 'Stockage et cluster sur deux sites', 'RPO proche de zéro ; contraintes de latence (module 08)']
        ] },
        { t: 'bullets', items: [
          '<b>RPO</b> (perte de données tolérée) → fréquence des sauvegardes et réplication ; <b>RTO</b> (durée de reprise) → modèle et automatisation.',
          '<b>Ce qui n\'est dans aucune sauvegarde de cluster</b> : DNS, LB, certificats d\'entreprise, secrets externes, configuration réseau (module 03) : documente-les et sauvegarde-les ailleurs.'
        ] },
        { t: 'callout', kind: 'tip', wide: true, html: "Un cluster entièrement décrit en <b>GitOps</b> est le meilleur allié du DR : la configuration revient depuis Git, seules les <b>données</b> demandent une sauvegarde." }
      ]
    },
    {
      title: 'Tester : sans exercice, pas de sauvegarde',
      tag: 'à planifier',
      blocks: [
        { t: 'cards', items: [
          { front: 'Restaurer un namespace', back: '<b>Mensuel</b> : supprimer un projet de test et le restaurer avec OADP ; vérifier données et volumes.' },
          { front: 'Restaurer etcd', back: '<b>Annuel</b> sur un cluster jetable : mesurer le <b>RTO réel</b> et corriger la procédure.' },
          { front: 'Archive lisible ?', back: 'Vérifier que les <b>deux fichiers</b> sont présents et que la version est notée.' },
          { front: 'Clés de chiffrement', back: 'S\'assurer qu\'<b>static_kuberesources</b> est bien sauvegardé et protégé.' },
          { front: 'Accès', back: 'SSH aux nœuds, kubeconfig, stockage objet : <b>joignables en situation de crise</b> ?' },
          { front: 'Documentation', back: 'Qui fait quoi, dans quel ordre ; procédure <b>hors du cluster</b>.' }
        ] },
        { t: 'callout', kind: 'warn', html: "La procédure de restauration doit exister <b>hors du cluster</b> : si elle est dans le wiki hébergé sur le cluster en panne, tu ne pourras pas la lire." }
      ]
    },
    {
      title: 'Quiz',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Ton cluster a le chiffrement etcd activé. Pourquoi faut-il impérativement conserver le fichier <code>static_kuberesources_*.tar.gz</code> avec le snapshot ?', options: ['Il contient les certificats de l\'API utilisés par les clients', 'Il contient les clés de chiffrement nécessaires pour restaurer depuis le snapshot etcd', 'Il contient le contenu des volumes persistants du cluster', 'Il n\'est utile qu\'à la mise à jour du cluster, pas à la restauration'], answer: 1, explain: 'Avec le chiffrement etcd, les clés se trouvent dans l\'archive des ressources des static pods ; la doc indique qu\'elles sont requises pour restaurer depuis le snapshot. Le contenu des PV n\'est jamais dans le snapshot etcd.' },
        { t: 'quiz', q: 'Le quorum etcd est perdu : l\'API est en lecture seule et tu n\'as aucune sauvegarde récente. Quelle procédure ?', options: ['<code>cluster-restore.sh</code> sur tous les nœuds en même temps', 'Restaurer toutes les applications avec OADP', 'Réinstaller le cluster entièrement avant toute autre tentative', '<code>quorum-restore.sh</code> sur un hôte de reprise, qui recrée un cluster etcd à un membre sans sauvegarde'], answer: 3, explain: 'La restauration du quorum repart de l\'état local d\'un membre (sans sauvegarde) ; les nœuds en ligne rejoignent le nouveau cluster etcd. Attention au risque de perte de données si l\'hôte choisi n\'a pas toutes les données.' },
        { t: 'quiz', q: 'Un snapshot CSI de tes volumes est-il suffisant comme sauvegarde ?', options: ['Non : il reste sur le même backend de stockage ; il faut déplacer les données hors de la baie (copie de données)', 'Oui, c\'est la sauvegarde recommandée pour les volumes', 'Oui, et il est inclus automatiquement dans le snapshot etcd', 'Non, les snapshots CSI sont interdits avec OADP'], answer: 0, explain: 'Un snapshot dépend du backend qui héberge le volume. OADP peut déplacer le snapshot vers un stockage objet (<code>snapshotMoveData</code>) pour obtenir une vraie sauvegarde hors baie.' }
      ]
    },
    {
      title: 'Lab : sauvegarder etcd et préparer OADP',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'Sauvegarde etcd, export, lecture de l\'archive, OADP', goal: 'Noyau en séance sur un SNO (cluster-admin), <b>sans rien détruire</b>. Les restaurations (bonus) se font sur un cluster jetable.', steps: [
          'Prérequis : environnement E1 (SNO) avec <code>cluster-admin</code> et accès SSH au nœud (clé de l\'installation), voir module 00 ; cluster installé depuis plus de 24 h.',
          'Réalise une sauvegarde : <code>oc debug --as-root node/NOEUD</code>, <code>chroot /host</code>, puis <code>/usr/local/bin/cluster-backup.sh /home/core/assets/backup</code>.',
          'Vérifie les <b>deux fichiers</b> produits (<code>snapshot_*.db</code> et <code>static_kuberesources_*.tar.gz</code>), leur taille et note la version du cluster (<code>oc get clusterversion</code>).',
          'Copie l\'archive <b>hors du nœud</b> (<code>scp</code> ou la méthode de ton site) puis liste le contenu des ressources avec <code>tar -tzf static_kuberesources_*.tar.gz | head</code> : qu\'y trouves-tu ?',
          'Installe l\'<b>OADP Operator</b> (OperatorHub, namespace <code>openshift-adp</code>, module 04) et décris le plan de sauvegarde de ton lab : quoi, où (bucket S3), à quelle fréquence, qui restaure. <b>Retour arrière</b> (l\'installation modifie le cluster) : supprime la <code>DataProtectionApplication</code> éventuelle, désinstalle l\'Operator, puis supprime ses CRD (<code>velero.io</code>) comme le décrit la doc de désinstallation d\'OADP (commande exacte : à vérifier pour ta version). <b>Attention</b> : supprimer les CRD <code>velero.io</code> <b>emporte les objets Backup, Restore et Schedule</b> du cluster : exporte-les d\'abord, ou garde le <b>stockage objet</b> comme source de vérité des sauvegardes, et ne désinstalle qu\'ensuite.',
          '(bonus, E1 + S3) Crée un bucket MinIO, le Secret <code>cloud-credentials</code> et une <code>DataProtectionApplication</code> ; vérifie le <code>BackupStorageLocation</code> (<code>Available</code>), sauvegarde un namespace de test, <b>supprime-le</b>, puis restaure-le avec un <code>Restore</code>.',
          '(bonus, cluster JETABLE uniquement, E1 jetable ou E2) <b>Restauration etcd</b> d\'après la procédure officielle complète, à partir de ta sauvegarde : action <b>destructive</b>, jamais sur un cluster qui compte ; chronomètre ton RTO. <b>Sur un SNO</b> : variante SNO (slide dédiée), le nœud est <b>interrompu</b> pendant la restauration et le SNO doit être réellement jetable.'
        ] }
      ]
    }
  ],
  takeaways: [
    'etcd contient les objets de l\'API, <b>pas</b> le contenu des volumes ni les images : sauvegarde etcd (cluster) et OADP (applications et volumes) sont <b>complémentaires</b>.',
    '<code>cluster-backup.sh</code> sur <b>un seul</b> nœud du control plane, après 24 h d\'installation ; l\'archive contient <b>deux fichiers</b> (snapshot et <code>static_kuberesources</code>, avec les clés de chiffrement) à stocker <b>hors du cluster</b>.',
    'Restauration depuis une sauvegarde de la <b>même version z-stream</b> ; quorum perdu : <code>quorum-restore.sh</code> ; état antérieur : <code>cluster-restore.sh</code>, <b>dernier recours</b>, procédure officielle en main.',
    'OADP : <code>DataProtectionApplication</code>, <code>Backup</code>, <code>Restore</code>, <code>Schedule</code>, stockage S3 hors cluster ; ne couvre <b>pas</b> etcd.',
    'Un snapshot CSI n\'est pas une sauvegarde : copie de données vers le stockage objet pour un vrai DR.',
    'DR : RPO/RTO, modèles (reconstruire avec GitOps, passif, étendu) et <b>exercices réguliers</b> ; la procédure vit hors du cluster.'
  ]
});
