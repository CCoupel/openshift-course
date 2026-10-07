COURSE.add({
  id: 'm01', lang: 'en', num: 1, emoji: '⚖️',
  title: 'K8s vs OCP',
  source: '1ecd65407ddd',
  tagline: 'Same engine, different bodywork: what OpenShift adds, enforces and renames.',
  duration: '≈ 45 min + lab 15 min',
  objectives: [
    'Place OCP relative to the “vanilla” Kubernetes you already know',
    'Master the K8s ↔ OCP dictionary (Project, Route, SCC, ImageStream…)',
    'Know what OCP deliberately locks down',
    'Know the editions, the life cycle and the subscription model',
    'Decide when OCP is (or is not) the right choice'
  ],
  slides: [
    {
      title: 'What is OCP, really?',
      blocks: [
        { t: 'text', html: '<p><b>OpenShift = Kubernetes + an opinionated distribution + a managed OS + Operators for everything.</b> You no longer build your platform brick by brick: it ships, is versioned and is updated as a single product.</p>' },
        { t: 'layers', frag: true, items: [
          { name: '🖥️ Web console', desc: 'Admin and developer views, built in, extensible' },
          { name: '🛠️ Dev tools', desc: 'Pipelines (Tekton), GitOps (Argo CD), S2I, Helm' },
          { name: '📦 Platform services', desc: 'Monitoring, logging, internal registry, OperatorHub (OLM)', hl: true },
          { name: '🔐 Secure by default', desc: 'Built-in OAuth, SCC, strict RBAC, non-root pods' },
          { name: '💽 Immutable OS', desc: 'RHCOS + MachineConfig: nodes are “cattle”', hl: true },
          { name: '☸️ Kubernetes', desc: 'Upstream, frozen and patched by Red Hat at each release', base: true }
        ] }
      ]
    },
    {
      title: 'The philosophy: everything is an Operator',
      blocks: [
        { t: 'text', html: '<p>On vanilla K8s, you pick and assemble the CNI, ingress, monitoring, auth… On OCP, <b>every cluster component is driven by a Cluster Operator</b>, itself orchestrated by a master operator.</p>' },
        { t: 'flow', nodes: [
          { label: 'CVO', sub: 'Cluster Version Operator', hl: true },
          { label: 'Cluster Operators', sub: '≈ 30: network, ingress, auth, monitoring…' },
          { label: 'Components', sub: 'Pods, DaemonSets, configs' }
        ], caption: 'The CVO reconciles the desired state defined by the release (release image) towards each operator.' },
        { t: 'code', lang: 'bash', file: 'terminal', code: '# Platform health in one command\n$ oc get clusteroperators   # alias: oc get co\n$ oc get clusterversion\n# Each operator: Available / Progressing / Degraded' },
        { t: 'callout', kind: 'tip', html: 'Diagnostic reflex #1: <code>oc get co</code>. A <b>Degraded</b> operator already tells you which component to look into.' }
      ]
    },
    {
      title: 'Vanilla Kubernetes vs OpenShift',
      layout: 'two',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '☸️ Vanilla K8s / distro', items: ['You assemble your own platform', 'OS of your choice, you patch it', 'CNI, Ingress, monitoring: your pick', 'Upgrade component by component', 'Maximum flexibility… and integration debt'] },
          right: { title: '🔴 OpenShift', items: ['Integrated platform, tested as a whole', 'RHCOS mandatory on the control plane', 'OVN-Kubernetes, HAProxy Router, Prometheus included', 'Upgrade orchestrated by the CVO', 'Less freedom, far less glue to maintain'] },
          verdict: 'OCP trades freedom for consistency and support.' }
      ]
    },
    {
      title: 'Detailed comparison',
      blocks: [
        { t: 'table', head: ['Topic', '☸️ Vanilla K8s', '🔴 OpenShift'], rows: [
          ['Installation', 'kubeadm, Kubespray, Cluster API…', '<code>openshift-install</code> (IPI/UPI), Assisted/Agent installer'],
          ['Node OS', 'Free choice (Ubuntu, RHEL…)', 'RHCOS (control plane and workers); RHEL compute nodes deprecated in 4.16, <b>removed as of 4.19</b> (RHCOS image layering replaces adding packages)'],
          ['Networking (CNI)', 'Calico, Cilium, Flannel…', 'OVN-Kubernetes (Cilium not natively supported)'],
          ['HTTP exposure', 'Ingress + a controller of your choice', 'HAProxy Router via the Ingress Operator, <code>Route</code> objects'],
          ['Authentication', 'OIDC / webhook to configure', 'Built-in OAuth server + Identity Providers'],
          ['Pod security', 'Pod Security Admission', 'SCC <i>and</i> PSA (SCCs remain the real safeguard)'],
          ['Registry', 'To be deployed', 'Internal registry + ImageStreams'],
          ['Monitoring', 'To be installed (kube-prometheus…)', 'Built-in Prometheus/Alertmanager stack'],
          ['Updates', 'Manual, component by component', '<code>oc adm upgrade</code>, channels, CVO'],
          ['Support', 'Community / distro vendor', 'Red Hat, closed compatibility matrix']
        ] }
      ]
    },
    {
      title: 'The translation dictionary',
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
        ] }
      ]
    },
    {
      title: 'Your turn: find the equivalent',
      tag: 'game',
      blocks: [
        { t: 'text', html: '<p>Click to flip each card and check your answer.</p>' },
        { t: 'cards', items: [
          { front: 'Namespace', back: '<b>Project</b>' },
          { front: 'Ingress', back: '<b>Route</b> (HAProxy)' },
          { front: 'PodSecurityPolicy', back: '<b>SCC</b> (SecurityContextConstraints)' },
          { front: 'Mutable image tag', back: '<b>ImageStreamTag</b>' },
          { front: 'Add a worker (kubeadm join)', back: '<b>MachineSet</b> → Machine → Node' },
          { front: 'Edit /etc on a node', back: '<b>MachineConfig</b> (or don\'t do it)' },
          { front: 'Helm chart for an operator', back: '<b>OLM</b> / OperatorHub (Subscription) — module 04' },
          { front: 'kubectl', back: '<b>oc</b>, but kubectl works too' }
        ] }
      ]
    },
    {
      title: 'Route vs Ingress',
      layout: 'two',
      blocks: [
        { t: 'text', html: '<p>A <b>Route</b> is richer than a classic Ingress: built-in TLS termination (<i>edge</i>, <i>passthrough</i>, <i>re-encrypt</i>), weights for <i>A/B</i> testing, HAProxy annotations. You create one in a single line.</p>' },
        { t: 'callout', kind: 'onprem', html: 'On-prem, <b>you</b> provide the load balancer in front of the routers and the wildcard DNS <code>*.apps.&lt;cluster&gt;.&lt;domain&gt;</code>. In the cloud, the installer creates the LBs for you.' },
        { t: 'code', lang: 'yaml', file: 'route.yaml', wide: true, code: 'apiVersion: route.openshift.io/v1\nkind: Route\nmetadata:\n  name: web\nspec:\n  to:\n    kind: Service\n    name: web\n  port:\n    targetPort: 8080\n  tls:\n    termination: edge\n    insecureEdgeTerminationPolicy: Redirect\n# Also created by: oc expose svc/web ; oc create route edge …' }
      ]
    },
    {
      title: 'Project ≠ just a Namespace',
      blocks: [
        { t: 'bullets', frag: true, items: [
          'A <b>Project</b> is a Namespace with annotations and a controlled creation cycle (<code>ProjectRequest</code>).',
          'Users create their projects through the <code>self-provisioner</code> role; a <b>project template</b> can inject quotas, a LimitRange and NetworkPolicies.',
          'The <code>openshift-*</code> and <code>kube-*</code> namespaces belong to the platform: don\'t deploy apps there.',
          '<code>oc new-project</code> automatically switches you into it (current context).'
        ] },
        { t: 'callout', kind: 'tip', html: 'For clean multi-tenancy, remove <code>self-provisioner</code> from users and push a project template: we\'ll come back to it in the RBAC and Configuration modules.' }
      ]
    },
    {
      title: 'SCC: the first surprise when migrating',
      tag: 'pitfall #1',
      blocks: [
        { t: 'text', html: '<p>By default, a pod runs with the <code>restricted-v2</code> SCC: <b>random UID within a range assigned to the namespace, no root, capabilities dropped, no hostPath, etc.</b> Many “Docker Hub” images crash because of it. <i>Details (strategies, priorities, creating SCCs): module 09.</i></p>' },
        { t: 'code', lang: 'bash', file: 'terminal', code: '# Which SCC did a pod get?\n$ oc get pod web-abc -o jsonpath=\'{.metadata.annotations.openshift\\.io/scc}\'\nrestricted-v2\n\n# Simulate: which SCC would admit this ServiceAccount?\n$ oc adm policy who-can use scc anyuid\n$ oc get scc' },
        { t: 'callout', kind: 'trap', html: 'The “<code>oc adm policy add-scc-to-user anyuid</code>” reflex fixes the symptom but opens a security hole. The right answer: <b>fix the image</b> (listen on a port &gt; 1024, folders set to <code>g=u</code>, no hard-coded <code>USER</code>).' },
        { t: 'quiz', q: 'An official nginx image won\'t start on OCP (“permission denied” on port 80). What is the best fix?', options: [
          'Give the <code>privileged</code> SCC to the ServiceAccount',
          'Use an “unprivileged” nginx image that listens on 8080',
          'Switch the cluster to permissive mode',
          'Force <code>runAsUser: 0</code> in the Deployment'
        ], answer: 1, explain: 'A random UID cannot bind a port &lt; 1024 nor write to root-only folders. Adapting the image is the clean solution; <code>privileged</code> should be avoided, and <code>runAsUser: 0</code> will be rejected by <code>restricted-v2</code>.' }
      ]
    },
    {
      title: 'ImageStreams & S2I',
      blocks: [
        { t: 'text', html: '<p>An <b>ImageStream</b> is a logical pointer to images (internal or external). A tag change can <b>trigger a build or a rollout</b> automatically. <b>S2I</b> (Source-to-Image) builds the image from source code without a Dockerfile.</p>' },
        { t: 'flow', nodes: [
          'Source code (Git)',
          { label: 'S2I build', sub: 'builder image + source', hl: true },
          'Image → ImageStream',
          { label: 'Trigger', sub: 'new tag detected' },
          'Deployment rollout'
        ] },
        { t: 'callout', kind: 'ocp', html: 'Today, many teams prefer <b>Tekton + Buildah</b> and an external registry. ImageStreams remain useful: tag import, caching and <i>triggers</i> rely on them, and the OCP base image catalog depends on them.' }
      ]
    },
    {
      title: 'What OCP locks down (on purpose)',
      layout: 'two',
      blocks: [
        { t: 'bullets', frag: true, items: [
          '<b>No “admin” SSH on nodes</b>: use <code>oc debug node/…</code>.',
          '<b>Immutable RHCOS</b>: <code>/usr</code> is read-only, you don\'t <code>yum install</code> anything.',
          '<b>OS config = MachineConfig</b>; kubelet config = <code>KubeletConfig</code>.',
          '<b>The control plane is not yours</b>: you don\'t edit its manifests by hand.',
          '<b>Sequential minor-version updates</b> (4.18 → 4.19 → 4.20).'
        ] },
        { t: 'callout', kind: 'trap', html: 'If you edit a file by hand on a node, it will be overwritten (or the <b>MachineConfigPool</b> will go Degraded) at the next render. Any OS change goes through a declarative object.' },
        { t: 'callout', kind: 'onprem', wide: true, html: 'On bare metal and vSphere, these rules apply fully, plus firmware, IPAM and storage management are on you. That is the price of autonomy.' }
      ]
    },
    {
      title: 'Editions & flavors',
      blocks: [
        { t: 'table', head: ['Product', 'What it is', 'Who manages what'], rows: [
          ['<b>OCP</b> (self-managed)', 'The official distribution, installed on your infrastructure', 'You: everything, including the control plane'],
          ['<b>OKD</b>', 'Community version (OS base: CentOS Stream CoreOS since OKD 4.16, formerly Fedora CoreOS)', 'You, without Red Hat support'],
          ['<b>SNO</b> / compact 3-node', 'Reduced OCP topologies (edge, lab)', 'You'],
          ['<b>Hosted Control Planes</b>', 'Control plane hosted as pods of another cluster', 'You, but a shared control plane'],
          ['<b>MicroShift</b>', 'Lightweight version for edge devices; its supported distribution is <b>Red Hat Device Edge</b> (MicroShift + RHEL)', 'You, without a console or full Operators'],
          ['<b>ROSA / ARO / OSD</b> ☁️', 'Managed OpenShift (AWS / Azure / Google)', 'Red Hat + cloud: control plane, upgrades, SRE']
        ] },
        { t: 'callout', kind: 'cloud', html: 'On managed offerings, your access depends on the offering: <code>dedicated-admin</code> by default on ROSA/OSD, <code>cluster-admin</code> possible (with restrictions); ARO provides a <code>kubeadmin</code> account. No free-form MachineConfig, no access to platform namespaces, upgrades scheduled with the provider. Many modules of this course (installation, MachineConfig, etcd) <b>would no longer concern you</b>.' }
      ]
    },
    {
      title: 'Versions & life cycle',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          'One OCP minor release roughly <b>every 4 months</b>.',
          'Rule of thumb: <b>K8s 1.(N+13) = OCP 4.N</b> (4.18 → K8s 1.31, 4.20 → 1.33, 4.22 → 1.35). Course reference: <b>4.20 EUS</b>.',
          'Note: <b>4.22</b> is the latest EUS (K8s 1.35; GA on June 9, 2026 according to the Red Hat Product Life Cycles page). The course stays on 4.20.',
          '<b>Even-numbered</b> releases (4.16, 4.18, 4.20, 4.22…) get <b>EUS</b> (Extended Update Support): longer support, EUS → EUS update path (e.g. 4.20 → 4.22). Procedure: module 12.',
          'Update channels: <code>stable-4.x</code>, <code>fast-4.x</code>, <code>eus-4.x</code>, <code>candidate-4.x</code>.'
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: '$ oc get clusterversion\n$ oc adm upgrade\n# Versions available in the current channel\n$ oc adm upgrade channel stable-4.20   # or eus-4.20' },
        { t: 'callout', kind: 'warn', wide: true, html: 'End-of-support dates change: always check the <b>Red Hat OpenShift Container Platform Life Cycle Policy</b> before planning. Never base a roadmap on what you remember.' }
      ]
    },
    {
      title: 'Subscription & pull secret',
      blocks: [
        { t: 'bullets', frag: true, items: [
          'OCP is a product under <b>subscription</b>: counted per pair of cores (or sockets on bare metal) on the <b>workers</b>.',
          'You need a <b>pull secret</b> (console.redhat.com) to pull the release images: it is required at installation and in the cluster configuration.',
          'On a <b>disconnected</b> cluster, you <b>mirror</b> the images (<code>oc-mirror</code>) to an internal registry and replace the pull secret with the mirror\'s.',
          'Control plane and infra nodes are generally not counted (check with your contract).'
        ] },
        { t: 'callout', kind: 'onprem', html: 'On an isolated network, plan the mirror registry, DNS and certificate management from day one: it is 40% of the effort of an on-prem project (disconnected installation: module 03).' }
      ]
    },
    {
      title: 'When to choose OCP? (and when not)',
      layout: 'two',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '✅ OCP is a good choice if…', items: ['You want a platform supported end to end', 'You need compliance and security by default', 'Many teams, need for multi-tenancy', 'Controlled life cycle and updates', 'Red Hat ecosystem already in place'] },
          right: { title: '🤔 Something else may fit better if…', items: ['Small cluster, a single team, little budget', 'You need a very specific CNI or OS', 'You want the latest K8s version as soon as it ships', '“We assemble everything ourselves” culture', 'Very constrained edge (see MicroShift, k3s)'] } }
      ]
    },
    {
      title: 'oc: what you add to kubectl',
      blocks: [
        { t: 'cmds', items: [
          ['oc login --web', 'Authentication via OAuth (browser)'],
          ['oc whoami --show-console', 'Console URL'],
          ['oc new-project demo', 'Creates a Project and switches to it'],
          ['oc new-app <image|git>', 'Deploys an app from an image or a repository (S2I)'],
          ['oc expose svc/web', 'Creates a Route'],
          ['oc rollout status deploy/web', 'Rollout progress'],
          ['oc debug node/<n>', 'Privileged shell on a node (<code>chroot /host</code>)'],
          ['oc adm top nodes', 'Node resource usage'],
          ['oc adm must-gather', 'Diagnostic collection for support'],
          ['oc get co', 'Cluster Operators health'],
          ['oc explain route.spec.tls', 'API docs, also for OCP CRDs']
        ] }
      ]
    },
    {
      title: 'Lightning quiz',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Which object most naturally replaces an Ingress in OpenShift?', options: ['Gateway', 'Route', 'Service type LoadBalancer', 'ImageStream'], answer: 1, explain: 'The <b>Route</b> is the native OCP object served by the HAProxy Router. The standard Ingress is still supported.' },
        { t: 'quiz', q: 'You want to change a sysctl parameter on all workers. What do you do?', options: ['SSH into each node and edit /etc/sysctl.d', 'Create a MachineConfig targeting the worker pool', 'Edit the kubelet by hand', 'Redeploy the cluster'], answer: 1, explain: 'RHCOS is managed declaratively: the <b>MachineConfig</b> is rendered then applied by the Machine Config Operator, with a controlled reboot.' },
        { t: 'quiz', q: 'Which tool triggers the update of all platform components?', options: ['kubeadm upgrade', 'The Cluster Version Operator (CVO)', 'Helm', 'The kubelet'], answer: 1, explain: 'The <b>CVO</b> applies the release image and drives the Cluster Operators.' }
      ]
    },
    {
      title: 'Lab: first steps with oc',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'Explore an OCP cluster', goal: 'Test cluster: OpenShift Local (CRC), SNO or your lab cluster.', steps: [
          'Prerequisites: environment E0 (OpenShift Local) or E1 (SNO), see module 00',
          'Log in: <code>oc login --web https://api.&lt;cluster&gt;:6443</code>',
          'Check health: <code>oc get co</code> — is any operator not <i>Available</i>?',
          'Create a project: <code>oc new-project demo</code>',
          'Deploy an app: <code>oc new-app --image=quay.io/redhattraining/hello-world-nginx</code>',
          'Expose it: <code>oc expose svc/hello-world-nginx</code> then <code>oc get route</code>',
          'Look at the SCC assigned to the pod: annotation <code>openshift.io/scc</code>',
          'Open a shell on a node: <code>oc debug node/&lt;n&gt;</code> then <code>chroot /host</code>',
          'Clean up: <code>oc delete project demo</code>'
        ] }
      ]
    }
  ],
  takeaways: [
    'OCP = K8s + integrated platform + managed OS; every building block is an Operator driven by the CVO.',
    'Project, Route, SCC, ImageStream, MachineConfig: the vocabulary to keep in mind.',
    'Default SCCs (non-root, random UID) are the #1 source of friction when migrating.',
    'The OS is immutable: any change goes through a declarative object, never by hand.',
    'On managed offerings (ROSA/ARO), you lose access to the control plane and many settings: check the scope.'
  ]
});
