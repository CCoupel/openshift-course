COURSE.add({
  id: 'm08', lang: 'en', num: 8, emoji: '💾',
  title: 'Storage',
  source: '9aa97f2653d9',
  tagline: "On on-prem OpenShift, persistent storage is not provided: you choose the backend, and that is where projects go off the rails.",
  duration: '≈ 60 min + lab 20 min',
  objectives: [
    "Choose a suitable on-prem storage backend (vSphere CSI, LVMS, LSO, NFS, SAN array via CSI, ODF)",
    "Master StorageClass, access modes, expansion, snapshots and clones",
    "Understand ODF (RBD, CephFS, object), its topologies and its resource cost",
    "Know etcd's disk requirements and the storage for the registry, monitoring and logging",
    "Diagnose the classic failures: Pending PVC, Multi-Attach, volume stuck in Terminating, permissions"
  ],
  slides: [
    {
      title: "PV / PVC / StorageClass recap, and what changes",
      blocks: [
        { t: 'text', html: "<p>The objects are those of K8s: <b>PVC</b> (request), <b>PV</b> (volume), <b>StorageClass</b> (dynamic provisioning recipe). On OCP, the mechanics are the same; what changes is <b>who installs and drives the drivers</b>.</p>" },
        { t: 'bullets', frag: true, items: [
          "Platform CSI drivers (vSphere, cloud) are installed and updated by the <b>Cluster Storage Operator</b> (<code>oc get co storage</code>).",
          "The other backends (LVMS, ODF, LSO, vendor CSI) arrive through <b>OLM / OperatorHub</b>.",
          "Depending on the platform, a default StorageClass is created at installation (vSphere: <code>thin-csi</code>). <b>On bare metal, there is none</b>.",
          "Pods run with a random UID (SCC): volume permissions become a topic (dedicated slide)."
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc get sc\n$ oc get csidriver\n$ oc get pods -n openshift-cluster-csi-drivers\n$ oc get co storage" }
      ]
    },
    {
      title: "CSI on OpenShift: who does what",
      blocks: [
        { t: 'text', html: "<p>A CSI driver = a <b>controller</b> (Deployment: provisions, attaches, snapshots) + a <b>node plugin</b> (DaemonSet: mounts the volume on the node) + sidecars (external-provisioner, attacher, resizer, snapshotter).</p>" },
        { t: 'flow', nodes: [
          'PVC',
          { label: 'external-provisioner', sub: 'sees the StorageClass', hl: true },
          { label: 'CSI driver controller', sub: 'creates the volume on the backend' },
          { label: 'PV', sub: 'bound to the PVC' },
          { label: 'Node plugin', sub: 'attaches + mounts in the pod', hl: true }
        ], caption: "The StorageClass <code>provisioner</code> must match the name of a CSIDriver." },
        { t: 'callout', kind: 'ocp', html: "The historical “in-tree” drivers are migrated to CSI. For vSphere, the old <code>thin</code> StorageClass (in-tree) is replaced by <code>thin-csi</code>: check what your cluster actually uses before a version upgrade." }
      ]
    },
    {
      title: "Overview of on-prem backends",
      blocks: [
        { t: 'table', head: ['Backend', 'Modes', 'Dynamic?', 'Use case'], rows: [
          ['<b>vSphere CSI</b>', 'RWO (VMDK); RWX via vSAN File Services (if the vSphere environment supports it)', 'Yes', 'Cluster on vSphere, existing datastore'],
          ['<b>LVMS</b> (LVM Storage)', 'Local RWO block/file', 'Yes (thin LVM)', 'SNO, edge, small clusters'],
          ['<b>Local Storage Operator</b>', 'RWO, Filesystem or Block volumeMode', 'No: static PVs on local disks', 'Bare metal, dedicated disks, foundation for ODF'],
          ['<b>NFS</b>', 'RWX', "Via nfs-subdir or CSI NFS (community)", 'Simple file sharing; not for databases'],
          ['<b>iSCSI / FC / vendor NAS</b>', 'RWO (block), RWX (file) depending on the array', 'Yes via vendor CSI', 'Existing SAN/NAS array (NetApp, Dell, Pure, HPE…)'],
          ['<b>ODF</b>', 'RWO (RBD), RWX (CephFS), S3 object', 'Yes', 'Software-defined storage, all-in-one']
        ] },
        { t: 'callout', kind: 'onprem', html: "On-prem, <b>the backend is on you</b>: capacity, performance, storage backup and vendor support. Choose it before installation, not after the first Pending PVC." }
      ]
    },
    {
      title: "vSphere CSI",
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          "<code>csi.vsphere.vmware.com</code> driver, installed by default on a vSphere cluster.",
          "A PV = a virtual disk (VMDK) attached to the node VM: <b>RWO</b> only for block.",
          "<code>thin-csi</code> StorageClass by default; the <code>storagePolicyName</code> parameter links to a <b>vCenter storage policy (SPBM)</b>.",
          "The vCenter account used by OCP must have the cloud-native storage privileges: to be validated with the VMware team.",
          "Topology (zones/regions via vCenter tags) is possible: to be planned at installation."
        ] },
        { t: 'code', lang: 'yaml', file: 'sc-vsphere.yaml', code: "apiVersion: storage.k8s.io/v1\nkind: StorageClass\nmetadata:\n  name: vsphere-gold\nprovisioner: csi.vsphere.vmware.com\nparameters:\n  storagePolicyName: \"Gold-SSD\"\nreclaimPolicy: Delete\nallowVolumeExpansion: true\nvolumeBindingMode: WaitForFirstConsumer" },
        { t: 'callout', kind: 'trap', wide: true, html: "The PV disk is a vCenter object: <b>deleting or moving a node's VM by hand</b> (Storage vMotion, clone) can break the attachment. Let the cluster (Machine API) manage the node life cycle." }
      ]
    },
    {
      title: "LVMS and Local Storage Operator",
      layout: 'two',
      blocks: [
        { t: 'text', html: "<p><b>LVMS</b> (LVM Storage): an operator that builds an LVM volume group on local disks and dynamically provisions <i>thin</i> volumes (based on TopoLVM). It is the natural choice for SNO and edge.</p>" },
        { t: 'code', lang: 'yaml', file: 'lvmcluster.yaml', code: "apiVersion: lvm.topolvm.io/v1alpha1\nkind: LVMCluster\nmetadata:\n  name: my-lvmcluster\n  namespace: openshift-lvm-storage\nspec:\n  storage:\n    deviceClasses:\n    - name: vg1\n      default: true\n      thinPoolConfig:\n        name: thin-pool-1\n        sizePercent: 90\n        overprovisionRatio: 10" },
        { t: 'callout', kind: 'tip', html: "LVMS creates a StorageClass named <code>lvms-&lt;deviceClass&gt;</code> (here <code>lvms-vg1</code>). The volume is <b>local to a node</b>: if the node goes down, the data is unavailable." },
        { t: 'text', html: "<p><b>Local Storage Operator (LSO)</b>: no dynamic provisioning. It discovers the disks (<code>LocalVolumeDiscovery</code>) and creates <b>static PVs</b> (<code>LocalVolume</code> / <code>LocalVolumeSet</code>) with a <code>no-provisioner</code> StorageClass. Building block of ODF on bare metal.</p>" },
        { t: 'callout', kind: 'warn', wide: true, html: "Disks given to LVMS or LSO must be <b>blank</b> (no filesystem signature or partition). LVMS only uses empty disks; selection is done with <code>deviceSelector</code> (paths), and <code>forceWipeDevicesAndDestroyAllData</code> (default <code>false</code>) is <b>destructive</b>. Default namespace of the LVMS operator in 4.20: <code>openshift-lvm-storage</code> (<code>openshift-storage</code> remains ODF's)." }
      ]
    },
    {
      title: "NFS, iSCSI, FC: existing arrays",
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          "<b>NFS</b>: no dynamic provisioner shipped with OCP. Community options: <code>nfs-subdir-external-provisioner</code> or <code>csi-driver-nfs</code> (no Red Hat support out of the box).",
          "NFS does not handle <code>fsGroup</code>: permissions depend on the export (<code>root_squash</code>, UID/GID).",
          "<b>iSCSI / FC</b>: you don't mount LUNs by hand, you install the <b>vendor's CSI</b> (certified operator in OperatorHub if available).",
          "For multipath and iSCSI packages on RHCOS: configure via <code>MachineConfig</code>, never over SSH."
        ] },
        { t: 'callout', kind: 'onprem', html: "Check the vendor's <b>compatibility matrix</b> (CSI version x OCP version) before each OCP version upgrade. A non-certified CSI = no Red Hat support on the storage side." },
        { t: 'callout', kind: 'trap', wide: true, html: "“Simple” NFS: the random-UID pod is not allowed to write to the export. Classic pitfall, detailed on the permissions slide. And <b>never</b> put etcd or a latency-sensitive database on NFS." }
      ]
    },
    {
      title: "StorageClass: the 4 fields that matter",
      blocks: [
        { t: 'code', lang: 'yaml', file: 'storageclass.yaml', code: "apiVersion: storage.k8s.io/v1\nkind: StorageClass\nmetadata:\n  name: fast-block\n  annotations:\n    storageclass.kubernetes.io/is-default-class: \"true\"\nprovisioner: csi.vsphere.vmware.com\nreclaimPolicy: Delete            # or Retain\nallowVolumeExpansion: true\nvolumeBindingMode: WaitForFirstConsumer" },
        { t: 'table', head: ['Field', 'Effect', 'Pitfall'], rows: [
          ['<code>is-default-class</code>', 'Used by PVCs without <code>storageClassName</code>', "Only one per cluster: otherwise ambiguous behavior"],
          ['<code>volumeBindingMode</code>', '<code>WaitForFirstConsumer</code>: provisions after the pod is placed', "<code>Immediate</code> with a topology-aware backend: volume created in the wrong place"],
          ['<code>allowVolumeExpansion</code>', 'Allows growing', "Requires <code>allowVolumeExpansion: true</code> on the StorageClass <b>and</b> a CSI driver that supports expansion"],
          ['<code>reclaimPolicy</code>', '<code>Delete</code>: PV and data deleted with the PVC', "<code>Retain</code>: the PV stays in <code>Released</code>, to be cleaned up by hand"]
        ] }
      ]
    },
    {
      title: "Access modes: RWO, RWX, RWOP",
      tag: 'pitfall #1',
      blocks: [
        { t: 'table', head: ['Mode', 'Meaning', 'Typically'], rows: [
          ['<b>RWO</b>', 'Read/write by <b>a single node</b> (several pods on the same node possible)', 'Block: vSphere CSI, LVMS, RBD'],
          ['<b>ROX</b>', 'Read-only, several nodes', 'Read shares, snapshots'],
          ['<b>RWX</b>', 'Read/write by several nodes', 'File: CephFS, NFS, vSAN File'],
          ['<b>RWOP</b>', 'Read/write by <b>a single pod</b> of the cluster (CSI only)', 'Strict single-writer guarantee']
        ] },
        { t: 'callout', kind: 'trap', html: "RWO ≠ “a single pod”: it is “a single node”. During a rolling update, the new pod lands on another node, and you get a <b>Multi-Attach error</b>. Solutions: <code>Recreate</code> strategy, RWX, or StatefulSet." },
        { t: 'callout', kind: 'cloud', html: "In the cloud, disks (EBS, Azure Disk, PD) are RWO <b>and tied to an availability zone</b>. RWX goes through a file service: EFS (AWS), Azure Files, Filestore (GCP)." }
      ]
    },
    {
      title: "OpenShift Data Foundation: overview",
      blocks: [
        { t: 'text', html: "<p><b>ODF</b> = Red Hat's software-defined storage, built on <b>Ceph</b> (orchestrated by <b>Rook</b>) and <b>NooBaa</b> (multi-cloud object). A single operator, three kinds of storage.</p>" },
        { t: 'table', head: ['Need', 'Tech', 'StorageClass (internal)', 'Mode'], rows: [
          ['Block', 'Ceph RBD', '<code>ocs-storagecluster-ceph-rbd</code>', 'RWO (RWX in Block)'],
          ['Shared file', 'CephFS', '<code>ocs-storagecluster-cephfs</code>', 'RWX'],
          ['S3 object (on Ceph)', 'RGW', '<code>ocs-storagecluster-ceph-rgw</code> (depending on platform)', 'ObjectBucketClaim'],
          ['S3 object (multi-cloud)', 'MCG / NooBaa', '<code>openshift-storage.noobaa.io</code>', 'ObjectBucketClaim']
        ] },
        { t: 'callout', kind: 'tip', html: "RWX in <code>volumeMode: Block</code> on RBD is notably used for VM live migration (OpenShift Virtualization: VMs and live migration, module 13)." }
      ]
    },
    {
      title: "ODF: topologies and sizing",
      layout: 'two',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '📦 Internal', items: ['Ceph deployed inside the OCP cluster', 'Local disks (via LSO) or datastore', 'Worker nodes or dedicated nodes', '3 replicas, 3 nodes minimum'] },
          right: { title: '🔌 External', items: ['Ceph outside the cluster (Red Hat Ceph Storage)', 'OCP is a consumer', 'Separate storage team', 'No Ceph load on the workers'] },
          verdict: "Stretch cluster: 2 data zones + 1 arbiter, for zero RPO between two nearby sites." },
        { t: 'bullets', frag: true, items: [
          "<b>Dedicated nodes</b>: label <code>cluster.ocs.openshift.io/openshift-storage=\"\"</code> and taint <code>node.ocs.openshift.io/storage=true:NoSchedule</code>.",
          "Minimum <b>3 nodes</b> with disks, one per failure domain (host, rack or zone).",
          "Network: <b>10 GbE minimum</b> recommended; public/cluster networks can be separated via Multus.",
          "Stretch: low inter-site latency required (≤ 10 ms RTT between the two data zones; the arbiter is tested up to 100 ms; minimum 5 nodes across 3 zones)."
        ] },
        { t: 'callout', kind: 'onprem', html: "ODF is <b>costly</b>: significant CPU and RAM per storage node (order of magnitude: tens of vCPUs and hundreds of GB of RAM across the whole Ceph cluster), dedicated subscription, SSD/NVMe disks. Consult the ODF planning guide for your version for exact figures." }
      ]
    },
    {
      title: "ODF: deploying",
      blocks: [
        { t: 'flow', nodes: [
          'Disks ready (LSO or datastore)',
          { label: 'ODF operator', sub: 'openshift-storage namespace', hl: true },
          { label: 'StorageCluster', sub: 'ocs.openshift.io CR' },
          'Ceph pods (mon, mgr, osd, mds)',
          { label: 'StorageClasses', sub: 'ocs-storagecluster-*', hl: true }
        ] },
        { t: 'code', lang: 'yaml', file: 'storagecluster.yaml', caption: 'Indicative skeleton: the ODF console generates it, prefer it for the first installation.', code: "apiVersion: ocs.openshift.io/v1\nkind: StorageCluster\nmetadata:\n  name: ocs-storagecluster\n  namespace: openshift-storage\nspec:\n  storageDeviceSets:\n  - name: ocs-deviceset\n    count: 1\n    replica: 3\n    portable: false\n    dataPVCTemplate:\n      spec:\n        accessModes: [ReadWriteOnce]\n        volumeMode: Block\n        storageClassName: localblock\n        resources:\n          requests:\n            storage: 1\n        # actual size: depends on the discovered local PVs" },
        { t: 'cmds', items: [
          ['oc get storagecluster -n openshift-storage', 'Expected phase: <code>Ready</code>'],
          ['oc get pods -n openshift-storage', 'osd, mon, mgr, mds, noobaa pods'],
          ['oc get cephcluster -n openshift-storage', 'Ceph health as seen by Rook']
        ] }
      ]
    },
    {
      title: "Snapshots and clones",
      blocks: [
        { t: 'text', html: "<p>CSI snapshots go through three objects: <b>VolumeSnapshotClass</b> (driver + deletion policy), <b>VolumeSnapshot</b> (the request), <b>VolumeSnapshotContent</b> (the result). <b>Restore</b> and <b>clone</b> are done with a PVC whose <code>dataSource</code> points to the source.</p>" },
        { t: 'code', lang: 'yaml', file: 'snapshot.yaml', code: "apiVersion: snapshot.storage.k8s.io/v1\nkind: VolumeSnapshot\nmetadata:\n  name: db-snap-1\nspec:\n  volumeSnapshotClassName: csi-vsphere-vsc   # name of your VolumeSnapshotClass\n  source:\n    persistentVolumeClaimName: db-data\n---\napiVersion: v1\nkind: PersistentVolumeClaim\nmetadata:\n  name: db-data-restored\nspec:\n  accessModes: [ReadWriteOnce]\n  resources:\n    requests:\n      storage: 10Gi\n  dataSource:\n    name: db-snap-1\n    kind: VolumeSnapshot\n    apiGroup: snapshot.storage.k8s.io" },
        { t: 'callout', kind: 'trap', html: "A CSI snapshot lives <b>on the same backend</b> as the volume: if the array or pool is lost, snapshot and data go together. It is <b>not</b> a backup. Backup and migration: module 11." },
        { t: 'callout', kind: 'tip', html: "Clone: same PVC YAML with <code>dataSource: {kind: PersistentVolumeClaim, name: …}</code>, in the <b>same namespace</b> and the same StorageClass." }
      ]
    },
    {
      title: "Volume expansion",
      layout: 'two',
      blocks: [
        { t: 'flow', nodes: [
          'StorageClass: allowVolumeExpansion',
          { label: 'Edit the PVC', sub: 'spec.resources.requests.storage', hl: true },
          'Volume resize (controller)',
          { label: 'Filesystem resize', sub: 'node plugin' }
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc patch pvc db-data -p '{\"spec\":{\"resources\":{\"requests\":{\"storage\":\"50Gi\"}}}}'\n$ oc get pvc db-data -w\n$ oc describe pvc db-data\n# Conditions: Resizing / FileSystemResizePending" },
        { t: 'bullets', items: [
          "You can <b>grow</b>, never shrink.",
          "Online expansion has been stable since K8s 1.24: it depends on the <code>EXPAND_VOLUME</code> capability declared by the CSI driver (to be checked for yours).",
          "If the StorageClass does not allow it, you can edit the SC (the field is modifiable), then try again."
        ] },
        { t: 'callout', kind: 'warn', html: "With LSO (static PVs), expansion does not exist: the PV has the size of the disk." }
      ]
    },
    {
      title: "Ephemeral storage and ephemeral-storage",
      blocks: [
        { t: 'text', html: "<p>Image layers, container logs, <code>emptyDir</code>s and the writable layer consume the node disk (<code>/var</code> on RHCOS). K8s can <b>request and limit</b> it.</p>" },
        { t: 'code', lang: 'yaml', file: 'pod-ephemeral.yaml', code: "spec:\n  containers:\n  - name: app\n    image: registry.example.com/app:1.0\n    resources:\n      requests:\n        ephemeral-storage: 1Gi\n      limits:\n        ephemeral-storage: 2Gi\n    volumeMounts:\n    - name: scratch\n      mountPath: /scratch\n  volumes:\n  - name: scratch\n    emptyDir:\n      sizeLimit: 1Gi" },
        { t: 'bullets', frag: true, items: [
          "Exceeding the limit: the pod is <b>evicted (Evicted)</b>.",
          "A <code>ResourceQuota</code> can cap <code>requests.ephemeral-storage</code> per project.",
          "<i>Generic ephemeral volumes</i> offer a disposable CSI volume tied to the pod's life cycle."
        ] },
        { t: 'callout', kind: 'onprem', html: "Size the nodes' system disk accordingly (images + logs + emptyDir). A saturated 120 GB disk causes <code>DiskPressure</code> and cascading evictions." }
      ]
    },
    {
      title: "etcd and disks: latency above all",
      tag: 'critical',
      blocks: [
        { t: 'text', html: "<p>etcd writes its journal (WAL) with an <code>fdatasync</code> on every commit: <b>the disk's synchronous write latency determines cluster stability</b>. A slow disk = leader elections, slow API, Degraded operators.</p>" },
        { t: 'bullets', items: [
          "Target: p99 of <code>etcd_disk_wal_fsync_duration_seconds</code> <b>below 10 ms</b>.",
          "<b>Dedicated SSD or NVMe</b> disk for the masters, no saturated shared network storage.",
          "Also watch <code>etcd_disk_backend_commit_duration_seconds</code> and the etcd monitoring alerts (module 05)."
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', caption: 'Reference fio test from the Red Hat docs, to run on a master before going to production.', code: "$ oc debug node/master-0\nsh-5.1# chroot /host\n# mkdir -p /var/lib/etcd-test && cd /var/lib/etcd-test\n# fio --rw=write --ioengine=sync --fdatasync=1 --directory=. --size=22m --bs=2300 --name=etcd-test\n# Check fsync/fdatasync: 99th percentile < 10 ms" },
        { t: 'callout', kind: 'onprem', html: "On vSphere, place the master VMs on a low-latency SSD/NVMe datastore, with <b>resource reservation</b>. A datastore shared with noisy VMs is the #1 cause of etcd instability." },
        { t: 'callout', kind: 'cloud', html: "In the cloud, choose volumes with guaranteed IOPS for the masters. On managed offerings (ROSA/ARO), etcd is no longer your problem." }
      ]
    },
    {
      title: "Internal registry and its storage",
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          "Configured by the <code>configs.imageregistry.operator.openshift.io/cluster</code> object.",
          "<b>On bare metal and “none” platform, it is disabled</b> (<code>managementState: Removed</code>) until you provide storage.",
          "<b>RWX PVC</b> storage (CephFS, NFS) for several replicas, or <b>S3 object</b> (NooBaa/RGW, MinIO, S3 array).",
          "RWO PVC: a single replica and <code>rolloutStrategy: Recreate</code>.",
          "<code>emptyDir</code>: <b>lab only</b>, images disappear when the pod restarts."
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "# Lab: emptyDir (not persistent)\n$ oc patch configs.imageregistry.operator.openshift.io cluster \\\n  --type merge \\\n  -p '{\"spec\":{\"managementState\":\"Managed\",\"storage\":{\"emptyDir\":{}}}}'\n\n# Production: PVC (the claim is created if empty)\n$ oc edit configs.imageregistry.operator.openshift.io cluster\n#   spec.storage.pvc.claim: \"\"\n$ oc get pvc -n openshift-image-registry" },
        { t: 'callout', kind: 'cloud', wide: true, html: "In the cloud, the registry is configured automatically on the provider's object storage (S3, Azure Blob, GCS). No action required." }
      ]
    },
    {
      title: "Monitoring and logging storage",
      blocks: [
        { t: 'text', html: "<p>By default, <b>Prometheus and Alertmanager have no persistent storage</b> on a freshly installed cluster: when the pod restarts, the metrics are lost. You have to ask for it in the monitoring ConfigMap (full configuration: module 05).</p>" },
        { t: 'code', lang: 'yaml', file: 'cluster-monitoring-config.yaml', code: "apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: cluster-monitoring-config\n  namespace: openshift-monitoring\ndata:\n  config.yaml: |\n    prometheusK8s:\n      retention: 15d\n      volumeClaimTemplate:\n        spec:\n          storageClassName: fast-block\n          resources:\n            requests:\n              storage: 100Gi\n    alertmanagerMain:\n      volumeClaimTemplate:\n        spec:\n          storageClassName: fast-block\n          resources:\n            requests:\n              storage: 2Gi" },
        { t: 'callout', kind: 'ocp', html: "<b>Logging</b>: log storage is now <b>S3 object</b> storage via <b>LokiStack</b> (Loki Operator). Plan a bucket (ODF/NooBaa, MinIO, S3 array) in addition to a PVC for the Loki components. Elasticsearch is no longer managed by logging since Logging 6 (removed, not just deprecated): storage = LokiStack, collection = Vector." },
        { t: 'callout', kind: 'tip', html: "Put monitoring on <b>fast block</b> storage (RWO). Prometheus TSDBs don't work well on NFS." }
      ]
    },
    {
      title: "Permissions: SCC, random UID and fsGroup",
      tag: 'pitfall #2',
      blocks: [
        { t: 'text', html: "<p>Under <code>restricted-v2</code>, your container gets a <b>random UID</b> taken from the namespace range, and an <b>fsGroup</b> from the group range. The volume is mounted with this GID: the <code>chown</code>/<code>chmod</code> in your Dockerfile are useless.</p>" },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc get ns demo -o yaml | grep sa.scc\n#   openshift.io/sa.scc.mcs: s0:c26,c15\n#   openshift.io/sa.scc.supplemental-groups: 1000680000/10000\n#   openshift.io/sa.scc.uid-range: 1000680000/10000\n\n$ oc exec pod/db-0 -- id\nuid=1000680000(1000680000) gid=0(root) groups=0(root),1000680000" },
        { t: 'bullets', frag: true, items: [
          "<b>Block/CSI with fsGroup</b>: the kubelet applies the GID to the volume. <code>fsGroupChangePolicy: OnRootMismatch</code> avoids a slow recursive walk on large volumes.",
          "<b>NFS</b>: <code>fsGroup</code> is not applied. Permissions are set on the export side (<code>supplementalGroups</code>, export GID, <code>anyuid</code> as a last resort).",
          "<b>SELinux</b>: relabeling volumes can be slow on large volumes; <code>Permission denied</code> while the unix permissions are right = think of the SELinux context."
        ] },
        { t: 'callout', kind: 'trap', html: "Reflex to avoid: <code>anyuid</code> “to make it work”. Start by checking <code>id</code> in the pod, the <code>fsGroup</code> and the mount point permissions. SCC in detail: module 09." }
      ]
    },
    {
      title: "Troubleshooting: the 3 classic failures",
      blocks: [
        { t: 'table', head: ['Symptom', 'Frequent causes', 'Where to look'], rows: [
          ['<b>PVC Pending</b>', "No default StorageClass; <code>WaitForFirstConsumer</code> without a pod; backend full; quota; topology with no eligible node; CSI down", "<code>oc describe pvc</code> (Events), <code>openshift-cluster-csi-drivers</code> pods"],
          ['<b>Multi-Attach error</b>', "RWO volume still attached to the old node (rolling update, <i>NotReady</i> node)", "<code>oc describe pod</code>, <code>oc get volumeattachment</code>"],
          ['<b>PVC / PV in Terminating</b>', "A pod still uses the PVC (<code>kubernetes.io/pvc-protection</code> finalizer)", "<code>oc get pods</code> mounting the PVC, <code>oc get pvc -o yaml</code>"]
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc describe pvc db-data\n$ oc get events --sort-by=.lastTimestamp\n$ oc get volumeattachment\n$ oc logs -n openshift-cluster-csi-drivers <pod-controller> -c csi-driver" },
        { t: 'callout', kind: 'warn', html: "Removing a finalizer by hand (<code>oc patch … finalizers</code>) is a <b>last resort</b>: you risk leaving an orphan volume on the backend or, worse, detaching it from a node that is still using it." }
      ]
    },
    {
      title: "Quiz",
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: "You do a rolling update of a Deployment with an RWO PVC. The new pod stays in ContainerCreating with “Multi-Attach error”. Why?", options: [
          "The PVC is too small",
          "The volume is still attached to the old pod's node, and the new pod is scheduled on another node",
          "The StorageClass is not the default",
          "SELinux blocks the mount"
        ], answer: 1, explain: "RWO means a single <b>node</b>. Use the <code>Recreate</code> strategy, a StatefulSet, or an RWX volume." },
        { t: 'quiz', q: "What is the role of <code>volumeBindingMode: WaitForFirstConsumer</code>?", options: [
          "Wait for the user to confirm the creation of the PV",
          "Delay provisioning until a pod is scheduled, to respect its topology",
          "Prevent several pods from using the volume",
          "Encrypt the volume on first write"
        ], answer: 1, explain: "The volume is created <b>after</b> the node is chosen: essential with local (LVMS, LSO) or zonal backends. A PVC therefore stays <i>Pending</i> as long as no pod uses it: this is normal." },
        { t: 'quiz', q: "Your pod writes to an NFS volume and gets “Permission denied”. What do you check first?", options: [
          "That <code>fsGroup</code> is set: the kubelet will chown the export",
          "The NFS export's permissions and UID/GID mapping, because fsGroup is not applied on NFS",
          "That the <code>privileged</code> SCC is assigned",
          "That the PVC is RWO"
        ], answer: 1, explain: "With NFS, <code>fsGroup</code> is not applied by the kubelet. Permissions are set on the NFS server side (squash, GID), not with a more permissive SCC." }
      ]
    },
    {
      title: "Lab: PVC, snapshot, restore, expansion, permissions",
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'Full life cycle of a volume', goal: "Cluster with a CSI StorageClass that supports snapshot and expansion (LVMS, ODF or vSphere CSI). Replace &lt;SC&gt; with its name.", steps: [
          "Prerequisites: environment E1 (SNO with LVMS, or a cluster with a CSI StorageClass), see module 00",
          "List what exists: <code>oc get sc</code>, <code>oc get csidriver</code>, <code>oc get volumesnapshotclass</code>. Which one is the default?",
          "Create a project: <code>oc new-project lab-storage</code>",
          "Create a 1Gi RWO PVC on <code>&lt;SC&gt;</code>: <i>Pending</i>? Read <code>oc describe pvc</code> and explain why (WaitForFirstConsumer).",
          "Start a pod that mounts the PVC and writes a file: <code>oc run writer --image=registry.access.redhat.com/ubi9/ubi --command -- sleep infinity</code>, then add the volume (YAML), and check <code>id</code> and <code>ls -ld</code> of the mount point.",
          "Create a <code>VolumeSnapshot</code> of the PVC, wait for <code>readyToUse: true</code>, then restore it into a new PVC (<code>dataSource</code>).",
          "Grow the PVC to 2Gi with <code>oc patch pvc</code> and check the size with <code>df -h</code> in the pod.",
          "(bonus) Cause an error: delete the PVC while the pod is running. Observe <i>Terminating</i> and the finalizer, then delete the pod.",
          "Clean up: <code>oc delete project lab-storage</code>. What happens to the PV? (look at the <code>reclaimPolicy</code>)"
        ] }
      ]
    }
  ],
  takeaways: [
    "On on-prem OCP, the storage backend is an architecture choice to make before installation: vSphere CSI, LVMS, LSO, array via vendor CSI or ODF.",
    "WaitForFirstConsumer, allowVolumeExpansion and reclaimPolicy are decided in the StorageClass; RWO means one node, not one pod.",
    "ODF brings block, file and object but is expensive in CPU, RAM, disks and network; count 3 nodes minimum.",
    "etcd requires a fast disk (fsync p99 under 10 ms); registry, monitoring and logging each have their own storage to configure.",
    "Random UID + fsGroup explain most “Permission denied” errors on volumes; NFS requires setting permissions on the server side.",
    "A snapshot is not a backup: see module 11."
  ]
});
