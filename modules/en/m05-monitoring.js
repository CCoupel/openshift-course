COURSE.add({
  id: 'm05', lang: 'en', num: 5, emoji: '📈',
  title: 'Monitoring & observability',
  source: '3bfc86958dd7',
  tagline: 'Metrics, alerts, logs: the built-in monitoring stack, opening it to teams, alert routing and Logging 6 with Loki.',
  duration: '≈ 70 min + lab 20 min',
  objectives: [
    'Place the components of the platform monitoring stack and the Observe console',
    'Configure retention and persistent storage via <code>cluster-monitoring-config</code>',
    'Open monitoring to user projects (<code>ServiceMonitor</code>, <code>PrometheusRule</code>) with the right permissions',
    'Route alerts with Alertmanager (receivers, routes, silences), platform and projects',
    'Set up Logging 6: Vector, LokiStack, <code>ClusterLogForwarder</code> and forwarding to a SIEM'
  ],
  slides: [
    {
      title: 'Three signals, two stacks',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Metrics', sub: 'Prometheus', hl: true },
          { label: 'Alerts', sub: 'rules + Alertmanager' },
          { label: 'Logs', sub: 'Vector + Loki', hl: true },
          { label: 'Traces / flows', sub: 'overview' }
        ], caption: 'On OCP, <b>metrics and alerts</b> are <b>built in and installed out of the box</b>; <b>logs</b> are a component you install (Logging 6).' },
        { t: 'bullets', frag: true, items: [
          '<b>Metrics and alerts</b>: provided by the <b>Cluster Monitoring Operator</b> in the <code>openshift-monitoring</code> namespace; you configure them via ConfigMap.',
          '<b>Logs</b>: <b>Red Hat OpenShift Logging</b> and <b>Loki</b> operators to install (OLM, module 04).',
          'Boundaries: storage (StorageClass, S3) → module 08; RBAC and audit policy → module 06; alerts and etcd disks → modules 02, 08 and 11; network → module 07.'
        ] },
        { t: 'callout', kind: 'k8s', html: "On vanilla K8s, you install kube-prometheus-stack yourself. On OCP, it is <b>already there, managed by an operator</b>: you <b>tune</b> the stack, you don't deploy it." }
      ]
    },
    {
      title: 'The platform monitoring stack',
      blocks: [
        { t: 'table', head: ['Component (<code>openshift-monitoring</code>)', 'Role'], rows: [
          ['<b>Cluster Monitoring Operator</b>', 'Deploys, manages and updates Prometheus and Alertmanager'],
          ['<b>Prometheus</b> + Prometheus Operator', 'Time-series database and rule evaluation'],
          ['<b>Alertmanager</b>', 'Receives alerts from Prometheus and sends them to external systems'],
          ['<b>Thanos Querier</b>', 'Single, multi-tenant query interface over the platform metrics'],
          ['<b>kube-state-metrics</b>, <b>openshift-state-metrics</b>', 'Kubernetes and OpenShift objects converted into metrics'],
          ['<b>node-exporter</b>', 'Metrics for each node'],
          ['<b>Metrics Server</b>', 'Resource metrics for the <code>metrics.k8s.io</code> API'],
          ['<b>monitoring-plugin</b>', '“Observe” pages of the web console'],
          ['<b>Telemeter Client</b>', 'Sends a subset of data to Red Hat (remote health)']
        ] },
        { t: 'callout', kind: 'onprem', html: "Telemeter sends data to Red Hat: on an isolated network or under confidentiality constraints, check its status with your security team (disabling option and consequences: to be verified in the 4.20 docs)." }
      ]
    },
    {
      title: 'Observe console and Thanos Querier',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          '<b>Observe → Alerting</b>: active alerts, rules, silences.',
          '<b>Observe → Metrics</b>: PromQL queries (via Thanos Querier).',
          '<b>Observe → Dashboards</b>: ready-made dashboards (no dedicated Grafana to administer; history of its removal: to be verified).',
          '<b>Observe → Targets</b>: scraped targets and their state.'
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "# The components and their pods\n$ oc get pods -n openshift-monitoring\n\n# Query the platform metrics from the command line (Thanos Querier route)\n$ oc get route thanos-querier -n openshift-monitoring\n$ oc get cm cluster-monitoring-config -n openshift-monitoring   # absent by default" },
        { t: 'callout', kind: 'tip', wide: true, html: "The <code>cluster-monitoring-config</code> ConfigMap does not exist at installation: you <b>create</b> it the first time you tune the stack. Without it, the stack runs with its defaults." },
        { t: 'callout', kind: 'cloud', wide: true, html: "On ROSA/ARO/OSD, the platform stack is managed by the provider (SRE): you don't configure it; only the monitoring of your own projects remains yours (to be verified depending on the offering)." }
      ]
    },
    {
      title: 'Configuring: two ConfigMaps',
      blocks: [
        { t: 'table', head: ['ConfigMap', 'Namespace', 'Drives'], rows: [
          ['<code>cluster-monitoring-config</code>', '<code>openshift-monitoring</code>', '<b>Platform</b> stack; also contains <code>enableUserWorkload</code>'],
          ['<code>user-workload-monitoring-config</code>', '<code>openshift-user-workload-monitoring</code>', '<b>User project</b> stack (created when you enable user monitoring)']
        ] },
        { t: 'code', lang: 'yaml', file: 'cluster-monitoring-config.yaml', code: `apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-monitoring-config
  namespace: openshift-monitoring
data:
  config.yaml: |
    enableUserWorkload: true       # monitoring of user projects
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
          'The section (<code>prometheusK8s</code>, <code>alertmanagerMain</code>…) carries the component name; the content is YAML in the <code>config.yaml</code> key.',
          'Invalid values are rejected by the operator: check <code>oc get co monitoring</code> after each change.'
        ] },
        { t: 'callout', kind: 'warn', html: "The available fields per component are listed in the “config map” reference for your version; use it rather than copying an example from another version." }
      ]
    },
    {
      title: 'Retention and persistent storage',
      tag: 'don\'t forget',
      blocks: [
        { t: 'bullets', frag: true, items: [
          '<b>Default retention</b>: 15 days for the platform Prometheus; <code>retention</code> (duration) and <code>retentionSize</code> (size) set it, whichever limit is reached first wins.',
          '<b>Without a PVC</b>, metrics are lost at every pod restart. On a multi-node cluster, the docs require <b>persistent storage</b> for Prometheus and Alertmanager (high availability).',
          '<b>You can grow a PVC, not shrink it.</b>',
          '<b>Storage</b>: no <b>raw block volume</b> (<code>volumeMode: Block</code>) and no <b>non-POSIX-compliant</b> file system (some NFS): choose a formatted RWO block volume (module 08).'
        ] },
        { t: 'code', lang: 'yaml', file: 'persistent alertmanager', code: `data:
  config.yaml: |
    alertmanagerMain:
      volumeClaimTemplate:
        spec:
          storageClassName: fast-block
          resources:
            requests:
              storage: 2Gi` },
        { t: 'callout', kind: 'trap', html: "Enabling a PVC on a Prometheus that is already running <b>restarts</b> its pods: do it at a quiet time and watch <code>oc get co monitoring</code>. Sizing: use the actual consumption (<code>prometheus_tsdb_*</code>) rather than a random value." }
      ]
    },
    {
      title: 'Opening monitoring to user projects',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: "# In cluster-monitoring-config: enableUserWorkload: true\n$ oc -n openshift-monitoring edit configmap cluster-monitoring-config\n\n# Check the pods created\n$ oc -n openshift-user-workload-monitoring get pod\n# prometheus-operator, prometheus-user-workload, thanos-ruler-user-workload" },
        { t: 'bullets', items: [
          '<code>enableUserWorkload: true</code> creates the <code>user-workload-monitoring-config</code> ConfigMap and deploys, in <code>openshift-user-workload-monitoring</code>, a <b>dedicated Prometheus</b> instance and a <b>Thanos Ruler</b>.',
          'Default retention on the user side: <b>24 hours</b> (to be increased, with a PVC, if teams need it).',
          'To <b>exclude</b> a project: label <code>openshift.io/user-monitoring=false</code> on its namespace.'
        ] },
        { t: 'callout', kind: 'ocp', wide: true, html: "Two instances, two scopes: platform (<code>openshift-monitoring</code>) for you, users (<code>openshift-user-workload-monitoring</code>) for the teams. Teams see and modify <b>only their projects</b>." }
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
        image: quay.io/brancz/prometheus-example-app:v0.2.0   # example from the docs (tag to be verified in 4.20)
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
        summary: "The web application is no longer responding"` },
        { t: 'bullets', items: [
          '<b>ServiceMonitor</b>: scrapes the Services that carry a label; <b>PodMonitor</b>: scrapes pods directly.',
          '<b>PrometheusRule</b>: alerting and recording rules evaluated by the Thanos Ruler.',
          'These objects live <b>in the application\'s namespace</b>: the team owns them.'
        ] },
        { t: 'callout', kind: 'tip', html: "A consistent <b><code>severity</code> label</b> (<code>info</code>, <code>warning</code>, <code>critical</code>) allows clean routing in Alertmanager. The application must expose a <code>/metrics</code> endpoint in Prometheus format." }
      ]
    },
    {
      title: 'Who can do what: monitoring roles',
      layout: 'two',
      blocks: [
        { t: 'table', head: ['ClusterRole', 'Permission'], rows: [
          ['<code>monitoring-rules-view</code>', 'Read <code>PrometheusRule</code>s'],
          ['<code>monitoring-rules-edit</code>', 'Create / modify <code>PrometheusRule</code>s'],
          ['<code>monitoring-edit</code>', 'Manage <code>PrometheusRule</code>, <code>ServiceMonitor</code> and <code>PodMonitor</code>'],
          ['<code>user-workload-monitoring-config-edit</code>', 'Configure the user monitoring components'],
          ['<code>alert-routing-edit</code>', 'Manage <code>AlertmanagerConfig</code>s (routing of a project\'s alerts)']
        ] },
        { t: 'code', lang: 'bash', file: 'terminal', code: "$ oc adm policy add-role-to-user monitoring-edit alice -n team-a\n$ oc adm policy add-role-to-user alert-routing-edit alice -n team-a" },
        { t: 'callout', kind: 'tip', wide: true, html: "Grant these roles through team <b>groups</b> and in the <b>project template</b> (module 06). A local <code>RoleBinding</code> is enough: no need for <code>cluster-admin</code>." }
      ]
    },
    {
      title: 'Alerts: rules, severities, key alerts',
      blocks: [
        { t: 'bullets', frag: true, items: [
          'An alert = a <b>rule</b> (PromQL expression + <code>for</code> duration + labels). Prometheus evaluates, Alertmanager <b>routes</b>.',
          '<b>Watchdog</b> is an <b>always-firing</b> alert by design: it serves as a “dead man\'s switch” to check that the alerting chain works.',
          'Platform alerts carry the label <code>openshift_io_alert_source="platform"</code>; those from user projects do not.',
          'Every shipped alert has a public <b>runbook</b> (<code>openshift/runbooks</code> repository) referenced in an annotation.'
        ] },
        { t: 'table', head: ['Family', 'Examples (names to confirm on your cluster)'], rows: [
          ['etcd', '<code>etcdMembersDown</code>, commit latency (module 08)'],
          ['Control plane', '<code>KubeAPIDown</code>, <code>KubeletDown</code>'],
          ['Operators', '<code>ClusterOperatorDown</code>, <code>ClusterOperatorDegraded</code>'],
          ['Nodes and capacity', '<code>KubeNodeNotReady</code>, <code>NodeFilesystemSpaceFillingUp</code>'],
          ['Certificates', '<code>KubeClientCertificateExpiration</code> (module 12)']
        ] },
        { t: 'callout', kind: 'warn', html: "Only <code>Watchdog</code> and <code>etcdMembersDown</code> are verified in the sources consulted; actual list of alerts and severities for your version: <b>Observe → Alerting → Alerting rules</b> (to be verified)." }
      ]
    },
    {
      title: 'Alertmanager: receivers and routes',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'alertmanager.yaml (excerpt)', code: `global:
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
    receiver: platform-team
receivers:
- name: default
- name: watchdog
- name: platform-team
  webhook_configs:
  - url: https://alerting.example.com/hook` },
        { t: 'bullets', items: [
          'Configuration: <code>alertmanager-main</code> secret (key <code>alertmanager.yaml</code>) in <code>openshift-monitoring</code>, or console: <b>Administration → Cluster Settings → Configuration → Alertmanager</b>.',
          'Documented receivers: <b>PagerDuty</b>, <b>email</b> (SMTP), <b>webhook</b>, <b>Slack</b>.',
          'The default routing groups at 30 s / 5 min and repeats every 12 h.'
        ] },
        { t: 'callout', kind: 'trap', html: "A syntax error in <code>alertmanager.yaml</code> stops alert delivery. Procedure from the docs: <b>extract</b> the configuration (<code>oc -n openshift-monitoring get secret alertmanager-main --template='{{ index .data \"alertmanager.yaml\" }}' | base64 --decode</code>), <b>keep a copy</b>, edit, replace the secret with <code>oc create secret generic … --dry-run=client -o=yaml | oc replace</code>, then check the route tree with <code>oc exec alertmanager-main-0 -n openshift-monitoring -- amtool config routes show --alertmanager.url http://localhost:9093</code> (<code>amtool</code> is in the pod)." }
      ]
    },
    {
      title: 'User project alerts: where to route them?',
      layout: 'two',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '🏢 Platform Alertmanager', items: ['<code>alertmanagerMain.enableUserAlertmanagerConfig: true</code>', 'Teams create <code>AlertmanagerConfig</code>s in their namespaces', 'A single instance to operate', 'Project and platform alerts coexist'] },
          right: { title: '👥 Alertmanager dedicated to projects', items: ['Separate instance in <code>openshift-user-workload-monitoring</code> (<code>alertmanager: enabled</code>, <code>enableAlertmanagerConfig</code>)', 'Isolation from platform alerts', 'More components to operate', 'Choose it if teams have their own channels'] },
          verdict: 'In all cases, tell platform and projects apart with the <code>openshift_io_alert_source</code> matcher.' },
        { t: 'bullets', wide: true, items: [
          'The <code>alert-routing-edit</code> permission (previous slide) lets a team manage the routing of <b>its</b> project.',
          'The exact option names of both modes: “Configuring user workload monitoring” docs 4.20; check against the ConfigMap of your version.'
        ] }
      ]
    },
    {
      title: 'Silences and alerting hygiene',
      blocks: [
        { t: 'bullets', frag: true, items: [
          '<b>Silence</b>: suspends an alert\'s notifications for a duration (console: <b>Observe → Alerting → Silences</b>). It stays visible, just muted.',
          '<b>Silence ≠ fix</b>: set it with a short duration and a comment (ticket, author).',
          'Avoid “noise” alerts: every alert must have an expected <b>action</b>; otherwise, delete it or lower its severity.',
          'Test the chain: <code>Watchdog</code> should reach your receiver regularly.'
        ] },
        { t: 'callout', kind: 'tip', html: "During maintenance (cluster update, module 12), create <b>targeted silences</b> (for example on the nodes concerned) rather than disabling notifications globally." },
        { t: 'callout', kind: 'onprem', html: "On-site, the receiver (email, webhook, pager) is <b>yours</b>: outbound network path from the cluster, receiver certificates (CA) and service availability to validate." }
      ]
    },
    {
      title: 'Logging 6: what changed',
      tag: 'worth knowing',
      blocks: [
        { t: 'compare', wide: true,
          left: { title: '🗑️ Removed', items: ['<b>Elasticsearch</b> (storage), <b>Kibana</b> (visualization) and the <b>Fluentd</b> collector are no longer managed by logging', '<code>ClusterLogging</code> and <code>ClusterLogForwarder</code> APIs of the <code>logging.openshift.io</code> group not supported'] },
          right: { title: '✅ Today', items: ['Collection: <b>Vector</b>', 'Storage: <b>LokiStack</b> (Loki, on S3 object storage)', 'Configuration: <code>ClusterLogForwarder</code> in <code>observability.openshift.io/v1</code>', 'Interface: plugin in the console, via the <b>Cluster Observability Operator</b>'] },
          verdict: 'Logging 6.x is a product with a <b>life cycle distinct</b> from OCP: check the compatibility matrix (Logging 6.4: announced as compatible with 4.20 by the errata).' },
        { t: 'bullets', items: [
          'Operators: <b>Red Hat OpenShift Logging</b>, <b>Loki</b> and, for the interface, <b>Cluster Observability Operator</b>. Installed through OLM (module 04).',
          'Installation (6.4 docs): Loki operator in <code>openshift-operators-redhat</code> (label <code>openshift.io/cluster-monitoring: "true"</code>), Logging operator in <code>openshift-logging</code>, <code>redhat-operators</code> source, <code>stable-6.4</code> channel.'
        ] }
      ]
    },
    {
      title: 'Storing logs: LokiStack',
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
          '<b>S3 object storage</b> for the chunks (<code>logging-loki-s3</code> secret) + a <b>PVC</b> (<code>storageClassName</code>) for the Loki components.',
          'Sizes: <code>1x.pico</code> (since Logging 6.1; ≈ 50 GB/day, total requests ≈ 7 vCPU / 17 Gi, 8 / 18 with the ruler), <code>1x.extra-small</code> (≈ 100 GB/day, ≈ 14 vCPU / 31 Gi), <code>1x.small</code>, <code>1x.medium</code>; <code>1x.demo</code> for testing only. Figures from the “Loki deployment sizing” table in the Logging 6.6 docs: re-read the table for your version.',
          '<code>openshift-logging</code> mode: logs are separated by tenant (application, infrastructure, audit).'
        ] },
        { t: 'callout', kind: 'onprem', wide: true, html: "On-prem, the <b>S3 bucket</b> is yours to provide: ODF/NooBaa, MinIO or an S3 array (module 08). Sizing (LokiStack size, logs volume/day, retention) is calculated <b>before</b> installation; the size values above are from the Logging 6.4 docs." }
      ]
    },
    {
      title: 'Collecting: ClusterLogForwarder to LokiStack',
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
          ['oc create sa logging-collector -n openshift-logging', 'Collector ServiceAccount'],
          ['oc adm policy add-cluster-role-to-user collect-application-logs system:serviceaccount:openshift-logging:logging-collector', 'Permission to collect application logs (same for <code>collect-infrastructure-logs</code>)'],
          ['oc adm policy add-cluster-role-to-user logging-collector-logs-writer system:serviceaccount:openshift-logging:logging-collector', 'Permission to write to LokiStack']
        ] },
        { t: 'callout', kind: 'warn', html: "Example aligned with the <b>Installing logging</b> 6.4 docs (<code>tls.ca</code> on the <code>openshift-service-ca.crt</code> ConfigMap, key <code>service-ca.crt</code>); re-read it for your version. <b>Audit logs are not collected by default</b>: they require the <code>collect-audit-logs</code> permission and an <code>audit</code> entry in the pipeline." }
      ]
    },
    {
      title: 'Forwarding to a SIEM (including audit)',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'yaml', file: 'forwarder-syslog.yaml (excerpt)', code: `spec:
  outputs:
  - name: siem
    type: syslog
    syslog:
      url: tls://siem.example.com:6514
      rfc: RFC5424
  pipelines:
  - name: audit-to-siem
    inputRefs:
    - audit
    outputRefs:
    - siem` },
        { t: 'bullets', items: [
          'The <b>syslog</b> output accepts RFC3164 or RFC5424 formats over TCP, TLS or UDP.',
          'The <code>audit</code> input groups the audit logs: audit policy and reading the API audit → module 06.',
          'Other outputs exist (S3, CloudWatch, Splunk, Kafka…): re-read the list in the docs for your version.'
        ] },
        { t: 'callout', kind: 'trap', wide: true, html: "An unreachable SIEM or a rejected certificate <b>blocks or slows down the collector</b> and fills its buffer. Monitor the collector (Logging alerts) and plan a fallback path." },
        { t: 'callout', kind: 'onprem', wide: true, html: "<b>Audit logs</b> contain sensitive data: encrypt the transport (TLS), restrict the <code>collect-audit-logs</code> permissions and set retention on the SIEM side according to your policy." }
      ]
    },
    {
      title: 'Network observability and traces: overview',
      blocks: [
        { t: 'table', head: ['Tool', 'Role', 'Status'], rows: [
          ['<b>Cluster Observability Operator</b>', 'Deploys observability stacks (<code>MonitoringStack</code>, <code>monitoring.rhobs</code>) and console plugins (logs, traces, monitoring)', '“Monitoring” plugin in Technology Preview according to the docs: to be verified in 4.20'],
          ['<b>Network Observability Operator</b>', 'Cluster network flows (who talks to whom), dedicated dashboards', 'Details and versions: to be verified (module 07)'],
          ['<b>OpenTelemetry / Tempo</b>', 'Distributed application traces', 'Out of scope for this course']
        ] },
        { t: 'callout', kind: 'tip', html: "These tools <b>add to</b> the built-in stack; they don't replace it. Start by mastering metrics, alerts and logs before stacking other components." }
      ]
    },
    {
      title: 'Quiz',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Teams want to see their applications\' metrics in the console, without installing their own Prometheus. What is the first action?', options: ['Deploy one Prometheus per project', 'Set <code>enableUserWorkload: true</code> in <code>cluster-monitoring-config</code>', 'Edit the <code>alertmanager-main</code> secret', 'Give <code>cluster-admin</code> to the developers'], answer: 1, explain: '<code>enableUserWorkload: true</code> deploys a dedicated Prometheus and Thanos Ruler in <code>openshift-user-workload-monitoring</code>; teams then create <code>ServiceMonitor</code>s and <code>PrometheusRule</code>s with the <code>monitoring-*</code> roles.' },
        { t: 'quiz', q: 'On a multi-node production cluster, Prometheus and Alertmanager run without PVCs. What is the problem?', options: ['No problem: Prometheus time series are automatically replicated in etcd, so they survive a pod restart', 'Only a performance concern: queries are slower on ephemeral disk, but the data is kept after a restart', 'Data is lost when pods restart: the docs require persistent storage on multi-node clusters', 'User project monitoring becomes completely impossible as long as no PVC is configured for the platform'], answer: 2, explain: 'Without persistent storage, data is lost at every pod restart. The docs ask for persistent storage for Prometheus and Alertmanager on multi-node clusters; avoid raw block and non-POSIX file systems (some NFS).' },
        { t: 'quiz', q: 'With Logging 6, which resource describes which logs are collected and where they are sent?', options: ['<code>ClusterLogForwarder</code> (<code>observability.openshift.io/v1</code>)', '<code>ClusterLogging</code> (<code>logging.openshift.io</code>)', '<code>Elasticsearch</code>', '<code>LokiStack</code> alone'], answer: 0, explain: 'The <code>ClusterLogForwarder</code> defines inputs, outputs and pipelines. <code>LokiStack</code> only describes storage; <code>ClusterLogging</code> and Elasticsearch are no longer managed by Logging 6.' }
      ]
    },
    {
      title: 'Lab: user monitoring and alert routing',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'ServiceMonitor, alert rule and Alertmanager receiver', goal: 'Core during the session on a SNO (cluster-admin); the (bonus) steps are to be done on your own.', steps: [
          'Prerequisites: environment E1 (SNO) with <code>cluster-admin</code>, see module 00.',
          'Enable user monitoring: create or edit <code>cluster-monitoring-config</code> with <code>enableUserWorkload: true</code> and check the three pods in <code>openshift-user-workload-monitoring</code>.',
          'Apply the YAML from the “ServiceMonitor, PodMonitor, PrometheusRule” slide in a project: it deploys the example application <code>quay.io/brancz/prometheus-example-app</code> (port 8080, <code>/metrics</code>; tag from the docs, to be verified in 4.20), its <code>Service</code> and the <code>ServiceMonitor</code>, then check the target in <b>Observe → Targets</b>, then a query in <b>Observe → Metrics</b>.',
          'Create a <code>PrometheusRule</code> that fires quickly (for example with an expression like <code>vector(1)</code> and <code>for: 1m</code>) and watch the alert in <b>Observe → Alerting</b>.',
          'Add a webhook receiver and a route on your alert to the <code>alertmanager-main</code> secret (step 1: extract the current one into <code>alertmanager.yaml</code> and <b>copy it to <code>alertmanager.yaml.bak</code></b>; step 2: edit; step 3: replace the secret as in the docs), check with <code>oc exec alertmanager-main-0 -n openshift-monitoring -- amtool config routes show --alertmanager.url http://localhost:9093</code> (tool in the pod, nothing to install); create a 10-minute silence. <b>Rollback</b>: replace the secret with <code>alertmanager.yaml.bak</code>.',
          '(bonus) Add a <code>volumeClaimTemplate</code> to Prometheus (<code>retention</code> 7d, <code>retentionSize</code>) with an LVMS StorageClass and watch the restart and <code>oc get co monitoring</code>.',
          '(bonus) Install the Loki and Logging operators, create a <code>LokiStack</code> of size <code>1x.demo</code> on an S3 bucket (for example MinIO), the <code>ClusterLogForwarder</code> from the slide, and check that the logs are present in the console.',
          '(bonus) Add a <code>syslog</code> output to a lab receiver and an <code>audit</code> pipeline; check reception.'
        ] }
      ]
    }
  ],
  takeaways: [
    'The platform monitoring stack (Prometheus, Alertmanager, Thanos Querier…) is installed and managed by an operator; you tune it via <code>cluster-monitoring-config</code>.',
    'Default retention of 15 days; on multi-node clusters, <b>persistent storage</b> for Prometheus and Alertmanager (no raw block, no non-POSIX NFS).',
    '<code>enableUserWorkload: true</code> opens monitoring to projects: <code>ServiceMonitor</code> and <code>PrometheusRule</code> in the namespaces, permissions through <code>monitoring-*</code> and <code>alert-routing-edit</code> roles.',
    'Alertmanager: <code>alertmanager-main</code> secret, receivers (PagerDuty, email, webhook, Slack), routes and silences; <code>Watchdog</code> checks the chain.',
    'Logging 6: Vector, LokiStack on S3, <code>ClusterLogForwarder</code> in <code>observability.openshift.io/v1</code>; Elasticsearch, Kibana and Fluentd are no longer managed.',
    'Audit logs: not collected by default, <code>collect-audit-logs</code> permission and <code>audit</code> pipeline to the SIEM; audit policy in module 06.'
  ]
});
