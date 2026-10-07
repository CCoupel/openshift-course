COURSE.add({
  id: 'm09', lang: 'en', num: 9, emoji: '🛡️',
  title: 'Advanced security',
  source: '79213ef898d1',
  tagline: 'Beyond RBAC: what a pod is allowed to do (SCC, PSA), what you give it to run (images, secrets) and how to prove the cluster is compliant.',
  duration: '≈ 60 min + lab 20 min',
  objectives: [
    'Master SCCs: predefined SCCs, strategies, selection, creating a dedicated SCC',
    'Diagnose a rejected pod with <code>oc adm policy scc-subject-review</code> and events',
    'Combine SCC and Pod Security Admission (labels, synchronization, alerts)',
    'Choose an approach for signed images and secrets (External Secrets, Secrets Store CSI)',
    'Run a scan with the Compliance Operator and place the File Integrity Operator and ACS'
  ],
  slides: [
    {
      title: 'The security layers of a pod',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Image', sub: 'source, signature' },
          { label: 'Admission', sub: 'SCC + PSA', hl: true },
          { label: 'Runtime', sub: 'CRI-O, SELinux, seccomp' },
          { label: 'Secrets', sub: 'etcd, external' },
          { label: 'Compliance', sub: 'scans, integrity' }
        ], caption: 'RBAC (module 06) says <b>who</b> can create a pod; the <b>SCC</b> says <b>what that pod</b> is allowed to request.' },
        { t: 'bullets', frag: true, items: [
          '<b>Owner of SCCs</b>: this module. Modules 01, 06 and 08 only keep their usage and refer back here.',
          'Boundaries: RBAC and OAuth → module 06; enabling etcd encryption and registry sources → module 04; backup → module 11; NetworkPolicy → module 07.',
          'Reference version: <b>4.20 EUS</b>. Points whose status changes between 4.20 and 4.21 or 4.22 are dated.'
        ] },
        { t: 'callout', kind: 'k8s', html: "On K8s, you know PodSecurityPolicy (removed) then Pod Security Admission. OpenShift has had <b>its SCCs all along</b>, predating PSP, and adds PSA on top: the two coexist." }
      ]
    },
    {
      title: 'SCC: what a pod can request',
      blocks: [
        { t: 'text', html: "<p>A <b>SecurityContextConstraints</b> is a <b>cluster</b> object that describes a set of runtime rights: user, capabilities, volumes, host access, SELinux… When a pod is created, admission <b>picks an SCC</b> compatible with what the pod requests and with the rights of whoever creates it.</p>" },
        { t: 'table', head: ['What the SCC controls', 'Example fields'], rows: [
          ['Runtime identity', '<code>runAsUser</code>, <code>fsGroup</code>, <code>supplementalGroups</code>, <code>seLinuxContext</code>'],
          ['Privileges', '<code>allowPrivilegedContainer</code>, <code>allowedCapabilities</code>, <code>requiredDropCapabilities</code>'],
          ['Host access', '<code>allowHostNetwork</code>, <code>allowHostDirVolumePlugin</code> (hostPath), host PID/IPC'],
          ['Volume types', '<code>volumes</code> (allowlist)'],
          ['Who can use it', '<code>users</code>, <code>groups</code> (or, better, the RBAC verb <code>use</code>)']
        ] },
        { t: 'callout', kind: 'ocp', html: "The SCC <b>validates and mutates</b>: it can <b>assign</b> a namespace UID, an SELinux context, an <code>fsGroup</code>, dropped capabilities. This is what makes the random UID of <code>restricted-v2</code> possible." }
      ]
    },
    {
      title: 'The predefined SCCs',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['SCC', 'In brief'], rows: [
          ['<code>restricted-v2</code>', 'Default for authenticated users (the 4.20 docs say so in their table): non-root, capabilities dropped, <code>runtime/default</code> seccomp'],
          ['<code>restricted-v3</code>', 'Like <code>restricted-v2</code> but enforces a <b>user namespace</b> (<code>hostUsers: false</code>); new in 4.20. The 4.20 docs also describe it as “the most restrictive” and “used by default”: ambiguous wording to read in the docs; <code>restricted-v2</code> remains the one the table gives as default'],
          ['<code>nested-container</code>', 'Like <code>restricted-v2</code> with SELinux <code>container_engine_t</code>, <code>runAsUser: MustRunAsRange</code> and an enforced user namespace: run a container engine <b>inside</b> a pod (new in 4.20)'],
          ['<code>nonroot-v2</code>', 'Allows a fixed non-root UID (with capabilities dropped)'],
          ['<code>anyuid</code>', 'Restricted, but <b>any UID/GID</b> (including root)'],
          ['<code>nonroot</code>', 'Like <code>restricted</code> but any non-root UID (the pod or the image must provide it); <code>nonroot-v2</code> is its hardened version'],
          ['<code>hostnetwork</code> / <code>hostnetwork-v2</code>', 'Host network and ports, UID and SELinux still allocated to the namespace'],
          ['<code>hostaccess</code>, <code>hostmount-anyuid</code>', 'Access to all host namespaces; host mounts with any UID/GID'],
          ['<code>privileged</code>', 'Everything is allowed: host, privileges, any UID'],
          ['<code>node-exporter</code>', 'Reserved for the Prometheus node-exporter']
        ] },
        { t: 'callout', kind: 'warn', html: "<b>Never modify</b> the default SCCs: the docs warn that customizing them can cause problems for deploying platform pods or for updating. For a particular need, <b>create a dedicated SCC</b>." },
        { t: 'callout', kind: 'tip', html: "Full, up-to-date list: <code>oc get scc</code>. SCCs without a suffix (<code>restricted</code>, <code>nonroot</code>, <code>hostnetwork</code>…) are the original versions; their <code>-v2</code> variants harden them (capabilities dropped, seccomp). <code>restricted</code> denies all host access and requires UID and SELinux allocated to the namespace; it is no longer the default choice." }
      ]
    },
    {
      title: 'restricted-v2: what it changes for your image',
      blocks: [
        { t: 'bullets', frag: true, items: [
          '<b>Random UID</b> taken from the namespace range: the image must not depend on a fixed UID nor write to root-only folders.',
          '<b>All capabilities dropped</b>; only <code>NET_BIND_SERVICE</code> can be explicitly added.',
          '<b>seccomp</b>: <code>runtime/default</code> profile by default.',
          '<code>allowPrivilegeEscalation</code> must be unset or <code>false</code>.',
          '<b>SELinux</b>: an MCS label specific to the namespace (<code>s0:cX,cY</code>) isolates projects from each other.'
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "# Ranges assigned to the namespace\n$ oc get ns demo -o yaml | grep sa.scc\n#   openshift.io/sa.scc.mcs: s0:c26,c15\n#   openshift.io/sa.scc.supplemental-groups: 1000680000/10000\n#   openshift.io/sa.scc.uid-range: 1000680000/10000\n\n# SCC actually assigned to a pod\n$ oc get pod web-abc -o jsonpath='{.metadata.annotations.openshift\\.io/scc}'" },
        { t: 'callout', kind: 'trap', html: "The image must adapt to the SCC, <b>not the other way round</b>: port &gt; 1024, folders set to <code>g=u</code>, no hard-coded <code>USER</code>. This is the topic of pitfall #1 in module 01; here we see how to relax it cleanly when it is really necessary." }
      ]
    },
    {
      title: 'The strategies: MustRunAs, RunAsAny…',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Field', 'Available strategies'], rows: [
          ['<code>runAsUser</code>', '<code>MustRunAs</code>, <code>MustRunAsRange</code>, <code>MustRunAsNonRoot</code>, <code>RunAsAny</code>'],
          ['<code>seLinuxContext</code>', '<code>MustRunAs</code>, <code>RunAsAny</code>'],
          ['<code>fsGroup</code>', '<code>MustRunAs</code>, <code>RunAsAny</code>'],
          ['<code>supplementalGroups</code>', '<code>MustRunAs</code>, <code>RunAsAny</code>']
        ] },
        { t: 'bullets', items: [
          '<b>MustRunAs…</b>: the SCC <b>enforces</b> (or validates within) a value; if the pod doesn\'t request one, it assigns it.',
          '<b>MustRunAsRange</b>: the UID must fall in a range (the namespace\'s by default).',
          '<b>MustRunAsNonRoot</b>: any UID except 0, but the pod must provide one.',
          '<b>RunAsAny</b>: no constraint (this is what makes <code>anyuid</code> dangerous).'
        ] },
        { t: 'callout', kind: 'tip', wide: true, html: "When an image needs a <b>fixed non-root UID</b>, the right SCC is <code>nonroot-v2</code> (or a dedicated SCC with <code>MustRunAsNonRoot</code>), not <code>anyuid</code>." }
      ]
    },
    {
      title: 'How OCP chooses a pod\'s SCC',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Pod created', sub: 'by user or ServiceAccount' },
          { label: 'Usable SCCs', sub: '“use” right (module 06)' },
          { label: 'Sorting', sub: 'priority, then restrictiveness, then name', hl: true },
          { label: 'First one that validates', sub: 'openshift.io/scc annotation' }
        ], caption: 'SCCs are sorted: <b>highest priority</b> first; at equal priority, <b>from most to least restrictive</b>; otherwise by name.' },
        { t: 'bullets', frag: true, items: [
          'The <b>first</b> SCC in the list that admits the pod is selected and recorded in the <code>openshift.io/scc</code> annotation.',
          '<code>anyuid</code> has a <b>priority</b> (10 by default) whereas <code>restricted-v2</code> has none: a ServiceAccount allowed to use both gets <b><code>anyuid</code></b>. It doesn\'t force root, but an image without <code>USER</code> then runs <b>as root</b>: that is the danger.',
          'To <b>force</b> a specific SCC, annotate the workload with <code>openshift.io/required-scc</code>.'
        ] },
        { t: 'callout', kind: 'trap', html: "The same pod can <b>change SCC</b> if rights are granted or removed: the SCC is recomputed at pod creation, not at Deployment creation. Test with <code>scc-subject-review</code> (next slide)." }
      ]
    },
    {
      title: 'Diagnosing a rejected pod',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'root-pod.yaml', code: `apiVersion: v1
kind: Pod
metadata:
  name: root-pod
spec:
  containers:
  - name: app
    image: registry.access.redhat.com/ubi9/ubi
    command: ["sleep", "3600"]
    securityContext:
      runAsUser: 0           # requests root: rejected by restricted-v2` },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc apply -f root-pod.yaml\n# Error like: unable to validate against any security context constraint\n\n$ oc get events --sort-by=.lastTimestamp | tail\n\n# Which SCCs would admit this pod for me, or for a ServiceAccount?\n$ oc adm policy scc-subject-review -f root-pod.yaml\n$ oc adm policy scc-subject-review -z my-sa -n team-a -f root-pod.yaml" },
        { t: 'bullets', wide: true, items: [
          '<code>scc-subject-review</code> returns the <b>list of SCCs that would admit</b> the resource, for a user (<code>-u</code>), groups (<code>-g</code>) or a ServiceAccount of the current namespace (<code>-z</code>); resource read with <code>-f</code>, output with <code>-o</code>.',
          'For a Deployment, the pod is created by a controller: it is the <b>pod\'s ServiceAccount</b> that counts, not you (module 06).'
        ] }
      ]
    },
    {
      title: 'Creating a dedicated SCC',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'scc-nonroot-bind80.yaml', code: `apiVersion: security.openshift.io/v1
kind: SecurityContextConstraints
metadata:
  name: nonroot-bind80
allowPrivilegedContainer: false
allowPrivilegeEscalation: false
allowHostDirVolumePlugin: false
allowHostNetwork: false
allowedCapabilities:
- NET_BIND_SERVICE
requiredDropCapabilities:
- ALL
runAsUser:
  type: MustRunAsNonRoot
seLinuxContext:
  type: MustRunAs
fsGroup:
  type: MustRunAs
supplementalGroups:
  type: MustRunAs
volumes:
- configMap
- downwardAPI
- emptyDir
- persistentVolumeClaim
- projected
- secret
users: []
groups: []` },
        { t: 'bullets', items: [
          'Start from the <b>closest</b> predefined SCC and remove/add only the <b>minimum</b>; don\'t leave <code>RunAsAny</code> “for convenience”.',
          '<b>Volume allowlist</b>: no <code>hostPath</code> without a reason.',
          'Don\'t use <code>users</code>/<code>groups</code>: access is granted by RBAC (next slide).'
        ] },
        { t: 'callout', kind: 'warn', html: "Fields, default values and exact names: check with <code>oc explain securitycontextconstraints</code> on your version before copying this example." }
      ]
    },
    {
      title: 'Granting an SCC properly',
      layout: 'two',
      blocks: [
        { t: 'cmds', wide: true, items: [
          ['oc create sa my-sa -n team-a', 'ServiceAccount used by the workload'],
          ['oc create clusterrole use-nonroot-bind80 --verb=use --resource=scc --resource-name=nonroot-bind80', 'Role that allows <b>only</b> this SCC (<code>use</code> verb)'],
          ['oc create rolebinding my-sa-scc --clusterrole=use-nonroot-bind80 --serviceaccount=team-a:my-sa -n team-a', 'Namespace-scoped binding'],
          ['oc adm policy who-can use scc nonroot-bind80', 'Audit: who can use this SCC?'],
          ['oc adm policy add-scc-to-user nonroot-bind80 -z my-sa -n team-a', 'Equivalent historical shortcut']
        ] },
        { t: 'callout', kind: 'trap', html: "The “<code>add-scc-to-user anyuid</code>” reflex fixes the symptom and opens a hole: the image is <b>not fixed</b> and nothing limits its privileges anymore. Order of preference: <b>fix the image</b>, then <code>nonroot-v2</code> or a dedicated SCC, then (as a last resort, traced) <code>anyuid</code>." },
        { t: 'callout', kind: 'tip', html: "On the authorization side (<code>use</code> verb, ServiceAccount vs user, roles): module 06. Here: the content of the SCC and its choice." }
      ]
    },
    {
      title: 'Pod Security Admission: modes and profiles',
      blocks: [
        { t: 'table', head: ['Mode', 'Effect', 'Namespace label'], rows: [
          ['<code>enforce</code>', 'Rejects non-compliant pods', '<code>pod-security.kubernetes.io/enforce</code>'],
          ['<code>audit</code>', 'Logs violations (audit log)', '<code>pod-security.kubernetes.io/audit</code>'],
          ['<code>warn</code>', 'Warns the user at creation', '<code>pod-security.kubernetes.io/warn</code>']
        ] },
        { t: 'bullets', frag: true, items: [
          'Standard K8s profiles: <code>privileged</code>, <code>baseline</code>, <code>restricted</code>.',
          '<b>Global configuration</b>: the <code>privileged</code> profile is <b>enforced</b> and <code>restricted</code> is used for warnings and audit: the SCC therefore remains the effective safeguard.',
          'A violation at audit level triggers the <code>PodSecurityViolation</code> alert.'
        ] },
        { t: 'callout', kind: 'k8s', html: "PSA is the <b>standard K8s</b> implementation: it only validates. The SCC, specific to OpenShift, <b>validates and assigns</b> (UID, SELinux…). Both run at admission." }
      ]
    },
    {
      title: 'SCC ↔ PSA synchronization',
      layout: 'two',
      blocks: [
        { t: 'text', html: "<p>To avoid inconsistent warnings, OpenShift <b>automatically synchronizes</b> the namespaces\' PSA labels from the SCCs that the namespace\'s ServiceAccounts can use.</p>" },
        { t: 'code', lang: 'bash', file: 'terminal', code: "# Enable / disable synchronization on a namespace\n$ oc label namespace demo security.openshift.io/scc.podSecurityLabelSync=true\n$ oc label namespace demo security.openshift.io/scc.podSecurityLabelSync=false\n\n# Set a profile by hand on a namespace\n$ oc label namespace demo pod-security.kubernetes.io/enforce=restricted --overwrite" },
        { t: 'bullets', items: [
          '<b>Permanently excluded</b>: <code>default</code>, <code>kube-node-lease</code>, <code>kube-system</code>, <code>kube-public</code>, <code>openshift</code> and the <code>openshift-*</code> system namespaces (except <code>openshift-operators</code>).',
          'User-created <code>openshift-*</code> namespaces start <b>without</b> synchronization; you can enable it afterwards.',
          'Manually modifying a synchronized label <b>disables</b> synchronization for that label.'
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: "Setting <code>enforce=restricted</code> on a namespace hosting Operators or privileged pods breaks their deployment. Start with <code>warn</code> and <code>audit</code>, read the alerts, then switch to <code>enforce</code>." }
      ]
    },
    {
      title: 'Images: sources, signatures, digests',
      blocks: [
        { t: 'table', head: ['Lever', 'Role', 'Where'], rows: [
          ['<b>Allowed registries</b>', 'Allowlist of pull registries', '<code>Image.spec.registrySources</code>, module 04'],
          ['<b>Mirrors</b>', 'Redirection to your internal registry', '<code>ImageDigestMirrorSet</code> / <code>ImageTagMirrorSet</code>, module 03 (<code>ImageContentSourcePolicy</code> deprecated)'],
          ['<b>sigstore signatures</b>', 'Check that an image is signed before running it', '<code>ClusterImagePolicy</code> (cluster), <code>ImagePolicy</code> (namespace)'],
          ['<b>Digests</b>', 'Reference <code>image@sha256:…</code> rather than a moving tag', 'Your manifests / pipelines']
        ] },
        { t: 'bullets', frag: true, items: [
          'With <code>ClusterImagePolicy</code>, the MCO updates <code>/etc/containers/policy.json</code> and <code>registries.d/sigstore-registries.yaml</code> on <b>all nodes</b>; <code>ImagePolicy</code> targets a namespace.',
          'A policy describes <b>scopes</b> (images, repositories or registries) and a <b>root of trust</b> (public key, PKI or Fulcio).',
          'If an <code>ImagePolicy</code> image is covered by a <code>ClusterImagePolicy</code> scope, <b>only the cluster policy applies</b>.'
        ] },
        { t: 'callout', kind: 'warn', html: "<b>Status in 4.20</b>: <code>ClusterImagePolicy</code> and <code>ImagePolicy</code> are <b>GA</b> (<code>apiVersion: config.openshift.io/v1</code>, 4.20 release notes). Still in <b>Technology Preview</b>: the default <code>openshift</code> policy (GA in 4.21 according to the 4.21 release notes: “now generally available and active by default”) and <b>BYOPKI</b> certificate loading (<code>v1alpha1</code>, <code>TechPreviewNoUpgrade</code> feature set, hence not for production: module 04). Don\'t modify the <code>openshift</code> policy." }
      ]
    },
    {
      title: 'Secrets: beyond the K8s Secret',
      blocks: [
        { t: 'text', html: "<p>A K8s <code>Secret</code> is <b>encoding</b>, not encryption: anyone who can read the object (RBAC) reads it in plain text. Three complementary levers.</p>" },
        { t: 'compare', wide: true,
          left: { title: '🔐 Protect Secrets inside the cluster', items: ['<b>etcd encryption</b>: data at rest in etcd (enabling: module 04)', 'Strict RBAC on <code>secrets</code> (module 06)', 'Don\'t put them in Git in plain text'] },
          right: { title: '🏦 Keep the secret elsewhere', items: ['<b>External Secrets Operator</b>: synchronizes a vault (Vault, cloud managers, CyberArk Conjur…) into K8s Secrets', '<b>Secrets Store CSI Driver</b>: mounts the secret into the pod via a volume, no K8s Secret required', 'Rotation and audit on the vault side'] },
          verdict: 'ESO: simple for apps that read Secrets. CSI: the secret only exists in the pod. Both assume a vault.' },
        { t: 'callout', kind: 'ocp', html: "<b>External Secrets Operator for Red Hat OpenShift</b> is GA as of 4.20 (Operator from the Red Hat catalog, <code>ExternalSecretsConfig</code> resource to enable it; <code>SecretStore</code>, <code>ClusterSecretStore</code>, <code>ExternalSecret</code> objects). <code>ExternalSecretsConfig</code> is in <code>operator.openshift.io/v1alpha1</code>; the <b>Secrets Store CSI Driver Operator</b> is supported in 4.20; <code>apiVersion</code> of the <code>ExternalSecret</code>s: to be verified in the release notes." },
        { t: 'callout', kind: 'onprem', wide: true, html: "On-prem, the vault (Vault, CyberArk…) is yours: network access, high availability and CA to plan. In the cloud, the provider\'s secrets manager integrates natively." }
      ]
    },
    {
      title: 'Compliance Operator: concepts',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Profile', sub: 'ocp4-cis, ocp4-moderate…' },
          { label: 'ScanSettingBinding', sub: 'profiles + ScanSetting', hl: true },
          { label: 'ComplianceSuite / Scan', sub: 'launched by the Operator' },
          { label: 'CheckResult', sub: 'PASS / FAIL / MANUAL' },
          { label: 'Remediation', sub: 'proposed fix' }
        ], caption: 'Same logic as RBAC: you <b>bind</b> profiles to settings (schedule, storage), the Operator does the rest. Operator namespace: <code>openshift-compliance</code>.' },
        { t: 'table', head: ['Family', 'Profiles (platform / nodes)'], rows: [
          ['CIS', '<code>ocp4-cis</code>, <code>ocp4-cis-node</code> (pinned versions: <code>ocp4-cis-1-9</code>…)'],
          ['FedRAMP Moderate / High', '<code>ocp4-moderate</code>, <code>ocp4-moderate-node</code>, <code>rhcos4-moderate</code>; <code>ocp4-high</code>…'],
          ['PCI-DSS', '<code>ocp4-pci-dss</code>, <code>ocp4-pci-dss-node</code> (versions <code>3-2</code> and <code>4-0</code>)'],
          ['STIG', '<code>ocp4-stig</code>, <code>ocp4-stig-node</code>, <code>rhcos4-stig</code>'],
          ['BSI, Essential Eight, NERC-CIP', '<code>ocp4-bsi</code>…, <code>ocp4-e8</code> / <code>rhcos4-e8</code>, <code>ocp4-nerc-cip</code>…']
        ] },
        { t: 'callout', kind: 'warn', html: "<b>No ANSSI profile</b> appears in the list of supported profiles in the 4.20 docs: if your context requires it, <b>to be verified</b> (other mechanism or version). Actual list on your cluster: <code>oc get profiles.compliance -n openshift-compliance</code>." }
      ]
    },
    {
      title: 'Compliance Operator: running a scan',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'scan-cis.yaml', code: `apiVersion: compliance.openshift.io/v1alpha1
kind: ScanSettingBinding
metadata:
  name: cis
  namespace: openshift-compliance
profiles:
- name: ocp4-cis
  kind: Profile
  apiGroup: compliance.openshift.io/v1alpha1
- name: ocp4-cis-node
  kind: Profile
  apiGroup: compliance.openshift.io/v1alpha1
settingsRef:
  name: default
  kind: ScanSetting
  apiGroup: compliance.openshift.io/v1alpha1` },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc apply -f scan-cis.yaml\n$ oc get compliancesuite -n openshift-compliance -w\n$ oc get compliancecheckresult -n openshift-compliance \\\n    -l compliance.openshift.io/check-status=FAIL" },
        { t: 'bullets', wide: true, items: [
          'Binding to the <code>default</code> <code>ScanSetting</code> creates a <code>ComplianceSuite</code> then <code>ComplianceScan</code>s; the results are <code>ComplianceCheckResult</code>s.',
          'A FAIL is not always a fault: some checks are <b>MANUAL</b> or not applicable to your context; document the accepted deviations.'
        ] }
      ]
    },
    {
      title: 'Remediations and File Integrity Operator',
      blocks: [
        { t: 'bullets', items: [
          '<b>ComplianceRemediation</b>: the proposed fix for a FAIL (often a MachineConfig or a config resource). You apply it deliberately; a node fix goes through the MCO and therefore a <b>rolling reboot</b> (module 02).',
          '<b>Apply in batches, never blindly</b>: read each remediation, test on a lab cluster, plan the window.',
          '<b>File Integrity Operator</b>: an AIDE DaemonSet continuously checks the nodes\' files (useful on RHCOS to detect changes made outside MachineConfig).'
        ] },
        { t: 'code', lang: 'yaml', file: 'fileintegrity.yaml', code: `apiVersion: fileintegrity.openshift.io/v1alpha1
kind: FileIntegrity
metadata:
  name: worker-fileintegrity
  namespace: openshift-file-integrity
spec:
  nodeSelector:
    node-role.kubernetes.io/worker: ""
  config: {}` },
        { t: 'callout', kind: 'warn', html: "The <code>openshift-file-integrity</code> namespace must carry the <code>privileged</code> PSA label at creation (AIDE runs privileged). Behavior of a compliance fix on a SNO (reboot of the single node): to be anticipated." }
      ]
    },
    {
      title: 'RHCOS, FIPS and ACS: overview',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          '<b>SELinux</b> is <b>enabled</b> on RHCOS: it is what separates projects from each other (namespace MCS label).',
          '<b>FIPS</b>: decided <b>at installation</b> (<code>fips: true</code> in <code>install-config.yaml</code>, module 03); it cannot be enabled afterwards. Validation status of the cryptographic modules in 4.20: to be verified.',
          '<b>ACS</b> (Red Hat Advanced Cluster Security for Kubernetes): image vulnerabilities, deployment policies, runtime detection, compliance. Deployed via an Operator; <b>out of scope</b> for this course (license and version: to be verified).'
        ] },
        { t: 'callout', kind: 'onprem', html: "FIPS, SELinux and OS hardening are <b>on you</b> on your infrastructure: these are architecture decisions to make with security <b>before</b> installation." },
        { t: 'callout', kind: 'cloud', html: "On managed offerings, node hardening is handled by the provider; it remains on you for the application workloads (SCC, images, secrets)." }
      ]
    },
    {
      title: 'Quiz',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'A ServiceAccount may use <code>restricted-v2</code> and <code>anyuid</code>. Its pod requests nothing in particular. Which SCC is selected?', options: ['<code>restricted-v2</code>, because it is more restrictive', 'None, the pod is rejected: two SCCs conflict', 'The most recently created SCC', '<code>anyuid</code>, because its priority (10) comes before <code>restricted-v2</code>, which has none'], answer: 3, explain: 'Sorting places the highest-priority SCCs first: <code>anyuid</code> (10 by default) comes before <code>restricted-v2</code> (no priority). Restrictiveness only breaks ties between SCCs of the <b>same priority</b>. <code>anyuid</code> doesn\'t force root, but an image without <code>USER</code> will run as root.' },
        { t: 'quiz', q: 'Which label disables or enables SCC ↔ PSA synchronization on a namespace?', options: ['<code>security.openshift.io/scc.podSecurityLabelSync</code>', '<code>pod-security.kubernetes.io/sync</code>', '<code>openshift.io/required-scc</code>', '<code>pod-security.kubernetes.io/enforce</code>'], answer: 0, explain: '<code>security.openshift.io/scc.podSecurityLabelSync=true|false</code> drives synchronization. <code>enforce</code> sets the enforced profile; <code>required-scc</code> forces an SCC onto a workload.' },
        { t: 'quiz', q: 'Which resource triggers the running of a scan with the Compliance Operator?', options: ['<code>ComplianceCheckResult</code>', '<code>ScanSettingBinding</code>', '<code>ComplianceRemediation</code>', '<code>FileIntegrity</code>'], answer: 1, explain: 'The <code>ScanSettingBinding</code> binds profiles to a <code>ScanSetting</code>; the Operator then creates the suite and the scans. The <code>ComplianceCheckResult</code>s are the outcome.' }
      ]
    },
    {
      title: 'Lab: dedicated SCC and first compliance scan',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'Rejected pod, minimal SCC, CIS scan', goal: 'Core during the session on a SNO (cluster-admin). This lab serves as a safety valve: if you run late, finish it at the start of day 3.', steps: [
          'Prerequisites: environment E1 (SNO) with <code>cluster-admin</code>, see module 00; create a <code>m09-lab</code> project.',
          'Apply <code>root-pod.yaml</code> (slide “Diagnosing a rejected pod”): read the error and the events, then run <code>oc adm policy scc-subject-review -f root-pod.yaml</code> to see which SCCs would admit it.',
          'Create the <code>nonroot-bind80</code> SCC, a ServiceAccount, a <code>ClusterRole</code> with the <code>use</code> verb and a project-scoped <code>RoleBinding</code>; check with <code>oc adm policy who-can use scc nonroot-bind80</code>.',
          'Deploy a non-root pod with this ServiceAccount (fixed non-zero <code>runAsUser</code>) and check the <code>openshift.io/scc</code> annotation; then try with <code>runAsUser: 0</code> and explain the rejection.',
          'Install the <b>Compliance Operator</b> from OperatorHub in <code>openshift-compliance</code> (approval of your choice, module 04) and create the <code>cis</code> <code>ScanSettingBinding</code> from the slide.',
          '(bonus) Wait for the scan to finish then list the <code>FAIL</code>s with <code>oc get compliancecheckresult -n openshift-compliance -l compliance.openshift.io/check-status=FAIL</code>; pick one, read its <code>ComplianceRemediation</code> and say whether you would apply it.',
          '(bonus) Set <code>pod-security.kubernetes.io/warn=restricted</code> and <code>audit=restricted</code> on <code>m09-lab</code> then recreate a root pod: note the warning and the possible alert.',
          '(bonus) Enable etcd encryption (<code>APIServer</code>, see module 04), wait for <code>EncryptionCompleted</code>, and note what you must back up (module 11). On a disposable cluster only.',
          '(bonus) Install the <b>File Integrity Operator</b> (<code>openshift-file-integrity</code> namespace with the <code>privileged</code> PSA label) and create the <code>FileIntegrity</code> from the slide; cause a file change on a node (<code>oc debug</code>) and observe the result.'
        ] }
      ]
    }
  ],
  takeaways: [
    'The SCC says what a pod can request <b>and</b> assigns UID, SELinux, capabilities; <code>restricted-v2</code> is the default given by the 4.20 docs table (which also describes <code>restricted-v3</code>, with user namespace, new in 4.20, as “used by default”: ambiguity to read in the docs).',
    'Selection: priority first (<code>anyuid</code>: 10, <code>restricted-v2</code>: none), then most restrictive, then name; grant an SCC through RBAC (<code>use</code> verb) to the <b>ServiceAccount</b>, and create a dedicated SCC rather than <code>anyuid</code>.',
    'PSA: global <code>privileged</code> enforce, <code>restricted</code> audit and warn; labels synchronize from the SCCs (<code>podSecurityLabelSync</code>), except system namespaces.',
    'Images: allowed sources (module 04), mirrors (module 03), digests; sigstore signing (<code>ClusterImagePolicy</code> / <code>ImagePolicy</code>, <code>config.openshift.io/v1</code>) is GA in 4.20; BYOPKI and the <code>openshift</code> policy remain Tech Preview.',
    'Secrets: encrypting etcd is not enough; External Secrets Operator (GA 4.20+) or Secrets Store CSI with an external vault.',
    'Compliance Operator: <code>ScanSettingBinding</code> → scans → <code>ComplianceCheckResult</code> → remediations read before being applied; File Integrity Operator for node integrity.'
  ]
});
