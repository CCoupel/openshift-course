COURSE.add({
  id: 'm15', num: 15, emoji: '📝',
  title: 'Aide-mémoire & quiz final',
  tagline: 'Les commandes essentielles par thème, un dictionnaire K8s ↔ OpenShift, des tableaux de décision et un quiz final : tout est repris des modules 00 à 14, avec le renvoi pour le détail.',
  duration: '≈ 30 min',
  objectives: [
    'Retrouver en quelques secondes la commande <code>oc</code> d\'un thème (état, accès, nœuds, réseau, stockage, mises à jour, sauvegarde, OLM, sécurité, GitOps, virtualisation)',
    'Traduire les objets Kubernetes en objets OpenShift et inversement',
    'Choisir rapidement : méthode d\'installation, topologie, stockage, procédure de reprise, canal de mise à jour',
    'Réviser l\'ensemble du cours avec un quiz final transverse (modules 00 à 14)'
  ],
  slides: [
    {
      title: 'Mode d\'emploi : une fiche, pas un cours',
      blocks: [
        { t: 'text', html: 'Ce module ne contient <b>aucun fait nouveau</b> : chaque commande, objet, valeur et affirmation est repris à l\'identique d\'un module du cours, avec le renvoi « module NN » à côté. Pour le détail, ouvre ce module.' },
        { t: 'bullets', frag: true, items: [
          '<b>14 fiches <code>oc</code></b> par thème, puis un <b>dictionnaire</b> K8s ↔ OCP, des <b>tableaux de décision</b> et un <b>quiz final</b> qui couvre les modules 00 à 14.',
          'Version de référence : <b>OpenShift 4.20 EUS</b> (note 4.22 au module 01). Les points que les modules marquent « à vérifier » le restent ici.',
          'Les noms de projets, de nœuds et de ressources (<code>team-a</code>, <code>worker-3</code>, <code>demo</code>…) sont des <b>exemples</b> des modules : remplace-les par les tiens.'
        ] },
        { t: 'callout', kind: 'warn', html: '<b>Commandes dangereuses</b> : la restauration d\'etcd n\'est <b>pas</b> recopiée ici (« ne restaure jamais depuis cette fiche » : module 11) ; un drain, un deny-all NetworkPolicy, l\'approbation de CSR ou la suppression d\'un objet demandent la mise en garde du module cité avant de lancer la commande.' }
      ]
    },
    {
      title: 'Fiche : état du cluster',
      tag: 'fiche',
      blocks: [
        { t: 'cmds', items: [
          ['oc whoami --show-server', 'Vérifie le serveur visé'],
          ['oc get clusterversion', 'Version et Available=True'],
          ['oc get nodes', 'Tous les nœuds Ready'],
          ['oc get co', 'Cluster Operators : Available, pas Degraded'],
          ['oc whoami --show-console', 'URL de la console web'],
          ['oc get nodes -o wide', 'Tous les nœuds Ready, rôles et IP attendus ?'],
          ['oc get mcp', 'Pools à jour (UPDATED=True, DEGRADED=False) ?'],
          ['oc get pods -A | grep -v -E "Running|Completed"', 'Pods en erreur après installation'],
          ['oc describe co authentication', 'message de la condition Degraded'],
          ['oc adm release info', 'contenu de la release courante']
        ] },
        { t: 'table', head: ['Condition', 'Sens', 'Réaction'], rows: [
          ['<b>Available</b>', 'Le service est fourni', 'Si <code>False</code> : panne réelle'],
          ['<b>Progressing</b>', 'Un changement est en cours', 'Normal pendant une upgrade'],
          ['<b>Degraded</b>', 'Ça marche mal ou à moitié', 'Lire le message, c\'est ton point de départ'],
          ['<b>Upgradeable</b>', 'La mise à jour mineure est permise', '<code>False</code> bloque la mineure suivante']
        ] },
        { t: 'callout', kind: 'tip', html: 'Un cluster sain, c\'est tous les opérateurs Available avant de commencer (modules 00 et 03). Méthode d\'un incident : cluster d\'abord (<code>oc get co</code>, <code>oc get mcp</code>, <code>oc get nodes</code>), puis le nœud, puis le pod (module 12).' }
      ]
    },
    {
      title: 'Fiche : projets, accès et RBAC',
      tag: 'fiche',
      blocks: [
        { t: 'cmds', items: [
          ['oc login --web', 'Authentification via OAuth (navigateur) ; suppose un fournisseur d\'identité (à vérifier selon ta version d\'oc, module 00)'],
          ['oc new-project demo', 'Crée un Project et s\'y place'],
          ['oc whoami', 'utilisateur courant'],
          ['oc whoami -t', 'token courant (à ne pas coller dans un ticket !)'],
          ['oc logout', 'révoque le token côté serveur'],
          ['oc auth can-i create deployments -n team-a', 'Puis-je faire ça ? (moi-même)'],
          ['oc auth can-i --list -n team-a --as alice', 'Tout ce qu\'Alice peut faire (impersonation : exige le droit <code>impersonate</code>)'],
          ['oc adm policy who-can delete pods -n team-a', 'Qui peut faire ça ? (utilisateurs et groupes)'],
          ['oc adm policy add-role-to-group view team-a-ro -n team-a', 'Idem pour un groupe (à préférer)'],
          ['oc adm policy add-cluster-role-to-group cluster-reader ops-readonly', 'ClusterRoleBinding vers un groupe']
        ] },
        { t: 'callout', kind: 'tip', html: 'Des groupes, jamais des utilisateurs dans les bindings ; moindre privilège : RoleBinding sur un projet plutôt que ClusterRoleBinding (module 06). Un projet naît avec ses garde-fous grâce au template de projet (module 06).' },
        { t: 'callout', kind: 'warn', html: 'Supprimer <code>kubeadmin</code> est <b>irréversible</b> : vérifie d\'abord un vrai login IdP cluster-admin et copie le kubeconfig admin dans un coffre (module 06). La commande n\'est pas recopiée ici.' }
      ]
    },
    {
      title: 'Fiche : applications, pods et debug',
      tag: 'fiche',
      blocks: [
        { t: 'cmds', items: [
          ['oc new-app <image|git>', 'Déploie une app depuis une image ou un dépôt (S2I)'],
          ['oc expose svc/web', 'Crée une Route'],
          ['oc rollout status deploy/web', 'Suivi d\'un déploiement'],
          ['oc explain route.spec.tls', 'Doc des API, aussi pour les CRD OCP'],
          ['oc get events --sort-by=.lastTimestamp', 'Événements récents, triés par date : un pod refusé ou un PVC bloqué s\'y lit en premier (modules 08 et 09)'],
          ['oc exec deploy/web -- curl -sI http://autre-svc:8080', 'Teste depuis un pod l\'accès à un autre Service (diagnostic réseau)'],
          ['oc get endpoints web', 'Le Service a-t-il des endpoints ?'],
          ['oc debug node/<n>', 'Shell privilégié sur un nœud (<code>chroot /host</code>)'],
          ['oc adm must-gather', 'Collecte de diagnostic pour le support'],
          ['oc adm top nodes', 'Consommation des nœuds']
        ] },
        { t: 'callout', kind: 'trap', html: 'Le réflexe « <code>oc adm policy add-scc-to-user anyuid</code> » règle le symptôme mais ouvre une faille : répare l\'image (module 01 ; détails : module 09). Pour un ticket Red Hat : <code>must-gather</code> joint à la demande (module 12).' }
      ]
    },
    {
      title: 'Fiche : nœuds, MachineConfig et Machine API',
      tag: 'fiche',
      blocks: [
        { t: 'cmds', items: [
          ['oc debug node/<n> -- chroot /host rpm-ostree status', 'Image OS déployée, version, déploiement précédent'],
          ['oc debug node/<n> -- chroot /host crictl ps', 'Conteneurs vus par CRI-O sur le nœud'],
          ['oc adm node-logs <n> -u kubelet', 'Logs d\'une unit systemd du nœud'],
          ['oc get node <n> -o wide', 'Version kernel, OS image, runtime (CONTAINER-RUNTIME)'],
          ['oc get mc', 'MachineConfig, dont les <code>rendered-*</code>'],
          ['oc get mcp', 'Pools : UPDATED / UPDATING / DEGRADED, nombre de machines'],
          ['oc describe mcp worker', 'Quel rendered est visé, quels nœuds en retard'],
          ['oc get machinesets -n openshift-machine-api', 'Groupes de machines et réplicas'],
          ['oc get machines -n openshift-machine-api', 'Une Machine par nœud (phase, provider ID)'],
          ['oc get bmh -n openshift-machine-api', 'BareMetalHost (Metal3) en IPI bare metal']
        ] },
        { t: 'callout', kind: 'trap', html: 'Modifier un fichier à la main sur un nœud : il sera écrasé (ou le <b>MachineConfigPool</b> passera en Degraded) au prochain rendu. Toute modif OS passe par un objet déclaratif.' },
        { t: 'callout', kind: 'onprem', html: 'Sans Machine API, <code>oc get machines</code> peut être vide : c\'est normal, pas un bug (module 02).' }
      ]
    },
    {
      title: 'Fiche : maintenance d\'un nœud et CSR',
      tag: 'fiche',
      blocks: [
        { t: 'cmds', items: [
          ['oc adm cordon worker-3', 'Interdire les nouveaux pods sur le nœud'],
          ['oc adm drain worker-3 --ignore-daemonsets --delete-emptydir-data', 'Évacuer proprement ; <code>--delete-emptydir-data</code> supprime les données emptyDir'],
          ['oc adm uncordon worker-3', 'Retour en service'],
          ['oc get csr | grep Pending', 'Plus aucun CSR en attente ?'],
          ['oc get csr -o custom-columns=NOM:.metadata.name,DEMANDEUR:.spec.username,SIGNATAIRE:.spec.signerName,ETAT:.status.conditions[*].type', 'Tous les CSR avec demandeur et signataire (ceux sans état sont en attente)'],
          ['oc adm certificate approve NOM_DU_CSR', 'Approuver une demande <b>dont tu as vérifié le demandeur</b>']
        ] },
        { t: 'callout', kind: 'trap', html: 'N\'approuve que les CSR <b>en <code>Pending</code></b> et dont tu as <b>vérifié le demandeur</b> (nom du nœud attendu, signataire) : un CSR approuvé à l\'aveugle peut donner à un intrus un certificat de nœud, donc un faux nœud dans ton cluster. Remplacement des certificats API et Ingress : module 04.' },
        { t: 'callout', kind: 'warn', html: 'Sur un SNO, il n\'y a aucun autre nœud : un drain manuel couperait routeurs, console et OAuth (module 12). Un PDB trop strict ou des pods sans contrôleur font échouer le drain (module 12).' }
      ]
    },
    {
      title: 'Fiche : réseau, Routes et policies',
      tag: 'fiche',
      blocks: [
        { t: 'cmds', items: [
          ['oc get ingresscontroller -n openshift-ingress-operator', 'Les IngressControllers du cluster'],
          ['oc get pods -n openshift-ingress', 'Les pods des routeurs'],
          ['oc get route -A | head', 'Les Routes de tous les projets'],
          ['oc create route edge web --service=web --hostname=web.apps.ocp4.example.com', 'Crée une Route edge vers un Service'],
          ['oc get route web', 'Vérifie la Route'],
          ['oc annotate route web haproxy.router.openshift.io/timeout=60s', 'Annotation HAProxy sur la Route (délai de 60 s)'],
          ['oc get networkpolicy,adminnetworkpolicy -A', 'NetworkPolicy et AdminNetworkPolicy de tous les projets'],
          ['dig +short api.ocp4.example.com', 'Le nom de l\'API résout-il ?'],
          ['dig +short test.apps.ocp4.example.com', 'le wildcard doit répondre']
        ] },
        { t: 'callout', kind: 'trap', html: 'Un <code>deny-all</code> coupe aussi les routeurs : prévois <code>allow-from-openshift-ingress</code> et, avec des routeurs en HostNetwork, <code>allow-from-hostnetwork</code> (module 07, qui rappelle de tester après application). Un Service LoadBalancer sur bare metal sans MetalLB reste en pending (module 07).' }
      ]
    },
    {
      title: 'Fiche : stockage',
      tag: 'fiche',
      blocks: [
        { t: 'cmds', items: [
          ['oc get sc', 'StorageClass disponibles'],
          ['oc get csidriver', 'Drivers CSI installés'],
          ['oc get pods -n openshift-cluster-csi-drivers', 'Pods des drivers CSI'],
          ['oc get co storage', 'Cluster Operator storage'],
          ['oc describe pvc db-data', 'Pourquoi un PVC reste Pending'],
          ['oc get pvc db-data -w', 'Suivre un PVC (expansion, liaison)'],
          ['oc get volumeattachment', 'Attachements de volumes aux nœuds'],
          ['oc get pvc -n openshift-image-registry', 'PVC du registre interne'],
          ['oc get storagecluster -n openshift-storage', 'Phase attendue : <code>Ready</code>'],
          ['oc get cephcluster -n openshift-storage', 'Santé Ceph vue par Rook']
        ] },
        { t: 'callout', kind: 'trap', html: 'RWO ≠ « un seul pod » : c\'est « un seul nœud ». Lors d\'un rolling update, le nouveau pod atterrit sur un autre nœud, et tu obtiens <b>Multi-Attach error</b>. Solutions : stratégie <code>Recreate</code>, RWX, ou StatefulSet.' },
        { t: 'callout', kind: 'trap', html: 'Un snapshot CSI vit <b>sur le même backend</b> que le volume : si la baie ou le pool est perdu, snapshot et données partent ensemble. Ce n\'est <b>pas</b> une sauvegarde. Sauvegarde et migration : module 11.' }
      ]
    },
    {
      title: 'Fiche : monitoring et logs',
      tag: 'fiche',
      blocks: [
        { t: 'cmds', items: [
          ['oc get pods -n openshift-monitoring', 'Pods du monitoring de plateforme'],
          ['oc get route thanos-querier -n openshift-monitoring', 'Route du Thanos Querier'],
          ['oc get cm cluster-monitoring-config -n openshift-monitoring', 'absent par défaut'],
          ['oc -n openshift-monitoring edit configmap cluster-monitoring-config', 'Configurer le monitoring de plateforme (par exemple <code>enableUserWorkload: true</code>)'],
          ['oc -n openshift-user-workload-monitoring get pod', 'Pods du monitoring des projets utilisateur'],
          ['oc adm policy add-role-to-user monitoring-edit alice -n team-a', 'Rôle de monitoring : créer des règles et des monitors dans un projet'],
          ['oc adm policy add-role-to-user alert-routing-edit alice -n team-a', 'Rôle de monitoring : routage d\'alertes d\'un projet'],
          ['oc exec alertmanager-main-0 -n openshift-monitoring -- amtool config routes show --alertmanager.url http://localhost:9093', 'Contrôler l\'arbre de routes Alertmanager (amtool est dans le pod)'],
          ['oc get co monitoring', 'Cluster Operator monitoring (à surveiller après un changement de configuration)'],
          ['oc create sa logging-collector -n openshift-logging', 'ServiceAccount du collecteur']
        ] },
        { t: 'callout', kind: 'trap', html: 'Une erreur de syntaxe dans <code>alertmanager.yaml</code> arrête la distribution des alertes : garde une copie avant d\'éditer (procédure du module 05). Watchdog est une alerte toujours active par conception : le « dead man\'s switch » de la chaîne d\'alerte (module 05).' }
      ]
    },
    {
      title: 'Fiche : mises à jour',
      tag: 'fiche',
      blocks: [
        { t: 'cmds', items: [
          ['oc adm upgrade', 'Mises à jour disponibles dans le canal'],
          ['oc adm upgrade channel stable-4.20', 'Choisir le canal de mise à jour'],
          ['oc get clusterversion version -o jsonpath=\'{.spec.channel}{"\\n"}\'', 'Canal courant'],
          ['oc adm upgrade recommend', 'Recommandation de version et pré-contrôle (alertes, opérateurs) ; lecture seule'],
          ['oc adm upgrade --to-latest=true', 'Vers la dernière version recommandée du canal'],
          ['oc adm upgrade --to=4.20.z', 'Vers une version précise (remplace z par la valeur choisie)'],
          ['oc adm upgrade status', 'Progression de la mise à jour'],
          ['watch oc get co', 'Opérateurs pendant la mise à jour']
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: `# Pause d'un pool de workers (module 12), puis reprise
$ oc patch mcp/worker --type merge --patch '{"spec":{"paused":true}}'
$ oc patch mcp/worker --type merge --patch '{"spec":{"paused":false}}'` },
        { t: 'callout', kind: 'trap', html: 'N\'acquitte <b>jamais à l\'aveugle</b> : la doc rappelle que l\'admin est responsable de repérer et migrer les APIs retirées (le cluster ne voit pas les outils externes ni les charges inactives). Pour la 4.22, la doc indique <b>aucune suppression d\'API Kubernetes</b>.' }
      ]
    },
    {
      title: 'Fiche : sauvegarde et reprise',
      tag: 'fiche',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: `# Sauvegarde etcd (module 11) : UN seul nœud du control plane
$ oc debug --as-root node/master-0
sh-5.1# chroot /host
sh-5.1# /usr/local/bin/cluster-backup.sh /home/core/assets/backup` },
        { t: 'cmds', items: [['oc get backupstoragelocation -n openshift-adp', 'OADP : l\'emplacement de stockage des sauvegardes est-il disponible ? (module 11)']] },
        { t: 'table', head: ['Situation', 'Procédure'], rows: [
          ['<b>Quorum perdu</b>, API en lecture seule', '<code>quorum-restore.sh</code> sur un hôte de reprise'],
          ['Erreur grave, retour à un <b>état antérieur</b>', 'Restauration depuis une sauvegarde (<code>cluster-restore.sh</code>)'],
          ['<b>Un membre etcd</b> défaillant', 'Remplacement du membre malsain'],
          ['<b>Certificats</b> du control plane expirés', 'Approbation des CSR <code>node-bootstrapper</code> (et <code>kubelet-serving</code> en UPI)']
        ] },
        { t: 'callout', kind: 'warn', html: '<b>Ne restaure jamais depuis cette fiche.</b> La restauration d\'etcd est un dernier recours « destructif et déstabilisant » : procédures complètes, prérequis et risques aux slides 6 à 10 du module 11. Exerce-toi d\'abord sur un cluster jetable. OADP ne constitue pas une solution de reprise pour etcd (module 11).' }
      ]
    },
    {
      title: 'Fiche : Operators et OLM',
      tag: 'fiche',
      blocks: [
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
          ['oc get packagemanifest lvms-operator -n openshift-marketplace -o jsonpath=\'{.status.defaultChannel}\'', 'Canal par défaut d\'un Operator (sinon : <code>oc describe</code>)'],
          ['oc get sub,installplan,csv -n openshift-lvm-storage', 'Où en est l\'installation d\'un Operator'],
          ['oc get csv -n openshift-lvm-storage', 'Phase <code>Succeeded</code> = installé'],
          ['oc get installplan -n openshift-lvm-storage', 'InstallPlan en attente (approbation Manual)'],
          ['oc get operatorhub cluster -o yaml', 'Sources par défaut de l\'OperatorHub'],
          ['oc get consoleplugin', 'Plugins de la console']
        ] },
        { t: 'callout', kind: 'trap', html: 'Un InstallPlan <b>oublié en Pending</b> laisse l\'Operator en version courante, parfois vulnérable ou incompatible avec la prochaine version du cluster. Certains Operators déclarent aussi une version OCP maximale et peuvent <b>bloquer la mise à jour du cluster</b> (annotation <code>olm.maxOpenShiftVersion</code> : le cluster Operator <code>olm</code> passe <code>Upgradeable=False</code> ; mises à jour mineures concernées ; module 12).' }
      ]
    },
    {
      title: 'Fiche : sécurité, SCC et conformité',
      tag: 'fiche',
      blocks: [
        { t: 'cmds', items: [
          ['oc get pod web-abc -o jsonpath=\'{.metadata.annotations.openshift\\.io/scc}\'', 'SCC effectivement attribuée à un pod'],
          ['oc get scc', 'Liste des SCC'],
          ['oc adm policy who-can use scc privileged', 'Audit : qui peut créer des pods privilégiés ?'],
          ['oc adm policy scc-subject-review -f pod.yaml', 'Quels SCC admettraient ce pod pour moi ?'],
          ['oc adm policy scc-subject-review -z mon-sa -n team-a -f root-pod.yaml', 'Quelles SCC admettraient ce pod pour un ServiceAccount donné ?'],
          ['oc create sa mon-sa -n team-a', 'ServiceAccount utilisé par la charge'],
          ['oc create clusterrole use-nonroot-bind80 --verb=use --resource=scc --resource-name=nonroot-bind80', 'Rôle qui n\'autorise <b>que</b> cette SCC (verbe <code>use</code>)'],
          ['oc create rolebinding mon-sa-scc --clusterrole=use-nonroot-bind80 --serviceaccount=team-a:mon-sa -n team-a', 'Lien limité au namespace'],
          ['oc get compliancesuite -n openshift-compliance -w', 'Suivre un scan de conformité'],
          ['oc get compliancecheckresult -n openshift-compliance -l compliance.openshift.io/check-status=FAIL', 'Contrôles en échec (un FAIL n\'est pas toujours une faute)']
        ] },
        { t: 'callout', kind: 'trap', html: 'Le réflexe « <code>add-scc-to-user anyuid</code> » règle le symptôme et ouvre une faille : l\'image n\'est <b>pas réparée</b> et plus rien ne limite ses privilèges. Ordre de préférence : <b>réparer l\'image</b>, puis <code>nonroot-v2</code> ou une SCC dédiée, puis (en dernier recours, tracé) <code>anyuid</code>.' },
        { t: 'callout', kind: 'warn', html: '<b>Ne modifie jamais</b> les SCC par défaut : la doc prévient que les personnaliser peut poser problème au déploiement de pods de la plateforme ou à la mise à jour. Pour un besoin particulier, <b>crée une SCC dédiée</b>.' }
      ]
    },
    {
      title: 'Fiche : GitOps (OpenShift GitOps)',
      tag: 'fiche',
      blocks: [
        { t: 'cmds', items: [
          ['oc get pods -n openshift-gitops', 'Pods de l\'instance OpenShift GitOps'],
          ['oc label namespace gitops-lab argocd.argoproj.io/managed-by=openshift-gitops', 'Un namespace géré par l\'instance doit porter ce label'],
          ['oc auth can-i create resourcequotas --as system:serviceaccount:openshift-gitops:openshift-gitops-argocd-application-controller -n gitops-lab', 'L\'instance a-t-elle le droit de créer cet objet ? (Argo CD n\'a pas cluster-admin)']
        ] },
        { t: 'table', head: ['Objet (<code>argoproj.io/v1alpha1</code>)', 'Rôle'], rows: [
          ['<code>Application</code>', 'Un <b>dépôt + chemin + révision</b> synchronisés vers une <b>destination</b> (cluster + namespace)'],
          ['<code>AppProject</code>', 'Périmètre d\'autorisation : quels dépôts, quelles destinations, quels types de ressources'],
          ['<code>ApplicationSet</code>', 'Génère <b>plusieurs Applications</b> depuis un modèle (liste, dossiers Git, clusters)'],
          ['<code>ArgoCD</code> (<code>argoproj.io/v1beta1</code>)', 'CR de l\'<b>Operator OpenShift GitOps</b> qui décrit <b>une instance</b> d\'Argo CD']
        ] },
        { t: 'callout', kind: 'trap', html: 'L\'instance par défaut est <b>réservée aux administrateurs et à la config du cluster</b> : ne donne pas l\'accès à des non-admins et ne l\'utilise <b>pas pour livrer des applications</b> (la doc de multi-tenancy le déconseille). Pour les équipes : <b>des instances dédiées</b>.' }
      ]
    },
    {
      title: 'Fiche : virtualisation et Serverless',
      tag: 'fiche',
      layout: 'two',
      blocks: [
        { t: 'text', html: '<b>OpenShift Virtualization</b> (module 13)' },
        { t: 'cmds', items: [
          ['oc get csv -n openshift-cnv', 'Operator installé ?'],
          ['oc get hco -n openshift-cnv kubevirt-hyperconverged -o json | jq .status.conditions', 'Conditions du HyperConverged'],
          ['oc get vm,vmi -n vms', 'VM et instances'],
          ['virtctl start vm-demo -n vms', 'Démarrer la VM'],
          ['virtctl console vm-demo -n vms', 'Console série'],
          ['virtctl stop vm-demo -n vms', 'Arrêter la VM']
        ] },
        { t: 'text', html: '<b>OpenShift Serverless</b> (module 13)' },
        { t: 'cmds', items: [
          ['oc get knativeserving.operator.knative.dev/knative-serving -n knative-serving', 'État de Knative Serving'],
          ['oc get ksvc -n serverless-demo', 'Services Knative'],
          ['oc get revision -n serverless-demo', 'Révisions'],
          ['kn service list -n serverless-demo', 'Services, avec la CLI kn']
        ] },
        { t: 'callout', kind: 'warn', html: 'apiVersion exacte du HyperConverged et options de placement : <b>à vérifier</b> dans « Installing OpenShift Virtualization » ; les types (instance types, CDI, boot sources) varient selon la version : contrôle avec <code>oc explain</code> (module 13).' }
      ]
    },
    {
      title: 'Dictionnaire K8s ↔ OpenShift',
      tag: 'dictionnaire',
      blocks: [
        { t: 'table', head: ['Tu dis (K8s)', 'OpenShift dit', 'À savoir'], rows: [
          ['Namespace', '<b>Project</b>', 'Namespace + annotations + template de création + <code>self-provisioner</code>'],
          ['Ingress', '<b>Route</b>', 'Ingress reste supporté (converti en Route en coulisses)'],
          ['Deployment', 'Deployment', '<code>DeploymentConfig</code> existe encore mais est <b>déprécié</b> : ne l\'utilise plus'],
          ['Pod Security (PSA)', '<b>SCC</b>', 'Objets cluster, liés via RBAC aux ServiceAccounts'],
          ['Image + tag', '<b>ImageStream</b>', 'Pointeur vers des images, avec triggers de redéploiement'],
          ['Dockerfile / Kaniko', '<b>BuildConfig</b> / S2I', 'Remplacé progressivement par Tekton / Shipwright'],
          ['kubeadm join / OS à la main', '<b>MachineSet / MachineConfig</b>', 'Les nœuds sont provisionnés et configurés de façon déclarative'],
          ['kubectl', '<b>oc</b>', 'Sur-ensemble de kubectl : <code>oc login</code>, <code>oc new-app</code>, <code>oc debug</code>…']
        ] },
        { t: 'callout', kind: 'k8s', html: 'Détails de chaque ligne : module 01 (Project, Route, SCC, ImageStream), module 02 (MachineSet, MachineConfig), module 09 (SCC). Sur OCP, le CNI est unique : OVN-Kubernetes (module 07).' }
      ]
    },
    {
      title: 'Dictionnaire : objets de plateforme',
      tag: 'dictionnaire',
      blocks: [
        { t: 'table', head: ['Objet / sigle', 'Ce que c\'est', 'Module'], rows: [
          ['<b>CVO</b> (Cluster Version Operator)', 'Lit l\'image de release (liste des versions de tous les composants) et réconcilie chaque Cluster Operator', 'module 02'],
          ['<b>ClusterOperator</b>', 'Chaque opérateur publie un objet ClusterOperator avec ses conditions', 'module 02'],
          ['<b>MachineSet</b> / <b>Machine</b>', 'Un nœud = un objet Machine, un groupe homogène = un MachineSet (comme un ReplicaSet de machines)', 'module 02'],
          ['<b>MachineHealthCheck</b>', 'Surveille les nœuds d\'un ensemble de machines et supprime la Machine si le nœud reste malade', 'module 02'],
          ['<b>MachineConfig</b>', 'Un fragment de config OS (fichiers, units systemd, kernel args…) avec un rôle cible', 'module 02'],
          ['<b>MachineConfigPool</b> (MCP)', 'Un groupe de nœuds (master, worker, infra…) et ses MachineConfig', 'module 02'],
          ['<b>MCD</b> / <b>MCS</b>', 'MCD : DaemonSet sur chaque nœud, applique, drain, reboot si nécessaire ; MCS : sert l\'Ignition aux nouveaux nœuds sur le port 22623', 'module 02'],
          ['<b>OLM</b> : CatalogSource, Subscription, InstallPlan, CSV', 'Catalogue d\'Operators, canal + approbation, étapes d\'installation, l\'Operator installé', 'module 04'],
          ['<b>config.openshift.io</b>', 'Une ressource « cluster » par sujet : <code>proxy</code>, <code>apiserver</code>, <code>ingress.config</code>, <code>image.config</code>', 'module 04'],
          ['<b>kubeadmin</b>', 'Utilisateur temporaire créé à l\'install (cluster-admin) ; à supprimer après configuration de l\'IdP', 'module 06']
        ] }
      ]
    },
    {
      title: 'Dictionnaire : réseau, sécurité, applications',
      tag: 'dictionnaire',
      blocks: [
        { t: 'table', head: ['Objet / sigle', 'Ce que c\'est', 'Module'], rows: [
          ['<b>Project</b>', 'Un Namespace avec des annotations et un cycle de création contrôlé (ProjectRequest)', 'module 01'],
          ['<b>Route</b>', 'Plus riche qu\'un Ingress classique : terminaison TLS intégrée (edge, passthrough, re-encrypt), poids pour le A/B, annotations HAProxy', 'module 01'],
          ['<b>ImageStream</b>', 'Un pointeur logique vers des images (internes ou externes) ; un changement de tag peut déclencher un build ou un rollout', 'module 01'],
          ['<b>SCC</b>', 'Objet cluster qui décrit un ensemble de droits d\'exécution (utilisateur, capabilities, volumes, accès à l\'hôte, SELinux…) ; elle valide et modifie', 'module 09'],
          ['<b>AdminNetworkPolicy</b> / <b>BaselineAdminNetworkPolicy</b>', 'ANP : objet cluster évalué avant les NetworkPolicy ; BANP : un seul objet, garde-fou par défaut', 'module 07'],
          ['<b>UserDefinedNetwork</b> (UDN)', 'UDN (par namespace) et ClusterUserDefinedNetwork (plusieurs namespaces) : segmentation et isolation avancées au niveau d\'OVN-Kubernetes', 'module 07'],
          ['<b>OADP</b>', 'API : Backup, Restore, Schedule, BackupStorageLocation, VolumeSnapshotLocation', 'module 11'],
          ['<b>Application</b> / <b>AppProject</b> / <b>ApplicationSet</b>', 'Un dépôt + chemin + révision synchronisés vers une destination ; périmètre d\'autorisation ; plusieurs Applications depuis un modèle', 'module 10'],
          ['<b>VirtualMachine</b> / <b>VirtualMachineInstance</b>', 'Déclaration de la VM / la VM en cours d\'exécution', 'module 13'],
          ['<b>HyperConverged</b>', 'La CR qui déploie tous les composants d\'OpenShift Virtualization', 'module 13']
        ] }
      ]
    },
    {
      title: 'Décision : installation et topologie',
      tag: 'décision',
      blocks: [
        { t: 'table', head: ['Méthode', 'Ce que tu fournis'], rows: [
          ['<b>Agent-based</b>', 'Les machines, le réseau, DNS et LB (ou VIP), un poste avec <code>openshift-install</code>'],
          ['<b>Assisted Installer</b>', 'Les machines, le réseau, DNS et LB (ou VIP) ; accès au service'],
          ['<b>IPI</b> (installer-provisioned)', 'Credentials vCenter ou BMC, DNS, VIP réservées'],
          ['<b>UPI</b> (user-provisioned)', 'Tout : c\'est le mode le plus manuel']
        ] },
        { t: 'callout', kind: 'tip', html: 'Règle de départ : Agent-based si tu as des serveurs nus ou du déconnecté ; IPI vSphere si ton infra est déjà vSphere et que tu as les droits (module 03).' },
        { t: 'table', head: ['Topologie', 'Nœuds', 'HA ?'], rows: [
          ['<b>Standard (3+N)</b>', '3 masters + N workers (+ infra)', 'Oui'],
          ['<b>Compact 3 nœuds</b>', '3 masters <b>schedulables</b>, 0 worker', 'Oui (control plane)'],
          ['<b>SNO</b> (Single Node)', '1 nœud : master + worker', 'Non'],
          ['<b>2 nœuds</b> (arbiter / fencing)', '2 nœuds + arbitre ou fencing', 'Partielle'],
          ['<b>Hosted Control Planes</b>', 'Control plane en pods, workers séparés', 'Oui']
        ] },
        { t: 'callout', kind: 'warn', html: 'Le choix <code>platform</code> est structurant : il détermine la Machine API, le stockage par défaut et les VIP, et il ne se change pas après coup (module 03). HTTP(S) → Route ; TCP/UDP exposé hors cluster → Service LoadBalancer + MetalLB (ou LB d\'entreprise + NodePort) (module 07).' }
      ]
    },
    {
      title: 'Décision : quel stockage ?',
      tag: 'décision',
      blocks: [
        { t: 'table', head: ['Backend', 'Modes', 'Cas d\'usage'], rows: [
          ['<b>vSphere CSI</b>', 'RWO (VMDK) ; RWX via vSAN File Services (si l\'environnement vSphere le supporte)', 'Cluster sur vSphere, datastore existant'],
          ['<b>LVMS</b> (LVM Storage)', 'RWO bloc/fichier local', 'SNO, edge, petits clusters'],
          ['<b>Local Storage Operator</b>', 'RWO, volumeMode Filesystem ou Block', 'Bare metal, disques dédiés, base pour ODF'],
          ['<b>NFS</b>', 'RWX', 'Partage de fichiers simple ; pas pour les bases de données'],
          ['<b>iSCSI / FC / NAS constructeur</b>', 'RWO (bloc), RWX (fichier) selon la baie', 'Baie SAN/NAS existante (NetApp, Dell, Pure, HPE…)'],
          ['<b>ODF</b>', 'RWO (RBD), RWX (CephFS), objet S3', 'Stockage défini par logiciel, tout-en-un']
        ] },
        { t: 'callout', kind: 'onprem', html: 'On-prem, <b>le backend est à ta charge</b> : capacité, performances, sauvegarde du stockage et support constructeur. Choisis-le avant l\'installation, pas après le premier PVC Pending.' }
      ]
    },
    {
      title: 'Décision : quelle reprise, quel canal ?',
      tag: 'décision',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['Situation', 'Procédure'], rows: [
          ['<b>Quorum perdu</b>, API en lecture seule', '<code>quorum-restore.sh</code> sur un hôte de reprise'],
          ['Erreur grave, retour à un <b>état antérieur</b>', 'Restauration depuis une sauvegarde (<code>cluster-restore.sh</code>)'],
          ['<b>Un membre etcd</b> défaillant', 'Remplacement du membre malsain'],
          ['<b>Certificats</b> du control plane expirés', 'Approbation des CSR <code>node-bootstrapper</code> (et <code>kubelet-serving</code> en UPI)']
        ] },
        { t: 'table', head: ['Canal', 'Contenu'], rows: [
          ['<code>candidate-4.x</code>', 'Nouvelles releases dès leur construction, avant les tests finaux'],
          ['<code>fast-4.x</code>', 'Releases testées et supportées, publiées avec un erratum'],
          ['<code>stable-4.x</code>', 'Après un délai sur <code>fast</code> : de l\'ordre d\'une à deux semaines pour un correctif, plus long (de l\'ordre de 45 à 90 jours) pour le tout premier chemin vers une nouvelle version mineure'],
          ['<code>eus-4.x</code>', 'Releases du <code>stable</code> en même temps ; sert surtout aux mises à jour <b>Control Plane Only</b> (EUS → EUS)']
        ] },
        { t: 'callout', kind: 'warn', html: 'Reprise etcd : toute reprise suppose au moins un nœud de control plane sain ; tu choisis la procédure la moins destructrice qui résout ton problème (module 11). Aucune commande de restauration n\'est donnée ici.' },
        { t: 'callout', kind: 'tip', html: 'En production : <b>stable</b>. <b>candidate</b> et <b>fast</b> pour tester avant les autres clusters. Le choix du canal ne met rien à jour : il décide ce qui t\'est <b>proposé</b>.' }
      ]
    },
    {
      title: 'Quiz final 1/4',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Quel niveau d\'environnement le module 00 recommande-t-il pour couvrir presque tout le cours ?', options: ['E0 : OpenShift Local, sans cluster-admin', 'E2 : un compact 3 nœuds est obligatoire', 'E1 : un SNO bien dimensionné', 'E3 : du bare metal est obligatoire'], answer: 2, explain: 'Un SNO (E1) bien dimensionné couvre presque tout le cours ; un compact (E2) n\'est utile que pour les étapes bonus qui le demandent (module 00).' },
        { t: 'quiz', q: 'Que devient l\'objet <code>Ingress</code> de Kubernetes sur OpenShift ?', options: ['Il reste supporté : il est converti en Route en coulisses', 'Il est retiré : seule la Route existe', 'Il exige obligatoirement un contrôleur Ingress à installer', 'Il n\'est valable que sur les clusters cloud'], answer: 0, explain: 'Dans le dictionnaire du module 01 : Ingress → Route, « Ingress reste supporté (converti en Route en coulisses) ».' },
        { t: 'quiz', q: 'Un cluster etcd à trois membres : combien de pannes de membres tolère-t-il ?', options: ['Aucune', 'Deux', 'Trois', 'Une seule : le quorum est de 2'], answer: 3, explain: 'Quorum = ⌊n/2⌋ + 1 : avec 3 membres il faut 2 vivants, donc une panne tolérée ; passer à 2 membres ne protège de rien (module 02).' },
        { t: 'quiz', q: 'À quoi sert <code>maxUnhealthy</code> dans un MachineHealthCheck ?', options: ['À limiter le nombre de nœuds qu\'un MachineSet peut créer', 'De garde-fou : si trop de nœuds sont malades en même temps, le MHC ne remédie plus pour ne pas tout détruire', 'À fixer la durée avant la remédiation d\'un nœud', 'À désactiver le MHC pendant les mises à jour'], answer: 1, explain: 'maxUnhealthy est le garde-fou du MHC ; ne le mets jamais à 100 % (module 02).' },
        { t: 'quiz', q: 'Une installation semble avancer, puis <code>install-complete</code> n\'aboutit jamais : console et OAuth injoignables. Quelle est la panne n°1 ?', options: ['Le port 6443 fermé sur le poste d\'installation', 'Le wildcard DNS <code>*.apps</code> oublié', 'Un pull secret trop ancien', 'Un nombre pair de masters'], answer: 1, explain: 'Le wildcard <code>*.apps</code> oublié est la panne n°1 des installations (module 03).' }
      ]
    },
    {
      title: 'Quiz final 2/4',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Une <code>Subscription</code> OLM est en approbation <b>Manual</b>. Une nouvelle version arrive dans le canal. Que se passe-t-il ?', options: ['L\'Operator est mis à jour immédiatement', 'La Subscription est supprimée', 'Le cluster bloque la mise à jour de l\'Operator', 'OLM crée un InstallPlan en attente : rien ne bouge tant que tu ne l\'approuves pas'], answer: 3, explain: 'Manual : OLM crée un InstallPlan en attente. Un InstallPlan oublié en Pending laisse l\'Operator en version courante (module 04).' },
        { t: 'quiz', q: 'Tu appliques un MachineConfig chrony avec le label <code>role: worker</code>. Quels nœuds sont ciblés ?', options: ['Le pool worker seulement : les masters ont leur propre configuration (second MachineConfig avec <code>role: master</code>)', 'Tous les nœuds du cluster', 'Les nœuds infra uniquement', 'Aucun : il faut redémarrer le MCO'], answer: 0, explain: 'Le label <code>role: worker</code> ne cible que le pool worker ; tous les nœuds doivent partager la même source de temps (module 04).' },
        { t: 'quiz', q: 'À quoi sert l\'alerte <code>Watchdog</code> ?', options: ['Elle signale la perte du quorum etcd', 'Elle signale un nœud NotReady', 'Elle est toujours active par conception : un « dead man\'s switch » pour vérifier que la chaîne d\'alerte fonctionne', 'Elle avertit d\'une mise à jour qui échoue'], answer: 2, explain: 'Watchdog doit arriver régulièrement à ton récepteur : c\'est le test de la chaîne d\'alerte (module 05).' },
        { t: 'quiz', q: 'Avant de supprimer le secret <code>kubeadmin</code>, que dois-tu avoir vérifié ?', options: ['Que le secret est recréé automatiquement par l\'opérateur', 'Que le cluster n\'a qu\'un seul nœud', 'Que le certificat de l\'Ingress est remplacé', 'Un vrai login IdP avec un groupe cluster-admin, et le kubeconfig admin copié dans un coffre'], answer: 3, explain: 'Supprimer kubeadmin est irréversible : vérifie d\'abord un vrai login IdP cluster-admin (module 06).' },
        { t: 'quiz', q: 'Tu appliques un <code>deny-all</code> dans un projet : l\'application n\'est plus joignable par sa Route. Pourquoi ?', options: ['Le deny-all coupe aussi les routeurs : il faut <code>allow-from-openshift-ingress</code> (et <code>allow-from-hostnetwork</code> avec des routeurs en HostNetwork)', 'La Route doit être recréée en mode passthrough', 'Les NetworkPolicy ne s\'appliquent qu\'aux pods en HostNetwork', 'Le deny-all supprime la Route'], answer: 0, explain: 'Piège OCP : un deny-all coupe aussi les routeurs ; ces policies d\'ouverture vont dans le project template (module 07).' }
      ]
    },
    {
      title: 'Quiz final 3/4',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Une Deployment avec un PVC <code>RWO</code> subit un rolling update et tu obtiens « Multi-Attach error ». Pourquoi ?', options: ['Le PVC est plein', 'RWO signifie « un seul nœud » : le nouveau pod atterrit sur un autre nœud', 'La StorageClass est supprimée', 'Un PVC RWO n\'accepte aucun pod'], answer: 1, explain: 'RWO ≠ « un seul pod » : c\'est « un seul nœud ». Solutions : stratégie Recreate, RWX, ou StatefulSet (module 08).' },
        { t: 'quiz', q: 'Une image ne démarre pas à cause de la SCC. Quelle est la bonne démarche ?', options: ['Donner <code>anyuid</code> au ServiceAccount, c\'est le plus rapide', 'Modifier la SCC restricted-v2 du cluster', 'Réparer l\'image : la SCC par défaut est restricted-v2, on n\'accorde <code>anyuid</code> qu\'en dernier recours', 'Désactiver l\'admission des SCC'], answer: 2, explain: 'Ordre de préférence : réparer l\'image, puis nonroot-v2 ou une SCC dédiée, puis anyuid en dernier recours, tracé ; ne modifie jamais les SCC par défaut (module 09).' },
        { t: 'quiz', q: 'Argo CD signale en boucle <code>OutOfSync</code> sur une ressource modifiée par un opérateur. Que fais-tu ?', options: ['Ignorer les champs gérés ailleurs avec <code>ignoreDifferences</code> plutôt que de laisser selfHeal combattre l\'opérateur', 'Activer selfHeal pour qu\'Argo CD l\'emporte', 'Supprimer l\'opérateur', 'Désactiver Argo CD sur ce namespace'], answer: 0, explain: 'Un selfHeal qui annule en boucle un champ géré par un opérateur peut générer des redémarrages en cascade (module 10).' },
        { t: 'quiz', q: 'Que ne contient pas une sauvegarde etcd ?', options: ['Les Secrets', 'Les ConfigMaps et la configuration RBAC', 'L\'état des opérateurs', 'Le contenu des volumes persistants'], answer: 3, explain: 'Le contenu des PV ne fait jamais partie du snapshot etcd : la sauvegarde etcd restaure le cluster, pas les données de tes applications (module 11).' },
        { t: 'quiz', q: 'Que dit la documentation d\'OADP sur etcd ?', options: ['OADP remplace la sauvegarde etcd', 'OADP sauvegarde etcd mais pas les volumes', 'OADP ne constitue pas une solution de reprise pour etcd ni pour les Operators OpenShift', 'OADP ne fonctionne qu\'avec le stockage objet d\'ODF'], answer: 2, explain: 'Les sauvegardes etcd et OADP sont complémentaires (module 11).' }
      ]
    },
    {
      title: 'Quiz final 4/4',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Le cluster est <code>Upgradeable=False</code> avec <code>AdminAckRequired</code>. Que fais-tu ?', options: ['J\'acquitte tout de suite pour débloquer', 'Je vérifie que les APIs retirées ne sont plus utilisées, puis j\'acquitte dans <code>admin-acks</code>', 'Je supprime la ConfigMap admin-acks', 'Je force la mise à jour d\'une option'], answer: 1, explain: 'N\'acquitte jamais à l\'aveugle : l\'admin est responsable de repérer et migrer les APIs retirées (module 12).' },
        { t: 'quiz', q: 'Que demande la check-list de mise à jour (module 12) à propos des <code>MachineHealthCheck</code> ?', options: ['De les mettre en pause pendant l\'opération (annotation <code>cluster.x-k8s.io/paused=""</code>)', 'De les supprimer définitivement', 'De monter leur <code>maxUnhealthy</code> à 100 %', 'Rien : ils s\'adaptent seuls'], answer: 0, explain: 'Pour éviter qu\'ils ne remplacent un nœud qui redémarre pendant la mise à jour (module 12).' },
        { t: 'quiz', q: 'OpenShift Serverless 1.37 est supporté sur quelles versions d\'OCP ?', options: ['OCP 4.12 à 4.16', 'OCP 4.19 à 4.22', 'Uniquement OCP 4.20', 'OCP 4.16 à 4.20'], answer: 3, explain: 'Page « OpenShift Operator Life Cycles » de Red Hat, d\'après le module 13 (disponibilité générale le 24 novembre 2025).' },
        { t: 'quiz', q: 'Ton control plane à trois nœuds tourne à 80 % de CPU en régime normal. Quelle est la règle de la doc 4.20 ?', options: ['80 % est la cible recommandée', 'Rester à 60 % au plus de la capacité : les deux autres nœuds doivent absorber la charge lors d\'une panne ou d\'une mise à jour', 'Seule la mémoire compte, pas le CPU', 'Il suffit d\'ajouter un quatrième master'], answer: 1, explain: 'Le control plane est mis à jour en série et subit les pannes : garde l\'usage à 60 % au plus de la capacité (module 14).' },
        { t: 'quiz', q: 'Un nœud d\'infra : que recommande la doc 4.20 pour le label <code>worker</code> ?', options: ['Le retirer systématiquement', 'Le remplacer par le label master', 'Le conserver (double label <code>infra,worker</code>) et gérer le placement par taints ; sans lui, un pool personnalisé est obligatoire', 'Le retirer pour que le nœud ne soit pas facturé deux fois'], answer: 2, explain: 'Sans le label worker, le MCO ne reconnaît pas le nœud sans pool personnalisé (modules 02 et 14).' }
      ]
    },
    {
      title: 'Pour aller plus loin',
      blocks: [
        { t: 'text', html: 'Les sources officielles sont <b>docs.redhat.com</b> (documentation OpenShift Container Platform 4.20), <b>docs.okd.io</b> et <b>access.redhat.com</b> (cycle de vie, matrices de support). Les modules renvoient vers ces pages par leur titre, à relire pour ta version :' },
        { t: 'bullets', items: [
          '« Network connectivity requirements » : ports et flux entre nœuds (module 02).',
          '« Updating a cluster in a disconnected environment », « Performing a Control Plane Only update » et « Preparing to update to 4.21 » : mises à jour (module 12).',
          '« Installing the OADP Operator » : sauvegarde des applications (module 11).',
          '« Installing OpenShift Virtualization » et la page « OpenShift Operator Life Cycles » de Red Hat (module 13).',
          'Red Hat OpenShift Container Platform Life Cycle Policy : dates de fin de support, à consulter avant toute roadmap (module 01).'
        ] },
        { t: 'callout', kind: 'tip', html: 'Pour une mise en production, repars de la check-list par phase du module 14 : chaque ligne renvoie au module propriétaire, donc à ces fiches.' }
      ]
    }
  ],
  takeaways: [
    'Une fiche n\'est pas la procédure : pour toute opération risquée (restauration etcd, drain, <code>deny-all</code>, CSR, suppression), ouvre le module et lis sa mise en garde avant la commande.',
    'Diagnostic : cluster d\'abord (<code>oc get co</code>, <code>oc get mcp</code>, <code>oc get nodes</code>), puis le nœud, puis le pod ; <code>must-gather</code> joint à tout ticket (modules 03 et 12).',
    'Sur OpenShift, l\'OS et le réseau se pilotent par des objets : MachineConfig/MCP pour l\'OS, une Route pour l\'exposition HTTP, une SCC pour les droits d\'un pod (modules 01, 02, 07, 09).',
    'Réparer l\'image avant d\'accorder une SCC large ; des groupes plutôt que des utilisateurs dans les bindings (modules 06 et 09).',
    'Sauvegarde etcd et OADP sont complémentaires ; une sauvegarde jamais restaurée n\'est qu\'une hypothèse (module 11).',
    'Avant la production, passe la check-list du module 14 : chaque point renvoie au module propriétaire.'
  ]
});
