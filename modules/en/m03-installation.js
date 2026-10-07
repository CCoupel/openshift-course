COURSE.add({
  id: 'm03', lang: 'en', num: 3, emoji: '🚀',
  title: 'Installation',
  source: '8ddfca90021d',
  tagline: 'From DNS to the first <code>oc get co</code>: choosing your method, preparing the infrastructure, installing, including on a disconnected network.',
  duration: '≈ 75 min + lab 20 min',
  objectives: [
    'Choose between Agent-based, Assisted, IPI and UPI depending on your on-prem platform',
    'Prepare the prerequisites: DNS, load balancers or VIPs, NTP, certificates, pull secret',
    'Write and understand <code>install-config.yaml</code> and <code>agent-config.yaml</code>',
    'Follow the course of an installation (bootstrap, CSRs, <code>wait-for</code>) and validate it',
    'Set up a disconnected installation with a mirror registry and <code>oc-mirror</code>'
  ],
  slides: [
    {
      title: 'Four methods, one destination',
      blocks: [
        { t: 'text', html: "<p>On K8s, you know <code>kubeadm</code> or a home-grown tool. On OCP, the program is <code>openshift-install</code> (or the Assisted Installer): it generates the <b>Ignition</b> configurations and drives the first boot. The <b>what</b> (roles, topologies, ports) is in module 02; here, the <b>how</b>.</p>" },
        { t: 'table', head: ['Method', 'Principle', 'What you provide'], rows: [
          ['<b>Agent-based</b>', 'An ISO generated locally; nodes boot from it, a “rendezvous” node orchestrates', 'The machines, the network, DNS and LB (or VIPs), a workstation with <code>openshift-install</code>'],
          ['<b>Assisted Installer</b>', 'Web service (console.redhat.com, or local version): hosts are discovered via an ISO and configured in a UI', 'The machines, the network, DNS and LB (or VIPs); access to the service'],
          ['<b>IPI</b> (installer-provisioned)', 'The installer provisions the machines itself (vSphere: VMs; bare metal: via BMC)', 'vCenter or BMC credentials, DNS, reserved VIPs'],
          ['<b>UPI</b> (user-provisioned)', 'You create machines, network, LB, DNS yourself and serve the Ignition files', 'Everything: it is the most manual mode']
        ] },
        { t: 'callout', kind: 'k8s', html: "Unlike <code>kubeadm init</code>, you don't configure components one by one: you describe the cluster in a single file (<code>install-config.yaml</code>) and the installer runs the sequence." }
      ]
    },
    {
      title: 'Which one to choose?',
      layout: 'two',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '🧩 You want a guided path', items: ['<b>Agent-based</b>: works disconnected, ideal for bare metal and SNO', '<b>Assisted</b>: UI + host validations (network, disk, NTP) before installation', 'No need for a BMC or provisioning network'] },
          right: { title: '🔧 You want to drive everything', items: ['<b>IPI</b>: fewer manual tasks, VIPs managed for you (vSphere, bare metal with BMC)', '<b>UPI</b>: maximum control, maximum work; imposed when the platform or the process requires it', 'In UPI, nodes are created and their CSRs approved by hand'] },
          verdict: 'Starting rule: <b>Agent-based</b> if you have bare servers or a disconnected setup; <b>IPI vSphere</b> if your infrastructure is already vSphere and you have the rights.' },
        { t: 'callout', kind: 'cloud', wide: true, html: "In the cloud (AWS, Azure, GCP), IPI also creates the <b>load balancers, DNS, security groups</b>: there is almost nothing to prepare. On managed offerings (ROSA/ARO/OSD), you install nothing: this whole module does not concern you. On-prem, preparing the infrastructure <b>is</b> the project." }
      ]
    },
    {
      title: 'Platforms: baremetal, vsphere, none',
      blocks: [
        { t: 'table', head: ['<code>platform</code> value', 'When', 'What it changes'], rows: [
          ['<code>baremetal</code>', 'Physical servers (or VMs without hypervisor integration) with VIPs', 'API/Ingress VIPs via keepalived; Machine API via Metal3 in IPI'],
          ['<code>vsphere</code>', 'Cluster on vCenter', 'vSphere CSI, managed VIPs (IPI), Machine API (IPI), failure domains'],
          ['<code>none</code>', 'Any infrastructure without integration (UPI, SNO, edge)', 'No VIPs, no Machine API; LB and DNS entirely on you'],
          ['<i>others</i>', 'Nutanix, OpenStack, cloud…', 'Out of scope for this course (to be confirmed for your context)']
        ] },
        { t: 'callout', kind: 'warn', html: "The supported method × platform combinations depend on the version (for example Agent-based on each platform): <b>to be verified in the 4.20 release notes</b> and the support matrix before you lock in your design." },
        { t: 'callout', kind: 'tip', html: "The <code>platform</code> choice is <b>structural</b>: it determines the Machine API, the default storage (module 08) and the VIPs. It cannot be changed afterwards." }
      ]
    },
    {
      title: 'Prerequisites: machines and workstation',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Role', 'vCPU', 'RAM', 'Disk'], rows: [
          ['Bootstrap (temporary)', '4', '16 GB', '100 GB'],
          ['Control plane (×3)', '4', '16 GB', '100 GB'],
          ['Worker (×N)', '2', '8 GB', '100 GB'],
          ['SNO', '8', '16 GB', '120 GB']
        ] },
        { t: 'bullets', items: [
          '<b>Minimums</b> from the 4.20 docs for bootstrap, control plane, worker and SNO. Size generously (monitoring, logging, virtualization).',
          'Control plane disk: <b>fast</b> (etcd latency, see module 08).',
          '<b>Architecture and firmware</b>: x86_64 (other architectures: out of scope); UEFI <b>required</b> in bare metal IPI when the provisioning network is IPv6 (without a provisioning network, no requirement).',
          'Installation workstation with access to the nodes and to the Internet (or the mirror).'
        ] },
        { t: 'cmds', wide: true, items: [
          ['openshift-install version', 'Installer version (and embedded release)'],
          ['oc version --client', 'oc client version'],
          ['oc adm release info quay.io/openshift-release-dev/ocp-release:<version>-x86_64', 'Contents of a release (components, images); replace &lt;version&gt;'],
          ['butane --version', 'Tool to write MachineConfigs / Ignition in YAML (useful in UPI)']
        ] }
      ]
    },
    {
      title: 'Prerequisites: DNS and load balancers',
      blocks: [
        { t: 'text', html: "<p>Three names to resolve, <b>before</b> installing. Ports and flows: module 02; here, the implementation.</p>" },
        { t: 'code', lang: 'bash', file: 'zone DNS (BIND example)', code: "; cluster ocp4 in example.com\napi.ocp4.example.com.        IN A 192.168.10.5   ; API LB (or API VIP)\napi-int.ocp4.example.com.    IN A 192.168.10.5   ; same target, name used by the nodes\n*.apps.ocp4.example.com.     IN A 192.168.10.6   ; Ingress LB (or Ingress VIP)\n; + A (and PTR) for each node in UPI" },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ dig +short api.ocp4.example.com\n192.168.10.5\n$ dig +short test.apps.ocp4.example.com   # the wildcard must answer\n192.168.10.6\n$ dig +short -x 192.168.10.21             # reverse lookup of a node" },
        { t: 'bullets', frag: true, items: [
          '<b>UPI / platform none</b>: two L4 LBs of your own (API 6443 + MCS 22623; Ingress 80 + 443), with health checks.',
          '<b>IPI / Agent with VIPs</b>: two free VIPs in the nodes\' subnet (<code>apiVIPs</code>, <code>ingressVIPs</code>); DNS points to them.',
          '<b>Reverse</b> resolution is required in UPI (API, bootstrap, control plane, compute); when absent, <code>oc adm node-image monitor</code> skips the CSR checks.'
        ] },
        { t: 'callout', kind: 'trap', html: "A forgotten <code>*.apps</code> wildcard is the #1 failure: the installation <b>seems to progress</b>, then <code>install-complete</code> never finishes (console and OAuth unreachable)." }
      ]
    },
    {
      title: 'Prerequisites: NTP, addressing, certificates, pull secret',
      layout: 'two',
      blocks: [
        { t: 'bullets', frag: true, items: [
          '<b>NTP</b>: all nodes on the same time source. A skew breaks certificates and etcd (module 02).',
          '<b>Addressing</b>: DHCP with reservations, or static IPs described in <b>NMState</b> (Agent-based). No IP change afterwards.',
          '<b>Internal networks</b>: <code>clusterNetwork</code>, <code>serviceNetwork</code>, <code>machineNetwork</code> must not overlap your network (VPN, datacenters).',
          '<b>Pull secret</b>: retrieved from console.redhat.com, injected into <code>install-config.yaml</code>.',
          '<b>Certificates</b>: the installer creates an internal PKI; the API and Ingress certificates are replaced <b>afterwards</b> (module 04).'
        ] },
        { t: 'callout', kind: 'onprem', html: "Network, DNS, NTP, firewall and corporate PKI: <b>these are tickets to open upstream</b> with other teams. Count weeks, not hours." },
        { t: 'callout', kind: 'cloud', html: "In the cloud, time, DNS and network are provided; only the CIDR overlap remains a concern." }
      ]
    },
    {
      title: 'install-config.yaml: the single source of truth',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'install-config.yaml (skeleton)', code: `apiVersion: v1
baseDomain: example.com
metadata:
  name: ocp4                 # => api.ocp4.example.com
compute:
- name: worker
  replicas: 3                # 0 for a compact cluster or a SNO; 0 also in UPI (workers created by hand)
controlPlane:
  name: master
  replicas: 3                # 1 for a SNO
networking:
  networkType: OVNKubernetes
  clusterNetwork:
  - cidr: 10.128.0.0/14      # pod network
    hostPrefix: 23
  serviceNetwork:
  - 172.30.0.0/16
  machineNetwork:
  - cidr: 192.168.10.0/24    # node network
platform:
  none: {}                   # or baremetal / vsphere (next slides)
pullSecret: '{"auths":{...}}'
sshKey: 'ssh-ed25519 AAAA...'` },
        { t: 'bullets', items: [
          'The CIDRs above are the common default values: adapt them to your network.',
          'Useful optional fields: <code>additionalTrustBundle</code> (CA of a registry or proxy), <code>proxy</code>, <code>fips</code>, <code>capabilities</code>.',
          'Guided generation: <code>openshift-install create install-config</code>.'
        ] },
        { t: 'callout', kind: 'trap', html: "The installer <b>consumes</b> <code>install-config.yaml</code> (it deletes it from the folder). Make a copy before <code>create</code>: without it, you can't replay or understand what was installed." }
      ]
    },
    {
      title: 'install-config: vSphere specifics (IPI)',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'install-config.yaml (vsphere excerpt)', code: `platform:
  vsphere:
    apiVIPs:
    - 192.168.10.5
    ingressVIPs:
    - 192.168.10.6
    vcenters:
    - server: vcenter.example.com
      user: svc-ocp@vsphere.local
      password: change-me
      datacenters:
      - DC1
    failureDomains:
    - name: fd-a
      region: dc1
      zone: cluster-a
      server: vcenter.example.com
      topology:
        datacenter: DC1
        computeCluster: /DC1/host/cluster-a
        datastore: /DC1/datastore/ds-ocp
        networks:
        - VM Network` },
        { t: 'bullets', items: [
          '<b>Failure domains</b> describe where to place the VMs (cluster, datastore, network): the basis for HA across clusters or datacenters.',
          'The vCenter account must have the documented <b>privileges</b> (VM, folders, datastore): see the “Required vCenter account privileges” section of the 4.20 docs.',
          'Optional topology fields: <code>resourcePool</code>, <code>folder</code>, <code>tagIDs</code>.'
        ] },
        { t: 'callout', kind: 'onprem', html: "Reserve both VIPs in the IPAM <b>beforehand</b>: a VIP already in use causes intermittent errors that are very hard to link back to the installation." }
      ]
    },
    {
      title: 'IPI bare metal: BMC and provisioning',
      layout: 'two',
      blocks: [
        { t: 'text', html: "<p>In bare metal IPI, the installer drives the servers <b>through their BMC</b> (Metal3 / Ironic). Each host is described in <code>install-config.yaml</code>.</p>" },
        { t: 'code', lang: 'yaml', file: 'install-config.yaml (baremetal excerpt)', code: `platform:
  baremetal:
    apiVIPs: [192.168.10.5]
    ingressVIPs: [192.168.10.6]
    provisioningNetwork: Managed   # or Unmanaged / Disabled
    hosts:
    - name: master-0
      role: master
      bmc:
        address: redfish-virtualmedia://10.0.0.11/redfish/v1/Systems/1
        username: admin
        password: change-me
      bootMACAddress: 52:54:00:aa:bb:01
      rootDeviceHints:
        deviceName: /dev/sda` },
        { t: 'bullets', items: [
          '<b>BMC</b>: Redfish (virtual media) or IPMI; you need a network path installer → BMC.',
          '<b>Provisioning network</b>: a dedicated network (PXE); alternatively, virtual media only.',
          '<code>rootDeviceHints</code>: tells which disk to use (otherwise you risk overwriting the wrong one).'
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: "A poorly reachable BMC or an old firmware (incomplete Redfish) blocks the inspection. Validate BMC connectivity <b>before</b> starting the installation." }
      ]
    },
    {
      title: 'Agent-based: agent-config.yaml',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'agent-config.yaml (SNO)', code: `apiVersion: v1beta1              # v1beta1 (4.20 docs)
kind: AgentConfig
metadata:
  name: ocp4
rendezvousIP: 192.168.10.10     # IP of the node that orchestrates the installation
hosts:
- hostname: sno-0
  interfaces:
  - name: eno1
    macAddress: 52:54:00:aa:bb:10
  networkConfig:                 # NMState syntax
    interfaces:
    - name: eno1
      type: ethernet
      state: up
      mac-address: 52:54:00:aa:bb:10
      ipv4:
        enabled: true
        dhcp: false
        address:
        - ip: 192.168.10.10
          prefix-length: 24
    dns-resolver:
      config:
        server:
        - 192.168.10.2
    routes:
      config:
      - destination: 0.0.0.0/0
        next-hop-address: 192.168.10.1
        next-hop-interface: eno1` },
        { t: 'callout', kind: 'tip', html: "<code>agent-config.yaml</code> complements <code>install-config.yaml</code> (cluster, pull secret, global network) with what is <b>specific to the hosts</b>: static IPs, interfaces, role. Node network details (NMState): module 07." },
        { t: 'callout', kind: 'warn', html: "<code>apiVersion: v1beta1</code> as documented in 4.20; available fields: to be verified in the 4.20 release notes." }
      ]
    },
    {
      title: 'Agent-based: the walkthrough',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Write', sub: 'install-config + agent-config' },
          { label: 'Generate the ISO', sub: 'openshift-install agent create image', hl: true },
          { label: 'Boot', sub: 'virtual media, USB or PXE' },
          { label: 'Rendezvous', sub: 'orchestrates, hosts the bootstrap' },
          { label: 'Cluster', sub: 'the other nodes join' }
        ], caption: "No separate bootstrap machine: one of the nodes acts as the <b>rendezvous</b> and plays that role during the installation." },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ mkdir ocp4 && cp install-config.yaml agent-config.yaml ocp4/\n$ cp -r ocp4 ocp4.bak                      # files are consumed\n$ openshift-install agent create image --dir ocp4\n# => ocp4/agent.x86_64.iso (mount on each server)\n$ openshift-install agent wait-for bootstrap-complete --dir ocp4 --log-level=info\n$ openshift-install agent wait-for install-complete  --dir ocp4" },
        { t: 'callout', kind: 'warn', html: "Subcommands (<code>agent create image</code>, <code>wait-for</code>, <code>create cluster-manifests</code>) and the <code>agent.x86_64.iso</code> ISO: consistent with the docs. For a USB stick, the docs mention <code>isohybrid --uefi</code>." }
      ]
    },
    {
      title: 'UPI: what you do yourself',
      layout: 'two',
      blocks: [
        { t: 'flow', wide: true, nodes: [
          'create install-config',
          { label: 'create manifests', sub: 'edit if needed' },
          { label: 'create ignition-configs', sub: 'bootstrap.ign, master.ign, worker.ign', hl: true },
          'host the .ign files',
          'boot the VMs / servers'
        ], caption: 'After boot: <code>wait-for bootstrap-complete</code>, CSR approval, then <code>wait-for install-complete</code>.' },
        { t: 'bullets', frag: true, items: [
          'You create <b>the machines</b>, the network, <b>the LBs</b>, DNS and the HTTP server for the Ignition files.',
          'Nodes boot from an RHCOS image (ISO, PXE, vSphere template) with a “<i>pointer</i>” Ignition to the MCS (port 22623).',
          'The bootstrap is removed from the LB at the end: <b>it is up to you</b> to do it.'
        ] },
        { t: 'callout', kind: 'trap', html: "Ignition files have a <b>limited validity period</b> (bootstrap certificates: 24 h). If the installation drags on, regenerate them." },
        { t: 'callout', kind: 'onprem', html: "UPI is the only mode where you can accumulate drift between nodes (templates, firmware). Document and <b>automate</b> (Terraform, Ansible) from the start." }
      ]
    },
    {
      title: 'What happens during the installation',
      blocks: [
        { t: 'diagram', caption: 'Simplified sequence: the bootstrap starts a temporary control plane that seeds the real masters.', html: '<svg viewBox="0 0 760 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Installation sequence" style="width:100%;height:auto"><defs><marker id="ar3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs><g fill="var(--surface)" stroke="var(--border)" stroke-width="1.5"><rect x="10" y="20" width="140" height="60" rx="8"/><rect x="190" y="20" width="160" height="60" rx="8"/><rect x="390" y="20" width="160" height="60" rx="8"/><rect x="590" y="20" width="160" height="60" rx="8"/></g><g fill="var(--accent)" fill-opacity="0.15" stroke="var(--accent)" stroke-width="1.5"><rect x="190" y="120" width="160" height="60" rx="8"/><rect x="390" y="120" width="160" height="60" rx="8"/></g><g fill="currentColor" text-anchor="middle" font-size="13"><text x="80" y="46">1. Ignition boot</text><text x="80" y="64" fill="var(--muted)">RHCOS image</text><text x="270" y="46">2. Bootstrap</text><text x="270" y="64" fill="var(--muted)">temporary control plane</text><text x="470" y="46">3. Masters</text><text x="470" y="64" fill="var(--muted)">join, etcd</text><text x="670" y="46">4. Bootstrap removed</text><text x="670" y="64" fill="var(--muted)">the cluster is autonomous</text><text x="270" y="146">CVO</text><text x="270" y="164" fill="var(--muted)">deploys the operators</text><text x="470" y="146">Workers</text><text x="470" y="164" fill="var(--muted)">join (CSRs to approve)</text></g><g stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#ar3)"><path d="M150 50 H188"/><path d="M350 50 H388"/><path d="M550 50 H588"/><path d="M270 80 V118"/><path d="M470 80 V118"/></g></svg>' },
        { t: 'bullets', frag: true, items: [
          'Nodes fetch their Ignition from the <b>Machine Config Server</b> (22623) and the bootstrap first hosts the temporary API.',
          'The <b>CVO</b> (module 02) then deploys the Cluster Operators: this is the longest phase.',
          'Typical duration: on the order of 30 to 60 min depending on the infrastructure and the bandwidth to the images (adjust).'
        ] }
      ]
    },
    {
      title: 'Following the installation and approving CSRs',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ export KUBECONFIG=ocp4/auth/kubeconfig\n$ openshift-install wait-for bootstrap-complete --dir ocp4 --log-level=debug\n$ openshift-install wait-for install-complete  --dir ocp4\n\n# Workers only appear after the CSRs are approved\n$ oc get csr | grep Pending\n$ oc get csr -o go-template='{{range .items}}{{if not .status}}{{.metadata.name}}{{\"\\n\"}}{{end}}{{end}}' \\\n    | xargs oc adm certificate approve" },
        { t: 'bullets', items: [
          '<b>Two waves</b> of CSRs per node: the client one (kubelet-bootstrap), then the serving one.',
          'With <b>IPI/Machine API</b>, approval is automatic. With <b>UPI</b>, it is up to you. With <b>Agent-based</b>, the behavior for hosts installed by the Agent: to be verified in the installation docs; for a node <b>added later</b> with the ISO, manual CSR approval is documented.',
          'If it gets stuck: <code>openshift-install gather bootstrap</code> (UPI/IPI) or <code>oc adm must-gather</code> on an already live cluster.'
        ] },
        { t: 'callout', kind: 'tip', wide: true, html: "A worker missing from <code>oc get nodes</code> in UPI is almost always <b>a CSR in Pending</b>. Remember to rerun the command once the first wave is approved: the second one appears afterwards." }
      ]
    },
    {
      title: 'Disconnected: the mirror registry',
      blocks: [
        { t: 'text', html: "<p>A cluster without Internet access must pull <b>all</b> its images (platform, operators, your apps) from an <b>internal registry</b>. So you first need to <b>mirror</b> the content.</p>" },
        { t: 'flow', nodes: [
          { label: 'Internet', sub: 'registry.redhat.io, quay.io' },
          { label: 'Connected workstation', sub: 'oc-mirror', hl: true },
          { label: 'Disk / media', sub: 'transfer (air gap)' },
          { label: 'Mirror registry', sub: 'inside your network', hl: true },
          { label: 'Cluster', sub: 'pulls via IDMS/ITMS' }
        ], caption: 'If the mirroring workstation sees the Internet <b>and</b> the mirror: a single hop (mirror-to-mirror). Otherwise: mirror-to-disk, transfer, disk-to-mirror.' },
        { t: 'bullets', frag: true, items: [
          'Registry: <b>mirror registry for Red Hat OpenShift</b> (small Quay registry provided by Red Hat), or Quay, Harbor, Artifactory… (support depends on your choice: to be verified).',
          'It must support <b>multi-arch / OCI manifests</b> and be reachable by all nodes, with a trusted certificate.',
          'Sizing: several tens to hundreds of GB depending on the mirrored operators.'
        ] },
        { t: 'callout', kind: 'onprem', html: "The mirror registry is a <b>critical service</b>: installations, updates and image rescheduling all depend on its availability. Back it up (module 11) and monitor it." }
      ]
    },
    {
      title: 'Disconnected: ImageSetConfiguration',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'imageset-config.yaml', code: `kind: ImageSetConfiguration
apiVersion: mirror.openshift.io/v2alpha1   # v1alpha2 for oc-mirror v1
mirror:
  platform:
    channels:
    - name: stable-4.20
      minVersion: 4.20.0           # versions to adapt
      maxVersion: 4.20.2
  operators:
  - catalog: registry.redhat.io/redhat/redhat-operator-index:v4.20
    packages:
    - name: lvms-operator
  additionalImages:
  - name: registry.redhat.io/ubi9/ubi:latest` },
        { t: 'bullets', items: [
          '<b>platform</b>: the OCP release (channel + version range); for an EUS update, plan all the necessary intermediate versions (module 12).',
          '<b>operators</b>: select <b>only</b> the useful packages: a whole catalog is huge.',
          '<b>additionalImages</b>: your base images, tooling images, etc.'
        ] },
        { t: 'callout', kind: 'warn', wide: true, html: "<b>oc-mirror v2</b> has been GA since 4.18 (v1 deprecated) and <code>v2alpha1</code> is the <code>apiVersion</code> to use; available <code>ImageSetConfiguration</code> fields: re-read the 4.20 docs." }
      ]
    },
    {
      title: 'Disconnected: running oc-mirror, applying IDMS and ITMS',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: "# 1. Mirror to a disk (connected workstation)\n$ oc-mirror --v2 -c imageset-config.yaml file:///data/mirror\n\n# 2. After transfer: disk -> mirror registry\n$ oc-mirror --v2 -c imageset-config.yaml --from file:///data/mirror docker://registry.example.com:8443\n\n# 3. Resources generated for the cluster\n$ ls /data/mirror/working-dir/cluster-resources/\n$ oc apply -f /data/mirror/working-dir/cluster-resources/" },
        { t: 'table', head: ['Resource', 'Role'], rows: [
          ['<code>ImageDigestMirrorSet</code> (IDMS)', 'Redirects pulls <b>by digest</b> to the mirror'],
          ['<code>ImageTagMirrorSet</code> (ITMS)', 'Redirects pulls <b>by tag</b> to the mirror'],
          ['<code>CatalogSource</code>', 'Exposes the mirrored catalog to OLM (module 04)'],
          ['<code>ClusterCatalog</code>', 'Mirrored catalog for OLM v1 (module 04)'],
          ['<code>UpdateService</code>', 'Local update service (update graph, module 12)'],
          ['<code>ImageContentSourcePolicy</code> (ICSP)', 'Old mechanism, <b>deprecated</b> in favor of IDMS/ITMS']
        ] },
        { t: 'callout', kind: 'warn', html: "<code>--v2</code> must be specified explicitly; <code>--workspace</code> is required in mirror-to-mirror. <code>--from</code> option (disk-to-mirror): re-read the 4.20 <code>oc-mirror</code> docs. Before the real run, use the <code>--dry-run</code> option if it exists in your version." }
      ]
    },
    {
      title: 'Disconnected: pull secret, CA and default sources',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: "# Add the mirror credentials to the pull secret\n$ podman login --authfile ./pull-secret.json registry.example.com:8443\n# => pull-secret.json now also contains the mirror\n\n# Disable the default catalogs (unreachable offline)\n$ oc patch OperatorHub cluster --type json \\\n    -p '[{\"op\":\"add\",\"path\":\"/spec/disableAllDefaultSources\",\"value\":true}]'" },
        { t: 'bullets', items: [
          'The installation <b>pull secret</b> contains the mirror credentials (in addition to or instead of Red Hat\'s).',
          '<code>additionalTrustBundle</code> in <code>install-config.yaml</code>: the registry <b>CA</b>, so that the nodes trust it.',
          'IDMS/ITMS are either generated at installation from <code>imageDigestSources</code> in <code>install-config.yaml</code> (name since 4.14; the old <code>imageContentSources</code> is deprecated), or applied afterwards.',
          'Using mirrored catalogs (<code>CatalogSource</code>, OLM): module 04.'
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: "A disconnected cluster shows <b>empty OperatorHubs</b> and pods in <code>ImagePullBackOff</code> as long as the default catalogs try to reach the Internet or the IDMS are missing. Also check that your <b>application images</b> are mirrored (<code>additionalImages</code>)." }
      ]
    },
    {
      title: 'Post-installation checks',
      blocks: [
        { t: 'cmds', items: [
          ['oc get clusterversion', 'Version, progress, Available=True?'],
          ['oc get co', 'All Cluster Operators Available / not Degraded?'],
          ['oc get nodes -o wide', 'All nodes Ready, expected roles and IPs?'],
          ['oc get csr | grep Pending', 'No CSR left pending?'],
          ['oc get mcp', 'Pools up to date (UPDATED=True, DEGRADED=False)?'],
          ['oc get pods -A | grep -v -E "Running|Completed"', 'Pods in error after installation'],
          ['oc whoami --show-console', 'Console URL'],
          ['oc get co ingress', 'Ingress Cluster Operator Available? (the router answers)'],
          ['curl -kI https://$(oc get route console -n openshift-console -o jsonpath=\'{.spec.host}\')', 'The console answers over HTTPS: validates the wildcard DNS and the Ingress LB']
        ] },
        { t: 'bullets', frag: true, items: [
          'Retrieve the <code>kubeadmin</code> password from <code>auth/kubeadmin-password</code>; replace it with a real IdP (module 06), then delete it.',
          'Back up etcd <b>right away</b> (module 11) and keep the installation folder (<code>auth/</code>, <code>metadata.json</code>).',
          'Replace the API and Ingress certificates (module 04).'
        ] }
      ]
    },
    {
      title: 'Classic mistakes',
      tag: 'pitfalls',
      blocks: [
        { t: 'cards', items: [
          { front: 'Install stuck at 80-90%', back: '<b>Wildcard *.apps</b> missing or Ingress LB misconfigured.' },
          { front: 'Bootstrap not progressing', back: 'Port <b>22623</b> closed or LB misconfigured; clock skew (certificates).' },
          { front: 'Workers missing', back: '<b>CSRs in Pending</b> (UPI; node added later; Agent-based: to be verified).' },
          { front: 'ImagePullBackOff everywhere', back: 'Pull secret without the mirror, <b>CA not provided</b> or IDMS missing.' },
          { front: 'Install-config lost', back: 'The file is <b>consumed</b>: back it up before <code>create</code>.' },
          { front: 'VIPs floating badly', back: 'VIP outside the <b>machineNetwork</b>, or IP conflict on the subnet.' }
        ] },
        { t: 'callout', kind: 'tip', html: "When an installation gets stuck, <b>read the log</b> (<code>.openshift_install.log</code> in the installation folder, or <code>oc get co</code> / <code>oc get events -A</code>) before relaunching everything." }
      ]
    },
    {
      title: 'Quiz',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'UPI installation: <code>wait-for bootstrap-complete</code> passes, but <code>install-complete</code> never finishes; the console is unreachable. What is the most likely cause?', options: ['Port 6443 is closed', 'The <code>*.apps</code> wildcard DNS record or the Ingress LB is missing or incorrect', 'The pull secret has expired', 'The bootstrap was not removed'], answer: 1, explain: 'The bootstrap passes, so the API (6443) and the MCS (22623) work. The console, OAuth and the registry go through Ingress: without the wildcard or the Ingress LB, the operators concerned stay unavailable.' },
        { t: 'quiz', q: 'Disconnected cluster: the images are mirrored, but the manifests still reference <code>quay.io/...</code>. How do the nodes pull from the mirror?', options: ['Via the <code>ImageDigestMirrorSet</code> / <code>ImageTagMirrorSet</code> resources', 'You have to modify every Deployment', 'A transparent proxy is mandatory', 'By overriding /etc/hosts on each node'], answer: 0, explain: 'IDMS and ITMS redirect pulls (by digest and by tag) to the mirror at runtime level; workloads are not modified. ICSP is the old mechanism (deprecated).' },
        { t: 'quiz', q: 'After a UPI installation, a worker does not appear in <code>oc get nodes</code>. First reflex?', options: ['Restart the bootstrap', 'Recreate the cluster', 'Look at <code>oc get csr</code> and approve the Pending requests', 'Modify the worker MachineConfigPool'], answer: 2, explain: 'Without the Machine API, the kubelet CSRs (client, then serving) are not auto-approved: you have to approve them by hand, in two waves.' }
      ]
    },
    {
      title: 'Lab: prepare a SNO installation',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'Write install-config and agent-config, generate the manifests', goal: 'Core during the session: workstation only, no cluster. The (bonus) steps require a lab cluster.', steps: [
          'Prerequisites: a Linux workstation with <code>openshift-install</code> and <code>oc</code> (those from module 00); E0 is enough for the core, E1 for the bonus steps.',
          'Create a <code>sno/</code> folder and write <code>install-config.yaml</code>: <code>controlPlane.replicas: 1</code>, <code>compute.replicas: 0</code>, <code>platform: none: {}</code>, your pull secret, your SSH key.',
          'Write <code>agent-config.yaml</code>: one host, a static IP, a default route, a DNS; set <code>rendezvousIP</code> to that IP.',
          'Make a <b>backup copy</b> of both files outside the folder (they will be consumed).',
          'Generate the manifests: <code>openshift-install agent create cluster-manifests --dir sno</code>; list the contents of <code>sno/cluster-manifests/</code>.',
          'Re-read the generated manifests: where do you find your pull secret, your SSH key and your network? Which file describes the host?',
          'Check your fictional DNS: write the three records (<code>api</code>, <code>api-int</code>, <code>*.apps</code>) for your SNO and explain why they all point to the same IP.',
          '(bonus) On the module 00 cluster: <code>oc get clusterversion -o yaml</code>; find the version history and the conditions.',
          '(bonus) Write a minimal <code>ImageSetConfiguration</code> (one release, one operator package) and run <code>oc-mirror</code> as a simulation (<code>--dry-run --v2</code>); estimate the volume to transfer. Prerequisites: network access to registry.redhat.io and quay.io from the workstation, and a <b>real Red Hat pull secret</b> (module 00).'
        ] }
      ]
    }
  ],
  takeaways: [
    'Four methods (Agent-based, Assisted, IPI, UPI): the choice depends on the platform (baremetal, vsphere, none) and on what you want to drive.',
    'DNS (api, api-int, *.apps), LB or VIPs, NTP: prepared <b>before</b>. The forgotten wildcard is the #1 failure.',
    '<code>install-config.yaml</code> (and <code>agent-config.yaml</code>) describes everything; the installer consumes it: make a copy.',
    'In UPI, you approve the CSRs and remove the bootstrap yourself (nodes added later with the ISO: CSRs to approve; hosts installed by the Agent: to be verified).',
    'Disconnected = mirror registry + <code>oc-mirror</code> + IDMS/ITMS + CA and pull secret; oc-mirror v2 (GA since 4.18) with <code>ImageSetConfiguration</code> in <code>v2alpha1</code>.',
    'After the installation: validate (<code>oc get co</code>), back up etcd, replace kubeadmin and the certificates.'
  ]
});
