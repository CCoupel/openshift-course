COURSE.add({
  id: 'm15', lang: 'en', num: 15, emoji: '📝',
  title: 'Cheat sheet & final quiz',
  source: 'fac600c1a292',
  tagline: 'The essential commands by topic, a K8s ↔ OpenShift dictionary, decision tables and a final quiz: everything is taken from modules 00 to 14, with a pointer for details.',
  duration: '≈ 30 min',
  objectives: [
    'Find the <code>oc</code> command for a topic in seconds (state, access, nodes, network, storage, updates, backup, OLM, security, GitOps, virtualization)',
    'Translate Kubernetes objects into OpenShift objects and back',
    'Choose quickly: installation method, topology, storage, recovery procedure, update channel',
    'Review the whole course with a cross-cutting final quiz (modules 00 to 14)'
  ],
  slides: [
    {
      title: 'How to use it: a sheet, not a course',
      blocks: [
        { t: 'text', html: 'This module contains <b>no new fact</b>: every command, object, value and statement is taken identically from a course module, with the “module NN” pointer next to it. For details, open that module.' },
        { t: 'bullets', frag: true, items: [
          '<b><code>oc</code> cheat sheets</b> by topic, then a K8s ↔ OCP <b>dictionary</b>, <b>decision tables</b> and a <b>final quiz</b> covering modules 00 to 14.',
          'Reference version: <b>OpenShift 4.20 EUS</b> (4.22 note in module 01). The points that the modules mark “to be verified” remain so here.',
          'Project, node and resource names (<code>team-a</code>, <code>worker-3</code>, <code>demo</code>…) are <b>examples</b> from the modules: replace them with yours.'
        ] },
        { t: 'callout', kind: 'warn', html: '<b>Dangerous commands</b>: etcd restoration is <b>not</b> copied here (“never restore from this sheet”: module 11); a drain, a NetworkPolicy deny-all, CSR approval or deleting an object call for the cited module\'s warning before running the command.' }
      ]
    },
    {
      title: 'Cheat sheet: cluster state',
      tag: 'cheat sheet',
      blocks: [
        { t: 'cmds', items: [
          ['oc whoami --show-server', 'Checks the targeted server'],
          ['oc get clusterversion', 'Version and Available=True'],
          ['oc get nodes', 'All nodes Ready'],
          ['oc get co', 'Cluster Operators: Available, not Degraded'],
          ['oc whoami --show-console', 'Web console URL'],
          ['oc get nodes -o wide', 'All nodes Ready, expected roles and IPs?'],
          ['oc get mcp', 'Pools up to date (UPDATED=True, DEGRADED=False)?'],
          ['oc get pods -A | grep -v -E "Running|Completed"', 'Pods in error after installation'],
          ['oc describe co authentication', 'message of the Degraded condition'],
          ['oc adm release info', 'contents of the current release']
        ] },
        { t: 'table', head: ['Condition', 'Meaning', 'Reaction'], rows: [
          ['<b>Available</b>', 'The service is provided', 'If <code>False</code>: real outage'],
          ['<b>Progressing</b>', 'A change is in progress', 'Normal during an upgrade'],
          ['<b>Degraded</b>', 'It works badly or half-way', 'Read the message, it is your starting point'],
          ['<b>Upgradeable</b>', 'The minor update is allowed', '<code>False</code> blocks the next minor']
        ] },
        { t: 'callout', kind: 'tip', html: 'A healthy cluster means all operators Available before you start (modules 00 and 03). Incident method: cluster first (<code>oc get co</code>, <code>oc get mcp</code>, <code>oc get nodes</code>), then the node, then the pod (module 12).' }
      ]
    },
    {
      title: 'Cheat sheet: projects, access and RBAC',
      tag: 'cheat sheet',
      blocks: [
        { t: 'cmds', items: [
          ['oc login --web', 'Authentication via OAuth (browser); assumes an identity provider (to be verified depending on your oc version, module 00)'],
          ['oc new-project demo', 'Creates a Project and switches to it'],
          ['oc whoami', 'current user'],
          ['oc whoami -t', 'current token (don\'t paste it into a ticket!)'],
          ['oc logout', 'revokes the token server-side'],
          ['oc auth can-i create deployments -n team-a', 'Can I do this? (myself)'],
          ['oc auth can-i --list -n team-a --as alice', 'Everything Alice can do (impersonation: requires the <code>impersonate</code> right)'],
          ['oc adm policy who-can delete pods -n team-a', 'Who can do this? (users and groups)'],
          ['oc adm policy add-role-to-group view team-a-ro -n team-a', 'Same for a group (preferred)'],
          ['oc adm policy add-cluster-role-to-group cluster-reader ops-readonly', 'ClusterRoleBinding to a group']
        ] },
        { t: 'callout', kind: 'tip', html: 'Groups, never users in bindings; least privilege: RoleBinding on a project rather than ClusterRoleBinding (module 06). A project is born with its guardrails thanks to the project template (module 06).' },
        { t: 'callout', kind: 'warn', html: 'Deleting <code>kubeadmin</code> is <b>irreversible</b>: first check a real IdP cluster-admin login and copy the admin kubeconfig to a vault (module 06). The command is not copied here.' }
      ]
    },
    {
      title: 'Cheat sheet: applications, pods and debug',
      tag: 'cheat sheet',
      blocks: [
        { t: 'cmds', items: [
          ['oc new-app <image|git>', 'Deploys an app from an image or a repository (S2I)'],
          ['oc expose svc/web', 'Creates a Route'],
          ['oc rollout status deploy/web', 'Rollout progress'],
          ['oc explain route.spec.tls', 'API docs, also for OCP CRDs'],
          ['oc get events --sort-by=.lastTimestamp', 'Recent events, sorted by date: a rejected pod or a stuck PVC shows up there first (modules 08 and 09)'],
          ['oc exec deploy/web -- curl -sI http://other-svc:8080', 'Tests access to another Service from a pod (network diagnosis)'],
          ['oc get endpoints web', 'Does the Service have endpoints?'],
          ['oc debug node/<n>', 'Privileged shell on a node (<code>chroot /host</code>)'],
          ['oc adm must-gather', 'Diagnostic collection for support'],
          ['oc adm top nodes', 'Node resource usage']
        ] },
        { t: 'callout', kind: 'trap', html: 'The “<code>oc adm policy add-scc-to-user anyuid</code>” reflex fixes the symptom but opens a hole: fix the image (module 01; details: module 09). For a Red Hat ticket: attach the <code>must-gather</code> to the request (module 12).' }
      ]
    },
    {
      title: 'Cheat sheet: nodes, MachineConfig and Machine API',
      tag: 'cheat sheet',
      blocks: [
        { t: 'cmds', items: [
          ['oc debug node/<n> -- chroot /host rpm-ostree status', 'Deployed OS image, version, previous deployment'],
          ['oc debug node/<n> -- chroot /host crictl ps', 'Containers seen by CRI-O on the node'],
          ['oc adm node-logs <n> -u kubelet', 'Logs of a node systemd unit'],
          ['oc get node <n> -o wide', 'Kernel version, OS image, runtime (CONTAINER-RUNTIME)'],
          ['oc get mc', 'MachineConfigs, including the <code>rendered-*</code>'],
          ['oc get mcp', 'Pools: UPDATED / UPDATING / DEGRADED, machine count'],
          ['oc describe mcp worker', 'Which rendered is targeted, which nodes are lagging'],
          ['oc get machinesets -n openshift-machine-api', 'Machine groups and replicas'],
          ['oc get machines -n openshift-machine-api', 'One Machine per node (phase, provider ID)'],
          ['oc get bmh -n openshift-machine-api', 'BareMetalHost (Metal3) in bare metal IPI']
        ] },
        { t: 'callout', kind: 'trap', html: 'If you edit a file by hand on a node, it will be overwritten (or the <b>MachineConfigPool</b> will go Degraded) at the next render. Any OS change goes through a declarative object.' },
        { t: 'callout', kind: 'onprem', html: 'Without the Machine API, <code>oc get machines</code> can be empty: that is normal, not a bug (module 02).' }
      ]
    },
    {
      title: 'Cheat sheet: node maintenance',
      tag: 'cheat sheet',
      blocks: [
        { t: 'cmds', items: [
          ['oc adm cordon worker-3', 'Forbid new pods on the node'],
          ['oc adm drain worker-3 --ignore-daemonsets --delete-emptydir-data', 'Evacuate cleanly; <code>--delete-emptydir-data</code> deletes emptyDir data'],
          ['oc adm uncordon worker-3', 'Back in service']
        ] },
        { t: 'callout', kind: 'warn', html: '<b>On a SNO</b>, there is no other node: the MCO <b>skips the drain</b> during updates and everything reboots with the node; a manual <code>drain</code> would cut routers, console and OAuth: <b>only in a maintenance window</b>, with <code>oc adm uncordon</code> as rollback. (module 12)' },
        { t: 'callout', kind: 'warn', html: 'A <b>PDB that is too strict</b> or pods without a controller make the drain fail: the message says which. On bare metal: if your firmware forces a reboot, <b>drain first</b>; the MCO doesn\'t know about your manual operations. (module 12)' }
      ]
    },
    {
      title: 'Cheat sheet: node CSRs',
      tag: 'cheat sheet',
      blocks: [
        { t: 'cmds', items: [
          ['oc get csr | grep Pending', 'No CSR left pending?'],
          ['oc get csr -o custom-columns=NAME:.metadata.name,REQUESTOR:.spec.username,SIGNER:.spec.signerName,STATE:.status.conditions[*].type', 'All CSRs with requestor and signer (those with no state are pending)'],
          ['oc adm certificate approve CSR_NAME', 'Approve a request <b>whose requestor you have verified</b>']
        ] },
        { t: 'callout', kind: 'trap', html: 'Only approve CSRs that are <b><code>Pending</code></b> and whose <b>requestor you have verified</b> (expected node name, signer): a blindly approved CSR can give an intruder a node certificate, hence a fake node in your cluster. Replacing the API and Ingress certificates: module 04.' }
      ]
    },
    {
      title: 'Cheat sheet: network and Routes',
      tag: 'cheat sheet',
      blocks: [
        { t: 'cmds', items: [
          ['oc get ingresscontroller -n openshift-ingress-operator', 'The cluster\'s IngressControllers'],
          ['oc get pods -n openshift-ingress', 'The router pods'],
          ['oc get route -A | head', 'The Routes of all projects'],
          ['oc create route edge web --service=web --hostname=web.apps.ocp4.example.com', 'Creates an edge Route to a Service'],
          ['oc get route web', 'Checks the Route'],
          ['oc annotate route web haproxy.router.openshift.io/timeout=60s', 'HAProxy annotation on the Route (60 s timeout)'],
          ['oc get networkpolicy,adminnetworkpolicy -A', 'NetworkPolicy and AdminNetworkPolicy of all projects'],
          ['dig +short api.ocp4.example.com', 'Does the API name resolve?']
        ] },
        { t: 'callout', kind: 'trap', html: 'Creating a <code>LoadBalancer</code> Service on bare metal without MetalLB: it stays in <code>&lt;pending&gt;</code> indefinitely. It is not a bug, it is the absence of an implementation (module 02, 03: the API LB is a different topic).' }
      ]
    },
    {
      title: 'Cheat sheet: NetworkPolicy',
      tag: 'cheat sheet',
      blocks: [
        { t: 'cmds', items: [['dig +short test.apps.ocp4.example.com', 'the wildcard must answer']] },
        { t: 'callout', kind: 'trap', html: '<b>OCP pitfall</b>: a deny-all also cuts off the <b>routers</b>: plan <code>allow-from-openshift-ingress</code> (label <code>policy-group.network.openshift.io/ingress</code>) and, with <b>HostNetwork</b> routers (on-prem default), <code>allow-from-hostnetwork</code> (label <code>policy-group.network.openshift.io/host-network</code>).' },
        { t: 'callout', kind: 'warn', html: 'The two YAMLs <code>allow-from-openshift-ingress</code> and <code>allow-from-hostnetwork</code> are the ones from the 4.20 docs. <b>Which one is enough depending on the publishing mode</b> of the <code>IngressController</code> (HostNetwork or LoadBalancerService/NodePort) is not stated explicitly in the pages read: <b>to be verified</b>; in practice, apply both then test. Beware: a badly opened deny-all cuts you off from your own applications.' }
      ]
    },
    {
      title: 'Cheat sheet: storage',
      tag: 'cheat sheet',
      blocks: [
        { t: 'cmds', items: [
          ['oc get sc', 'Available StorageClasses'],
          ['oc get csidriver', 'Installed CSI drivers'],
          ['oc get pods -n openshift-cluster-csi-drivers', 'CSI driver pods'],
          ['oc get co storage', 'Storage Cluster Operator'],
          ['oc describe pvc db-data', 'Why a PVC stays Pending'],
          ['oc get pvc db-data -w', 'Follow a PVC (expansion, binding)'],
          ['oc get volumeattachment', 'Volume attachments to nodes'],
          ['oc get pvc -n openshift-image-registry', 'Internal registry PVC'],
          ['oc get storagecluster -n openshift-storage', 'Expected phase: <code>Ready</code>'],
          ['oc get cephcluster -n openshift-storage', 'Ceph health as seen by Rook']
        ] },
        { t: 'callout', kind: 'trap', html: 'RWO ≠ “a single pod”: it is “a single node”. During a rolling update, the new pod lands on another node, and you get a <b>Multi-Attach error</b>. Solutions: <code>Recreate</code> strategy, RWX, or StatefulSet.' },
        { t: 'callout', kind: 'trap', html: 'A CSI snapshot lives <b>on the same backend</b> as the volume: if the array or pool is lost, snapshot and data go together. It is <b>not</b> a backup. Backup and migration: module 11.' }
      ]
    },
    {
      title: 'Cheat sheet: platform monitoring',
      tag: 'cheat sheet',
      blocks: [
        { t: 'cmds', items: [
          ['oc get pods -n openshift-monitoring', 'Platform monitoring pods'],
          ['oc get route thanos-querier -n openshift-monitoring', 'Thanos Querier route'],
          ['oc get cm cluster-monitoring-config -n openshift-monitoring', 'absent by default'],
          ['oc -n openshift-monitoring edit configmap cluster-monitoring-config', 'Configure platform monitoring (for example <code>enableUserWorkload: true</code>)'],
          ['oc -n openshift-user-workload-monitoring get pod', 'User project monitoring pods']
        ] },
        { t: 'callout', kind: 'trap', html: 'A syntax error in <code>alertmanager.yaml</code> stops alert delivery: keep a copy before editing (procedure from module 05). Watchdog is an always-firing alert by design: the alerting chain\'s “dead man\'s switch” (module 05).' }
      ]
    },
    {
      title: 'Cheat sheet: alerts and logs',
      tag: 'cheat sheet',
      blocks: [
        { t: 'cmds', items: [
          ['oc adm policy add-role-to-user monitoring-edit alice -n team-a', 'Monitoring role: create rules and monitors in a project'],
          ['oc adm policy add-role-to-user alert-routing-edit alice -n team-a', 'Monitoring role: a project\'s alert routing'],
          ['oc exec alertmanager-main-0 -n openshift-monitoring -- amtool config routes show --alertmanager.url http://localhost:9093', 'Check the Alertmanager route tree (amtool is in the pod)'],
          ['oc get co monitoring', 'Monitoring Cluster Operator (to watch after a configuration change)'],
          ['oc create sa logging-collector -n openshift-logging', 'Collector ServiceAccount']
        ] },
        { t: 'callout', kind: 'trap', html: 'Enabling a PVC on a Prometheus that is already running <b>restarts</b> its pods: do it at a quiet time and watch <code>oc get co monitoring</code>. Sizing: use the actual consumption (<code>prometheus_tsdb_*</code>) rather than a random value.' }
      ]
    },
    {
      title: 'Cheat sheet: updates',
      tag: 'cheat sheet',
      blocks: [
        { t: 'cmds', items: [
          ['oc adm upgrade', 'Updates available in the channel'],
          ['oc adm upgrade channel stable-4.20', 'Choose the update channel'],
          ['oc get clusterversion version -o jsonpath=\'{.spec.channel}{"\\n"}\'', 'Current channel'],
          ['oc adm upgrade recommend', 'Version recommendation and pre-check (alerts, operators); read-only'],
          ['oc adm upgrade --to-latest=true', 'To the latest recommended version of the channel'],
          ['oc adm upgrade --to=4.20.z', 'To a specific version (replace z with the chosen value)'],
          ['oc adm upgrade status', 'Update progress'],
          ['watch oc get co', 'Operators during the update']
        ] },
        { t: 'callout', kind: 'trap', html: '<b>Never acknowledge blindly</b>: the docs remind you that the admin is responsible for spotting and migrating removed APIs (the cluster can\'t see external tools or idle workloads). For 4.22, the docs state <b>no Kubernetes API removal</b>.' }
      ]
    },
    {
      title: 'Cheat sheet: pausing pools and Control Plane Only',
      tag: 'cheat sheet',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: `# Pause a worker pool (module 12), then resume
$ oc patch mcp/worker --type merge --patch '{"spec":{"paused":true}}'
$ oc patch mcp/worker --type merge --patch '{"spec":{"paused":false}}'` },
        { t: 'callout', kind: 'trap', wide: true, html: 'A pool left <b>paused</b> blocks the following minor updates and <b>inhibits maintenance tasks such as certificate rotation</b> (docs warning): never forget it. On SNO, update = reboot of the single node: maintenance window (module 02).' },
        { t: 'callout', kind: 'warn', html: '<b>To be completed within 60 days</b>: you can spread the procedure over several windows, but the docs ask to finish everything within 60 days so that the automations (including certificate rotation) complete. Only valid between <b>even-numbered</b> minors (EUS). (module 12)' }
      ]
    },
    {
      title: 'Cheat sheet: etcd backup and OADP',
      tag: 'cheat sheet',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: `# etcd backup (module 11): a SINGLE control plane node
$ oc debug --as-root node/master-0
sh-5.1# chroot /host
sh-5.1# /usr/local/bin/cluster-backup.sh /home/core/assets/backup` },
        { t: 'cmds', items: [['oc get backupstoragelocation -n openshift-adp', 'OADP: is the backup storage location available? (module 11)']] },
        { t: 'callout', kind: 'warn', html: 'Do <b>not back up every control plane node</b>: a single snapshot is enough (docs). Also wait <b>24 hours after installation</b> before the first backup (initial certificate rotation).' }
      ]
    },
    {
      title: 'Cheat sheet: recovery (pointer only)',
      tag: 'cheat sheet',
      blocks: [
        { t: 'table', head: ['Situation', 'Procedure'], rows: [
          ['<b>Quorum lost</b>, API read-only', '<code>quorum-restore.sh</code> on a recovery host'],
          ['Serious error, return to a <b>previous state</b>', 'Restore from a backup (<code>cluster-restore.sh</code>)'],
          ['<b>A failed etcd member</b>', 'Replacing the unhealthy member'],
          ['Expired control plane <b>certificates</b>', 'Approving the <code>node-bootstrapper</code> CSRs (and <code>kubelet-serving</code> in UPI)']
        ] },
        { t: 'callout', kind: 'warn', html: '<b>Never restore from this sheet.</b> etcd restoration is a “destructive and destabilizing” last resort: full procedures, prerequisites and risks in slides 6 to 10 of module 11. Practice first on a disposable cluster. OADP is not a disaster recovery solution for etcd (module 11).' }
      ]
    },
    {
      title: 'Cheat sheet: Operators and OLM',
      tag: 'cheat sheet',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'CatalogSource', sub: 'Operator catalog' },
          { label: 'PackageManifest', sub: 'available channels' },
          { label: 'Subscription', sub: 'channel + approval', hl: true },
          { label: 'InstallPlan', sub: 'installation steps' },
          { label: 'CSV', sub: 'the installed Operator' }
        ], caption: 'An <b>OperatorGroup</b> (in the Operator\'s namespace) defines the watched namespaces.' },
        { t: 'cmds', items: [
          ['oc get catalogsource -n openshift-marketplace', 'Available catalogs'],
          ['oc get packagemanifest -n openshift-marketplace | head', 'Installable Operators'],
          ['oc get packagemanifest lvms-operator -n openshift-marketplace -o jsonpath=\'{.status.defaultChannel}\'', 'Default channel of an Operator (otherwise: <code>oc describe</code>)'],
          ['oc get sub,installplan,csv -n openshift-lvm-storage', 'Where an Operator installation stands']
        ] }
      ]
    },
    {
      title: 'Cheat sheet: Operators, approval and sources',
      tag: 'cheat sheet',
      blocks: [
        { t: 'cmds', items: [
          ['oc get csv -n openshift-lvm-storage', '<code>Succeeded</code> phase = installed'],
          ['oc get installplan -n openshift-lvm-storage', 'Pending InstallPlan (Manual approval)'],
          ['oc get operatorhub cluster -o yaml', 'Default OperatorHub sources'],
          ['oc get consoleplugin', 'Console plugins']
        ] },
        { t: 'callout', kind: 'trap', html: 'An InstallPlan <b>forgotten in Pending</b> leaves the Operator on its current version, sometimes vulnerable or incompatible with the next cluster version. Some Operators also declare a maximum OCP version and can <b>block the cluster update</b> (<code>olm.maxOpenShiftVersion</code> annotation: the <code>olm</code> cluster Operator goes <code>Upgradeable=False</code>; minor updates affected; module 12).' }
      ]
    },
    {
      title: 'Cheat sheet: SCC, diagnosis and assignment',
      tag: 'cheat sheet',
      blocks: [
        { t: 'cmds', items: [
          ['oc get pod web-abc -o jsonpath=\'{.metadata.annotations.openshift\\.io/scc}\'', 'SCC actually assigned to a pod'],
          ['oc get scc', 'List of SCCs'],
          ['oc adm policy who-can use scc privileged', 'Audit: who can create privileged pods?'],
          ['oc adm policy scc-subject-review -f pod.yaml', 'Which SCCs would admit this pod for me?'],
          ['oc adm policy scc-subject-review -z my-sa -n team-a -f root-pod.yaml', 'Which SCCs would admit this pod for a given ServiceAccount?']
        ] },
        { t: 'callout', kind: 'trap', html: 'The “<code>add-scc-to-user anyuid</code>” reflex fixes the symptom and opens a hole: the image is <b>not fixed</b> and nothing limits its privileges anymore. Order of preference: <b>fix the image</b>, then <code>nonroot-v2</code> or a dedicated SCC, then (as a last resort, traced) <code>anyuid</code>.' }
      ]
    },
    {
      title: 'Cheat sheet: dedicated SCC and compliance',
      tag: 'cheat sheet',
      blocks: [
        { t: 'cmds', items: [
          ['oc create sa my-sa -n team-a', 'ServiceAccount used by the workload'],
          ['oc create clusterrole use-nonroot-bind80 --verb=use --resource=scc --resource-name=nonroot-bind80', 'Role that allows <b>only</b> this SCC (<code>use</code> verb)'],
          ['oc create rolebinding my-sa-scc --clusterrole=use-nonroot-bind80 --serviceaccount=team-a:my-sa -n team-a', 'Namespace-scoped binding'],
          ['oc get compliancesuite -n openshift-compliance -w', 'Follow a compliance scan'],
          ['oc get compliancecheckresult -n openshift-compliance -l compliance.openshift.io/check-status=FAIL', 'Failing checks (a FAIL is not always a fault)']
        ] },
        { t: 'callout', kind: 'warn', html: '<b>Never modify</b> the default SCCs: the docs warn that customizing them can cause problems for deploying platform pods or for updating. For a particular need, <b>create a dedicated SCC</b>.' }
      ]
    },
    {
      title: 'Cheat sheet: GitOps (OpenShift GitOps)',
      tag: 'cheat sheet',
      blocks: [
        { t: 'cmds', items: [
          ['oc get pods -n openshift-gitops', 'Pods of the OpenShift GitOps instance'],
          ['oc label namespace gitops-lab argocd.argoproj.io/managed-by=openshift-gitops', 'A namespace managed by the instance must carry this label'],
          ['oc auth can-i create resourcequotas --as system:serviceaccount:openshift-gitops:openshift-gitops-argocd-application-controller -n gitops-lab', 'Does the instance have the right to create this object? (Argo CD does not have cluster-admin)']
        ] },
        { t: 'table', head: ['Object (<code>argoproj.io/v1alpha1</code>)', 'Role'], rows: [
          ['<code>Application</code>', 'A <b>repo + path + revision</b> synchronized to a <b>destination</b> (cluster + namespace)'],
          ['<code>AppProject</code>', 'Authorization scope: which repos, which destinations, which resource types'],
          ['<code>ApplicationSet</code>', 'Generates <b>several Applications</b> from a template (list, Git folders, clusters)'],
          ['<code>ArgoCD</code> (<code>argoproj.io/v1beta1</code>)', 'CR of the <b>OpenShift GitOps Operator</b> that describes <b>an instance</b> of Argo CD']
        ] },
        { t: 'callout', kind: 'trap', html: 'The default instance is <b>reserved for administrators and cluster configuration</b>: don\'t give access to non-admins and <b>don\'t use it to deliver applications</b> (the multi-tenancy docs advise against it). For teams: <b>dedicated instances</b>.' }
      ]
    },
    {
      title: 'Cheat sheet: virtualization and Serverless',
      tag: 'cheat sheet',
      layout: 'two',
      blocks: [
        { t: 'text', html: '<b>OpenShift Virtualization</b> (module 13)' },
        { t: 'cmds', items: [
          ['oc get csv -n openshift-cnv', 'Operator installed?'],
          ['oc get hco -n openshift-cnv kubevirt-hyperconverged -o json | jq .status.conditions', 'HyperConverged conditions'],
          ['oc get vm,vmi -n vms', 'VMs and instances'],
          ['virtctl start vm-demo -n vms', 'Start the VM'],
          ['virtctl console vm-demo -n vms', 'Serial console'],
          ['virtctl stop vm-demo -n vms', 'Stop the VM']
        ] },
        { t: 'text', html: '<b>OpenShift Serverless</b> (module 13)' },
        { t: 'cmds', items: [
          ['oc get knativeserving.operator.knative.dev/knative-serving -n knative-serving', 'Knative Serving state'],
          ['oc get ksvc -n serverless-demo', 'Knative services'],
          ['oc get revision -n serverless-demo', 'Revisions'],
          ['kn service list -n serverless-demo', 'Services, with the kn CLI']
        ] },
        { t: 'callout', kind: 'warn', html: 'Exact apiVersion of HyperConverged and placement options: <b>to be verified</b> in “Installing OpenShift Virtualization”; the types (instance types, CDI, boot sources) vary by version: check with <code>oc explain</code> (module 13).' }
      ]
    },
    {
      title: 'K8s ↔ OpenShift dictionary',
      tag: 'dictionary',
      blocks: [
        { t: 'table', head: ['You say (K8s)', 'OpenShift says', 'Good to know'], rows: [
          ['Namespace', '<b>Project</b>', 'Namespace + annotations + creation template + <code>self-provisioner</code>'],
          ['Ingress', '<b>Route</b>', 'Ingress is still supported (converted to a Route behind the scenes)'],
          ['Deployment', 'Deployment', '<code>DeploymentConfig</code> still exists but is <b>deprecated</b>: don\'t use it anymore'],
          ['Pod Security (PSA)', '<b>SCC</b>', 'Cluster objects, bound to ServiceAccounts via RBAC'],
          ['Image + tag', '<b>ImageStream</b>', 'Pointer to images, with redeployment triggers'],
          ['Dockerfile / Kaniko', '<b>BuildConfig</b> / S2I', 'Gradually replaced by Tekton / Shipwright'],
          ['kubeadm join / OS by hand', '<b>MachineSet / MachineConfig</b>', 'Nodes are provisioned and configured declaratively'],
          ['kubectl', '<b>oc</b>', 'Superset of kubectl: <code>oc login</code>, <code>oc new-app</code>, <code>oc debug</code>…']
        ] },
        { t: 'callout', kind: 'k8s', html: 'Details of each line: module 01 (Project, Route, SCC, ImageStream), module 02 (MachineSet, MachineConfig), module 09 (SCC). On OCP, the CNI is unique: OVN-Kubernetes (module 07).' }
      ]
    },
    {
      title: 'Dictionary: platform objects (1/2)',
      tag: 'dictionary',
      blocks: [
        { t: 'table', head: ['Object / acronym', 'What it is', 'Module'], rows: [
          ['<b>CVO</b> (Cluster Version Operator)', 'Reads the release image (list of the versions of all components) and reconciles each Cluster Operator', 'module 02'],
          ['<b>ClusterOperator</b>', 'Each operator publishes a ClusterOperator object with its conditions', 'module 02'],
          ['<b>MachineSet</b> / <b>Machine</b>', 'One node = one Machine object, one homogeneous group = one MachineSet (like a ReplicaSet of machines)', 'module 02'],
          ['<b>MachineHealthCheck</b>', 'Watches the nodes of a set of machines and deletes the Machine if the node stays unhealthy', 'module 02'],
          ['<b>MachineConfig</b>', 'A fragment of OS config (files, systemd units, kernel args…) with a target role', 'module 02']
        ] }
      ]
    },
    {
      title: 'Dictionary: platform objects (2/2)',
      tag: 'dictionary',
      blocks: [
        { t: 'table', head: ['Object / acronym', 'What it is', 'Module'], rows: [
          ['<b>MachineConfigPool</b> (MCP)', 'A group of nodes (master, worker, infra…) and their MachineConfigs', 'module 02'],
          ['<b>MCD</b> / <b>MCS</b>', 'MCD: DaemonSet on each node, applies, drains, reboots if needed; MCS: serves Ignition to new nodes on port 22623', 'module 02'],
          ['<b>OLM</b>: CatalogSource, Subscription, InstallPlan, CSV', 'Operator catalog, channel + approval, installation steps, the installed Operator', 'module 04'],
          ['<b>config.openshift.io</b>', 'One “cluster” resource per topic: <code>proxy</code>, <code>apiserver</code>, <code>ingress.config</code>, <code>image.config</code>', 'module 04'],
          ['<b>kubeadmin</b>', 'Temporary user created at install (cluster-admin); to be deleted after the IdP is configured', 'module 06']
        ] }
      ]
    },
    {
      title: 'Dictionary: network, security, applications (1/2)',
      tag: 'dictionary',
      blocks: [
        { t: 'table', head: ['Object / acronym', 'What it is', 'Module'], rows: [
          ['<b>Project</b>', 'A Namespace with annotations and a controlled creation cycle (ProjectRequest)', 'module 01'],
          ['<b>Route</b>', 'Richer than a classic Ingress: built-in TLS termination (edge, passthrough, re-encrypt), weights for A/B, HAProxy annotations', 'module 01'],
          ['<b>ImageStream</b>', 'A logical pointer to images (internal or external); a tag change can trigger a build or a rollout', 'module 01'],
          ['<b>SCC</b>', 'Cluster object that describes a set of runtime rights (user, capabilities, volumes, host access, SELinux…); it validates and mutates', 'module 09'],
          ['<b>AdminNetworkPolicy</b> / <b>BaselineAdminNetworkPolicy</b>', 'ANP: cluster object evaluated before NetworkPolicies; BANP: a single object, default guardrail', 'module 07']
        ] }
      ]
    },
    {
      title: 'Dictionary: network, security, applications (2/2)',
      tag: 'dictionary',
      blocks: [
        { t: 'table', head: ['Object / acronym', 'What it is', 'Module'], rows: [
          ['<b>UserDefinedNetwork</b> (UDN)', 'UDN (per namespace) and ClusterUserDefinedNetwork (several namespaces): advanced segmentation and isolation at the OVN-Kubernetes level', 'module 07'],
          ['<b>OADP</b>', 'API: Backup, Restore, Schedule, BackupStorageLocation, VolumeSnapshotLocation', 'module 11'],
          ['<b>Application</b> / <b>AppProject</b> / <b>ApplicationSet</b>', 'A repo + path + revision synchronized to a destination; authorization scope; several Applications from a template', 'module 10'],
          ['<b>VirtualMachine</b> / <b>VirtualMachineInstance</b>', 'Declaration of the VM / the running VM', 'module 13'],
          ['<b>HyperConverged</b>', 'The CR that deploys all the OpenShift Virtualization components', 'module 13']
        ] }
      ]
    },
    {
      title: 'Decision: installation and topology',
      tag: 'decision',
      blocks: [
        { t: 'table', head: ['Method', 'What you provide'], rows: [
          ['<b>Agent-based</b>', 'The machines, the network, DNS and LB (or VIPs), a workstation with <code>openshift-install</code>'],
          ['<b>Assisted Installer</b>', 'The machines, the network, DNS and LB (or VIPs); access to the service'],
          ['<b>IPI</b> (installer-provisioned)', 'vCenter or BMC credentials, DNS, reserved VIPs'],
          ['<b>UPI</b> (user-provisioned)', 'Everything: it is the most manual mode']
        ] },
        { t: 'callout', kind: 'tip', html: 'Starting rule: Agent-based if you have bare servers or a disconnected setup; IPI vSphere if your infrastructure is already vSphere and you have the rights (module 03).' },
        { t: 'table', head: ['Topology', 'Nodes', 'HA?'], rows: [
          ['<b>Standard (3+N)</b>', '3 masters + N workers (+ infra)', 'Yes'],
          ['<b>3-node compact</b>', '3 <b>schedulable</b> masters, 0 workers', 'Yes (control plane)'],
          ['<b>SNO</b> (Single Node)', '1 node: master + worker', 'No'],
          ['<b>2 nodes</b> (arbiter / fencing)', '2 nodes + arbiter or fencing', 'Partial'],
          ['<b>Hosted Control Planes</b>', 'Control plane as pods, separate workers', 'Yes']
        ] },
        { t: 'callout', kind: 'warn', html: 'The <code>platform</code> choice is structural: it determines the Machine API, the default storage and the VIPs, and it cannot be changed afterwards (module 03). HTTP(S) → Route; TCP/UDP exposed outside the cluster → LoadBalancer Service + MetalLB (or corporate LB + NodePort) (module 07).' }
      ]
    },
    {
      title: 'Decision: which storage?',
      tag: 'decision',
      blocks: [
        { t: 'table', head: ['Backend', 'Modes', 'Use case'], rows: [
          ['<b>vSphere CSI</b>', 'RWO (VMDK); RWX via vSAN File Services (if the vSphere environment supports it)', 'Cluster on vSphere, existing datastore'],
          ['<b>LVMS</b> (LVM Storage)', 'Local RWO block/file', 'SNO, edge, small clusters'],
          ['<b>Local Storage Operator</b>', 'RWO, Filesystem or Block volumeMode', 'Bare metal, dedicated disks, foundation for ODF'],
          ['<b>NFS</b>', 'RWX', 'Simple file sharing; not for databases'],
          ['<b>iSCSI / FC / vendor NAS</b>', 'RWO (block), RWX (file) depending on the array', 'Existing SAN/NAS array (NetApp, Dell, Pure, HPE…)'],
          ['<b>ODF</b>', 'RWO (RBD), RWX (CephFS), S3 object', 'Software-defined storage, all-in-one']
        ] },
        { t: 'callout', kind: 'onprem', html: 'On-prem, <b>the backend is on you</b>: capacity, performance, storage backup and vendor support. Choose it before installation, not after the first Pending PVC.' }
      ]
    },
    {
      title: 'Decision: which recovery?',
      tag: 'decision',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Situation', 'Procedure'], rows: [
          ['<b>Quorum lost</b>, API read-only', '<code>quorum-restore.sh</code> on a recovery host'],
          ['Serious error, return to a <b>previous state</b>', 'Restore from a backup (<code>cluster-restore.sh</code>)'],
          ['<b>A failed etcd member</b>', 'Replacing the unhealthy member'],
          ['Expired control plane <b>certificates</b>', 'Approving the <code>node-bootstrapper</code> CSRs (and <code>kubelet-serving</code> in UPI)']
        ] },
        { t: 'callout', kind: 'warn', html: 'etcd recovery: any recovery assumes at least one healthy control plane node; you choose the least destructive procedure that solves your problem (module 11). No restore command is given here.' }
      ]
    },
    {
      title: 'Decision: which update channel?',
      tag: 'decision',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Channel', 'Content'], rows: [
          ['<code>candidate-4.x</code>', 'New releases as soon as they are built, before final testing'],
          ['<code>fast-4.x</code>', 'Tested and supported releases, published with an erratum'],
          ['<code>stable-4.x</code>', 'After a delay on <code>fast</code>: on the order of one to two weeks for a fix, longer (on the order of 45 to 90 days) for the very first path to a new minor version'],
          ['<code>eus-4.x</code>', 'Releases of <code>stable</code> at the same time; mainly used for <b>Control Plane Only</b> updates (EUS → EUS)']
        ] },
        { t: 'callout', kind: 'tip', html: 'In production: <b>stable</b>. <b>candidate</b> and <b>fast</b> to test before your other clusters. Choosing the channel updates nothing: it decides what is <b>offered</b> to you.' }
      ]
    },
    {
      title: 'Final quiz 1/7',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Which environment level does module 00 recommend to cover almost the whole course?', options: ['E0: OpenShift Local is enough for everything', 'E2: a 3-node compact cluster is mandatory', 'E1: a well-sized SNO', 'E3: bare metal is mandatory'], answer: 2, explain: 'A well-sized SNO (E1) covers almost the whole course; a compact cluster (E2) is only useful for the bonus steps that require it (module 00).' },
        { t: 'quiz', q: 'What happens to the Kubernetes <code>Ingress</code> object on OpenShift?', options: ['It is still supported: it is converted to a Route behind the scenes', 'It is removed: only the Route exists', 'It necessarily requires an Ingress controller to be installed', 'It is only valid on cloud clusters'], answer: 0, explain: 'In the module 01 dictionary: Ingress → Route, “Ingress is still supported (converted to a Route behind the scenes)”.' },
        { t: 'quiz', q: 'A three-member etcd cluster: how many member failures does it tolerate?', options: ['None', 'Two', 'Three', 'Just one: the quorum is 2'], answer: 3, explain: 'Quorum = ⌊n/2⌋ + 1: with 3 members, 2 must be alive, so one failure is tolerated; going to 2 members protects against nothing (module 02).' }
      ]
    },
    {
      title: 'Final quiz 2/7',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'What is <code>maxUnhealthy</code> for in a MachineHealthCheck?', options: ['To limit the number of nodes a MachineSet can create', 'As a safeguard: if too many nodes are unhealthy at the same time, the MHC stops remediating so as not to destroy everything', 'To set the delay before a node is remediated', 'To disable the MHC during updates'], answer: 1, explain: 'maxUnhealthy is the MHC safeguard; never set it to 100% (module 02).' },
        { t: 'quiz', q: 'An installation seems to progress, then <code>install-complete</code> never finishes: console and OAuth unreachable. What is the #1 failure?', options: ['Port 6443 closed on the installation workstation', 'The forgotten <code>*.apps</code> wildcard DNS', 'A pull secret that is too old', 'An even number of masters'], answer: 1, explain: 'The forgotten <code>*.apps</code> wildcard is the #1 failure of installations (module 03).' },
        { t: 'quiz', q: 'An OLM <code>Subscription</code> is on <b>Manual</b> approval. A new version arrives in the channel. What happens?', options: ['The Operator is updated immediately', 'The Subscription is deleted', 'The cluster blocks the Operator update', 'OLM creates a pending InstallPlan: nothing moves until you approve it'], answer: 3, explain: 'Manual: OLM creates a pending InstallPlan. An InstallPlan forgotten in Pending leaves the Operator on its current version (module 04).' }
      ]
    },
    {
      title: 'Final quiz 3/7',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'You apply a chrony MachineConfig with the <code>role: worker</code> label. Which nodes are targeted?', options: ['The worker pool only: the masters have their own configuration (second MachineConfig with <code>role: master</code>)', 'All the nodes of the cluster', 'Infra nodes only', 'None: the MCO must be restarted'], answer: 0, explain: 'The <code>role: worker</code> label only targets the worker pool; all nodes must share the same time source (module 04).' },
        { t: 'quiz', q: 'What is the <code>Watchdog</code> alert for?', options: ['It signals the loss of etcd quorum', 'It signals a NotReady node', 'It is always firing by design: a “dead man\'s switch” to check that the alerting chain works', 'It warns of a failing update'], answer: 2, explain: 'Watchdog should reach your receiver regularly: it is the test of the alerting chain (module 05).' },
        { t: 'quiz', q: 'Before deleting the <code>kubeadmin</code> secret, what must you have verified?', options: ['That the secret is recreated automatically by the operator', 'That the cluster has only one node', 'That the Ingress certificate is replaced', 'A real IdP login with a cluster-admin group, and the admin kubeconfig copied to a vault'], answer: 3, explain: 'Deleting kubeadmin is irreversible: first check a real IdP cluster-admin login (module 06).' }
      ]
    },
    {
      title: 'Final quiz 4/7',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'You apply a <code>deny-all</code> in a project: the application is no longer reachable through its Route. Why?', options: ['The deny-all also cuts off the routers: you need <code>allow-from-openshift-ingress</code> and, with HostNetwork routers, <code>allow-from-hostnetwork</code> (which one is enough depends on the publishing mode: to be verified; apply both then test)', 'The Route must be recreated in passthrough mode', 'NetworkPolicies only apply to HostNetwork pods', 'The deny-all deletes the Route'], answer: 0, explain: 'OCP pitfall: a deny-all also cuts off the routers; these opening policies go in the project template. Which of the two is enough depending on the IngressController publishing mode is not stated explicitly: to be verified, and in practice apply both then test (module 07).' },
        { t: 'quiz', q: 'A Deployment with an <code>RWO</code> PVC undergoes a rolling update and you get “Multi-Attach error”. Why?', options: ['The PVC is full', 'RWO means “a single node”: the new pod lands on another node', 'The StorageClass is deleted', 'An RWO PVC accepts no pod'], answer: 1, explain: 'RWO ≠ “a single pod”: it is “a single node”. Solutions: Recreate strategy, RWX, or StatefulSet (module 08).' },
        { t: 'quiz', q: 'An image won\'t start because of the SCC. What is the right approach?', options: ['Give <code>anyuid</code> to the ServiceAccount, it\'s the fastest', 'Modify the cluster\'s restricted-v2 SCC', 'Fix the image: the default SCC is restricted-v2, <code>anyuid</code> is only granted as a last resort', 'Disable SCC admission'], answer: 2, explain: 'Order of preference: fix the image, then nonroot-v2 or a dedicated SCC, then anyuid as a last resort, traced; never modify the default SCCs (module 09).' }
      ]
    },
    {
      title: 'Final quiz 5/7',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Argo CD keeps reporting <code>OutOfSync</code> on a resource modified by an operator. What do you do?', options: ['Ignore the fields managed elsewhere with <code>ignoreDifferences</code> rather than letting selfHeal fight the operator', 'Enable selfHeal so that Argo CD wins', 'Delete the operator', 'Disable Argo CD on this namespace'], answer: 0, explain: 'A selfHeal that keeps undoing a field managed by an operator can generate cascading restarts (module 10).' },
        { t: 'quiz', q: 'What does an etcd backup not contain?', options: ['Secrets', 'ConfigMaps and RBAC configuration', 'The state of the operators', 'The content of persistent volumes'], answer: 3, explain: 'The content of PVs is never part of the etcd snapshot: the etcd backup restores the cluster, not your applications\' data (module 11).' },
        { t: 'quiz', q: 'What do the OADP docs say about etcd?', options: ['OADP replaces the etcd backup', 'OADP backs up etcd but not volumes', 'OADP is not a disaster recovery solution for etcd or OpenShift Operators', 'OADP only works with ODF object storage'], answer: 2, explain: 'The etcd and OADP backups are complementary (module 11).' }
      ]
    },
    {
      title: 'Final quiz 6/7',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'The cluster is <code>Upgradeable=False</code> with <code>AdminAckRequired</code>. What do you do?', options: ['I acknowledge right away to unblock', 'I check that the removed APIs are no longer used, then I acknowledge in <code>admin-acks</code>', 'I delete the admin-acks ConfigMap', 'I force the update with an option'], answer: 1, explain: 'Never acknowledge blindly: the admin is responsible for spotting and migrating removed APIs (module 12).' },
        { t: 'quiz', q: 'What does the update checklist (module 12) ask about <code>MachineHealthCheck</code>s?', options: ['To pause them during the operation (<code>cluster.x-k8s.io/paused=""</code> annotation)', 'To delete them permanently', 'To raise their <code>maxUnhealthy</code> to 100%', 'Nothing: they adapt on their own'], answer: 0, explain: 'To prevent them from replacing a node that is rebooting during the update (module 12).' },
        { t: 'quiz', q: 'On which OCP versions is OpenShift Serverless 1.37 supported?', options: ['OCP 4.12 to 4.16', 'OCP 4.19 to 4.22', 'Only OCP 4.20', 'OCP 4.16 to 4.20'], answer: 3, explain: 'Red Hat “OpenShift Operator Life Cycles” page, according to module 13 (general availability on November 24, 2025).' }
      ]
    },
    {
      title: 'Final quiz 7/7',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Your three-node control plane runs at 80% CPU in normal operation. What is the 4.20 docs rule?', options: ['80% is the recommended target', 'Stay at 60% at most of capacity: the other two nodes must absorb the load during a failure or an update', 'Only memory matters, not CPU', 'Just add a fourth master'], answer: 1, explain: 'The control plane is updated in series and suffers failures: keep usage at 60% at most of capacity (module 14).' },
        { t: 'quiz', q: 'For an infra node: what do the 4.20 docs recommend for the <code>worker</code> label?', options: ['Always remove it', 'Replace it with the master label', 'Keep it (double label <code>infra,worker</code>) and manage placement with taints; without it, a custom pool is mandatory', 'Remove it so the node isn\'t billed twice'], answer: 2, explain: 'Without the worker label, the MCO does not recognize the node without a custom pool (modules 02 and 14).' }
      ]
    },
    {
      title: 'Going further',
      blocks: [
        { t: 'text', html: 'The official sources are <b>docs.redhat.com</b> (OpenShift Container Platform 4.20 documentation), <b>docs.okd.io</b> and <b>access.redhat.com</b> (life cycle, support matrices). The modules refer to these pages by their title, to be re-read for your version:' },
        { t: 'bullets', items: [
          '“Network connectivity requirements”: ports and flows between nodes (module 02).',
          '“Updating a cluster in a disconnected environment”, “Performing a Control Plane Only update” and “Preparing to update to 4.21”: updates (module 12).',
          '“Installing the OADP Operator”: application backup (module 11).',
          '“Installing OpenShift Virtualization” and the Red Hat “OpenShift Operator Life Cycles” page (module 13).',
          'Red Hat OpenShift Container Platform Life Cycle Policy: end-of-support dates, to be consulted before any roadmap (module 01).'
        ] },
        { t: 'callout', kind: 'tip', html: 'For a go-live, start again from the per-phase checklist of module 14: each line points to the owner module, hence to these sheets.' }
      ]
    }
  ],
  takeaways: [
    'A sheet is not the procedure: for any risky operation (etcd restore, drain, <code>deny-all</code>, CSR, deletion), open the module and read its warning before the command.',
    'Diagnosis: cluster first (<code>oc get co</code>, <code>oc get mcp</code>, <code>oc get nodes</code>), then the node, then the pod; <code>must-gather</code> attached to every ticket (modules 03 and 12).',
    'On OpenShift, the OS and the network are driven by objects: MachineConfig/MCP for the OS, a Route for HTTP exposure, an SCC for a pod\'s rights (modules 01, 02, 07, 09).',
    'Fix the image before granting a broad SCC; groups rather than users in bindings (modules 06 and 09).',
    'etcd backup and OADP are complementary; a backup that has never been restored is only a hypothesis (module 11).',
    'Before production, go through the module 14 checklist: each item points to the owner module.'
  ]
});
