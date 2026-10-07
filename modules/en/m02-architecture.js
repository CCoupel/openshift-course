COURSE.add({
  id: 'm02', lang: 'en', num: 2, emoji: '🏗️',
  title: 'Architecture',
  source: '658e3eb335ac',
  tagline: 'Under the hood: nodes, immutable OS, etcd, operators and the Machine API. Who does what, and who talks to whom.',
  duration: '≈ 60 min + lab 20 min',
  objectives: [
    'Describe an OCP cluster: control plane, workers, infra nodes',
    'Understand RHCOS, rpm-ostree, CRI-O and Ignition',
    'Explain the role of etcd, the CVO, the Cluster Operators and the Machine Config Operator',
    'Choose a topology (HA, compact, SNO, Hosted Control Planes)',
    'Follow the path of a request and know the key ports of the cluster'
  ],
  slides: [
    {
      title: 'Cluster overview',
      blocks: [
        { t: 'text', html: '<p>A standard OCP cluster is <b>3 control planes</b> + <b>N workers</b>, possibly with additional <b>infra nodes</b> (workers labeled to host the platform services).</p>' },
        { t: 'layers', frag: true, items: [
          { name: '🧠 Control plane (3 masters)', desc: 'kube-apiserver, etcd, scheduler, controllers, operators. RHCOS mandatory.', hl: true },
          { name: '🏗️ Infra nodes (optional)', desc: 'Routers, registry, monitoring, logging: labeled <code>infra</code>' },
          { name: '⚙️ Workers', desc: 'Your application workloads (kubelet + CRI-O + OVN-Kubernetes)' },
          { name: '🔌 Infrastructure', desc: 'Bare metal / vSphere / cloud: network, DNS, load balancers, storage', base: true }
        ] },
        { t: 'callout', kind: 'k8s', html: 'Nothing exotic: it is the same split as your kubeadm cluster, but the control plane is <b>managed by operators</b> rather than by manifests you edit.' }
      ]
    },
    {
      title: 'Node roles',
      blocks: [
        { t: 'table', head: ['Role', 'Label', 'Contains', 'Good to know'], rows: [
          ['<b>master</b> (control plane)', '<code>node-role.kubernetes.io/master</code> (and <code>control-plane</code>)', 'apiserver, etcd, scheduler, controller-manager, operators', '<code>NoSchedule</code> taint by default. RHCOS only.'],
          ['<b>worker</b>', '<code>node-role.kubernetes.io/worker</code>', 'Application pods', 'RHCOS mandatory: RHEL compute nodes deprecated in 4.16, <b>removed as of 4.19</b> (RHCOS image layering replaces adding packages)'],
          ['<b>infra</b>', '<code>node-role.kubernetes.io/infra</code>', 'Router, registry, Prometheus, logging', 'Convention: not a native role, you create it yourself'],
          ['<b>arbiter</b> / edge', 'depending on topology', '2-node topologies', 'Arbiter: GA in 4.20; 2 nodes with fencing: Technology Preview in 4.20 (GA in 4.22: to be verified)']
        ] },
        { t: 'callout', kind: 'trap', html: 'A node is a “worker” because it carries the <code>worker</code> label <b>and</b> belongs to the <code>worker</code> MachineConfigPool. The label alone does not change the OS configuration: the pool is what matters (MCO slide).' }
      ]
    },
    {
      title: 'Diagram of an on-prem cluster',
      blocks: [
        { t: 'diagram', caption: 'DNS and the two load balancers (API, Ingress) are on you in UPI; in on-prem IPI, keepalived VIPs replace them.', html: '<svg viewBox="0 0 760 330" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cluster diagram" style="width:100%;height:auto;font-family:inherit;font-size:13px">' +
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
          '<text x="65" y="262">Browsers</text><text x="65" y="278" fill="var(--muted)">client apps</text>' +
          '<text x="235" y="42">API LB</text><text x="235" y="58" fill="var(--muted)">6443 + 22623</text>' +
          '<text x="235" y="262">Ingress LB</text><text x="235" y="278" fill="var(--muted)">80 + 443</text>' +
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
      title: 'RHCOS: an OS built for K8s',
      layout: 'two',
      blocks: [
        { t: 'bullets', frag: true, items: [
          '<b>Red Hat Enterprise Linux CoreOS</b>: minimal, <b>immutable</b> OS (<code>/usr</code> read-only).',
          '<b>Transactional</b> updates via <code>rpm-ostree</code>: a complete image, with rollback at reboot.',
          '<b>CRI-O</b> as the runtime (not Docker, not containerd): designed for Kubernetes.',
          '<b>Ignition</b> configures the node at first boot (disks, files, systemd units, users).',
          'One OS image per release: <b>it is embedded in the release image</b> and updated by the cluster.'
        ] },
        { t: 'callout', kind: 'ocp', html: 'The OS is part of the cluster: when you run <code>oc adm upgrade</code>, nodes reboot onto the <b>new OS image</b>. You don\'t run a separate <code>dnf update</code>.' },
        { t: 'callout', kind: 'trap', wide: true, html: 'No <code>yum install tcpdump</code> on a node! Use <code>oc debug node/&lt;n&gt;</code> (tooled image) or <code>toolbox</code>. Local changes outside MachineConfig are fragile and can push the pool into Degraded.' }
      ]
    },
    {
      title: 'Ignition, rpm-ostree, CRI-O in practice',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Boot 1', sub: 'generic RHCOS image' },
          { label: 'Ignition', sub: 'reads its config (HTTP / metadata / guestinfo)', hl: true },
          { label: 'Config applied', sub: 'disks, files, units' },
          { label: 'kubelet + CRI-O', sub: 'the node joins the cluster' },
          { label: 'MCD', sub: 'Machine Config Daemon takes over' }
        ], caption: 'Ignition runs only <b>once</b>, at first boot. After that, the MCD handles changes.' },
        { t: 'cmds', items: [
          ['oc debug node/<n> -- chroot /host rpm-ostree status', 'Deployed OS image, version, previous deployment'],
          ['oc debug node/<n> -- chroot /host crictl ps', 'Containers seen by CRI-O on the node'],
          ['oc adm node-logs <n> -u kubelet', 'Logs of a node systemd unit'],
          ['oc get node <n> -o wide', 'Kernel version, OS image, runtime (CONTAINER-RUNTIME)']
        ] },
        { t: 'callout', kind: 'onprem', html: 'On bare metal / vSphere in UPI, <b>you</b> provide the Ignition file at first boot (ISO, PXE, vSphere <code>guestinfo</code>). In IPI, the installer takes care of it.' }
      ]
    },
    {
      title: 'etcd: the heart you must never damage',
      layout: 'two',
      blocks: [
        { t: 'bullets', frag: true, items: [
          'Key-value store of <b>all</b> cluster state, deployed as <b>static pods</b> on the 3 masters and managed by the <b>etcd Operator</b>.',
          '<b>Quorum = ⌊n/2⌋ + 1</b>: with 3 members, 2 must be alive. You tolerate <b>1 failure</b>.',
          'Going to 2 members protects against nothing (quorum = 2). Neither does 4 (quorum = 3, tolerance 1): <b>odd number</b>.',
          'Very sensitive to <b>disk latency</b> (fsync) and to network latency between masters.',
          'Without quorum: API read-only, then unavailable.'
        ] },
        { t: 'table', head: ['Members', 'Quorum', 'Failures tolerated'], rows: [
          ['1 (SNO)', '1', '0'],
          ['3', '2', '1'],
          ['5', '3', '2 (non-standard in OCP)']
        ] },
        { t: 'callout', kind: 'onprem', wide: true, html: 'On-prem, <b>disk is your #1 risk</b>: local SSD/NVMe or a dedicated fast LUN, never a saturated shared datastore. Classic target: <code>fdatasync</code> p99 under ~10 ms (value to be confirmed in the docs for your version). On vSphere, plan a resource reservation for the master VMs.' }
      ]
    },
    {
      title: 'etcd: inspect and protect',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: `# etcd pods (one per master) and operator status
$ oc get pods -n openshift-etcd -l app=etcd
$ oc get co etcd

# Member health, from the etcdctl container of an etcd pod
$ oc rsh -n openshift-etcd -c etcdctl etcd-master-0
sh-5$ etcdctl endpoint status --cluster -w table
sh-5$ etcdctl endpoint health --cluster -w table` },
        { t: 'callout', kind: 'tip', html: 'A backup script is provided on the masters: <code>/usr/local/bin/cluster-backup.sh</code>, run via <code>oc debug --as-root node/master-0</code> then <code>chroot /host</code>. The topic is covered in module 11 (Backup &amp; DR).' },
        { t: 'callout', kind: 'trap', html: 'Don\'t resize/delete etcd members by hand, and don\'t restore a snapshot without following the official procedure: a badly done restore breaks the whole cluster.' }
      ]
    },
    {
      title: 'The control plane: who serves which API?',
      blocks: [
        { t: 'table', head: ['Component', 'Namespace', 'Role'], rows: [
          ['<b>kube-apiserver</b>', '<code>openshift-kube-apiserver</code>', 'Standard Kubernetes API (static pod, port 6443). Single entry point.'],
          ['<b>openshift-apiserver</b>', '<code>openshift-apiserver</code>', '“Historical” OCP APIs: Route, ImageStream, Build, Project… (aggregated APIs)'],
          ['<b>oauth-apiserver</b>', '<code>openshift-oauth-apiserver</code>', 'Stores and serves User, Group, OAuthAccessToken, OAuthClient…'],
          ['<b>oauth-openshift</b>', '<code>openshift-authentication</code>', 'The OAuth server (login, token issuance, Identity Providers)'],
          ['<b>kube-controller-manager</b>, <b>kube-scheduler</b>', '<code>openshift-kube-*</code>', 'Controllers and placement, as in K8s (static pods)'],
          ['<b>openshift-controller-manager</b>', '<code>openshift-controller-manager</code>', 'OCP controllers: builds, routes, deployer config, SCC…']
        ] },
        { t: 'callout', kind: 'ocp', html: 'OCP APIs are <b>aggregated</b>: the kube-apiserver redirects (APIService) groups such as <code>route.openshift.io</code> to openshift-apiserver. For the client, it is transparent. The exact split changes between versions: to be verified in the release notes.' }
      ]
    },
    {
      title: 'The path of a request',
      blocks: [
        { t: 'flow', nodes: [
          'oc / kubectl',
          { label: 'DNS', sub: 'api.cluster.domain' },
          { label: 'API LB', sub: 'TCP 6443', hl: true },
          { label: 'kube-apiserver', sub: 'authn → authz → admission' },
          { label: 'etcd', sub: 'persistence (quorum)', hl: true }
        ], caption: 'Nodes, for their part, go through <b>api-int</b> (internal entry point): same path, different DNS name.' },
        { t: 'bullets', frag: true, items: [
          '<b>Authn</b>: client certificate, or OAuth token (validated via the aggregated OAuth APIs).',
          '<b>Authz</b>: RBAC (module 06). <b>Admission</b>: SCC (module 09), quotas, webhooks…',
          'For a <code>route.openshift.io</code> resource: the apiserver relays to <b>openshift-apiserver</b>, which also writes to etcd.',
          'The LB does <b>TCP passthrough</b>: TLS is terminated by the kube-apiserver itself.'
        ] },
        { t: 'callout', kind: 'onprem', html: 'The API LB is a <b>SPOF</b> if you build it badly. It must run a health check (<code>/readyz</code> on 6443) and remove a master that is not ready, otherwise the API answers “intermittently”.' }
      ]
    },
    {
      title: 'API LB, DNS and VIPs: the on-prem sticking point',
      layout: 'two',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '🏢 UPI / platform none', items: ['External LB to provide (HAProxy, F5, NSX-ALB…)', 'DNS: <code>api</code>, <code>api-int</code>, <code>*.apps</code>', 'One L4 LB for 6443/22623, one for 80/443', 'You manage the HA of the LB itself'] },
          right: { title: '🏢 IPI bare metal / vSphere', items: ['Two <b>VIPs</b>: <code>apiVIPs</code> and <code>ingressVIPs</code>', 'keepalived (VRRP) makes them float between nodes', 'An internal haproxy spreads the load across masters', 'DNS still to be created, pointing to the VIPs'] },
          verdict: 'In both cases, DNS is yours. IPI VIPs require a common L2 domain for VRRP. Implementation at installation: module 03.' },
        { t: 'callout', kind: 'cloud', wide: true, html: 'In the cloud (IaaS), the installer creates the <b>native LBs</b> (ELB, Azure LB…) and the DNS records. No keepalived VIP, no DNS zone to build by hand.' }
      ]
    },
    {
      title: 'CVO and Cluster Operators',
      blocks: [
        { t: 'text', html: '<p>The <b>Cluster Version Operator</b> reads the <b>release image</b> (list of the versions of all components) and reconciles each <b>Cluster Operator</b>. Each operator publishes a <code>ClusterOperator</code> object with its conditions.</p>' },
        { t: 'table', head: ['Condition', 'Meaning', 'Reaction'], rows: [
          ['<b>Available</b>', 'The service is provided', 'If <code>False</code>: real outage'],
          ['<b>Progressing</b>', 'A change is in progress', 'Normal during an upgrade'],
          ['<b>Degraded</b>', 'It works badly or half-way', 'Read the message, it is your starting point'],
          ['<b>Upgradeable</b>', 'The minor update is allowed', '<code>False</code> blocks the next minor']
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: `$ oc get clusterversion
$ oc get co
$ oc describe co authentication     # message of the Degraded condition
$ oc adm release info                 # contents of the current release` }
      ]
    },
    {
      title: 'Machine API: declarative nodes',
      blocks: [
        { t: 'text', html: '<p>The <b>Machine API Operator</b> (namespace <code>openshift-machine-api</code>) provides the equivalent of Cluster API: one node = one <b>Machine</b> object, one homogeneous group = one <b>MachineSet</b> (like a ReplicaSet of machines).</p>' },
        { t: 'flow', nodes: [
          { label: 'MachineSet', sub: 'replicas: N' },
          { label: 'Machine', sub: 'a VM or a server' },
          { label: 'Provider', sub: 'vSphere / Metal3 / cloud', hl: true },
          { label: 'Node', sub: 'joins the cluster' }
        ] },
        { t: 'cmds', items: [
          ['oc get machinesets -n openshift-machine-api', 'Machine groups and replicas'],
          ['oc get machines -n openshift-machine-api', 'One Machine per node (phase, provider ID)'],
          ['oc scale machineset <ms> --replicas=5 -n openshift-machine-api', 'Add workers in one command'],
          ['oc get bmh -n openshift-machine-api', 'BareMetalHost (Metal3) in bare metal IPI']
        ] },
        { t: 'callout', kind: 'cloud', html: 'In the cloud, scaling a MachineSet <b>really creates VMs</b> through the provider API, and the <b>ClusterAutoscaler</b> + <b>MachineAutoscaler</b> adjust the number of nodes on their own. That is the great comfort of the cloud.' }
      ]
    },
    {
      title: 'Machine API on-prem: it depends on the platform',
      layout: 'two',
      blocks: [
        { t: 'table', wide: true, head: ['Installation', 'Machine API?', 'Adding a worker'], rows: [
          ['<b>IPI vSphere</b>', 'Yes (vSphere provider)', 'Scale the MachineSet, template clone'],
          ['<b>IPI bare metal</b>', 'Yes (Metal3 / BareMetalHost)', 'Add a <code>BareMetalHost</code> then scale: provisioning via BMC'],
          ['<b>UPI vSphere</b>', 'No Machine by default', 'Clone the VM, provide <code>worker.ign</code>, approve the CSRs (to be verified: adding the Machine API afterwards may be possible)'],
          ['<b>Agent / Assisted, platform none</b>', 'No', 'Boot the server on the ISO, approve the CSRs'],
          ['<b>Cloud IPI</b> ☁️', 'Yes, full + autoscaling', 'Scale the MachineSet']
        ] },
        { t: 'callout', kind: 'onprem', wide: true, html: 'Without the Machine API, <code>oc get machines</code> can be empty: <b>that is normal</b>, not a bug. There is then no MachineHealthCheck or native autoscaling, and remediating a dead node is a human process. A bare metal Machine API without BMO/Metal3 does not exist.' }
      ]
    },
    {
      title: 'MachineHealthCheck: self-healing',
      blocks: [
        { t: 'text', html: '<p>A <b>MachineHealthCheck</b> watches the nodes of a set of machines and <b>deletes the Machine</b> if the node stays unhealthy; the MachineSet recreates one. It therefore requires a working Machine API.</p>' },
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
        { t: 'callout', kind: 'trap', html: '<code>maxUnhealthy</code> is your safeguard: if too many nodes are unhealthy at the same time (a network outage, for example), the MHC <b>stops remediating</b> so as not to destroy everything. Never set it to 100%. On bare metal, remediation may involve a reboot via BMC: check the docs for your version.' }
      ]
    },
    {
      title: 'Machine Config Operator: the declarative OS',
      blocks: [
        { t: 'layers', frag: true, items: [
          { name: 'MachineConfig', desc: 'A fragment of OS config (files, systemd units, kernel args…) with a target role' },
          { name: 'MachineConfigPool', desc: 'A group of nodes (<code>master</code>, <code>worker</code>, <code>infra</code>…) and their MachineConfigs', hl: true },
          { name: 'rendered-&lt;pool&gt;-&lt;hash&gt;', desc: '<b>Merged</b>, immutable MachineConfig generated by the controller at each change', hl: true },
          { name: 'Machine Config Daemon (MCD)', desc: 'DaemonSet on each node: applies, drains, reboots if needed' },
          { name: 'Machine Config Server (MCS)', desc: 'Serves Ignition to new nodes on port 22623', base: true }
        ] },
        { t: 'cmds', items: [
          ['oc get mc', 'MachineConfigs, including the <code>rendered-*</code>'],
          ['oc get mcp', 'Pools: UPDATED / UPDATING / DEGRADED, machine count'],
          ['oc describe mcp worker', 'Which rendered is targeted, which nodes are lagging']
        ] }
      ]
    },
    {
      title: 'Applying a MachineConfig (and its effects)',
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
      version: 3.2.0   # version supported by your release
    storage:
      files:
      - path: /etc/motd
        mode: 0644
        overwrite: true
        contents:
          source: data:,Noeud%20gere%20par%20MCO%0A` },
        { t: 'bullets', frag: true, items: [
          'The <code>role</code> label chooses the targeted <b>pool</b>.',
          'A new <code>rendered-worker-…</code> is generated, then nodes are processed <b>one at a time</b> (<code>maxUnavailable</code> = 1 by default): <b>drain → apply → reboot</b>.',
          'To pause: <code>oc patch mcp/worker --type merge -p \'{"spec":{"paused":true}}\'</code> (don\'t forget to resume!).',
          'Some changes can avoid the reboot (node disruption policies, available since 4.17 via the <code>MachineConfiguration</code> “cluster” resource); others always force a reboot. Common MachineConfigs (chrony, kargs): module 04.'
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: 'A MachineConfig means <b>a rolling reboot of a whole pool</b>. 3 masters = 3 successive reboots; 40 workers = long. Group your changes, schedule them, and check the PodDisruptionBudgets beforehand. A <b>Degraded</b> pool (file modified by hand, bad Ignition) also blocks upgrades.' }
      ]
    },
    {
      title: 'Deployment topologies',
      blocks: [
        { t: 'table', head: ['Topology', 'Nodes', 'HA?', 'Use'], rows: [
          ['<b>Standard (3+N)</b>', '3 masters + N workers (+ infra)', 'Yes', 'General production'],
          ['<b>3-node compact</b>', '3 <b>schedulable</b> masters, 0 workers', 'Yes (control plane)', 'Small sites, lab, edge'],
          ['<b>SNO</b> (Single Node)', '1 node: master + worker', 'No', 'Edge, telecom, lab'],
          ['<b>2 nodes</b> (arbiter / fencing)', '2 nodes + arbiter or fencing', 'Partial', 'Edge; arbiter GA in 4.20, fencing in Technology Preview in 4.20 (GA in 4.22: to be verified)'],
          ['<b>Hosted Control Planes</b>', 'Control plane as pods, separate workers', 'Yes', 'Cluster fleets, densification']
        ] },
        { t: 'callout', kind: 'tip', html: 'Compact: in <code>install-config.yaml</code>, <code>compute.replicas: 0</code>; the installer then makes the masters schedulable (<code>mastersSchedulable</code>). Plan CPU/RAM accordingly: the operators already consume a lot.' },
        { t: 'callout', kind: 'warn', html: 'SNO = no HA: a reboot (or a MachineConfig) interrupts <b>everything</b>, control plane included. Updates are planned outages.' }
      ]
    },
    {
      title: 'Hosted Control Planes (HyperShift)',
      layout: 'two',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '🧠 Standard', items: ['3 dedicated masters (VMs or servers)', 'etcd on the masters', 'One cluster = 3 control plane machines', 'Simple to reason about'] },
          right: { title: '☁️ Hosted Control Planes', items: ['Control plane = <b>pods</b> in a “management” cluster', 'etcd per hosted cluster, in pods', 'Separate workers (agent, KubeVirt, vSphere…)', 'Fast cluster creation, fewer resources'] },
          verdict: 'Ideal for many small clusters; ROSA HCP is its managed version.' },
        { t: 'callout', kind: 'onprem', wide: true, html: 'On-prem, HCP relies on the management cluster (with MCE/ACM) and typically the <b>Agent</b> (bare metal) or <b>KubeVirt</b> provider. In 4.20: bare metal via the Agent provider, OpenShift Virtualization (KubeVirt); Agent outside bare metal in Technology Preview; support evolves fast, re-read the “Hosted control planes” docs.' }
      ]
    },
    {
      title: 'Infra nodes',
      blocks: [
        { t: 'text', html: '<p>An <b>infra</b> node is a worker dedicated to platform services: <b>routers, internal registry, monitoring, logging</b>. Benefit: isolating these workloads and, depending on the contract, not counting them in the subscription (check with your Red Hat subscription).</p>' },
        { t: 'code', lang: 'bash', file: 'terminal', code: `# Infra role, keeping the worker role (double label infra,worker)
$ oc label node infra-0 node-role.kubernetes.io/infra=

# Taint so that apps don't land there
$ oc adm taint nodes infra-0 node-role.kubernetes.io/infra=reserved:NoSchedule` },
        { t: 'bullets', frag: true, items: [
          '<b>Keep the <code>worker</code> label</b>: the 4.20 docs recommend keeping the double label <code>infra,worker</code> and managing placement with taints and tolerations; the <code>infra</code> label is enough to not count the node in the subscription. If you remove <code>worker</code>, a <b>custom MachineConfigPool</b> is mandatory, otherwise the MCO does not manage the node.',
          'For a dedicated configuration, create a <b>MachineConfigPool <code>infra</code></b> (<code>machineConfigSelector</code> on worker <b>and</b> infra): beware, it <b>overrides</b> the <code>worker</code> pool configuration when they touch the same file or unit.',
          'Then move the components: <code>IngressController</code> (<code>nodePlacement</code>), registry (<code>spec.nodeSelector</code> in the operator), monitoring (<code>cluster-monitoring-config</code> ConfigMap).',
          'Pods must <b>tolerate the taint</b>: otherwise they stay Pending.'
        ] },
        { t: 'callout', kind: 'trap', html: 'Setting a label moves nothing. And the taint without tolerations in the operators\' config leaves platform pods Pending. Only the allowed platform components (list in the subscription docs) are exempt: don\'t put business apps there. Sizing, licenses and pitfalls: module 14.' }
      ]
    },
    {
      title: 'Important ports and network flows',
      blocks: [
        { t: 'table', head: ['Port', 'Flow', 'Who → whom'], rows: [
          ['<b>6443/TCP</b>', 'Kubernetes API', 'Clients, nodes → API LB → masters'],
          ['<b>22623/TCP</b>', 'Machine Config Server (Ignition)', 'New nodes → masters. <b>Never exposed outside the cluster</b>'],
          ['<b>2379-2380/TCP</b>', 'etcd client / peers', 'Masters ↔ masters'],
          ['<b>10250/TCP</b>', 'kubelet API', 'Masters → all nodes'],
          ['<b>80, 443/TCP</b>', 'Ingress (routers)', 'Clients → Ingress LB → router nodes'],
          ['<b>6081/UDP</b>', 'Geneve (OVN-Kubernetes overlay)', 'Between all nodes'],
          ['<b>500, 4500/UDP + ESP</b>', 'IPsec (if enabled)', 'Between all nodes'],
          ['<b>30000-32767</b>', 'NodePort', 'Depending on your Services'],
          ['<b>123/UDP</b>', 'NTP', 'Nodes → time servers']
        ] },
        { t: 'callout', kind: 'onprem', html: 'Open these ports between <b>all nodes</b> (firewalls, NSX/vSphere security groups). Exhaustive, up-to-date list: “Network connectivity requirements” docs. Implementation at installation: module 03. On vSphere, a distributed firewall that blocks Geneve gives you pods that cannot talk to each other across nodes.' }
      ]
    },
    {
      title: 'Quiz',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Your cluster has 3 masters and 1 is permanently lost. What happens?', options: ['The cluster is broken: no more quorum', 'The cluster works: 2 members out of 3 = quorum', 'Only the remaining master serves the API read-only', 'Workers keep running but the API is down'], answer: 1, explain: 'Quorum = 2 out of 3: one failure is tolerated. But you have no margin left: the second failure loses quorum. Replace the member quickly.' },
        { t: 'quiz', q: 'You add a MachineConfig targeting the worker pool. What do you expect?', options: ['Immediate application on all workers at the same time', 'A new rendered-worker is rendered, then workers are drained and rebooted one at a time', 'Nothing until you reboot the nodes yourself', 'Only new workers are affected'], answer: 1, explain: 'The MCO merges into a <b>rendered-worker-&lt;hash&gt;</b> then the MCD processes nodes according to <code>maxUnavailable</code> (1 by default), with drain and reboot if needed.' },
        { t: 'quiz', q: 'On a UPI bare metal cluster, <code>oc get machines -n openshift-machine-api</code> returns nothing. Why?', options: ['The Machine API is down', 'There is no provider: nodes were not created through Machines', 'You need to be cluster-admin', 'Machines are in the default namespace'], answer: 1, explain: 'Without a provider (UPI, platform none), there is no Machine/MachineSet by default. No MHC or native autoscaler: this is normal and worth knowing.' }
      ]
    },
    {
      title: 'Lab: explore the architecture',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'Dissect your cluster', goal: 'Test cluster as cluster-admin (a SNO or a lab cluster is enough).', steps: [
          'Prerequisites: environment E1 (SNO) or more, cluster-admin access, see module 00',
          'List the nodes: <code>oc get nodes -o wide</code>. Spot roles, OS image and runtime (CRI-O).',
          'Display the version and health: <code>oc get clusterversion</code> then <code>oc get co</code>. Is there a <i>Degraded</i> operator?',
          'Look for the control plane pods: <code>oc get pods -n openshift-kube-apiserver</code>, <code>-n openshift-etcd</code>, <code>-n openshift-apiserver</code>.',
          'Run <code>oc debug node/master-0</code> then <code>chroot /host</code> and <code>rpm-ostree status</code>: which OS image?',
          'In an etcd pod, run <code>etcdctl endpoint status --cluster -w table</code>: who is the leader?',
          'Look at the pools: <code>oc get mcp</code> and <code>oc get mc</code>. Identify the <code>rendered-*</code>.',
          '<code>oc get machinesets,machines -n openshift-machine-api</code>: empty or not? Explain why depending on your installation mode.',
          '(bonus) Create a simple MachineConfig (<code>/etc/motd</code>) targeting your node\'s pool and watch <code>oc get mcp -w</code>. On a SNO, it is the master pool and <b>the only node reboots</b> (API unavailable for a few minutes). Then delete it (new render, reboot possible: to be verified).'
        ] }
      ]
    }
  ],
  takeaways: [
    'Control plane = 3 RHCOS masters (apiserver, etcd, controllers); workers and infra nodes on top.',
    'RHCOS is immutable: rpm-ostree, CRI-O, Ignition at first boot, then MachineConfig via the MCO (rolling reboot).',
    'etcd needs an odd number of members and a fast disk: it is the sensitive point of on-prem.',
    'The CVO orchestrates the Cluster Operators; <code>oc get co</code> is your first diagnostic reflex.',
    'The Machine API only exists if the platform has a provider: IPI (vSphere, bare metal with Metal3) yes, UPI/none no.',
    'On-prem: API LB, DNS, VIPs and open ports are on you; in the cloud, the installer and the Machine API take care of them.'
  ]
});
