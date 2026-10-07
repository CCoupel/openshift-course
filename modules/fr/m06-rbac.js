COURSE.add({
  id: 'm06', lang: 'fr', num: 6, emoji: '🔐',
  title: 'HBAC / RBAC',
  tagline: 'Qui es-tu, que peux-tu faire, sur quoi, et depuis où ? Authentification, RBAC, groupes, projets, accès aux nœuds et audit.',
  duration: '≈ 60 min + lab 20 min',
  objectives: [
    'Comprendre la chaîne authn/authz d\'OpenShift (OAuth server, tokens, User/Identity/Group, ServiceAccounts)',
    'Maîtriser les rôles par défaut et les commandes <code>oc adm policy</code> / <code>oc auth can-i</code>',
    'Brancher LDAP/IdM ou OIDC, synchroniser les groupes et industrialiser la multi-tenance',
    'Situer honnêtement le « HBAC » : concept FreeIPA/SSSD, et ce qui joue ce rôle côté OCP (nœuds, API, SCC)',
    'Gérer kubeadmin, le break-glass et l\'audit'
  ],
  slides: [
    {
      title: 'La chaîne authn → authz → admission',
      blocks: [
        { t: 'text', html: '<p>Comme sur K8s : chaque requête passe par <b>authentification</b>, <b>autorisation</b> puis <b>admission</b>. La différence : OpenShift fournit son propre <b>serveur OAuth</b> et ajoute des objets (User, Group, Identity) et un admission supplémentaire (SCC).</p>' },
        { t: 'flow', nodes: [
          { label: 'Client', sub: 'oc, console, ServiceAccount' },
          { label: 'Authn', sub: 'token OAuth, certificat, SA token', hl: true },
          { label: 'Authz', sub: 'RBAC (+ node authorizer)', hl: true },
          { label: 'Admission', sub: 'SCC, PSA, quotas, webhooks' },
          'etcd'
        ], caption: 'Un refus à l\'étape 2 donne « Forbidden » ; un refus à l\'étape 3 donne souvent « unable to validate against any security context constraint ».' },
        { t: 'callout', kind: 'k8s', html: 'Le RBAC est le <b>même moteur</b> qu\'en upstream (Role, ClusterRole, bindings). OpenShift y ajoute des rôles par défaut, des commandes <code>oc adm policy</code> et la notion de Project.' }
      ]
    },
    {
      title: 'OAuth server et tokens',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          'Le serveur OAuth tourne dans <code>openshift-authentication</code> (opérateur <code>authentication</code>), exposé par une Route.',
          'Il délègue l\'identité à un ou plusieurs <b>Identity Providers</b> configurés dans le CR <code>OAuth/cluster</code>.',
          'Après login, il émet un <b>access token</b> (objet <code>OAuthAccessToken</code>, préfixe <code>sha256~</code>), durée par défaut <b>24 h</b>.',
          'La durée se règle dans <code>spec.tokenConfig.accessTokenMaxAgeSeconds</code> du CR <code>OAuth</code>.'
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: '$ oc login --web https://api.cluster.example.com:6443\n$ oc whoami            # utilisateur courant\n$ oc whoami -t         # token courant (à ne pas coller dans un ticket !)\n$ oc whoami --show-server\n$ oc get oauthaccesstokens | head\n$ oc logout            # révoque le token côté serveur' },
        { t: 'callout', kind: 'trap', wide: true, html: 'Le token donne <b>tous tes droits</b> jusqu\'à expiration. Ne le copie pas dans un script CI : utilise un <b>ServiceAccount</b> avec <code>oc create token &lt;sa&gt; --duration=1h</code> (token lié, expirant). Les anciens secrets de token SA longue durée ne sont plus créés automatiquement depuis la 4.11.' }
      ]
    },
    {
      title: 'User, Identity, Group, ServiceAccount',
      blocks: [
        { t: 'table', head: ['Objet', 'Portée', 'Rôle'], rows: [
          ['<code>User</code>', 'Cluster', 'Créé à la 1re connexion (pas avant). Nom = <code>preferredUsername</code> de l\'IdP'],
          ['<code>Identity</code>', 'Cluster', 'Lien <code>&lt;idp&gt;:&lt;id externe&gt;</code> → User. Une identité = un IdP'],
          ['<code>Group</code>', 'Cluster', 'Liste d\'utilisateurs ; créé à la main, par sync LDAP ; avec le serveur OAuth + IdP OpenID, voir la slide OIDC ; en OIDC direct, aucun objet <code>Group</code>'],
          ['<code>ServiceAccount</code>', 'Namespace', 'Identité des pods/automates : <code>system:serviceaccount:&lt;ns&gt;:&lt;nom&gt;</code>'],
          ['Groupes système', '—', '<code>system:authenticated</code>, <code>system:authenticated:oauth</code>, <code>system:unauthenticated</code>']
        ] },
        { t: 'callout', kind: 'tip', html: 'Un User « n\'existe » qu\'après son 1er login : tu peux pourtant lui créer un binding avant. <code>mappingMethod</code> (<code>claim</code> par défaut, <code>lookup</code>, <code>add</code>) décide comment une identité est rattachée à un User : <b>garde <code>claim</code></b> sauf besoin précis, pour éviter les collisions de noms entre IdP.' }
      ]
    },
    {
      title: 'Configurer un IdP : LDAP / AD / IdM',
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
          '      bindPassword: { name: ldap-bind-secret }   # Secret openshift-config, clé bindPassword',
          '      ca: { name: corp-ca }                      # ConfigMap openshift-config, clé ca.crt',
          '      insecure: false',
          '      attributes:',
          '        id: [dn]',
          '        preferredUsername: [uid]',
          '        name: [cn]',
          '        email: [mail]'
        ].join('\n') },
        { t: 'callout', kind: 'onprem', html: 'Sur site, ton annuaire (AD, 389-ds, <b>FreeIPA/IdM</b>) est signé par une <b>CA interne</b> : fournis-la dans une ConfigMap de <code>openshift-config</code> (clé <code>ca.crt</code>), sinon <code>insecure: true</code> serait ta seule option, donc à proscrire. Ouvre aussi le port 636 depuis les nœuds <b>control plane</b> (là où tourne le serveur OAuth).' },
        { t: 'callout', kind: 'tip', html: 'Autres types disponibles : <code>HTPasswd</code> (lab, secours), <code>OpenID</code>, <code>GitHub</code>, <code>GitLab</code>, <code>Google</code>, <code>Keystone</code>, <code>BasicAuth</code>, <code>RequestHeader</code>. Plusieurs IdP peuvent coexister.' }
      ]
    },
    {
      title: 'Les rôles par défaut',
      blocks: [
        { t: 'table', head: ['Rôle', 'Portée usuelle', 'Ce qu\'il permet'], rows: [
          ['<code>cluster-admin</code>', 'Cluster', 'Tout, partout. Lié à un projet : super-admin du projet'],
          ['<code>admin</code>', 'Projet', 'Gère presque tout dans le projet <b>y compris les RoleBindings</b> (donne des droits à d\'autres)'],
          ['<code>edit</code>', 'Projet', 'Crée/modifie les objets applicatifs, <b>lit les Secrets</b>, mais ne gère pas le RBAC'],
          ['<code>view</code>', 'Projet', 'Lecture seule (pas les Secrets)'],
          ['<code>basic-user</code>', 'Cluster', 'Voir ses infos et la liste de ses projets (donné à <code>system:authenticated</code>)'],
          ['<code>self-provisioner</code>', 'Cluster', 'Créer ses propres Projects (donné à <code>system:authenticated:oauth</code>)'],
          ['<code>cluster-reader</code>', 'Cluster', 'Lecture seule étendue sur le cluster : support, audit, supervision']
        ] },
        { t: 'callout', kind: 'trap', html: '<code>edit</code> lit les Secrets <b>et</b> peut déployer un pod avec n\'importe quel ServiceAccount du projet : c\'est, en pratique, un accès aux jetons du projet. Ne le distribue pas à la légère sur un projet contenant des SA puissants.' }
      ]
    },
    {
      title: 'Role, ClusterRole, bindings : la matrice',
      layout: 'two',
      blocks: [
        { t: 'table', wide: true, head: ['Rôle', 'Binding', 'Effet'], rows: [
          ['<code>Role</code>', '<code>RoleBinding</code>', 'Droits dans <b>un</b> namespace'],
          ['<code>ClusterRole</code>', '<code>RoleBinding</code>', 'Les droits du ClusterRole, <b>limités à ce namespace</b> (le cas courant : <code>admin</code>, <code>edit</code>, <code>view</code>)'],
          ['<code>ClusterRole</code>', '<code>ClusterRoleBinding</code>', 'Droits sur <b>tout le cluster</b> et tous les namespaces']
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
        { t: 'callout', kind: 'trap', html: 'Un <code>ClusterRoleBinding</code> sur <code>edit</code> donne l\'écriture dans <b>tous</b> les projets, y compris <code>openshift-*</code>. Presque toujours une erreur : utilise un <code>RoleBinding</code> qui référence le ClusterRole.' }
      ]
    },
    {
      title: 'oc adm policy : le quotidien',
      blocks: [
        { t: 'cmds', items: [
          ['oc adm policy add-role-to-user edit alice -n team-a', 'RoleBinding sur le projet (équivalent du YAML ci-contre, version utilisateur)'],
          ['oc adm policy add-role-to-group view team-a-ro -n team-a', 'Idem pour un groupe (à préférer)'],
          ['oc adm policy add-cluster-role-to-group cluster-reader ops-readonly', 'ClusterRoleBinding vers un groupe'],
          ['oc adm policy remove-role-from-user edit alice -n team-a', 'Retire le binding'],
          ['oc adm policy who-can delete pods -n team-a', 'Qui peut faire ça ? (utilisateurs et groupes)'],
          ['oc auth can-i create deployments -n team-a', 'Puis-je faire ça ? (moi-même)'],
          ['oc auth can-i --list -n team-a --as alice', 'Tout ce qu\'Alice peut faire (impersonation : exige le droit <code>impersonate</code>)'],
          ['oc adm policy scc-subject-review -f pod.yaml', 'Quels SCC admettraient ce pod pour moi ?'],
          ['oc adm policy scc-subject-review -z my-sa -f pod.yaml', 'Idem pour un ServiceAccount donné']
        ] },
        { t: 'callout', kind: 'tip', html: '<code>--as</code> et <code>--as-group</code> sont ton meilleur outil de débogage RBAC : « pourquoi Alice ne peut pas ? » se teste sans connaître son mot de passe.' }
      ]
    },
    {
      title: 'Groupes et synchronisation LDAP',
      blocks: [
        { t: 'text', html: '<p>Le login LDAP ne crée <b>pas</b> les groupes. <code>oc adm groups sync</code> lit l\'annuaire (schémas <code>rfc2307</code>, <code>activeDirectory</code>, <code>augmentedActiveDirectory</code>) et crée/met à jour des objets <code>Group</code>.</p>' },
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
        { t: 'callout', kind: 'trap', html: '<code>userNameAttributes</code> du sync doit donner la <b>même valeur</b> que <code>preferredUsername</code> de l\'IdP, sinon les membres du Group ne correspondent à aucun User connecté.' }
      ]
    },
    {
      title: 'Automatiser le sync (CronJob) et nettoyer',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: '# Simulation (sans --confirm : affiche seulement)\n$ oc adm groups sync --sync-config=ldap-sync.yaml\n# Application\n$ oc adm groups sync --sync-config=ldap-sync.yaml --confirm\n# Limiter à une liste de groupes LDAP\n$ oc adm groups sync --sync-config=ldap-sync.yaml --whitelist=whitelist.txt --confirm\n# Groupes devenus orphelins côté LDAP\n$ oc adm groups prune --sync-config=ldap-sync.yaml --confirm\n$ oc get groups' },
        { t: 'bullets', items: [
          'Mode d\'emploi officiel : un <b>CronJob</b> dans un namespace dédié, avec ServiceAccount, ClusterRole sur <code>groups</code>, ConfigMap (config + whitelist) et Secret (bind password).',
          'Image : <code>registry.redhat.io/openshift4/ose-cli</code> (la doc cite le tag <code>latest</code> ; épingle une version en production).',
          'Alternative : l\'opérateur communautaire <b>Group Sync Operator</b> (Red Hat COP), non fourni par le produit : à évaluer côté support.'
        ] },
        { t: 'callout', kind: 'warn', wide: true, html: 'Un groupe synchronisé est écrasé à chaque passage : <b>ne le modifie jamais à la main</b>. Il porte des annotations <code>openshift.io/ldap.*</code> qui permettent au sync de le reconnaître. Un utilisateur retiré de l\'annuaire perd son appartenance au prochain run, mais son token reste valable jusqu\'à expiration.' }
      ]
    },
    {
      title: 'Groupes via OIDC (claims)',
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
          '<b>Mode (a) : serveur OAuth + IdP <code>OpenID</code></b> (ci-dessus) : <code>claims.groups</code> (champ de l\'IdP du serveur OAuth) existe depuis 4.10 et <b>crée des objets <code>Group</code></b> synchronisés au login.',
          'Le groupe n\'est mis à jour qu\'<b>à la connexion</b> : un retrait côté IdP n\'est visible qu\'au login suivant.',
          '<b>Mode (b) : OIDC direct</b> (CR <code>Authentication</code>, type <code>OIDC</code>) : GA en 4.20 (Technology Preview en 4.19). Un seul fournisseur ; le serveur OAuth intégré et les API <code>User</code>, <code>Group</code> et <code>OAuth</code> sont <b>retirés</b> : les groupes du jeton se déclarent dans <code>claimMappings.groups</code> (<code>claim</code> + <code>prefix</code>) et servent directement à l\'autorisation, <b>aucun objet Group n\'est créé</b>. Prérequis : une connexion admin de longue durée (kubeconfig à certificat, jeton de ServiceAccount).'
        ] },
        { t: 'callout', kind: 'onprem', html: 'Un SSO interne (Keycloak/RHBK, IdM + Keycloak, ADFS) doit être joignable depuis le <b>navigateur</b> et depuis le <b>serveur OAuth</b>, avec sa CA : deux chemins réseau à tester.' }
      ]
    },
    {
      title: 'HBAC : de quoi parle-t-on vraiment ?',
      tag: 'à lire',
      blocks: [
        { t: 'text', html: '<p><b>Soyons honnêtes :</b> « HBAC » (<i>Host-Based Access Control</i>) n\'est <b>pas</b> un objet OpenShift. C\'est un concept <b>FreeIPA / Red Hat IdM</b> : des règles « <i>l\'utilisateur ou groupe X peut utiliser le service Y sur l\'hôte Z</i> », évaluées par <b>SSSD / PAM</b> sur les machines Linux. OpenShift n\'évalue aucune règle HBAC lui-même.</p>' },
        { t: 'table', head: ['Question « qui → quoi → où »', 'Mécanisme dans l\'écosystème OCP'], rows: [
          ['Qui peut ouvrir un shell sur un nœud ?', 'Clé SSH de <code>core</code>, <code>oc debug node</code> (RBAC + SCC), et en amont un bastion éventuellement soumis à des règles HBAC IdM'],
          ['Qui peut joindre l\'API / les nœuds ?', 'Pare-feu, LB, segmentation réseau, <code>NetworkPolicy</code> (module 07)'],
          ['Quel nœud peut lire quoi ?', 'Node authorizer + admission <code>NodeRestriction</code>'],
          ['Qui peut interroger le kubelet ?', 'RBAC sur <code>nodes/proxy</code>, <code>nodes/log</code>, <code>nodes/stats</code>'],
          ['Qui peut s\'authentifier à l\'IdP ?', 'Filtre d\'authentification de l\'IdP, règles HBAC <b>côté IdM</b> si le chemin passe par PAM/SSSD']
        ] },
        { t: 'callout', kind: 'tip', html: 'Lis donc « HBAC » dans ce module comme <b>« contrôler QUI atteint QUELS hôtes et ressources, et par quel chemin »</b>. C\'est une analogie utile, pas une fonctionnalité.' }
      ]
    },
    {
      title: 'HBAC côté nœuds : SSH et oc debug',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          'RHCOS : <b>un seul compte</b> utilisable, <code>core</code>, par <b>clé SSH uniquement</b> (pas de mot de passe). La clé de l\'<code>install-config</code> est posée à l\'installation.',
          'Les clés se gèrent ensuite par <b>MachineConfig</b> (pools <code>master</code> / <code>worker</code>) : pas par édition de <code>~/.ssh</code> sur le nœud.',
          '<code>oc debug node/&lt;n&gt;</code> crée un pod privilégié (hostPath, host namespaces) puis <code>chroot /host</code>. Il exige donc de pouvoir créer un tel pod : <b>SCC <code>privileged</code></b> + droits de création de pods (en pratique <code>cluster-admin</code>).',
          'Les actions sont <b>auditées</b> côté API (création du pod) ; le SSH direct ne l\'est pas (journal sshd local).'
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: '# Préféré : accès via l\'API, tracé dans l\'audit\n$ oc debug node/worker-1\nsh-5.1# chroot /host\n\n# Qui peut créer des pods privilégiés ?\n$ oc adm policy who-can use scc privileged\n\n# Qui peut lire les logs / stats des nœuds ?\n$ oc adm policy who-can get nodes/log\n$ oc adm policy who-can get nodes/proxy' },
        { t: 'callout', kind: 'onprem', wide: true, html: 'Bare metal / vSphere : place les nœuds dans un VLAN de gestion, ferme le 22 sauf depuis un <b>bastion</b>. Si ce bastion est joint à <b>IdM</b>, des règles <b>HBAC IdM</b> y contrôlent légitimement qui peut se connecter (service <code>sshd</code>) et sur quel hôte. Pense aussi à l\'accès BMC/iDRAC (Redfish), bien plus puissant que SSH.' }
      ]
    },
    {
      title: 'HBAC côté API : node-restriction et nodes/proxy',
      blocks: [
        { t: 'layers', items: [
          { name: 'Réseau', desc: 'Qui atteint api:6443, 22623 (MCS), 10250 (kubelet) ? Pare-feu, LB, VLAN' },
          { name: 'Authn', desc: 'Certificats client des kubelets (<code>system:node:&lt;nom&gt;</code>), tokens utilisateurs' },
          { name: 'Authz : Node authorizer + RBAC', desc: 'Un kubelet ne voit que les Secrets/pods liés à <b>son</b> nœud', hl: true },
          { name: 'Admission : NodeRestriction', desc: 'Un kubelet ne peut modifier que <b>son</b> objet Node et ses pods', hl: true }
        ] },
        { t: 'callout', kind: 'trap', html: 'Le droit <code>nodes/proxy</code> donne accès à l\'API kubelet, donc <b>exécuter des commandes dans n\'importe quel pod du nœud</b>, sans passer par <code>pods/exec</code> ni les journaux d\'audit habituels. Ne l\'accorde pas à des outils de supervision « parce que ça marche » : <code>nodes/metrics</code>, <code>nodes/stats</code> ou <code>nodes/log</code> suffisent le plus souvent.' },
        { t: 'callout', kind: 'ocp', html: 'Le port <b>22623</b> (Machine Config Server) distribue l\'Ignition des nœuds, donc potentiellement des secrets : il ne doit être joignable que depuis les nœuds du cluster, jamais depuis les postes utilisateurs.' }
      ]
    },
    {
      title: 'FreeIPA / IdM comme source LDAP : filtrer l\'accès',
      layout: 'two',
      blocks: [
        { t: 'text', wide: true, html: '<p>Quand l\'IdP est IdM, le serveur OAuth fait un <b>bind LDAP</b> avec le mot de passe de l\'utilisateur. Ce bind <b>n\'évalue pas</b> les règles HBAC (elles vivent dans SSSD/PAM). On filtre donc par <b>requête LDAP</b> et <b>groupes</b>.</p>' },
        { t: 'code', lang: 'yaml', file: 'ldap-idm.yaml', code: [
          '# URL RFC 2255 : ldaps://hôte/baseDN?attribut?portée?filtre',
          'ldap:',
          '  url: "ldaps://idm1.corp.example.com/cn=users,cn=accounts,dc=corp,dc=example,dc=com?uid?sub?(memberOf=cn=ocp-users,cn=groups,cn=accounts,dc=corp,dc=example,dc=com)"',
          '  attributes:',
          '    id: [ipaUniqueID]',
          '    preferredUsername: [uid]',
          '    name: [cn]',
          '    email: [mail]'
        ].join('\n') },
        { t: 'bullets', items: [
          'Seuls les membres du groupe IdM <code>ocp-users</code> peuvent se connecter : c\'est ton « HBAC par analogie ».',
          'L\'attribut <code>memberOf</code> doit être disponible sur ton IdM (plugin memberOf, actif par défaut : à vérifier).',
          'Pour de <b>vraies</b> règles HBAC, il faut un chemin PAM/SSSD, par exemple IdP <code>RequestHeader</code> derrière un proxy Apache authentifiant via PAM : montage possible, plus lourd, à valider avant d\'en faire une exigence.'
        ] },
        { t: 'callout', kind: 'onprem', wide: true, html: 'Bon réflexe : un groupe IdM dédié par rôle OCP (<code>ocp-users</code>, <code>ocp-admins</code>…), synchronisé en <code>Group</code> OCP, puis lié aux rôles. L\'annuaire reste la source de vérité, OCP ne contient que les bindings.' }
      ]
    },
    {
      title: 'Projets et multi-tenance',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Project template', sub: 'projectRequestTemplate', hl: true },
          { label: 'RoleBinding admin', sub: 'créateur ou groupe' },
          { label: 'ResourceQuota + LimitRange' },
          { label: 'NetworkPolicy', sub: 'deny-all + exceptions' }
        ], caption: 'Tout projet naît avec ses garde-fous.' },
        { t: 'code', lang: 'bash', file: 'terminal', code: '# 1. Retirer le droit de créer des projets à tout le monde\n$ oc adm policy remove-cluster-role-from-group self-provisioner system:authenticated:oauth\n# Sans cette annotation, le binding est recréé par l\'opérateur\n$ oc patch clusterrolebinding.rbac self-provisioners \\\n    -p \'{"metadata":{"annotations":{"rbac.authorization.kubernetes.io/autoupdate":"false"}}}\'\n\n# 2. Générer le template de base puis l\'enrichir\n$ oc adm create-bootstrap-project-template -o yaml > project-template.yaml\n$ oc create -f project-template.yaml -n openshift-config\n$ oc edit project.config.openshift.io/cluster   # spec.projectRequestTemplate.name' },
        { t: 'callout', kind: 'tip', html: 'Une fois <code>self-provisioner</code> retiré, c\'est un process (ticket, GitOps) ou un groupe dédié qui crée les projets. Un groupe <code>project-creators</code> lié à <code>self-provisioner</code> est un bon compromis. Le message de refus se personnalise via <code>spec.projectRequestMessage</code>.' }
      ]
    },
    {
      title: 'Dans le template : quotas, limites, réseau',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'project-template.yaml (extrait)', code: [
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
        { t: 'callout', kind: 'ocp', html: '<code>ClusterResourceQuota</code> (<code>quota.openshift.io</code>) plafonne la somme des ressources de <b>plusieurs projets</b> sélectionnés par label ou annotation (par équipe, par application). Un <code>deny-all</code> nu casse aussi la Route : prévois dans le template les policies d\'ouverture de la doc : <code>allow-from-openshift-ingress</code> et, avec des routeurs en HostNetwork, <code>allow-from-hostnetwork</code> (laquelle suffit selon le mode de publication : à vérifier ; détail, YAML et AdminNetworkPolicy : module 07).' }
      ]
    },
    {
      title: 'kubeadmin et break-glass',
      layout: 'two',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '🔑 kubeadmin', items: ['Utilisateur temporaire créé à l\'install (cluster-admin)', 'Mot de passe dans <code>auth/kubeadmin-password</code>', 'Secret <code>kubeadmin</code> dans <code>kube-system</code>', 'À supprimer après configuration de l\'IdP', 'Plus de login console si IdP mort'] },
          right: { title: '🧯 Break-glass : kubeconfig admin', items: ['<code>auth/kubeconfig</code> de l\'installeur : certificat client <code>system:admin</code>', 'Membre de <code>system:masters</code> : contourne le RBAC', 'Ne passe pas par OAuth : marche IdP/auth en panne', 'Certificat à longue durée de vie', 'Un seul fichier = les clés du royaume'] },
          verdict: 'Supprime kubeadmin, garde le kubeconfig admin… sous clé.' },
        { t: 'code', lang: 'bash', file: 'terminal', code: '# Après avoir validé qu\'un groupe de l\'IdP est cluster-admin\n$ oc adm policy add-cluster-role-to-group cluster-admin platform-admins\n$ oc delete secret kubeadmin -n kube-system\n\n# Break-glass (jamais pour le quotidien)\n$ export KUBECONFIG=/secure/vault/auth/kubeconfig\n$ oc whoami\nsystem:admin' },
        { t: 'callout', kind: 'warn', wide: true, html: 'Supprimer <code>kubeadmin</code> est <b>irréversible</b>. Vérifie d\'abord un vrai login IdP cluster-admin, et copie le kubeconfig admin dans un coffre (Vault, KeePass d\'équipe) avec accès tracé. Sur les nœuds control plane, des kubeconfig locaux existent aussi pour la reprise (procédures de recovery : à vérifier dans la doc de ta version).' },
        { t: 'callout', kind: 'cloud', wide: true, html: 'ROSA/ARO/OSD : pas de kubeconfig d\'installation à toi. En ROSA, l\'IdP se configure via <code>rosa create idp</code> ou OpenShift Cluster Manager, et tu es <code>dedicated-admin</code> (sur ROSA classic, <code>rosa grant user</code> permet aussi d\'accorder <code>cluster-admin</code> : à vérifier selon l\'offre) ; ARO fournit un compte <code>kubeadmin</code> via le portail/CLI Azure et s\'intègre à <b>Entra ID</b>. Périmètre exact : à vérifier selon l\'offre.' }
      ]
    },
    {
      title: 'SCC : l\'autorisation sur les pods',
      blocks: [
        { t: 'text', html: '<p>Les <b>SecurityContextConstraints</b> décident ce qu\'un <b>pod</b> a le droit de demander (UID, capabilities, hostPath, host network…). Le lien avec le RBAC : l\'usage d\'un SCC est une <b>permission RBAC</b> (verbe <code>use</code> sur la ressource <code>securitycontextconstraints</code>).</p>' },
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
          ['oc adm policy add-scc-to-user nonroot-v2 -z my-sa -n team-a', 'Autorise ce ServiceAccount à utiliser le SCC'],
          ['oc adm policy who-can use scc privileged', 'Audit : qui peut créer des pods privilégiés ?'],
          ['oc adm policy scc-subject-review -f pod.yaml', 'Diagnostic avant déploiement']
        ] },
        { t: 'callout', kind: 'trap', html: 'Donner un SCC à un <b>utilisateur</b> ne suffit pas pour un Deployment : le pod est créé par un contrôleur, c\'est le <b>ServiceAccount du pod</b> qui compte. Stratégies, priorités et création de SCC : module 09.' }
      ]
    },
    {
      title: 'Audit : qui a fait quoi ?',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Profil (<code>APIServer.spec.audit.profile</code>)', 'Contenu'], rows: [
          ['<code>Default</code>', 'Métadonnées des requêtes (pas de corps) ; défaut'],
          ['<code>WriteRequestBodies</code>', 'Métadonnées + corps des écritures (create, update, patch, delete)'],
          ['<code>AllRequestBodies</code>', 'Corps aussi pour les lectures : volumineux, à éviter durablement'],
          ['<code>None</code>', 'Aucun audit : déconseillé, et peut affecter le support']
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: '$ oc patch apiserver cluster --type=merge \\\n    -p \'{"spec":{"audit":{"profile":"WriteRequestBodies"}}}\'\n\n# Lire l\'audit API (par rôle de nœud)\n$ oc adm node-logs --role=master --path=kube-apiserver/audit.log \\\n    | grep \'"verb":"delete"\' | head\n$ oc adm node-logs --role=master --path=oauth-server/audit.log   # logins\n$ oc adm node-logs --role=master --path=kube-apiserver/        # liste des fichiers' },
        { t: 'callout', kind: 'tip', wide: true, html: 'Les logs sont stockés <b>sur les nœuds control plane</b>, avec rotation : peu de rétention. Pour de la conformité, expédie-les avec la stack de logging (<code>ClusterLogForwarder</code>, entrée <code>audit</code>) vers ton SIEM (configuration : module 05). Le CR permet aussi des <code>customRules</code> par groupe d\'utilisateurs (profil différent pour <code>system:authenticated:oauth</code>, par exemple).' },
        { t: 'callout', kind: 'onprem', wide: true, html: 'Sur site, le SIEM (Splunk, Elastic, syslog central) est le tien : prévois le chemin réseau, le format et la rétention dès le départ.' }
      ]
    },
    {
      title: 'Bonnes pratiques RBAC',
      blocks: [
        { t: 'bullets', frag: true, items: [
          '<b>Des groupes, jamais des utilisateurs</b> dans les bindings : l\'arrivée/départ d\'une personne se gère dans l\'annuaire.',
          '<b>Moindre privilège</b> : <code>RoleBinding</code> sur un projet plutôt que <code>ClusterRoleBinding</code> ; <code>view</code> par défaut, <code>edit</code> pour les devs, <code>admin</code> pour peu de monde.',
          '<b>Pas de cluster-admin permanent</b> : groupe restreint, comptes nominatifs, élévation tracée.',
          '<b>Pas de <code>system:authenticated</code>, ni de <code>system:unauthenticated</code></b> dans des bindings que tu ne maîtrises pas.',
          '<b>Revue périodique</b> des bindings (<code>oc get clusterrolebindings,rolebindings -A</code>) et des SCC accordés.',
          '<b>Les bindings en Git</b> (GitOps) : un changement de droits = une PR relue.'
        ] },
        { t: 'callout', kind: 'trap', html: 'Ne modifie pas les rôles <code>admin</code>/<code>edit</code>/<code>view</code> par défaut : ils sont réconciliés par la plateforme. Pour ajouter des droits (CRD maison), utilise l\'<b>agrégation</b> : label <code>rbac.authorization.k8s.io/aggregate-to-edit: "true"</code> sur un ClusterRole à toi.' }
      ]
    },
    {
      title: 'Quiz',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Alice se connecte via LDAP, mais n\'apparaît dans aucun Group et le sync a pourtant tourné. Cause la plus probable ?', options: [
          'Le LDAP ne supporte pas les groupes',
          '<code>userNameAttributes</code> du sync ne correspond pas à <code>preferredUsername</code> de l\'IdP',
          'Alice n\'a pas de token',
          'Il faut redémarrer le serveur OAuth'
        ], answer: 1, explain: 'Le Group contient des noms d\'utilisateur issus du sync ; s\'ils diffèrent du nom du User créé au login (<code>preferredUsername</code>), il n\'y a aucune correspondance.' },
        { t: 'quiz', q: 'Une règle HBAC IdM interdit à Bob l\'accès au « service openshift ». Bob peut pourtant se connecter à la console OCP. Pourquoi ?', options: [
          'OCP lit les règles HBAC de l\'IdM mais les ignore',
          'Le bind LDAP du serveur OAuth n\'évalue pas HBAC (c\'est SSSD/PAM) ; il faut filtrer par groupe/filtre LDAP',
          'Bob est cluster-admin',
          'Les règles HBAC ne s\'appliquent qu\'aux ServiceAccounts'
        ], answer: 1, explain: 'HBAC est évalué par SSSD/PAM sur les hôtes. OpenShift fait un simple bind LDAP : on restreint avec un filtre <code>memberOf</code> dans l\'URL LDAP (ou via un IdP passant par PAM).' },
        { t: 'quiz', q: 'Quel est le moyen le plus propre de donner « edit » à l\'équipe A sur son seul projet ?', options: [
          '<code>ClusterRoleBinding</code> sur <code>edit</code> pour le groupe',
          '<code>RoleBinding</code> dans <code>team-a</code> référençant le ClusterRole <code>edit</code>, sujet = groupe',
          'Ajouter chaque développeur comme <code>cluster-admin</code>',
          'Éditer le rôle <code>edit</code> par défaut'
        ], answer: 1, explain: 'Un RoleBinding vers un ClusterRole applique les droits dans ce seul namespace.' },
        { t: 'quiz', q: 'Tu retires <code>self-provisioner</code> de <code>system:authenticated:oauth</code>, et le binding revient après un moment. Que manque-t-il ?', options: [
          'Un redémarrage du cluster',
          'L\'annotation <code>rbac.authorization.kubernetes.io/autoupdate: "false"</code> sur le ClusterRoleBinding <code>self-provisioners</code>',
          'Un quota',
          'Rien, c\'est normal'
        ], answer: 1, explain: 'Les bindings par défaut sont réconciliés à l\'auto-update ; désactive-le pour que ta modification persiste.' }
      ]
    },
    {
      title: 'Lab : durcir les accès d\'un cluster',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'IdP, groupes, projet cadré et audit', goal: 'Cluster de test avec cluster-admin. Un HTPasswd suffit si tu n\'as pas de LDAP (remplace alors le sync par <code>oc adm groups new</code>).', steps: [
          'Prérequis : environnement E0 (OpenShift Local) ou E1 (SNO) en cluster-admin, voir module 00',
          'Crée un fichier htpasswd avec <code>alice</code> et <code>bob</code>, un Secret dans <code>openshift-config</code>, puis un IdP <code>HTPasswd</code> dans <code>OAuth/cluster</code> ; attends le redéploiement du pod <code>oauth-openshift</code>.',
          'Connecte-toi en <code>alice</code>, puis <code>oc whoami</code> et <code>oc get projects</code> (vide ?).',
          'Crée les groupes : <code>oc adm groups new team-a-devs alice</code> et <code>oc adm groups new platform-admins bob</code>.',
          'Retire <code>self-provisioner</code> de <code>system:authenticated:oauth</code> (avec l\'annotation autoupdate) ; vérifie qu\'<code>alice</code> ne peut plus créer de projet.',
          'Crée <code>team-a</code> en admin, puis <code>oc adm policy add-role-to-group edit team-a-devs -n team-a</code>.',
          'Teste : <code>oc auth can-i create deployments -n team-a --as alice</code> (oui) et <code>-n openshift-config</code> (non) ; <code>oc adm policy who-can delete pods -n team-a</code>.',
          'Donne <code>cluster-admin</code> à <code>platform-admins</code>, valide un login de <code>bob</code>, puis supprime <code>kubeadmin</code> (uniquement sur un cluster jetable).',
          '(bonus) Passe l\'audit en <code>WriteRequestBodies</code>, supprime un pod en tant qu\'alice, retrouve-le avec <code>oc adm node-logs --role=master --path=kube-apiserver/audit.log | grep alice</code>.'
        ] }
      ]
    }
  ],
  takeaways: [
    'OAuth server + IdP + tokens : l\'identité vient de l\'extérieur ; User et Identity sont créés au 1er login, les Group par sync LDAP ou, selon le mode OIDC, par claims (avec l\'OIDC direct : pas d\'objet Group).',
    'RoleBinding + ClusterRole <code>admin/edit/view</code> sur des groupes : le trio gagnant. Évite ClusterRoleBinding et utilisateurs nominatifs.',
    '« HBAC » est un concept IdM/SSSD, pas un objet OCP : côté OCP, il se traduit par accès aux nœuds (<code>core</code>, <code>oc debug</code>), réseau, node-restriction, RBAC sur <code>nodes/*</code>, et filtres d\'authentification de l\'IdP.',
    'Multi-tenance : retirer <code>self-provisioner</code> (avec l\'annotation autoupdate) + project template (quota, LimitRange, NetworkPolicy, RoleBinding).',
    'Supprime <code>kubeadmin</code> après validation d\'un cluster-admin IdP ; garde le kubeconfig admin en coffre comme break-glass.',
    'Audit : profil <code>WriteRequestBodies</code> si besoin, lecture via <code>oc adm node-logs</code>, expédition vers un SIEM pour la rétention.'
  ]
});
