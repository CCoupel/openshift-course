COURSE.add({
  id: 'm14', lang: 'en', num: 14, emoji: '✅',
  title: 'Best practices',
  source: 'fbfa8bcc0deb',
  tagline: 'A cross-cutting go-live checklist, reusable on engagements: each item points to the module that covers it, nothing is repeated here.',
  duration: '≈ 30 min + lab 15 min',
  objectives: [
    'Use a checklist per phase (before installation, day 1, before production, operations, update, disaster recovery) where each item points to its module: these six slides are <b>for reference, outside the talk</b>',
    'Size an on-prem cluster: control plane, workers, infra nodes, density, and what Red Hat does or does not guarantee',
    'Lay down the cross-cutting architecture decisions: infra nodes and licenses, multi-tenancy, application high availability',
    'Recognize anti-patterns and frequent mistakes on engagements, and decide on a go / no-go for production',
    'Place the multi-cluster opening (ACM) and governance (who does what, support)'
  ],
  slides: [
    {
      title: 'A checklist, not a compendium',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Before installation', sub: 'DNS, LB, NTP, size' },
          { label: 'Day 1', sub: 'access, certificates', hl: true },
          { label: 'Before production', sub: 'security, monitoring', hl: true },
          { label: 'Operations', sub: 'capacity, alerts' },
          { label: 'Update', sub: 'before each upgrade' },
          { label: 'Recovery', sub: 'tested DR', hl: true }
        ], caption: 'The phases of this module\'s checklist. The installation itself is grouped with “before installation”.' },
        { t: 'bullets', frag: true, items: [
          'Each module of the course already has its best practices: <b>they are not copied</b>. Here, each line is an <b>action to check</b> followed by the <b>owner module</b> to open for details.',
          'Content specific to this module: sizing, infra nodes, multi-tenancy, application high availability, multi-cluster, go / no-go criteria.',
          '<b>Format</b>: the six “checklist · reference” slides are a reference deliverable, <b>outside the talk</b>; the 30 minutes of talk cover the rest (sizing, infra nodes, multi-tenancy, HA, cloud gap, ACM, anti-patterns, go / no-go).',
          'Use on engagements: a “status” column (green, orange, red) and an owner per line; a red on a <b>blocking</b> item (go / no-go slide) stops the go-live.'
        ] },
        { t: 'callout', kind: 'tip', html: 'Course reference version: <b>OpenShift 4.20 EUS</b>. The sizing figures come from the 4.20 documentation; the practice rules (cadences, roles) are <b>proposals to adapt</b> to your context.' }
      ]
    },
    {
      title: 'Governance and support: who does what',
      blocks: [
        { t: 'table', head: ['Role (proposal)', 'Owns', 'Modules'], rows: [
          ['Platform team', 'Cluster, updates, nodes, etcd backup, capacity', 'modules 02, 11, 12'],
          ['Network, DNS, PKI, NTP', 'DNS (<code>api</code>, <code>*.apps</code>), LB, firewall, corporate certificates, time source', 'modules 03, 04, 07'],
          ['Storage', 'Arrays, ODF or LVMS, snapshots', 'module 08'],
          ['Security / compliance', 'SCC, PSA, scans, audit, secrets, images', 'modules 06, 09'],
          ['Application teams', 'Requested quotas, NetworkPolicy, PDB, replicas, application backup', 'modules 06, 07, 11'],
          ['Red Hat', 'Support, subscription, Insights', 'modules 01, 12']
        ] },
        { t: 'bullets', frag: true, items: [
          'Subscription: counted per pair of cores (or sockets on bare metal) on the workers; control plane and infra nodes generally not counted, <b>to be validated with your contract</b> (module 01, and the “Infra nodes” slide further on).',
          'A support ticket goes out with a <code>must-gather</code>; the Insights Operator sends configuration data to Red Hat if the cluster is connected (module 12).'
        ] },
        { t: 'callout', kind: 'cloud', html: 'On ROSA/ARO/OSD, the provider carries the control plane and etcd (module 11). On-prem, <b>the whole table above is yours</b>: without a named owner per line, the checklist is useless.' }
      ]
    },
    {
      title: 'Sizing the control plane',
      blocks: [
        { t: 'table', head: ['Compute nodes', 'Density (namespaces)', 'Control plane vCPU', 'RAM (GB)'], rows: [
          ['24', '500', '4', '16'],
          ['120', '1000', '8', '32'],
          ['252', '4000', '24 (with OVN-Kubernetes)', '128 (with OVN-Kubernetes)']
        ] },
        { t: 'bullets', frag: true, items: [
          'Order of magnitude from the 4.20 docs, measured on AWS (<code>r5.4xlarge</code> as control plane): take it as a <b>starting point</b>, not a guarantee. The docs state that sizing varies with the number of objects and their activity.',
          '<b>60% rule</b>: keep control plane CPU and memory usage at <b>60% at most</b> of capacity. When a master goes down, restarts or is updated (drain and reboot in series), the other two absorb the load.',
          'Installation minimums (4 vCPU, 16 GB, 100 GB) are in module 03; etcd disk latency in module 08.',
          'OLM runs on the control plane: its memory grows with the number of namespaces and installed Operators (according to the 4.20 sizing docs; point not covered in the course modules).'
        ] },
        { t: 'callout', kind: 'warn', html: 'The 4.20 docs say it themselves: Red Hat does not provide a direct <b>sizing guide</b>, it validates <b>tested maximums</b> (next slide). Validate your size by measuring your cluster, not with a table.' }
      ]
    },
    {
      title: 'Workers, reservations and density',
      blocks: [
        { t: 'table', head: ['Tested maximum (4.x)', 'Value', 'Good to know'], rows: [
          ['Nodes', '2,000', 'Tested with “pause” pods, not a real workload'],
          ['Pods', '150,000', 'Number of test pods'],
          ['Namespaces', '10,000', 'An etcd keyspace that is too large degrades performance: periodic defragmentation'],
          ['CRDs', '1,024', 'Beyond that, <code>oc</code> requests may be throttled'],
          ['Routes per 2-router deployment', '9,000', 'Router sharding: module 07']
        ] },
        { t: 'bullets', frag: true, items: [
          '<b>Pods per node</b>: 250 by default (kubelet <code>maxPods</code> parameter). 2,500 is a tested maximum, which requires a <code>hostPrefix</code> of 20 and a <code>maxPods</code> of 2500: not a goal.',
          'Number of nodes = expected pods ÷ pods per node, then <b>check CPU, memory and disk</b> of the application.',
          'System reservations (<code>system-reserved</code>): the docs cite <b>500m CPU and 1 Gi memory</b> by default, but state that defaults depend on OpenShift and MCO versions (to be verified, see module 12); automatic adjustment (<code>autoSizingReserved: true</code> in a <code>KubeletConfig</code>) is <b>disabled by default in 4.20</b> (automatic as of 4.21 according to the release notes, module 12).'
        ] },
        { t: 'callout', kind: 'trap', html: 'Maximums are tested <b>one by one</b>: aiming for several maximums at once is not guaranteed. A cluster that exceeds these figures remains usable but goes beyond what Red Hat has validated. Quotas and day-to-day capacity: modules 06 and 12.' }
      ]
    },
    {
      title: 'Infra nodes: what to put on them, and the license',
      blocks: [
        { t: 'bullets', items: [
          '<b>Eligible</b> for the exemption according to the 4.20 docs: control plane services, default router and HAProxy Ingress Controller, internal registry, monitoring (including user project monitoring), logging, Quay, Red Hat storage (ODF), ACM, ACS, OpenShift GitOps, OpenShift Pipelines, Service Mesh.',
          'Docs rule: only components that <b>support the cluster</b> and are not part of a user application; <b>any other node running another pod is a worker</b> that the subscription must cover.',
          '<b>Three</b> infra nodes per cluster are recommended by the docs.'
        ] },
        { t: 'table', head: ['Workers', 'Namespaces', 'Infra vCPU', 'Infra RAM (GB)'], rows: [
          ['27', '500', '4', '24'],
          ['120', '1000', '8', '48'],
          ['252', '4000', '16', '128'],
          ['501', '4000', '32', '128']
        ] },
        { t: 'callout', kind: 'warn', html: 'These sizes apply to nodes hosting <b>monitoring, Ingress and registry</b> only; Prometheus is memory-hungry and depends on the cluster age and the number of series. The <b>subscription contract</b> is authoritative for the exemption.' }
      ]
    },
    {
      title: 'Infra nodes: dedicated pool and pitfalls',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'infra-mcp.yaml', code: 'apiVersion: machineconfiguration.openshift.io/v1\nkind: MachineConfigPool\nmetadata:\n  name: infra\nspec:\n  machineConfigSelector:\n    matchExpressions:\n      - {key: machineconfiguration.openshift.io/role, operator: In, values: [worker,infra]}\n  nodeSelector:\n    matchLabels:\n      node-role.kubernetes.io/infra: ""' },
        { t: 'bullets', frag: true, items: [
          '<code>node-role.kubernetes.io/infra</code> label; <b>also keep the <code>worker</code> label</b>: the docs recommend keeping the double label <code>infra,worker</code> and managing placement with <b>taints</b> and tolerations. Without the <code>worker</code> label, a custom pool is needed, otherwise the MCO does not manage the node.',
          'A custom pool <b>overrides</b> the <code>worker</code> pool configuration when they touch the same file or unit.',
          'Then move: the IngressController\'s <code>nodePlacement</code> (module 07), the registry\'s <code>nodeSelector</code> and <code>tolerations</code>, the <code>cluster-monitoring-config</code> ConfigMap (module 05).',
          'MCO and pool mechanics: module 02.'
        ] },
        { t: 'callout', kind: 'trap', html: 'A <code>defaultNodeSelector</code> on <code>node-role.kubernetes.io/infra=""</code> can make pods <b>unschedulable</b> (for example a pod that requests a <code>master</code> node): prefer a per-project selector. Taint without tolerations in the components\' config: <code>Pending</code> pods.' }
      ]
    },
    {
      title: 'Multi-tenancy: the layered model',
      blocks: [
        { t: 'table', head: ['Layer', 'Mechanism', 'Module'], rows: [
          ['Identity', 'IdP, groups (LDAP-synchronized or OIDC claims)', 'module 06'],
          ['Rights', 'RoleBinding per project, default roles, no permanent cluster-admin', 'module 06'],
          ['Project creation', 'Project template, <code>self-provisioner</code> removed', 'module 06'],
          ['Resources', '<code>ResourceQuota</code>, <code>LimitRange</code>, <code>ClusterResourceQuota</code>', 'modules 06, 12'],
          ['Network', '<code>NetworkPolicy</code> deny-all, AdminNetworkPolicy, EgressFirewall', 'module 07'],
          ['Pods', 'SCC, PSA, allowed images', 'module 09'],
          ['Dedicated compute', 'Nodes with taint and tolerations (same mechanics as infra nodes)', 'module 02'],
          ['Monitoring', 'User project monitoring, monitoring roles', 'module 05']
        ] },
        { t: 'callout', kind: 'tip', html: 'A project is born with its guardrails: the <b>project template</b> (module 06) is the anchor, versioned in Git (module 10). A project created by hand outside the template is a project without a quota.' },
        { t: 'callout', kind: 'warn', html: 'A cluster\'s multi-tenancy is “soft”: projects share the nodes\' kernel and the control plane. For strong isolation (regulatory, different customers), the practice rule is to separate into <b>distinct clusters</b> (multi-cluster slide).' }
      ]
    },
    {
      title: 'Application high availability: overview',
      blocks: [
        { t: 'table', head: ['Lever', 'Role', 'Pitfall'], rows: [
          ['<code>replicas</code> ≥ 2', 'No single point of failure on a single pod', 'Two replicas on the same node: same outage'],
          ['<code>topologySpreadConstraints</code>', 'Spreads pods across domains (zones, nodes) according to a <code>maxSkew</code>', '<code>DoNotSchedule</code> can leave pods <code>Pending</code>'],
          ['Pod anti-affinity', 'Preference (or rule) not to place two pods together', 'A preference is not a guarantee'],
          ['<code>PodDisruptionBudget</code>', 'Minimum number of available pods during a <b>voluntary</b> eviction (drain, update)', '<code>minAvailable</code> at 100% or <code>maxUnavailable: 0</code> blocks the drain']
        ] },
        { t: 'code', lang: 'yaml', file: 'Deployment and PDB excerpt', code: '# In the pod template\ntopologySpreadConstraints:\n- maxSkew: 1\n  topologyKey: topology.kubernetes.io/zone\n  whenUnsatisfiable: DoNotSchedule\n  labelSelector:\n    matchLabels:\n      app: web\n---\napiVersion: policy/v1\nkind: PodDisruptionBudget\nmetadata:\n  name: web\nspec:\n  maxUnavailable: 1\n  selector:\n    matchLabels:\n      app: web' },
        { t: 'callout', kind: 'onprem', html: 'A PDB is only honored for <b>voluntary evictions</b>, not for a node failure. Zones: on vSphere, <code>failureDomains</code> are declared in <code>install-config.yaml</code> (module 03); elsewhere, nodes must carry a zone label for the spread to work (to be verified depending on your platform). PDBs that block an update: module 12.' }
      ]
    },
    {
      title: 'Checklist 1: before and during installation',
      tag: 'checklist · reference',
      blocks: [
        { t: 'table', head: ['Phase', 'Item to check', 'Module'], rows: [
          ['Before', 'Installation method and platform chosen (IPI, Agent, UPI, disconnected)', 'module 03'],
          ['Before', 'DNS (<code>api</code>, <code>api-int</code>, <code>*.apps</code>) and load balancers or VIPs ready', 'module 03 (flows: module 02)'],
          ['Before', 'NTP, addressing, non-overlapping CIDRs, pull secret', 'module 03'],
          ['Before', 'Ports open between all nodes (including Geneve)', 'module 02'],
          ['Before', 'Mirror registry and <code>oc-mirror</code> if the network is isolated', 'module 03'],
          ['Before', 'Master disks: <code>fio</code> test, fdatasync p99 below 10 ms', 'module 08'],
          ['Before', 'Size validated (sizing slides), subscription and pull secret available', 'this module, module 01'],
          ['During', 'Installation monitoring, CSRs checked before approval', 'module 03'],
          ['During', 'Installation folder kept (<code>auth/</code>, <code>metadata.json</code>)', 'module 03']
        ] },
        { t: 'callout', kind: 'onprem', html: 'DNS, NTP, firewall, PKI: <b>tickets to open upstream</b> with other teams, which take weeks (module 03). It is the schedule, not the technology, that delays an on-prem installation.' }
      ]
    },
    {
      title: 'Checklist 2: day 1',
      tag: 'checklist · reference',
      blocks: [
        { t: 'text', html: 'The detailed post-installation configuration list is in <b>module 04</b> (slide “Post-installation configuration checklist”). Here, only the items that involve other domains.' },
        { t: 'table', head: ['Item to check', 'Module'], rows: [
          ['Installation validated: <code>oc get co</code>, nodes, pools, CSRs', 'module 03'],
          ['IdP in place, <code>kubeadmin</code> deleted, admin kubeconfig in the vault', 'module 06'],
          ['Ingress and API certificates, proxy and corporate CA, node NTP', 'module 04'],
          ['OperatorHub sources (mirror, community catalogs)', 'module 04'],
          ['Project template: quotas, deny-all, <code>self-provisioner</code> removed', 'module 06'],
          ['Persistent storage for the registry, monitoring and logging', 'modules 08, 05'],
          ['First etcd backup, taken off the node, scheduled', 'module 11'],
          ['Update channel chosen', 'module 12'],
          ['Infra nodes and dedicated pool if planned', 'this module, module 02'],
          ['Configuration versioned in Git (GitOps)', 'module 10']
        ] }
      ]
    },
    {
      title: 'Checklist 3: before production',
      tag: 'checklist · reference',
      blocks: [
        { t: 'table', head: ['Domain', 'Item to check', 'Module'], rows: [
          ['Monitoring', 'Alerts routed to a receiver; <code>Watchdog</code> received regularly', 'module 05'],
          ['Monitoring', 'Monitoring PVC, retention chosen; user monitoring if needed', 'module 05'],
          ['Security', 'Images compatible with <code>restricted-v2</code>; no broad SCC granted “to make it work”', 'module 09'],
          ['Security', 'PSA, allowed images and signatures, secrets out of Git', 'modules 09, 10'],
          ['Security', 'etcd encryption; audit forwarded to the SIEM', 'modules 04, 06, 05'],
          ['Security', 'Compliance scan (Compliance Operator) read and handled', 'module 09'],
          ['Network', 'Default NetworkPolicy, controlled egress, HTTP and TCP exposure', 'module 07'],
          ['Storage', 'Default StorageClass, RWX if needed, snapshots tested', 'module 08'],
          ['Backup', 'OADP configured, one successful application restore', 'module 11'],
          ['GitOps', 'Drift handled, repo organized', 'module 10']
        ] }
      ]
    },
    {
      title: 'Checklist 4: in operations',
      tag: 'checklist · reference',
      blocks: [
        { t: 'table', head: ['Item to check', 'Module'], rows: [
          ['Alerts triaged, silences dated and commented', 'module 05'],
          ['Capacity: requests, quotas, control plane under 60%', 'module 12, this module'],
          ['Node CSRs approved after verifying the requestor', 'module 12'],
          ['Periodic review of RBAC bindings and granted SCCs (the cadence is a proposal of this module, to adapt)', 'modules 06, 09'],
          ['Critical Operators on manual approval, <code>InstallPlan</code>s handled', 'module 04'],
          ['Incident: cluster first (<code>oc get co</code>, <code>mcp</code>, nodes), then <code>must-gather</code> for the ticket', 'module 12']
        ] },
        { t: 'callout', kind: 'tip', html: 'Put a <b>review date</b> next to each line (monthly, quarterly): a checklist without a cadence stays a document, not a practice.' }
      ]
    },
    {
      title: 'Checklist 5: before each update',
      tag: 'checklist · reference',
      blocks: [
        { t: 'table', head: ['Item to check', 'Module'], rows: [
          ['Brand-new etcd backup, off the cluster', 'module 11'],
          ['Healthy operators, <code>Upgradeable</code> condition, <code>admin-acks</code> read (never acknowledged blindly)', 'module 12'],
          ['Removed APIs: <code>APIRemoved…</code> alerts handled', 'module 12'],
          ['PDBs too strict, capacity for the drain, pools without <code>Degraded</code>', 'modules 12, 02'],
          ['OLM Operators compatible with the target version', 'module 04'],
          ['<code>MachineHealthCheck</code> paused during the operation', 'module 12'],
          ['Channel, path (including EUS → EUS), update tested beforehand on another cluster', 'module 12'],
          ['Disconnected cluster: mirror up to date', 'module 12 (tool: module 03)']
        ] },
        { t: 'callout', kind: 'warn', html: 'Cluster still on OpenShift SDN: migration to OVN-Kubernetes mandatory before 4.17 (module 07). An update is a <b>change window</b>: announce it and keep a rollback plan.' }
      ]
    },
    {
      title: 'Checklist 6: disaster recovery',
      tag: 'checklist · reference',
      blocks: [
        { t: 'table', head: ['Item to check', 'Module'], rows: [
          ['Recovery procedure chosen according to the situation (quorum lost, rollback, failed member)', 'module 11'],
          ['RPO and RTO set, DR model chosen (rebuild, passive, stretch)', 'module 11'],
          ['What is in no backup (DNS, LB, corporate certificates, external secrets) documented elsewhere', 'module 11'],
          ['Configuration replayable from Git', 'module 10'],
          ['Dated exercises: namespace restore, etcd restore on a disposable cluster', 'module 11'],
          ['Procedure and access (SSH, kubeconfig, object storage) <b>outside the cluster</b>', 'module 11']
        ] },
        { t: 'callout', kind: 'trap', html: 'A backup that has never been restored is only a hypothesis, and a procedure stored in a wiki hosted on the failed cluster is unreadable on the day of the disaster (module 11).' }
      ]
    },
    {
      title: 'Cloud gap: what is not provided on-prem',
      blocks: [
        { t: 'table', head: ['Topic', 'In the cloud', 'On-prem: on you', 'Module'], rows: [
          ['Load balancers', 'Created by the installer', 'External LB or keepalived VIP, LB HA included', 'module 02, 03'],
          ['DNS', 'Records created', 'Zone, <code>api</code>, <code>api-int</code>, <code>*.apps</code>', 'module 03'],
          ['Storage', 'Automatic classes and registry', 'CSI backend, LVMS or ODF, registry storage', 'module 08'],
          ['Certificates', 'Provider services', 'Corporate PKI: API and Ingress to replace', 'module 04'],
          ['NTP', 'Provided', 'Internal sources, chrony MachineConfig', 'module 03, 04'],
          ['Nodes', 'Machine API and autoscaling', 'Machine API depending on the installation method, otherwise a human process', 'module 02, 12'],
          ['Control plane / etcd', 'Managed on ROSA/ARO', 'Backup, restore, exercises', 'module 11']
        ] },
        { t: 'callout', kind: 'cloud', html: 'This table is the reason for the on-prem course: every line “provided” in the cloud becomes a <b>checklist item with an owner</b>.' }
      ]
    },
    {
      title: 'Multi-cluster opening: ACM overview',
      blocks: [
        { t: 'bullets', items: [
          'Red Hat Advanced Cluster Management for Kubernetes (ACM): four capabilities according to the docs: <b>cluster life cycle</b> (create, import, manage), <b>application life cycle</b>, <b>governance</b> (compliance policies) and <b>observability</b> (state and metrics of managed clusters).',
          'Installed as an Operator on a “hub” cluster (<code>MultiClusterHub</code> resource) that drives managed clusters.',
          'The ACM <b>2.14</b> and <b>2.15</b> support matrices both list <b>OCP 4.20 EUS</b> for the hub and for managed clusters; consult the matrix of the ACM version you install.',
          'Link with the course: applying a policy or configuration <b>across several clusters</b> (module 10); Hosted Control Planes rely on MCE/ACM (module 02).'
        ] },
        { t: 'callout', kind: 'tip', html: 'ACM is one of the components that the 4.20 docs cite as eligible to run on <b>infra nodes</b> (slide “what to put on them”). Hub subscription: <b>to be verified</b> with Red Hat.' },
        { t: 'callout', kind: 'warn', html: 'Out of scope for the course: installing and operating ACM. To be studied when the checklist must apply to several clusters: an ACM policy then replaces a manual check per cluster.' }
      ]
    },
    {
      title: 'Common anti-patterns',
      blocks: [
        { t: 'table', head: ['Anti-pattern', 'Consequence', 'Module'], rows: [
          ['etcd backup never taken off the node nor restored', 'No recovery on the day of the disaster', 'module 11'],
          ['<code>kubeadmin</code> kept, shared <code>cluster-admin</code>', 'No attribution of actions, permanent access', 'module 06'],
          ['Business applications on infra nodes', 'Nodes to count in the subscription, platform components starved', 'module 02, this module'],
          ['Settings made by hand on the cluster, unversioned', 'Cluster impossible to rebuild, drift', 'module 10'],
          ['Operators on automatic update everywhere', 'Unplanned change on storage, network', 'module 04'],
          ['Update without reading the <code>admin-acks</code>, PDBs ignored', 'Update blocked or removed API used', 'module 12'],
          ['Monitoring with no PVC nor alert routing', 'Metrics lost, nobody is warned', 'module 05'],
          ['Secrets in plain text in Git', 'Secret to revoke, history compromised', 'module 10'],
          ['<code>anyuid</code> or <code>privileged</code> SCCs granted broadly', 'Guardrails removed', 'module 09'],
          ['Masters on a shared, saturated datastore', 'Unstable etcd, Degraded operators', 'module 08']
        ] }
      ]
    },
    {
      title: 'Production go-live criteria: go / no-go',
      blocks: [
        { t: 'table', head: ['Criterion', 'Expected evidence', 'Blocking?', 'Module'], rows: [
          ['etcd backup', 'Archive off the cluster, one tested restore', 'Yes', 'module 11'],
          ['Access', 'IdP active, <code>kubeadmin</code> deleted, groups in place', 'Yes', 'module 06'],
          ['Alerting', '<code>Watchdog</code> received, receiver tested', 'Yes', 'module 05'],
          ['Monitoring storage', 'PVC in place', 'Yes', 'module 05'],
          ['Certificates', 'API and Ingress from the corporate PKI', 'Yes', 'module 04'],
          ['Capacity', 'Control plane under 60%, growth plan', 'Yes', 'this module'],
          ['Updates', 'Channel and window defined, path described', 'Yes', 'module 12'],
          ['GitOps', 'Configuration versioned', 'No (to be planned)', 'module 10'],
          ['Compliance', 'Scan read, deviations handled or accepted', 'Depends on the context', 'module 09'],
          ['Support', 'Active subscription, ticket procedure known', 'Yes', 'module 01, 12']
        ] },
        { t: 'callout', kind: 'tip', html: 'The “blocking” columns are a <b>proposal to adapt</b>: what matters is that the go / no-go is decided before go-live, by the owners from the governance slide, and not by the schedule.' }
      ]
    },
    {
      title: 'Frequent mistakes on engagements',
      blocks: [
        { t: 'cards', items: [
          { front: 'DNS comes last', back: 'The forgotten <code>*.apps</code> wildcard blocks the end of the installation (module 03).' },
          { front: 'Two masters “to save money”', back: 'Two etcd members protect against nothing: quorum of 2 (module 02).' },
          { front: 'SNO sold as HA', back: 'A single node: everything stops on reboot or update (module 02).' },
          { front: 'Everyone is cluster-admin', back: 'The cluster works, until the first action that can\'t be attributed (module 06).' },
          { front: 'Production is updated first', back: 'Test on a less critical cluster, with candidate or fast (module 12).' },
          { front: 'Backup, later', back: 'Never restored, hence unproven (module 11).' }
        ] },
        { t: 'callout', kind: 'trap', html: 'The common thread: what depends on another team (DNS, PKI, storage, backup) is handled last. Put these lines <b>at the top of the schedule</b>.' }
      ]
    },
    {
      title: 'Quiz',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Your three-node control plane runs at 80% CPU in normal operation. Why is this a problem?', options: ['No problem as long as the nodes are not saturated', 'When a master goes down, restarts or is updated, the other two must absorb the load; the docs ask to stay at 60% at most', 'OpenShift refuses to start above 75%', 'Master CPU is not taken into account by the scheduler'], answer: 1, explain: 'The control plane is updated in series (drain, reboot) and suffers failures: the remaining capacity must be enough. The 4.20 docs ask to keep usage at 60% at most.' },
        { t: 'quiz', q: 'You want an infra node. You remove its <code>worker</code> label without creating a custom pool. What is the risk?', options: ['None: the <code>infra</code> label is enough', 'The node is billed twice', 'Infra pods can no longer run on it', 'The MCO no longer recognizes the node: without a custom pool, it is managed neither by the <code>worker</code> pool nor by an <code>infra</code> pool'], answer: 3, explain: 'The docs recommend keeping the double label <code>infra,worker</code> and using taints. A node with a label other than master or worker is not recognized by the MCO without a custom pool.' },
        { t: 'quiz', q: 'A <code>PodDisruptionBudget</code> with <code>minAvailable: 100%</code> on a 3-replica Deployment, during a cluster update. What happens?', options: ['Draining a node that hosts one of these pods can be blocked, hence the update with it', 'Nodes are updated without problems thanks to the PDB', 'The PDB is ignored during updates', 'OpenShift deletes the PDB'], answer: 0, explain: 'A PDB at 100% availability forbids any voluntary eviction: it can block a node\'s drain and therefore the update (module 12).' }
      ]
    },
    {
      title: 'Lab: audit your cluster with the checklist',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'Read-only audit of a cluster', goal: 'Fill in the checklist on your own lab cluster: which items are green, orange, red? Nothing is modified.', steps: [
          'Prerequisites: environment E1 (SNO) with <code>cluster-admin</code>, see module 00. The commands below are <b>read-only</b>.',
          'Inventory: <code>oc get clusterversion</code>, <code>oc get co</code>, <code>oc get nodes</code>, <code>oc get mcp</code>, <code>oc get csr</code>; channel: <code>oc get clusterversion version -o jsonpath=\'{.spec.channel}{"\\n"}\'</code>. What does checklist 2 say?',
          'Sizing: <code>oc adm top nodes</code> and <code>oc describe node &lt;node&gt; | grep -A8 \'Allocated resources\'</code>; compare with the control plane slide and the 60% rule; <code>oc get pdb -A</code> and <code>oc get resourcequota -A</code>.',
          'Access and monitoring: <code>oc get secret kubeadmin -n kube-system</code> (does it still exist?), <code>oc get oauth cluster -o jsonpath=\'{.spec.identityProviders[*].name}{"\\n"}\'</code>, <code>oc get pvc -n openshift-monitoring</code>, <code>oc get apiserver cluster -o jsonpath=\'{.spec.audit.profile}{"\\n"}\'</code>.',
          'Summary: rate each line of checklists 2 and 3 (green, orange, red), then list the three most blocking reds with the module to re-read. What is your go / no-go?',
          '(bonus, no cluster: fictional cluster, on paper) Fictional cluster: 3 masters of 4 vCPU and 16 GB on a shared datastore, 120 workers, <code>kubeadmin</code> active, monitoring without PVC, no etcd backup, Operators on automatic update. Give the go / no-go in five minutes and the first three actions, with the module to open.',
          '(bonus, E1, read-only) <code>oc get subscriptions.operators.coreos.com -A -o custom-columns=NS:.metadata.namespace,NAME:.metadata.name,APPROVAL:.spec.installPlanApproval</code>: which Operators are on automatic approval, and which should switch to manual (module 04)?'
        ] }
      ]
    }
  ],
  takeaways: [
    'A go-live checklist per phase, where each item points to its module: fill it in with an owner and a review date per line.',
    'Sizing: 4.20 docs benchmark for the control plane (4 vCPU and 16 GB for 24 compute nodes), usage kept under 60%, 250 pods per node by default, maximums tested and not guaranteed.',
    'Infra nodes: only cluster-support components are exempt, the subscription contract is authoritative; keep the double <code>infra,worker</code> label and manage placement with taints.',
    'Layered multi-tenancy (identity, rights, quotas, network, pods) anchored in the project template; application high availability: replicas, <code>topologySpreadConstraints</code>, reasonable PDBs.',
    'Go / no-go before production: etcd backup restored, IdP access, alerting received, persistent monitoring, certificates, capacity, update plan.',
    'ACM opens up multi-cluster (policy-based governance): an overview, to be deepened when the checklist must apply to several clusters.'
  ]
});
