COURSE.add({
  id: 'm04', num: 4, emoji: '⚙️',
  title: 'Configuration',
  tagline: 'Le cluster est installé : proxy, registres, certificats, chrony, Operators. La configuration « jour 1 », déclarative, sans toucher aux nœuds à la main.',
  duration: '≈ 60 min + lab 20 min',
  objectives: [
    'Configurer le cluster via les ressources <code>config.openshift.io</code> (Proxy, Image, APIServer, Scheduler…)',
    'Remplacer les certificats de l\'Ingress et de l\'API et déclarer une CA de confiance',
    'Appliquer une configuration d\'OS d\'usage (chrony, arguments noyau) avec <code>butane</code> et un MachineConfig',
    'Installer et piloter un Operator avec OLM (catalogues, canaux, approbation des InstallPlan)',
    'Dérouler une check-list de configuration post-installation'
  ],
  slides: [
    {
      title: 'Configurer OCP : une ressource « cluster » par sujet',
      blocks: [
        { t: 'text', html: "<p>Sur K8s, tu édites des manifests ou des flags. Sur OCP, chaque sujet a une <b>ressource singleton nommée <code>cluster</code></b> que l'<b>opérateur concerné</b> lit et applique. Tu déclares l'intention, l'opérateur fait le travail (et le refait si on le défait).</p>" },
        { t: 'flow', nodes: [
          { label: 'Toi', sub: 'oc edit / apply / GitOps' },
          { label: 'CR « cluster »', sub: 'config.openshift.io', hl: true },
          { label: 'Cluster Operator', sub: 'réconcilie en continu' },
          { label: 'Composant', sub: 'kube-apiserver, ingress, nœuds…' }
        ], caption: 'Les paramètres <b>transverses</b> sont dans <code>config.openshift.io</code> ; le réglage <b>fin d\'un opérateur</b> est dans <code>operator.openshift.io</code>.' },
        { t: 'cmds', items: [
          ['oc api-resources --api-group=config.openshift.io', 'Liste les ressources de configuration du cluster'],
          ['oc get proxy,apiserver,ingress.config,image.config cluster', 'Les singletons les plus utiles (nom : cluster)'],
          ['oc explain apiserver.spec', 'Schéma des champs (source la plus fiable pour ta version)']
        ] },
        { t: 'callout', kind: 'k8s', html: "Pas de fichier de config à pousser sur les nœuds : même les réglages d'OS passent par des objets (MachineConfig, section dédiée plus loin). Cette configuration est le candidat idéal pour GitOps (module 10)." }
      ]
    },
    {
      title: 'Tour des ressources config.openshift.io',
      blocks: [
        { t: 'table', head: ['Ressource', 'Ce qu\'elle règle', 'Traité'], rows: [
          ['<code>Proxy</code>', 'Proxy HTTP(S) du cluster, <code>noProxy</code>, CA de confiance', 'Ici'],
          ['<code>Image</code>', 'Registres autorisés / bloqués, CA des registres', 'Ici'],
          ['<code>APIServer</code>', 'Certificats de l\'API, profil TLS, chiffrement etcd, audit', 'Ici ; audit : module 06'],
          ['<code>Scheduler</code>', 'Profil du scheduler, node selector par défaut, masters schedulables', 'Ici'],
          ['<code>FeatureGate</code>', 'Active des fonctionnalités Tech Preview', 'Ici (piège)'],
          ['<code>Ingress</code> (config)', 'Domaine des applis (<code>*.apps</code>), routes de composants', 'Module 07'],
          ['<code>OAuth</code>', 'Fournisseurs d\'identité', 'Module 06'],
          ['<code>Network</code>, <code>DNS</code>, <code>Infrastructure</code>', 'CIDR, domaines, plateforme : surtout <b>en lecture seule</b> après l\'installation', 'Modules 02 et 03']
        ] },
        { t: 'callout', kind: 'tip', html: "Avant de modifier une ressource, lis son <code>status</code> et les conditions de l'opérateur associé (<code>oc get co</code>) : c'est lui qui te dira si ta configuration est appliquée ou rejetée." }
      ]
    },
    {
      title: 'Proxy du cluster et CA d\'entreprise',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'proxy-cluster.yaml', code: `apiVersion: config.openshift.io/v1
kind: Proxy
metadata:
  name: cluster
spec:
  httpProxy: http://proxy.example.com:3128
  httpsProxy: http://proxy.example.com:3128
  noProxy: .example.com,10.0.0.0/8      # complété automatiquement avec les réseaux internes
  trustedCA:
    name: user-ca-bundle                 # ConfigMap dans openshift-config (clé ca-bundle.crt)` },
        { t: 'bullets', items: [
          'Le proxy peut être posé <b>à l\'installation</b> (<code>install-config.yaml</code>) ou <b>après</b> via cette ressource.',
          '<code>trustedCA</code> : la CA du proxy (ou de l\'entreprise) à ajouter au bundle de confiance des composants plateforme.',
          'Le cluster complète <code>noProxy</code> avec ses réseaux internes : vérifie le résultat dans <code>status</code>.'
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: "Un changement de proxy se <b>propage aux nœuds</b> (MachineConfig) et peut déclencher un rolling reboot (comportement exact : à vérifier dans les release notes). Oublier le CIDR de ton réseau interne dans <code>noProxy</code> envoie du trafic interne vers le proxy." },
        { t: 'callout', kind: 'onprem', wide: true, html: "Sans accès direct à Internet, le proxy est souvent le seul chemin vers Red Hat (télémétrie, mises à jour). En déconnecté complet : pas de proxy mais un registre miroir (module 03)." }
      ]
    },
    {
      title: 'Registres autorisés et CA des registres',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'image-cluster.yaml', code: `apiVersion: config.openshift.io/v1
kind: Image
metadata:
  name: cluster
spec:
  additionalTrustedCA:
    name: registry-cas              # ConfigMap openshift-config ; clé = hostname[..port] du registre
  registrySources:
    allowedRegistries:              # ou blockedRegistries (exclusifs entre eux)
    - quay.io
    - registry.redhat.io
    - registry.example.com:8443` },
        { t: 'bullets', frag: true, items: [
          '<code>allowedRegistries</code> : liste blanche des registres ; tout le reste est refusé. <code>blockedRegistries</code> : liste noire. Les deux ne se combinent pas.',
          '<code>additionalTrustedCA</code> : CA de <b>chaque registre</b> privé (la clé de la ConfigMap est le hostname du registre).',
          '<code>insecureRegistries</code> existe mais est à <b>proscrire</b> hors lab.'
        ] },
        { t: 'callout', kind: 'trap', html: "Une liste blanche <b>incomplète</b> bloque les images de la plateforme elle-même (<code>registry.redhat.io</code>, ton miroir) : mets-y tout ce dont le cluster a besoin avant d'appliquer. Effet sur les nœuds (reboot ou non) : à vérifier dans les release notes. Champs exacts de <code>registrySources</code> : à vérifier avec <code>oc explain image.config.spec</code>." },
        { t: 'callout', kind: 'ocp', html: "Les redirections vers un miroir (<code>ImageDigestMirrorSet</code>, <code>ImageTagMirrorSet</code>) sont un sujet distinct : module 03. Le registre interne et son stockage : module 08." }
      ]
    },
    {
      title: 'APIServer : profil TLS, chiffrement etcd',
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
    type: aescbc              # chiffrement des Secrets dans etcd (à vérifier : aesgcm en 4.20)
  audit:
    profile: Default          # politique d'audit : voir module 06` },
        { t: 'bullets', items: [
          '<b>Profil TLS</b> : versions de TLS et chiffrements acceptés par l\'API (kube, openshift, OAuth) et le kubelet ; l\'Ingress se règle sur l\'<code>IngressController</code> (module 07) : à vérifier ; <code>Intermediate</code> est le défaut courant.',
          '<b>Chiffrement etcd</b> : désactivé par défaut ; une fois activé, la ré-écriture des objets prend du temps (suivi sur les conditions des opérateurs <code>kube-apiserver</code> et <code>openshift-apiserver</code>).',
          '<b>Certificats nommés</b> : slide suivante.'
        ] },
        { t: 'callout', kind: 'warn', wide: true, html: "Le chiffrement etcd protège les données <b>au repos dans etcd</b>, pas les accès via l'API. Il s'applique aux objets ré-écrits après activation : fais une <b>nouvelle sauvegarde etcd</b> après l'activation et protège-la comme un secret (module 11). Ce que contient exactement un snapshot (dont les clés) et ce qu'il faut sauvegarder en plus : <b>à vérifier dans la doc OpenShift 4.20</b>. Types supportés et profils TLS exacts : à vérifier dans les release notes." }
      ]
    },
    {
      title: 'Scheduler, FeatureGate et pilotage par les opérateurs',
      blocks: [
        { t: 'table', head: ['Réglage', 'Effet', 'Attention'], rows: [
          ['<code>Scheduler.spec.defaultNodeSelector</code>', 'Selector ajouté aux pods qui n\'en ont pas (ex. cibler les workers)', 'S\'applique <b>à tout le cluster</b> ; surchargeable par projet'],
          ['<code>Scheduler.spec.mastersSchedulable</code>', 'Permet des pods applicatifs sur les masters', 'Réservé aux topologies compactes (module 02)'],
          ['<code>Scheduler.spec.profile</code>', 'Profil de scoring (consolidation, répartition…)', 'Valeurs disponibles : à vérifier avec <code>oc explain</code>'],
          ['<code>FeatureGate</code> <code>TechPreviewNoUpgrade</code>', 'Active les fonctionnalités Tech Preview', '<b>Irréversible</b> ; bloque les mises à jour de version mineure (à vérifier)']
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "# Cibler les workers par défaut (exemple)\n$ oc patch scheduler cluster --type merge \\\n    -p '{\"spec\":{\"defaultNodeSelector\":\"node-role.kubernetes.io/worker=\"}}'" },
        { t: 'callout', kind: 'trap', html: "Un <code>FeatureGate</code> de type Tech Preview sur un cluster de production est une impasse : pas de retour arrière, mises à jour de version mineure bloquées (comportement : à vérifier dans les release notes). Réserve-le aux clusters jetables." },
        { t: 'callout', kind: 'warn', html: "Même logique pour tout composant : une modification <b>hors CR</b> est écrasée à la réconciliation, et passer un opérateur en <code>managementState: Unmanaged</code> ou poser <code>spec.overrides</code> dans <code>ClusterVersion</code> est <b>non supporté</b> et peut bloquer les mises à jour (module 12). Cherche le champ prévu avec <code>oc explain</code>." }
      ]
    },
    {
      title: 'Certificats : ce qui est automatique, ce que tu remplaces',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Certificat', 'Géré par', 'Que fais-tu ?'], rows: [
          ['PKI interne (kubelet, etcd, control plane…)', 'Les opérateurs, rotation automatique', 'Rien au quotidien ; surveiller les alertes (module 12)'],
          ['<b>Ingress par défaut</b> (<code>*.apps</code>)', 'Auto-signé par défaut (CA du cluster)', '<b>Remplacer</b> par un certificat de ton PKI'],
          ['<b>API externe</b> (<code>api.…</code>)', 'CA interne par défaut', '<b>Remplacer</b> via un certificat nommé'],
          ['API interne (<code>api-int</code>)', 'CA interne', 'Ne se remplace pas ainsi (à vérifier)'],
          ['CA d\'un proxy ou d\'un registre', 'Toi', 'Déclarer dans un bundle de confiance']
        ] },
        { t: 'bullets', items: [
          'Les clients (navigateur, <code>oc</code>, CI) doivent faire confiance à la <b>CA qui signe</b> ces certificats.',
          'Un certificat <b>wildcard</b> <code>*.apps.cluster.domaine</code> couvre console, OAuth et toutes les routes.',
          'Fournis la <b>chaîne complète</b> (serveur puis intermédiaires) dans le fichier du certificat.'
        ] },
        { t: 'callout', kind: 'onprem', wide: true, html: "Ton PKI d'entreprise ou une CA interne est l'usage normal on-prem. Prévois aussi le <b>renouvellement</b> (échéances, ticket à la PKI) : la rotation et les cas d'expiration sont au module 12." },
        { t: 'callout', kind: 'cloud', wide: true, html: "En cloud managé, les certificats de la plateforme sont gérés par le fournisseur ; tu ne remplaces en général que ceux de tes domaines applicatifs." }
      ]
    },
    {
      title: 'Remplacer le certificat de l\'Ingress par défaut',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: "# 0. Si la CA qui signe n'est pas déjà de confiance : la déclarer d'abord\n#    (user-ca-bundle + Proxy trustedCA, voir la slide « Faire confiance à une CA »)\n\n# 1. Secret TLS dans openshift-ingress (chaîne complète dans fullchain.crt)\n$ oc create secret tls custom-ingress-cert \\\n    --cert=fullchain.crt --key=apps.key -n openshift-ingress\n\n# 2. Pointer l'IngressController par défaut dessus\n$ oc patch ingresscontroller.operator.openshift.io default \\\n    -n openshift-ingress-operator --type=merge \\\n    -p '{\"spec\":{\"defaultCertificate\":{\"name\":\"custom-ingress-cert\"}}}'\n\n# 3. Suivre le redéploiement des routeurs, puis tester\n$ oc get pods -n openshift-ingress -w\n$ curl -vI https://console-openshift-console.apps.ocp4.example.com 2>&1 | grep -i issuer" },
        { t: 'bullets', frag: true, items: [
          'Le certificat doit couvrir <code>*.apps.&lt;cluster&gt;.&lt;domaine&gt;</code> (SAN wildcard).',
          'Les routeurs sont <b>redéployés</b> (rolling) : prévois une courte fenêtre.',
          'Les clients doivent faire confiance à la CA, y compris les composants internes qui appellent la console ou OAuth.'
        ] },
        { t: 'callout', kind: 'trap', html: "Si la CA qui signe ce certificat n'est <b>pas déjà de confiance</b> pour le cluster (CA d'entreprise, CA de lab), déclare-la <b>avant</b> de patcher (<code>user-ca-bundle</code> + <code>Proxy.spec.trustedCA</code>) : sinon des composants internes qui appellent la console ou OAuth peuvent ne plus faire confiance au routeur et des opérateurs passer <b>Degraded</b>. Procédure exacte : à vérifier dans la doc « Replacing the default ingress certificate » de 4.20. <b>Retour arrière</b> : retirer <code>spec.defaultCertificate</code> de l\'<code>IngressController</code>." },
        { t: 'callout', kind: 'ocp', html: "L'<code>IngressController</code> (sharding, routes, certificats par route) est traité au module 07 ; ici, seulement le certificat par défaut." }
      ]
    },
    {
      title: 'Remplacer le certificat de l\'API',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: "# Secret TLS dans openshift-config\n$ oc create secret tls api-cert \\\n    --cert=api-fullchain.crt --key=api.key -n openshift-config\n\n$ oc patch apiserver cluster --type=merge -p '{\n  \"spec\": {\"servingCerts\": {\"namedCertificates\": [{\n    \"names\": [\"api.ocp4.example.com\"],\n    \"servingCertificate\": {\"name\": \"api-cert\"}\n  }]}}}'\n\n$ oc get co kube-apiserver -w   # attendre la fin du rollout" },
        { t: 'bullets', items: [
          '<code>names</code> : le nom <b>externe</b> de l\'API (<code>api.cluster.domaine</code>), pas <code>api-int</code>.',
          'Le <code>kube-apiserver</code> se redéploie sur les 3 masters : l\'API reste disponible mais subit des redémarrages successifs.',
          'Teste avec <code>oc login</code> depuis un poste qui fait confiance à ta CA.'
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: "Les <b>kubeconfig existants</b> (celui de l'installeur, des pipelines CI) embarquent la CA interne : après le remplacement, ils peuvent échouer ou continuer à pointer vers la mauvaise CA selon leur contenu. Vérifie-les et, si besoin, régénère-les (comportement exact : à vérifier dans la doc 4.20)." },
        { t: 'callout', kind: 'warn', wide: true, html: "Garde une <b>procédure de retour arrière</b> (retirer l'entrée <code>namedCertificates</code>) et un accès break-glass (module 06) avant de modifier l'API." }
      ]
    },
    {
      title: 'Faire confiance à une CA : le bundle du cluster',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: "# 1. Bundle de CA d'entreprise dans openshift-config\n$ oc create configmap user-ca-bundle \\\n    --from-file=ca-bundle.crt=corp-ca-bundle.pem -n openshift-config\n\n# 2. Le déclarer comme CA de confiance du cluster\n$ oc patch proxy cluster --type=merge \\\n    -p '{\"spec\":{\"trustedCA\":{\"name\":\"user-ca-bundle\"}}}'\n\n# 3. Vérifier la distribution du bundle fusionné\n$ oc get configmap trusted-ca-bundle -n openshift-config-managed -o jsonpath='{.metadata.name}'" },
        { t: 'bullets', items: [
          'Le bundle est <b>fusionné</b> avec les CA du système puis distribué aux composants plateforme (et aux nœuds).',
          'Le <b>Proxy</b> sert ici de vecteur même <b>sans proxy HTTP</b> : <code>trustedCA</code> reste le point d\'entrée.',
          'Pour les registres privés, c\'est <code>Image.spec.additionalTrustedCA</code> ; pour les fournisseurs d\'identité (LDAP, OIDC), la CA se déclare dans leur configuration (module 06).'
        ] },
        { t: 'callout', kind: 'tip', html: "Pour tes <b>applications</b>, le bundle peut être injecté dans un pod via une ConfigMap avec le label <code>config.openshift.io/inject-trusted-cabundle=true</code> : à vérifier dans la doc de ta version." }
      ]
    },
    {
      title: 'MachineConfig d\'usage : chrony avec butane',
      layout: 'two',
      blocks: [
        { t: 'text', html: "<p>La mécanique du MCO (pools, rendered, rolling reboot) est au <b>module 02</b>. Ici, le cas typique du jour 1 : pointer les nœuds vers <b>tes serveurs NTP</b>. <code>butane</code> écrit le MachineConfig en YAML lisible.</p>" },
        { t: 'code', lang: 'yaml', file: '99-worker-chrony.bu', code: `variant: openshift
version: 4.20.0                 # doit correspondre à ta release de butane (à vérifier)
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
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ butane 99-worker-chrony.bu -o 99-worker-chrony.yaml\n$ oc apply -f 99-worker-chrony.yaml\n$ oc get mcp -w            # rolling : drain, apply, reboot\n$ oc debug node/worker-0 -- chroot /host chronyc sources" },
        { t: 'callout', kind: 'trap', wide: true, html: "Le label <code>role: worker</code> ne cible <b>que le pool worker</b>. Les masters gardent leur propre configuration : il faut un second MachineConfig avec <code>role: master</code> (et, sur un SNO, c'est le pool master qui s'applique : à vérifier). Tous les nœuds doivent partager la même source de temps." },
        { t: 'callout', kind: 'onprem', wide: true, html: "En réseau isolé, les serveurs NTP publics sont injoignables : pointe vers tes sources internes. C'est un des premiers réglages du jour 1 (certificats et etcd en dépendent)." }
      ]
    },
    {
      title: 'Arguments noyau et autres réglages d\'OS',
      blocks: [
        { t: 'code', lang: 'yaml', file: '99-worker-kargs.bu', code: `variant: openshift
version: 4.20.0
metadata:
  name: 99-worker-kargs
  labels:
    machineconfiguration.openshift.io/role: worker
kernel_arguments:
- default_hugepagesz=1G        # exemple : hugepages pour une charge spécialisée
- hugepagesz=1G
- hugepages=4` },
        { t: 'bullets', frag: true, items: [
          '<b>kargs</b> : ajoutés à la ligne de commande du noyau ; un changement impose un <b>reboot</b> des nœuds du pool.',
          'Autres usages courants : fichiers (<code>/etc/…</code>), unités systemd, configuration de <code>crio</code> ou du kubelet (via <code>ContainerRuntimeConfig</code> / <code>KubeletConfig</code>, ressources dédiées).',
          'Les réglages de performance avancés (PerformanceProfile, NUMA) sont hors du périmètre de ce module.'
        ] },
        { t: 'callout', kind: 'warn', html: "Un MachineConfig invalide ou un fichier mal formé met le pool en <b>Degraded</b> et peut <b>bloquer les mises à jour</b> (module 12). Teste sur un pool de test (<code>maxUnavailable</code>, <code>paused</code> : module 02) avant la production. Le comportement sans reboot (node disruption policies) : statut en 4.20 à vérifier dans les release notes." }
      ]
    },
    {
      title: 'OLM : les objets à connaître',
      blocks: [
        { t: 'text', html: "<p>Les Operators additionnels (stockage, GitOps, logging…) s'installent via <b>OLM</b> (Operator Lifecycle Manager). Tu ne lances pas un <code>helm install</code> : tu déclares un <b>abonnement</b> à un canal d'un catalogue.</p>" },
        { t: 'flow', nodes: [
          { label: 'CatalogSource', sub: 'catalogue d\'Operators' },
          { label: 'PackageManifest', sub: 'canaux disponibles' },
          { label: 'Subscription', sub: 'canal + approbation', hl: true },
          { label: 'InstallPlan', sub: 'étapes d\'installation' },
          { label: 'CSV', sub: 'l\'Operator installé' }
        ], caption: 'Un <b>OperatorGroup</b> (dans le namespace de l\'Operator) définit les namespaces surveillés.' },
        { t: 'cmds', items: [
          ['oc get catalogsource -n openshift-marketplace', 'Catalogues disponibles'],
          ['oc get packagemanifest -n openshift-marketplace | head', 'Operators installables'],
          ['oc get sub,installplan,csv -n openshift-storage', 'Où en est l\'installation d\'un Operator']
        ] },
        { t: 'callout', kind: 'k8s', html: "OLM est <b>à côté</b> de Helm : il gère des Operators (CRD, droits, mises à jour) plutôt que des applications. Les Operators plateforme du cluster, eux, sont gérés par le CVO (module 02), pas par OLM." }
      ]
    },
    {
      title: 'OperatorHub : catalogues et sources',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Catalogue (source par défaut)', 'Contenu'], rows: [
          ['<code>redhat-operators</code>', 'Operators Red Hat, supportés'],
          ['<code>certified-operators</code>', 'Operators d\'éditeurs partenaires certifiés'],
          ['<code>community-operators</code>', 'Communauté, <b>sans support</b>'],
          ['<code>redhat-marketplace</code>', 'Marketplace (à vérifier : présence en 4.20)']
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc get operatorhub cluster -o yaml\n# Désactiver une source par défaut\n$ oc patch operatorhub cluster --type merge \\\n    -p '{\"spec\":{\"sources\":[{\"name\":\"community-operators\",\"disabled\":true}]}}'" },
        { t: 'bullets', items: [
          'Les sources par défaut s\'appuient sur Internet : elles sont <b>inutilisables en déconnecté</b> (slide suivante).',
          'Désactiver <code>community-operators</code> évite d\'installer par erreur un Operator non supporté.'
        ] },
        { t: 'callout', kind: 'warn', wide: true, html: "Liste exacte des catalogues par défaut et leurs noms en 4.20 : à vérifier dans les release notes et la documentation « Operators »." }
      ]
    },
    {
      title: 'Installer un Operator : le YAML',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'lvms-subscription.yaml', code: `apiVersion: v1
kind: Namespace
metadata:
  name: openshift-storage
---
apiVersion: operators.coreos.com/v1
kind: OperatorGroup
metadata:
  name: lvms
  namespace: openshift-storage
spec:
  targetNamespaces:
  - openshift-storage
---
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: lvms-operator
  namespace: openshift-storage
spec:
  channel: stable-4.20              # vérifie le canal avec le PackageManifest
  name: lvms-operator
  source: redhat-operators
  sourceNamespace: openshift-marketplace
  installPlanApproval: Manual       # Automatic | Manual` },
        { t: 'cmds', items: [
          ['oc get packagemanifest lvms-operator -n openshift-marketplace -o jsonpath=\'{.status.defaultChannel}\'', 'Canal par défaut d\'un Operator (sinon : <code>oc describe</code>)'],
          ['oc get csv -n openshift-storage', 'Phase <code>Succeeded</code> = installé']
        ] },
        { t: 'callout', kind: 'warn', html: "Nom du paquet, canal et namespace recommandé de chaque Operator : à lire dans la <b>documentation de l'Operator</b> (exemple : celui de LVMS, module 08 ; son namespace porte des labels spécifiques, à reprendre de la doc). Le canal <code>stable-4.20</code> ci-dessus est un exemple à vérifier." }
      ]
    },
    {
      title: 'Canaux, approbation et mises à jour des Operators',
      layout: 'two',
      blocks: [
        { t: 'bullets', frag: true, items: [
          '<b>Canal</b> : suit une lignée de versions ; changer de canal change ce que l\'Operator peut recevoir.',
          '<b>Automatic</b> : OLM installe les nouvelles versions du canal sans te demander (risque : changement non planifié).',
          '<b>Manual</b> : OLM crée un <code>InstallPlan</code> en attente ; rien ne bouge tant que tu ne l\'<b>approuves</b>.'
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc get installplan -n openshift-storage\nNAME            CSV                         APPROVAL   APPROVED\ninstall-abcde   lvms-operator.v4.20.x       Manual     false\n\n$ oc patch installplan install-abcde -n openshift-storage \\\n    --type merge -p '{\"spec\":{\"approved\":true}}'" },
        { t: 'callout', kind: 'tip', html: "En production, <b>Manual</b> pour les Operators critiques (stockage, réseau, sécurité) ; <b>Automatic</b> pour les autres, dans des environnements de test d'abord." },
        { t: 'callout', kind: 'trap', html: "Un InstallPlan <b>oublié en Pending</b> laisse l'Operator en version courante, parfois vulnérable ou incompatible avec la prochaine version du cluster. Certains Operators déclarent aussi une version OCP maximale et peuvent <b>bloquer la mise à jour du cluster</b> (module 12 ; mécanisme exact : à vérifier)." }
      ]
    },
    {
      title: 'Catalogues miroités (déconnecté)',
      blocks: [
        { t: 'text', html: "<p>Le miroir des images et des index d'Operators se prépare à l'installation (<b>module 03</b>, <code>oc-mirror</code>). Côté <b>configuration</b>, il reste à désactiver les sources publiques et à déclarer ton <code>CatalogSource</code>.</p>" },
        { t: 'code', lang: 'yaml', file: 'catalogsource-miroir.yaml', code: `apiVersion: operators.coreos.com/v1alpha1
kind: CatalogSource
metadata:
  name: redhat-operators-miroir
  namespace: openshift-marketplace
spec:
  sourceType: grpc
  image: registry.example.com:8443/redhat/redhat-operator-index:v4.20
  displayName: Red Hat Operators (miroir)
  publisher: infra
  updateStrategy:
    registryPoll:
      interval: 30m` },
        { t: 'bullets', items: [
          '<code>oc-mirror</code> génère normalement ce <code>CatalogSource</code> (et les <code>ImageDigestMirrorSet</code>) : applique ces fichiers plutôt que de les écrire.',
          'Désactive les sources par défaut : <code>disableAllDefaultSources: true</code> dans <code>OperatorHub</code> (module 03).',
          'Un catalogue miroité ne contient que les paquets que tu as <b>sélectionnés</b> : un Operator absent = absent du miroir.'
        ] },
        { t: 'callout', kind: 'onprem', html: "Le miroir est <b>à rejouer</b> à chaque évolution de version d'Operator souhaitée : prévois un process (fréquence, validation) plutôt qu'un geste ponctuel." }
      ]
    },
    {
      title: 'OLM v1 : ClusterExtension',
      layout: 'two',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '📦 OLM v0 (classique)', items: ['<code>OperatorGroup</code> + <code>Subscription</code> + <code>InstallPlan</code>', 'Modes d\'installation par namespace', 'Droits accordés par OLM', 'Écosystème le plus large aujourd\'hui'] },
          right: { title: '🧩 OLM v1', items: ['<code>ClusterCatalog</code> + <code>ClusterExtension</code>', 'Pas d\'OperatorGroup ni de Subscription', 'Tu fournis le <code>ServiceAccount</code> (et ses droits)', 'Périmètre plus restreint, à confirmer'] },
          verdict: 'OLM v1 est un nouveau modèle, pas un simple « v2 » : les deux coexistent. À vérifier : statut GA ou Tech Preview en 4.20 et types d\'Operators compatibles.' },
        { t: 'code', lang: 'yaml', file: 'clusterextension.yaml (illustration)', code: `apiVersion: olm.operatorframework.io/v1
kind: ClusterExtension
metadata:
  name: exemple
spec:
  namespace: exemple-ns
  serviceAccount:
    name: exemple-installer
  source:
    sourceType: Catalog
    catalog:
      packageName: exemple-operator` },
        { t: 'callout', kind: 'warn', wide: true, html: "Apparence et champs de <code>ClusterExtension</code> / <code>ClusterCatalog</code> : <b>illustration à vérifier</b> dans la documentation de 4.20 avant tout usage. Pour la production, reste sur OLM v0 tant que le périmètre de ton Operator n'est pas confirmé." }
      ]
    },
    {
      title: 'Console : plugins et personnalisation',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: "# Plugins de la console (fournis par certains Operators)\n# Attention : cette commande REMPLACE la liste existante ; pour ajouter à une liste\n# déjà présente, utilise path /spec/plugins/- avec value \"nom-du-plugin\"\n$ oc get consoleplugin\n$ oc patch console.operator.openshift.io cluster --type=json \\\n    -p '[{\"op\":\"add\",\"path\":\"/spec/plugins\",\"value\":[\"nom-du-plugin\"]}]'\n\n# Bandeau d'information visible de tous\n$ cat <<'EOF' | oc apply -f -\napiVersion: console.openshift.io/v1\nkind: ConsoleNotification\nmetadata:\n  name: maintenance\nspec:\n  text: Maintenance prévue samedi 22h\n  location: BannerTop\nEOF" },
        { t: 'bullets', items: [
          'Les <b>plugins</b> (ex. GitOps, virtualisation) apparaissent après installation de l\'Operator <b>et</b> activation dans la CR <code>Console</code>.',
          '<code>ConsoleLink</code>, <code>ConsoleNotification</code>, <code>ConsoleCLIDownload</code> : liens, bandeaux et téléchargements de CLI personnalisés.',
          'Le nom et l\'URL de la console dépendent du domaine <code>*.apps</code> (module 07).'
        ] },
        { t: 'callout', kind: 'tip', html: "Un bandeau « environnement de production » ou « maintenance » évite beaucoup d'erreurs de contexte entre clusters. Options de personnalisation avancée (logo, nom du produit) : à vérifier selon la version." }
      ]
    },
    {
      title: 'Check-list de configuration post-installation',
      tag: 'à faire',
      blocks: [
        { t: 'table', head: ['Étape', 'Où', 'Module'], rows: [
          ['Valider l\'installation (<code>oc get co</code>, nœuds, CSR)', 'Après install', 'module 03'],
          ['Remplacer <code>kubeadmin</code> par un IdP, puis le supprimer', 'OAuth', 'module 06'],
          ['NTP des nœuds (chrony), proxy et CA d\'entreprise', 'MachineConfig, Proxy', 'ce module'],
          ['Certificats Ingress et API', 'IngressController, APIServer', 'ce module'],
          ['Sources de l\'OperatorHub (désactiver communautaire, miroir)', 'OperatorHub', 'ce module, module 03'],
          ['Stockage du registre, du monitoring et du logging', 'ConfigMaps, CR', 'modules 08 et 05'],
          ['Sauvegarde etcd planifiée', 'Procédure', 'module 11'],
          ['Canal de mise à jour et stratégie', 'ClusterVersion', 'module 12'],
          ['Mettre toute cette configuration sous GitOps', 'Dépôt Git', 'module 10']
        ] },
        { t: 'callout', kind: 'tip', html: "Idéalement, cette check-list est <b>codée</b> (manifests dans Git, appliqués par GitOps) : le cluster suivant se configure en quelques minutes et on peut prouver à un audit ce qui a été fait." }
      ]
    },
    {
      title: 'Quiz',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Tu veux un certificat wildcard d\'entreprise pour toutes les routes <code>*.apps</code>. Que modifies-tu ?', options: ['La ressource <code>APIServer</code> (<code>servingCerts</code>)', 'Un Secret TLS dans <code>openshift-ingress</code>, puis <code>defaultCertificate</code> de l\'<code>IngressController</code> par défaut', 'Chaque <code>Route</code> individuellement, obligatoirement', 'Un MachineConfig qui dépose le certificat sur les nœuds'], answer: 1, explain: 'Le certificat des routes est celui du routeur : Secret dans <code>openshift-ingress</code> et <code>spec.defaultCertificate</code> de l\'IngressController. <code>APIServer</code> sert au certificat de l\'API ; un MachineConfig n\'est pas concerné.' },
        { t: 'quiz', q: 'Tu appliques un MachineConfig chrony avec le label <code>role: worker</code>. Quel est l\'effet sur les masters ?', options: ['Aucun : il faut un MachineConfig équivalent pour le pool master', 'Les masters sont aussi mis à jour', 'Les masters redémarrent sans changement', 'L\'application est refusée par le MCO'], answer: 0, explain: 'Un MachineConfig n\'est rendu que pour le pool désigné par son label. Pour que tous les nœuds partagent la même source de temps, applique aussi une version pour le rôle master.' },
        { t: 'quiz', q: 'Une <code>Subscription</code> est en <code>installPlanApproval: Manual</code>. Une nouvelle version est disponible dans le canal, mais l\'Operator ne se met pas à jour. Que fais-tu ?', options: ['Supprimer la Subscription et la recréer', 'Redémarrer le pod de l\'Operator', 'Lister les <code>InstallPlan</code> et approuver celui qui est en attente', 'Changer l\'<code>OperatorGroup</code>'], answer: 2, explain: 'En mode Manual, OLM crée un InstallPlan non approuvé : rien ne se passe tant que <code>spec.approved</code> n\'est pas passé à <code>true</code>.' }
      ]
    },
    {
      title: 'Lab : configurer un cluster fraîchement installé',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'Chrony, certificat Ingress, Operator en approbation manuelle', goal: 'Noyau en séance sur un SNO ou un cluster de lab (cluster-admin). Les étapes (bonus) sont à faire en autonomie.', steps: [
          'Prérequis : environnement E1 (SNO) avec <code>cluster-admin</code>, voir module 00 ; <code>butane</code> et <code>openssl</code> sur ton poste.',
          'Repère la configuration : <code>oc api-resources --api-group=config.openshift.io</code> puis <code>oc get proxy,apiserver,image.config cluster -o yaml</code> ; qu\'est-ce qui est déjà renseigné ?',
          'Écris un <code>99-…-chrony.bu</code> (rôle du pool de ton nœud : <b>master</b> sur un SNO, à vérifier avec <code>oc get mcp</code>), génère le YAML avec <code>butane</code>, applique-le et suis <code>oc get mcp -w</code> ; contrôle avec <code>chronyc sources</code> via <code>oc debug node/&lt;nœud&gt;</code>. <b>Sur un SNO, le nœud redémarre</b> : l\'API est indisponible quelques minutes.',
          'Crée une CA de lab et un certificat wildcard <code>*.apps.&lt;cluster&gt;.&lt;domaine&gt;</code> avec <code>openssl</code>.',
          'Déclare d\'abord ta CA de lab comme CA de confiance du cluster : ConfigMap <code>user-ca-bundle</code> dans <code>openshift-config</code> et <code>Proxy.spec.trustedCA</code> (voir la slide « Faire confiance à une CA » ; procédure à vérifier dans la doc 4.20).',
          'Crée le Secret TLS dans <code>openshift-ingress</code> et patche <code>defaultCertificate</code> ; attends le redéploiement des routeurs, vérifie que <code>oc get co</code> reste sain et contrôle l\'émetteur avec <code>curl -vI</code> sur la console.',
          '<b>Retour arrière</b> : retire <code>spec.defaultCertificate</code> de l\'<code>IngressController</code> (<code>oc patch … --type=json -p \'[{"op":"remove","path":"/spec/defaultCertificate"}]\'</code>, à vérifier), attends le redéploiement des routeurs puis supprime le Secret.',
          'Installe un Operator avec <code>installPlanApproval: Manual</code> (Namespace, OperatorGroup, Subscription) ; constate l\'<code>InstallPlan</code> en attente, approuve-le avec <code>oc patch</code> et attends la phase <code>Succeeded</code> du CSV.',
          'Désactive la source <code>community-operators</code> de l\'OperatorHub et vérifie qu\'elle disparaît de <code>oc get catalogsource -n openshift-marketplace</code>.',
          '(bonus) Crée un <code>ConsoleNotification</code> de type bandeau et vérifie qu\'il apparaît dans la console.',
          '(bonus) Essaie OLM v1 : crée un <code>ClusterExtension</code> pour un Operator compatible (périmètre et champs : à vérifier dans la doc 4.20) ; compare avec la Subscription de l\'étape précédente.'
        ] }
      ]
    }
  ],
  takeaways: [
    'Chaque sujet de configuration a une CR singleton <code>cluster</code> (<code>config.openshift.io</code>) que l\'opérateur concerné réconcilie : on déclare, on ne bricole pas.',
    'Proxy, CA d\'entreprise, registres autorisés : transverses, avec un effet possible sur les nœuds ; vérifie toujours le <code>status</code> et l\'opérateur associé.',
    'Certificats à remplacer : Ingress par défaut (Secret + <code>defaultCertificate</code>) et API (<code>namedCertificates</code>) ; la rotation est au module 12.',
    'Chrony et kargs passent par un MachineConfig (<code>butane</code>) : un pool à la fois, avec reboot ; un label de rôle ne cible qu\'un pool.',
    'OLM : Subscription, canal et <b>approbation manuelle</b> des InstallPlan pour les Operators critiques ; en déconnecté, catalogues miroités ; OLM v1 à vérifier en 4.20.'
  ]
});
