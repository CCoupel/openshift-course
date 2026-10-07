COURSE.add({
  id: 'm13', lang: 'en', num: 13, emoji: '🖥️',
  title: 'Virtualization & Serverless',
  source: 'd66080dfedf0',
  tagline: 'Two ways to stop thinking “server”: VMs treated like pods with OpenShift Virtualization, and services that sleep at zero with OpenShift Serverless.',
  duration: '≈ 60 min + lab 25 min',
  objectives: [
    'Install OpenShift Virtualization and place its prerequisites (CPU, RWX storage, network)',
    'Describe a VM on OpenShift (VirtualMachine, DataVolume, instance types) and its live migration',
    'Plan a migration from VMware with the Migration Toolkit for Virtualization (MTV)',
    'Install OpenShift Serverless and deploy a Knative service that scales down to zero replicas',
    'Understand revisions, traffic splitting, Eventing and what the platform admin manages'
  ],
  slides: [
    {
      title: 'Two parts, one module',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '🖥️ Part A — Virtualization', items: ['<b>VMs</b> managed as Kubernetes objects', 'To <b>migrate or keep</b> non-containerized workloads', 'Suitable hardware (bare metal, shared storage)', 'Full lab: <b>E3</b> level'] },
          right: { title: '⚡ Part B — Serverless', items: ['<b>Services</b> that scale up and down <b>to zero</b>', 'For on-demand HTTP or event-driven workloads', 'One more Operator, no hardware requirement', 'Full lab: <b>E1</b> level'] },
          verdict: 'Both are installed through an <b>Operator</b> (module 04) and run like the rest of the platform: quotas, RBAC, backup, updates.' },
        { t: 'bullets', frag: true, items: [
          '<b>Boundaries</b>: storage and snapshots → module 08; network → module 07; backup → module 11; updates → module 12; security → module 09; GitOps → module 10.',
          'Reference version: <b>4.20 EUS</b>. The module is split into two parts of <b>equal weight</b>; part B is the most accessible in a lab.'
        ] }
      ]
    },
    {
      title: 'A1 — OpenShift Virtualization: the principle',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'VirtualMachine', sub: 'declarative object' },
          { label: 'VirtualMachineInstance', sub: 'the running VM', hl: true },
          { label: 'virt-launcher pod', sub: 'container with QEMU/KVM' },
          { label: 'Node', sub: 'KVM, storage, network' }
        ], caption: 'A VM is <b>a special pod</b>: scheduled, monitored, backed up and networked with the same mechanisms as a container.' },
        { t: 'bullets', frag: true, items: [
          '<b>KubeVirt</b> is the upstream project; <b>OpenShift Virtualization</b> is its supported distribution, installed by an Operator.',
          'One platform for <b>containers and VMs</b>: one network, one RBAC, one deployment tool.',
          'Console: a <b>Virtualization</b> view (VMs, templates, migrations) and the <code>virtctl</code> command line.'
        ] },
        { t: 'callout', kind: 'cloud', html: "Compared with vSphere: you lose the usual infrastructure tools (vCenter, DRS) but gain a <b>single model</b> for VMs and containers. On-prem, choosing the hardware and storage <b>is the project</b>; on managed cloud, VMs are often already provided by the IaaS (to be verified depending on the offering)." }
      ]
    },
    {
      title: 'A2 — Hardware and infrastructure prerequisites',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          '<b>CPU</b>: processors supported by RHEL 9, with the <b>virtualization extensions</b> (Intel VT or AMD-V) enabled in the firmware.',
          '<b>KVM</b>: virtualization relies on the Linux kernel; <b>nested virtualization</b> is meant for development and testing.',
          '<b>Storage</b>: <b>RWX</b> (shared) access for live migration; CSI snapshots (module 08).',
          '<b>Network</b>: default pod network, secondary networks for isolation (module 07).',
          '<b>Platform</b>: preferably <b>bare metal</b>; supported platforms and exact sizing: to be verified in “Hardware, software, and operational requirements” for 4.20.'
        ] },
        { t: 'callout', kind: 'onprem', html: "Your lab on VMs (nested hypervisor) doesn\'t behave like a bare metal production: performance, live migration and failures are not representative. That is why the VM lab is classified <b>E3</b>." },
        { t: 'callout', kind: 'warn', html: "Compatibility: OpenShift Virtualization 4.20 is supported with OCP 4.20 (4.20 release notes). Exact version and features: “Virtualization” release notes for your version." }
      ]
    },
    {
      title: 'A3 — Installing OpenShift Virtualization',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'cnv.yaml (CLI procedure from the docs)', code: `apiVersion: v1
kind: Namespace
metadata:
  name: openshift-cnv
---
apiVersion: operators.coreos.com/v1
kind: OperatorGroup
metadata:
  name: kubevirt-hyperconverged-group
  namespace: openshift-cnv
spec:
  targetNamespaces:
  - openshift-cnv
---
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: hco-operatorhub
  namespace: openshift-cnv
spec:
  channel: stable
  name: kubevirt-hyperconverged
  source: redhat-operators
  sourceNamespace: openshift-marketplace
---
apiVersion: hco.kubevirt.io/v1beta1
kind: HyperConverged
metadata:
  name: kubevirt-hyperconverged
  namespace: openshift-cnv
spec: {}` },
        { t: 'bullets', items: [
          'The <code>stable</code> channel installs the version <b>compatible with your OCP version</b> (docs); <code>HyperConverged</code> is the CR that deploys all the components.',
          'Checks: <code>oc get csv -n openshift-cnv</code> and <code>oc get hco -n openshift-cnv kubevirt-hyperconverged -o json | jq .status.conditions</code>.'
        ] },
        { t: 'callout', kind: 'warn', html: "OperatorGroup, Subscription and names come from the docs\' CLI procedure (4.20 subscription module); exact <code>apiVersion</code> of <code>HyperConverged</code> and options (infra/workloads placement): to be verified in “Installing OpenShift Virtualization”." }
      ]
    },
    {
      title: 'A4 — The objects of a VM',
      blocks: [
        { t: 'table', head: ['Object', 'Role'], rows: [
          ['<code>VirtualMachine</code> (<code>kubevirt.io/v1</code>)', 'Declaration of the VM (desired state, start strategy)'],
          ['<code>VirtualMachineInstance</code>', 'The VM <b>while running</b>, created from the previous one'],
          ['<code>DataVolume</code>', 'Disk imported or cloned into a PVC (via CDI)'],
          ['<code>DataSource</code> / boot sources', 'Boot images ready to clone (RHEL, etc.)'],
          ['Instance types and preferences', 'Standard sizes (CPU, memory) and reusable OS settings'],
          ['Templates', 'Console VM templates (historical mechanism)']
        ] },
        { t: 'callout', kind: 'tip', html: "Think in <b>two levels</b>: the <b>object</b> (VirtualMachine) that you manage in GitOps (module 10), and the running <b>instance</b> that you migrate, start or stop." },
        { t: 'callout', kind: 'warn', html: "The <code>apiVersion</code>s and type names (instance types, CDI, boot sources) vary by version: check with <code>oc explain</code> and the 4.20 docs before writing your manifests." }
      ]
    },
    {
      title: 'A5 — Creating and driving a VM',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'vm.yaml (illustration: DataVolume not provided)', code: `apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: vm-demo
  namespace: vms
spec:
  runStrategy: Always
  template:
    spec:
      domain:
        cpu:
          cores: 2
        memory:
          guest: 4Gi
        devices:
          disks:
          - name: rootdisk
            disk:
              bus: virtio
      volumes:
      - name: rootdisk
        dataVolume:
          name: vm-demo-root` },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc get vm,vmi -n vms\n$ virtctl start vm-demo -n vms\n$ virtctl console vm-demo -n vms\n$ virtctl stop vm-demo -n vms" },
        { t: 'bullets', wide: true, items: [
          '<b>Illustration</b>: the referenced <code>vm-demo-root</code> <code>DataVolume</code> is <b>not provided</b> here (disk imported or cloned from a boot source); the YAML is therefore not applicable as is.',
          'The simplest way to start: the <b>console</b> (<b>Virtualization → Create VirtualMachine</b>) from a template or a boot source.',
          '<code>virtctl</code> is used to start, stop, open the serial or VNC console and expose ports.'
        ] }
      ]
    },
    {
      title: 'A6 — VM storage',
      blocks: [
        { t: 'table', head: ['Need', 'Requirement', 'Reference'], rows: [
          ['<b>Live migration</b>', 'Shared <code>ReadWriteMany</code> (RWX) storage', 'Module 08: block RWX (<code>volumeMode: Block</code>) depending on the backend'],
          ['<b>Snapshots and clones</b>', 'CSI driver with snapshots', 'Module 08: a snapshot is not a backup'],
          ['<b>Growing</b>', 'StorageClass with expansion', 'Module 08'],
          ['<b>Performance</b>', 'Latency and throughput suited to the guest system', 'Module 08, fast disks']
        ] },
        { t: 'callout', kind: 'trap', html: "A VM on an <b>RWO</b> volume (single node) works, but <b>cannot live-migrate</b>: it must be stopped to be moved. Decide the storage type <b>before</b> building the VM platform." },
        { t: 'callout', kind: 'onprem', html: "On-site, RWX storage is typically <b>ODF/CephFS or RBD block</b> or a CSI-compatible array: it is the #1 architecture decision of the virtualization project (module 08)." }
      ]
    },
    {
      title: 'A7 — VM networking',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Mode', 'Principle', 'Use'], rows: [
          ['<b>Pod network</b>', 'The VM uses the cluster\'s OVN-Kubernetes network', 'Default case; Services and Routes as for a pod'],
          ['<b>Secondary network</b> (Multus)', 'Extra interface to a VLAN or a bridge', 'Separate traffic, migration from vSphere with VLANs'],
          ['<b>Primary UDN</b>', 'Isolated user network as the VM\'s main network', 'Strong isolation, stable addresses (module 07)']
        ] },
        { t: 'bullets', items: [
          'VMs can use a <b>UserDefinedNetwork</b> with the <b>Primary</b> role: the 4.20 docs provide for this case for OpenShift Virtualization.',
          'The NetworkPolicies and AdminNetworkPolicies of module 07 apply to VMs on the primary network.',
          '<b>Migration</b> network: a dedicated Multus network is “strongly recommended” (next slide).'
        ] },
        { t: 'callout', kind: 'tip', wide: true, html: "Reproduce your existing <b>VLANs</b> with NMState and NetworkAttachmentDefinitions (module 07) rather than recreating IP addresses: this is what makes a migration from vSphere <b>transparent</b> to the applications." }
      ]
    },
    {
      title: 'A8 — Live migration',
      blocks: [
        { t: 'flow', nodes: [
          'VM on node A',
          { label: 'Memory copy', sub: 'while the VM runs', hl: true },
          { label: 'Switchover', sub: 'short pause' },
          'VM on node B'
        ], caption: 'Used to <b>empty a node</b> (drain, update: module 12) without stopping the VMs.' },
        { t: 'bullets', frag: true, items: [
          '<b>Prerequisites</b>: <b>RWX</b> shared storage, enough <b>RAM and bandwidth</b>, nodes compatible with the VM\'s “host model” CPU.',
          '<b>Capacity</b>: plan enough free memory to absorb the VMs of a drained node (number of nodes drained in parallel × the largest VM); <b>5</b> parallel migrations by default in the cluster.',
          '<b>Network</b>: a Multus network <b>dedicated</b> to migration avoids saturating the application network.'
        ] },
        { t: 'callout', kind: 'warn', html: "A node drained in a hurry without enough capacity leaves VMs with no place. Size <b>before</b> updates (module 12): every node restart becomes a wave of migrations." }
      ]
    },
    {
      title: 'A9 — Migrating from VMware: MTV',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Element', 'What to know'], rows: [
          ['<b>Tool</b>', '<b>Migration Toolkit for Virtualization</b> (Operator): migrates at scale from vSphere (also RHV, OpenStack, other clusters)'],
          ['<b>Version</b>', 'MTV 2.10: OCP 4.18 to 4.20; <b>2.11</b>: 4.19 to 4.21; <b>2.12</b>: 4.20 to 4.22 (life cycle); vSphere 6.5 or later (2.10 docs)'],
          ['<b>Cold</b>', 'VM <b>powered off</b>, no shared storage required'],
          ['<b>Warm</b>', 'VM <b>powered on</b> during the copy; requires common storage'],
          ['<b>VDDK</b>', 'Strongly recommended; without it, VMs on <b>vSAN</b> don\'t migrate']
        ] },
        { t: 'bullets', items: [
          'Resources (<code>forklift.konveyor.io/v1beta1</code>): <code>Provider</code> (source and destination), <code>StorageMap</code>, <code>NetworkMap</code>, <code>Plan</code>, <code>Migration</code>.',
          'Network flows: TCP 443 (vCenter/ESXi), 902 (ESXi disk transfer).',
          'The VDDK is a VMware SDK to be provided as an <b>image</b>: to be declared in the vSphere <code>Provider</code>: <code>spec.settings.vddkInitImage</code> (from the MTV docs\' CLI manifest); the MTV docs also once asked to set it in the <code>HyperConverged</code>\'s <code>spec.vddkInitImage</code>: <b>depending on your MTV version, to be verified</b>. This provider field is not mandatory but omitting it <b>slows disk transfer down considerably</b>.'
        ] },
        { t: 'callout', kind: 'warn', wide: true, html: "The full path (inventory, storage and network mappings, switchover window, guest drivers) is in the MTV docs: <b>to be re-read for your version</b> before any real project." }
      ]
    },
    {
      title: 'A10 — Operating VMs: backup, security, updates',
      blocks: [
        { t: 'table', head: ['Topic', 'What changes for a VM', 'Reference'], rows: [
          ['<b>Backup</b>', 'OADP backs up VMs and their volumes; test the <b>restore</b> like for an app', 'Module 11'],
          ['<b>Security</b>', 'VM pods have their own requirements (SCC); user rights on VMs via RBAC', 'Modules 09 and 06'],
          ['<b>Updates</b>', 'Each drained node migrates its VMs; the Operator also updates', 'Module 12'],
          ['<b>Quotas</b>', 'VM CPU and memory count like any workload', 'Modules 06 and 12'],
          ['<b>GitOps</b>', 'VirtualMachines are declarative objects, hence versionable', 'Module 10']
        ] },
        { t: 'callout', kind: 'trap', html: "A VM is not “a pod that never restarts”: <b>a node restart</b> migrates or cuts it. Define per VM its <b>eviction strategy</b> and its availability needs." },
        { t: 'callout', kind: 'tip', html: "Keep an <b>inventory</b> of VMs and their dependencies (VLANs, guest licenses, agents): it is what makes the difference between a successful migration and an incident." }
      ]
    },
    {
      title: 'B1 — OpenShift Serverless: the principle',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Request / event', sub: 'HTTP or CloudEvent' },
          { label: 'Knative Serving', sub: 'routes and autoscales', hl: true },
          { label: 'Pods', sub: '0 to N replicas' },
          { label: 'Knative Eventing', sub: 'brokers, triggers', hl: true }
        ], caption: 'Two engines: <b>Serving</b> (HTTP services that scale up and back down to zero) and <b>Eventing</b> (event routing).' },
        { t: 'bullets', frag: true, items: [
          '<b>OpenShift Serverless</b> is the supported distribution of <b>Knative</b>, installed by an Operator.',
          'Current docs version: <b>1.37</b> (Knative Serving, Eventing and Kourier at 1.17).',
          'Use cases: rarely called APIs, on-demand processing, reactions to events; not for steady, continuous workloads.'
        ] },
        { t: 'callout', kind: 'ocp', html: "<b>Compatibility</b> (Red Hat “OpenShift Operator Life Cycles” page): <b>OpenShift Serverless 1.37</b> is supported on <b>OCP 4.16 to 4.20</b>; general availability on November 24, 2025; full support until the release of 1.38 + 1 month." }
      ]
    },
    {
      title: 'B2 — Installing OpenShift Serverless',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'serverless.yaml (CLI procedure from the 1.37 docs)', code: `apiVersion: v1
kind: Namespace
metadata:
  name: openshift-serverless
---
apiVersion: operators.coreos.com/v1
kind: OperatorGroup
metadata:
  name: serverless-operators
  namespace: openshift-serverless
spec: {}
---
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: serverless-operator
  namespace: openshift-serverless
spec:
  channel: stable
  name: serverless-operator
  source: redhat-operators
  sourceNamespace: openshift-marketplace` },
        { t: 'code', lang: 'yaml', file: 'knative.yaml', code: `apiVersion: v1
kind: Namespace
metadata:
  name: knative-serving
---
apiVersion: v1
kind: Namespace
metadata:
  name: knative-eventing
---
apiVersion: operator.knative.dev/v1beta1
kind: KnativeServing
metadata:
  name: knative-serving
  namespace: knative-serving
---
apiVersion: operator.knative.dev/v1beta1
kind: KnativeEventing
metadata:
  name: knative-eventing
  namespace: knative-eventing` },
        { t: 'bullets', wide: true, items: [
          'Channels: <code>stable</code> (latest version) or <code>stable-1.37</code> (maintenance); the <code>knative-serving</code> and <code>knative-eventing</code> namespaces must exist before the CRs.',
          'Verification: <code>InstallSucceeded</code> and <code>Ready</code> conditions set to <code>True</code> (<code>oc get knativeserving.operator.knative.dev/knative-serving -n knative-serving</code>).'
        ] }
      ]
    },
    {
      title: 'B3 — What the platform admin manages',
      blocks: [
        { t: 'table', head: ['Topic', 'Point of attention'], rows: [
          ['<b>Ingress</b>', 'By default <b>Kourier</b> (<code>knative-serving-ingress</code> namespace); Istio/Service Mesh possible: architecture choice'],
          ['<b>Certificates and domains</b>', 'OpenShift Routes created for the services; router default certificate (module 04), custom domains (module 07)'],
          ['<b>Quotas</b>', 'A service that scales up consumes quickly: <b>per-project quotas</b> and <code>max-scale</code> caps (module 06)'],
          ['<b>Capacity</b>', '“Cold starts” and spikes need headroom on the workers (module 12)'],
          ['<b>Configuration</b>', 'Autoscaler settings in the <code>config-autoscaler</code> ConfigMap of <code>knative-serving</code>'],
          ['<b>Updates</b>', 'Operator via OLM, chosen channel (modules 04 and 12)']
        ] },
        { t: 'callout', kind: 'onprem', html: "Disconnected cluster: the Operator\'s catalog and the <b>example images</b> must be mirrored (module 03). The external event server (Kafka, broker) is your infrastructure." }
      ]
    },
    {
      title: 'B4 — A Knative service',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'service-knative.yaml', code: `apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: showcase
  namespace: serverless-demo
spec:
  template:
    metadata:
      name: showcase-v1          # revision name (prefixed by the Service name)
      annotations:
        autoscaling.knative.dev/max-scale: "5"
    spec:
      containers:
      - image: quay.io/openshift-knative/showcase` },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc apply -f service-knative.yaml\n$ oc get ksvc -n serverless-demo\n$ oc get revision -n serverless-demo   # showcase-v1\n$ kn service list -n serverless-demo" },
        { t: 'bullets', wide: true, items: [
          'A single <code>Service</code> object (<code>serving.knative.dev/v1</code>) creates the <b>Configuration</b>, the Knative <b>Route</b> and the <b>revisions</b>. Without <code>template.metadata.name</code>, Knative <b>generates</b> the name (for example <code>showcase-00001</code>): name the revision so you can cite it in <code>spec.traffic</code>.',
          '<b>Scale-to-zero</b>: with no traffic, the number of replicas drops to <b>0</b>; the first request restarts a pod (<i>cold start</i>).'
        ] },
        { t: 'callout', kind: 'warn', wide: true, html: "Example image: the one from the OpenShift Serverless docs; adapt it to your registry, notably on a disconnected network (module 03). The <code>kn service create</code> command creates an equivalent Service but with a <b>generated revision name</b>: for traffic splitting, use the named YAML above." }
      ]
    },
    {
      title: 'B5 — Revisions and traffic splitting',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'traffic.yaml', code: `apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: showcase
  namespace: serverless-demo
spec:
  template:
    metadata:
      name: showcase-v2
      annotations:
        autoscaling.knative.dev/max-scale: "5"
    spec:
      containers:
      - image: quay.io/openshift-knative/showcase
        env:
        - name: VERSION
          value: "2"
  traffic:
  - revisionName: showcase-v1
    percent: 80
  - revisionName: showcase-v2
    percent: 20` },
        { t: 'bullets', items: [
          'Each change to <code>spec.template</code> creates an immutable <b>revision</b>; the old ones remain available. Here the template gets the name <code>showcase-v2</code> while <code>showcase-v1</code> already exists (slide B4): each <code>revisionName</code> must <b>point to an existing revision</b> and the percentages must total <b>100</b> (Knative docs).',
          '<code>spec.traffic</code> splits traffic by percentage: <b>canary</b> deployment, immediate rollback by putting 100% back on the old revision.'
        ] },
        { t: 'callout', kind: 'tip', html: "Name your revisions (the template\'s <code>metadata.name</code>) so you can reference them: it is also what lets you drive them in <b>GitOps</b> (module 10)." }
      ]
    },
    {
      title: 'B6 — Autoscaling and scale-to-zero',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Setting', 'Effect'], rows: [
          ['<code>autoscaling.knative.dev/min-scale</code>', 'Minimum number of replicas (default <b>0</b> with the KPA and scale-to-zero enabled, 1 otherwise)'],
          ['<code>autoscaling.knative.dev/max-scale</code>', 'Replica cap: protects the cluster capacity'],
          ['<code>config-autoscaler</code> (<code>knative-serving</code>)', 'Global settings: defaults, delays'],
          ['Autoscaler class (KPA)', 'Knative autoscaler based on concurrency and requests']
        ] },
        { t: 'bullets', items: [
          '<b>Scale-to-zero</b> saves resources but adds <b>startup latency</b>: set <code>min-scale: "1"</code> for latency-sensitive services.',
          'Fine-grained parameters (grace period before scaling to zero, concurrency target): version docs; <b>to be verified</b> for the 1.37 defaults.'
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: "A service with a high <code>max-scale</code> and no quota can <b>absorb a spike</b> by consuming other teams\' workers. Set a cap per service and a <b>project quota</b> (module 06)." }
      ]
    },
    {
      title: 'B7 — Knative Eventing: brokers and triggers',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Source', sub: 'HTTP, Kafka, Kubernetes API…' },
          { label: 'Broker', sub: 'receives CloudEvents', hl: true },
          { label: 'Trigger', sub: 'filters by attributes' },
          { label: 'Subscriber', sub: 'Knative Service or other' }
        ], caption: 'Events travel in <b>CloudEvents</b> format; services are <b>decoupled</b> from their producers.' },
        { t: 'code', lang: 'yaml', file: 'eventing.yaml', code: `apiVersion: eventing.knative.dev/v1
kind: Broker
metadata:
  name: default
  namespace: serverless-demo
---
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: to-showcase
  namespace: serverless-demo
spec:
  broker: default
  filter:
    attributes:
      type: demo.order
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: showcase` },
        { t: 'callout', kind: 'warn', html: "Available fields and sources: to be re-read in the Eventing docs for your OpenShift Serverless version (<code>eventing.knative.dev/v1</code> according to Knative naming)." }
      ]
    },
    {
      title: 'B8 — Eventing with Kafka and API changes',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          '<b>Kafka</b> serves as a durable transport for Eventing (Kafka brokers and sources); the Kafka cluster is <b>your</b> infrastructure (Streams operator or external).',
          'In the 1.37 history, the docs point out <b>removals</b>: <code>v1alpha1</code> API of Serving and Eventing, <code>KafkaBinding</code> API, <code>domain-mapping</code> deployments; <b>namespace-scoped Kafka brokers</b> are still deprecated.',
          'Consequence: <b>re-read the release notes</b> before every minor update of OpenShift Serverless (module 12) and migrate your manifests off the removed APIs.'
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: "Manifests written for old versions (<code>v1alpha1</code>) <b>stop working</b> after an update. Go through an <b>API review</b> (module 12) and validate in a lab before production." },
        { t: 'callout', kind: 'onprem', wide: true, html: "Kafka brokers, topics and retention are <b>operations</b> topics to plan (storage, backup, security: modules 08, 11 and 09)." }
      ]
    },
    {
      title: 'B9 — Functions, use cases and limits',
      blocks: [
        { t: 'table', head: ['Topic', 'What to remember'], rows: [
          ['<b>Functions</b> (<code>kn func</code>)', 'Write functions and deploy them as Knative services; the <b>Python</b> runtime went GA in 1.37; status of the other runtimes: to be verified'],
          ['<b>Good use</b>', '<b>Intermittent</b> or event-driven workloads, rarely used APIs, integrations'],
          ['<b>Less suitable</b>', 'Steady 24/7 workloads, strictly constant latency, very slow startup'],
          ['<b>Platform limits</b>', 'Cold start, quotas, ingress networks, dependencies (Kafka, Service Mesh) to operate'],
          ['<b>Product status</b>', 'OpenShift Serverless 1.37 (Knative 1.17) is supported on OCP 4.16 to 4.20 (Red Hat Operator life cycles)']
        ] },
        { t: 'callout', kind: 'tip', html: "Before opening serverless to teams, set <b>three rules</b>: allowed base image and registry, quotas per project, and an <b>owner</b> for the events (who produces, who consumes)." }
      ]
    },
    {
      title: 'Quiz',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'What storage requirement allows the live migration of a VM between two nodes?', options: ['A local volume (<code>ReadWriteOnce</code>) on each node', 'A CSI snapshot of the volume before each move', 'Shared <code>ReadWriteMany</code> (RWX) storage', 'None: live migration always copies the disks'], answer: 2, explain: 'Live migration assumes both nodes access the same volume: RWX shared storage. With an RWO volume, the VM must be stopped to be moved.' },
        { t: 'quiz', q: 'A Knative service receives no requests for a while. What happens by default with the Knative autoscaler?', options: ['It scales down to zero replicas (scale-to-zero), then restarts on the next request', 'It stays at one replica forever', 'It is deleted from the cluster', 'It goes into Failed state until manual intervention'], answer: 0, explain: 'With the KPA and scale-to-zero enabled, the default minimum is 0: the service can shut down and restarts on the next request (cold start). <code>min-scale</code> keeps at least one replica.' },
        { t: 'quiz', q: 'You are migrating VMs hosted on vSAN from VMware with MTV. What precaution?', options: ['Choose only warm migration', 'Disable the storage mappings', 'Go through a manual OVA export of each VM', 'Provide the VDDK image: without it, VMs on vSAN don\'t migrate'], answer: 3, explain: 'The MTV docs strongly recommend the VDDK and state that migrations don\'t work without it when the VM sits on vSAN. Warm or cold changes when the copy happens, not this prerequisite.' }
      ]
    },
    {
      title: 'Lab: a Knative service at zero replicas',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'OpenShift Serverless: service, scale-to-zero, traffic splitting', goal: 'Core during the session on a SNO (E1). The virtualization part (VM, migration) requires an E3 environment: (bonus) steps.', steps: [
          'Prerequisites: environment E1 (SNO) with <code>cluster-admin</code>, see module 00; access to the example image (or to your mirror registry); the VM part requires <b>E3</b> (bare metal or nested virtualization).',
          'Install the <b>OpenShift Serverless Operator</b> (OperatorHub, <code>openshift-serverless</code> namespace, <code>stable</code> channel), then create the namespaces and the <code>KnativeServing</code> and <code>KnativeEventing</code> CRs from the dedicated slide and check the <code>Ready</code> conditions.',
          'Create the project (<code>oc new-project serverless-demo</code>), then apply the <b>named</b> Knative <code>Service</code> <code>showcase</code> from slide B4 (revision <code>showcase-v1</code>) and test the URL given by <code>oc get ksvc</code> with <code>curl</code>.',
          'Observe <b>scale-to-zero</b>: stop all traffic, follow the pods with <code>oc get pods -w -n serverless-demo</code> down to zero, then run a <code>curl</code> again and note the wake-up delay.',
          'Apply the <b>YAML from slide B5</b> (same Service: the template becomes <code>showcase-v2</code> with an environment variable, traffic is split <b>80/20</b> between <code>showcase-v1</code> and <code>showcase-v2</code>); check with <code>oc get revision</code> then repeat the requests to see the split. <b>Rollback</b>: put 100% back on the first revision then delete the project.',
          '(bonus, E3) Install <b>OpenShift Virtualization</b> (OperatorGroup, Subscription and <code>HyperConverged</code> from slide A3), create a VM from a boot source with the console and open its console with <code>virtctl console</code>; check <code>oc get vm,vmi</code>.',
          '(bonus, multi-node E3 with RWX storage) Start a <b>live migration</b> of the VM to another node and observe the <code>VirtualMachineInstanceMigration</code>; on RWO storage, see that it is not possible.',
          '(bonus, with a test vCenter) Prepare an MTV migration: vSphere <code>Provider</code> with its <code>vddkInitImage</code> (and the <code>HyperConverged</code>\'s), <code>StorageMap</code>, <code>NetworkMap</code> and <code>Plan</code> for a <b>cold</b> migration of a powered-off VM.'
        ] }
      ]
    }
  ],
  takeaways: [
    'OpenShift Virtualization: a VM is a KVM pod; <code>kubevirt-hyperconverged</code> Operator (<code>stable</code> channel, <code>openshift-cnv</code> namespace), <code>HyperConverged</code> CR.',
    'Live migration requires <b>RWX</b> shared storage, RAM and bandwidth; a dedicated Multus network is recommended; size before node updates.',
    'From VMware: MTV (2.10, 2.11 and 2.12 cover 4.20), cold or warm, <b>VDDK</b> to provide (mandatory in practice for vSAN), <code>forklift.konveyor.io/v1beta1</code> resources.',
    'OpenShift Serverless: <code>serverless-operator</code> Operator (<code>stable</code> channel), <code>KnativeServing</code> and <code>KnativeEventing</code> CRs in <code>operator.knative.dev/v1beta1</code>; supported on OCP 4.16 to 4.20 (1.37).',
    'Knative service = scale-to-zero (min-scale 0 by default), revisions, traffic splitting; Eventing = brokers, triggers, CloudEvents; re-read API removals before every update.',
    'Platform admin: ingress (Kourier), quotas, capacity (cold starts, migrations), VM backup (module 11), updates (module 12), GitOps (module 10).'
  ]
});
