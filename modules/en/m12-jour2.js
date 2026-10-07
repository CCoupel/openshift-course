COURSE.add({
  id: 'm12', lang: 'en', num: 12, emoji: '🔧',
  title: 'Day-2 operations',
  source: 'dd014c167d0b',
  tagline: 'Updating without nasty surprises, extending the cluster, diagnosing and keeping capacity: what keeps an OCP admin busy every day.',
  duration: '≈ 60 min + lab 20 min',
  objectives: [
    'Prepare and carry out an update: channels, <code>oc adm upgrade</code>, acknowledgements (admin-acks) and <code>Upgradeable=False</code>',
    'Master worker cadence (pausing MachineConfigPools) and the EUS-to-EUS principle',
    'Add, remove and maintain on-prem nodes, and manage node CSRs and certificates',
    'Diagnose with <code>must-gather</code>, <code>oc adm inspect</code>, <code>oc adm node-logs</code> and recognize common incidents',
    'Track capacity: requests, quotas, node reservations, autoscaling overview'
  ],
  slides: [
    {
      title: 'Day 2: four workstreams',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Update', sub: 'CVO, channels, MCO', hl: true },
          { label: 'Extend', sub: 'nodes, CSRs, certificates' },
          { label: 'Diagnose', sub: 'must-gather, logs', hl: true },
          { label: 'Size', sub: 'quotas, reservations' }
        ], caption: 'The cluster is installed (module 03), configured (04), observed (05): now you have to <b>keep it alive</b> for years.' },
        { t: 'bullets', frag: true, items: [
          'Boundaries: installation → module 03; default certificate and day-1 config → module 04; monitoring → module 05; network → module 07; security → module 09; etcd backup and restore → module 11.',
          'Reference: <b>4.20 EUS</b>; example EUS → EUS path: <b>4.20 → 4.22</b> (4.22: latest EUS, module 01).'
        ] },
        { t: 'callout', kind: 'cloud', html: "On ROSA/ARO/OSD, control plane updates are <b>scheduled with the provider</b> and nodes managed for you. On-prem, <b>this whole module is on you</b>." }
      ]
    },
    {
      title: 'How an update works',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Channel', sub: 'stable-4.20, eus-4.20…' },
          { label: 'Graph', sub: 'recommended paths (OSUS)' },
          { label: 'CVO', sub: 'orchestrates the operators', hl: true },
          { label: 'Control plane', sub: 'operators, masters' },
          { label: 'Workers', sub: 'MCO: drain, reboot, one at a time' }
        ], caption: 'The <b>Cluster Version Operator</b> queries the update service, updates the Cluster Operators, then the <b>MCO</b> updates the nodes (module 02).' },
        { t: 'cmds', items: [
          ['oc get clusterversion', 'Current version, channel, conditions'],
          ['oc adm upgrade', 'Updates available in the channel'],
          ['oc get co', 'State of the Cluster Operators (Available, Progressing, Degraded)']
        ] },
        { t: 'callout', kind: 'k8s', html: "No node-by-node <code>kubeadm upgrade</code>: you declare the <b>target version</b> and the operators do the rest. Your role: <b>prepare</b>, <b>trigger</b> and <b>watch</b>." }
      ]
    },
    {
      title: 'Update channels',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Channel', 'Content'], rows: [
          ['<code>candidate-4.x</code>', 'New releases as soon as they are built, before final testing'],
          ['<code>fast-4.x</code>', 'Tested and supported releases, published with an erratum'],
          ['<code>stable-4.x</code>', 'After a delay on <code>fast</code>: on the order of one to two weeks for a fix, longer (on the order of 45 to 90 days) for the very first path to a new minor version'],
          ['<code>eus-4.x</code>', 'Releases of <code>stable</code> at the same time; mainly used for <b>Control Plane Only</b> updates (EUS → EUS)']
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc adm upgrade channel stable-4.20\n$ oc get clusterversion version -o jsonpath='{.spec.channel}{\"\\n\"}'" },
        { t: 'callout', kind: 'tip', wide: true, html: "In production: <b>stable</b>. <b>candidate</b> and <b>fast</b> to test before your other clusters. Choosing the channel updates nothing: it decides what is <b>offered</b> to you." }
      ]
    },
    {
      title: 'Preparing: the checklist before you start',
      blocks: [
        { t: 'table', head: ['Check', 'Why / how'], rows: [
          ['<b>etcd backup</b>', 'Procedure from module 11; the docs require it before any update'],
          ['<b>Healthy operators</b>', '<code>oc get co</code>: all Available, none Degraded; the <code>Upgradeable</code> condition must be <code>True</code> (otherwise <code>ClusterNotUpgradeable</code> after more than an hour)'],
          ['<b>Removed APIs</b>', '<code>APIRemovedInNextReleaseInUse</code> and <code>APIRemovedInNextEUSReleaseInUse</code> alerts: migrate usages before acknowledging'],
          ['<b>PodDisruptionBudgets</b>', 'A PDB that is too strict (<code>minAvailable: 1</code> on 1 replica) blocks a node\'s drain'],
          ['<b>Capacity</b>', 'Enough free nodes to move pods during the drain'],
          ['<b>MachineHealthCheck</b>', 'The update docs ask to <b>pause</b> them during the operation (<code>cluster.x-k8s.io/paused=""</code> annotation) so they don\'t replace a node that is rebooting'],
          ['<b>MCO pools</b>', 'Default value <code>maxUnavailable: 1</code>; no Degraded pool (module 02)'],
          ['<b>OLM Operators</b>', 'Compatible with the target version (module 04, <code>olm.maxOpenShiftVersion</code>)'],
          ['<b>Network</b>', 'Cluster still on OpenShift SDN: migration mandatory before 4.17 (module 07)']
        ] },
        { t: 'callout', kind: 'tip', html: "<code>oc adm upgrade recommend</code> (next slide) does part of these checks for you (alerts, operators); it replaces neither your backup nor your rollback plan." }
      ]
    },
    {
      title: 'Admin-acks and Upgradeable=False',
      layout: 'two',
      blocks: [
        { t: 'bullets', frag: true, items: [
          'Before certain minor version upgrades, OCP requires a <b>manual acknowledgement</b>: the cluster goes <code>Upgradeable=False</code> with the reason <code>AdminAckRequired</code>.',
          'Purpose: to make you check that <b>removed Kubernetes APIs</b> are no longer used by your workloads and tools.',
          'The acknowledgement is done in the <code>admin-acks</code> ConfigMap of the <code>openshift-config</code> namespace.',
          '<b>4.20 docs example</b> (4.19 → 4.20 upgrade): key <code>ack-4.19-admissionregistration-v1beta1-api-removals-in-4.20</code>; the key changes with each version.'
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc -n openshift-config patch cm admin-acks --patch \\\n    '{\"data\":{\"ack-4.19-admissionregistration-v1beta1-api-removals-in-4.20\":\"true\"}}' --type=merge" },
        { t: 'callout', kind: 'trap', wide: true, html: "<b>Never acknowledge blindly</b>: the docs remind you that the admin is responsible for spotting and migrating removed APIs (the cluster can't see external tools or idle workloads). For 4.22, the docs state <b>no Kubernetes API removal</b>." }
      ]
    },
    {
      title: 'Other causes of refusal: example of an image policy',
      blocks: [
        { t: 'bullets', frag: true, items: [
          '<b>Upgradeable=False</b> can also come from an Operator declaring a maximum version (<code>olm.maxOpenShiftVersion</code>, module 04) or from a degraded component.',
          '<b>Update to 4.21 and sigstore</b>: the 4.21 release notes state that if your 4.20 (or earlier) cluster already has a cluster image policy named <code>openshift</code>, the update marks it <b>not updatable</b> (<code>Upgradeable=False</code>) because of the default policy. <b>Remedy</b> (4.21 release notes): remove the <b>hand-created</b> <code>openshift</code> policy before the update; no <code>admin-acks</code> acknowledgement is mentioned.',
          'The 4.20 sigstore docs list, for clusters with ImageContentSourcePolicy or ImageDigestMirrorSet, a prerequisite: <b>mirror the sigstore signatures</b> before the update (to be verified in “Preparing to update to 4.21”).'
        ] },
        { t: 'callout', kind: 'warn', html: "The exact text, the remedy and any acknowledgement key for this case are <b>to be re-read in “Preparing to update to 4.21”</b> before your update (nothing precise was found in the 4.21 release notes read). It is one more example: <b>read the target version\'s notes</b> at every minor (module 09 for signed images)." }
      ]
    },
    {
      title: 'Launching the update',
      blocks: [
        { t: 'cmds', items: [
          ['oc adm upgrade recommend', 'Version recommendation and pre-check (alerts, operators); read-only'],
          ['oc adm upgrade --to-latest=true', 'To the latest recommended version of the channel'],
          ['oc adm upgrade --to=4.20.z', 'To a specific version (replace z with the chosen value)'],
          ['oc adm upgrade --allow-not-recommended --to=4.20.z', 'To a non-recommended version: you accept the known risk (to be avoided)'],
          ['oc adm upgrade status', 'Update progress'],
          ['watch oc get co', 'Operators during the update']
        ] },
        { t: 'callout', kind: 'ocp', html: "<code>oc adm upgrade recommend</code> and <code>oc adm upgrade status</code> are both <b>GA in 4.20</b> (<code>recommend</code>: Technology Preview in 4.18); it reports for example <code>ClusterOperatorDown</code> alerts that can prevent an update from completing. The exact options of your version: <code>oc adm upgrade --help</code>." },
        { t: 'callout', kind: 'trap', html: "An update <b>to a non-recommended version</b> means a risk is known for your path: read the displayed reason (<code>oc adm upgrade</code>) before insisting." }
      ]
    },
    {
      title: 'Following and keeping control of the workers',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc adm upgrade status\n$ oc get co\n$ oc get mcp\n$ oc get nodes\n\n# Suspend the updates of a pool (e.g. workers)\n$ oc patch mcp/worker --type merge --patch '{\"spec\":{\"paused\":true}}'\n# ... and resume\n$ oc patch mcp/worker --type merge --patch '{\"spec\":{\"paused\":false}}'" },
        { t: 'bullets', items: [
          'The control plane <b>operators</b> update first, then the MCO does <b>drain → update → reboot</b>, node by node (<code>maxUnavailable: 1</code> by default).',
          '<b>Paused pool</b>: its nodes are not updated; useful for a maintenance window or a pool-by-pool “canary” upgrade.',
          'A node being updated reboots: plan consistent PDBs and enough replicas.'
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: "A pool left <b>paused</b> blocks the following minor updates and <b>inhibits maintenance tasks such as certificate rotation</b> (docs warning): never forget it. On SNO, update = reboot of the single node: maintenance window (module 02)." }
      ]
    },
    {
      title: 'EUS to EUS: updating two minors',
      blocks: [
        { t: 'flow', nodes: [
          { label: '4.20 EUS', sub: 'start' },
          { label: 'Pause the pools', sub: 'workers (non-master)', hl: true },
          { label: 'Control plane', sub: '→ 4.21 then → 4.22' },
          { label: 'Resume the pools', sub: 'paused: false', hl: true },
          { label: '4.22 EUS', sub: 'workers up to date' }
        ], caption: '“<b>Control Plane Only</b>” procedure: the control plane goes through the intermediate version; the workers are only updated <b>once</b> (4.20 → 4.22).' },
        { t: 'bullets', frag: true, items: [
          'The <code>eus-4.x</code> channel is used for this procedure. It distinguishes two sets: the <b>control plane</b> (<code>master</code> pool), updated normally, and the <b>worker pools</b> (all MachineConfigPools other than <code>master</code>), which are <b>paused</b>. The docs therefore reserve it for clusters that have pools other than the control plane.',
          'Steps: pause all non-master pools, move the control plane to the intermediate minor then to the target, then <b>resume</b> the pools to update the workers.',
          '<b>To be completed within 60 days</b>: you can spread the procedure over several windows, but the docs ask to finish everything within 60 days so that the automations (including certificate rotation) complete. Only valid between <b>even-numbered</b> minors (EUS).'
        ] },
        { t: 'callout', kind: 'warn', html: "Exact commands, preconditions (control plane / workers skew) and channel sequencing: <b>to be re-read in “Performing a Control Plane Only update”</b> for your version before using it in production (not re-read in detail for 4.20 here)." }
      ]
    },
    {
      title: 'Updating a disconnected cluster',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          'No access to the public service: the CVO cannot read the update graph.',
          'Solution: install <b>OpenShift Update Service (OSUS)</b> locally: Operator, <b>graph data</b> image, <code>UpdateService</code> application, then point the clusters to it.',
          'The target <b>release images</b> must be mirrored beforehand (<code>oc-mirror</code>, module 03) to your registry.',
          'One OSUS instance can serve thousands of clusters (adjustable replicas).'
        ] },
        { t: 'callout', kind: 'onprem', html: "When disconnected, an update = <b>up-to-date mirror + up-to-date graph + window</b>. Plan the mirror\'s <b>synchronization process</b> (frequency, validation) together with the update calendar." },
        { t: 'callout', kind: 'warn', wide: true, html: "Detailed procedure, options for updating to a specific release without a graph and the role of <code>ImageDigestMirrorSet</code>s: “Updating a cluster in a disconnected environment” docs for your version (to be verified)." }
      ]
    },
    {
      title: 'Adding on-prem nodes',
      blocks: [
        { t: 'table', head: ['Situation', 'How', 'Remark'], rows: [
          ['<b>IPI vSphere / bare metal</b> (Machine API)', 'Scale a <code>MachineSet</code> (or add a <code>BareMetalHost</code>)', 'Creation and CSRs automated (module 02)'],
          ['<b>Agent / no Machine API</b>', '<code>oc adm node-image create</code>: ISO to boot one or more workers', 'Documented for on-prem clusters; <b>Machine or BareMetalHost not created automatically</b>'],
          ['<b>UPI</b>', 'RHCOS image + worker Ignition, then CSR approval', 'As at installation (module 03)'],
          ['<b>RHEL worker</b>', 'No: RHEL compute nodes removed as of 4.19', 'RHCOS only (module 01)']
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "# After the new node boots\n$ oc get csr | grep Pending\n$ oc adm certificate approve CSR_NAME\n$ oc get nodes" },
        { t: 'callout', kind: 'tip', html: "Never scale a MachineSet without checking <b>network capacity</b> (DHCP, IPAM), <b>DNS</b> and the template\'s storage: this is the #1 cause of Machines stuck in <code>Provisioning</code>." }
      ]
    },
    {
      title: 'Node CSRs and certificates',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          'Node certificates are <b>signed by the cluster</b> and <b>renewed automatically</b> (every 30 days according to the 4.20 docs).',
          '<b>Two families of CSRs</b>: <code>kubernetes.io/kube-apiserver-client-kubelet</code> (kubelet request, including <code>node-bootstrapper</code>) and <code>kubernetes.io/kubelet-serving</code> (server certificate, to be approved on UPI installations).',
          'The kubelets\' CA renews automatically (292 days); an early manual renewal is possible by annotating the <code>kube-apiserver-to-kubelet-signer</code> secret.',
          'After a <b>long shutdown</b> of the cluster, certificates may have expired: the docs have a recovery procedure (“scenario 3: expired certs”) that goes through CSR approval.'
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "# 1. List ALL CSRs with requestor and signer (those with no state in the last column are pending)\n$ oc get csr -o custom-columns=NAME:.metadata.name,REQUESTOR:.spec.username,SIGNER:.spec.signerName,STATE:.status.conditions[*].type\n\n# 2. Approve a request whose requestor you have verified\n$ oc adm certificate approve CSR_NAME\n\n# 3. In bulk, ONLY the requests still pending (no status), after checking the list\n$ oc get csr -o go-template='{{range .items}}{{if not .status}}{{.metadata.name}}{{\"\\n\"}}{{end}}{{end}}' | xargs -r oc adm certificate approve" },
        { t: 'callout', kind: 'trap', wide: true, html: "Only approve CSRs that are <b><code>Pending</code></b> and whose <b>requestor you have verified</b> (expected node name, signer): a blindly approved CSR can give an intruder a node certificate, hence a fake node in your cluster. Replacing the API and Ingress certificates: module 04." }
      ]
    },
    {
      title: 'Removing a node, doing maintenance',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: "# 1. Forbid new pods\n$ oc adm cordon worker-3\n\n# 2. Evacuate cleanly\n$ oc adm drain worker-3 --ignore-daemonsets --delete-emptydir-data\n\n# 3. Maintenance (hardware, firmware...)\n\n# 4. Back in service\n$ oc adm uncordon worker-3" },
        { t: 'bullets', items: [
          '<b>Permanent removal</b>: drain, then delete the Machine (or the <code>BareMetalHost</code>) if the Machine API manages the node; otherwise <code>oc delete node</code> after shutdown.',
          'A <b>PDB that is too strict</b> or pods without a controller make the drain fail: the message says which.',
          '<b>On a SNO</b>, there is no other node: the MCO <b>skips the drain</b> during updates and everything reboots with the node; a manual <code>drain</code> would cut routers, console and OAuth: <b>only in a maintenance window</b>, with <code>oc adm uncordon</code> as rollback.',
          'On bare metal: if your firmware forces a reboot, <b>drain first</b>; the MCO doesn\'t know about your manual operations.'
        ] },
        { t: 'callout', kind: 'tip', html: "<code>--delete-emptydir-data</code> deletes <code>emptyDir</code> data: it is ephemeral, but check that no app uses it as a critical cache." }
      ]
    },
    {
      title: 'Diagnosing: the toolbox',
      blocks: [
        { t: 'table', head: ['Tool', 'Use'], rows: [
          ['<code>oc adm must-gather</code>', 'Collects diagnostic data in a temporary pod (new project); output in <code>must-gather.local.*</code> or <code>--dest-dir</code>; <code>--image</code> for a plugin'],
          ['<code>oc adm inspect ns/…</code>', 'Targeted collection of a namespace or a resource'],
          ['<code>oc adm node-logs NODE -u kubelet</code>', 'Log of a node systemd unit (via the API)'],
          ['<code>oc debug node/NODE</code>', 'Privileged pod then <code>chroot /host</code> (module 06 for the rights)'],
          ['<code>oc adm top nodes</code> / <code>pods</code>', 'Consumption (Metrics Server, module 05)'],
          ['<code>oc describe co NAME</code>', 'Why a Cluster Operator is Degraded']
        ] },
        { t: 'callout', kind: 'tip', html: "For a Red Hat ticket: attach the <b>must-gather</b> to the request. The <b>Insights Operator</b> sends configuration data to Red Hat every two hours by default, viewable in the Advisor of the Red Hat cloud console (if the cluster is connected and you accept it)." },
        { t: 'callout', kind: 'onprem', html: "Isolated network: no automatic sending. Plan a <b>transfer path</b> for the must-gather to support (USB stick, gateway)." }
      ]
    },
    {
      title: 'Common incidents',
      tag: 'to recognize',
      blocks: [
        { t: 'cards', items: [
          { front: 'NotReady node', back: '<b>kubelet / CRI-O / network</b>: <code>oc adm node-logs</code>, <code>oc debug node</code>, pending CSRs after a long shutdown.' },
          { front: 'Degraded Cluster Operator', back: '<code>oc describe co NAME</code> then the pods in its namespace; often a certificate, a PVC or a node.' },
          { front: 'Degraded MCO pool', back: 'File modified by hand or invalid MachineConfig: blocks updates (module 02, 04).' },
          { front: 'Slow etcd', back: 'Disk or network latency: modules 02 and 08; backup and restore: module 11.' },
          { front: 'Stuck update', back: 'Paused pool, PDB, <code>Upgradeable=False</code> or Degraded operator: <code>oc adm upgrade status</code>.' },
          { front: 'Pending pods', back: 'Capacity, quotas or <code>nodeSelector</code>: <code>oc describe pod</code>, <code>oc describe quota</code>.' }
        ] },
        { t: 'callout', kind: 'tip', html: "Method: <b>cluster first</b> (<code>oc get co</code>, <code>oc get mcp</code>, <code>oc get nodes</code>), then the node, then the pod. An application symptom often comes from a degraded operator." }
      ]
    },
    {
      title: 'Capacity and quotas',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          '<b>Requests / limits</b>: requests decide placement; watch <b>overcommit</b> (sum of limits &gt; capacity).',
          '<b>Per-project quotas</b>: <code>ResourceQuota</code>, <code>LimitRange</code>, <code>ClusterResourceQuota</code> via the project template (module 06).',
          '<b>Node reservations</b>: <code>system-reserved</code> and kubelet; <code>autoSizingReserved</code> (<code>KubeletConfig</code>) computes the reservation from the node capacity; this option is <b>disabled by default in 4.20</b>; the 4.21 release notes state that the computation becomes automatic (updated clusters: deleting the <code>50-worker-auto-sizing-disabled</code> MachineConfig to enable it, with node reboot). The 4.20 docs cite <code>500m</code> CPU and <code>1Gi</code> memory as <code>system-reserved</code> defaults; since 4.21, the reservation is computed automatically.',
          '<b>Infra nodes</b>: host routers, monitoring and logging on dedicated nodes (module 02).'
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc adm top nodes\n$ oc describe node worker-1 | grep -A8 'Allocated resources'\n$ oc get resourcequota,limitrange -A" },
        { t: 'callout', kind: 'ocp', wide: true, html: "<b>Autoscaling</b>: <code>ClusterAutoscaler</code> and <code>MachineAutoscaler</code> require the <b>Machine API</b> (IPI vSphere or bare metal, module 02); without it, capacity is managed by hand. Out of scope here: to be studied with your architect." }
      ]
    },
    {
      title: 'Quiz',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Before moving to the next minor, the cluster is <code>Upgradeable=False</code> with the reason <code>AdminAckRequired</code>. What do you do?', options: ['Force the update with an option that ignores the condition', 'Check that your workloads no longer use the removed APIs, then acknowledge in the <code>admin-acks</code> ConfigMap', 'Delete the <code>admin-acks</code> ConfigMap to reset the block', 'Change channel so that the condition disappears'], answer: 1, explain: 'Acknowledgement is deliberate: it confirms that you have assessed the removed APIs. It is done in <code>admin-acks</code> (<code>openshift-config</code>) after verification, not by working around it or deleting the ConfigMap.' },
        { t: 'quiz', q: 'You want to take a cluster from 4.20 EUS to 4.22 EUS while limiting worker reboots. Which approach?', options: ['Update each worker by hand with <code>oc debug</code> before the control plane', 'Switch to the <code>candidate</code> channel to skip the intermediate version', 'Update the workers first, then the control plane, with no pause', 'Pause the non-master MachineConfigPools, move the control plane up (4.21 then 4.22), then resume the pools'], answer: 3, explain: 'This is the Control Plane Only procedure: the workers are updated only once, to the target. Never leave a pool paused: it blocks later updates and certificate rotation.' },
        { t: 'quiz', q: 'After restarting a lab cluster that had been shut down for two weeks, some workers stay <code>NotReady</code> and CSRs are <code>Pending</code>. What do you do?', options: ['Check the CSRs (requestor, expected node) and approve them with <code>oc adm certificate approve</code>', 'Redeploy the whole cluster', 'Delete all <code>NotReady</code> nodes and wait for them to be recreated', 'Modify the worker MachineConfigPool to force the reboot'], answer: 0, explain: 'After a long shutdown, kubelet certificates may have expired: the nodes request certificates again via CSRs, which must be approved after checking. Redeploying or deleting nodes is needlessly destructive.' }
      ]
    },
    {
      title: 'Lab: reading the cluster state and simulating maintenance',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'Update state, must-gather, quotas, drain', goal: 'Core during the session on a SNO (cluster-admin). The (bonus) steps, including the real update, are to be done on your own on a disposable cluster.', steps: [
          'Prerequisites: environment E1 (SNO) with <code>cluster-admin</code>, see module 00.',
          'Read the update state: <code>oc get clusterversion</code>, <code>oc adm upgrade</code>, <code>oc adm upgrade recommend</code>; which channel? are updates offered? any <code>Upgradeable</code> conditions?',
          'Run <code>oc adm must-gather --dest-dir=./mg</code>, browse the folder (operators, nodes, events) then a targeted collection with <code>oc adm inspect ns/openshift-ingress</code>.',
          'In a test project, create a <code>ResourceQuota</code> and a <code>LimitRange</code>; exceed the quota with a deployment and read the error; check with <code>oc describe quota</code>.',
          'Simulate maintenance <b>without destroying anything</b>: <code>oc adm cordon</code> on your node, then <code>oc adm drain --dry-run=server --ignore-daemonsets --delete-emptydir-data</code> to <b>list</b> what would be evicted (on a SNO, the real drain also evicts routers, console and OAuth, which cannot be rescheduled elsewhere); immediately roll back with <code>oc adm uncordon</code> and check that the node is <code>Ready</code> without <code>SchedulingDisabled</code>. <b>Never drain the single node of a SNO outside a planned window.</b>',
          '(bonus, disposable E1 or E2) Real minor update: etcd backup (module 11), checking the pre-checks, <code>oc adm upgrade --to=…</code>, follow with <code>oc adm upgrade status</code> (on a SNO: the node reboots).',
          '(bonus, E2) Real drain on a multi-node cluster\'s <b>worker</b>: <code>oc adm cordon</code>, <code>oc adm drain</code>, observe the rescheduling, then <code>oc adm uncordon</code>.',
          '(bonus, E2) Pause the <code>worker</code> pool (<code>spec.paused</code>), launch a control plane update and observe that the workers don\'t move; resume the pool afterwards.',
          '(bonus, E2 or more) Add a worker with <code>oc adm node-image create</code> (or by scaling a MachineSet) and approve the CSRs.'
        ] }
      ]
    }
  ],
  takeaways: [
    'An update = channel + graph + CVO + MCO: prepare (etcd backup, healthy operators, PDBs, removed APIs), trigger (<code>oc adm upgrade recommend</code> then <code>--to-latest</code> or <code>--to</code>), monitor (<code>oc adm upgrade status</code>).',
    '<code>admin-acks</code> acknowledgements and <code>Upgradeable=False</code> call for assessing, not working around; read the notes of every target version (example: the <code>openshift</code> image policy before 4.21).',
    'EUS → EUS (4.20 → 4.22): Control Plane Only, non-master pools paused then resumed; a pool forgotten in pause blocks updates and certificate rotation.',
    'On-prem, nodes are added via the Machine API, <code>oc adm node-image create</code> or UPI; RHEL workers no longer exist as of 4.19; CSRs are checked before approval.',
    'Diagnosis: cluster first (<code>oc get co</code>, <code>mcp</code>, <code>nodes</code>), then <code>must-gather</code>, <code>oc adm inspect</code>, <code>oc adm node-logs</code>; the must-gather goes with every support ticket.',
    'Capacity: requests, quotas (module 06), node reservations, infra nodes; autoscaling assumes the Machine API.'
  ]
});
