COURSE.add({
  id: 'm10', num: 10, emoji: '🔄',
  title: 'CI/CD & GitOps',
  tagline: 'La configuration de ton cluster dans Git, appliquée et surveillée par Argo CD : GitOps de plateforme d\'abord, Pipelines et Builds en survol.',
  duration: '≈ 45 min + lab 20 min',
  objectives: [
    'Installer OpenShift GitOps et comprendre l\'instance Argo CD par défaut et ses limites de droits',
    'Décrire une configuration de cluster avec <code>Application</code>, <code>AppProject</code> et <code>ApplicationSet</code>',
    'Maîtriser les politiques de synchronisation (prune, selfHeal), les sync waves et les hooks',
    'Organiser le dépôt Git, gérer les secrets sans les mettre en clair et situer le multi-cluster',
    'Situer OpenShift Pipelines (Tekton) et Builds sans entrer dans le développement applicatif'
  ],
  slides: [
    {
      title: 'GitOps de plateforme : pourquoi ?',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Git', sub: 'configuration voulue', hl: true },
          { label: 'Argo CD', sub: 'compare et applique' },
          { label: 'Cluster', sub: 'état réel' },
          { label: 'Dérive ?', sub: 'détectée, corrigée', hl: true }
        ], caption: 'Git est la <b>source de vérité</b> ; Argo CD ramène en continu le cluster vers elle.' },
        { t: 'bullets', frag: true, items: [
          '<b>Public de ce module</b> : l\'admin plateforme. On gère la <b>configuration du cluster</b> (modules 04, 06, 07…), pas le développement applicatif (hors périmètre v1).',
          'Gains : historique et revue (pull requests), <b>reproductibilité</b> d\'un cluster à l\'autre, retour arrière par <code>git revert</code>, <b>reconstruction</b> après sinistre (module 11).',
          'Frontières : config jour 1 → module 04 ; RBAC → module 06 ; secrets → module 09 ; DR → module 11 ; mises à jour → module 12 ; Routes → module 07.'
        ] },
        { t: 'callout', kind: 'k8s', html: "Tu connais déjà Argo CD ou Flux sur K8s. Ici, le sujet est <b>OpenShift GitOps</b> : la distribution supportée d'Argo CD, installée par un Operator, avec ses particularités de droits et d'intégration OpenShift." }
      ]
    },
    {
      title: 'Les objets d\'Argo CD',
      blocks: [
        { t: 'table', head: ['Objet (<code>argoproj.io/v1alpha1</code>)', 'Rôle'], rows: [
          ['<code>Application</code>', 'Un <b>dépôt + chemin + révision</b> synchronisés vers une <b>destination</b> (cluster + namespace)'],
          ['<code>AppProject</code>', 'Périmètre d\'autorisation : quels dépôts, quelles destinations, quels types de ressources'],
          ['<code>ApplicationSet</code>', 'Génère <b>plusieurs Applications</b> depuis un modèle (liste, dossiers Git, clusters)'],
          ['<code>ArgoCD</code> (<code>argoproj.io/v1beta1</code>)', 'CR de l\'<b>Operator OpenShift GitOps</b> qui décrit <b>une instance</b> d\'Argo CD']
        ] },
        { t: 'bullets', items: [
          'États d\'une Application : <b>Synced</b> / <b>OutOfSync</b> (conformité à Git) et <b>Healthy</b> / <b>Degraded</b> (santé des ressources).',
          '<b>Dérive</b> : un changement fait hors Git ; selon la politique, il est signalé ou corrigé.'
        ] },
        { t: 'callout', kind: 'tip', html: "Une Application = <b>un lot cohérent</b> (par exemple « quotas et project template » ou « OperatorHub et abonnements »). Ni un seul gros dépôt monolithique, ni une Application par fichier." }
      ]
    },
    {
      title: 'OpenShift GitOps : l\'Operator et ses versions',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Version', 'Argo CD', 'OCP supportés'], rows: [
          ['<b>1.21</b>', '3.4.3 (GA)', '4.14, 4.16 à 4.22 (patches suivants : 4.18 à 4.22)'],
          ['<b>1.20</b>', '3.3.2 (GA)', '4.14, 4.16 à 4.21'],
          ['<b>1.19</b>', '3.1.9 (GA)', '4.14, 4.16 à 4.21'],
          ['<b>1.18</b>', '—', '4.14, 4.16 à 4.20']
        ] },
        { t: 'bullets', items: [
          'Canal <b><code>latest</code></b> (défaut) ou <code>gitops-&lt;version&gt;</code> pour figer une version mineure.',
          'Namespace d\'installation par défaut : <b><code>openshift-gitops-operator</code></b> (avant la 1.10 : <code>openshift-operators</code>).',
          'Après installation, une <b>instance Argo CD prête à l\'emploi</b> existe dans le namespace <code>openshift-gitops</code>.',
          'Les versions <b>1.18 à 1.21</b> couvrent toutes OCP 4.20. Depuis la 1.18 : « support is no longer provided for Keycloak-based authentication » (migrer vers Dex) ; l\'<b>Argo CD Agent</b> est passé de Technology Preview (1.17-1.18) à <b>GA en 1.19</b> (notes de version 1.21).'
        ] },
        { t: 'callout', kind: 'warn', wide: true, html: "Choisis la version d'OpenShift GitOps selon la matrice de compatibilité de <b>ta version d'OCP</b> et du <b>cycle de vie</b> de l'Operator (module 12 pour les mises à jour). Statut d'Argo CD CLI et d'ApplicationSet progressive rollout : Technology Preview (doc 1.19)." }
      ]
    },
    {
      title: 'Installer OpenShift GitOps',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'gitops-operator.yaml (procédure CLI de la doc)', code: `apiVersion: v1
kind: Namespace
metadata:
  name: openshift-gitops-operator
  labels:
    openshift.io/cluster-monitoring: "true"   # optionnel (supervision de l'Operator)
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
          'La doc décrit l\'installation par la <b>console</b> (OperatorHub, droits <code>cluster-admin</code> requis) <b>et</b> par la <b>CLI</b> : le YAML ci-dessus reprend la procédure CLI de la doc 1.19 (OperatorGroup avec <code>upgradeStrategy: Default</code>, Subscription en canal <code>latest</code>) ; le label <code>openshift.io/cluster-monitoring</code> est <b>optionnel</b> (module 04 pour OLM).',
          'Vérification : <code>oc get pods -n openshift-gitops</code> ; l\'icône Argo CD apparaît dans la barre de la console.'
        ] },
        { t: 'callout', kind: 'tip', html: "Pour de la production, passe <code>installPlanApproval</code> en <code>Manual</code> si tu veux contrôler les mises à jour de l'Operator (module 04, module 12)." }
      ]
    },
    {
      title: 'L\'instance par défaut : ce qu\'elle peut (et ne peut pas)',
      tag: 'à connaître',
      blocks: [
        { t: 'bullets', frag: true, items: [
          'L\'instance de <code>openshift-gitops</code> est une instance <b>« cluster-scoped »</b> : prévue pour que les admins gèrent certaines ressources de configuration du cluster.',
          'Par défaut, elle gère <b>un jeu limité de ressources de cluster</b> (la doc cite : cluster Operators, Operators OLM facultatifs, gestion des utilisateurs), a les droits <code>admin</code> <b>seulement dans son propre namespace</b> et des droits de <b>lecture</b> (<code>get</code>, <code>list</code>, <code>watch</code>) sur les ressources du cluster, nécessaires à son fonctionnement : « <b>Argo CD n\'a pas <code>cluster-admin</code></b> ».',
          'Un namespace géré par l\'instance doit porter le label <code>argocd.argoproj.io/managed-by=openshift-gitops</code>.',
          'Pour gérer d\'autres ressources de cluster, tu crées un <code>ClusterRole</code> et un <code>ClusterRoleBinding</code> pour le compte de service <code>openshift-gitops-argocd-application-controller</code>.'
        ] },
        { t: 'callout', kind: 'trap', html: "L'instance par défaut est <b>réservée aux administrateurs et à la config du cluster</b> : ne donne pas l'accès à des non-admins et ne l'utilise <b>pas pour livrer des applications</b> (la doc de multi-tenancy le déconseille). Pour les équipes : <b>des instances dédiées</b>." },
        { t: 'callout', kind: 'tip', html: "Donne à l'instance les <b>droits minimaux</b> pour ce qu'elle gère (par exemple seulement les ressources <code>config.openshift.io</code> voulues), pas un <code>cluster-admin</code> par facilité." }
      ]
    },
    {
      title: 'Une instance Argo CD d\'équipe : la CR ArgoCD',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'argocd-equipe.yaml (exemple)', code: `apiVersion: argoproj.io/v1beta1
kind: ArgoCD
metadata:
  name: equipe-a
  namespace: equipe-a-gitops
spec:
  server:
    route:
      enabled: true
  sso:
    provider: dex
    dex:
      openShiftOAuth: true
  rbac:
    policy: 'g, equipe-a-admins, role:admin'
    scopes: '[groups]'` },
        { t: 'bullets', items: [
          '<code>spec.server.route.enabled</code> : crée une <b>Route OpenShift</b> vers l\'interface (module 07).',
          '<code>spec.sso.provider: dex</code> avec <code>dex.openShiftOAuth: true</code> : Dex s\'appuie sur le <b>serveur OAuth d\'OpenShift</b> ; la page de connexion propose alors <b>« LOG IN VIA OPENSHIFT »</b> avec les comptes et <b>groupes</b> de ton fournisseur d\'identité (module 06). L\'ancien champ <code>spec.dex</code> n\'est plus supporté depuis la 1.10.',
          'Les droits <b>dans Argo CD</b> (<code>rbac</code>) sont indépendants du RBAC d\'OpenShift : décris-les par <b>groupes</b>.'
        ] },
        { t: 'callout', kind: 'warn', wide: true, html: "Structure <code>sso</code> et <code>rbac</code> conforme à l'exemple de la doc OpenShift GitOps 1.20 « Access control and user management » (le groupe <code>equipe-a-admins</code> est un exemple : prends un groupe de ton cluster). Keycloak n'est plus supporté (module 06 pour l'identité). Une instance par équipe isole les droits et les erreurs." }
      ]
    },
    {
      title: 'Une Application pour la configuration du cluster',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'application-config.yaml', code: `apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cluster-config-lab
  namespace: openshift-gitops
spec:
  project: default
  source:
    repoURL: https://git.example.com/plateforme/cluster-config.git
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
        { t: 'code', lang: 'yaml', file: 'depot-prive.yaml (dépôt privé, HTTPS)', code: `apiVersion: v1
kind: Secret
metadata:
  name: depot-cluster-config
  namespace: openshift-gitops
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://git.example.com/plateforme/cluster-config.git
  username: argocd
  password: JETON_A_NE_PAS_METTRE_EN_CLAIR_DANS_GIT` },
        { t: 'bullets', items: [
          '<b>Dépôt privé</b> : les identifiants se déclarent dans un <b>Secret</b> portant le label <code>argocd.argoproj.io/secret-type: repository</code>, avec <code>type: git</code>, <code>url</code> et <code>username</code>/<code>password</code> (HTTPS) ou <code>sshPrivateKey</code> (SSH), dans le <b>namespace de l\'instance</b> (doc Argo CD) ; ce Secret ne se met <b>pas</b> en clair dans Git (slide secrets).',
          '<code>destination.server: https://kubernetes.default.svc</code> : le <b>cluster où tourne Argo CD</b>.',
          '<b>Namespace</b> : <code>gitops-lab</code> existe déjà avec le label <code>argocd.argoproj.io/managed-by=openshift-gitops</code> (étape 3 du lab) ; <code>CreateNamespace=true</code> ne suffirait pas à lui seul si l\'instance n\'a pas le droit de créer un namespace.',
          '<code>automated</code> + <code>prune</code> + <code>selfHeal</code> : synchronisation automatique, suppression des ressources retirées de Git, correction de la dérive.',
          '<code>repoURL</code> est un <b>exemple</b> : mets l\'URL de <b>ton</b> dépôt (public ou interne, joignable depuis le cluster).'
        ] },
        { t: 'callout', kind: 'onprem', html: "Cluster déconnecté : le dépôt Git doit être <b>interne</b> (GitLab, Gitea…) ; le registre et les charts/images doivent être miroités (module 03). Un Argo CD sans accès à son dépôt reste <code>Unknown</code>." }
      ]
    },
    {
      title: 'Politiques de synchronisation et options',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Réglage', 'Effet'], rows: [
          ['<code>automated</code>', 'Argo CD synchronise seul dès qu\'il voit un écart avec Git'],
          ['<code>prune: true</code>', '<b>Supprime</b> du cluster ce qui a disparu de Git'],
          ['<code>selfHeal: true</code>', 'Ré-applique l\'état de Git quand quelqu\'un modifie une ressource à la main'],
          ['<code>CreateNamespace=true</code>', 'Crée le namespace de destination s\'il n\'existe pas'],
          ['<code>ServerSideApply=true</code>', 'Utilise le server-side apply (ressources volumineuses, conflits de champs)'],
          ['<code>Prune=false</code> (annotation)', 'Protège <b>une ressource</b> contre la suppression'],
          ['<code>PruneLast=true</code>', 'Supprime en dernier, après le déploiement du reste'],
          ['<code>ApplyOutOfSyncOnly=true</code>', 'N\'applique que ce qui diffère (moins de charge API)']
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: "<code>prune</code> sur la <b>config d'un cluster</b> peut supprimer une ressource critique si un fichier disparaît par erreur d'un commit. Protège les ressources sensibles (<code>Prune=false</code>), exige des <b>pull requests</b> relues et teste d'abord sur un cluster de lab." }
      ]
    },
    {
      title: 'Sync waves et hooks : l\'ordre compte',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'extraits (non applicables tels quels).yaml', code: `# 1. L'abonnement à l'Operator (wave -1)
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
---
# 2. La CR fournie par l'Operator (wave 1)
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "1"
    argocd.argoproj.io/sync-options: SkipDryRunOnMissingResource=true
---
# Hook exécuté avant la synchronisation
metadata:
  annotations:
    argocd.argoproj.io/hook: PreSync` },
        { t: 'bullets', items: [
          'Annotation <code>argocd.argoproj.io/sync-wave</code> : les ressources sont traitées <b>de la plus petite à la plus grande valeur</b> ; <b>0</b> par défaut, valeurs négatives possibles.',
          'Ordre complet : <b>phase</b> d\'abord, puis <b>wave</b>, puis type de ressource, puis nom. Délai entre deux waves : <b>2 s</b> (variable <code>ARGOCD_SYNC_WAVE_DELAY</code>).',
          'Hooks : <code>PreSync</code>, <code>Sync</code>, <code>PostSync</code>, <code>SyncFail</code> ; suppression selon <code>HookSucceeded</code>, <code>HookFailed</code> ou <code>BeforeHookCreation</code>.'
        ] },
        { t: 'callout', kind: 'tip', html: "Cas typique de plateforme : <b>namespace → Subscription OLM → CR de l'Operator</b> dans cet ordre (module 04). <b>Attention</b> : Argo CD n'attend pas que la <b>CRD</b> installée par OLM existe ; sans précaution, la synchronisation de la CR échoue au <i>dry run</i> (type inconnu). L'option <code>SkipDryRunOnMissingResource=true</code> (annotation <code>argocd.argoproj.io/sync-options</code> sur la ressource, ou dans <code>syncOptions</code> de l'Application) saute ce dry run quand le type est absent ; il est exécuté dès que la CRD est présente (doc Argo CD « Sync options »). Un <b>retry</b> de la synchronisation est l'autre filet (à vérifier pour ta version)." }
      ]
    },
    {
      title: 'App-of-apps et ApplicationSet',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          '<b>App-of-apps</b> : une Application « racine » pointe un dossier de <b>manifests d\'Applications</b> ; ajouter une brique = ajouter un fichier dans Git.',
          '<b>ApplicationSet</b> : un modèle + un <b>générateur</b> (liste, dossiers Git, <b>clusters</b>) qui produit une Application par élément.',
          'Idéal pour <b>plusieurs clusters</b> avec la même base et des écarts par overlay.'
        ] },
        { t: 'code', lang: 'yaml', file: 'applicationset.yaml (illustration)', code: `apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: config-par-cluster
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
        repoURL: https://git.example.com/plateforme/cluster-config.git
        targetRevision: HEAD
        path: 'overlays/{{name}}'
      destination:
        server: '{{server}}'
        namespace: openshift-config` },
        { t: 'callout', kind: 'warn', wide: true, html: "Illustration : champs du générateur et gabarits de l'<code>ApplicationSet</code> à relire dans la doc de ta version (documentation amont Argo CD et OpenShift GitOps)." }
      ]
    },
    {
      title: 'Organiser le dépôt Git de la plateforme',
      blocks: [
        { t: 'code', lang: 'bash', file: 'arborescence type', code: "cluster-config/\n├── base/\n│   ├── config-openshift/     # Proxy, Image, APIServer (module 04)\n│   ├── olm/                  # OperatorHub, Subscriptions (module 04)\n│   ├── rbac-oauth/           # OAuth, groupes, project template (module 06)\n│   ├── network/              # NetworkPolicy du template (module 07)\n│   └── machineconfig/        # chrony, kargs (modules 02, 04)\n├── overlays/\n│   ├── prod-a/               # écarts propres au cluster\n│   └── lab/\n└── apps/                     # Applications Argo CD (app-of-apps)" },
        { t: 'bullets', items: [
          '<b>base</b> + <b>overlays par cluster</b> (kustomize) : le commun une fois, les différences visibles.',
          'Un dossier = un <b>lot cohérent</b> = une Application, avec ses sync waves.',
          'Branches ou dossiers par environnement : décide de <b>l\'outil de promotion</b> (pull request) plutôt que de copier à la main.'
        ] },
        { t: 'callout', kind: 'tip', html: "Commence par <b>un seul sujet</b> (par exemple les quotas et le project template) : il est visible, peu risqué et prouve le modèle avant d'y mettre l'OAuth ou les MachineConfig." }
      ]
    },
    {
      title: 'Dérive et opérateurs : ne pas lutter',
      tag: 'piège',
      blocks: [
        { t: 'bullets', frag: true, items: [
          'Certaines ressources sont <b>modifiées par des opérateurs</b> (champs <code>status</code>, valeurs par défaut injectées, listes enrichies) : Argo CD y voit une <b>dérive permanente</b> (OutOfSync en boucle).',
          'Ne mets en Git que ce que <b>tu</b> décides ; ignore les champs gérés ailleurs avec <code>ignoreDifferences</code> (mécanisme d\'Argo CD) plutôt que de laisser <code>selfHeal</code> combattre un opérateur.',
          'Pas de réglages qui contournent l\'opérateur : passe par la CR prévue (module 04).',
          'MachineConfig et OLM : un changement en Git = <b>reboots et mises à jour de nœuds</b> (module 02) : relis avant de fusionner.'
        ] },
        { t: 'callout', kind: 'trap', html: "Un <code>selfHeal</code> qui <b>annule en boucle</b> un champ géré par un opérateur peut générer des redémarrages en cascade. Surveille le <b>nombre de synchronisations</b> et traite les OutOfSync « chroniques »." }
      ]
    },
    {
      title: 'Secrets : jamais en clair dans Git',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          'Un <code>Secret</code> K8s n\'est que de l\'encodage : <b>jamais</b> dans Git en clair (même un dépôt privé).',
          '<b>External Secrets Operator</b> : Git ne contient que la <b>référence</b> vers un coffre (Vault…) ; le secret est fabriqué dans le cluster (module 09).',
          '<b>Chiffrement dans Git</b> (outils communautaires du type Sealed Secrets ou SOPS) : possible, mais non fournis par OpenShift GitOps : statut de support à vérifier avec ton éditeur.',
          'Le chiffrement d\'etcd (module 04) protège le secret <b>dans le cluster</b>, pas dans Git.'
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: "Un secret poussé une fois dans l'historique Git est à considérer <b>compromis</b> : il faut le <b>révoquer</b> et le régénérer, pas seulement supprimer le fichier." }
      ]
    },
    {
      title: 'Multi-cluster et DR par GitOps',
      blocks: [
        { t: 'table', head: ['Approche', 'Principe', 'À savoir'], rows: [
          ['<b>Un Argo CD central</b>', 'Une instance enregistre plusieurs clusters et pousse', 'Simple ; l\'instance devient un point critique et a des droits sur tous'],
          ['<b>ApplicationSet (générateur de clusters)</b>', 'Une Application par cluster enregistré', 'Même base, overlays par cluster'],
          ['<b>Argo CD Agent</b>', 'Architecture <b>pull</b> : l\'agent du cluster récupère sa config', 'GA en OpenShift GitOps 1.19 (doc)'],
          ['<b>ACM + Argo CD (pull)</b>', 'Le hub ACM distribue ; l\'agent ACM tire l\'Application', 'Introduit en Technology Preview dans ACM 2.8 ; statut actuel : à vérifier']
        ] },
        { t: 'flow', nodes: [
          'Cluster perdu',
          { label: 'Réinstaller', sub: 'module 03' },
          { label: 'Bootstrap GitOps', sub: 'Operator + Application racine', hl: true },
          { label: 'Config revient de Git', sub: 'OAuth, quotas, OLM…' },
          { label: 'Données', sub: 'OADP (module 11)', hl: true }
        ], caption: 'GitOps reconstruit la <b>configuration</b> ; les <b>données</b> viennent des sauvegardes (module 11).' }
      ]
    },
    {
      title: 'OpenShift Pipelines et Builds : survol',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Outil', 'Rôle', 'À retenir côté plateforme'], rows: [
          ['<b>OpenShift Pipelines</b> (Tekton)', 'CI/CD en pipelines de tâches dans des pods', 'Operator via OLM ; version 1.20 : OCP 4.14 et 4.16 à 4.21 ; 1.21 : intégration console jusqu\'à 4.20'],
          ['<b>ClusterTask</b>', 'Ancienne tâche cluster-scoped', 'Dépréciée, <b>retirée en 1.17</b> : remplacée par les <b>résolveurs</b> Tekton (GA depuis 1.11)'],
          ['<b>Builds for OpenShift</b> (Shipwright)', 'Construction d\'images sur le cluster', 'Builds 1.6 (Shipwright 0.17, GA) pour 4.20 ; 1.7 pour 4.16 à 4.21'],
          ['<b>BuildConfig</b>', 'Mécanisme de build historique d\'OCP', 'Toujours présent ; statut de dépréciation en 4.20 non confirmé : à vérifier']
        ] },
        { t: 'callout', kind: 'ocp', wide: true, html: "Ces outils relèvent du <b>développement applicatif</b> et des équipes : l'admin plateforme les <b>installe, versionne et supervise</b> (Operators, droits, quotas des namespaces de build). Le détail des pipelines est hors périmètre de ce cours." }
      ]
    },
    {
      title: 'Quiz',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Ton Argo CD par défaut n\'arrive pas à créer une ressource de configuration du cluster. Quelle est la cause la plus probable et la réponse adaptée ?', options: ['Le dépôt Git est privé : il faut le passer en public', 'Il faut redémarrer l\'Operator OpenShift GitOps', 'L\'instance par défaut n\'a pas <code>cluster-admin</code> : crée un ClusterRole et un ClusterRoleBinding limités pour son compte de service', 'Il faut utiliser <code>kubectl apply</code> à la place d\'Argo CD'], answer: 2, explain: 'L\'instance par défaut a les droits admin dans son namespace et la lecture du cluster, mais pas cluster-admin. Pour gérer d\'autres ressources, on ajoute un ClusterRole/ClusterRoleBinding au compte de service <code>openshift-gitops-argocd-application-controller</code>, avec le minimum de droits.' },
        { t: 'quiz', q: 'Avec <code>selfHeal: true</code>, que se passe-t-il quand un administrateur modifie à la main une ressource gérée par Argo CD ?', options: ['Argo CD ré-applique l\'état décrit dans Git et annule la modification', 'Argo CD met à jour le dépôt Git avec la modification manuelle', 'Rien : Argo CD ne regarde que les nouveaux commits', 'L\'Application est supprimée du cluster'], answer: 0, explain: '<code>selfHeal</code> ramène le cluster à l\'état de Git. C\'est ce qui rend la dérive visible et corrigée ; à manier avec précaution pour les ressources que des opérateurs modifient aussi.' },
        { t: 'quiz', q: 'Tu dois créer d\'abord le namespace et la Subscription d\'un Operator, puis la CR qu\'il fournit. Quel mécanisme d\'Argo CD utilises-tu ?', options: ['L\'annotation <code>Prune=false</code> sur la CR', 'Le champ <code>destination</code> de l\'Application', 'Un <code>AppProject</code> par ressource', 'L\'annotation <code>argocd.argoproj.io/sync-wave</code> avec des valeurs croissantes'], answer: 3, explain: 'Les sync waves ordonnent l\'application des ressources, de la plus petite à la plus grande valeur : Subscription en wave basse, CR de l\'Operator en wave plus haute, une fois la CRD disponible.' }
      ]
    },
    {
      title: 'Les manifestes du lab',
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
  name: banniere
  namespace: gitops-lab
data:
  message: "Géré par GitOps : ne pas modifier à la main"` },
        { t: 'callout', kind: 'tip', html: "Dépose ces deux fichiers dans le dossier <code>lab/</code> d'un <b>dépôt Git à toi</b> (GitHub, GitLab, Gitea interne… joignable depuis le cluster). Le lab ne référence aucun dépôt fourni : crée le tien. Le namespace <code>gitops-lab</code> est créé <b>à la main</b> (étape 3) avec le label de gestion." }
      ]
    },
    {
      title: 'Lab : première Application GitOps',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'Installer OpenShift GitOps, synchroniser un quota, provoquer une dérive', goal: 'Noyau en séance sur un SNO (cluster-admin) avec un dépôt Git accessible. Les étapes (bonus) sont à faire en autonomie.', steps: [
          'Prérequis : environnement E0/E1 avec <code>cluster-admin</code>, voir module 00 ; un <b>dépôt Git</b> (public ou interne) joignable depuis le cluster, où tu peux pousser. Dépôt <b>privé</b> : crée le Secret de la slide « Une Application » (label <code>argocd.argoproj.io/secret-type: repository</code>) dans <code>openshift-gitops</code> avec un jeton de lecture, <b>sans le committer</b>.',
          'Installe <b>OpenShift GitOps</b> (OperatorHub, canal <code>latest</code>, namespace <code>openshift-gitops-operator</code>) puis vérifie les pods de <code>openshift-gitops</code> et la connexion à Argo CD via « LOG IN VIA OPENSHIFT ».',
          'Crée le namespace géré : <code>oc create namespace gitops-lab</code> puis <code>oc label namespace gitops-lab argocd.argoproj.io/managed-by=openshift-gitops</code> ; pousse dans <code>lab/</code> les deux manifestes de la slide précédente.',
          'Crée l\'<code>Application</code> (slide dédiée, avec l\'URL de ton dépôt, sans <code>CreateNamespace</code> puisque le namespace existe) et vérifie qu\'elle passe <b>Synced</b> et <b>Healthy</b> et que le quota et le ConfigMap existent.',
          'Provoque une dérive : <code>oc delete configmap banniere -n gitops-lab</code> puis modifie le quota à la main ; observe la <b>correction par selfHeal</b>. Coupe ensuite <code>selfHeal</code> et constate l\'état <b>OutOfSync</b>. <b>Retour arrière</b> : supprime l\'Application (<code>oc delete application cluster-config-lab -n openshift-gitops</code>) puis le namespace du lab.',
          '(bonus, E1) Transforme le dossier en <b>app-of-apps</b> : une Application racine qui déploie deux Applications filles ; ajoute une sync wave entre elles.',
          '(bonus, E1 jetable) Donne à l\'instance un <code>ClusterRole</code>/<code>ClusterRoleBinding</code> minimal pour gérer une ressource de cluster (par exemple un <code>ResourceQuota</code> via template de projet, module 06) et vérifie ses droits avec <code>oc auth can-i create resourcequotas --as system:serviceaccount:openshift-gitops:openshift-gitops-argocd-application-controller -n gitops-lab</code>.',
          '(bonus, E2) <code>ApplicationSet</code> avec le générateur de clusters sur deux clusters enregistrés.'
        ] }
      ]
    }
  ],
  takeaways: [
    'GitOps de plateforme : la configuration du cluster (modules 04, 06, 07…) vit dans Git ; Argo CD l\'applique et corrige la dérive ; reconstruire un cluster passe par Git (module 11).',
    'OpenShift GitOps : canal <code>latest</code>, namespace <code>openshift-gitops-operator</code>, instance par défaut dans <code>openshift-gitops</code> ; versions 1.18 et 1.19 compatibles avec la 4.20.',
    'L\'instance par défaut n\'a <b>pas cluster-admin</b> : admin dans son namespace et lecture du cluster ; droits élargis par un ClusterRole minimal ; label <code>argocd.argoproj.io/managed-by</code> pour les namespaces gérés.',
    'Application, AppProject, ApplicationSet ; <code>automated</code>, <code>prune</code>, <code>selfHeal</code> ; sync waves et hooks pour l\'ordre ; app-of-apps pour structurer.',
    'Jamais de secret en clair dans Git (External Secrets, module 09) ; ne lutte pas contre les opérateurs (<code>ignoreDifferences</code>, CR prévues).',
    'Pipelines (Tekton, ClusterTask retiré en 1.17) et Builds (Shipwright) : survol ; l\'admin les installe et les supervise, le développement applicatif reste hors périmètre.'
  ]
});
