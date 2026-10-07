COURSE.add({
  id: 'm06', lang: 'en', num: 6, emoji: '🔐',
  title: 'HBAC / RBAC',
  source: '2c820551dd76',
  tagline: 'Who are you, what can you do, on what, and from where? Authentication, RBAC, groups, projects, node access and audit.',
  duration: '≈ 60 min + lab 20 min',
  objectives: [
    'Understand the OpenShift authn/authz chain (OAuth server, tokens, User/Identity/Group, ServiceAccounts)',
    'Master the default roles and the <code>oc adm policy</code> / <code>oc auth can-i</code> commands',
    'Plug in LDAP/IdM or OIDC, synchronize groups and industrialize multi-tenancy',
    'Place “HBAC” honestly: a FreeIPA/SSSD concept, and what plays that role on the OCP side (nodes, API, SCC)',
    'Manage kubeadmin, break-glass and audit'
  ],
  slides: [
    {
      title: 'The authn → authz → admission chain',
      blocks: [
        { t: 'text', html: '<p>As on K8s: every request goes through <b>authentication</b>, <b>authorization</b> then <b>admission</b>. The difference: OpenShift provides its own <b>OAuth server</b> and adds objects (User, Group, Identity) and an extra admission step (SCC).</p>' },
        { t: 'flow', nodes: [
          { label: 'Client', sub: 'oc, console, ServiceAccount' },
          { label: 'Authn', sub: 'OAuth token, certificate, SA token', hl: true },
          { label: 'Authz', sub: 'RBAC (+ node authorizer)', hl: true },
          { label: 'Admission', sub: 'SCC, PSA, quotas, webhooks' },
          'etcd'
        ], caption: 'A refusal at step 2 gives “Forbidden”; a refusal at step 3 often gives “unable to validate against any security context constraint”.' },
        { t: 'callout', kind: 'k8s', html: 'RBAC is the <b>same engine</b> as upstream (Role, ClusterRole, bindings). OpenShift adds default roles, <code>oc adm policy</code> commands and the notion of Project.' }
      ]
    },
    {
      title: 'OAuth server and tokens',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          'The OAuth server runs in <code>openshift-authentication</code> (<code>authentication</code> operator), exposed by a Route.',
          'It delegates identity to one or more <b>Identity Providers</b> configured in the <code>OAuth/cluster</code> CR.',
          'After login, it issues an <b>access token</b> (<code>OAuthAccessToken</code> object, <code>sha256~</code> prefix), default lifetime <b>24 h</b>.',
          'The lifetime is set in <code>spec.tokenConfig.accessTokenMaxAgeSeconds</code> of the <code>OAuth</code> CR.'
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: '$ oc login --web https://api.cluster.example.com:6443\n$ oc whoami            # current user\n$ oc whoami -t         # current token (don\'t paste it into a ticket!)\n$ oc whoami --show-server\n$ oc get oauthaccesstokens | head\n$ oc logout            # revokes the token server-side' },
        { t: 'callout', kind: 'trap', wide: true, html: 'The token gives <b>all your rights</b> until it expires. Don\'t copy it into a CI script: use a <b>ServiceAccount</b> with <code>oc create token &lt;sa&gt; --duration=1h</code> (bound, expiring token). Old long-lived SA token secrets have no longer been created automatically since 4.11.' }
      ]
    },
    {
      title: 'User, Identity, Group, ServiceAccount',
      blocks: [
        { t: 'table', head: ['Object', 'Scope', 'Role'], rows: [
          ['<code>User</code>', 'Cluster', 'Created at the 1st login (not before). Name = <code>preferredUsername</code> from the IdP'],
          ['<code>Identity</code>', 'Cluster', 'Link <code>&lt;idp&gt;:&lt;external id&gt;</code> → User. One identity = one IdP'],
          ['<code>Group</code>', 'Cluster', 'List of users; created by hand, by LDAP sync; with the OAuth server + OpenID IdP, see the OIDC slide; with direct OIDC, no <code>Group</code> object'],
          ['<code>ServiceAccount</code>', 'Namespace', 'Identity of pods/automation: <code>system:serviceaccount:&lt;ns&gt;:&lt;name&gt;</code>'],
          ['System groups', '—', '<code>system:authenticated</code>, <code>system:authenticated:oauth</code>, <code>system:unauthenticated</code>']
        ] },
        { t: 'callout', kind: 'tip', html: 'A User “exists” only after its 1st login: you can still create a binding for it beforehand. <code>mappingMethod</code> (<code>claim</code> by default, <code>lookup</code>, <code>add</code>) decides how an identity is attached to a User: <b>keep <code>claim</code></b> unless you have a specific need, to avoid name collisions between IdPs.' }
      ]
    },
    {
      title: 'Configuring an IdP: LDAP / AD / IdM',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'oauth-cluster.yaml', code: [
          'apiVersion: config.openshift.io/v1',
          'kind: OAuth',
          'metadata:',
          '  name: cluster',
          'spec:',
          '  identityProviders:',
          '  - name: corp-ldap',
          '    mappingMethod: claim',
          '    type: LDAP',
          '    ldap:',
          '      url: "ldaps://ldap.corp.example.com/ou=users,dc=corp,dc=example,dc=com?uid"',
          '      bindDN: "cn=ocp-bind,ou=services,dc=corp,dc=example,dc=com"',
          '      bindPassword: { name: ldap-bind-secret }   # openshift-config Secret, key bindPassword',
          '      ca: { name: corp-ca }                      # openshift-config ConfigMap, key ca.crt',
          '      insecure: false',
          '      attributes:',
          '        id: [dn]',
          '        preferredUsername: [uid]',
          '        name: [cn]',
          '        email: [mail]'
        ].join('\n') },
        { t: 'callout', kind: 'onprem', html: 'On-site, your directory (AD, 389-ds, <b>FreeIPA/IdM</b>) is signed by an <b>internal CA</b>: provide it in a ConfigMap in <code>openshift-config</code> (key <code>ca.crt</code>), otherwise <code>insecure: true</code> would be your only option, hence to be avoided. Also open port 636 from the <b>control plane</b> nodes (where the OAuth server runs).' },
        { t: 'callout', kind: 'tip', html: 'Other available types: <code>HTPasswd</code> (lab, fallback), <code>OpenID</code>, <code>GitHub</code>, <code>GitLab</code>, <code>Google</code>, <code>Keystone</code>, <code>BasicAuth</code>, <code>RequestHeader</code>. Several IdPs can coexist.' }
      ]
    },
    {
      title: 'The default roles',
      blocks: [
        { t: 'table', head: ['Role', 'Usual scope', 'What it allows'], rows: [
          ['<code>cluster-admin</code>', 'Cluster', 'Everything, everywhere. Bound to a project: project super-admin'],
          ['<code>admin</code>', 'Project', 'Manages almost everything in the project <b>including RoleBindings</b> (grants rights to others)'],
          ['<code>edit</code>', 'Project', 'Creates/modifies application objects, <b>reads Secrets</b>, but does not manage RBAC'],
          ['<code>view</code>', 'Project', 'Read-only (not Secrets)'],
          ['<code>basic-user</code>', 'Cluster', 'See own info and the list of own projects (given to <code>system:authenticated</code>)'],
          ['<code>self-provisioner</code>', 'Cluster', 'Create own Projects (given to <code>system:authenticated:oauth</code>)'],
          ['<code>cluster-reader</code>', 'Cluster', 'Extended read-only on the cluster: support, audit, monitoring']
        ] },
        { t: 'callout', kind: 'trap', html: '<code>edit</code> reads Secrets <b>and</b> can deploy a pod with any ServiceAccount of the project: in practice, that is access to the project\'s tokens. Don\'t hand it out lightly on a project containing powerful SAs.' }
      ]
    },
    {
      title: 'Role, ClusterRole, bindings: the matrix',
      layout: 'two',
      blocks: [
        { t: 'table', wide: true, head: ['Role', 'Binding', 'Effect'], rows: [
          ['<code>Role</code>', '<code>RoleBinding</code>', 'Rights in <b>one</b> namespace'],
          ['<code>ClusterRole</code>', '<code>RoleBinding</code>', 'The ClusterRole\'s rights, <b>limited to that namespace</b> (the common case: <code>admin</code>, <code>edit</code>, <code>view</code>)'],
          ['<code>ClusterRole</code>', '<code>ClusterRoleBinding</code>', 'Rights on the <b>whole cluster</b> and all namespaces']
        ] },
        { t: 'code', lang: 'yaml', file: 'rolebinding.yaml', code: [
          'apiVersion: rbac.authorization.k8s.io/v1',
          'kind: RoleBinding',
          'metadata:',
          '  name: team-a-edit',
          '  namespace: team-a',
          'roleRef:',
          '  apiGroup: rbac.authorization.k8s.io',
          '  kind: ClusterRole',
          '  name: edit',
          'subjects:',
          '- apiGroup: rbac.authorization.k8s.io',
          '  kind: Group',
          '  name: team-a-devs'
        ].join('\n') },
        { t: 'callout', kind: 'trap', html: 'A <code>ClusterRoleBinding</code> on <code>edit</code> gives write access in <b>all</b> projects, including <code>openshift-*</code>. Almost always a mistake: use a <code>RoleBinding</code> that references the ClusterRole.' }
      ]
    },
    {
      title: 'oc adm policy: the daily routine',
      blocks: [
        { t: 'cmds', items: [
          ['oc adm policy add-role-to-user edit alice -n team-a', 'RoleBinding on the project (equivalent of the YAML alongside, user version)'],
          ['oc adm policy add-role-to-group view team-a-ro -n team-a', 'Same for a group (preferred)'],
          ['oc adm policy add-cluster-role-to-group cluster-reader ops-readonly', 'ClusterRoleBinding to a group'],
          ['oc adm policy remove-role-from-user edit alice -n team-a', 'Removes the binding'],
          ['oc adm policy who-can delete pods -n team-a', 'Who can do this? (users and groups)'],
          ['oc auth can-i create deployments -n team-a', 'Can I do this? (myself)'],
          ['oc auth can-i --list -n team-a --as alice', 'Everything Alice can do (impersonation: requires the <code>impersonate</code> right)'],
          ['oc adm policy scc-subject-review -f pod.yaml', 'Which SCCs would admit this pod for me?'],
          ['oc adm policy scc-subject-review -z my-sa -f pod.yaml', 'Same for a given ServiceAccount']
        ] },
        { t: 'callout', kind: 'tip', html: '<code>--as</code> and <code>--as-group</code> are your best RBAC debugging tool: “why can\'t Alice?” can be tested without knowing her password.' }
      ]
    },
    {
      title: 'Groups and LDAP synchronization',
      blocks: [
        { t: 'text', html: '<p>LDAP login does <b>not</b> create groups. <code>oc adm groups sync</code> reads the directory (<code>rfc2307</code>, <code>activeDirectory</code>, <code>augmentedActiveDirectory</code> schemas) and creates/updates <code>Group</code> objects.</p>' },
        { t: 'code', lang: 'yaml', file: 'ldap-sync.yaml', code: [
          'kind: LDAPSyncConfig',
          'apiVersion: v1',
          'url: ldaps://ldap.corp.example.com:636',
          'bindDN: cn=ocp-bind,ou=services,dc=corp,dc=example,dc=com',
          'bindPassword:',
          '  file: /etc/secrets/bindPassword',
          'ca: /etc/ldap-ca/ca.crt',
          'insecure: false',
          'rfc2307:',
          '  groupsQuery:',
          '    baseDN: "ou=groups,dc=corp,dc=example,dc=com"',
          '    scope: sub',
          '    derefAliases: never',
          '    filter: (cn=ocp-*)',
          '  groupUIDAttribute: dn',
          '  groupNameAttributes: [cn]',
          '  groupMembershipAttributes: [member]',
          '  usersQuery:',
          '    baseDN: "ou=users,dc=corp,dc=example,dc=com"',
          '    scope: sub',
          '    derefAliases: never',
          '  userUIDAttribute: dn',
          '  userNameAttributes: [uid]'
        ].join('\n') },
        { t: 'callout', kind: 'trap', html: 'The sync\'s <code>userNameAttributes</code> must give the <b>same value</b> as the IdP\'s <code>preferredUsername</code>, otherwise the Group members match no logged-in User.' }
      ]
    },
    {
      title: 'Automating the sync (CronJob) and cleaning up',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: '# Dry run (without --confirm: only displays)\n$ oc adm groups sync --sync-config=ldap-sync.yaml\n# Apply\n$ oc adm groups sync --sync-config=ldap-sync.yaml --confirm\n# Limit to a list of LDAP groups\n$ oc adm groups sync --sync-config=ldap-sync.yaml --whitelist=whitelist.txt --confirm\n# Groups that became orphaned on the LDAP side\n$ oc adm groups prune --sync-config=ldap-sync.yaml --confirm\n$ oc get groups' },
        { t: 'bullets', items: [
          'Official how-to: a <b>CronJob</b> in a dedicated namespace, with a ServiceAccount, a ClusterRole on <code>groups</code>, a ConfigMap (config + whitelist) and a Secret (bind password).',
          'Image: <code>registry.redhat.io/openshift4/ose-cli</code> (the docs cite the <code>latest</code> tag; pin a version in production).',
          'Alternative: the community <b>Group Sync Operator</b> (Red Hat COP), not shipped with the product: to be assessed on the support side.'
        ] },
        { t: 'callout', kind: 'warn', wide: true, html: 'A synchronized group is overwritten on every run: <b>never modify it by hand</b>. It carries <code>openshift.io/ldap.*</code> annotations that let the sync recognize it. A user removed from the directory loses membership at the next run, but their token stays valid until it expires.' }
      ]
    },
    {
      title: 'Groups via OIDC (claims)',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'oauth-oidc.yaml', code: [
          'spec:',
          '  identityProviders:',
          '  - name: keycloak',
          '    mappingMethod: claim',
          '    type: OpenID',
          '    openID:',
          '      clientID: openshift',
          '      clientSecret: { name: oidc-client-secret }',
          '      issuer: https://sso.corp.example.com/realms/corp',
          '      ca: { name: corp-ca }',
          '      extraScopes: [email, profile]',
          '      claims:',
          '        preferredUsername: [preferred_username]',
          '        name: [name]',
          '        email: [email]',
          '        groups: [groups]'
        ].join('\n') },
        { t: 'bullets', items: [
          '<b>Mode (a): OAuth server + <code>OpenID</code> IdP</b> (above): <code>claims.groups</code> (field of the OAuth server\'s IdP) has existed since 4.10 and <b>creates <code>Group</code> objects</b> synchronized at login.',
          'The group is only updated <b>at login</b>: a removal on the IdP side is only visible at the next login.',
          '<b>Mode (b): direct OIDC</b> (<code>Authentication</code> CR, <code>OIDC</code> type): GA in 4.20 (Technology Preview in 4.19). A single provider; the built-in OAuth server and the <code>User</code>, <code>Group</code> and <code>OAuth</code> APIs are <b>removed</b>: token groups are declared in <code>claimMappings.groups</code> (<code>claim</code> + <code>prefix</code>) and used directly for authorization, <b>no Group object is created</b>. Prerequisite: a long-lived admin connection (certificate kubeconfig, ServiceAccount token).'
        ] },
        { t: 'callout', kind: 'onprem', html: 'An internal SSO (Keycloak/RHBK, IdM + Keycloak, ADFS) must be reachable from the <b>browser</b> and from the <b>OAuth server</b>, with its CA: two network paths to test.' }
      ]
    },
    {
      title: 'HBAC: what are we really talking about?',
      tag: 'read this',
      blocks: [
        { t: 'text', html: '<p><b>Let\'s be honest:</b> “HBAC” (<i>Host-Based Access Control</i>) is <b>not</b> an OpenShift object. It is a <b>FreeIPA / Red Hat IdM</b> concept: rules like “<i>user or group X can use service Y on host Z</i>”, evaluated by <b>SSSD / PAM</b> on Linux machines. OpenShift evaluates no HBAC rule itself.</p>' },
        { t: 'table', head: ['“Who → what → where” question', 'Mechanism in the OCP ecosystem'], rows: [
          ['Who can open a shell on a node?', 'SSH key for <code>core</code>, <code>oc debug node</code> (RBAC + SCC), and upstream a bastion possibly subject to IdM HBAC rules'],
          ['Who can reach the API / the nodes?', 'Firewall, LB, network segmentation, <code>NetworkPolicy</code> (module 07)'],
          ['Which node can read what?', 'Node authorizer + <code>NodeRestriction</code> admission'],
          ['Who can query the kubelet?', 'RBAC on <code>nodes/proxy</code>, <code>nodes/log</code>, <code>nodes/stats</code>'],
          ['Who can authenticate to the IdP?', 'IdP authentication filter, HBAC rules <b>on the IdM side</b> if the path goes through PAM/SSSD']
        ] },
        { t: 'callout', kind: 'tip', html: 'So read “HBAC” in this module as <b>“controlling WHO reaches WHICH hosts and resources, and by what path”</b>. It is a useful analogy, not a feature.' }
      ]
    },
    {
      title: 'HBAC on the node side: SSH and oc debug',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          'RHCOS: <b>a single usable account</b>, <code>core</code>, by <b>SSH key only</b> (no password). The key from <code>install-config</code> is set at installation.',
          'Keys are then managed through <b>MachineConfig</b> (<code>master</code> / <code>worker</code> pools): not by editing <code>~/.ssh</code> on the node.',
          '<code>oc debug node/&lt;n&gt;</code> creates a privileged pod (hostPath, host namespaces) then <code>chroot /host</code>. It therefore requires being able to create such a pod: <b><code>privileged</code> SCC</b> + pod creation rights (in practice <code>cluster-admin</code>).',
          'Actions are <b>audited</b> on the API side (pod creation); direct SSH is not (local sshd log).'
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: '# Preferred: access through the API, traced in the audit\n$ oc debug node/worker-1\nsh-5.1# chroot /host\n\n# Who can create privileged pods?\n$ oc adm policy who-can use scc privileged\n\n# Who can read node logs / stats?\n$ oc adm policy who-can get nodes/log\n$ oc adm policy who-can get nodes/proxy' },
        { t: 'callout', kind: 'onprem', wide: true, html: 'Bare metal / vSphere: put the nodes in a management VLAN, close port 22 except from a <b>bastion</b>. If that bastion is joined to <b>IdM</b>, <b>IdM HBAC</b> rules legitimately control who can log in there (<code>sshd</code> service) and on which host. Also think about BMC/iDRAC access (Redfish), far more powerful than SSH.' }
      ]
    },
    {
      title: 'HBAC on the API side: node-restriction and nodes/proxy',
      blocks: [
        { t: 'layers', items: [
          { name: 'Network', desc: 'Who reaches api:6443, 22623 (MCS), 10250 (kubelet)? Firewall, LB, VLAN' },
          { name: 'Authn', desc: 'Kubelet client certificates (<code>system:node:&lt;name&gt;</code>), user tokens' },
          { name: 'Authz: Node authorizer + RBAC', desc: 'A kubelet only sees the Secrets/pods tied to <b>its</b> node', hl: true },
          { name: 'Admission: NodeRestriction', desc: 'A kubelet can only modify <b>its</b> Node object and its pods', hl: true }
        ] },
        { t: 'callout', kind: 'trap', html: 'The <code>nodes/proxy</code> right gives access to the kubelet API, hence <b>running commands in any pod of the node</b>, without going through <code>pods/exec</code> or the usual audit logs. Don\'t grant it to monitoring tools “because it works”: <code>nodes/metrics</code>, <code>nodes/stats</code> or <code>nodes/log</code> are usually enough.' },
        { t: 'callout', kind: 'ocp', html: 'Port <b>22623</b> (Machine Config Server) distributes the nodes\' Ignition, hence potentially secrets: it must only be reachable from the cluster nodes, never from user workstations.' }
      ]
    },
    {
      title: 'FreeIPA / IdM as an LDAP source: filtering access',
      layout: 'two',
      blocks: [
        { t: 'text', wide: true, html: '<p>When the IdP is IdM, the OAuth server does an <b>LDAP bind</b> with the user\'s password. That bind <b>does not evaluate</b> the HBAC rules (they live in SSSD/PAM). So we filter with an <b>LDAP query</b> and <b>groups</b>.</p>' },
        { t: 'code', lang: 'yaml', file: 'ldap-idm.yaml', code: [
          '# RFC 2255 URL: ldaps://host/baseDN?attribute?scope?filter',
          'ldap:',
          '  url: "ldaps://idm1.corp.example.com/cn=users,cn=accounts,dc=corp,dc=example,dc=com?uid?sub?(memberOf=cn=ocp-users,cn=groups,cn=accounts,dc=corp,dc=example,dc=com)"',
          '  attributes:',
          '    id: [ipaUniqueID]',
          '    preferredUsername: [uid]',
          '    name: [cn]',
          '    email: [mail]'
        ].join('\n') },
        { t: 'bullets', items: [
          'Only members of the IdM group <code>ocp-users</code> can log in: this is your “HBAC by analogy”.',
          'The <code>memberOf</code> attribute must be available on your IdM (memberOf plugin, active by default: to be verified).',
          'For <b>real</b> HBAC rules, you need a PAM/SSSD path, for example a <code>RequestHeader</code> IdP behind an Apache proxy authenticating via PAM: possible setup, heavier, to be validated before making it a requirement.'
        ] },
        { t: 'callout', kind: 'onprem', wide: true, html: 'Good reflex: one dedicated IdM group per OCP role (<code>ocp-users</code>, <code>ocp-admins</code>…), synchronized as an OCP <code>Group</code>, then bound to roles. The directory remains the source of truth, OCP only contains the bindings.' }
      ]
    },
    {
      title: 'Projects and multi-tenancy',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Project template', sub: 'projectRequestTemplate', hl: true },
          { label: 'admin RoleBinding', sub: 'creator or group' },
          { label: 'ResourceQuota + LimitRange' },
          { label: 'NetworkPolicy', sub: 'deny-all + exceptions' }
        ], caption: 'Every project is born with its guardrails.' },
        { t: 'code', lang: 'bash', file: 'terminal', code: '# 1. Remove the right to create projects from everyone\n$ oc adm policy remove-cluster-role-from-group self-provisioner system:authenticated:oauth\n# Without this annotation, the binding is recreated by the operator\n$ oc patch clusterrolebinding.rbac self-provisioners \\\n    -p \'{"metadata":{"annotations":{"rbac.authorization.kubernetes.io/autoupdate":"false"}}}\'\n\n# 2. Generate the base template then enrich it\n$ oc adm create-bootstrap-project-template -o yaml > project-template.yaml\n$ oc create -f project-template.yaml -n openshift-config\n$ oc edit project.config.openshift.io/cluster   # spec.projectRequestTemplate.name' },
        { t: 'callout', kind: 'tip', html: 'Once <code>self-provisioner</code> is removed, a process (ticket, GitOps) or a dedicated group creates the projects. A <code>project-creators</code> group bound to <code>self-provisioner</code> is a good compromise. The denial message can be customized via <code>spec.projectRequestMessage</code>.' }
      ]
    },
    {
      title: 'In the template: quotas, limits, network',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'project-template.yaml (excerpt)', code: [
          'apiVersion: template.openshift.io/v1',
          'kind: Template',
          'metadata:',
          '  name: project-request',
          '  namespace: openshift-config',
          'objects:',
          '- apiVersion: project.openshift.io/v1',
          '  kind: Project',
          '  metadata:',
          '    name: ${PROJECT_NAME}',
          '- apiVersion: rbac.authorization.k8s.io/v1',
          '  kind: RoleBinding',
          '  metadata: { name: admin, namespace: ${PROJECT_NAME} }',
          '  roleRef: { apiGroup: rbac.authorization.k8s.io, kind: ClusterRole, name: admin }',
          '  subjects:',
          '  - { apiGroup: rbac.authorization.k8s.io, kind: User, name: ${PROJECT_ADMIN_USER} }',
          '- apiVersion: v1',
          '  kind: ResourceQuota',
          '  metadata: { name: default-quota, namespace: ${PROJECT_NAME} }',
          '  spec: { hard: { requests.cpu: "8", requests.memory: 16Gi, pods: "50" } }',
          '- apiVersion: networking.k8s.io/v1',
          '  kind: NetworkPolicy',
          '  metadata: { name: deny-all, namespace: ${PROJECT_NAME} }',
          '  spec: { podSelector: {}, policyTypes: [Ingress] }',
          '# + LimitRange, allow-same-namespace, allow-from-openshift-ingress, allow-from-hostnetwork…',
          'parameters:',
          '- name: PROJECT_NAME',
          '- name: PROJECT_ADMIN_USER'
        ].join('\n') },
        { t: 'callout', kind: 'ocp', html: '<code>ClusterResourceQuota</code> (<code>quota.openshift.io</code>) caps the sum of resources of <b>several projects</b> selected by label or annotation (per team, per application). A bare <code>deny-all</code> also breaks the Route: plan the docs\' opening policies in the template: <code>allow-from-openshift-ingress</code> and, with HostNetwork routers, <code>allow-from-hostnetwork</code> (which one is enough depends on the publishing mode: to be verified; details, YAML and AdminNetworkPolicy: module 07).' }
      ]
    },
    {
      title: 'kubeadmin and break-glass',
      layout: 'two',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '🔑 kubeadmin', items: ['Temporary user created at install (cluster-admin)', 'Password in <code>auth/kubeadmin-password</code>', '<code>kubeadmin</code> Secret in <code>kube-system</code>', 'To be deleted after the IdP is configured', 'No more console login if the IdP is dead'] },
          right: { title: '🧯 Break-glass: admin kubeconfig', items: ['The installer\'s <code>auth/kubeconfig</code>: <code>system:admin</code> client certificate', 'Member of <code>system:masters</code>: bypasses RBAC', 'Does not go through OAuth: works with IdP/auth down', 'Long-lived certificate', 'A single file = the keys to the kingdom'] },
          verdict: 'Delete kubeadmin, keep the admin kubeconfig… under lock and key.' },
        { t: 'code', lang: 'bash', file: 'terminal', code: '# After validating that an IdP group is cluster-admin\n$ oc adm policy add-cluster-role-to-group cluster-admin platform-admins\n$ oc delete secret kubeadmin -n kube-system\n\n# Break-glass (never for day-to-day use)\n$ export KUBECONFIG=/secure/vault/auth/kubeconfig\n$ oc whoami\nsystem:admin' },
        { t: 'callout', kind: 'warn', wide: true, html: 'Deleting <code>kubeadmin</code> is <b>irreversible</b>. First check a real IdP cluster-admin login, and copy the admin kubeconfig to a vault (Vault, team KeePass) with traced access. On the control plane nodes, local kubeconfigs also exist for recovery (recovery procedures: to be verified in the docs for your version).' },
        { t: 'callout', kind: 'cloud', wide: true, html: 'ROSA/ARO/OSD: no installation kubeconfig for you. On ROSA, the IdP is configured via <code>rosa create idp</code> or OpenShift Cluster Manager, and you are <code>dedicated-admin</code> (on ROSA classic, <code>rosa grant user</code> can also grant <code>cluster-admin</code>: to be verified depending on the offering); ARO provides a <code>kubeadmin</code> account via the Azure portal/CLI and integrates with <b>Entra ID</b>. Exact scope: to be verified depending on the offering.' }
      ]
    },
    {
      title: 'SCC: authorization on pods',
      blocks: [
        { t: 'text', html: '<p><b>SecurityContextConstraints</b> decide what a <b>pod</b> is allowed to request (UID, capabilities, hostPath, host network…). The link with RBAC: using an SCC is an <b>RBAC permission</b> (verb <code>use</code> on the <code>securitycontextconstraints</code> resource).</p>' },
        { t: 'code', lang: 'yaml', file: 'role-scc.yaml', code: [
          'apiVersion: rbac.authorization.k8s.io/v1',
          'kind: ClusterRole',
          'metadata:',
          '  name: use-nonroot-v2',
          'rules:',
          '- apiGroups: ["security.openshift.io"]',
          '  resources: ["securitycontextconstraints"]',
          '  resourceNames: ["nonroot-v2"]',
          '  verbs: ["use"]'
        ].join('\n') },
        { t: 'cmds', items: [
          ['oc adm policy add-scc-to-user nonroot-v2 -z my-sa -n team-a', 'Allows this ServiceAccount to use the SCC'],
          ['oc adm policy who-can use scc privileged', 'Audit: who can create privileged pods?'],
          ['oc adm policy scc-subject-review -f pod.yaml', 'Diagnosis before deployment']
        ] },
        { t: 'callout', kind: 'trap', html: 'Giving an SCC to a <b>user</b> is not enough for a Deployment: the pod is created by a controller, so it is the <b>pod\'s ServiceAccount</b> that matters. Strategies, priorities and creating SCCs: module 09.' }
      ]
    },
    {
      title: 'Audit: who did what?',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Profile (<code>APIServer.spec.audit.profile</code>)', 'Content'], rows: [
          ['<code>Default</code>', 'Request metadata (no body); default'],
          ['<code>WriteRequestBodies</code>', 'Metadata + body of writes (create, update, patch, delete)'],
          ['<code>AllRequestBodies</code>', 'Body for reads too: voluminous, avoid long-term'],
          ['<code>None</code>', 'No audit: not recommended, and may affect support']
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: '$ oc patch apiserver cluster --type=merge \\\n    -p \'{"spec":{"audit":{"profile":"WriteRequestBodies"}}}\'\n\n# Read the API audit (by node role)\n$ oc adm node-logs --role=master --path=kube-apiserver/audit.log \\\n    | grep \'"verb":"delete"\' | head\n$ oc adm node-logs --role=master --path=oauth-server/audit.log   # logins\n$ oc adm node-logs --role=master --path=kube-apiserver/        # list of files' },
        { t: 'callout', kind: 'tip', wide: true, html: 'Logs are stored <b>on the control plane nodes</b>, with rotation: little retention. For compliance, forward them with the logging stack (<code>ClusterLogForwarder</code>, <code>audit</code> input) to your SIEM (configuration: module 05). The CR also allows <code>customRules</code> per user group (a different profile for <code>system:authenticated:oauth</code>, for example).' },
        { t: 'callout', kind: 'onprem', wide: true, html: 'On-site, the SIEM (Splunk, Elastic, central syslog) is yours: plan the network path, format and retention from the start.' }
      ]
    },
    {
      title: 'RBAC best practices',
      blocks: [
        { t: 'bullets', frag: true, items: [
          '<b>Groups, never users</b> in bindings: a person joining/leaving is managed in the directory.',
          '<b>Least privilege</b>: <code>RoleBinding</code> on a project rather than <code>ClusterRoleBinding</code>; <code>view</code> by default, <code>edit</code> for devs, <code>admin</code> for few people.',
          '<b>No permanent cluster-admin</b>: restricted group, named accounts, traced elevation.',
          '<b>No <code>system:authenticated</code>, nor <code>system:unauthenticated</code></b> in bindings you don\'t control.',
          '<b>Periodic review</b> of bindings (<code>oc get clusterrolebindings,rolebindings -A</code>) and of granted SCCs.',
          '<b>Bindings in Git</b> (GitOps): a rights change = a reviewed PR.'
        ] },
        { t: 'callout', kind: 'trap', html: 'Don\'t modify the default <code>admin</code>/<code>edit</code>/<code>view</code> roles: they are reconciled by the platform. To add rights (in-house CRDs), use <b>aggregation</b>: label <code>rbac.authorization.k8s.io/aggregate-to-edit: "true"</code> on a ClusterRole of your own.' }
      ]
    },
    {
      title: 'Quiz',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Alice logs in via LDAP, but appears in no Group even though the sync has run. Most likely cause?', options: [
          'LDAP does not support groups',
          'The sync\'s <code>userNameAttributes</code> does not match the IdP\'s <code>preferredUsername</code>',
          'Alice has no token',
          'The OAuth server must be restarted'
        ], answer: 1, explain: 'The Group contains user names coming from the sync; if they differ from the name of the User created at login (<code>preferredUsername</code>), there is no match.' },
        { t: 'quiz', q: 'An IdM HBAC rule forbids Bob from accessing the “openshift service”. Bob can nevertheless log in to the OCP console. Why?', options: [
          'OCP reads IdM\'s HBAC rules but ignores them',
          'The OAuth server\'s LDAP bind does not evaluate HBAC (that is SSSD/PAM); you must filter by LDAP group/filter',
          'Bob is cluster-admin',
          'HBAC rules only apply to ServiceAccounts'
        ], answer: 1, explain: 'HBAC is evaluated by SSSD/PAM on the hosts. OpenShift does a simple LDAP bind: restrict with a <code>memberOf</code> filter in the LDAP URL (or through an IdP going via PAM).' },
        { t: 'quiz', q: 'What is the cleanest way to give “edit” to team A on its own project only?', options: [
          '<code>ClusterRoleBinding</code> on <code>edit</code> for the group',
          '<code>RoleBinding</code> in <code>team-a</code> referencing the <code>edit</code> ClusterRole, subject = group',
          'Add each developer as <code>cluster-admin</code>',
          'Edit the default <code>edit</code> role'
        ], answer: 1, explain: 'A RoleBinding to a ClusterRole applies the rights in that namespace only.' },
        { t: 'quiz', q: 'You remove <code>self-provisioner</code> from <code>system:authenticated:oauth</code>, and the binding comes back after a while. What is missing?', options: [
          'A cluster restart',
          'The <code>rbac.authorization.kubernetes.io/autoupdate: "false"</code> annotation on the <code>self-provisioners</code> ClusterRoleBinding',
          'A quota',
          'Nothing, this is normal'
        ], answer: 1, explain: 'Default bindings are reconciled by auto-update; disable it so that your change persists.' }
      ]
    },
    {
      title: 'Lab: hardening a cluster\'s access',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'IdP, groups, scoped project and audit', goal: 'Test cluster with cluster-admin. An HTPasswd is enough if you have no LDAP (then replace the sync with <code>oc adm groups new</code>).', steps: [
          'Prerequisites: environment E0 (OpenShift Local) or E1 (SNO) as cluster-admin, see module 00',
          'Create an htpasswd file with <code>alice</code> and <code>bob</code>, a Secret in <code>openshift-config</code>, then an <code>HTPasswd</code> IdP in <code>OAuth/cluster</code>; wait for the <code>oauth-openshift</code> pod to redeploy.',
          'Log in as <code>alice</code>, then <code>oc whoami</code> and <code>oc get projects</code> (empty?).',
          'Create the groups: <code>oc adm groups new team-a-devs alice</code> and <code>oc adm groups new platform-admins bob</code>.',
          'Remove <code>self-provisioner</code> from <code>system:authenticated:oauth</code> (with the autoupdate annotation); check that <code>alice</code> can no longer create a project.',
          'Create <code>team-a</code> as admin, then <code>oc adm policy add-role-to-group edit team-a-devs -n team-a</code>.',
          'Test: <code>oc auth can-i create deployments -n team-a --as alice</code> (yes) and <code>-n openshift-config</code> (no); <code>oc adm policy who-can delete pods -n team-a</code>.',
          'Give <code>cluster-admin</code> to <code>platform-admins</code>, validate a login as <code>bob</code>, then delete <code>kubeadmin</code> (only on a disposable cluster).',
          '(bonus) Switch the audit to <code>WriteRequestBodies</code>, delete a pod as alice, find it with <code>oc adm node-logs --role=master --path=kube-apiserver/audit.log | grep alice</code>.'
        ] }
      ]
    }
  ],
  takeaways: [
    'OAuth server + IdP + tokens: identity comes from outside; User and Identity are created at the 1st login, Groups by LDAP sync or, depending on the OIDC mode, by claims (with direct OIDC: no Group object).',
    'RoleBinding + <code>admin/edit/view</code> ClusterRole on groups: the winning trio. Avoid ClusterRoleBinding and named users.',
    '“HBAC” is an IdM/SSSD concept, not an OCP object: on the OCP side, it translates into node access (<code>core</code>, <code>oc debug</code>), network, node-restriction, RBAC on <code>nodes/*</code>, and IdP authentication filters.',
    'Multi-tenancy: remove <code>self-provisioner</code> (with the autoupdate annotation) + project template (quota, LimitRange, NetworkPolicy, RoleBinding).',
    'Delete <code>kubeadmin</code> after validating an IdP cluster-admin; keep the admin kubeconfig in a vault as break-glass.',
    'Audit: <code>WriteRequestBodies</code> profile if needed, read via <code>oc adm node-logs</code>, forwarding to a SIEM for retention.'
  ]
});
