COURSE.add({
  id: 'm13', num: 13, emoji: '🖥️',
  title: 'Virtualisation & Serverless',
  tagline: 'Deux façons de ne plus penser « serveur » : des VM comme des pods avec OpenShift Virtualization, et des services qui dorment à zéro avec OpenShift Serverless.',
  duration: '≈ 60 min + lab 25 min',
  objectives: [
    'Installer OpenShift Virtualization et situer ses prérequis (CPU, stockage RWX, réseau)',
    'Décrire une VM sur OpenShift (VirtualMachine, DataVolume, instance types) et sa migration à chaud',
    'Planifier une migration depuis VMware avec le Migration Toolkit for Virtualization (MTV)',
    'Installer OpenShift Serverless et déployer un service Knative qui passe à zéro réplica',
    'Comprendre révisions, répartition de trafic, Eventing et ce que l\'admin plateforme gère'
  ],
  slides: [
    {
      title: 'Deux volets, un module',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '🖥️ Partie A — Virtualisation', items: ['Des <b>VM</b> gérées comme des objets Kubernetes', 'Pour <b>migrer ou garder</b> des charges non conteneurisées', 'Matériel adapté (bare metal, stockage partagé)', 'Lab complet : niveau <b>E3</b>'] },
          right: { title: '⚡ Partie B — Serverless', items: ['Des <b>services</b> qui montent et descendent <b>à zéro</b>', 'Pour des charges HTTP ou événementielles à la demande', 'Un Operator de plus, sans exigence matérielle', 'Lab complet : niveau <b>E1</b>'] },
          verdict: 'Les deux s\'installent par <b>Operator</b> (module 04) et s\'exploitent comme le reste de la plateforme : quotas, RBAC, sauvegarde, mises à jour.' },
        { t: 'bullets', frag: true, items: [
          '<b>Frontières</b> : stockage et snapshots → module 08 ; réseau → module 07 ; sauvegarde → module 11 ; mises à jour → module 12 ; sécurité → module 09 ; GitOps → module 10.',
          'Version de référence : <b>4.20 EUS</b>. Le module est découpé en deux parties à <b>poids égal</b> ; la partie B est la plus accessible en lab.'
        ] }
      ]
    },
    {
      title: 'A1 — OpenShift Virtualization : le principe',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'VirtualMachine', sub: 'objet déclaratif' },
          { label: 'VirtualMachineInstance', sub: 'la VM qui tourne', hl: true },
          { label: 'Pod virt-launcher', sub: 'conteneur avec QEMU/KVM' },
          { label: 'Nœud', sub: 'KVM, stockage, réseau' }
        ], caption: 'Une VM est <b>un pod particulier</b> : planifiée, supervisée, sauvegardée et mise en réseau avec les mêmes mécanismes qu\'un conteneur.' },
        { t: 'bullets', frag: true, items: [
          '<b>KubeVirt</b> est le projet amont ; <b>OpenShift Virtualization</b> en est la distribution supportée, installée par un Operator.',
          'Une même plateforme pour <b>conteneurs et VM</b> : un seul réseau, un seul RBAC, un seul outil de déploiement.',
          'Console : une vue <b>Virtualization</b> (VM, templates, migrations) et la ligne de commande <code>virtctl</code>.'
        ] },
        { t: 'callout', kind: 'cloud', html: "Face à vSphere : tu perds les outils d'infrastructure habituels (vCenter, DRS) mais tu gagnes un <b>modèle unique</b> pour VM et conteneurs. On-prem, le choix du matériel et du stockage <b>est le projet</b> ; en cloud managé, les VM sont souvent déjà fournies par l'IaaS (à vérifier selon l'offre)." }
      ]
    },
    {
      title: 'A2 — Prérequis matériels et d\'infrastructure',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          '<b>CPU</b> : processeurs supportés par RHEL 9, avec les <b>extensions de virtualisation</b> (Intel VT ou AMD-V) activées dans le firmware.',
          '<b>KVM</b> : la virtualisation s\'appuie sur le noyau Linux ; la <b>virtualisation imbriquée</b> est destinée au développement et aux tests.',
          '<b>Stockage</b> : accès <b>RWX</b> (partagé) pour la migration à chaud ; snapshots CSI (module 08).',
          '<b>Réseau</b> : réseau des pods par défaut, réseaux secondaires pour l\'isolation (module 07).',
          '<b>Plateforme</b> : de préférence <b>bare metal</b> ; plateformes supportées et dimensionnement exact : à vérifier dans « Hardware, software, and operational requirements » de la 4.20.'
        ] },
        { t: 'callout', kind: 'onprem', html: "Ton lab sur VM (hyperviseur imbriqué) ne se comporte pas comme une production bare metal : performances, migration à chaud et pannes ne sont pas représentatifs. C'est pour cela que le lab VM est classé <b>E3</b>." },
        { t: 'callout', kind: 'warn', html: "Compatibilité : OpenShift Virtualization 4.20 est supporté avec OCP 4.20 (notes de version 4.20). Version et fonctions exactes : release notes « Virtualization » de ta version." }
      ]
    },
    {
      title: 'A3 — Installer OpenShift Virtualization',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'cnv.yaml (procédure CLI de la doc)', code: `apiVersion: v1
kind: Namespace
metadata:
  name: openshift-cnv
---
apiVersion: operators.coreos.com/v1
kind: OperatorGroup
metadata:
  name: kubevirt-hyperconverged-group
  namespace: openshift-cnv
spec:
  targetNamespaces:
  - openshift-cnv
---
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: hco-operatorhub
  namespace: openshift-cnv
spec:
  channel: stable
  name: kubevirt-hyperconverged
  source: redhat-operators
  sourceNamespace: openshift-marketplace
---
apiVersion: hco.kubevirt.io/v1beta1
kind: HyperConverged
metadata:
  name: kubevirt-hyperconverged
  namespace: openshift-cnv
spec: {}` },
        { t: 'bullets', items: [
          'Le canal <code>stable</code> installe la version <b>compatible avec ta version d\'OCP</b> (doc) ; le <code>HyperConverged</code> est la CR qui déploie tous les composants.',
          'Vérifications : <code>oc get csv -n openshift-cnv</code> et <code>oc get hco -n openshift-cnv kubevirt-hyperconverged -o json | jq .status.conditions</code>.'
        ] },
        { t: 'callout', kind: 'warn', html: "OperatorGroup, Subscription et noms viennent de la procédure CLI de la doc (module de souscription 4.20) ; <code>apiVersion</code> exacte du <code>HyperConverged</code> et options (placement infra/workloads) : à vérifier dans « Installing OpenShift Virtualization »." }
      ]
    },
    {
      title: 'A4 — Les objets d\'une VM',
      blocks: [
        { t: 'table', head: ['Objet', 'Rôle'], rows: [
          ['<code>VirtualMachine</code> (<code>kubevirt.io/v1</code>)', 'Déclaration de la VM (état souhaité, stratégie de démarrage)'],
          ['<code>VirtualMachineInstance</code>', 'La VM <b>en cours d\'exécution</b>, créée à partir de la précédente'],
          ['<code>DataVolume</code>', 'Disque importé ou cloné vers un PVC (via CDI)'],
          ['<code>DataSource</code> / boot sources', 'Images de démarrage prêtes à cloner (RHEL, etc.)'],
          ['Instance types et preferences', 'Tailles standard (CPU, mémoire) et réglages d\'OS réutilisables'],
          ['Templates', 'Modèles de VM de la console (mécanisme historique)']
        ] },
        { t: 'callout', kind: 'tip', html: "Raisonne en <b>deux niveaux</b> : l'<b>objet</b> (VirtualMachine) que tu gères en GitOps (module 10), et l'<b>instance</b> qui tourne et que tu migres, démarres ou arrêtes." },
        { t: 'callout', kind: 'warn', html: "Les <code>apiVersion</code> et noms des types (instance types, CDI, boot sources) varient selon la version : contrôle avec <code>oc explain</code> et la doc 4.20 avant d'écrire tes manifestes." }
      ]
    },
    {
      title: 'A5 — Créer et piloter une VM',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'vm.yaml (illustration : DataVolume non fourni)', code: `apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: vm-demo
  namespace: vms
spec:
  runStrategy: Always
  template:
    spec:
      domain:
        cpu:
          cores: 2
        memory:
          guest: 4Gi
        devices:
          disks:
          - name: rootdisk
            disk:
              bus: virtio
      volumes:
      - name: rootdisk
        dataVolume:
          name: vm-demo-root` },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc get vm,vmi -n vms\n$ virtctl start vm-demo -n vms\n$ virtctl console vm-demo -n vms\n$ virtctl stop vm-demo -n vms" },
        { t: 'bullets', wide: true, items: [
          '<b>Illustration</b> : le <code>DataVolume</code> <code>vm-demo-root</code> référencé n\'est <b>pas fourni</b> ici (disque importé ou cloné depuis une boot source) ; le YAML n\'est donc pas applicable tel quel.',
          'Le plus simple pour démarrer : la <b>console</b> (<b>Virtualization → Create VirtualMachine</b>) à partir d\'un modèle ou d\'une boot source.',
          '<code>virtctl</code> sert à démarrer, arrêter, ouvrir la console série ou VNC et exposer des ports.'
        ] }
      ]
    },
    {
      title: 'A6 — Stockage des VM',
      blocks: [
        { t: 'table', head: ['Besoin', 'Exigence', 'Renvoi'], rows: [
          ['<b>Migration à chaud</b>', 'Stockage partagé en <code>ReadWriteMany</code> (RWX)', 'Module 08 : RWX bloc (<code>volumeMode: Block</code>) selon le backend'],
          ['<b>Snapshots et clones</b>', 'Driver CSI avec snapshots', 'Module 08 : un snapshot n\'est pas une sauvegarde'],
          ['<b>Agrandissement</b>', 'StorageClass avec expansion', 'Module 08'],
          ['<b>Performance</b>', 'Latence et débit adaptés au système invité', 'Module 08, disques rapides']
        ] },
        { t: 'callout', kind: 'trap', html: "Une VM sur un volume <b>RWO</b> (un seul nœud) fonctionne, mais <b>ne migre pas à chaud</b> : elle doit être arrêtée pour être déplacée. Décide le type de stockage <b>avant</b> de monter la plateforme de VM." },
        { t: 'callout', kind: 'onprem', html: "Sur site, le stockage RWX est typiquement <b>ODF/CephFS ou RBD bloc</b> ou une baie compatible CSI : c'est la décision d'architecture n°1 du projet de virtualisation (module 08)." }
      ]
    },
    {
      title: 'A7 — Réseau des VM',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Mode', 'Principe', 'Usage'], rows: [
          ['<b>Réseau des pods</b>', 'La VM utilise le réseau OVN-Kubernetes du cluster', 'Cas par défaut ; Services et Routes comme pour un pod'],
          ['<b>Réseau secondaire</b> (Multus)', 'Interface supplémentaire vers un VLAN ou un bridge', 'Trafic séparé, migration depuis vSphere avec VLAN'],
          ['<b>UDN primaire</b>', 'Réseau utilisateur isolé comme réseau principal de la VM', 'Isolation forte, adresses stables (module 07)']
        ] },
        { t: 'bullets', items: [
          'Les VM peuvent utiliser un <b>UserDefinedNetwork</b> de rôle <b>Primary</b> : la doc 4.20 prévoit ce cas pour OpenShift Virtualization.',
          'Les NetworkPolicy et AdminNetworkPolicy du module 07 s\'appliquent aux VM sur le réseau principal.',
          'Réseau de <b>migration</b> : un réseau Multus dédié est « fortement recommandé » (slide suivante).'
        ] },
        { t: 'callout', kind: 'tip', wide: true, html: "Reproduis tes <b>VLAN</b> existants avec NMState et des NetworkAttachmentDefinition (module 07) plutôt que de recréer des adresses IP : c'est ce qui rend une migration depuis vSphere <b>transparente</b> pour les applications." }
      ]
    },
    {
      title: 'A8 — Migration à chaud (live migration)',
      blocks: [
        { t: 'flow', nodes: [
          'VM sur le nœud A',
          { label: 'Copie de la mémoire', sub: 'pendant que la VM tourne', hl: true },
          { label: 'Bascule', sub: 'courte pause' },
          'VM sur le nœud B'
        ], caption: 'Utilisée pour <b>vider un nœud</b> (drain, mise à jour : module 12) sans arrêter les VM.' },
        { t: 'bullets', frag: true, items: [
          '<b>Prérequis</b> : stockage partagé <b>RWX</b>, <b>RAM et bande passante</b> suffisantes, nœuds compatibles avec le CPU « host model » de la VM.',
          '<b>Capacité</b> : prévoir assez de mémoire libre pour absorber les VM d\'un nœud drainé (produit du nombre de nœuds drainés en parallèle par la plus grosse VM) ; <b>5</b> migrations parallèles par défaut dans le cluster.',
          '<b>Réseau</b> : un réseau Multus <b>dédié</b> à la migration évite de saturer le réseau applicatif.'
        ] },
        { t: 'callout', kind: 'warn', html: "Un nœud drainé à la va-vite sans capacité suffisante laisse des VM sans place. Dimensionne <b>avant</b> les mises à jour (module 12) : chaque redémarrage de nœud devient une vague de migrations." }
      ]
    },
    {
      title: 'A9 — Migrer depuis VMware : MTV',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Élément', 'Ce qu\'il faut savoir'], rows: [
          ['<b>Outil</b>', '<b>Migration Toolkit for Virtualization</b> (Operator) : migre à grande échelle depuis vSphere (aussi RHV, OpenStack, autres clusters)'],
          ['<b>Version</b>', 'MTV 2.10 : OCP 4.18 à 4.20 ; <b>2.11</b> : 4.19 à 4.21 ; <b>2.12</b> : 4.20 à 4.22 (cycle de vie) ; vSphere 6.5 ou plus récent (doc 2.10)'],
          ['<b>Cold</b>', 'VM <b>éteinte</b>, pas de stockage partagé requis'],
          ['<b>Warm</b>', 'VM <b>allumée</b> pendant la copie ; exige un stockage commun'],
          ['<b>VDDK</b>', 'Fortement recommandé ; sans lui, les VM sur <b>vSAN</b> ne migrent pas']
        ] },
        { t: 'bullets', items: [
          'Ressources (<code>forklift.konveyor.io/v1beta1</code>) : <code>Provider</code> (source et destination), <code>StorageMap</code>, <code>NetworkMap</code>, <code>Plan</code>, <code>Migration</code>.',
          'Flux réseau : TCP 443 (vCenter/ESXi), 902 (transfert de disques ESXi).',
          'Le VDDK est un SDK VMware à fournir comme <b>image</b> : à déclarer dans <code>spec.vddkInitImage</code> du <code>HyperConverged</code> (doc MTV) <b>et</b> dans le champ <code>vddkInitImage</code> du <code>Provider</code> vSphere (réglages du provider ; chemin exact du champ : à vérifier). Ce champ du provider n\'est pas obligatoire mais l\'omettre <b>ralentit fortement</b> le transfert des disques.'
        ] },
        { t: 'callout', kind: 'warn', wide: true, html: "Le parcours complet (inventaire, mappings de stockage et de réseau, fenêtre de basculement, pilotes invités) est dans la doc MTV : <b>à relire pour ta version</b> avant tout projet réel." }
      ]
    },
    {
      title: 'A10 — Exploiter des VM : sauvegarde, sécurité, mises à jour',
      blocks: [
        { t: 'table', head: ['Sujet', 'Ce qui change pour une VM', 'Renvoi'], rows: [
          ['<b>Sauvegarde</b>', 'OADP sauvegarde les VM et leurs volumes ; tester la <b>restauration</b> comme pour une appli', 'Module 11'],
          ['<b>Sécurité</b>', 'Les pods de VM ont des exigences propres (SCC) ; droits des utilisateurs sur les VM par RBAC', 'Modules 09 et 06'],
          ['<b>Mises à jour</b>', 'Chaque nœud drainé migre ses VM ; l\'Operator se met à jour aussi', 'Module 12'],
          ['<b>Quotas</b>', 'CPU et mémoire des VM comptent comme n\'importe quelle charge', 'Modules 06 et 12'],
          ['<b>GitOps</b>', 'Les VirtualMachine sont des objets déclaratifs, donc versionnables', 'Module 10']
        ] },
        { t: 'callout', kind: 'trap', html: "Une VM n'est pas « un pod qui ne redémarre jamais » : <b>un redémarrage de nœud</b> la migre ou la coupe. Définis par VM sa <b>stratégie d'éviction</b> et son besoin de disponibilité." },
        { t: 'callout', kind: 'tip', html: "Garde un <b>inventaire</b> des VM et de leurs dépendances (VLAN, licences invités, agents) : c'est lui qui fait la différence entre une migration réussie et un incident." }
      ]
    },
    {
      title: 'B1 — OpenShift Serverless : le principe',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Requête / événement', sub: 'HTTP ou CloudEvent' },
          { label: 'Knative Serving', sub: 'route et autoscale', hl: true },
          { label: 'Pods', sub: '0 à N réplicas' },
          { label: 'Knative Eventing', sub: 'brokers, triggers', hl: true }
        ], caption: 'Deux moteurs : <b>Serving</b> (services HTTP qui montent et redescendent à zéro) et <b>Eventing</b> (acheminement d\'événements).' },
        { t: 'bullets', frag: true, items: [
          '<b>OpenShift Serverless</b> est la distribution supportée de <b>Knative</b>, installée par un Operator.',
          'Version courante de la doc : <b>1.37</b> (Knative Serving, Eventing et Kourier en 1.17).',
          'Cas d\'usage : API peu sollicitées, traitements à la demande, réactions à des événements ; pas pour des charges stables en continu.'
        ] },
        { t: 'callout', kind: 'ocp', html: "<b>Compatibilité</b> (page « OpenShift Operator Life Cycles » de Red Hat) : <b>OpenShift Serverless 1.37</b> est supporté sur <b>OCP 4.16 à 4.20</b> ; disponibilité générale le 24 novembre 2025 ; support complet jusqu'à la sortie de la 1.38 + 1 mois. Sur OCP 4.21 et plus, des notes de version signalent un réglage de limite de fichiers ouverts de Kourier avec la 1.37.0 et les versions antérieures : à vérifier dans les notes de ta version." }
      ]
    },
    {
      title: 'B2 — Installer OpenShift Serverless',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'serverless.yaml (procédure CLI de la doc 1.37)', code: `apiVersion: v1
kind: Namespace
metadata:
  name: openshift-serverless
---
apiVersion: operators.coreos.com/v1
kind: OperatorGroup
metadata:
  name: serverless-operators
  namespace: openshift-serverless
spec: {}
---
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: serverless-operator
  namespace: openshift-serverless
spec:
  channel: stable
  name: serverless-operator
  source: redhat-operators
  sourceNamespace: openshift-marketplace` },
        { t: 'code', lang: 'yaml', file: 'knative.yaml', code: `apiVersion: v1
kind: Namespace
metadata:
  name: knative-serving
---
apiVersion: v1
kind: Namespace
metadata:
  name: knative-eventing
---
apiVersion: operator.knative.dev/v1beta1
kind: KnativeServing
metadata:
  name: knative-serving
  namespace: knative-serving
---
apiVersion: operator.knative.dev/v1beta1
kind: KnativeEventing
metadata:
  name: knative-eventing
  namespace: knative-eventing` },
        { t: 'bullets', wide: true, items: [
          'Canaux : <code>stable</code> (dernière version) ou <code>stable-1.37</code> (maintenance) ; les namespaces <code>knative-serving</code> et <code>knative-eventing</code> doivent exister avant les CR.',
          'Vérification : conditions <code>InstallSucceeded</code> et <code>Ready</code> à <code>True</code> (<code>oc get knativeserving.operator.knative.dev/knative-serving -n knative-serving</code>).'
        ] }
      ]
    },
    {
      title: 'B3 — Ce que l\'admin plateforme gère',
      blocks: [
        { t: 'table', head: ['Sujet', 'Point d\'attention'], rows: [
          ['<b>Ingress</b>', 'Par défaut <b>Kourier</b> (namespace <code>knative-serving-ingress</code>) ; Istio/Service Mesh possible : choix d\'architecture'],
          ['<b>Certificats et domaines</b>', 'Routes OpenShift créées pour les services ; certificat par défaut du routeur (module 04), domaines personnalisés (module 07)'],
          ['<b>Quotas</b>', 'Un service qui monte en charge consomme vite : <b>quotas par projet</b> et plafonds <code>max-scale</code> (module 06)'],
          ['<b>Capacité</b>', 'Les « cold starts » et les pics demandent de la marge sur les workers (module 12)'],
          ['<b>Configuration</b>', 'Réglages de l\'autoscaler dans la ConfigMap <code>config-autoscaler</code> de <code>knative-serving</code>'],
          ['<b>Mises à jour</b>', 'Operator via OLM, canal choisi (modules 04 et 12)']
        ] },
        { t: 'callout', kind: 'onprem', html: "Cluster déconnecté : le catalogue de l'Operator et les <b>images d'exemple</b> sont à miroiter (module 03). Le serveur d'événements externe (Kafka, broker) est ton infrastructure." }
      ]
    },
    {
      title: 'B4 — Un service Knative',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'service-knative.yaml', code: `apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: showcase
  namespace: serverless-demo
spec:
  template:
    metadata:
      name: showcase-v1          # nom de la révision (préfixé par le nom du Service)
      annotations:
        autoscaling.knative.dev/max-scale: "5"
    spec:
      containers:
      - image: quay.io/openshift-knative/showcase` },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc apply -f service-knative.yaml\n$ oc get ksvc -n serverless-demo\n$ oc get revision -n serverless-demo   # showcase-v1\n$ kn service list -n serverless-demo" },
        { t: 'bullets', wide: true, items: [
          'Un seul objet <code>Service</code> (<code>serving.knative.dev/v1</code>) crée la <b>Configuration</b>, la <b>Route</b> Knative et les <b>révisions</b>. Sans <code>template.metadata.name</code>, Knative <b>génère</b> le nom (par exemple <code>showcase-00001</code>) : nomme la révision pour pouvoir la citer dans <code>spec.traffic</code>.',
          '<b>Scale-to-zero</b> : sans trafic, le nombre de réplicas descend à <b>0</b> ; la première requête redémarre un pod (<i>cold start</i>).'
        ] },
        { t: 'callout', kind: 'warn', wide: true, html: "Image d'exemple : celle de la doc OpenShift Serverless ; adapte-la à ton registre, notamment en réseau déconnecté (module 03). La commande <code>kn service create</code> crée un Service équivalent mais avec un <b>nom de révision généré</b> : pour le partage de trafic, utilise le YAML nommé ci-dessus." }
      ]
    },
    {
      title: 'B5 — Révisions et répartition du trafic',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'trafic.yaml', code: `apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: showcase
  namespace: serverless-demo
spec:
  template:
    metadata:
      name: showcase-v2
    spec:
      containers:
      - image: quay.io/openshift-knative/showcase
        env:
        - name: VERSION
          value: "2"
  traffic:
  - revisionName: showcase-v1
    percent: 80
  - revisionName: showcase-v2
    percent: 20` },
        { t: 'bullets', items: [
          'Chaque changement de <code>spec.template</code> crée une <b>révision</b> immuable ; les anciennes restent disponibles. Ici le template reçoit le nom <code>showcase-v2</code> alors que <code>showcase-v1</code> existe déjà (slide B4) : chaque <code>revisionName</code> doit <b>désigner une révision existante</b> et les pourcentages totaliser <b>100</b> (doc Knative).',
          '<code>spec.traffic</code> répartit le trafic par pourcentage : déploiement <b>canari</b>, retour arrière immédiat en remettant 100 % sur l\'ancienne révision.'
        ] },
        { t: 'callout', kind: 'tip', html: "Nomme tes révisions (<code>metadata.name</code> du template) pour pouvoir les référencer : c'est ce qui permet aussi de les piloter en <b>GitOps</b> (module 10)." }
      ]
    },
    {
      title: 'B6 — Autoscaling et scale-to-zero',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Réglage', 'Effet'], rows: [
          ['<code>autoscaling.knative.dev/min-scale</code>', 'Nombre minimal de réplicas (défaut <b>0</b> avec le KPA et le scale-to-zero activé, 1 sinon)'],
          ['<code>autoscaling.knative.dev/max-scale</code>', 'Plafond de réplicas : protège la capacité du cluster'],
          ['<code>config-autoscaler</code> (<code>knative-serving</code>)', 'Réglages globaux : valeurs par défaut, délais'],
          ['Classe d\'autoscaler (KPA)', 'Autoscaler Knative basé sur la concurrence et les requêtes']
        ] },
        { t: 'bullets', items: [
          '<b>Scale-to-zero</b> économise des ressources mais ajoute une <b>latence de démarrage</b> : mets <code>min-scale: "1"</code> pour les services sensibles à la latence.',
          'Les paramètres fins (grâce avant la mise à zéro, cible de concurrence) : doc de la version ; <b>à vérifier</b> pour les valeurs par défaut de 1.37.'
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: "Un service à <code>max-scale</code> élevé et sans quota peut <b>absorber un pic</b> en consommant les workers d'autres équipes. Fixe un plafond par service et un <b>quota de projet</b> (module 06)." }
      ]
    },
    {
      title: 'B7 — Knative Eventing : brokers et triggers',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Source', sub: 'HTTP, Kafka, API Kubernetes…' },
          { label: 'Broker', sub: 'reçoit les CloudEvents', hl: true },
          { label: 'Trigger', sub: 'filtre par attributs' },
          { label: 'Abonné', sub: 'Service Knative ou autre' }
        ], caption: 'Les événements circulent au format <b>CloudEvents</b> ; les services sont <b>découplés</b> de leurs producteurs.' },
        { t: 'code', lang: 'yaml', file: 'eventing.yaml', code: `apiVersion: eventing.knative.dev/v1
kind: Broker
metadata:
  name: default
  namespace: serverless-demo
---
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: vers-showcase
  namespace: serverless-demo
spec:
  broker: default
  filter:
    attributes:
      type: demo.commande
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: showcase` },
        { t: 'callout', kind: 'warn', html: "Champs et sources disponibles : à relire dans la doc Eventing de ta version d'OpenShift Serverless (<code>eventing.knative.dev/v1</code> d'après la nomenclature Knative)." }
      ]
    },
    {
      title: 'B8 — Eventing avec Kafka et évolutions de l\'API',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          '<b>Kafka</b> sert de transport durable pour Eventing (brokers et sources Kafka) ; le cluster Kafka est <b>ton</b> infrastructure (opérateur Streams ou externe).',
          'Dans l\'historique de la 1.37, la doc signale des <b>retraits</b> : API <code>v1alpha1</code> de Serving et Eventing, API <code>KafkaBinding</code>, déploiements <code>domain-mapping</code> ; les <b>brokers Kafka à portée de namespace</b> sont encore dépréciés.',
          'Conséquence : <b>relis les notes de version</b> avant chaque mise à jour mineure d\'OpenShift Serverless (module 12) et migre tes manifestes hors des API retirées.'
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: "Des manifestes écrits pour d'anciennes versions (<code>v1alpha1</code>) <b>cessent de fonctionner</b> après une mise à jour. Passe par une <b>revue d'API</b> (module 12) et valide en lab avant la production." },
        { t: 'callout', kind: 'onprem', wide: true, html: "Brokers, topics et rétention Kafka sont des sujets d'<b>exploitation</b> à planifier (stockage, sauvegarde, sécurité : modules 08, 11 et 09)." }
      ]
    },
    {
      title: 'B9 — Functions, cas d\'usage et limites',
      blocks: [
        { t: 'table', head: ['Sujet', 'Ce qu\'il faut retenir'], rows: [
          ['<b>Functions</b> (<code>kn func</code>)', 'Écrire des fonctions et les déployer comme services Knative ; le runtime <b>Python</b> est passé en GA dans la 1.37 ; statut des autres runtimes : à vérifier'],
          ['<b>Bon usage</b>', 'Charges <b>intermittentes</b> ou événementielles, API peu utilisées, intégrations'],
          ['<b>Moins adapté</b>', 'Charges stables 24/7, latence strictement constante, démarrage très lent'],
          ['<b>Limites plateforme</b>', 'Cold start, quotas, réseaux d\'ingress, dépendances (Kafka, Service Mesh) à exploiter'],
          ['<b>Statut du produit</b>', 'OpenShift Serverless 1.37 (Knative 1.17) est supporté sur OCP 4.16 à 4.20 (cycle de vie des Operators Red Hat)']
        ] },
        { t: 'callout', kind: 'tip', html: "Avant d'ouvrir le serverless à des équipes, fixe <b>trois règles</b> : image de base et registre autorisés, quotas par projet, et <b>propriétaire</b> des événements (qui produit, qui consomme)." }
      ]
    },
    {
      title: 'Quiz',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Quelle exigence de stockage faut-il pour permettre la migration à chaud d\'une VM entre deux nœuds ?', options: ['Un volume local (<code>ReadWriteOnce</code>) sur chaque nœud', 'Un snapshot CSI du volume avant chaque déplacement', 'Un stockage partagé en <code>ReadWriteMany</code> (RWX)', 'Aucune : la migration à chaud copie toujours les disques'], answer: 2, explain: 'La migration à chaud suppose que les deux nœuds accèdent au même volume : stockage partagé RWX. Avec un volume RWO, la VM doit être arrêtée pour être déplacée.' },
        { t: 'quiz', q: 'Un service Knative ne reçoit aucune requête pendant un moment. Que se passe-t-il par défaut avec l\'autoscaler Knative ?', options: ['Il descend à zéro réplica (scale-to-zero), puis redémarre à la requête suivante', 'Il reste à un réplica pour toujours', 'Il est supprimé du cluster', 'Il passe en état Failed jusqu\'à une intervention manuelle'], answer: 0, explain: 'Avec le KPA et le scale-to-zero activé, le minimum par défaut est 0 : le service peut s\'éteindre et redémarre à la requête suivante (cold start). <code>min-scale</code> permet de garder au moins un réplica.' },
        { t: 'quiz', q: 'Tu migres avec MTV des VM hébergées sur vSAN depuis VMware. Quelle précaution ?', options: ['Choisir uniquement la migration warm', 'Désactiver les mappings de stockage', 'Passer par un export OVA manuel de chaque VM', 'Fournir l\'image VDDK : sans elle, les VM sur vSAN ne migrent pas'], answer: 3, explain: 'La doc MTV recommande fortement le VDDK et indique que les migrations ne fonctionnent pas sans lui quand la VM repose sur vSAN. Warm ou cold change le moment de la copie, pas ce prérequis.' }
      ]
    },
    {
      title: 'Lab : un service Knative à zéro réplica',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'OpenShift Serverless : service, scale-to-zero, répartition de trafic', goal: 'Noyau en séance sur un SNO (E1). La partie virtualisation (VM, migration) demande un environnement E3 : étapes (bonus).', steps: [
          'Prérequis : environnement E1 (SNO) avec <code>cluster-admin</code>, voir module 00 ; accès à l\'image d\'exemple (ou à ton registre miroir) ; la partie VM demande <b>E3</b> (bare metal ou virtualisation imbriquée).',
          'Installe l\'<b>OpenShift Serverless Operator</b> (OperatorHub, namespace <code>openshift-serverless</code>, canal <code>stable</code>), puis crée les namespaces et les CR <code>KnativeServing</code> et <code>KnativeEventing</code> de la slide dédiée et vérifie les conditions <code>Ready</code>.',
          'Crée le projet (<code>oc new-project serverless-demo</code>), puis applique le <code>Service</code> Knative <code>showcase</code> <b>nommé</b> de la slide B4 (révision <code>showcase-v1</code>) et teste l\'URL donnée par <code>oc get ksvc</code> avec <code>curl</code>.',
          'Observe le <b>scale-to-zero</b> : cesse tout trafic, suis les pods avec <code>oc get pods -w -n serverless-demo</code> jusqu\'à zéro, puis relance un <code>curl</code> et note le délai de réveil.',
          'Applique le <b>YAML de la slide B5</b> (même Service : le template devient <code>showcase-v2</code> avec une variable d\'environnement, le trafic est réparti <b>80/20</b> entre <code>showcase-v1</code> et <code>showcase-v2</code>) ; contrôle avec <code>oc get revision</code> puis répète les requêtes pour voir la répartition. <b>Retour arrière</b> : remets 100 % sur la première révision puis supprime le projet.',
          '(bonus, E3) Installe <b>OpenShift Virtualization</b> (OperatorGroup, Subscription et <code>HyperConverged</code> de la slide A3), crée une VM depuis une boot source avec la console et ouvre sa console avec <code>virtctl console</code> ; contrôle <code>oc get vm,vmi</code>.',
          '(bonus, E3 multi-nœuds avec stockage RWX) Lance une <b>migration à chaud</b> de la VM vers un autre nœud et observe la <code>VirtualMachineInstanceMigration</code> ; sur un stockage RWO, constate qu\'elle n\'est pas possible.',
          '(bonus, avec un vCenter de test) Prépare une migration MTV : <code>Provider</code> vSphere avec son <code>vddkInitImage</code> (et celui du <code>HyperConverged</code>), <code>StorageMap</code>, <code>NetworkMap</code> et <code>Plan</code> en migration <b>cold</b> d\'une VM éteinte.'
        ] }
      ]
    }
  ],
  takeaways: [
    'OpenShift Virtualization : une VM est un pod KVM ; Operator <code>kubevirt-hyperconverged</code> (canal <code>stable</code>, namespace <code>openshift-cnv</code>), CR <code>HyperConverged</code>.',
    'La migration à chaud exige un stockage partagé <b>RWX</b>, de la RAM et de la bande passante ; un réseau Multus dédié est recommandé ; dimensionne avant les mises à jour de nœuds.',
    'Depuis VMware : MTV (2.10, 2.11 et 2.12 couvrent la 4.20), cold ou warm, <b>VDDK</b> à fournir (obligatoire en pratique pour vSAN), ressources <code>forklift.konveyor.io/v1beta1</code>.',
    'OpenShift Serverless : Operator <code>serverless-operator</code> (canal <code>stable</code>), CR <code>KnativeServing</code> et <code>KnativeEventing</code> en <code>operator.knative.dev/v1beta1</code> ; supporté sur OCP 4.16 à 4.20 (1.37).',
    'Service Knative = scale-to-zero (min-scale 0 par défaut), révisions, répartition de trafic ; Eventing = brokers, triggers, CloudEvents ; relis les retraits d\'API avant chaque mise à jour.',
    'Admin plateforme : ingress (Kourier), quotas, capacité (cold starts, migrations), sauvegarde des VM (module 11), mises à jour (module 12), GitOps (module 10).'
  ]
});
