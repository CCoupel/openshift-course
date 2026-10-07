COURSE.add({
  id: 'm11', lang: 'en', num: 11, emoji: '🗄️',
  title: 'Backup & disaster recovery',
  source: '4beb5d51b6e2',
  tagline: 'etcd, applications, volumes: what you back up, how you restore, and why a backup that has never been tested does not exist.',
  duration: '≈ 45 min + lab 20 min',
  objectives: [
    'Tell what etcd contains from what it does not (volumes, images, application data)',
    'Take, verify and export an etcd backup (<code>cluster-backup.sh</code>) and know its rules',
    'Choose the right recovery procedure: lost quorum, previous state, failed member, expired certificates',
    'Set up OADP to back up applications and their volumes',
    'Build a DR strategy (RPO, RTO, GitOps) and test it'
  ],
  slides: [
    {
      title: 'Backup and DR: whose responsibility?',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Back up', sub: 'etcd + applications', hl: true },
          { label: 'Get out of the cluster', sub: 'separate storage' },
          { label: 'Restore', sub: 'documented procedure', hl: true },
          { label: 'Test', sub: 'regular exercise' }
        ], caption: 'A backup that has never been <b>restored</b> is only a hypothesis.' },
        { t: 'bullets', frag: true, items: [
          'Boundaries: etcd architecture → module 02; enabling etcd encryption → module 04; CSI snapshots and storage → module 08; updates → module 12; GitOps → module 10.',
          'Two levels: the <b>cluster</b> (etcd) and the <b>applications</b> (resources + volumes, with OADP).',
          'Reference version: <b>4.20 EUS</b>.'
        ] },
        { t: 'callout', kind: 'cloud', html: "On ROSA/ARO/OSD, the provider takes care of etcd and the control plane. <b>On-prem, it's you</b>: backup, off-cluster storage, restoration and exercises are your responsibility." }
      ]
    },
    {
      title: 'What etcd contains, what it does not',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '✅ In etcd (hence in the etcd backup)', items: ['All <b>API objects</b>: Deployments, Services, Secrets, ConfigMaps, RBAC, CRs…', 'The state of the operators and the cluster configuration', 'References to volumes (PV/PVC) as <b>objects</b>'] },
          right: { title: '❌ Not in etcd', items: ['The <b>content of persistent volumes</b>: “contents of persistent volumes (PVs) are never part of the etcd snapshot”', 'Internal registry images', 'Application data (databases…)', 'Logs and metrics'] },
          verdict: 'The etcd backup restores the <b>cluster</b>; it does <b>not protect the data</b> of your applications.' },
        { t: 'callout', kind: 'trap', html: "Restoring etcd on a cluster whose volumes have changed creates inconsistencies (referenced PVs that are missing, or the opposite). The restore docs point this out: plan to reconcile the volumes by hand afterwards." }
      ]
    },
    {
      title: 'Taking an etcd backup',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: "# Access ONE control plane node\n$ oc debug --as-root node/master-0\nsh-5.1# chroot /host\n\n# (if a proxy is configured: export HTTP_PROXY, HTTPS_PROXY, NO_PROXY)\n\nsh-5.1# /usr/local/bin/cluster-backup.sh /home/core/assets/backup" },
        { t: 'bullets', items: [
          'The <code>cluster-backup.sh</code> script is provided on the control plane nodes; it writes to the directory you pass it.',
          'It is run on <b>a single</b> control plane node (module 02 for the architecture).',
          'Impact on the running cluster: to be validated on your environment (not specified in the pages read).'
        ] },
        { t: 'callout', kind: 'warn', wide: true, html: "Do <b>not back up every control plane node</b>: a single snapshot is enough (docs). Also wait <b>24 hours after installation</b> before the first backup (initial certificate rotation)." }
      ]
    },
    {
      title: 'The archive contents',
      blocks: [
        { t: 'table', head: ['File', 'Content'], rows: [
          ['<code>snapshot_&lt;timestamp&gt;.db</code>', 'The <b>etcd snapshot</b> itself'],
          ['<code>static_kuberesources_&lt;timestamp&gt;.tar.gz</code>', 'The <b>static pod</b> resources and, if etcd encryption is enabled, the <b>encryption keys</b>']
        ] },
        { t: 'bullets', frag: true, items: [
          'Both <b>files</b> are needed for a restore: the key file “is required to restore from the etcd snapshot”.',
          'With <b>etcd encryption</b> (module 04): the snapshot is encrypted, <b>the keys are in the <code>static_kuberesources</code> archive</b>. Protect it like a secret.',
          'Don\'t back up etcd before the initial encryption has finished (docs) and take another backup after enabling it.',
          'Restoration is possible with a backup from the <b>same z-stream version</b> of the cluster.'
        ] },
        { t: 'callout', kind: 'tip', html: "Keep the <b>cluster version</b> (<code>oc get clusterversion</code>) with each backup: without it, you don\'t know whether the archive is usable." }
      ]
    },
    {
      title: 'Storing and scheduling backups',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'bash', file: 'bastion (example)', code: "# Get the archive off the node, out of the cluster\n$ DEST=/srv/backups/etcd/$(date +%F)\n$ mkdir -p $DEST\n$ scp core@master-0:/home/core/assets/backup/* $DEST/\n$ oc get clusterversion version -o jsonpath='{.status.desired.version}{\"\\n\"}' > $DEST/VERSION" },
        { t: 'bullets', items: [
          '<b>Outside the cluster</b>: the docs ask to store the backup outside the environment (a lost cluster must not take its backup with it).',
          '<b>Rotation</b>: keep several generations (for example daily over 7 days, weekly for longer); this is a practice recommendation, to adapt to your RPO.',
          '<b>Scheduling</b>: a job on a bastion or a corporate orchestrator.'
        ] },
        { t: 'callout', kind: 'warn', wide: true, html: "The 4.20 docs describe a <b>native automation</b> (<code>EtcdBackup</code> and <code>Backup</code> CRs) but in <b>Technology Preview</b>, with the <code>TechPreviewNoUpgrade</code> feature set: <b>irreversible and blocks updates</b> (module 04). Not for production." }
      ]
    },
    {
      title: 'Which recovery procedure?',
      blocks: [
        { t: 'table', head: ['Situation', 'Procedure', 'Backup needed?'], rows: [
          ['<b>Quorum lost</b>, API read-only', '<code>quorum-restore.sh</code> on a recovery host', '<b>No</b>: you start again from a member\'s local state'],
          ['Serious error, return to a <b>previous state</b>', 'Restore from a backup (<code>cluster-restore.sh</code>)', '<b>Yes</b>: both files, same z-stream'],
          ['<b>A failed etcd member</b>', 'Replacing the unhealthy member', '<b>Yes, beforehand</b>: docs prerequisite (“You have taken an etcd backup”) so you can restore if something goes wrong'],
          ['Expired control plane <b>certificates</b>', 'Approving the <code>node-bootstrapper</code> CSRs (and <code>kubelet-serving</code> in UPI)', '<b>No</b> (prerequisite: <code>cluster-admin</code> and <code>oc</code>)']
        ] },
        { t: 'callout', kind: 'warn', html: "Any recovery assumes <b>at least one healthy control plane node</b>. Restoring to a previous state is a <b>last resort</b>: you choose the <b>least destructive</b> procedure that solves your problem." },
        { t: 'callout', kind: 'trap', html: "<b>Rule of caution</b>: <b>take an etcd backup before any intervention on etcd</b> when possible, even if the docs don\'t require it for your procedure: it is your safety net if the operation goes wrong." },
        { t: 'callout', kind: 'tip', html: "Before any action: <code>oc get co</code>, <code>oc get nodes</code> and the state of the <code>openshift-etcd</code> pods tell you <b>which situation</b> you are in (module 12 for diagnosis)." }
      ]
    },
    {
      title: 'Quorum loss: quorum-restore.sh',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          'Case: a high-availability cluster whose <b>etcd quorum is lost</b>; the API becomes <b>read-only</b>.',
          '<code>quorum-restore.sh</code> recreates a <b>single-member</b> etcd cluster from the recovery host\'s local data and marks the other members as invalid.',
          'Nodes that stayed online <b>join the new etcd cluster automatically</b>.',
          'Offline nodes: <b>delete and recreate</b> the Machines (Machine API or your infrastructure), then wait for synchronization.'
        ] },
        { t: 'code', lang: 'bash', file: 'recovery host', code: "$ sudo -E /usr/local/bin/quorum-restore.sh" },
        { t: 'callout', kind: 'trap', wide: true, html: "“<b>Data loss</b> may occur if the host running the restore does not have all the replicated data.” Choose the host with the <b>most recent</b> data and don\'t use this procedure to <b>reduce</b> the number of nodes outside the recovery scope." }
      ]
    },
    {
      title: 'Restoring to a previous state: prerequisites and risks',
      blocks: [
        { t: 'bullets', frag: true, items: [
          '<b>Last resort</b>: the docs describe it as a “destructive and destabilizing” action on a running cluster.',
          '<b>Access</b>: <code>cluster-admin</code> with a certificate-based kubeconfig, and <b>SSH to all control plane nodes</b>; they must be reachable or bootable.',
          '<b>Backup</b>: a directory containing <b>both files</b> (<code>snapshot_*.db</code> and <code>static_kuberesources_*.tar.gz</code>) taken on the <b>same z-stream version</b> as the cluster (docs example: a 4.20.2 backup for a 4.20.2 cluster).',
          '<b>Effects</b>: operator churn if etcd\'s content differs from the files on disk, workloads deleted if they don\'t exist in the snapshot, <b>volumes to reconcile</b> by hand.'
        ] },
        { t: 'callout', kind: 'warn', html: "The <b>SNO</b> has its own procedure (next slide). For a <b>compact</b> cluster: multi-node procedure; possible constraints to re-read in the docs for your version. Always practice on a <b>disposable cluster</b> first." }
      ]
    },
    {
      title: 'Restoring to a previous state: the steps',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'SSH', sub: 'choose the recovery host; SSH to all nodes' },
          { label: 'Disable etcd', sub: 'disable-etcd.sh on “each control plane node” (recovery host included? to be confirmed)' },
          { label: 'Copy the backup', sub: 'to /home/core of the recovery host' },
          { label: 'cluster-restore.sh', sub: 'on the recovery host only', hl: true },
          { label: 'Leave SSH', sub: 'exit, before resuming with oc' },
          { label: 'Quorum guard', sub: 'disable' },
          { label: 'Wait', sub: 'oc adm wait-for-stable-cluster (≈ 15 min)' },
          { label: 'Quorum guard', sub: 're-enable', hl: true }
        ] },
        { t: 'code', lang: 'bash', file: 'commands cited by the 4.20 docs', code: "# 1. Over SSH on each control plane node (docs: “each control plane node”;\n#    recovery host included? to be confirmed on the OCP 4.20 page)\n$ sudo -E /usr/local/bin/disable-etcd.sh\n\n# 2. Copy the backup directory (snapshot + static_kuberesources) to /home/core\n#    of the recovery host (method of your choice: the docs don't specify it)\n\n# 3. Over SSH on the recovery host ONLY\n$ sudo -E /usr/local/bin/cluster-restore.sh /home/core/<backup-directory>\n\n# 4. Leave the SSH session\n$ exit\n\n# 5. When the API answers: disable the quorum guard, then wait\n$ oc patch etcd/cluster --type=merge -p '{\"spec\": {\"unsupportedConfigOverrides\": {\"useUnsupportedUnsafeNonHANonProductionUnstableEtcd\": true}}}'\n$ oc adm wait-for-stable-cluster\n\n# 6. Re-enable the guard\n$ oc patch etcd/cluster --type=merge -p '{\"spec\": {\"unsupportedConfigOverrides\": null}}'" },
        { t: 'callout', kind: 'warn', html: "The order above is that of the official 4.20 procedure (SSH to all nodes, <code>disable-etcd.sh</code> on “<b>each control plane node</b>”, copying the backup, <code>cluster-restore.sh</code> on the <b>recovery host only</b>, then <b>leaving the SSH session</b> before the quorum guard <code>oc patch</code>es). The 4.20 docs <b>do not ask for a manual stop of the static pods</b>. <b>Reservation</b>: the docs write, at step 2, “Establish SSH connectivity to each of the control plane nodes, <b>including the recovery host</b>” then, at step 3, “connect to each control plane node to disable etcd” without repeating “including the recovery host”: the <b>inclusion of the recovery host for <code>disable-etcd.sh</code> is not stated explicitly</b> (probable reading: yes): <b>to be confirmed on the OCP 4.20 page</b> by re-reading the official procedure. <b>Never restore from these lines alone</b>: re-read the full procedure before and during the operation." }
      ]
    },
    {
      title: 'Restoring on a SNO',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'bash', file: 'SNO (4.20 docs)', code: `# 1. Copy the backup directory to /home/core of the node
$ cp ETCD_BACKUP_DIRECTORY /home/core

# 2. Restore
$ sudo -E /usr/local/bin/cluster-restore.sh /home/core/ETCD_BACKUP_DIRECTORY

# 3. Leave the SSH session then follow the cluster's return
$ oc adm wait-for-stable-cluster` },
        { t: 'bullets', items: [
          'The 4.20 docs describe a separate section “Restoring to a previous cluster state for a single node”.',
          'Differences from multi-node: <b>no <code>disable-etcd.sh</code></b> and <b>no quorum guard handling</b>; a single restore command on the node; back in about 15 minutes.',
          'Same prerequisites: certificate-based kubeconfig, SSH access, directory with <b>both files</b> from the same z-stream version.'
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: "On a SNO, the cluster <b>is</b> the single node: the restore interrupts it completely. Maintenance window, backup <b>stored off the node</b>, and <b>no restore test on your only working SNO</b>. Page read via the OKD 4.20 mirror: re-read it in the OCP 4.20 docs before use." }
      ]
    },
    {
      title: 'OADP: backing up applications',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          '<b>OADP</b> (OpenShift API for Data Protection) protects <b>applications, the cluster resources tied to them, persistent volumes and internal images</b>.',
          'API: <code>Backup</code>, <code>Restore</code>, <code>Schedule</code>, <code>BackupStorageLocation</code>, <code>VolumeSnapshotLocation</code>.',
          '<b>Essential limit</b>: “OADP is not a disaster recovery solution for <code>etcd</code> or OpenShift Operators”. The two backups are <b>complementary</b>.',
          'Compatibility (Red Hat “OpenShift Operator Life Cycles” page): <b>OADP 1.5</b> for OCP 4.19, 4.20 and 4.21 (GA on June 17, 2025; end of support listed on May 3, 2026); <b>OADP 1.4</b> for 4.14 to 4.18. <b>OADP 1.6</b> targets <b>OCP 4.22 and later</b>, not 4.20 (same page). The course settles on <b>OADP 1.5</b> for 4.20.'
        ] },
        { t: 'callout', kind: 'onprem', wide: true, html: "You need <b>S3 object storage</b> (ODF/NooBaa, MinIO, S3 array) <b>outside the protected cluster</b> to drop the backups into (module 08)." },
        { t: 'callout', kind: 'ocp', wide: true, html: "Installation through OLM (module 04) in the <code>openshift-adp</code> namespace (OperatorGroup limited to that namespace, <code>redhat-operators</code> source; <code>redhat-oadp-operator</code> Subscription, <code>stable-1.5</code> channel for OADP 1.5): details <b>to be verified</b> in “Installing the OADP Operator”." }
      ]
    },
    {
      title: 'OADP: configuring the backup storage',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'dpa.yaml (OADP 1.5, S3-compatible example)', code: `apiVersion: oadp.openshift.io/v1alpha1
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
          'The bucket <b>credentials</b> go in a Secret (here <code>cloud-credentials</code>) in the <code>openshift-adp</code> namespace.',
          '<code>csi</code> enables CSI snapshots; the <b>nodeAgent</b> with <code>kopia</code> is used for data copy (next slide).',
          'Check the state: <code>oc get backupstoragelocation -n openshift-adp</code> (<code>Available</code> phase).'
        ] },
        { t: 'callout', kind: 'warn', html: "This example follows the structure of recent OADP docs (apiVersion, plugins, <code>nodeAgent</code>); the <b>exact fields of your OADP version</b> are to be verified in the docs (<code>oc explain dataprotectionapplication.spec</code>)." }
      ]
    },
    {
      title: 'OADP: Backup, Restore, Schedule',
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
          '<code>includedNamespaces</code>: what you back up; resource exclusions are possible.',
          '<b>Schedule</b>: same content as a Backup with a schedule (cron): this is what makes OADP <b>automatic</b>.',
          'A <b>Restore</b> can also target <b>another cluster</b> pointing at the same bucket (disaster recovery: same BSL names and paths; set the BSL to <code>ReadOnly</code> during recovery) or another namespace (<code>namespaceMapping</code>).'
        ] },
        { t: 'callout', kind: 'tip', wide: true, html: "Restore first into a <b>test namespace</b> to validate the content (resources, volumes, secrets) before relying on it in a real situation." }
      ]
    },
    {
      title: 'Volumes: snapshot, data copy, fs-backup',
      blocks: [
        { t: 'table', head: ['Method', 'Principle', 'Good to know'], rows: [
          ['<b>CSI snapshot</b>', 'Volume snapshot by the driver (fast)', 'Stays <b>on the same storage backend</b>: if the array is lost, so is the snapshot (module 08)'],
          ['<b>Data copy</b> (<code>snapshotMoveData: true</code>)', 'Moves the CSI snapshot to <b>object storage</b>', 'A real off-array backup; slower, uses the <code>nodeAgent</code> (kopia)'],
          ['<b>File system backup</b> (<code>defaultVolumesToFsBackup</code>)', 'File-by-file copy from the pod', 'For volumes without CSI snapshot; no application consistency guaranteed']
        ] },
        { t: 'callout', kind: 'trap', html: "<b>A snapshot is not a backup</b> (module 08): it lives with the volume. For real DR, move the data off the array (data copy) or use storage replication." },
        { t: 'callout', kind: 'tip', html: "For databases, plan for <b>application consistency</b> (quiesce, dump, backup hooks): a hot file copy can be unusable." }
      ]
    },
    {
      title: 'DR strategy: RPO, RTO, models',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Model', 'Principle', 'Trade-off'], rows: [
          ['<b>Rebuild</b>', 'Reinstall a cluster (module 03), replay the configuration with GitOps (module 10), restore the data with OADP', 'Long RTO, low cost; requires GitOps discipline'],
          ['<b>Passive cluster</b>', 'A second up-to-date cluster, ready to receive an OADP restore', 'Short RTO; cost of doubled infrastructure'],
          ['<b>Stretch</b>', 'Storage and cluster across two sites', 'RPO close to zero; latency constraints (module 08)']
        ] },
        { t: 'bullets', items: [
          '<b>RPO</b> (tolerated data loss) → backup frequency and replication; <b>RTO</b> (recovery time) → model and automation.',
          '<b>What is in no cluster backup</b>: DNS, LB, corporate certificates, external secrets, network configuration (module 03): document them and back them up elsewhere.'
        ] },
        { t: 'callout', kind: 'tip', wide: true, html: "A cluster fully described in <b>GitOps</b> is DR\'s best ally: the configuration comes back from Git, only the <b>data</b> needs a backup." }
      ]
    },
    {
      title: 'Testing: no exercise, no backup',
      tag: 'to schedule',
      blocks: [
        { t: 'cards', items: [
          { front: 'Restore a namespace', back: '<b>Monthly</b>: delete a test project and restore it with OADP; check data and volumes.' },
          { front: 'Restore etcd', back: '<b>Yearly</b> on a disposable cluster: measure the <b>real RTO</b> and fix the procedure.' },
          { front: 'Readable archive?', back: 'Check that <b>both files</b> are present and that the version is noted.' },
          { front: 'Encryption keys', back: 'Make sure <b>static_kuberesources</b> is backed up and protected.' },
          { front: 'Access', back: 'SSH to nodes, kubeconfig, object storage: <b>reachable in a crisis</b>?' },
          { front: 'Documentation', back: 'Who does what, in what order; procedure <b>outside the cluster</b>.' }
        ] },
        { t: 'callout', kind: 'warn', html: "The restore procedure must exist <b>outside the cluster</b>: if it is in the wiki hosted on the failed cluster, you won\'t be able to read it." }
      ]
    },
    {
      title: 'Quiz',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Your cluster has etcd encryption enabled. Why must you keep the <code>static_kuberesources_*.tar.gz</code> file with the snapshot?', options: ['It contains the API certificates used by clients', 'It contains the encryption keys needed to restore from the etcd snapshot', 'It contains the content of the cluster\'s persistent volumes', 'It is only useful for updating the cluster, not for restoring'], answer: 1, explain: 'With etcd encryption, the keys are in the archive of the static pod resources; the docs state they are required to restore from the snapshot. The content of PVs is never in the etcd snapshot.' },
        { t: 'quiz', q: 'The etcd quorum is lost: the API is read-only and you have no recent backup. Which procedure?', options: ['<code>cluster-restore.sh</code> on all nodes at the same time', 'Restore all applications with OADP', 'Reinstall the cluster entirely before any other attempt', '<code>quorum-restore.sh</code> on a recovery host, which recreates a one-member etcd cluster without a backup'], answer: 3, explain: 'Quorum restoration starts again from a member\'s local state (no backup); online nodes join the new etcd cluster. Beware of the risk of data loss if the chosen host does not have all the data.' },
        { t: 'quiz', q: 'Is a CSI snapshot of your volumes enough as a backup?', options: ['No: it stays on the same storage backend; you must move the data off the array (data copy)', 'Yes, it is the recommended backup for volumes', 'Yes, and it is automatically included in the etcd snapshot', 'No, CSI snapshots are forbidden with OADP'], answer: 0, explain: 'A snapshot depends on the backend that hosts the volume. OADP can move the snapshot to object storage (<code>snapshotMoveData</code>) to get a real off-array backup.' }
      ]
    },
    {
      title: 'Lab: back up etcd and prepare OADP',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'etcd backup, export, reading the archive, OADP', goal: 'Core during the session on a SNO (cluster-admin), <b>without destroying anything</b>. Restores (bonus) are done on a disposable cluster.', steps: [
          'Prerequisites: environment E1 (SNO) with <code>cluster-admin</code> and SSH access to the node (installation key), see module 00; cluster installed for more than 24 h.',
          'Take a backup: <code>oc debug --as-root node/NODE</code>, <code>chroot /host</code>, then <code>/usr/local/bin/cluster-backup.sh /home/core/assets/backup</code>.',
          'Check the <b>two files</b> produced (<code>snapshot_*.db</code> and <code>static_kuberesources_*.tar.gz</code>), their size and note the cluster version (<code>oc get clusterversion</code>).',
          'Copy the archive <b>off the node</b> (<code>scp</code> or your site\'s method) then list the contents of the resources with <code>tar -tzf static_kuberesources_*.tar.gz | head</code>: what do you find?',
          'Install the <b>OADP Operator</b> (OperatorHub, <code>openshift-adp</code> namespace, module 04) and describe your lab\'s backup plan: what, where (S3 bucket), how often, who restores. <b>Rollback</b> (the installation changes the cluster): delete any <code>DataProtectionApplication</code>, uninstall the Operator, then delete its CRDs (<code>velero.io</code>) as described in the OADP uninstall docs (command from the docs: <code>for CRD in $(oc get crds | grep velero | awk \'{print $1}\'); do oc delete crd $CRD; done</code>). <b>Warning</b>: deleting the <code>velero.io</code> CRDs <b>takes away the Backup, Restore and Schedule objects</b> of the cluster: export them first, or keep the <b>object storage</b> as the source of truth for backups, and only then uninstall.',
          '(bonus, E1 + S3) Create a MinIO bucket, the <code>cloud-credentials</code> Secret and a <code>DataProtectionApplication</code>; check the <code>BackupStorageLocation</code> (<code>Available</code>), back up a test namespace, <b>delete it</b>, then restore it with a <code>Restore</code>.',
          '(bonus, DISPOSABLE cluster only, disposable E1 or E2) <b>etcd restore</b> following the full official procedure, from your backup: <b>destructive</b> action, never on a cluster that matters; time your RTO. <b>On a SNO</b>: SNO variant (dedicated slide), the node is <b>interrupted</b> during the restore and the SNO must be truly disposable.'
        ] }
      ]
    }
  ],
  takeaways: [
    'etcd contains the API objects, <b>not</b> the content of volumes nor images: etcd backup (cluster) and OADP (applications and volumes) are <b>complementary</b>.',
    '<code>cluster-backup.sh</code> on <b>a single</b> control plane node, after 24 h of installation; the archive contains <b>two files</b> (snapshot and <code>static_kuberesources</code>, with the encryption keys) to store <b>outside the cluster</b>.',
    'Restore from a backup of the <b>same z-stream version</b>; quorum lost: <code>quorum-restore.sh</code>; previous state: <code>cluster-restore.sh</code>, <b>last resort</b>, official procedure in hand.',
    'OADP: <code>DataProtectionApplication</code>, <code>Backup</code>, <code>Restore</code>, <code>Schedule</code>, S3 storage outside the cluster; does <b>not</b> cover etcd.',
    'A CSI snapshot is not a backup: data copy to object storage for real DR.',
    'DR: RPO/RTO, models (rebuild with GitOps, passive, stretch) and <b>regular exercises</b>; the procedure lives outside the cluster.'
  ]
});
