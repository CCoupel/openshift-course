COURSE.add({
  id: 'm10', lang: 'en', num: 10, emoji: '🔄',
  title: 'CI/CD & GitOps',
  source: 'd9be8ac18973',
  tagline: 'Your cluster\'s configuration in Git, applied and watched by Argo CD: platform GitOps first, Pipelines and Builds as an overview.',
  duration: '≈ 45 min + lab 20 min',
  objectives: [
    'Install OpenShift GitOps and understand the default Argo CD instance and its permission limits',
    'Describe a cluster configuration with <code>Application</code>, <code>AppProject</code> and <code>ApplicationSet</code>',
    'Master the sync policies (prune, selfHeal), sync waves and hooks',
    'Organize the Git repository, manage secrets without putting them in plain text and place multi-cluster',
    'Place OpenShift Pipelines (Tekton) and Builds without getting into application development'
  ],
  slides: [
    {
      title: 'Platform GitOps: why?',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Git', sub: 'desired configuration', hl: true },
          { label: 'Argo CD', sub: 'compares and applies' },
          { label: 'Cluster', sub: 'actual state' },
          { label: 'Drift?', sub: 'detected, corrected', hl: true }
        ], caption: 'Git is the <b>source of truth</b>; Argo CD continuously brings the cluster back to it.' },
        { t: 'bullets', frag: true, items: [
          '<b>Audience of this module</b>: the platform admin. We manage the <b>cluster configuration</b> (modules 04, 06, 07…), not application development (out of scope for v1).',
          'Benefits: history and review (pull requests), <b>reproducibility</b> from one cluster to another, rollback with <code>git revert</code>, <b>rebuild</b> after a disaster (module 11).',
          'Boundaries: day-1 config → module 04; RBAC → module 06; secrets → module 09; DR → module 11; updates → module 12; Routes → module 07.'
        ] },
        { t: 'callout', kind: 'k8s', html: "You already know Argo CD or Flux on K8s. Here, the topic is <b>OpenShift GitOps</b>: the supported distribution of Argo CD, installed by an Operator, with its own permission and OpenShift integration particularities." }
      ]
    },
    {
      title: 'Argo CD objects',
      blocks: [
        { t: 'table', head: ['Object (<code>argoproj.io/v1alpha1</code>)', 'Role'], rows: [
          ['<code>Application</code>', 'A <b>repo + path + revision</b> synchronized to a <b>destination</b> (cluster + namespace)'],
          ['<code>AppProject</code>', 'Authorization scope: which repos, which destinations, which resource types'],
          ['<code>ApplicationSet</code>', 'Generates <b>several Applications</b> from a template (list, Git folders, clusters)'],
          ['<code>ArgoCD</code> (<code>argoproj.io/v1beta1</code>)', 'CR of the <b>OpenShift GitOps Operator</b> that describes <b>an instance</b> of Argo CD']
        ] },
        { t: 'bullets', items: [
          'States of an Application: <b>Synced</b> / <b>OutOfSync</b> (conformity to Git) and <b>Healthy</b> / <b>Degraded</b> (health of the resources).',
          '<b>Drift</b>: a change made outside Git; depending on the policy, it is reported or corrected.'
        ] },
        { t: 'callout', kind: 'tip', html: "An Application = <b>a coherent batch</b> (for example “quotas and project template” or “OperatorHub and subscriptions”). Neither one big monolithic repo, nor one Application per file." }
      ]
    },
    {
      title: 'OpenShift GitOps: the Operator and its versions',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Version', 'Argo CD', 'Supported OCP'], rows: [
          ['<b>1.21</b>', '3.4.3 (GA)', '4.14, 4.16 to 4.22 (following patches: 4.18 to 4.22)'],
          ['<b>1.20</b>', '3.3.2 (GA)', '4.14, 4.16 to 4.21'],
          ['<b>1.19</b>', '3.1.9 (GA)', '4.14, 4.16 to 4.21'],
          ['<b>1.18</b>', '—', '4.14, 4.16 to 4.20']
        ] },
        { t: 'bullets', items: [
          '<b><code>latest</code></b> channel (default) or <code>gitops-&lt;version&gt;</code> to pin a minor version.',
          'Default installation namespace: <b><code>openshift-gitops-operator</code></b> (before 1.10: <code>openshift-operators</code>).',
          'After installation, a <b>ready-to-use Argo CD instance</b> exists in the <code>openshift-gitops</code> namespace.',
          'Versions <b>1.18 to 1.21</b> all cover OCP 4.20. Since 1.18: “support is no longer provided for Keycloak-based authentication” (migrate to Dex); the <b>Argo CD Agent</b> went from Technology Preview (1.17-1.18) to <b>GA in 1.19</b> (1.21 release notes).'
        ] },
        { t: 'callout', kind: 'warn', wide: true, html: "Choose the OpenShift GitOps version according to the compatibility matrix for <b>your OCP version</b> and the Operator\'s <b>life cycle</b> (module 12 for updates). Status of the Argo CD CLI and ApplicationSet progressive rollout: Technology Preview (1.19 docs)." }
      ]
    },
    {
      title: 'Installing OpenShift GitOps',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'gitops-operator.yaml (CLI procedure from the docs)', code: `apiVersion: v1
kind: Namespace
metadata:
  name: openshift-gitops-operator
  labels:
    openshift.io/cluster-monitoring: "true"   # optional (Operator monitoring)
---
apiVersion: operators.coreos.com/v1
kind: OperatorGroup
metadata:
  name: openshift-gitops-operator
  namespace: openshift-gitops-operator
spec:
  upgradeStrategy: Default
---
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: openshift-gitops-operator
  namespace: openshift-gitops-operator
spec:
  channel: latest
  installPlanApproval: Automatic
  name: openshift-gitops-operator
  source: redhat-operators
  sourceNamespace: openshift-marketplace` },
        { t: 'bullets', items: [
          'The docs describe installation through the <b>console</b> (OperatorHub, <code>cluster-admin</code> rights required) <b>and</b> through the <b>CLI</b>: the YAML above follows the CLI procedure of the 1.19 docs (OperatorGroup with <code>upgradeStrategy: Default</code>, Subscription on the <code>latest</code> channel); the <code>openshift.io/cluster-monitoring</code> label is <b>optional</b> (module 04 for OLM).',
          'Verification: <code>oc get pods -n openshift-gitops</code>; the Argo CD icon appears in the console bar.'
        ] },
        { t: 'callout', kind: 'tip', html: "For production, set <code>installPlanApproval</code> to <code>Manual</code> if you want to control the Operator\'s updates (module 04, module 12)." }
      ]
    },
    {
      title: 'The default instance: what it can (and cannot) do',
      tag: 'worth knowing',
      blocks: [
        { t: 'bullets', frag: true, items: [
          'The <code>openshift-gitops</code> instance is a <b>“cluster-scoped”</b> instance: intended for admins to manage certain cluster configuration resources.',
          'By default, it manages <b>a limited set of cluster resources</b> (the docs cite: cluster Operators, optional OLM Operators, user management), has <code>admin</code> rights <b>only in its own namespace</b> and <b>read</b> rights (<code>get</code>, <code>list</code>, <code>watch</code>) on cluster resources, needed for it to work: “<b>Argo CD does not have <code>cluster-admin</code></b>”.',
          'A namespace managed by the instance must carry the label <code>argocd.argoproj.io/managed-by=openshift-gitops</code>.',
          'To manage other cluster resources, you create a <code>ClusterRole</code> and a <code>ClusterRoleBinding</code> for the <code>openshift-gitops-argocd-application-controller</code> service account.'
        ] },
        { t: 'callout', kind: 'trap', html: "The default instance is <b>reserved for administrators and cluster configuration</b>: don\'t give access to non-admins and <b>don\'t use it to deliver applications</b> (the multi-tenancy docs advise against it). For teams: <b>dedicated instances</b>." },
        { t: 'callout', kind: 'tip', html: "Give the instance the <b>minimal rights</b> for what it manages (for example only the desired <code>config.openshift.io</code> resources), not a <code>cluster-admin</code> out of convenience." }
      ]
    },
    {
      title: 'A team Argo CD instance: the ArgoCD CR',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'argocd-team.yaml (example)', code: `apiVersion: argoproj.io/v1beta1
kind: ArgoCD
metadata:
  name: team-a
  namespace: team-a-gitops
spec:
  server:
    route:
      enabled: true
  sso:
    provider: dex
    dex:
      openShiftOAuth: true
  rbac:
    policy: 'g, team-a-admins, role:admin'
    scopes: '[groups]'` },
        { t: 'bullets', items: [
          '<code>spec.server.route.enabled</code>: creates an <b>OpenShift Route</b> to the interface (module 07).',
          '<code>spec.sso.provider: dex</code> with <code>dex.openShiftOAuth: true</code>: Dex relies on the <b>OpenShift OAuth server</b>; the login page then offers <b>“LOG IN VIA OPENSHIFT”</b> with the accounts and <b>groups</b> of your identity provider (module 06). The old <code>spec.dex</code> field has no longer been supported since 1.10.',
          'Rights <b>inside Argo CD</b> (<code>rbac</code>) are independent of OpenShift RBAC: describe them by <b>groups</b>.'
        ] },
        { t: 'callout', kind: 'warn', wide: true, html: "<code>sso</code> and <code>rbac</code> structure matches the example in the OpenShift GitOps 1.20 docs “Access control and user management” (the <code>team-a-admins</code> group is an example: take a group from your cluster). Keycloak is no longer supported (module 06 for identity). One instance per team isolates rights and errors." }
      ]
    },
    {
      title: 'An Application for the cluster configuration',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'application-config.yaml', code: `apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cluster-config-lab
  namespace: openshift-gitops
spec:
  project: default
  source:
    repoURL: https://git.example.com/platform/cluster-config.git
    targetRevision: HEAD
    path: lab
  destination:
    server: https://kubernetes.default.svc
    namespace: gitops-lab
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - ApplyOutOfSyncOnly=true` },
        { t: 'code', lang: 'yaml', file: 'private-repo.yaml (private repo, HTTPS)', code: `apiVersion: v1
kind: Secret
metadata:
  name: repo-cluster-config
  namespace: openshift-gitops
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://git.example.com/platform/cluster-config.git
  username: argocd
  password: change-me` },
        { t: 'bullets', items: [
          '<b>Private repo</b>: credentials are declared in a <b>Secret</b> carrying the label <code>argocd.argoproj.io/secret-type: repository</code>, with <code>type: git</code>, <code>url</code> and <code>username</code>/<code>password</code> (HTTPS) or <code>sshPrivateKey</code> (SSH), in the <b>instance\'s namespace</b> (Argo CD docs); this Secret is <b>not</b> put in plain text in Git (secrets slide).',
          '<code>destination.server: https://kubernetes.default.svc</code>: the <b>cluster where Argo CD runs</b>.',
          '<b>Namespace</b>: <code>gitops-lab</code> already exists with the label <code>argocd.argoproj.io/managed-by=openshift-gitops</code> (step 3 of the lab); <code>CreateNamespace=true</code> would not be enough on its own if the instance has no right to create a namespace.',
          '<code>automated</code> + <code>prune</code> + <code>selfHeal</code>: automatic synchronization, deletion of resources removed from Git, drift correction.',
          '<code>repoURL</code> is an <b>example</b>: put the URL of <b>your</b> repo (public or internal, reachable from the cluster).'
        ] },
        { t: 'callout', kind: 'onprem', html: "Disconnected cluster: the Git repo must be <b>internal</b> (GitLab, Gitea…); the registry and charts/images must be mirrored (module 03). An Argo CD without access to its repo stays <code>Unknown</code>." }
      ]
    },
    {
      title: 'Sync policies and options',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Setting', 'Effect'], rows: [
          ['<code>automated</code>', 'Argo CD synchronizes on its own as soon as it sees a difference with Git'],
          ['<code>prune: true</code>', '<b>Deletes</b> from the cluster what has disappeared from Git'],
          ['<code>selfHeal: true</code>', 'Reapplies the Git state when someone modifies a resource by hand'],
          ['<code>CreateNamespace=true</code>', 'Creates the destination namespace if it doesn\'t exist'],
          ['<code>ServerSideApply=true</code>', 'Uses server-side apply (large resources, field conflicts)'],
          ['<code>Prune=false</code> (annotation)', 'Protects <b>one resource</b> from deletion'],
          ['<code>PruneLast=true</code>', 'Deletes last, after the rest has been deployed'],
          ['<code>ApplyOutOfSyncOnly=true</code>', 'Only applies what differs (less API load)']
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: "<code>prune</code> on a <b>cluster\'s config</b> can delete a critical resource if a file disappears from a commit by mistake. Protect sensitive resources (<code>Prune=false</code>), require reviewed <b>pull requests</b> and test on a lab cluster first." }
      ]
    },
    {
      title: 'Sync waves and hooks: order matters',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'excerpts (not applicable as is).yaml', code: `# 1. The Operator subscription (wave -1)
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
---
# 2. The CR provided by the Operator (wave 1)
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "1"
    argocd.argoproj.io/sync-options: SkipDryRunOnMissingResource=true
---
# Hook run before synchronization
metadata:
  annotations:
    argocd.argoproj.io/hook: PreSync` },
        { t: 'bullets', items: [
          '<code>argocd.argoproj.io/sync-wave</code> annotation: resources are processed <b>from the lowest to the highest value</b>; <b>0</b> by default, negative values possible.',
          'Full order: <b>phase</b> first, then <b>wave</b>, then resource type, then name. Delay between two waves: <b>2 s</b> (<code>ARGOCD_SYNC_WAVE_DELAY</code> variable).',
          'Hooks: <code>PreSync</code>, <code>Sync</code>, <code>PostSync</code>, <code>SyncFail</code>; deletion according to <code>HookSucceeded</code>, <code>HookFailed</code> or <code>BeforeHookCreation</code>.'
        ] },
        { t: 'callout', kind: 'tip', html: "Typical platform case: <b>namespace → OLM Subscription → Operator CR</b> in this order (module 04). <b>Beware</b>: Argo CD doesn\'t wait for the <b>CRD</b> installed by OLM to exist; without precautions, synchronizing the CR fails at the <i>dry run</i> (unknown type). The <code>SkipDryRunOnMissingResource=true</code> option (<code>argocd.argoproj.io/sync-options</code> annotation on the resource, or in the Application\'s <code>syncOptions</code>) skips that dry run when the type is absent; it runs as soon as the CRD is present (Argo CD docs “Sync options”). A synchronization <b>retry</b> is the other safety net (to be verified for your version)." }
      ]
    },
    {
      title: 'App-of-apps and ApplicationSet',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          '<b>App-of-apps</b>: a “root” Application points to a folder of <b>Application manifests</b>; adding a building block = adding a file in Git.',
          '<b>ApplicationSet</b>: a template + a <b>generator</b> (list, Git folders, <b>clusters</b>) that produces one Application per element.',
          'Ideal for <b>several clusters</b> with the same base and deviations per overlay.'
        ] },
        { t: 'code', lang: 'yaml', file: 'applicationset.yaml (illustration)', code: `apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: config-per-cluster
  namespace: openshift-gitops
spec:
  generators:
  - clusters: {}
  template:
    metadata:
      name: 'config-{{name}}'
    spec:
      project: default
      source:
        repoURL: https://git.example.com/platform/cluster-config.git
        targetRevision: HEAD
        path: 'overlays/{{name}}'
      destination:
        server: '{{server}}'
        namespace: openshift-config` },
        { t: 'callout', kind: 'warn', wide: true, html: "Illustration: generator fields and <code>ApplicationSet</code> templates to be re-read in the docs for your version (upstream Argo CD and OpenShift GitOps documentation)." }
      ]
    },
    {
      title: 'Organizing the platform Git repo',
      blocks: [
        { t: 'code', lang: 'bash', file: 'typical tree', code: "cluster-config/\n├── base/\n│   ├── config-openshift/     # Proxy, Image, APIServer (module 04)\n│   ├── olm/                  # OperatorHub, Subscriptions (module 04)\n│   ├── rbac-oauth/           # OAuth, groups, project template (module 06)\n│   ├── network/              # template NetworkPolicy (module 07)\n│   └── machineconfig/        # chrony, kargs (modules 02, 04)\n├── overlays/\n│   ├── prod-a/               # cluster-specific deviations\n│   └── lab/\n└── apps/                     # Argo CD Applications (app-of-apps)" },
        { t: 'bullets', items: [
          '<b>base</b> + <b>overlays per cluster</b> (kustomize): the common part once, the differences visible.',
          'One folder = one <b>coherent batch</b> = one Application, with its sync waves.',
          'Branches or folders per environment: decide on the <b>promotion tool</b> (pull request) rather than copying by hand.'
        ] },
        { t: 'callout', kind: 'tip', html: "Start with <b>a single topic</b> (for example quotas and the project template): it is visible, low-risk and proves the model before you put OAuth or MachineConfigs in it." }
      ]
    },
    {
      title: 'Drift and operators: don\'t fight them',
      tag: 'pitfall',
      blocks: [
        { t: 'bullets', frag: true, items: [
          'Some resources are <b>modified by operators</b> (<code>status</code> fields, injected default values, enriched lists): Argo CD sees a <b>permanent drift</b> (OutOfSync in a loop).',
          'Only put in Git what <b>you</b> decide; ignore fields managed elsewhere with <code>ignoreDifferences</code> (Argo CD mechanism) rather than letting <code>selfHeal</code> fight an operator.',
          'No settings that bypass the operator: go through the intended CR (module 04).',
          'MachineConfig and OLM: a change in Git = <b>reboots and node updates</b> (module 02): re-read before merging.'
        ] },
        { t: 'callout', kind: 'trap', html: "A <code>selfHeal</code> that <b>keeps undoing</b> a field managed by an operator can generate cascading restarts. Watch the <b>number of synchronizations</b> and deal with “chronic” OutOfSync." }
      ]
    },
    {
      title: 'Secrets: never in plain text in Git',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          'A K8s <code>Secret</code> is just encoding: <b>never</b> in plain text in Git (even a private repo).',
          '<b>External Secrets Operator</b>: Git only contains the <b>reference</b> to a vault (Vault…); the secret is built inside the cluster (module 09).',
          '<b>Encryption in Git</b> (community tools such as Sealed Secrets or SOPS): possible, but not provided by OpenShift GitOps: support status to be verified with your vendor.',
          'etcd encryption (module 04) protects the secret <b>inside the cluster</b>, not in Git.'
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: "A secret pushed once into the Git history must be considered <b>compromised</b>: you must <b>revoke</b> and regenerate it, not just delete the file." }
      ]
    },
    {
      title: 'Multi-cluster and DR with GitOps',
      blocks: [
        { t: 'table', head: ['Approach', 'Principle', 'Good to know'], rows: [
          ['<b>A central Argo CD</b>', 'One instance registers several clusters and pushes', 'Simple; the instance becomes a critical point and has rights on all'],
          ['<b>ApplicationSet (clusters generator)</b>', 'One Application per registered cluster', 'Same base, overlays per cluster'],
          ['<b>Argo CD Agent</b>', '<b>Pull</b> architecture: the cluster\'s agent fetches its config', 'GA in OpenShift GitOps 1.19 (docs)'],
          ['<b>ACM + Argo CD (pull)</b>', 'The ACM hub distributes; the ACM agent pulls the Application', 'Introduced in Technology Preview in ACM 2.8; current status: to be verified']
        ] },
        { t: 'flow', nodes: [
          'Cluster lost',
          { label: 'Reinstall', sub: 'module 03' },
          { label: 'GitOps bootstrap', sub: 'Operator + root Application', hl: true },
          { label: 'Config comes back from Git', sub: 'OAuth, quotas, OLM…' },
          { label: 'Data', sub: 'OADP (module 11)', hl: true }
        ], caption: 'GitOps rebuilds the <b>configuration</b>; the <b>data</b> comes from backups (module 11).' }
      ]
    },
    {
      title: 'OpenShift Pipelines and Builds: overview',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Tool', 'Role', 'To remember on the platform side'], rows: [
          ['<b>OpenShift Pipelines</b> (Tekton)', 'CI/CD as pipelines of tasks in pods', 'Operator via OLM; version 1.20: OCP 4.14 and 4.16 to 4.21; 1.21: console integration up to 4.20'],
          ['<b>ClusterTask</b>', 'Old cluster-scoped task', 'Deprecated, <b>removed in 1.17</b>: replaced by Tekton <b>resolvers</b> (GA since 1.11)'],
          ['<b>Builds for OpenShift</b> (Shipwright)', 'Building images on the cluster', 'Builds 1.6 (Shipwright 0.17, GA) for 4.20; 1.7 for 4.16 to 4.21'],
          ['<b>BuildConfig</b>', 'OCP\'s historical build mechanism', 'Still present; deprecation status in 4.20 not confirmed: to be verified']
        ] },
        { t: 'callout', kind: 'ocp', wide: true, html: "These tools belong to <b>application development</b> and the teams: the platform admin <b>installs, versions and monitors</b> them (Operators, rights, quotas of the build namespaces). The pipeline details are out of scope for this course." }
      ]
    },
    {
      title: 'Quiz',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Your default Argo CD cannot create a cluster configuration resource. What is the most likely cause and the appropriate answer?', options: ['The Git repo is private: it must be made public', 'The OpenShift GitOps Operator must be restarted', 'The default instance does not have <code>cluster-admin</code>: create a limited ClusterRole and ClusterRoleBinding for its service account', 'You must use <code>kubectl apply</code> instead of Argo CD'], answer: 2, explain: 'The default instance has admin rights in its namespace and read access to the cluster, but not cluster-admin. To manage other resources, you add a ClusterRole/ClusterRoleBinding to the <code>openshift-gitops-argocd-application-controller</code> service account, with the minimum of rights.' },
        { t: 'quiz', q: 'With <code>selfHeal: true</code>, what happens when an administrator modifies a resource managed by Argo CD by hand?', options: ['Argo CD reapplies the state described in Git and undoes the change', 'Argo CD updates the Git repo with the manual change', 'Nothing: Argo CD only looks at new commits', 'The Application is deleted from the cluster'], answer: 0, explain: '<code>selfHeal</code> brings the cluster back to the Git state. It is what makes drift visible and corrected; handle with care for resources that operators also modify.' },
        { t: 'quiz', q: 'You must first create the namespace and Subscription of an Operator, then the CR it provides. Which Argo CD mechanism do you use?', options: ['The <code>Prune=false</code> annotation on the CR', 'The Application\'s <code>destination</code> field', 'One <code>AppProject</code> per resource', 'The <code>argocd.argoproj.io/sync-wave</code> annotation with increasing values'], answer: 3, explain: 'Sync waves order the application of resources, from the lowest to the highest value: Subscription in a low wave, Operator CR in a higher wave, once the CRD is available.' }
      ]
    },
    {
      title: 'The lab manifests',
      tag: 'lab',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'lab/resourcequota.yaml', code: `apiVersion: v1
kind: ResourceQuota
metadata:
  name: quota-lab
  namespace: gitops-lab
spec:
  hard:
    pods: "10"
    requests.cpu: "2"
    requests.memory: 4Gi` },
        { t: 'code', lang: 'yaml', file: 'lab/configmap.yaml', code: `apiVersion: v1
kind: ConfigMap
metadata:
  name: banner
  namespace: gitops-lab
data:
  message: "Managed by GitOps: do not edit by hand"` },
        { t: 'callout', kind: 'tip', html: "Put these two files in the <code>lab/</code> folder of a <b>Git repo of your own</b> (GitHub, GitLab, internal Gitea… reachable from the cluster). The lab references no provided repo: create your own. The <code>gitops-lab</code> namespace is created <b>by hand</b> (step 3) with the management label." }
      ]
    },
    {
      title: 'Lab: first GitOps Application',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'Install OpenShift GitOps, synchronize a quota, cause a drift', goal: 'Core during the session on a SNO (cluster-admin) with an accessible Git repo. The (bonus) steps are to be done on your own.', steps: [
          'Prerequisites: environment E0/E1 with <code>cluster-admin</code>, see module 00; a <b>Git repo</b> (public or internal) reachable from the cluster, where you can push. <b>Private</b> repo: create the Secret from the “An Application” slide (label <code>argocd.argoproj.io/secret-type: repository</code>) in <code>openshift-gitops</code> with a read token, <b>without committing it</b>.',
          'Install <b>OpenShift GitOps</b> (OperatorHub, <code>latest</code> channel, <code>openshift-gitops-operator</code> namespace) then check the pods of <code>openshift-gitops</code> and the Argo CD login via “LOG IN VIA OPENSHIFT”.',
          'Create the managed namespace: <code>oc create namespace gitops-lab</code> then <code>oc label namespace gitops-lab argocd.argoproj.io/managed-by=openshift-gitops</code>; push the two manifests from the previous slide into <code>lab/</code>.',
          'Create the <code>Application</code> (dedicated slide, with your repo URL, without <code>CreateNamespace</code> since the namespace exists) and check that it becomes <b>Synced</b> and <b>Healthy</b> and that the quota and the ConfigMap exist.',
          'Cause a drift: <code>oc delete configmap banner -n gitops-lab</code> then modify the quota by hand; observe the <b>correction by selfHeal</b>. Then turn off <code>selfHeal</code> and see the <b>OutOfSync</b> state. <b>Rollback</b>: delete the Application (<code>oc delete application cluster-config-lab -n openshift-gitops</code>) then the lab namespace.',
          '(bonus, E1) Turn the folder into an <b>app-of-apps</b>: a root Application that deploys two child Applications; add a sync wave between them.',
          '(bonus, disposable E1) Give the instance a minimal <code>ClusterRole</code>/<code>ClusterRoleBinding</code> to manage a cluster resource (for example a <code>ResourceQuota</code> via project template, module 06) and check its rights with <code>oc auth can-i create resourcequotas --as system:serviceaccount:openshift-gitops:openshift-gitops-argocd-application-controller -n gitops-lab</code>.',
          '(bonus, E2) <code>ApplicationSet</code> with the clusters generator on two registered clusters.'
        ] }
      ]
    }
  ],
  takeaways: [
    'Platform GitOps: the cluster configuration (modules 04, 06, 07…) lives in Git; Argo CD applies it and corrects drift; rebuilding a cluster goes through Git (module 11).',
    'OpenShift GitOps: <code>latest</code> channel, <code>openshift-gitops-operator</code> namespace, default instance in <code>openshift-gitops</code>; versions 1.18 and 1.19 compatible with 4.20.',
    'The default instance does <b>not have cluster-admin</b>: admin in its namespace and read access to the cluster; rights widened by a minimal ClusterRole; <code>argocd.argoproj.io/managed-by</code> label for managed namespaces.',
    'Application, AppProject, ApplicationSet; <code>automated</code>, <code>prune</code>, <code>selfHeal</code>; sync waves and hooks for ordering; app-of-apps for structure.',
    'Never a secret in plain text in Git (External Secrets, module 09); don\'t fight the operators (<code>ignoreDifferences</code>, intended CRs).',
    'Pipelines (Tekton, ClusterTask removed in 1.17) and Builds (Shipwright): overview; the admin installs and monitors them, application development stays out of scope.'
  ]
});
