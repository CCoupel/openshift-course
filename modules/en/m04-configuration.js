COURSE.add({
  id: 'm04', lang: 'en', num: 4, emoji: '⚙️',
  title: 'Configuration',
  source: 'd1a69df5a350',
  tagline: 'The cluster is installed: proxy, registries, certificates, chrony, Operators. “Day-1” configuration, declarative, without touching the nodes by hand.',
  duration: '≈ 60 min + lab 20 min',
  objectives: [
    'Configure the cluster through the <code>config.openshift.io</code> resources (Proxy, Image, APIServer, Scheduler…)',
    'Replace the Ingress and API certificates and declare a trusted CA',
    'Apply a common OS configuration (chrony, kernel arguments) with <code>butane</code> and a MachineConfig',
    'Install and manage an Operator with OLM (catalogs, channels, InstallPlan approval)',
    'Walk through a post-installation configuration checklist'
  ],
  slides: [
    {
      title: 'Configuring OCP: one “cluster” resource per topic',
      blocks: [
        { t: 'text', html: "<p>On K8s, you edit manifests or flags. On OCP, each topic has a <b>singleton resource named <code>cluster</code></b> that the <b>relevant operator</b> reads and applies. You declare the intent, the operator does the work (and redoes it if someone undoes it).</p>" },
        { t: 'flow', nodes: [
          { label: 'You', sub: 'oc edit / apply / GitOps' },
          { label: '“cluster” CR', sub: 'config.openshift.io', hl: true },
          { label: 'Cluster Operator', sub: 'reconciles continuously' },
          { label: 'Component', sub: 'kube-apiserver, ingress, nodes…' }
        ], caption: '<b>Cross-cutting</b> settings live in <code>config.openshift.io</code>; an <b>operator\'s fine-grained tuning</b> lives in <code>operator.openshift.io</code>.' },
        { t: 'cmds', items: [
          ['oc api-resources --api-group=config.openshift.io', 'Lists the cluster configuration resources'],
          ['oc get proxy,apiserver,ingress.config,image.config cluster', 'The most useful singletons (name: cluster)'],
          ['oc explain apiserver.spec', 'Field schema (the most reliable source for your version)']
        ] },
        { t: 'callout', kind: 'k8s', html: "No config file to push to the nodes: even OS settings go through objects (MachineConfig, dedicated section further on). This configuration is the ideal candidate for GitOps (module 10)." }
      ]
    },
    {
      title: 'Tour of the config.openshift.io resources',
      blocks: [
        { t: 'table', head: ['Resource', 'What it controls', 'Covered'], rows: [
          ['<code>Proxy</code>', 'Cluster HTTP(S) proxy, <code>noProxy</code>, trusted CA', 'Here'],
          ['<code>Image</code>', 'Allowed / blocked registries, registry CAs', 'Here'],
          ['<code>APIServer</code>', 'API certificates, TLS profile, etcd encryption, audit', 'Here; audit: module 06'],
          ['<code>Scheduler</code>', 'Scheduler profile, default node selector, schedulable masters', 'Here'],
          ['<code>FeatureGate</code>', 'Enables Tech Preview features', 'Here (pitfall)'],
          ['<code>Ingress</code> (config)', 'Application domain (<code>*.apps</code>), component routes', 'Module 07'],
          ['<code>OAuth</code>', 'Identity providers', 'Module 06'],
          ['<code>Network</code>, <code>DNS</code>, <code>Infrastructure</code>', 'CIDRs, domains, platform: mostly <b>read-only</b> after installation', 'Modules 02 and 03']
        ] },
        { t: 'callout', kind: 'tip', html: "Before modifying a resource, read its <code>status</code> and the conditions of the associated operator (<code>oc get co</code>): it will tell you whether your configuration is applied or rejected." }
      ]
    },
    {
      title: 'Cluster proxy and corporate CA',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'proxy-cluster.yaml', code: `apiVersion: config.openshift.io/v1
kind: Proxy
metadata:
  name: cluster
spec:
  httpProxy: http://proxy.example.com:3128
  httpsProxy: http://proxy.example.com:3128
  noProxy: .example.com,10.0.0.0/8      # automatically completed with the internal networks
  trustedCA:
    name: user-ca-bundle                 # ConfigMap in openshift-config (key ca-bundle.crt)` },
        { t: 'bullets', items: [
          'The proxy can be set <b>at installation</b> (<code>install-config.yaml</code>) or <b>afterwards</b> through this resource.',
          '<code>trustedCA</code>: the proxy (or corporate) CA to add to the trust bundle of the platform components.',
          'The cluster completes <code>noProxy</code> with its internal networks: check the result in <code>status</code>.'
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: "A proxy change is <b>propagated to the nodes</b> (MachineConfig) and the MCO reboots the nodes (the docs describe this for enabling the proxy; for a later change, stay cautious and plan a maintenance window). Forgetting your internal network CIDR in <code>noProxy</code> sends internal traffic to the proxy." },
        { t: 'callout', kind: 'onprem', wide: true, html: "Without direct Internet access, the proxy is often the only path to Red Hat (telemetry, updates). In a fully disconnected setup: no proxy but a mirror registry (module 03)." }
      ]
    },
    {
      title: 'Allowed registries and registry CAs',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'image-cluster.yaml', code: `apiVersion: config.openshift.io/v1
kind: Image
metadata:
  name: cluster
spec:
  additionalTrustedCA:
    name: registry-cas              # ConfigMap in openshift-config; key = registry hostname[..port]
  registrySources:
    allowedRegistries:              # or blockedRegistries (mutually exclusive)
    - quay.io
    - registry.redhat.io
    - registry.example.com:8443` },
        { t: 'bullets', frag: true, items: [
          '<code>allowedRegistries</code>: allowlist of registries; everything else is refused. <code>blockedRegistries</code>: blocklist. The two cannot be combined.',
          '<code>additionalTrustedCA</code>: CA of <b>each</b> private registry (the ConfigMap key is the registry hostname).',
          '<code>insecureRegistries</code> exists but should be <b>avoided</b> outside a lab.'
        ] },
        { t: 'callout', kind: 'trap', html: "An <b>incomplete</b> allowlist blocks the platform\'s own images (<code>registry.redhat.io</code>, your mirror): put in everything the cluster needs before applying. Effect on nodes: <b>no reboot</b> according to the 4.18 docs (the MCO cordons the node, restarts CRI-O, then puts it back in service, node by node; to be reconfirmed in 4.20). Don\'t forget to include the internal registry and your mirrors. Exact fields: <code>oc explain image.config.spec</code>." },
        { t: 'callout', kind: 'ocp', html: "Redirections to a mirror (<code>ImageDigestMirrorSet</code>, <code>ImageTagMirrorSet</code>) are a separate topic: module 03. The internal registry and its storage: module 08." }
      ]
    },
    {
      title: 'APIServer: TLS profile, etcd encryption',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'apiserver-cluster.yaml', code: `apiVersion: config.openshift.io/v1
kind: APIServer
metadata:
  name: cluster
spec:
  tlsSecurityProfile:
    type: Intermediate        # Old | Intermediate | Modern | Custom
  encryption:
    type: aescbc              # aescbc or aesgcm; none is enabled by default
  audit:
    profile: Default          # audit policy: see module 06` },
        { t: 'bullets', items: [
          '<b>TLS profile</b>: TLS versions and ciphers accepted by the API (kube, openshift, OAuth) and the kubelet; Ingress is tuned on the <code>IngressController</code> (module 07); <code>Intermediate</code> is the common default.',
          '<b>etcd encryption</b>: disabled by default; once enabled, rewriting the objects takes time (follow it on the conditions of the <code>kube-apiserver</code> and <code>openshift-apiserver</code> operators).',
          '<b>Named certificates</b>: next slide.'
        ] },
        { t: 'callout', kind: 'warn', wide: true, html: "etcd encryption protects data <b>at rest in etcd</b>, not access through the API. Once enabled, encryption of existing objects is <b>automatic</b> (allow 20 minutes or more): check the <code>EncryptionCompleted</code> condition of the three API servers. To restore, it is the <b>keys</b> (the <code>static_kuberesources_*.tar.gz</code> archive of the backup, separate from the etcd snapshot) that must be kept with the backup; don\'t back up etcd before the initial encryption has finished (module 11)." }
      ]
    },
    {
      title: 'Scheduler, FeatureGate and operator-driven management',
      blocks: [
        { t: 'table', head: ['Setting', 'Effect', 'Watch out'], rows: [
          ['<code>Scheduler.spec.defaultNodeSelector</code>', 'Selector added to pods that have none (e.g. targeting workers)', 'Applies <b>cluster-wide</b>; can be overridden per project'],
          ['<code>Scheduler.spec.mastersSchedulable</code>', 'Allows application pods on the masters', 'Reserved for compact topologies (module 02)'],
          ['<code>Scheduler.spec.profile</code>', 'Scoring profile', 'Values: <code>LowNodeUtilization</code> (default), <code>HighNodeUtilization</code>, <code>NoScoring</code>'],
          ['<code>FeatureGate</code> <code>TechPreviewNoUpgrade</code>', 'Enables Tech Preview features', '<b>Irreversible</b>; blocks minor version updates']
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "# Target workers by default (example)\n$ oc patch scheduler cluster --type merge \\\n    -p '{\"spec\":{\"defaultNodeSelector\":\"node-role.kubernetes.io/worker=\"}}'" },
        { t: 'callout', kind: 'trap', html: "A Tech Preview <code>FeatureGate</code> on a production cluster is a dead end: no way back, minor version updates blocked. Reserve it for disposable clusters." },
        { t: 'callout', kind: 'warn', html: "Same logic for every component: a change made <b>outside the CR</b> is overwritten at reconciliation, and setting an operator to <code>managementState: Unmanaged</code> or setting <code>spec.overrides</code> in <code>ClusterVersion</code> is <b>unsupported</b> and can block updates (module 12). Look for the intended field with <code>oc explain</code>." }
      ]
    },
    {
      title: 'Certificates: what is automatic, what you replace',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Certificate', 'Managed by', 'What do you do?'], rows: [
          ['Internal PKI (kubelet, etcd, control plane…)', 'The operators, automatic rotation', 'Nothing day to day; watch the alerts (module 12)'],
          ['<b>Default Ingress</b> (<code>*.apps</code>)', 'Self-signed by default (cluster CA)', '<b>Replace</b> with a certificate from your PKI'],
          ['<b>External API</b> (<code>api.…</code>)', 'Internal CA by default', '<b>Replace</b> via a named certificate'],
          ['Internal API (<code>api-int</code>)', 'Internal CA', '<b>Never</b> provide a named certificate for <code>api-int</code>: the cluster goes Degraded'],
          ['CA of a proxy or a registry', 'You', 'Declare in a trust bundle']
        ] },
        { t: 'bullets', items: [
          'Clients (browser, <code>oc</code>, CI) must trust the <b>CA that signs</b> these certificates.',
          'A <b>wildcard</b> certificate <code>*.apps.cluster.domain</code> covers the console, OAuth and all routes.',
          'Provide the <b>full chain</b> (server then intermediates) in the certificate file.'
        ] },
        { t: 'callout', kind: 'onprem', wide: true, html: "Your corporate PKI or an internal CA is the normal on-prem practice. Also plan for <b>renewal</b> (expiry dates, ticket to the PKI team): rotation and expiry cases are covered in module 12." },
        { t: 'callout', kind: 'cloud', wide: true, html: "On managed cloud offerings, the platform certificates are managed by the provider; you generally only replace those for your application domains." }
      ]
    },
    {
      title: 'Replacing the default Ingress certificate',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: "# 0. If the signing CA is not already trusted: declare it first\n#    (user-ca-bundle + Proxy trustedCA, see the “Trusting a CA” slide)\n\n# 1. TLS secret in openshift-ingress (full chain in fullchain.crt)\n$ oc create secret tls custom-ingress-cert \\\n    --cert=fullchain.crt --key=apps.key -n openshift-ingress\n\n# 2. Point the default IngressController at it\n$ oc patch ingresscontroller.operator.openshift.io default \\\n    -n openshift-ingress-operator --type=merge \\\n    -p '{\"spec\":{\"defaultCertificate\":{\"name\":\"custom-ingress-cert\"}}}'\n\n# 3. Follow the router redeployment, then test\n$ oc get pods -n openshift-ingress -w\n$ curl -vI https://console-openshift-console.apps.ocp4.example.com 2>&1 | grep -i issuer" },
        { t: 'bullets', frag: true, items: [
          'The certificate must cover <code>*.apps.&lt;cluster&gt;.&lt;domain&gt;</code> (wildcard SAN).',
          'The routers are <b>redeployed</b> (rolling): plan a short window.',
          'Clients must trust the CA, including the internal components that call the console or OAuth.'
        ] },
        { t: 'callout', kind: 'trap', html: "If the CA that signs this certificate is <b>not already trusted</b> by the cluster (corporate CA, lab CA), declare it <b>before</b> patching (<code>user-ca-bundle</code> + <code>Proxy.spec.trustedCA</code>): otherwise internal components that call the console or OAuth may stop trusting the router and operators may go <b>Degraded</b>. Procedure documented in 4.20 (“Replacing the default ingress certificate”). <b>Rollback</b>: remove <code>spec.defaultCertificate</code> from the <code>IngressController</code>." },
        { t: 'callout', kind: 'ocp', html: "The <code>IngressController</code> (sharding, routes, per-route certificates) is covered in module 07; here, only the default certificate." }
      ]
    },
    {
      title: 'Replacing the API certificate',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: "# TLS secret in openshift-config\n$ oc create secret tls api-cert \\\n    --cert=api-fullchain.crt --key=api.key -n openshift-config\n\n$ oc patch apiserver cluster --type=merge -p '{\n  \"spec\": {\"servingCerts\": {\"namedCertificates\": [{\n    \"names\": [\"api.ocp4.example.com\"],\n    \"servingCertificate\": {\"name\": \"api-cert\"}\n  }]}}}'\n\n$ oc get co kube-apiserver -w   # wait for the rollout to finish" },
        { t: 'bullets', items: [
          '<code>names</code>: the <b>external</b> name of the API (<code>api.cluster.domain</code>), not <code>api-int</code>.',
          'The <code>kube-apiserver</code> redeploys on the 3 masters: the API stays available but goes through successive restarts.',
          'Test with <code>oc login</code> from a workstation that trusts your CA.'
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: "<b>Existing kubeconfigs</b> (the installer\'s, your CI pipelines\') embed the internal CA: after the replacement, they may fail or keep pointing to the wrong CA depending on their content. Check them and, if needed, regenerate them (exact behavior: to be verified in the 4.20 docs)." },
        { t: 'callout', kind: 'warn', wide: true, html: "Keep a <b>rollback procedure</b> (removing the <code>namedCertificates</code> entry) and break-glass access (module 06) before modifying the API." }
      ]
    },
    {
      title: 'Trusting a CA: the cluster bundle',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: "# 1. Corporate CA bundle in openshift-config\n$ oc create configmap user-ca-bundle \\\n    --from-file=ca-bundle.crt=corp-ca-bundle.pem -n openshift-config\n\n# 2. Declare it as the cluster trusted CA\n$ oc patch proxy cluster --type=merge \\\n    -p '{\"spec\":{\"trustedCA\":{\"name\":\"user-ca-bundle\"}}}'\n\n# 3. Check the distribution of the merged bundle\n$ oc get configmap trusted-ca-bundle -n openshift-config-managed -o jsonpath='{.metadata.name}'" },
        { t: 'bullets', items: [
          'The bundle is <b>merged</b> with the system CAs then distributed to the platform components (and to the nodes).',
          'The <b>Proxy</b> resource is used here as the carrier, even <b>without an HTTP proxy</b>: <code>trustedCA</code> remains the entry point.',
          'For private registries, use <code>Image.spec.additionalTrustedCA</code>; for identity providers (LDAP, OIDC), the CA is declared in their configuration (module 06).'
        ] },
        { t: 'callout', kind: 'tip', html: "For your <b>applications</b>, the bundle can be injected into a pod via an <b>empty</b> ConfigMap carrying the label <code>config.openshift.io/inject-trusted-cabundle=true</code> (the cluster fills it; key <code>ca-bundle.crt</code>, to be mounted as a volume)." }
      ]
    },
    {
      title: 'Common MachineConfig: chrony with butane',
      layout: 'two',
      blocks: [
        { t: 'text', html: "<p>The MCO mechanics (pools, rendered, rolling reboot) are in <b>module 02</b>. Here, the typical day-1 case: pointing the nodes to <b>your NTP servers</b>. <code>butane</code> writes the MachineConfig in readable YAML.</p>" },
        { t: 'code', lang: 'yaml', file: '99-worker-chrony.bu', code: `variant: openshift
version: 4.20.0                 # must match the butane version (example from the 4.20 docs)
metadata:
  name: 99-worker-chrony
  labels:
    machineconfiguration.openshift.io/role: worker
storage:
  files:
  - path: /etc/chrony.conf
    mode: 0644
    overwrite: true
    contents:
      inline: |
        pool ntp.example.com iburst
        driftfile /var/lib/chrony/drift
        makestep 1.0 3
        rtcsync
        logdir /var/log/chrony` },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ butane 99-worker-chrony.bu -o 99-worker-chrony.yaml\n$ oc apply -f 99-worker-chrony.yaml\n$ oc get mcp -w            # rolling: drain, apply, reboot\n$ oc debug node/worker-0 -- chroot /host chronyc sources" },
        { t: 'callout', kind: 'trap', wide: true, html: "The <code>role: worker</code> label targets <b>only the worker pool</b>. The masters keep their own configuration: you need a second MachineConfig with <code>role: master</code> (and, on a SNO, it is the master pool that applies). All nodes must share the same time source." },
        { t: 'callout', kind: 'onprem', wide: true, html: "On an isolated network, public NTP servers are unreachable: point to your internal sources. It is one of the first day-1 settings (certificates and etcd depend on it)." }
      ]
    },
    {
      title: 'Kernel arguments and other OS settings',
      blocks: [
        { t: 'code', lang: 'yaml', file: '99-worker-kargs.bu', code: `variant: openshift
version: 4.20.0
metadata:
  name: 99-worker-kargs
  labels:
    machineconfiguration.openshift.io/role: worker
kernel_arguments:
- default_hugepagesz=1G        # example: hugepages for a specialized workload
- hugepagesz=1G
- hugepages=4` },
        { t: 'bullets', frag: true, items: [
          '<b>kargs</b>: appended to the kernel command line; a change forces a <b>reboot</b> of the pool\'s nodes.',
          'Other common uses: files (<code>/etc/…</code>), systemd units, <code>crio</code> or kubelet configuration (via <code>ContainerRuntimeConfig</code> / <code>KubeletConfig</code>, dedicated resources).',
          'Advanced performance tuning (PerformanceProfile, NUMA) is outside the scope of this module.'
        ] },
        { t: 'callout', kind: 'warn', html: "An invalid MachineConfig or a malformed file puts the pool in <b>Degraded</b> and can <b>block updates</b> (module 12). Test on a test pool (<code>maxUnavailable</code>, <code>paused</code>: module 02) before production. Rebootless behavior goes through node disruption policies (available since 4.17, <code>MachineConfiguration</code> resource)." }
      ]
    },
    {
      title: 'OLM: the objects to know',
      blocks: [
        { t: 'text', html: "<p>Additional Operators (storage, GitOps, logging…) are installed through <b>OLM</b> (Operator Lifecycle Manager). You don\'t run a <code>helm install</code>: you declare a <b>subscription</b> to a channel of a catalog.</p>" },
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
          ['oc get sub,installplan,csv -n openshift-lvm-storage', 'Where an Operator installation stands']
        ] },
        { t: 'callout', kind: 'k8s', html: "OLM sits <b>alongside</b> Helm: it manages Operators (CRDs, permissions, updates) rather than applications. The cluster\'s platform Operators, for their part, are managed by the CVO (module 02), not by OLM." }
      ]
    },
    {
      title: 'OperatorHub: catalogs and sources',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Catalog (default source)', 'Content'], rows: [
          ['<code>redhat-operators</code>', 'Red Hat Operators, supported'],
          ['<code>certified-operators</code>', 'Operators from certified partner vendors'],
          ['<code>community-operators</code>', 'Community, <b>unsupported</b>'],
          ['<code>redhat-marketplace</code>', 'Marketplace']
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc get operatorhub cluster -o yaml\n# Disable a default source\n$ oc patch operatorhub cluster --type merge \\\n    -p '{\"spec\":{\"sources\":[{\"name\":\"community-operators\",\"disabled\":true}]}}'" },
        { t: 'bullets', items: [
          'The default sources rely on the Internet: they are <b>unusable when disconnected</b> (next slide).',
          'Disabling <code>community-operators</code> avoids installing an unsupported Operator by mistake.'
        ] },
        { t: 'callout', kind: 'warn', wide: true, html: "Default catalogs in <code>openshift-marketplace</code>: <code>redhat-operators</code>, <code>certified-operators</code>, <code>redhat-marketplace</code>, <code>community-operators</code> (“Operators” documentation 4.20)." }
      ]
    },
    {
      title: 'Installing an Operator: the YAML',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'lvms-subscription.yaml', code: `apiVersion: v1
kind: Namespace
metadata:
  name: openshift-lvm-storage
---
apiVersion: operators.coreos.com/v1
kind: OperatorGroup
metadata:
  name: lvms
  namespace: openshift-lvm-storage
spec:
  targetNamespaces:
  - openshift-lvm-storage
---
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: lvms-operator
  namespace: openshift-lvm-storage
spec:
  channel: stable-4.20              # check the channel with the PackageManifest
  name: lvms-operator
  source: redhat-operators
  sourceNamespace: openshift-marketplace
  installPlanApproval: Manual       # Automatic | Manual` },
        { t: 'cmds', items: [
          ['oc get packagemanifest lvms-operator -n openshift-marketplace -o jsonpath=\'{.status.defaultChannel}\'', 'Default channel of an Operator (otherwise: <code>oc describe</code>)'],
          ['oc get csv -n openshift-lvm-storage', '<code>Succeeded</code> phase = installed']
        ] },
        { t: 'callout', kind: 'warn', html: "Package name, channel and recommended namespace of each Operator: read them in the <b>Operator\'s documentation</b> (example: LVMS, module 08; its namespace carries specific labels, to be taken from the docs). The <code>stable-4.20</code> channel is LVMS\'s in 4.20; in 4.20 the default LVMS namespace is <code>openshift-lvm-storage</code> (<code>openshift-storage</code> remains ODF\'s)." }
      ]
    },
    {
      title: 'Channels, approval and Operator updates',
      layout: 'two',
      blocks: [
        { t: 'bullets', frag: true, items: [
          '<b>Channel</b>: follows a line of versions; changing channel changes what the Operator can receive.',
          '<b>Automatic</b>: OLM installs new versions from the channel without asking you (risk: unplanned change).',
          '<b>Manual</b>: OLM creates a pending <code>InstallPlan</code>; nothing moves until you <b>approve</b> it.'
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc get installplan -n openshift-lvm-storage\nNAME            CSV                         APPROVAL   APPROVED\ninstall-abcde   lvms-operator.v4.20.x       Manual     false\n\n$ oc patch installplan install-abcde -n openshift-lvm-storage \\\n    --type merge -p '{\"spec\":{\"approved\":true}}'" },
        { t: 'callout', kind: 'tip', html: "In production, <b>Manual</b> for critical Operators (storage, network, security); <b>Automatic</b> for the others, in test environments first." },
        { t: 'callout', kind: 'trap', html: "An InstallPlan <b>forgotten in Pending</b> leaves the Operator on its current version, sometimes vulnerable or incompatible with the next cluster version. Some Operators also declare a maximum OCP version and can <b>block the cluster update</b> (<code>olm.maxOpenShiftVersion</code> annotation: the <code>olm</code> cluster Operator goes <code>Upgradeable=False</code>; minor updates affected; module 12)." }
      ]
    },
    {
      title: 'Mirrored catalogs (disconnected)',
      blocks: [
        { t: 'text', html: "<p>Mirroring images and Operator indexes is prepared at installation (<b>module 03</b>, <code>oc-mirror</code>). On the <b>configuration</b> side, what remains is to disable the public sources and declare your <code>CatalogSource</code>.</p>" },
        { t: 'code', lang: 'yaml', file: 'catalogsource-mirror.yaml', code: `apiVersion: operators.coreos.com/v1alpha1
kind: CatalogSource
metadata:
  name: redhat-operators-mirror
  namespace: openshift-marketplace
spec:
  sourceType: grpc
  image: registry.example.com:8443/redhat/redhat-operator-index:v4.20
  displayName: Red Hat Operators (mirror)
  publisher: infra
  updateStrategy:
    registryPoll:
      interval: 30m` },
        { t: 'bullets', items: [
          '<code>oc-mirror</code> normally generates this <code>CatalogSource</code> (and the <code>ImageDigestMirrorSet</code>s): apply those files rather than writing them.',
          'Disable the default sources: <code>disableAllDefaultSources: true</code> in <code>OperatorHub</code> (module 03).',
          'A mirrored catalog only contains the packages you <b>selected</b>: an Operator that is absent is absent from the mirror.'
        ] },
        { t: 'callout', kind: 'onprem', html: "The mirror must be <b>replayed</b> for every Operator version change you want: plan a process (frequency, validation) rather than a one-off action." }
      ]
    },
    {
      title: 'OLM v1: ClusterExtension',
      layout: 'two',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '📦 OLM v0 (classic)', items: ['<code>OperatorGroup</code> + <code>Subscription</code> + <code>InstallPlan</code>', 'Per-namespace installation modes', 'Permissions granted by OLM', 'Largest ecosystem today'] },
          right: { title: '🧩 OLM v1', items: ['<code>ClusterCatalog</code> + <code>ClusterExtension</code>', 'No OperatorGroup or Subscription', 'You provide the <code>ServiceAccount</code> (and its permissions)', 'Narrower scope, to be confirmed'] },
          verdict: 'OLM v1 is a new model, not just a “v2”: the two coexist. GA and enabled by default since 4.18; limits in 4.20: <code>registry+v1</code> bundles, AllNamespaces mode (SingleNamespace/OwnNamespace in Technology Preview).' },
        { t: 'code', lang: 'yaml', file: 'clusterextension.yaml', code: `apiVersion: olm.operatorframework.io/v1
kind: ClusterExtension
metadata:
  name: example
spec:
  namespace: example-ns
  serviceAccount:
    name: example-installer
  source:
    sourceType: Catalog
    catalog:
      packageName: example-operator` },
        { t: 'callout', kind: 'warn', wide: true, html: "The fields above (mandatory <code>serviceAccount</code>, <code>source.catalog.packageName</code>, <code>channels</code>, <code>version</code>) match the 4.20 docs; the package name is an example. For production, stay on OLM v0 until your Operator\'s scope is confirmed." }
      ]
    },
    {
      title: 'Console: plugins and customization',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: "# Console plugins (provided by some Operators)\n# Warning: this command REPLACES the existing list; to append to a list\n# already present, use path /spec/plugins/- with value \"plugin-name\"\n$ oc get consoleplugin\n$ oc patch console.operator.openshift.io cluster --type=json \\\n    -p '[{\"op\":\"add\",\"path\":\"/spec/plugins\",\"value\":[\"plugin-name\"]}]'\n\n# Information banner visible to everyone\n$ cat <<'EOF' | oc apply -f -\napiVersion: console.openshift.io/v1\nkind: ConsoleNotification\nmetadata:\n  name: maintenance\nspec:\n  text: Scheduled maintenance on Saturday at 10 pm\n  location: BannerTop\nEOF" },
        { t: 'bullets', items: [
          '<b>Plugins</b> (e.g. GitOps, virtualization) appear after the Operator is installed <b>and</b> enabled in the <code>Console</code> CR.',
          '<code>ConsoleLink</code>, <code>ConsoleNotification</code>, <code>ConsoleCLIDownload</code>: custom links, banners and CLI downloads.',
          'The console name and URL depend on the <code>*.apps</code> domain (module 07).'
        ] },
        { t: 'callout', kind: 'tip', html: "A “production environment” or “maintenance” banner avoids many context mix-ups between clusters. Advanced customization: <code>customLogoFile</code> and <code>customProductName</code> in the <code>Console</code> CR." }
      ]
    },
    {
      title: 'Post-installation configuration checklist',
      tag: 'to do',
      blocks: [
        { t: 'table', head: ['Step', 'Where', 'Module'], rows: [
          ['Validate the installation (<code>oc get co</code>, nodes, CSRs)', 'After install', 'module 03'],
          ['Replace <code>kubeadmin</code> with an IdP, then delete it', 'OAuth', 'module 06'],
          ['Node NTP (chrony), proxy and corporate CA', 'MachineConfig, Proxy', 'this module'],
          ['Ingress and API certificates', 'IngressController, APIServer', 'this module'],
          ['OperatorHub sources (disable community, mirror)', 'OperatorHub', 'this module, module 03'],
          ['Storage for the registry, monitoring and logging', 'ConfigMaps, CRs', 'modules 08 and 05'],
          ['Scheduled etcd backup', 'Procedure', 'module 11'],
          ['Update channel and strategy', 'ClusterVersion', 'module 12'],
          ['Put all this configuration under GitOps', 'Git repository', 'module 10']
        ] },
        { t: 'callout', kind: 'tip', html: "Ideally, this checklist is <b>coded</b> (manifests in Git, applied by GitOps): the next cluster is configured in minutes and you can prove to an audit what was done." }
      ]
    },
    {
      title: 'Quiz',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'You want a corporate wildcard certificate for all <code>*.apps</code> routes. What do you modify?', options: ['The <code>APIServer</code> resource (<code>servingCerts</code>)', 'A TLS Secret in <code>openshift-ingress</code>, then <code>defaultCertificate</code> of the default <code>IngressController</code>', 'Each <code>Route</code> individually, necessarily', 'A MachineConfig that drops the certificate on the nodes'], answer: 1, explain: 'The routes\' certificate is the router\'s: Secret in <code>openshift-ingress</code> and <code>spec.defaultCertificate</code> of the IngressController. <code>APIServer</code> is for the API certificate; a MachineConfig is not involved.' },
        { t: 'quiz', q: 'You apply a chrony MachineConfig with the <code>role: worker</code> label. What is the effect on the masters?', options: ['None: you need an equivalent MachineConfig for the master pool', 'The masters are updated too', 'The masters reboot with no change', 'The application is refused by the MCO'], answer: 0, explain: 'A MachineConfig is only rendered for the pool designated by its label. For all nodes to share the same time source, also apply a version for the master role.' },
        { t: 'quiz', q: 'A <code>Subscription</code> is set to <code>installPlanApproval: Manual</code>. A new version is available in the channel, but the Operator does not update. What do you do?', options: ['Delete the Subscription and recreate it', 'Restart the Operator pod', 'List the <code>InstallPlan</code>s and approve the pending one', 'Change the <code>OperatorGroup</code>'], answer: 2, explain: 'In Manual mode, OLM creates an unapproved InstallPlan: nothing happens until <code>spec.approved</code> is set to <code>true</code>.' }
      ]
    },
    {
      title: 'Lab: configure a freshly installed cluster',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'Chrony, Operator with manual approval (bonus: Ingress certificate)', goal: 'Core during the session (5 steps) on a SNO or a lab cluster (cluster-admin). The (bonus) steps, including replacing the Ingress certificate, are to be done on your own.', steps: [
          'Prerequisites: environment E1 (SNO) with <code>cluster-admin</code>, see module 00; <code>butane</code> and <code>openssl</code> on your workstation.',
          'Locate the configuration: <code>oc api-resources --api-group=config.openshift.io</code> then <code>oc get proxy,apiserver,image.config cluster -o yaml</code>; what is already filled in?',
          'Write a <code>99-…-chrony.bu</code> (role of your node\'s pool: <b>master</b> on a SNO; check with <code>oc get mcp</code>), generate the YAML with <code>butane</code>, apply it and follow <code>oc get mcp -w</code>; verify with <code>chronyc sources</code> via <code>oc debug node/&lt;node&gt;</code>. <b>On a SNO, the node reboots</b>: the API is unavailable for a few minutes.',
          'Install an Operator with <code>installPlanApproval: Manual</code> (Namespace, OperatorGroup, Subscription); see the pending <code>InstallPlan</code>, approve it with <code>oc patch</code> and wait for the CSV <code>Succeeded</code> phase.',
          'Disable the <code>community-operators</code> source of the OperatorHub and check that it disappears from <code>oc get catalogsource -n openshift-marketplace</code>; finally check <code>oc get co</code> and <code>oc get mcp</code>: everything must stay healthy (Available, not Degraded).',
          '(bonus, <b>risky</b>: do it on a disposable cluster, in this order, with the rollback ready) Create a lab CA and a wildcard certificate <code>*.apps.&lt;cluster&gt;.&lt;domain&gt;</code> with <code>openssl</code>.',
          '(bonus) First declare your lab CA as a trusted CA for the cluster: <code>user-ca-bundle</code> ConfigMap in <code>openshift-config</code> and <code>Proxy.spec.trustedCA</code> (see the “Trusting a CA” slide; procedure to be verified in the 4.20 docs).',
          '(bonus) Create the TLS Secret in <code>openshift-ingress</code> and patch <code>defaultCertificate</code>; wait for the routers to redeploy, check that <code>oc get co</code> stays healthy and verify the issuer with <code>curl -vI</code> on the console.',
          '(bonus) <b>Rollback</b>: remove <code>spec.defaultCertificate</code> from the <code>IngressController</code> (<code>oc patch … --type=json -p \'[{"op":"remove","path":"/spec/defaultCertificate"}]\'</code>, to be verified), wait for the routers to redeploy then delete the Secret. The CA added in <code>user-ca-bundle</code> / <code>Proxy.trustedCA</code> can stay (harmless); removing it is optional (to be verified).',
          '(bonus) Create a banner-type <code>ConsoleNotification</code> and check that it appears in the console.',
          '(bonus) Try OLM v1: create a <code>ClusterExtension</code> for a compatible Operator (scope: see the limits on the OLM v1 slide); compare with the Subscription from step 4.'
        ] }
      ]
    }
  ],
  takeaways: [
    'Each configuration topic has a singleton <code>cluster</code> CR (<code>config.openshift.io</code>) that the relevant operator reconciles: you declare, you don\'t tinker.',
    'Proxy, corporate CA, allowed registries: cross-cutting, with a possible effect on the nodes; always check the <code>status</code> and the associated operator.',
    'Certificates to replace: default Ingress (Secret + <code>defaultCertificate</code>) and API (<code>namedCertificates</code>); rotation is in module 12.',
    'Chrony and kargs go through a MachineConfig (<code>butane</code>): one pool at a time, with a reboot; a role label only targets one pool.',
    'OLM: Subscription, channel and <b>manual approval</b> of InstallPlans for critical Operators; when disconnected, mirrored catalogs; OLM v1 (GA since 4.18).'
  ]
});
