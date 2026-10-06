COURSE.add({
  id: 'm05', num: 5, emoji: '📈',
  title: 'Supervision & monitoring',
  tagline: 'Métriques, alertes, logs : la stack de monitoring intégrée, son ouverture aux équipes, le routage des alertes et Logging 6 avec Loki.',
  duration: '≈ 70 min + lab 20 min',
  objectives: [
    'Situer les composants de la stack de monitoring de plateforme et la console Observe',
    'Configurer la rétention et le stockage persistant via <code>cluster-monitoring-config</code>',
    'Ouvrir le monitoring aux projets utilisateur (<code>ServiceMonitor</code>, <code>PrometheusRule</code>) avec les bons droits',
    'Router les alertes avec Alertmanager (receivers, routes, silences), plateforme et projets',
    'Mettre en place Logging 6 : Vector, LokiStack, <code>ClusterLogForwarder</code> et expédition vers un SIEM'
  ],
  slides: [
    {
      title: 'Trois signaux, deux stacks',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Métriques', sub: 'Prometheus', hl: true },
          { label: 'Alertes', sub: 'règles + Alertmanager' },
          { label: 'Logs', sub: 'Vector + Loki', hl: true },
          { label: 'Traces / flux', sub: 'survol' }
        ], caption: 'Sur OCP, <b>métriques et alertes</b> sont <b>intégrées et installées d\'office</b> ; les <b>logs</b> sont un composant à installer (Logging 6).' },
        { t: 'bullets', frag: true, items: [
          '<b>Métriques et alertes</b> : fournies par le <b>Cluster Monitoring Operator</b> dans le namespace <code>openshift-monitoring</code> ; tu les configures par ConfigMap.',
          '<b>Logs</b> : opérateurs <b>Red Hat OpenShift Logging</b> et <b>Loki</b> à installer (OLM, module 04).',
          'Frontières : stockage (StorageClass, S3) → module 08 ; RBAC et politique d\'audit → module 06 ; alertes et disques etcd → modules 02, 08 et 11 ; réseau → module 07.'
        ] },
        { t: 'callout', kind: 'k8s', html: "Sur K8s vanilla, tu installes kube-prometheus-stack toi-même. Sur OCP, il est <b>déjà là, géré par un opérateur</b> : tu <b>règles</b> la stack, tu ne la déploies pas." }
      ]
    },
    {
      title: 'La stack de monitoring de plateforme',
      blocks: [
        { t: 'table', head: ['Composant (<code>openshift-monitoring</code>)', 'Rôle'], rows: [
          ['<b>Cluster Monitoring Operator</b>', 'Déploie, gère et met à jour Prometheus et Alertmanager'],
          ['<b>Prometheus</b> + Prometheus Operator', 'Base de séries temporelles et évaluation des règles'],
          ['<b>Alertmanager</b>', 'Reçoit les alertes de Prometheus et les envoie aux systèmes externes'],
          ['<b>Thanos Querier</b>', 'Interface de requête unique et multi-tenant sur les métriques de plateforme'],
          ['<b>kube-state-metrics</b>, <b>openshift-state-metrics</b>', 'Objets Kubernetes et OpenShift convertis en métriques'],
          ['<b>node-exporter</b>', 'Métriques de chaque nœud'],
          ['<b>Metrics Server</b>', 'Métriques de ressources pour l\'API <code>metrics.k8s.io</code>'],
          ['<b>monitoring-plugin</b>', 'Pages « Observe » de la console web'],
          ['<b>Telemeter Client</b>', 'Envoie un sous-ensemble de données à Red Hat (santé à distance)']
        ] },
        { t: 'callout', kind: 'onprem', html: "Telemeter envoie des données vers Red Hat : en réseau isolé ou sous contrainte de confidentialité, vérifie son statut avec ta sécurité (option de désactivation et conséquences : à vérifier dans la doc 4.20)." }
      ]
    },
    {
      title: 'Console Observe et Thanos Querier',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          '<b>Observe → Alerting</b> : alertes actives, règles, silences.',
          '<b>Observe → Metrics</b> : requêtes PromQL (via Thanos Querier).',
          '<b>Observe → Dashboards</b> : tableaux de bord prêts à l\'emploi (pas de Grafana dédié à administrer ; historique de son retrait : à vérifier).',
          '<b>Observe → Targets</b> : cibles scrapées et leur état.'
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "# Les composants et leurs pods\n$ oc get pods -n openshift-monitoring\n\n# Interroger les métriques de plateforme en ligne de commande (route du Thanos Querier)\n$ oc get route thanos-querier -n openshift-monitoring\n$ oc get cm cluster-monitoring-config -n openshift-monitoring   # absent par défaut" },
        { t: 'callout', kind: 'tip', wide: true, html: "Le ConfigMap <code>cluster-monitoring-config</code> n'existe pas à l'installation : tu le <b>crées</b> la première fois que tu règles la stack. Sans lui, la stack tourne avec ses défauts." },
        { t: 'callout', kind: 'cloud', wide: true, html: "En ROSA/ARO/OSD, la stack de plateforme est gérée par le fournisseur (SRE) : tu ne la configures pas ; seul le monitoring de tes projets reste de ton ressort (à vérifier selon l\'offre)." }
      ]
    },
    {
      title: 'Configurer : deux ConfigMaps',
      blocks: [
        { t: 'table', head: ['ConfigMap', 'Namespace', 'Pilote'], rows: [
          ['<code>cluster-monitoring-config</code>', '<code>openshift-monitoring</code>', 'Stack de <b>plateforme</b> ; contient aussi <code>enableUserWorkload</code>'],
          ['<code>user-workload-monitoring-config</code>', '<code>openshift-user-workload-monitoring</code>', 'Stack des <b>projets utilisateur</b> (créé quand tu actives le monitoring utilisateur)']
        ] },
        { t: 'code', lang: 'yaml', file: 'cluster-monitoring-config.yaml', code: `apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-monitoring-config
  namespace: openshift-monitoring
data:
  config.yaml: |
    enableUserWorkload: true       # monitoring des projets utilisateur
    prometheusK8s:
      retention: 15d
      retentionSize: 80GB
      volumeClaimTemplate:
        spec:
          storageClassName: fast-block
          resources:
            requests:
              storage: 100Gi` },
        { t: 'bullets', items: [
          'La section (<code>prometheusK8s</code>, <code>alertmanagerMain</code>…) porte le nom du composant ; le contenu est du YAML dans la clé <code>config.yaml</code>.',
          'Les valeurs invalides sont rejetées par l\'opérateur : regarde <code>oc get co monitoring</code> après chaque modification.'
        ] },
        { t: 'callout', kind: 'warn', html: "Les champs disponibles par composant sont listés dans la référence « config map » de ta version ; utilise-la plutôt que de copier un exemple d'une autre version." }
      ]
    },
    {
      title: 'Rétention et stockage persistant',
      tag: 'à ne pas oublier',
      blocks: [
        { t: 'bullets', frag: true, items: [
          '<b>Rétention par défaut</b> : 15 jours pour Prometheus de plateforme ; <code>retention</code> (durée) et <code>retentionSize</code> (taille) la règlent, la première limite atteinte l\'emporte.',
          '<b>Sans PVC</b>, les métriques sont perdues à chaque redémarrage de pod. En cluster multi-nœuds, la doc exige un <b>stockage persistant</b> pour Prometheus et Alertmanager (haute disponibilité).',
          '<b>On peut agrandir un PVC, pas le réduire.</b>',
          '<b>Stockage</b> : pas de <b>volume bloc brut</b> (<code>volumeMode: Block</code>) ni de système de fichiers <b>non conforme POSIX</b> (certains NFS) : choisis un bloc RWO formaté (module 08).'
        ] },
        { t: 'code', lang: 'yaml', file: 'alertmanager persistant', code: `data:
  config.yaml: |
    alertmanagerMain:
      volumeClaimTemplate:
        spec:
          storageClassName: fast-block
          resources:
            requests:
              storage: 2Gi` },
        { t: 'callout', kind: 'trap', html: "Activer un PVC sur un Prometheus qui tourne déjà <b>redémarre</b> ses pods : fais-le à un moment calme et surveille <code>oc get co monitoring</code>. Dimensionnement : sers-toi de la consommation réelle (<code>prometheus_tsdb_*</code>) plutôt que d'une valeur au hasard." }
      ]
    },
    {
      title: 'Ouvrir le monitoring aux projets utilisateur',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: "# Dans cluster-monitoring-config : enableUserWorkload: true\n$ oc -n openshift-monitoring edit configmap cluster-monitoring-config\n\n# Vérifier les pods créés\n$ oc -n openshift-user-workload-monitoring get pod\n# prometheus-operator, prometheus-user-workload, thanos-ruler-user-workload" },
        { t: 'bullets', items: [
          '<code>enableUserWorkload: true</code> crée le ConfigMap <code>user-workload-monitoring-config</code> et déploie, dans <code>openshift-user-workload-monitoring</code>, une instance <b>Prometheus dédiée</b> et un <b>Thanos Ruler</b>.',
          'Rétention par défaut côté utilisateur : <b>24 heures</b> (à augmenter, avec un PVC, si les équipes en ont besoin).',
          'Pour <b>exclure</b> un projet : label <code>openshift.io/user-monitoring=false</code> sur son namespace.'
        ] },
        { t: 'callout', kind: 'ocp', wide: true, html: "Deux instances, deux périmètres : plateforme (<code>openshift-monitoring</code>) pour toi, utilisateurs (<code>openshift-user-workload-monitoring</code>) pour les équipes. Les équipes ne voient et ne modifient <b>que leurs projets</b>." }
      ]
    },
    {
      title: 'ServiceMonitor, PodMonitor, PrometheusRule',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'monitoring-app.yaml', code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: team-a
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web
        image: quay.io/brancz/prometheus-example-app:v0.2.0   # exemple de la doc (tag à vérifier en 4.20)
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: team-a
  labels:
    app: web
spec:
  selector:
    app: web
  ports:
  - name: web
    port: 8080
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: app-monitor
  namespace: team-a
spec:
  selector:
    matchLabels:
      app: web
  endpoints:
  - port: web
    interval: 30s
---
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: app-alerts
  namespace: team-a
spec:
  groups:
  - name: app
    rules:
    - alert: AppDown
      expr: up{job="web"} == 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "L'application web ne répond plus"` },
        { t: 'bullets', items: [
          '<b>ServiceMonitor</b> : scrape les Services qui portent un label ; <b>PodMonitor</b> : scrape directement des pods.',
          '<b>PrometheusRule</b> : règles d\'alerte et d\'enregistrement évaluées par le Thanos Ruler.',
          'Ces objets vivent <b>dans le namespace de l\'application</b> : c\'est l\'équipe qui les possède.'
        ] },
        { t: 'callout', kind: 'tip', html: "Un <b>label <code>severity</code></b> homogène (<code>info</code>, <code>warning</code>, <code>critical</code>) permet de router proprement dans Alertmanager. L'application doit exposer un endpoint <code>/metrics</code> au format Prometheus." }
      ]
    },
    {
      title: 'Qui peut faire quoi : rôles de monitoring',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['ClusterRole', 'Droit'], rows: [
          ['<code>monitoring-rules-view</code>', 'Lire les <code>PrometheusRule</code>'],
          ['<code>monitoring-rules-edit</code>', 'Créer / modifier les <code>PrometheusRule</code>'],
          ['<code>monitoring-edit</code>', 'Gérer <code>PrometheusRule</code>, <code>ServiceMonitor</code> et <code>PodMonitor</code>'],
          ['<code>user-workload-monitoring-config-edit</code>', 'Configurer les composants du monitoring utilisateur'],
          ['<code>alert-routing-edit</code>', 'Gérer les <code>AlertmanagerConfig</code> (routage des alertes d\'un projet)']
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc adm policy add-role-to-user monitoring-edit alice -n team-a\n$ oc adm policy add-role-to-user alert-routing-edit alice -n team-a" },
        { t: 'callout', kind: 'tip', wide: true, html: "Accorde ces rôles via les <b>groupes</b> d'équipe et dans le <b>project template</b> (module 06). Un <code>RoleBinding</code> local suffit : pas besoin de <code>cluster-admin</code>." }
      ]
    },
    {
      title: 'Alertes : règles, sévérités, alertes clés',
      blocks: [
        { t: 'bullets', frag: true, items: [
          'Une alerte = une <b>règle</b> (expression PromQL + durée <code>for</code> + labels). Prometheus évalue, Alertmanager <b>route</b>.',
          '<b>Watchdog</b> est une alerte <b>toujours active</b> par conception : elle sert de « dead man\'s switch » pour vérifier que la chaîne d\'alerte fonctionne.',
          'Les alertes de plateforme portent le label <code>openshift_io_alert_source="platform"</code> ; celles des projets utilisateur ne l\'ont pas.',
          'Chaque alerte livrée a un <b>runbook</b> public (dépôt <code>openshift/runbooks</code>) référencé en annotation.'
        ] },
        { t: 'table', head: ['Famille', 'Exemples (noms à confirmer sur ton cluster)'], rows: [
          ['etcd', '<code>etcdMembersDown</code>, latence des commits (module 08)'],
          ['Control plane', '<code>KubeAPIDown</code>, <code>KubeletDown</code>'],
          ['Opérateurs', '<code>ClusterOperatorDown</code>, <code>ClusterOperatorDegraded</code>'],
          ['Nœuds et capacité', '<code>KubeNodeNotReady</code>, <code>NodeFilesystemSpaceFillingUp</code>'],
          ['Certificats', '<code>KubeClientCertificateExpiration</code> (module 12)']
        ] },
        { t: 'callout', kind: 'warn', html: "Seuls <code>Watchdog</code> et <code>etcdMembersDown</code> sont vérifiés dans les sources consultées ; liste réelle des alertes et sévérités de ta version : <b>Observe → Alerting → Alerting rules</b> (à vérifier)." }
      ]
    },
    {
      title: 'Alertmanager : receivers et routes',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'alertmanager.yaml (extrait)', code: `global:
  resolve_timeout: 5m
route:
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 12h
  receiver: default
  routes:
  - matchers:
    - "alertname=Watchdog"
    repeat_interval: 2m
    receiver: watchdog
  - matchers:
    - severity=critical
    - openshift_io_alert_source="platform"
    receiver: equipe-plateforme
receivers:
- name: default
- name: watchdog
- name: equipe-plateforme
  webhook_configs:
  - url: https://alerting.example.com/hook` },
        { t: 'bullets', items: [
          'Configuration : secret <code>alertmanager-main</code> (clé <code>alertmanager.yaml</code>) dans <code>openshift-monitoring</code>, ou console : <b>Administration → Cluster Settings → Configuration → Alertmanager</b>.',
          'Receivers documentés : <b>PagerDuty</b>, <b>e-mail</b> (SMTP), <b>webhook</b>, <b>Slack</b>.',
          'Le routage par défaut groupe en 30 s / 5 min et répète toutes les 12 h.'
        ] },
        { t: 'callout', kind: 'trap', html: "Une erreur de syntaxe dans <code>alertmanager.yaml</code> arrête la distribution des alertes. Procédure de la doc : <b>extrais</b> la configuration (<code>oc -n openshift-monitoring get secret alertmanager-main --template='{{ index .data \"alertmanager.yaml\" }}' | base64 --decode</code>), <b>garde une copie</b>, édite, remplace le secret avec <code>oc create secret generic … --dry-run=client -o=yaml | oc replace</code>, puis contrôle l'arbre de routes avec <code>oc exec alertmanager-main-0 -n openshift-monitoring -- amtool config routes show --alertmanager.url http://localhost:9093</code> (<code>amtool</code> est dans le pod)." }
      ]
    },
    {
      title: 'Alertes des projets utilisateur : où les router ?',
      layout: 'two',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '🏢 Alertmanager de plateforme', items: ['<code>alertmanagerMain.enableUserAlertmanagerConfig: true</code>', 'Les équipes créent des <code>AlertmanagerConfig</code> dans leurs namespaces', 'Une seule instance à exploiter', 'Les alertes projet et plateforme cohabitent'] },
          right: { title: '👥 Alertmanager dédié aux projets', items: ['Instance séparée dans <code>openshift-user-workload-monitoring</code> (<code>alertmanager: enabled</code>, <code>enableAlertmanagerConfig</code>)', 'Isolation des alertes de plateforme', 'Plus de composants à exploiter', 'À choisir si les équipes ont leurs propres canaux'] },
          verdict: 'Dans tous les cas, distingue plateforme et projets avec le matcher <code>openshift_io_alert_source</code>.' },
        { t: 'bullets', wide: true, items: [
          'Le droit <code>alert-routing-edit</code> (slide précédente) permet à une équipe de gérer le routage de <b>son</b> projet.',
          'Les noms exacts des options des deux modes : doc « Configuring user workload monitoring » 4.20 ; vérifie avec la ConfigMap de ta version.'
        ] }
      ]
    },
    {
      title: 'Silences et hygiène d\'alerting',
      blocks: [
        { t: 'bullets', frag: true, items: [
          '<b>Silence</b> : suspend les notifications d\'une alerte pour une durée (console : <b>Observe → Alerting → Silences</b>). Elle reste visible, simplement muette.',
          '<b>Silence ≠ correction</b> : mets-le avec une durée courte et un commentaire (ticket, auteur).',
          'Évite les alertes « bruit » : chaque alerte doit avoir <b>une action</b> attendue ; sinon, supprime-la ou baisse sa sévérité.',
          'Teste la chaîne : <code>Watchdog</code> doit arriver régulièrement à ton récepteur.'
        ] },
        { t: 'callout', kind: 'tip', html: "Pendant une maintenance (mise à jour du cluster, module 12), crée des <b>silences ciblés</b> (par exemple sur les nœuds concernés) plutôt que de désactiver la notification globale." },
        { t: 'callout', kind: 'onprem', html: "Le récepteur (e-mail, webhook, pager) est <b>à toi</b> sur site : chemin réseau sortant du cluster, certificats du récepteur (CA) et disponibilité du service à valider." }
      ]
    },
    {
      title: 'Logging 6 : ce qui a changé',
      tag: 'à connaître',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '🗑️ Retiré', items: ['<b>Elasticsearch</b> (stockage), <b>Kibana</b> (visualisation) et le collecteur <b>Fluentd</b> ne sont plus gérés par le logging', 'API <code>ClusterLogging</code> et <code>ClusterLogForwarder</code> du groupe <code>logging.openshift.io</code> non supportées'] },
          right: { title: '✅ Aujourd\'hui', items: ['Collecte : <b>Vector</b>', 'Stockage : <b>LokiStack</b> (Loki, sur stockage objet S3)', 'Configuration : <code>ClusterLogForwarder</code> en <code>observability.openshift.io/v1</code>', 'Interface : plugin dans la console, via le <b>Cluster Observability Operator</b>'] },
          verdict: 'Logging 6.x est un produit à <b>cycle de vie distinct</b> d\'OCP : vérifie la matrice de compatibilité (Logging 6.4 : annoncé compatible avec 4.20 par les errata).' },
        { t: 'bullets', items: [
          'Opérateurs : <b>Red Hat OpenShift Logging</b>, <b>Loki</b> et, pour l\'interface, <b>Cluster Observability Operator</b>. Installation par OLM (module 04).',
          'Installation (doc 6.4) : opérateur Loki dans <code>openshift-operators-redhat</code> (label <code>openshift.io/cluster-monitoring: "true"</code>), opérateur Logging dans <code>openshift-logging</code>, source <code>redhat-operators</code>, canal <code>stable-6.4</code>.'
        ] }
      ]
    },
    {
      title: 'Stocker les logs : LokiStack',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'lokistack.yaml', code: `apiVersion: loki.grafana.com/v1
kind: LokiStack
metadata:
  name: logging-loki
  namespace: openshift-logging
spec:
  size: 1x.small
  storage:
    schemas:
    - effectiveDate: '2023-10-15'
      version: v13
    secret:
      name: logging-loki-s3
      type: s3
  storageClassName: fast-block
  tenants:
    mode: openshift-logging` },
        { t: 'bullets', items: [
          '<b>Stockage objet S3</b> pour les chunks (secret <code>logging-loki-s3</code>) + un <b>PVC</b> (<code>storageClassName</code>) pour les composants Loki.',
          'Tailles : <code>1x.pico</code> (depuis Logging 6.1 ; ≈ 50 Go/jour, requests totales ≈ 7 vCPU / 17 Gi, 8 / 18 avec le ruler), <code>1x.extra-small</code> (≈ 100 Go/jour, ≈ 14 vCPU / 31 Gi), <code>1x.small</code>, <code>1x.medium</code> ; <code>1x.demo</code> pour un test seulement. Chiffres du tableau « Loki deployment sizing » de la doc Logging 6.6 : à relire dans le tableau de ta version.',
          'Mode <code>openshift-logging</code> : les logs sont séparés par tenant (application, infrastructure, audit).'
        ] },
        { t: 'callout', kind: 'onprem', wide: true, html: "On-prem, le <b>bucket S3</b> est à fournir : ODF/NooBaa, MinIO ou une baie S3 (module 08). Le dimensionnement (taille de LokiStack, volume de logs/jour, rétention) se calcule <b>avant</b> l'installation ; les valeurs de taille ci-dessus sont celles de la doc de Logging 6.4." }
      ]
    },
    {
      title: 'Collecter : ClusterLogForwarder vers LokiStack',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'clusterlogforwarder.yaml', code: `apiVersion: observability.openshift.io/v1
kind: ClusterLogForwarder
metadata:
  name: instance
  namespace: openshift-logging
spec:
  serviceAccount:
    name: logging-collector
  outputs:
  - name: lokistack-out
    type: lokiStack
    lokiStack:
      target:
        name: logging-loki
        namespace: openshift-logging
      authentication:
        token:
          from: serviceAccount
    tls:
      ca:
        key: service-ca.crt
        configMapName: openshift-service-ca.crt
  pipelines:
  - name: infra-app-logs
    inputRefs:
    - application
    - infrastructure
    outputRefs:
    - lokistack-out` },
        { t: 'cmds', items: [
          ['oc create sa logging-collector -n openshift-logging', 'ServiceAccount du collecteur'],
          ['oc adm policy add-cluster-role-to-user collect-application-logs system:serviceaccount:openshift-logging:logging-collector', 'Droit de collecter les logs applicatifs (idem <code>collect-infrastructure-logs</code>)'],
          ['oc adm policy add-cluster-role-to-user logging-collector-logs-writer system:serviceaccount:openshift-logging:logging-collector', 'Droit d\'écrire dans LokiStack']
        ] },
        { t: 'callout', kind: 'warn', html: "Exemple aligné sur la doc <b>Installing logging</b> 6.4 (<code>tls.ca</code> sur le ConfigMap <code>openshift-service-ca.crt</code>, clé <code>service-ca.crt</code>) ; à relire pour ta version. <b>Les logs d'audit ne sont pas collectés par défaut</b> : ils exigent le droit <code>collect-audit-logs</code> et une entrée <code>audit</code> dans le pipeline." }
      ]
    },
    {
      title: 'Expédier vers un SIEM (dont l\'audit)',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'forwarder-syslog.yaml (extrait)', code: `spec:
  outputs:
  - name: siem
    type: syslog
    syslog:
      url: tls://siem.example.com:6514
      rfc: RFC5424
  pipelines:
  - name: audit-vers-siem
    inputRefs:
    - audit
    outputRefs:
    - siem` },
        { t: 'bullets', items: [
          'La sortie <b>syslog</b> accepte les formats RFC3164 ou RFC5424 en TCP, TLS ou UDP.',
          'L\'entrée <code>audit</code> regroupe les journaux d\'audit : politique et lecture de l\'audit API → module 06.',
          'D\'autres sorties existent (S3, CloudWatch, Splunk, Kafka…) : liste à relire dans la doc de ta version.'
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: "Un SIEM injoignable ou un certificat refusé <b>bloque ou ralentit le collecteur</b> et remplit son tampon. Supervise le collecteur (alertes de Logging) et prévois un circuit de repli." },
        { t: 'callout', kind: 'onprem', wide: true, html: "Les <b>logs d'audit</b> contiennent des données sensibles : chiffre le transport (TLS), restreins les droits <code>collect-audit-logs</code> et fixe la rétention côté SIEM selon ta politique." }
      ]
    },
    {
      title: 'Observabilité réseau et traces : survol',
      blocks: [
        { t: 'table', head: ['Outil', 'Rôle', 'Statut'], rows: [
          ['<b>Cluster Observability Operator</b>', 'Déploie des stacks d\'observabilité (<code>MonitoringStack</code>, <code>monitoring.rhobs</code>) et des plugins de console (logs, traces, monitoring)', 'Plugin « monitoring » en Technology Preview d\'après la doc : à vérifier en 4.20'],
          ['<b>Network Observability Operator</b>', 'Flux réseau du cluster (qui parle à qui), tableaux de bord dédiés', 'Détails et versions : à vérifier (module 07)'],
          ['<b>OpenTelemetry / Tempo</b>', 'Traces distribuées applicatives', 'Hors périmètre de ce cours']
        ] },
        { t: 'callout', kind: 'tip', html: "Ces outils s'<b>ajoutent</b> à la stack intégrée ; ils ne la remplacent pas. Commence par maîtriser métriques, alertes et logs avant d'empiler d'autres composants." }
      ]
    },
    {
      title: 'Quiz',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Des équipes veulent voir les métriques de leurs applications dans la console, sans installer leur propre Prometheus. Quelle est la première action ?', options: ['Déployer un Prometheus par projet', 'Mettre <code>enableUserWorkload: true</code> dans <code>cluster-monitoring-config</code>', 'Éditer le secret <code>alertmanager-main</code>', 'Donner <code>cluster-admin</code> aux développeurs'], answer: 1, explain: '<code>enableUserWorkload: true</code> déploie dans <code>openshift-user-workload-monitoring</code> un Prometheus et un Thanos Ruler dédiés ; les équipes créent ensuite des <code>ServiceMonitor</code> et <code>PrometheusRule</code> avec les rôles <code>monitoring-*</code>.' },
        { t: 'quiz', q: 'Sur un cluster de production multi-nœuds, Prometheus et Alertmanager tournent sans PVC. Quel est le problème ?', options: ['Aucun problème : les séries temporelles de Prometheus sont répliquées automatiquement dans etcd, donc elles survivent à un redémarrage des pods', 'Seulement un souci de performance : les requêtes sont plus lentes sur le disque éphémère, mais les données restent conservées après un redémarrage', 'Les données sont perdues au redémarrage des pods : la doc impose un stockage persistant en multi-nœuds', 'Le monitoring des projets utilisateur devient totalement impossible tant qu\'aucun PVC n\'est configuré pour la plateforme'], answer: 2, explain: 'Sans stockage persistant, les données sont perdues à chaque redémarrage de pod. La doc demande un stockage persistant pour Prometheus et Alertmanager en multi-nœuds ; évite le bloc brut et les systèmes de fichiers non POSIX (certains NFS).' },
        { t: 'quiz', q: 'Avec Logging 6, quelle ressource décrit quels logs sont collectés et où ils sont envoyés ?', options: ['<code>ClusterLogForwarder</code> (<code>observability.openshift.io/v1</code>)', '<code>ClusterLogging</code> (<code>logging.openshift.io</code>)', '<code>Elasticsearch</code>', '<code>LokiStack</code> seul'], answer: 0, explain: 'Le <code>ClusterLogForwarder</code> définit entrées, sorties et pipelines. <code>LokiStack</code> décrit seulement le stockage ; <code>ClusterLogging</code> et Elasticsearch ne sont plus gérés par Logging 6.' }
      ]
    },
    {
      title: 'Lab : monitoring utilisateur et routage d\'alertes',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'ServiceMonitor, règle d\'alerte et receiver Alertmanager', goal: 'Noyau en séance sur un SNO (cluster-admin) ; les étapes (bonus) sont à faire en autonomie.', steps: [
          'Prérequis : environnement E1 (SNO) avec <code>cluster-admin</code>, voir module 00.',
          'Active le monitoring utilisateur : crée ou édite <code>cluster-monitoring-config</code> avec <code>enableUserWorkload: true</code> et vérifie les trois pods de <code>openshift-user-workload-monitoring</code>.',
          'Applique le YAML de la slide « ServiceMonitor, PodMonitor, PrometheusRule » dans un projet : il déploie l\'application d\'exemple <code>quay.io/brancz/prometheus-example-app</code> (port 8080, <code>/metrics</code> ; tag de la doc, à vérifier en 4.20), son <code>Service</code> et le <code>ServiceMonitor</code>, puis vérifie la cible dans <b>Observe → Targets</b>, puis une requête dans <b>Observe → Metrics</b>.',
          'Crée une <code>PrometheusRule</code> qui se déclenche rapidement (par exemple avec une expression comme <code>vector(1)</code> et <code>for: 1m</code>) et observe l\'alerte dans <b>Observe → Alerting</b>.',
          'Ajoute au secret <code>alertmanager-main</code> un receiver webhook et une route sur ton alerte (étape 1 : extrais l\'actuel dans <code>alertmanager.yaml</code> et <b>copie-le en <code>alertmanager.yaml.bak</code></b> ; étape 2 : édite ; étape 3 : remplace le secret comme dans la doc), vérifie avec <code>oc exec alertmanager-main-0 -n openshift-monitoring -- amtool config routes show --alertmanager.url http://localhost:9093</code> (outil du pod, rien à installer) ; crée un silence de 10 minutes. <b>Retour arrière</b> : remplace le secret par <code>alertmanager.yaml.bak</code>.',
          '(bonus) Ajoute un <code>volumeClaimTemplate</code> à Prometheus (<code>retention</code> 7d, <code>retentionSize</code>) avec une StorageClass LVMS et observe le redémarrage et <code>oc get co monitoring</code>.',
          '(bonus) Installe les opérateurs Loki et Logging, crée un <code>LokiStack</code> de taille <code>1x.demo</code> sur un bucket S3 (par exemple MinIO), le <code>ClusterLogForwarder</code> de la slide et vérifie la présence des logs dans la console.',
          '(bonus) Ajoute une sortie <code>syslog</code> vers un récepteur de lab et un pipeline <code>audit</code> ; vérifie la réception.'
        ] }
      ]
    }
  ],
  takeaways: [
    'La stack de monitoring de plateforme (Prometheus, Alertmanager, Thanos Querier…) est installée et gérée par un opérateur ; tu la règles via <code>cluster-monitoring-config</code>.',
    'Rétention par défaut de 15 jours ; en multi-nœuds, un <b>stockage persistant</b> pour Prometheus et Alertmanager (pas de bloc brut, pas de NFS non POSIX).',
    '<code>enableUserWorkload: true</code> ouvre le monitoring aux projets : <code>ServiceMonitor</code> et <code>PrometheusRule</code> dans les namespaces, droits par rôles <code>monitoring-*</code> et <code>alert-routing-edit</code>.',
    'Alertmanager : secret <code>alertmanager-main</code>, receivers (PagerDuty, e-mail, webhook, Slack), routes et silences ; <code>Watchdog</code> vérifie la chaîne.',
    'Logging 6 : Vector, LokiStack sur S3, <code>ClusterLogForwarder</code> en <code>observability.openshift.io/v1</code> ; Elasticsearch, Kibana et Fluentd ne sont plus gérés.',
    'Audit logs : non collectés par défaut, droit <code>collect-audit-logs</code> et pipeline <code>audit</code> vers le SIEM ; politique d\'audit au module 06.'
  ]
});
