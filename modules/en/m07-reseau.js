COURSE.add({
  id: 'm07', lang: 'en', num: 7, emoji: '🌐',
  title: 'Networking',
  source: 'b7e034b02b8f',
  tagline: 'From the pod to the cluster exit: OVN-Kubernetes, Services and Routes, NetworkPolicy, egress, MetalLB, NMState, secondary networks and UDN.',
  duration: '≈ 70 min + lab 20 min',
  objectives: [
    'Describe the network of an OCP cluster: OVN-Kubernetes, pod / service / machine ranges and their modification limits',
    'Expose an application: Service, Route (edge, passthrough, reencrypt), IngressController and sharding',
    'Isolate traffic with NetworkPolicy and AdminNetworkPolicy, and control egress (EgressFirewall, EgressIP)',
    'Provide on-prem LoadBalancers with MetalLB and configure nodes with NMState',
    'Place secondary networks (Multus), UDNs and know how to diagnose a network problem'
  ],
  slides: [
    {
      title: 'Cluster networking: overview',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Underlay', sub: 'VLAN, bonds, DNS, LB (modules 02-03)' },
          { label: 'OVN-Kubernetes', sub: 'pod network', hl: true },
          { label: 'Services', sub: 'ClusterIP, NodePort, LoadBalancer' },
          { label: 'Routes / Ingress', sub: 'HAProxy, HTTP(S) entry', hl: true },
          { label: 'Egress', sub: 'controlled exit' }
        ], caption: 'This module covers what is <b>inside and at the edge</b> of the cluster; the installation underlay is in module 03, the ports in module 02.' },
        { t: 'bullets', frag: true, items: [
          '<b>Boundaries</b>: topology, installation VIPs and DNS → module 03; ports and flows → module 02; network observability → module 05; pod security → module 09; VMs on secondary networks → module 13.',
          'Reference version: <b>4.20 EUS</b>.'
        ] },
        { t: 'callout', kind: 'cloud', html: "In the cloud, the provider brings load balancers and DNS. <b>On-prem, you bring everything</b>: this is the #1 topic of this module (LoadBalancer, VIPs, DNS, VLAN)." }
      ]
    },
    {
      title: 'OVN-Kubernetes: the only CNI',
      blocks: [
        { t: 'bullets', frag: true, items: [
          '<b>OVN-Kubernetes</b> is the default and <b>only</b> network plugin of OCP.',
          '<b>OpenShift SDN</b>: deprecated since 4.14, new installations on OVN-Kubernetes from 4.15, 4.16 last supported version, <b>removed in 4.17</b>; a cluster still on SDN must migrate to OVN-Kubernetes <b>before</b> moving to 4.17 (offline or limited “live” migration).',
          '<b>Geneve</b> overlay between nodes (6081/UDP, module 02); network policies, services, egress and UDN are implemented by OVN.',
          'The CNI is managed by the <b>Cluster Network Operator</b>: you tune it through the <code>Network</code> CR (<code>operator.openshift.io</code>), not by hand on the nodes.'
        ] },
        { t: 'callout', kind: 'k8s', html: "On K8s, you choose Calico, Cilium, Flannel… On OCP, <b>the choice is made</b>: it removes a source of variability (and of support) but ties you to OVN\'s features." },
        { t: 'callout', kind: 'warn', html: "A cluster inherited on SDN can no longer be updated beyond 4.16 without migration: handle this before any upgrade project (module 12)." }
      ]
    },
    {
      title: 'Network ranges: what can change, what cannot',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Range', 'Role', 'After installation'], rows: [
          ['<code>clusterNetwork</code>', 'Pod IPs (<code>10.128.0.0/14</code>, <code>hostPrefix: 23</code> by default)', 'The CIDR mask can be <b>reduced</b> (more IPs, hence more nodes); <code>hostPrefix</code> is <b>not modifiable</b>'],
          ['<code>serviceNetwork</code>', 'Service IPs (<code>172.30.0.0/16</code>)', '<b>Not extensible</b>: to be set at installation'],
          ['<code>machineNetwork</code>', 'Node network', '<b>Not modifiable</b>']
        ] },
        { t: 'code', lang: 'yaml', file: 'install-config.yaml (excerpt)', code: `networking:
  networkType: OVNKubernetes
  clusterNetwork:
  - cidr: 10.128.0.0/14
    hostPrefix: 23
  serviceNetwork:
  - 172.30.0.0/16
  machineNetwork:
  - cidr: 192.168.10.0/24` },
        { t: 'callout', kind: 'trap', wide: true, html: "The ranges <b>must not overlap</b> your corporate networks (VPN, other clusters, datacenters) and are chosen <b>before</b> installation (module 03). Extending <code>clusterNetwork</code> requires OVN-Kubernetes and a configuration rollout that can take up to about 30 minutes (4.20 docs)." }
      ]
    },
    {
      title: 'Services and internal DNS',
      blocks: [
        { t: 'table', head: ['Service type', 'Use', 'On-prem remark'], rows: [
          ['<code>ClusterIP</code>', 'Internal access', 'Default; <code>serviceNetwork</code> range'],
          ['<code>NodePort</code>', 'Port opened on every node (30000-32767)', 'The firewall must let it through (module 02)'],
          ['<code>LoadBalancer</code>', 'External IP provided by a device', '<b>Stays <code>&lt;pending&gt;</code> without an implementation</b>: MetalLB or an external LB (next slides)'],
          ['<code>ExternalName</code>', 'DNS alias', 'Same as K8s']
        ] },
        { t: 'bullets', items: [
          '<b>Internal DNS</b>: CoreDNS, managed by the <b>DNS Operator</b> (<code>dns.operator.openshift.io</code> “default” CR, pods in <code>openshift-dns</code>); the service domain is <code>cluster.local</code>.',
          'Forwarding corporate domains: <code>servers</code> section of the DNS CR (per-zone forwarding).',
          '<code>externalTrafficPolicy: Local</code> preserves the source IP but only sends traffic to nodes hosting pods.'
        ] },
        { t: 'callout', kind: 'tip', html: "A Service without <code>endpoints</code> (<code>oc get endpoints</code>) is almost always a <b>label selector</b> that matches no pod." }
      ]
    },
    {
      title: 'Routes, Ingress and Gateway API',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          'A <b>Route</b> (<code>route.openshift.io</code>) publishes a Service on a DNS name, served by the <b>HAProxy routers</b> of the <b>Ingress Operator</b> (<code>openshift-ingress</code> namespace).',
          'K8s <b>Ingress</b> objects are accepted: the Ingress Operator creates matching Routes.',
          '<b>Gateway API</b>: GA since <b>4.19</b>, implemented by the Ingress Operator with OpenShift Service Mesh 3 (<code>GatewayClass</code> with <code>controllerName: openshift.io/gateway-controller/v1</code>); not to be confused with Routes.',
          'The <code>*.apps.&lt;cluster&gt;.&lt;domain&gt;</code> wildcard (DNS, module 03) points to the routers.'
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc get ingresscontroller -n openshift-ingress-operator\n$ oc get pods -n openshift-ingress\n$ oc get route -A | head" },
        { t: 'callout', kind: 'tip', wide: true, html: "For new projects, Routes remain the simplest and best-supported path; Gateway API is worth evaluating for portability and advanced cases (details and limits in 4.20: to be verified in the “Configuring Gateway API” docs)." }
      ]
    },
    {
      title: 'TLS Routes: edge, passthrough, reencrypt',
      blocks: [
        { t: 'table', head: ['Type', 'Where is TLS terminated?', 'Use case'], rows: [
          ['<b>edge</b>', 'At the router; plain HTTP to the pod', 'Common case; the certificate is the router\'s or the Route\'s'],
          ['<b>passthrough</b>', 'In the pod; the router does not decrypt', 'End-to-end TLS, SNI-based routing; no usable HTTP headers'],
          ['<b>reencrypt</b>', 'At the router, then re-encrypted to the pod', 'Mandatory internal encryption with a public certificate in front']
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc create route edge web --service=web --hostname=web.apps.ocp4.example.com\n$ oc get route web\n$ curl -kI https://web.apps.ocp4.example.com\n\n# Router timeout (HAProxy annotation)\n$ oc annotate route web haproxy.router.openshift.io/timeout=60s" },
        { t: 'callout', kind: 'ocp', html: "The router\'s <b>default certificate</b> (<code>*.apps</code>) is replaced on the <code>IngressController</code>: see module 04. Here: <b>one certificate per Route</b> and the choice of TLS type." }
      ]
    },
    {
      title: 'IngressController: domain, placement, sharding',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'ingresscontroller-partners.yaml', code: `apiVersion: operator.openshift.io/v1
kind: IngressController
metadata:
  name: partners
  namespace: openshift-ingress-operator
spec:
  domain: partners.apps.ocp4.example.com
  replicas: 2
  nodePlacement:
    nodeSelector:
      matchLabels:
        node-role.kubernetes.io/infra: ""
  routeSelector:
    matchLabels:
      zone: partners
  endpointPublishingStrategy:
    type: HostNetwork` },
        { t: 'bullets', items: [
          '<b>Sharding</b>: several IngressControllers, each with its own <code>domain</code> and <code>routeSelector</code> or <code>namespaceSelector</code> (internal / partner exposure, separate workloads).',
          '<code>replicas</code>: 2 by default; <code>nodePlacement</code> for infra nodes (module 02).',
          '<code>endpointPublishingStrategy</code>: <code>LoadBalancerService</code>, <code>HostNetwork</code>, <code>NodePortService</code> or <code>Private</code>.'
        ] },
        { t: 'callout', kind: 'onprem', html: "Without a cloud provider (<code>None</code> platform, bare metal, vSphere UPI), the default strategy is <b><code>HostNetwork</code></b>: routers listen on ports 80/443 of the nodes, behind your LB or VIPs. Exact default per platform in 4.20: to be verified." }
      ]
    },
    {
      title: 'Exposing HTTP and TCP on-prem: VIPs, LB, MetalLB',
      layout: 'two',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '🌐 HTTP(S): the routers', items: ['<code>*.apps</code> wildcard → <b>Ingress VIP</b> (IPI) or <b>external LB</b> (UPI)', 'Routers in <code>HostNetwork</code> on the targeted nodes', 'One VIP, one LB: few resources', 'The most common for web apps'] },
          right: { title: '🔌 TCP/UDP: LoadBalancer Service', items: ['<b>MetalLB</b> assigns an IP from a pool', 'Announces in <b>L2</b> (ARP/NDP) or <b>BGP</b>', 'One IP per exposed Service', 'Databases, non-HTTP protocols'] },
          verdict: 'HTTP(S) → Route. TCP/UDP exposed outside the cluster → <code>LoadBalancer</code> Service + MetalLB (or corporate LB + NodePort).' },
        { t: 'callout', kind: 'trap', wide: true, html: "Creating a <code>LoadBalancer</code> Service on bare metal without MetalLB: it stays in <code>&lt;pending&gt;</code> indefinitely. It is not a bug, it is the absence of an implementation (module 02, 03: the API LB is a different topic)." }
      ]
    },
    {
      title: 'NetworkPolicy: isolating projects',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'networkpolicies.yaml', code: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
  namespace: team-a
spec:
  podSelector: {}
  policyTypes:
  - Ingress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-openshift-ingress
  namespace: team-a
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          policy-group.network.openshift.io/ingress: ""
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-hostnetwork
  namespace: team-a
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          policy-group.network.openshift.io/host-network: ""
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-same-namespace
  namespace: team-a
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector: {}` },
        { t: 'bullets', items: [
          'Same API as on K8s: <b>deny-all</b> then <b>targeted openings</b>. The four policies above (policies inspired by the 4.20 docs: About network policy and Configuring multitenant isolation sections) go in the <b>project template</b> (module 06).',
          '<b>OCP pitfall</b>: a deny-all also cuts off the <b>routers</b>: plan <code>allow-from-openshift-ingress</code> (label <code>policy-group.network.openshift.io/ingress</code>) and, with <b>HostNetwork</b> routers (on-prem default), <code>allow-from-hostnetwork</code> (label <code>policy-group.network.openshift.io/host-network</code>).'
        ] },
        { t: 'callout', kind: 'warn', html: "The two YAMLs <code>allow-from-openshift-ingress</code> and <code>allow-from-hostnetwork</code> are inspired by the 4.20 docs (About network policy and Configuring multitenant isolation sections). <b>Which one is enough depending on the publishing mode</b> of the <code>IngressController</code> (HostNetwork or LoadBalancerService/NodePort) is not stated explicitly in the pages read: <b>to be verified</b>; in practice, apply both then test. Beware: a badly opened deny-all cuts you off from your own applications." }
      ]
    },
    {
      title: 'AdminNetworkPolicy: the admin\'s rules',
      layout: 'two',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '👮 AdminNetworkPolicy (ANP)', items: ['<b>Cluster</b> object, evaluated <b>before</b> NetworkPolicies', 'Actions: <code>Allow</code>, <code>Deny</code>, <code>Pass</code>', '<code>priority</code> from 0 to 99 (100 ANPs at most; the lower the value, the higher the priority; the docs advise 30-70)', 'Teams cannot bypass it'] },
          right: { title: '🛟 BaselineAdminNetworkPolicy (BANP)', items: ['<b>A single</b> object per cluster', '<b>Default</b> guardrail if no NetworkPolicy matches', 'Team NetworkPolicies can <b>override</b> it'] },
          verdict: 'ANP = what nobody can open; BANP = the default that teams can relax; NetworkPolicy = project rules.' },
        { t: 'code', lang: 'yaml', file: 'anp-example.yaml', code: `apiVersion: policy.networking.k8s.io/v1alpha1
kind: AdminNetworkPolicy
metadata:
  name: block-to-admin
spec:
  priority: 40
  subject:
    namespaces:
      matchLabels:
        env: prod
  egress:
  - name: no-admin-net
    action: Deny
    to:
    - networks:
      - 10.99.0.0/16` },
        { t: 'callout', kind: 'warn', wide: true, html: "The API is in <code>policy.networking.k8s.io/v1alpha1</code> in the 4.20 docs. History: Technology Preview from 4.14 (<code>TechPreviewNoUpgrade</code> feature set). <b>Status in 4.20</b>: GA (presented without any Tech Preview mention in the 4.19-4.20 docs). Priority: the 4.20 docs state “0-99” for OVN-Kubernetes (another section of the same docs says 0-100); <code>to</code> / <code>networks</code> fields of the example: to be verified." }
      ]
    },
    {
      title: 'Egress: controlling the exit',
      blocks: [
        { t: 'table', head: ['Object (<code>k8s.ovn.org/v1</code>)', 'Role', 'Remark'], rows: [
          ['<code>EgressFirewall</code>', 'Allows or denies a namespace\'s outbound connections (CIDR, DNS)', 'One per namespace; without a matching rule, traffic is <b>allowed</b>'],
          ['<code>EgressIP</code>', 'Fixed source IP for outbound traffic of selected pods', 'IP to provide on the node network (on-prem)'],
          ['<code>EgressService</code>', 'Exit tied to a <code>LoadBalancer</code> Service', 'Reserved for advanced uses; details to be verified']
        ] },
        { t: 'code', lang: 'yaml', file: 'egress.yaml', code: `apiVersion: k8s.ovn.org/v1
kind: EgressFirewall
metadata:
  name: default
  namespace: team-a
spec:
  egress:
  - type: Allow
    to:
      cidrSelector: 10.0.0.0/8
  - type: Deny
    to:
      cidrSelector: 0.0.0.0/0
---
apiVersion: k8s.ovn.org/v1
kind: EgressIP
metadata:
  name: egressip-team-a
spec:
  egressIPs:
  - 192.168.10.50
  namespaceSelector:
    matchLabels:
      env: prod` },
        { t: 'callout', kind: 'onprem', html: "For the EgressIP to work, you need nodes carrying the label <code>k8s.ovn.org/egress-assignable=\"\"</code> and a free IP <b>in the nodes\' subnet</b>; the corporate firewall must know this IP. In the cloud, allocation is automated by the provider." }
      ]
    },
    {
      title: 'MetalLB: L2 or BGP?',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '🟦 L2 mode', items: ['One node answers ARP/NDP for the IP', 'No special equipment', 'A single node carries the IP at a given time', 'Failover in a few seconds'] },
          right: { title: '🟧 BGP mode', items: ['Announces the IP to routers (BGP peers)', 'Traffic spread across several nodes', 'Requires BGP routers and network coordination', 'Better suited to production at scale'] },
          verdict: 'Lab and small sites: L2. Production with a network team and several racks: BGP.' },
        { t: 'bullets', items: [
          '<b>MetalLB Operator</b> (OLM, module 04); preferably installed via CLI in <code>metallb-system</code> (Subscription <code>metadata.name: metallb-operator-sub</code>, <code>spec.name: metallb-operator</code>, <code>stable</code> channel, <code>redhat-operators</code> source, 4.20 docs); the IPAddressPool must be in the Operator\'s namespace.',
          'Objects: <code>IPAddressPool</code>, <code>L2Advertisement</code>, <code>BGPPeer</code>, <code>BGPAdvertisement</code>, <code>metallb.io/v1beta1</code> API.'
        ] },
        { t: 'callout', kind: 'warn', html: "Namespace, channel and Subscription: “Installing the MetalLB Operator” docs 4.20. After the Operator, create the <code>MetalLB</code> CR named <code>metallb</code> in <code>metallb-system</code>; FRR version in BGP: read it in “Load balancing with MetalLB” for your version (to be verified)." }
      ]
    },
    {
      title: 'MetalLB: a pool and an advertisement',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'metallb.yaml', code: `apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: pool-lab
  namespace: metallb-system
spec:
  addresses:
  - 192.168.10.200-192.168.10.220
  autoAssign: true
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: l2-lab
  namespace: metallb-system
spec:
  ipAddressPools:
  - pool-lab` },
        { t: 'bullets', items: [
          '<code>addresses</code>: CIDR or range; <code>autoAssign</code> (default: true) decides whether MetalLB picks from the pool on its own.',
          '<code>serviceAllocation</code>: reserve a pool for certain namespaces or labels, with priority.',
          'A <code>Service</code> of type <code>LoadBalancer</code> then receives an external IP (<code>oc get svc</code>).'
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: "The pool must be a <b>free</b> range of the subnet (outside DHCP, installation VIPs, EgressIPs). A duplicate IP causes intermittent packet loss that is very hard to link back to MetalLB." }
      ]
    },
    {
      title: 'NMState: configuring node networking',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'nncp-vlan.yaml', code: `apiVersion: nmstate.io/v1
kind: NodeNetworkConfigurationPolicy
metadata:
  name: vlan100-ens4
spec:
  nodeSelector:
    node-role.kubernetes.io/worker: ""
  desiredState:
    interfaces:
    - name: ens4.100
      type: vlan
      state: up
      vlan:
        base-iface: ens4
        id: 100` },
        { t: 'bullets', items: [
          '<b>Kubernetes NMState Operator</b>: observes the nodes\' network state and applies <code>NodeNetworkConfigurationPolicy</code> objects (bonds, VLANs, bridges, DNS, routes).',
          'Nodes are reconfigured <b>live</b> and the policy is rolled back if the node loses connectivity.',
          'For <b>static IPs at installation</b>: Agent-based and NMState in <code>agent-config.yaml</code> (module 03).'
        ] },
        { t: 'callout', kind: 'trap', html: "You <b>cannot modify</b> the <code>br-ex</code> bridge managed by OVN-Kubernetes, nor the interfaces, bonds or VLANs attached to it. Several NNCPs on a node: alphanumeric order of names (4.20 docs). <code>nmstate.io/v1</code> API (4.20 docs)." }
      ]
    },
    {
      title: 'Secondary networks: Multus',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'nad-macvlan.yaml', code: `apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: macvlan-net
  namespace: team-a
spec:
  config: |-
    {
      "cniVersion": "0.3.1",
      "type": "macvlan",
      "master": "ens4",
      "mode": "bridge",
      "ipam": { "type": "whereabouts", "range": "192.168.20.0/24" }
    }
---
# In the pod: annotation k8s.v1.cni.cncf.io/networks: macvlan-net` },
        { t: 'bullets', items: [
          '<b>Multus</b> adds extra interfaces to a pod, described by <code>NetworkAttachmentDefinition</code>s (macvlan, ipvlan, bridge, SR-IOV…).',
          'Managed by the <b>Cluster Network Operator</b> (<code>additionalNetworks</code>) or created directly; <b>SR-IOV</b>: dedicated operator, networks manageable in application namespaces since 4.20.',
          'Uses: telecom, separate storage or traffic, <b>VMs</b> (module 13).'
        ] },
        { t: 'callout', kind: 'tip', wide: true, html: "The secondary network is not protected by the primary network\'s NetworkPolicies: treat it as an <b>infrastructure</b> network with its own controls." }
      ]
    },
    {
      title: 'User-Defined Networks (UDN)',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'udn.yaml', code: `apiVersion: k8s.ovn.org/v1
kind: UserDefinedNetwork
metadata:
  name: udn-1
  namespace: team-a
spec:
  topology: Layer2
  layer2:
    role: Primary
    subnets:
    - "10.0.0.0/24"` },
        { t: 'bullets', frag: true, items: [
          '<b>UDN</b> (per namespace) and <b>ClusterUserDefinedNetwork</b> (several namespaces): advanced segmentation and isolation at the OVN-Kubernetes level; <code>Layer3</code>, <code>Layer2</code> and <code>Localnet</code> topologies.',
          'A <b>primary</b> UDN requires a label on the namespace: <code>k8s.ovn.org/primary-user-defined-network</code>, set at namespace creation.',
          '<b>Status</b>: UDN GA since 4.18. In 4.20: route advertisement for CUDNs, BGP in the Cluster Network Operator, “Preconfigured UDN endpoints” in Technology Preview.',
          'Limits from the docs: not in <code>openshift-*</code> namespaces nor <code>default</code>.'
        ] },
        { t: 'callout', kind: 'ocp', html: "Main benefit: <b>VMs and multi-tenant workloads</b> with their own routed network (module 13). For classic container use, NetworkPolicy and ANP are usually enough." }
      ]
    },
    {
      title: 'Diagnosing a network problem',
      layout: 'two',
      blocks: [
        { t: 'flow', wide: true, nodes: [
          'Does the pod exist?',
          { label: 'DNS', sub: 'nslookup of the Service' },
          { label: 'Service', sub: 'endpoints' },
          { label: 'Route / router', sub: 'oc get route, HAProxy logs' },
          { label: 'Policy', sub: 'NetworkPolicy, ANP, EgressFirewall', hl: true }
        ], caption: 'Go from the <b>simplest to the deepest</b>: name, Service, exposure, policies, then OVN.' },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc get endpoints web\n$ oc exec deploy/web -- curl -sI http://other-svc:8080\n$ oc get networkpolicy,adminnetworkpolicy -A\n\n# On a node (never in production without a reason)\n$ oc debug node/worker-0\nsh-5.1# chroot /host\nsh-5.1# ip a ; ss -lntp | head" },
        { t: 'bullets', items: [
          '<b>ovnkube-trace</b>: traces simulated TCP/UDP packets between two points of an OVN-Kubernetes cluster (ovn-trace + ovs-appctl + ovn-detrace); available in the 4.20 docs.',
          '<b>must-gather</b>: the <code>--gather_network_logs</code> option is only used at the support\'s request.'
        ] },
        { t: 'callout', kind: 'warn', wide: true, html: "Network observability (flows, who talks to whom) is a <b>separate operator</b>: Network Observability, module 05. Don\'t confuse it with the ad hoc diagnosis of this slide." }
      ]
    },
    {
      title: 'Quiz',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'On a bare metal cluster, a <code>type: LoadBalancer</code> Service stays in <code>&lt;pending&gt;</code>. Why?', options: ['The Service is badly written: the <code>route</code> annotation is missing', 'The project quota is reached and prevents assigning an IP', 'Nothing provides an external IP: you need MetalLB or a corporate load balancer', 'The HAProxy routers must be redeployed to support LoadBalancer Services'], answer: 2, explain: 'Without a cloud provider, no LoadBalancer implementation exists by default. MetalLB (L2 or BGP) assigns IPs from a pool; the HAProxy routers serve HTTP(S) Routes, not LoadBalancer Services.' },
        { t: 'quiz', q: 'After applying a <code>deny-all</code> NetworkPolicy in a project, the Route no longer answers; your cluster\'s routers are in <code>HostNetwork</code>. What must be allowed?', options: ['A new <code>IngressController</code> dedicated to this project, otherwise the Route cannot be served', 'The routers\' traffic: <code>allow-from-openshift-ingress</code> and, for HostNetwork routers, <code>allow-from-hostnetwork</code>', 'The routers\' outbound connections, with an explicit EgressFirewall for the namespace', 'Nothing: Routes are never affected by the project\'s NetworkPolicies'], answer: 1, explain: 'The deny-all also blocks the routers\' incoming traffic. The docs distinguish two opening policies: one for the “ingress” group and one for “host-network” traffic; which one is enough depending on the IngressController publishing mode: to be verified on your cluster (the safest is to apply both). EgressFirewall concerns the cluster exit.' },
        { t: 'quiz', q: 'Can you extend the <code>serviceNetwork</code> of an already installed cluster?', options: ['Yes, by modifying the <code>Network</code> CR as for <code>clusterNetwork</code>', 'Yes, but only with the Kubernetes ServiceCIDR API', 'Yes, by adding an infra node with a second Service network', 'No: it is set at installation and cannot be extended'], answer: 3, explain: 'The 4.20 docs state that the Service CIDR cannot be extended after installation (neither directly, nor through the ServiceCIDR API); only the <code>clusterNetwork</code> mask can be reduced to add space.' }
      ]
    },
    {
      title: 'Lab: expose an app and isolate it',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'Route, deny-all NetworkPolicy and targeted opening', goal: 'Core during the session on a SNO (cluster-admin); the (bonus) steps are to be done on your own.', steps: [
          'Prerequisites: environment E1 (SNO) with <code>cluster-admin</code>, see module 00.',
          'Create a <code>net-lab</code> project, deploy a web app (for example <code>oc new-app --image=quay.io/redhattraining/hello-world-nginx</code>), then expose it with <code>oc create route edge</code> and test with <code>curl -k</code>.',
          'Apply the <code>deny-all</code> NetworkPolicy from the dedicated slide: does the Route still answer? Read <code>oc get networkpolicy</code> and explain.',
          'Add <code>allow-from-openshift-ingress</code> and <code>allow-from-hostnetwork</code> (labels verifiable with <code>oc get ns openshift-ingress --show-labels</code>): does the Route become reachable again with each one alone? Note what is enough on your cluster. <b>Risk</b>: a deny-all can cut off your access; <b>rollback</b>: <code>oc delete networkpolicy deny-all -n &lt;project&gt;</code>.',
          'Create a second project <code>net-lab2</code> with a test pod and try to reach the <code>net-lab</code> Service with <code>oc exec … -- curl</code>: see the blocking, then create a targeted policy in <code>net-lab</code>: <code>podSelector</code> on the app pods\' label (find it with <code>oc get pods --show-labels</code>, for example <code>app=hello-world-nginx</code>) and <code>ingress.from.namespaceSelector</code> on <code>kubernetes.io/metadata.name: net-lab2</code>; the test must pass, a third project\'s must not.',
          '(bonus, E1) Set a <code>default</code> <code>EgressFirewall</code> that denies <code>0.0.0.0/0</code> except a chosen CIDR and test an allowed and a denied exit. <b>Cleanup</b>: <code>oc delete egressfirewall default -n &lt;project&gt;</code>.',
          '(bonus, E1 with a free IP range in the subnet) Install the MetalLB Operator, create an <code>IPAddressPool</code> and an <code>L2Advertisement</code> on a free range of your network, then a <code>LoadBalancer</code> Service. <b>Cleanup</b>: <code>oc delete svc &lt;service&gt;</code>, then the <code>IPAddressPool</code> and the <code>L2Advertisement</code>.',
          '(bonus, E1) Create a primary <code>Layer2</code> <code>UserDefinedNetwork</code> in a new namespace (with the required label) and compare the pods\' IP addresses. <b>Cleanup</b>: <code>oc delete userdefinednetwork udn-1 -n &lt;namespace&gt;</code>, then the namespace.',
          '(bonus, E2 preferred) EgressIP (labeled node, free IP); on a SNO, try with caution (to be verified). <b>Cleanup</b>: <code>oc delete egressip &lt;name&gt;</code> and <code>oc label node &lt;node&gt; k8s.ovn.org/egress-assignable-</code>. NMState: only on a disposable cluster (E1 or more), with console access to the nodes; rollback: policy with <code>state: absent</code> for the interface, then deleting the NNCP.'
        ] }
      ]
    }
  ],
  takeaways: [
    'OVN-Kubernetes is the only CNI (SDN removed in 4.17); <code>serviceNetwork</code>, <code>hostPrefix</code> and <code>machineNetwork</code> are frozen after installation, only the <code>clusterNetwork</code> mask can be reduced.',
    'HTTP(S): Route (edge, passthrough, reencrypt) and IngressController (domain, sharding, <code>HostNetwork</code> by default without a cloud); Gateway API GA since 4.19.',
    'TCP/UDP: a <code>LoadBalancer</code> Service has no native LB on-prem: MetalLB (L2 or BGP) or external equipment.',
    'NetworkPolicy deny-all + <code>allow-from-openshift-ingress</code> / <code>allow-from-hostnetwork</code>; AdminNetworkPolicy (priority 0-99) and BANP for the admin\'s rules; EgressFirewall and EgressIP for the exit.',
    'NMState configures the nodes (bonds, VLANs) except <code>br-ex</code>; Multus and SR-IOV for secondary networks; UDN (GA 4.18) for advanced segmentation and VMs.',
    'Diagnosis from simple to deep: DNS, Service and endpoints, Route, policies, then <code>ovnkube-trace</code>; network must-gather only at the support\'s request.'
  ]
});
