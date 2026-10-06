COURSE.add({
  id: 'm09', num: 9, emoji: '🛡️',
  title: 'Sécurité avancée',
  tagline: 'Au-delà du RBAC : ce qu\'un pod a le droit de faire (SCC, PSA), ce qu\'on lui donne à exécuter (images, secrets) et comment prouver que le cluster est conforme.',
  duration: '≈ 60 min + lab 20 min',
  objectives: [
    'Maîtriser les SCC : SCC prédéfinies, stratégies, sélection, création d\'une SCC dédiée',
    'Diagnostiquer un pod refusé avec <code>oc adm policy scc-subject-review</code> et les événements',
    'Articuler SCC et Pod Security Admission (labels, synchronisation, alertes)',
    'Choisir une approche pour les images signées et les secrets (External Secrets, Secrets Store CSI)',
    'Lancer un scan avec le Compliance Operator et situer le File Integrity Operator et ACS'
  ],
  slides: [
    {
      title: 'Les couches de sécurité d\'un pod',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Image', sub: 'source, signature' },
          { label: 'Admission', sub: 'SCC + PSA', hl: true },
          { label: 'Runtime', sub: 'CRI-O, SELinux, seccomp' },
          { label: 'Secrets', sub: 'etcd, externes' },
          { label: 'Conformité', sub: 'scans, intégrité' }
        ], caption: 'Le RBAC (module 06) dit <b>qui</b> peut créer un pod ; la <b>SCC</b> dit <b>ce que ce pod</b> a le droit de demander.' },
        { t: 'bullets', frag: true, items: [
          '<b>Propriétaire des SCC</b> : ce module. Les modules 01, 06 et 08 n\'en gardent que l\'usage et renvoient ici.',
          'Frontières : RBAC et OAuth → module 06 ; activation du chiffrement etcd et sources de registres → module 04 ; sauvegarde → module 11 ; NetworkPolicy → module 07.',
          'Version de référence : <b>4.20 EUS</b>. Les points dont le statut change entre 4.20 et 4.21 ou 4.22 sont datés.'
        ] },
        { t: 'callout', kind: 'k8s', html: "Sur K8s, tu connais PodSecurityPolicy (retiré) puis Pod Security Admission. OpenShift a <b>ses SCC depuis toujours</b>, antérieures à PSP, et y ajoute PSA : les deux coexistent." }
      ]
    },
    {
      title: 'SCC : ce qu\'un pod peut demander',
      blocks: [
        { t: 'text', html: "<p>Une <b>SecurityContextConstraints</b> est un objet <b>cluster</b> qui décrit un ensemble de droits d'exécution : utilisateur, capabilities, volumes, accès à l'hôte, SELinux… À la création d'un pod, l'admission <b>choisit une SCC</b> compatible avec ce que le pod demande et avec les droits de celui qui le crée.</p>" },
        { t: 'table', head: ['Ce que la SCC contrôle', 'Exemple de champs'], rows: [
          ['Identité d\'exécution', '<code>runAsUser</code>, <code>fsGroup</code>, <code>supplementalGroups</code>, <code>seLinuxContext</code>'],
          ['Privilèges', '<code>allowPrivilegedContainer</code>, <code>allowedCapabilities</code>, <code>requiredDropCapabilities</code>'],
          ['Accès à l\'hôte', '<code>allowHostNetwork</code>, <code>allowHostDirVolumePlugin</code> (hostPath), host PID/IPC'],
          ['Types de volumes', '<code>volumes</code> (liste blanche)'],
          ['Qui peut l\'utiliser', '<code>users</code>, <code>groups</code> (ou, mieux, le verbe RBAC <code>use</code>)']
        ] },
        { t: 'callout', kind: 'ocp', html: "La SCC <b>valide et modifie</b> : elle peut <b>assigner</b> un UID du namespace, un contexte SELinux, un <code>fsGroup</code>, des capabilities supprimées. C'est ce qui rend l'UID aléatoire de <code>restricted-v2</code> possible." }
      ]
    },
    {
      title: 'Les SCC prédéfinies',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['SCC', 'En bref'], rows: [
          ['<code>restricted-v2</code>', 'Défaut des utilisateurs authentifiés (la doc 4.20 le dit dans sa table) : non-root, capabilities supprimées, seccomp <code>runtime/default</code>'],
          ['<code>restricted-v3</code>', 'Comme <code>restricted-v2</code> mais impose un <b>user namespace</b> (<code>hostUsers: false</code>) ; nouveauté 4.20. La doc 4.20 le décrit aussi comme « la plus restrictive » et « utilisée par défaut » : formulation ambiguë à lire dans la doc ; <code>restricted-v2</code> reste celle que la table donne par défaut'],
          ['<code>nested-container</code>', 'Comme <code>restricted-v2</code> avec SELinux <code>container_engine_t</code>, <code>runAsUser: MustRunAsRange</code> et user namespace imposé : exécuter un moteur de conteneurs <b>dans</b> un pod (nouveauté 4.20)'],
          ['<code>nonroot-v2</code>', 'Autorise un UID fixe non-root (avec capabilities supprimées)'],
          ['<code>anyuid</code>', 'Restreint, mais <b>n\'importe quel UID/GID</b> (y compris root)'],
          ['<code>hostnetwork-v2</code>, <code>hostaccess</code>, <code>hostmount-anyuid</code>', 'Accès au réseau ou à l\'hôte, de plus en plus larges'],
          ['<code>privileged</code>', 'Tout est permis : hôte, privilèges, n\'importe quel UID'],
          ['<code>node-exporter</code>', 'Réservé au node-exporter de Prometheus']
        ] },
        { t: 'callout', kind: 'warn', html: "<b>Ne modifie jamais</b> les SCC par défaut : la doc prévient que les personnaliser peut poser problème au déploiement de pods de la plateforme ou à la mise à jour. Pour un besoin particulier, <b>crée une SCC dédiée</b>." },
        { t: 'callout', kind: 'tip', html: "Liste complète et à jour : <code>oc get scc</code>. Il existe aussi une SCC <code>restricted</code> historique ; elle n'est plus le choix par défaut." }
      ]
    },
    {
      title: 'restricted-v2 : ce que ça change pour ton image',
      blocks: [
        { t: 'bullets', frag: true, items: [
          '<b>UID aléatoire</b> pris dans la plage du namespace : l\'image ne doit pas dépendre d\'un UID fixe ni écrire dans des dossiers root-only.',
          '<b>Toutes les capabilities supprimées</b> ; seule <code>NET_BIND_SERVICE</code> peut être ajoutée explicitement.',
          '<b>seccomp</b> : profil <code>runtime/default</code> par défaut.',
          '<code>allowPrivilegeEscalation</code> doit être non défini ou à <code>false</code>.',
          '<b>SELinux</b> : un label MCS propre au namespace (<code>s0:cX,cY</code>) isole les projets entre eux.'
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "# Plages attribuées au namespace\n$ oc get ns demo -o yaml | grep sa.scc\n#   openshift.io/sa.scc.mcs: s0:c26,c15\n#   openshift.io/sa.scc.supplemental-groups: 1000680000/10000\n#   openshift.io/sa.scc.uid-range: 1000680000/10000\n\n# SCC effectivement attribuée à un pod\n$ oc get pod web-abc -o jsonpath='{.metadata.annotations.openshift\\.io/scc}'" },
        { t: 'callout', kind: 'trap', html: "L'image doit s'adapter à la SCC, <b>pas l'inverse</b> : port &gt; 1024, dossiers en <code>g=u</code>, pas de <code>USER</code> en dur. C'est le sujet du piège n°1 du module 01 ; ici on voit comment l'assouplir proprement quand c'est vraiment nécessaire." }
      ]
    },
    {
      title: 'Les stratégies : MustRunAs, RunAsAny…',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Champ', 'Stratégies disponibles'], rows: [
          ['<code>runAsUser</code>', '<code>MustRunAs</code>, <code>MustRunAsRange</code>, <code>MustRunAsNonRoot</code>, <code>RunAsAny</code>'],
          ['<code>seLinuxContext</code>', '<code>MustRunAs</code>, <code>RunAsAny</code>'],
          ['<code>fsGroup</code>', '<code>MustRunAs</code>, <code>RunAsAny</code>'],
          ['<code>supplementalGroups</code>', '<code>MustRunAs</code>, <code>RunAsAny</code>']
        ] },
        { t: 'bullets', items: [
          '<b>MustRunAs…</b> : la SCC <b>impose</b> (ou valide dans) une valeur ; si le pod n\'en demande pas, elle l\'assigne.',
          '<b>MustRunAsRange</b> : l\'UID doit tomber dans une plage (celle du namespace par défaut).',
          '<b>MustRunAsNonRoot</b> : tout UID sauf 0, mais le pod doit en fournir un.',
          '<b>RunAsAny</b> : aucune contrainte (c\'est ce qui rend <code>anyuid</code> dangereux).'
        ] },
        { t: 'callout', kind: 'tip', wide: true, html: "Quand une image a besoin d'un <b>UID fixe non-root</b>, la bonne SCC est <code>nonroot-v2</code> (ou une SCC dédiée avec <code>MustRunAsNonRoot</code>), pas <code>anyuid</code>." }
      ]
    },
    {
      title: 'Comment OCP choisit la SCC d\'un pod',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Pod créé', sub: 'par user ou ServiceAccount' },
          { label: 'SCC utilisables', sub: 'droit « use » (module 06)' },
          { label: 'Tri', sub: 'priorité, puis restriction, puis nom', hl: true },
          { label: 'Première qui valide', sub: 'annotation openshift.io/scc' }
        ], caption: 'Les SCC sont triées : <b>priorité la plus haute</b> d\'abord ; à priorité égale, <b>de la plus restrictive à la moins restrictive</b> ; sinon par nom.' },
        { t: 'bullets', frag: true, items: [
          'La <b>première</b> SCC de la liste qui admet le pod est retenue et inscrite dans l\'annotation <code>openshift.io/scc</code>.',
          '<code>anyuid</code> a une <b>priorité</b> (10 par défaut) alors que <code>restricted-v2</code> n\'en a aucune : un ServiceAccount autorisé à utiliser les deux obtient <b><code>anyuid</code></b>. Elle n\'impose pas root, mais une image sans <code>USER</code> tourne alors <b>en root</b> : c\'est le danger.',
          'Pour <b>forcer</b> une SCC précise, annote la charge avec <code>openshift.io/required-scc</code>.'
        ] },
        { t: 'callout', kind: 'trap', html: "Le même pod peut <b>changer de SCC</b> si on accorde ou retire des droits : la SCC se recalcule à la création du pod, pas à celle du Deployment. Teste avec <code>scc-subject-review</code> (slide suivante)." }
      ]
    },
    {
      title: 'Diagnostiquer un pod refusé',
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
      runAsUser: 0           # demande root : refusé par restricted-v2` },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc apply -f root-pod.yaml\n# Erreur du type : unable to validate against any security context constraint\n\n$ oc get events --sort-by=.lastTimestamp | tail\n\n# Quelles SCC admettraient ce pod pour moi, ou pour un ServiceAccount ?\n$ oc adm policy scc-subject-review -f root-pod.yaml\n$ oc adm policy scc-subject-review -u system:serviceaccount:team-a:mon-sa -f root-pod.yaml" },
        { t: 'bullets', wide: true, items: [
          '<code>scc-subject-review</code> renvoie la <b>liste des SCC qui admettraient</b> la ressource, pour un utilisateur ou un compte (<code>-u</code>, <code>-g</code>).',
          'Pour un Deployment, le pod est créé par un contrôleur : c\'est le <b>ServiceAccount du pod</b> qui compte, pas toi (module 06).'
        ] }
      ]
    },
    {
      title: 'Créer une SCC dédiée',
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
          'Pars de la plus <b>proche</b> SCC prédéfinie et ne retire/n\'ajoute que le <b>minimum</b> ; ne laisse pas <code>RunAsAny</code> « par commodité ».',
          '<b>Liste blanche de volumes</b> : pas de <code>hostPath</code> sans raison.',
          'N\'utilise pas <code>users</code>/<code>groups</code> : l\'accès se donne par RBAC (slide suivante).'
        ] },
        { t: 'callout', kind: 'warn', html: "Champs, valeurs par défaut et noms exacts : vérifie avec <code>oc explain securitycontextconstraints</code> sur ta version avant de copier cet exemple." }
      ]
    },
    {
      title: 'Accorder une SCC proprement',
      layout: 'two',
      blocks: [
        { t: 'cmds', wide: true, items: [
          ['oc create sa mon-sa -n team-a', 'ServiceAccount utilisé par la charge'],
          ['oc create clusterrole use-nonroot-bind80 --verb=use --resource=scc --resource-name=nonroot-bind80', 'Rôle qui n\'autorise <b>que</b> cette SCC (verbe <code>use</code>)'],
          ['oc create rolebinding mon-sa-scc --clusterrole=use-nonroot-bind80 --serviceaccount=team-a:mon-sa -n team-a', 'Lien limité au namespace'],
          ['oc adm policy who-can use scc nonroot-bind80', 'Audit : qui peut utiliser cette SCC ?'],
          ['oc adm policy add-scc-to-user nonroot-bind80 -z mon-sa -n team-a', 'Raccourci historique équivalent']
        ] },
        { t: 'callout', kind: 'trap', html: "Le réflexe « <code>add-scc-to-user anyuid</code> » règle le symptôme et ouvre une faille : l'image n'est <b>pas réparée</b> et plus rien ne limite ses privilèges. Ordre de préférence : <b>réparer l'image</b>, puis <code>nonroot-v2</code> ou une SCC dédiée, puis (en dernier recours, tracé) <code>anyuid</code>." },
        { t: 'callout', kind: 'tip', html: "Côté autorisation (verbe <code>use</code>, ServiceAccount vs utilisateur, rôles) : module 06. Ici : le contenu de la SCC et son choix." }
      ]
    },
    {
      title: 'Pod Security Admission : modes et profils',
      blocks: [
        { t: 'table', head: ['Mode', 'Effet', 'Label de namespace'], rows: [
          ['<code>enforce</code>', 'Refuse les pods non conformes', '<code>pod-security.kubernetes.io/enforce</code>'],
          ['<code>audit</code>', 'Journalise les violations (audit log)', '<code>pod-security.kubernetes.io/audit</code>'],
          ['<code>warn</code>', 'Avertit l\'utilisateur à la création', '<code>pod-security.kubernetes.io/warn</code>']
        ] },
        { t: 'bullets', frag: true, items: [
          'Profils standards K8s : <code>privileged</code>, <code>baseline</code>, <code>restricted</code>.',
          '<b>Configuration globale</b> : le profil <code>privileged</code> est <b>appliqué</b> (enforce) et <code>restricted</code> sert pour les avertissements et l\'audit : la SCC reste donc le garde-fou effectif.',
          'Une violation au niveau audit déclenche l\'alerte <code>PodSecurityViolation</code>.'
        ] },
        { t: 'callout', kind: 'k8s', html: "PSA est l'implémentation <b>standard K8s</b> : elle valide seulement. La SCC, spécifique à OpenShift, <b>valide et assigne</b> (UID, SELinux…). Les deux s'exécutent à l'admission." }
      ]
    },
    {
      title: 'Synchronisation SCC ↔ PSA',
      layout: 'two',
      blocks: [
        { t: 'text', html: "<p>Pour éviter des avertissements incohérents, OpenShift <b>synchronise automatiquement</b> les labels PSA des namespaces à partir des SCC que les ServiceAccounts du namespace peuvent utiliser.</p>" },
        { t: 'code', lang: 'bash', file: 'terminal', code: "# Activer / désactiver la synchronisation sur un namespace\n$ oc label namespace demo security.openshift.io/scc.podSecurityLabelSync=true\n$ oc label namespace demo security.openshift.io/scc.podSecurityLabelSync=false\n\n# Poser un profil à la main sur un namespace\n$ oc label namespace demo pod-security.kubernetes.io/enforce=restricted --overwrite" },
        { t: 'bullets', items: [
          '<b>Exclus en permanence</b> : <code>default</code>, <code>kube-node-lease</code>, <code>kube-system</code>, <code>kube-public</code>, <code>openshift</code> et les namespaces système <code>openshift-*</code> (sauf <code>openshift-operators</code>).',
          'Les namespaces <code>openshift-*</code> créés par un utilisateur démarrent <b>sans</b> synchronisation ; tu peux l\'activer ensuite.',
          'Modifier à la main un label synchronisé <b>désactive</b> la synchronisation pour ce label.'
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: "Poser <code>enforce=restricted</code> sur un namespace qui héberge des Operators ou des pods privilégiés casse leur déploiement. Commence par <code>warn</code> et <code>audit</code>, lis les alertes, puis passe en <code>enforce</code>." }
      ]
    },
    {
      title: 'Images : sources, signatures, digests',
      blocks: [
        { t: 'table', head: ['Levier', 'Rôle', 'Où'], rows: [
          ['<b>Registres autorisés</b>', 'Liste blanche des registres de pull', '<code>Image.spec.registrySources</code>, module 04'],
          ['<b>Miroirs</b>', 'Redirection vers ton registre interne', '<code>ImageDigestMirrorSet</code> / <code>ImageTagMirrorSet</code>, module 03 (<code>ImageContentSourcePolicy</code> déprécié)'],
          ['<b>Signatures sigstore</b>', 'Vérifier qu\'une image est signée avant de la lancer', '<code>ClusterImagePolicy</code> (cluster), <code>ImagePolicy</code> (namespace)'],
          ['<b>Digests</b>', 'Référencer <code>image@sha256:…</code> plutôt qu\'un tag mouvant', 'Tes manifests / pipelines']
        ] },
        { t: 'bullets', frag: true, items: [
          'Avec <code>ClusterImagePolicy</code>, le MCO met à jour <code>/etc/containers/policy.json</code> et <code>registries.d/sigstore-registries.yaml</code> sur <b>tous les nœuds</b> ; <code>ImagePolicy</code> vise un namespace.',
          'Une politique décrit des <b>scopes</b> (images, dépôts ou registres) et une <b>racine de confiance</b> (clé publique, PKI ou Fulcio).',
          'Si une image d\'<code>ImagePolicy</code> est couverte par un scope de <code>ClusterImagePolicy</code>, <b>seule la politique cluster s\'applique</b>.'
        ] },
        { t: 'callout', kind: 'warn', html: "<b>Statut en 4.20</b> : <code>ClusterImagePolicy</code> et <code>ImagePolicy</code> sont <b>GA</b> (<code>apiVersion: config.openshift.io/v1</code>, release notes 4.20). Restent en <b>Technology Preview</b> : la politique par défaut <code>openshift</code> (GA en 4.21 d\'après la doc) et le chargement de certificats <b>BYOPKI</b> (<code>v1alpha1</code>, feature set <code>TechPreviewNoUpgrade</code>, donc pas pour de la production : module 04). Ne modifie pas la politique <code>openshift</code>." }
      ]
    },
    {
      title: 'Secrets : au-delà du Secret K8s',
      blocks: [
        { t: 'text', html: "<p>Un <code>Secret</code> K8s est de l'<b>encodage</b>, pas du chiffrement : quiconque lit l'objet (RBAC) le lit en clair. Trois leviers, complémentaires.</p>" },
        { t: 'compare', wide: true,
          left: { title: '🔐 Protéger les Secrets dans le cluster', items: ['<b>Chiffrement etcd</b> : données au repos dans etcd (activation : module 04)', 'RBAC strict sur <code>secrets</code> (module 06)', 'Ne pas les mettre dans Git en clair'] },
          right: { title: '🏦 Garder le secret ailleurs', items: ['<b>External Secrets Operator</b> : synchronise un coffre (Vault, gestionnaires cloud, CyberArk Conjur…) vers des Secrets K8s', '<b>Secrets Store CSI Driver</b> : monte le secret dans le pod via un volume, sans Secret K8s obligatoire', 'Rotation et audit côté coffre'] },
          verdict: 'ESO : simple pour les applis qui lisent des Secrets. CSI : le secret n\'existe que dans le pod. Les deux supposent un coffre.' },
        { t: 'callout', kind: 'ocp', html: "<b>External Secrets Operator for Red Hat OpenShift</b> est GA à partir de 4.20 (Operator du catalogue Red Hat, ressource <code>ExternalSecretsConfig</code> pour l'activer ; objets <code>SecretStore</code>, <code>ClusterSecretStore</code>, <code>ExternalSecret</code>). <code>ExternalSecretsConfig</code> est en <code>operator.openshift.io/v1alpha1</code> d\'après la doc et des guides (confiance moyenne) ; <code>apiVersion</code> des <code>ExternalSecret</code> et statut du <b>Secrets Store CSI Driver</b> en 4.20 : à vérifier dans les release notes." },
        { t: 'callout', kind: 'onprem', wide: true, html: "On-prem, le coffre (Vault, CyberArk…) est le tien : accès réseau, haute disponibilité et CA à prévoir. En cloud, le gestionnaire de secrets du fournisseur s'intègre nativement." }
      ]
    },
    {
      title: 'Compliance Operator : concepts',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Profile', sub: 'ocp4-cis, ocp4-moderate…' },
          { label: 'ScanSettingBinding', sub: 'profils + ScanSetting', hl: true },
          { label: 'ComplianceSuite / Scan', sub: 'lancés par l\'Operator' },
          { label: 'CheckResult', sub: 'PASS / FAIL / MANUAL' },
          { label: 'Remediation', sub: 'correctif proposé' }
        ], caption: 'Même logique que RBAC : tu <b>lies</b> des profils à des réglages (planning, stockage), l\'Operator fait le reste. Namespace de l\'Operator : <code>openshift-compliance</code>.' },
        { t: 'table', head: ['Profil', 'Portée'], rows: [
          ['<code>ocp4-cis</code> / <code>ocp4-cis-node</code>', 'Benchmark CIS : plateforme OpenShift / nœuds'],
          ['<code>ocp4-moderate</code> / <code>ocp4-moderate-node</code>', 'NIST 800-53 Moderate : plateforme / nœuds'],
          ['<code>ocp4-pci-dss</code> / <code>ocp4-pci-dss-node</code>', 'PCI-DSS : plateforme / nœuds'],
          ['<code>rhcos4-moderate</code>', 'NIST 800-53 Moderate pour RHCOS']
        ] },
        { t: 'callout', kind: 'warn', html: "Liste des profils disponibles en 4.20 (dont un éventuel profil ANSSI) : <b>à vérifier</b> avec <code>oc get profiles.compliance -n openshift-compliance</code> sur ton cluster et dans la doc du Compliance Operator." }
      ]
    },
    {
      title: 'Compliance Operator : lancer un scan',
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
          'Le binding sur le <code>ScanSetting</code> <code>default</code> crée une <code>ComplianceSuite</code> puis des <code>ComplianceScan</code> ; les résultats sont des <code>ComplianceCheckResult</code>.',
          'Un FAIL n\'est pas toujours une faute : certains contrôles sont <b>MANUAL</b> ou non applicables à ton contexte ; documente les écarts acceptés.'
        ] }
      ]
    },
    {
      title: 'Remédiations et File Integrity Operator',
      blocks: [
        { t: 'bullets', items: [
          '<b>ComplianceRemediation</b> : le correctif proposé pour un FAIL (souvent un MachineConfig ou une ressource de config). Tu l\'appliques volontairement ; un correctif de nœud passe par le MCO donc par un <b>rolling reboot</b> (module 02).',
          '<b>Applique en lot, jamais à l\'aveugle</b> : lis chaque remédiation, teste sur un cluster de lab, planifie la fenêtre.',
          '<b>File Integrity Operator</b> : un DaemonSet AIDE vérifie en continu les fichiers des nœuds (utile sur RHCOS pour détecter des modifications hors MachineConfig).'
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
        { t: 'callout', kind: 'warn', html: "Le namespace <code>openshift-file-integrity</code> doit porter le label PSA <code>privileged</code> à la création (AIDE tourne en privilégié). Comportement d'un correctif de conformité sur un SNO (reboot de l'unique nœud) : à anticiper." }
      ]
    },
    {
      title: 'RHCOS, FIPS et ACS : survol',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          '<b>SELinux</b> est <b>activé</b> sur RHCOS : c\'est ce qui sépare les projets entre eux (label MCS du namespace).',
          '<b>FIPS</b> : se décide <b>à l\'installation</b> (<code>fips: true</code> dans <code>install-config.yaml</code>, module 03) ; on ne l\'active pas après coup. Statut de validation des modules cryptographiques en 4.20 : à vérifier.',
          '<b>ACS</b> (Red Hat Advanced Cluster Security for Kubernetes) : vulnérabilités d\'images, politiques de déploiement, détection à l\'exécution, conformité. Se déploie via un Operator ; <b>hors périmètre</b> de ce cours (licence et version : à vérifier).'
        ] },
        { t: 'callout', kind: 'onprem', html: "FIPS, SELinux et les durcissements d'OS sont <b>à ta charge</b> sur ton infra : ce sont des décisions d'architecture à prendre avec la sécurité <b>avant</b> l'installation." },
        { t: 'callout', kind: 'cloud', html: "En managé, le durcissement des nœuds est géré par le fournisseur ; il reste à ta charge côté charges applicatives (SCC, images, secrets)." }
      ]
    },
    {
      title: 'Quiz',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Un ServiceAccount a le droit d\'utiliser <code>restricted-v2</code> et <code>anyuid</code>. Son pod ne demande rien de particulier. Quelle SCC est retenue ?', options: ['<code>restricted-v2</code>, car elle est plus restrictive', 'Aucune, le pod est refusé : deux SCC sont en conflit', 'La SCC la plus récemment créée', '<code>anyuid</code>, car sa priorité (10) passe avant <code>restricted-v2</code> qui n\'en a pas'], answer: 3, explain: 'Le tri place d\'abord les SCC de plus haute priorité : <code>anyuid</code> (10 par défaut) passe avant <code>restricted-v2</code> (sans priorité). La restrictivité ne départage que des SCC de <b>même priorité</b>. <code>anyuid</code> n\'impose pas root, mais une image sans <code>USER</code> tournera en root.' },
        { t: 'quiz', q: 'Quel label désactive ou active la synchronisation SCC ↔ PSA sur un namespace ?', options: ['<code>security.openshift.io/scc.podSecurityLabelSync</code>', '<code>pod-security.kubernetes.io/sync</code>', '<code>openshift.io/required-scc</code>', '<code>pod-security.kubernetes.io/enforce</code>'], answer: 0, explain: '<code>security.openshift.io/scc.podSecurityLabelSync=true|false</code> pilote la synchronisation. <code>enforce</code> pose le profil appliqué ; <code>required-scc</code> impose une SCC à une charge.' },
        { t: 'quiz', q: 'Quelle ressource déclenche l\'exécution d\'un scan avec le Compliance Operator ?', options: ['<code>ComplianceCheckResult</code>', '<code>ScanSettingBinding</code>', '<code>ComplianceRemediation</code>', '<code>FileIntegrity</code>'], answer: 1, explain: 'Le <code>ScanSettingBinding</code> lie des profils à un <code>ScanSetting</code> ; l\'Operator crée alors la suite et les scans. Les <code>ComplianceCheckResult</code> sont le résultat.' }
      ]
    },
    {
      title: 'Lab : SCC dédiée et premier scan de conformité',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'Pod refusé, SCC minimale, scan CIS', goal: 'Noyau en séance sur un SNO (cluster-admin). Ce lab sert de fusible : en cas de retard, finis-le en ouverture du jour 3.', steps: [
          'Prérequis : environnement E1 (SNO) avec <code>cluster-admin</code>, voir module 00 ; crée un projet <code>m09-lab</code>.',
          'Applique <code>root-pod.yaml</code> (slide « Diagnostiquer un pod refusé ») : lis l\'erreur et les événements, puis lance <code>oc adm policy scc-subject-review -f root-pod.yaml</code> pour voir quelles SCC l\'admettraient.',
          'Crée la SCC <code>nonroot-bind80</code>, un ServiceAccount, un <code>ClusterRole</code> avec le verbe <code>use</code> et un <code>RoleBinding</code> limité au projet ; contrôle avec <code>oc adm policy who-can use scc nonroot-bind80</code>.',
          'Déploie un pod non-root avec ce ServiceAccount (<code>runAsUser</code> fixe non nul) et vérifie l\'annotation <code>openshift.io/scc</code> ; essaie ensuite avec <code>runAsUser: 0</code> et explique le refus.',
          'Installe le <b>Compliance Operator</b> depuis OperatorHub dans <code>openshift-compliance</code> (approbation à ton choix, module 04) et crée le <code>ScanSettingBinding</code> <code>cis</code> de la slide.',
          'Attends la fin du scan puis liste les <code>FAIL</code> avec <code>oc get compliancecheckresult -n openshift-compliance -l compliance.openshift.io/check-status=FAIL</code> ; choisis-en un, lis sa <code>ComplianceRemediation</code> et dis si tu l\'appliquerais.',
          '(bonus) Pose <code>pod-security.kubernetes.io/warn=restricted</code> et <code>audit=restricted</code> sur <code>m09-lab</code> puis recrée un pod root : relève l\'avertissement et l\'alerte éventuelle.',
          '(bonus) Active le chiffrement etcd (<code>APIServer</code>, voir module 04), attends <code>EncryptionCompleted</code>, et note ce que tu dois sauvegarder (module 11). Sur un cluster jetable seulement.',
          '(bonus) Installe le <b>File Integrity Operator</b> (namespace <code>openshift-file-integrity</code> avec le label PSA <code>privileged</code>) et crée le <code>FileIntegrity</code> de la slide ; provoque une modification de fichier sur un nœud (<code>oc debug</code>) et observe le résultat.'
        ] }
      ]
    }
  ],
  takeaways: [
    'La SCC dit ce qu\'un pod peut demander <b>et</b> assigne UID, SELinux, capabilities ; <code>restricted-v2</code> est le défaut, <code>restricted-v3</code> (user namespace) arrive en 4.20.',
    'Sélection : priorité d\'abord (<code>anyuid</code> : 10, <code>restricted-v2</code> : aucune), puis plus restrictive, puis nom ; accorde une SCC par RBAC (verbe <code>use</code>) au <b>ServiceAccount</b>, et crée une SCC dédiée plutôt que <code>anyuid</code>.',
    'PSA : enforce <code>privileged</code> global, audit et warn <code>restricted</code> ; les labels se synchronisent depuis les SCC (<code>podSecurityLabelSync</code>), sauf namespaces système.',
    'Images : sources autorisées (module 04), miroirs (module 03), digests ; la signature sigstore (<code>ClusterImagePolicy</code> / <code>ImagePolicy</code>, <code>config.openshift.io/v1</code>) est GA en 4.20 ; BYOPKI et la politique <code>openshift</code> restent Tech Preview.',
    'Secrets : chiffrer etcd ne suffit pas ; External Secrets Operator (GA 4.20+) ou Secrets Store CSI avec un coffre externe.',
    'Compliance Operator : <code>ScanSettingBinding</code> → scans → <code>ComplianceCheckResult</code> → remédiations lues avant d\'être appliquées ; File Integrity Operator pour l\'intégrité des nœuds.'
  ]
});
