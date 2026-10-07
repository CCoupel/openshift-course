COURSE.add({
  id: 'm00', lang: 'en', num: 0, emoji: '🧪',
  title: 'Lab environment',
  source: '2433291db1c5',
  tagline: 'Before day 1: a solid cluster, the right tools, and the certainty of knowing which lab needs what.',
  duration: '≈ 30 min',
  objectives: [
    'Choose an environment level (E0 to E3) suited to the labs you want to do',
    'Set up a lab cluster: OpenShift Local, SNO or compact, with the on-prem options',
    'Prepare your workstation: tools, pull secret, DNS, resources',
    'Check the cluster health and know how to log in as an administrator',
    'Back up and reset your lab without losing a day'
  ],
  slides: [
    {
      title: 'Why a module 00?',
      blocks: [
        { t: 'text', html: "<p>The course is <b>hands-on</b>: every module ends with a lab on a real cluster. A lab blocked by a badly prepared environment costs more than a failed presentation. This module is <b>outside the sessions</b>: do it <b>before day 1</b>, at your own pace.</p>" },
        { t: 'bullets', frag: true, items: [
          '<b>Goal</b>: arrive on day 1 with a healthy cluster, <code>cluster-admin</code> in hand, and the tools installed.',
          '<b>This module is not</b> the installation course: the <b>how</b> of an installation (methods, DNS, LB, disconnected) is in <b>module 03</b>.',
          'It tells you <b>what to aim for</b> (environment level) and <b>how to get started fast</b> with a lab cluster.'
        ] },
        { t: 'callout', kind: 'tip', html: "Allow <b>2 to 3 hours</b> the first time (downloads, installation, checks). Don't do it the day before day 1." }
      ]
    },
    {
      title: 'Four environment levels',
      blocks: [
        { t: 'table', head: ['Level', 'Environment', 'What it allows', 'Limits'], rows: [
          ['<b>E0</b>', 'Workstation only, or <b>OpenShift Local</b>, or any cluster as <code>cluster-admin</code>', '<code>oc</code>, RBAC, htpasswd IdP, light Operators, GitOps', 'Single node, Machine API not usable (<code>none</code> platform), no updates; monitoring disabled by default (to be verified)'],
          ['<b>E1</b>', '<b>SNO</b> (single node) on KVM, vSphere or bare metal', 'MachineConfig with reboot, LVMS, monitoring and logging, etcd backup, updates', 'No real etcd quorum, no ODF; official minimum 8 vCPU / 16 GB / 120 GB'],
          ['<b>E2</b>', '3-node <b>compact</b> (or 3 masters + 2 workers)', 'etcd quorum, MachineHealthCheck, ODF, MetalLB, EgressIP, rolling update', 'Uses a lot of resources'],
          ['<b>E3</b>', 'Bare metal or nested virtualization', 'OpenShift Virtualization (VMs, live migration)', 'Nested virtualization: acceptable in a lab, not in production (to be verified)']
        ] },
        { t: 'callout', kind: 'tip', html: "Recommendation: a <b>well-sized SNO (E1)</b> covers almost the whole course. Add a compact cluster (E2) only if you want the bonus steps that require it." }
      ]
    },
    {
      title: 'Which lab needs which level?',
      tag: 'reference',
      blocks: [
        { t: 'table', head: ['Core level', 'Modules', 'Bonus / remark'], rows: [
          ['<b>Workstation</b> (E0 is enough)', '03 Installation', 'Bonus: E1 (cluster) and network access for <code>oc-mirror</code>'],
          ['<b>E0</b> (OpenShift Local or any cluster)', '01 K8s vs OCP, 06 HBAC / RBAC (E0 or E1)', '—'],
          ['<b>E1</b> (SNO)', '02 Architecture, 04 Configuration, 08 Storage (LVMS or CSI StorageClass), 05 Monitoring (user workload monitoring, alert rule, Alertmanager receiver), 07 Networking (Route, deny-all NetworkPolicy and opening), 09 Advanced security (dedicated SCC, Compliance Operator; day-3 safety-valve lab), 10 CI/CD & GitOps (E0 or E1 + reachable Git repository: OpenShift GitOps, Application, drift and selfHeal), 11 Backup & DR (non-destructive etcd backup, export, reading the archive, installing OADP), 12 Day-2 operations (update status, must-gather, quotas, drain), 13 Virtualization & Serverless (Serverless part: Knative service, scale-to-zero, traffic splitting)', 'Bonus: 02 MachineConfig <code>/etc/motd</code> (reboots the SNO), 04 Ingress certificate (disposable cluster), console banner and OLM v1, 05 monitoring PVC, 07 EgressFirewall, MetalLB L2 (free IP range), UDN, EgressIP (E2 preferred), NMState (disposable cluster), 05 LokiStack on S3 (MinIO) and ClusterLogForwarder, syslog output, 08 trigger a PVC error, 09 reading the scan, 10 app-of-apps, minimal ClusterRole for Argo CD, ApplicationSet on two clusters (E2), 11 OADP with S3 bucket (MinIO), etcd restore (DISPOSABLE cluster only), 12 real minor update (disposable E1 or E2), pausing a pool and adding a node (E2), PSA warn/audit, etcd encryption (disposable cluster), File Integrity'],
          ['<b>E1</b> (read-only)', '14 Best practices (auditing a cluster with the checklist, without changing anything)', 'Bonus: go / no-go on a fictional cluster (no cluster needed); review of <code>Subscription</code>s (E1, read-only)'],
          ['<b>No lab</b>', '15 Cheat sheet & final quiz (cards, decisions, quiz: no cluster required)', 'No lab: exception provided for by the course conventions'],
          ['<b>E2</b> (compact)', 'Bonus steps: EgressIP (07, preferably multi-node); 12: pausing a pool and adding a node; no lab requires it for its core', 'Bonus steps only'],
          ['<b>E3</b> (bare metal)', '13 Virtualization & Serverless: VM part (installing OpenShift Virtualization, VMs, console and virtctl) as an E3 bonus', 'Live migration: multi-node E3 with RWX storage; MTV migration: test vCenter; the module core stays on E1 (Serverless)']
        ] },
        { t: 'callout', kind: 'warn', html: "This matrix reflects the <b>current</b> labs of the written modules (module 15 has no lab). Each lab states its level in its <b>first step</b>; if they differ, the lab is authoritative." }
      ]
    },
    {
      title: 'Concrete on-prem options',
      blocks: [
        { t: 'table', head: ['Option', 'Who it is for', 'Allows', 'Does not allow / watch out'], rows: [
          ['<b>OpenShift Local</b> (formerly CRC)', 'Personal workstation, E0', 'Single-node cluster, quick to launch', 'No updates or Machine API; <code>openshift</code> preset: 4 physical cores, 10.5 GB of free RAM, 35 GB of disk'],
          ['<b>SNO on KVM / vSphere</b>', 'Workstation or lab server, E1', 'Almost all the labs of the course', 'Installation to do (module 03); resources to plan'],
          ['<b>SNO / compact on bare metal</b>', 'If you have hardware, E1 to E3', 'Closest to production', 'Hardware and network are on you'],
          ['<b>3-node compact</b> (VMs)', 'E2 bonus steps', 'Quorum, MHC, ODF', 'RAM and disk ×3'],
          ['<b>OKD</b>', 'Community alternative', 'Same OCP foundation without Red Hat support', 'Possible behavior differences (OS base: CentOS Stream CoreOS since OKD 4.16)'],
          ['<b>Developer Sandbox</b> ☁️', 'Discovering the console', 'Console and <code>oc</code> in a shared space', '<b>No cluster administrator access (to be verified)</b>: unsuitable for this course; shared cluster, limited quotas (≈ 3 cores / 14 GB / 40 GB, 30-day trial: dated figures, cross-check)']
        ] },
        { t: 'callout', kind: 'cloud', html: "The Developer Sandbox is a shared cluster: no cluster administration rights (to be verified). Managed offerings (ROSA, ARO, OSD) give <code>cluster-admin</code> or <code>dedicated-admin</code> access depending on the offering, but <b>block or delegate</b> some actions (nodes, MachineConfig, etcd: details depend on the offering) to the provider and fall outside the on-prem scope of this course. For the labs, choose an environment that is <b>yours</b>." }
      ]
    },
    {
      title: 'OpenShift Local: get started in a few commands',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: "# After downloading crc and the pull secret (console.redhat.com)\n$ crc setup\n$ crc start -p pull-secret.txt\n\n# Command-line and console access\n$ eval $(crc oc-env)\n$ crc console --credentials     # kubeadmin and developer users\n$ crc console\n\n# Life cycle\n$ crc status\n$ crc stop\n$ crc delete                    # starts from scratch" },
        { t: 'bullets', items: [
          'The <code>crc setup</code> and <code>crc start</code> commands prepare the local hypervisor, then launch the cluster.',
          'You get two accounts: <code>kubeadmin</code> (temporary <code>cluster-admin</code>) and <code>developer</code>.',
          'Monitoring is disabled by default (to enable it: <code>crc config set enable-cluster-monitoring true</code>, with at least 14 GiB of memory).'
        ] },
        { t: 'callout', kind: 'warn', wide: true, html: "The resources of the <code>openshift</code> preset (4 physical cores, 10.5 GB of free RAM, 35 GB) come from the current documentation; supported systems and <code>crc config</code> options: <b>to be verified in the OpenShift Local documentation</b> for your version." }
      ]
    },
    {
      title: 'SNO: the fast track',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Pull secret', sub: 'console.redhat.com' },
          { label: 'Lab DNS', sub: 'api and *.apps' },
          { label: 'Machine / VM', sub: 'CPU, RAM, disk' },
          { label: 'Assisted or Agent', sub: 'discovery ISO', hl: true },
          { label: 'SNO cluster', sub: 'oc get co' }
        ], caption: 'The details (<code>install-config.yaml</code>, <code>agent-config.yaml</code>, walkthrough) are in <b>module 03</b>; here, what you need to be ready.' },
        { t: 'bullets', frag: true, items: [
          '<b>Assisted Installer</b> (console.redhat.com): the fastest for a first SNO; you boot the machine on the provided ISO and follow the installation in the interface.',
          '<b>Agent-based</b>: same result, prepared locally (useful offline), see module 03.',
          'A SNO <b>is</b> its own control plane: a reboot interrupts everything, including the API (module 02).'
        ] },
        { t: 'callout', kind: 'onprem', html: "On KVM or vSphere, a well-sized SNO VM is the most convenient environment: easy snapshots, clones and resets (see the slide on backups)." }
      ]
    },
    {
      title: 'Trial license and pull secret',
      layout: 'two',
      blocks: [
        { t: 'bullets', frag: true, items: [
          'A <b>60-day trial</b> (self-support, a Red Hat account is enough) is offered via console.redhat.com; exact terms: to be verified when you subscribe.',
          'The <b>pull secret</b> (Red Hat account) is required to install and pull the platform images: download it from the console.',
          'Mind the <b>expiry date</b>: after the trial, the cluster keeps running but is no longer supported and may stop receiving updates.'
        ] },
        { t: 'callout', kind: 'trap', html: "The pull secret is a <b>secret</b>: never <b>commit</b> it to Git (even a private repository), don't paste it into a ticket. Keep it <code>chmod 600</code> outside your lab repository." },
        { t: 'callout', kind: 'tip', html: "Keep the <b>subscription ID</b> and the trial end date somewhere: a forgotten lab cluster that loses its license is a classic." }
      ]
    },
    {
      title: 'Sizing your lab machine',
      blocks: [
        { t: 'table', head: ['Environment', 'vCPU', 'RAM', 'Disk'], rows: [
          ['Minimal SNO (official minimum 4.20)', '8', '16 GB', '120 GB'],
          ['<b>Recommended</b> SNO for the whole course', '16', '48 to 64 GB', '≥ 200 GB (to adjust)'],
          ['3-node compact (minimum per control plane)', '3 × 4', '3 × 16 GB', '3 × 100 GB'],
          ['OpenShift Local (<code>openshift</code> preset)', '4 physical cores', '10.5 GB of free RAM', '35 GB']
        ] },
        { t: 'bullets', items: [
          'The <b>minimums</b> above are orders of magnitude: check the 4.20 documentation for your version.',
          'Logging, virtualization and ODF multiply the needs: leave some headroom.',
          '<b>Fast</b> disk (SSD/NVMe): etcd latency determines the cluster stability (module 08).'
        ] },
        { t: 'callout', kind: 'warn', html: "An undersized SNO doesn't crash outright: it becomes <b>slow and unstable</b> (Degraded operators, pending pods), which looks like a bug in the course when it's really a lack of resources." }
      ]
    },
    {
      title: 'Lab network and DNS',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          'Two names to resolve: <code>api.&lt;cluster&gt;.&lt;domain&gt;</code> and the wildcard <code>*.apps.&lt;cluster&gt;.&lt;domain&gt;</code>, which point to the node IP for a SNO.',
          'DNS must resolve <b>from your workstation</b> and <b>from the cluster</b>; a simple <code>/etc/hosts</code> file does not cover the wildcard.',
          'Plan for outbound access to the Internet (or a mirror) for the images; when disconnected: module 03.'
        ] },
        { t: 'code', lang: 'bash', file: 'dnsmasq.conf (lab example)', code: "# Lab domain: ocp4.lab.example.com, SNO on 192.168.100.10\nhost-record=api.ocp4.lab.example.com,192.168.100.10\nhost-record=api-int.ocp4.lab.example.com,192.168.100.10\naddress=/apps.ocp4.lab.example.com/192.168.100.10   # wildcard *.apps" },
        { t: 'callout', kind: 'trap', wide: true, html: "A forgotten <code>*.apps</code> wildcard is the #1 lab failure: the installation seems to progress, then the console stays unreachable (module 03). Test with <code>dig +short test.apps.&lt;cluster&gt;.&lt;domain&gt;</code> before moving on." }
      ]
    },
    {
      title: 'Your workstation: the tools',
      blocks: [
        { t: 'cmds', items: [
          ['oc version --client', 'OpenShift client (includes a copy of <code>kubectl</code>)'],
          ['openshift-install version', 'Installation program (module 03)'],
          ['oc-mirror version', 'Image mirroring for disconnected installations (syntax and version: to be verified)'],
          ['butane --version', 'MachineConfig in readable YAML (module 04)'],
          ['jq --version', 'JSON reading (pull secret, <code>oc -o json</code> output)'],
          ['podman --version', 'Containers and registry authentication']
        ] },
        { t: 'bullets', items: [
          'Get <code>oc</code> and <code>openshift-install</code> from the Red Hat console or the official mirror; take a version <b>close to 4.20</b> (the docs warn that an <code>oc</code> too different from the cluster may not access all of its features).',
          'System: Linux (or WSL) recommended; macOS possible for <code>oc</code>.',
          'Also add <code>openssl</code> for the certificate labs (module 04).'
        ] },
        { t: 'callout', kind: 'tip', html: "Write down the <b>exact versions</b> of your tools on day one: a version gap between <code>oc</code>, <code>openshift-install</code> and the cluster is a source of surprising behavior." }
      ]
    },
    {
      title: 'Lab health and administrator access',
      blocks: [
        { t: 'cmds', items: [
          ['oc login -u kubeadmin https://api.<cluster>:6443', 'Log in with <code>kubeadmin</code>, or <code>KUBECONFIG</code> pointing to the installation kubeconfig; <code>--web</code> assumes an identity provider (to be verified depending on your <code>oc</code> version)'],
          ['oc whoami --show-server', 'Checks the targeted server'],
          ['oc get clusterversion', 'Version and Available=True'],
          ['oc get nodes', 'All nodes Ready'],
          ['oc get co', 'Cluster Operators: Available, not Degraded'],
          ['oc whoami --show-console', 'Web console URL']
        ] },
        { t: 'bullets', frag: true, items: [
          '<b>kubeadmin</b>: temporary account created at installation, <code>cluster-admin</code>; its password is in the installation folder (<code>auth/kubeadmin-password</code> with <code>openshift-install</code>; with OpenShift Local: <code>crc console --credentials</code>; with Assisted Installer: displayed at the end of the installation). To be replaced by an IdP in module 06; in your lab, keep it until module 06 is done.',
          '<b>Break-glass</b>: the installer <code>kubeconfig</code> (<code>auth/kubeconfig</code>) gives admin access without going through OAuth: <b>keep it</b> outside your repository.',
          'A healthy cluster means <b>all operators Available</b> before starting a lab.'
        ] },
        { t: 'callout', kind: 'warn', html: "A <b>Degraded</b> operator before the lab is a state to understand (<code>oc describe co NAME</code>), not to ignore: it would skew the lab results." }
      ]
    },
    {
      title: 'Back up and reset',
      tag: 'safety net',
      blocks: [
        { t: 'table', head: ['Method', 'Advantage', 'Limit'], rows: [
          ['<b>VM snapshot</b> (SNO on KVM / vSphere)', 'Full rollback in a few minutes', 'After a restore, the clock and certificates may cause problems (to be verified)'],
          ['<b>etcd backup</b>', 'Official, scripted procedure', 'Does not back up everything (module 11)'],
          ['<b>Recreate the cluster</b>', 'Guaranteed clean environment', 'Several tens of minutes to several hours'],
          ['<b><code>crc delete</code></b> then <code>crc start</code> (OpenShift Local)', 'Quick reset', 'Loses all lab content']
        ] },
        { t: 'bullets', items: [
          'Take a <b>snapshot right after a healthy installation</b> (“clean state”) and before any risky lab (MachineConfig, certificates).',
          'A cluster stopped for a long time may have <b>expired certificates</b> at restart (up to a year after installation; first rotation at 24 h): approve the pending CSRs then; it is one of the reasons not to let a lab sleep for months (module 12).'
        ] },
        { t: 'callout', kind: 'tip', html: "Before a destructive lab (module 04: Ingress certificate, module 11: etcd restore), <b>go back</b> to your “clean” snapshot rather than chaining experiments on a weakened cluster." }
      ]
    },
    {
      title: 'Classic mistakes and time to allow',
      tag: 'pitfalls',
      blocks: [
        { t: 'cards', items: [
          { front: 'Lab “broken” from the start', back: '<b>Insufficient RAM or CPU</b>: Degraded operators, Pending pods.' },
          { front: 'Console unreachable', back: 'Missing <code>*.apps</code> <b>wildcard DNS</b> (module 03).' },
          { front: 'I don\'t have cluster-admin', back: '<b>Sandbox</b>: shared cluster, no cluster administration rights (to be verified). Managed: <code>cluster-admin</code> or <code>dedicated-admin</code> depending on the offering, some actions blocked or delegated to the provider. Take an environment of your own.' },
          { front: 'Pull secret in Git', back: 'Download it again from the Red Hat console; in case of a leak, contact Red Hat support; never commit it.' },
          { front: 'Dormant lab', back: 'Expired license or outdated <b>certificates</b>: maintenance plan.' },
          { front: 'Version mismatch', back: '<code>oc</code> or installer of a different version than the cluster: surprising behavior.' }
        ] },
        { t: 'callout', kind: 'tip', html: "Time to allow (orders of magnitude, adjust to your machine and bandwidth): tools and pull secret <b>≈ 30 min</b>, OpenShift Local <b>≈ 1 h</b> the first time, SNO via Assisted Installer <b>≈ 1 h to 2 h</b>." }
      ]
    },
    {
      title: 'Quiz',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'What is the minimum environment level for the core of the module 04 lab (chrony MachineConfig with reboot, Operator with manual approval)?', options: ['The workstation alone, with no cluster (E0)', 'A SNO (E1) with <code>cluster-admin</code>', 'A 3-node compact cluster (E2), mandatory', 'A bare-metal cluster for virtualization (E3)'], answer: 1, explain: 'A SNO (E1) allows MachineConfig with reboot and Operator installation. The compact cluster (E2) is only useful for bonus steps planned in the course; E3 only concerns virtualization (module 13).' },
        { t: 'quiz', q: 'Before starting a lab, what is the basic cluster health check?', options: ['<code>oc get pods -A</code> and check that there are pods', 'Just open the web console', '<code>oc whoami</code>', '<code>oc get co</code> and <code>oc get nodes</code>: operators Available and not Degraded, nodes Ready'], answer: 3, explain: 'Cluster Operators summarize the platform health. A Degraded operator before the lab skews its results: understand it (<code>oc describe co NAME</code>) before moving on.' }
      ]
    },
    {
      title: 'Lab: prepare your cluster',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'Tools, pull secret, healthy lab cluster', goal: 'Self-paced preparation lab, before day 1 (not counted in the session budget). Core: E0 (workstation and, if possible, OpenShift Local or an existing cluster).', steps: [
          'Prerequisites: a Linux workstation (or WSL) or macOS with Internet access and a Red Hat account; E0 is enough for the core, E1 for the bonus.',
          'Check your workstation resources (<code>nproc</code>, <code>free -h</code>, <code>df -h</code>) and compare them to the needs of the chosen environment (slide “Sizing”); note what is missing.',
          'Install the tools (<code>oc</code>, <code>openshift-install</code>, <code>oc-mirror</code>, <code>butane</code>, <code>jq</code>, <code>podman</code>, <code>openssl</code>) and note their versions with the commands from the slide “Your workstation”.',
          'Download your pull secret from the Red Hat console, set it to <code>chmod 600</code> outside any Git repository.',
          'Start a lab cluster (OpenShift Local with <code>crc setup</code> and <code>crc start</code>, or connect to the cluster you already have) then run <code>oc whoami --show-server</code>, <code>oc get clusterversion</code>, <code>oc get nodes</code> and <code>oc get co</code>.',
          'Check that all operators are <i>Available</i> and not <i>Degraded</i>; if an operator is Degraded, read <code>oc describe co NAME</code> and note the cause.',
          'Find the console URL (<code>oc whoami --show-console</code>), log in as <code>kubeadmin</code> and locate the password or installation kubeconfig to keep.',
          '(bonus) Prepare a SNO (E1): <code>api</code> and <code>*.apps</code> DNS, pull secret, sized VM or machine; the installation itself is in module 03.',
          '(bonus) Once the SNO is healthy, take a “clean state” snapshot and note how you go back to that state.'
        ] }
      ]
    }
  ],
  takeaways: [
    'Four levels: E0 (workstation or OpenShift Local), E1 (SNO), E2 (compact), E3 (bare metal / virtualization); a well-sized SNO covers almost the whole course.',
    'Each lab states its level in its first step; the Developer Sandbox is a shared cluster with no cluster administration rights (to be verified); managed offerings give <code>cluster-admin</code> or <code>dedicated-admin</code> depending on the offering, but delegate some actions to the provider: take an environment of your own.',
    'Prepare before day 1: tools, pull secret (never in Git), <code>api</code> and <code>*.apps</code> DNS, enough resources.',
    'A healthy lab starts with <code>oc get co</code>: all Available, none Degraded.',
    '“Clean state” snapshot, <code>kubeadmin</code> and installation kubeconfig kept: the safety net of your lab.'
  ]
});
