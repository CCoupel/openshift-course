# Plan de formation — OpenShift on-premise, du K8s à OCP (v2)

> Référence de conception du cours. **Source de vérité pour `dev-course`** (périmètre, frontières, durées, labs) ; `CONVENTIONS.md` reste la référence de forme (schéma des modules et des blocs).
> v2 — 2026-10-06 — issue d'une revue du plan v1 et des décisions du même jour (version de référence, module 00, modules « à venir »).

---

## 1. Cadre

| | |
|---|---|
| **Public** | Admins Kubernetes qui passent à OpenShift, ingénieurs plateforme / DevOps. Les bases K8s (Pod, Deployment, Service, PV…) ne sont pas réexpliquées. |
| **Contexte** | On-premise (bare metal, vSphere). Encart `cloud` quand le comportement diffère fortement du cloud managé (ROSA/ARO/OSD), `onprem` pour ce qui est à la charge de l'exploitant. |
| **Hors périmètre v1** | OpenShift managé en détail, développement applicatif, suivi des apprenants côté serveur. |
| **Format** | 16 modules (00 à 15) sur 3 jours, HTML interactif (source unique) + export PPTX. |

### 1.1 Version de référence

- **OpenShift Container Platform 4.20 (EUS)**, soit **Kubernetes 1.33** selon la règle 1.(N+13) (confirmé par les release notes 4.20).
- **Note 4.22** : 4.22 est la dernière EUS (Kubernetes 1.35 ; GA en juin 2026 d'après des sources tierces) ; dates de cycle de vie à recouper sur access.redhat.com/product-life-cycles (**à vérifier**). Le cours reste sur la référence 4.20 EUS.
- Exemples de canaux : `stable-4.20`, `eus-4.20`. Mise à jour EUS → EUS illustrée par **4.20 → 4.22** (4.18 → 4.20 reste valable).
- Tout comportement introduit, déprécié ou retiré autour de 4.18–4.22 est **daté** dans la slide (« depuis 4.x », « retiré en 4.x ») et marqué « à vérifier dans les release notes » s'il n'est pas certain.
- Prompt de `oc debug node/…` puis `chroot /host` : RHCOS est basé sur RHEL 9, donc `sh-5.1#`.
- Faits structurants déjà acquis pour la v2 (à re-vérifier une fois à la rédaction) : OpenShift SDN retiré (4.17), seul CNI OVN-Kubernetes ; nœuds de calcul RHEL : dépréciés en 4.16, retirés en 4.19 ; Logging 6 = Vector + LokiStack (Elasticsearch/Fluentd/Kibana retirés) ; Grafana retiré de la console ; OLM v1 (`ClusterExtension`) disponible à côté d'OLM v0.

---

## 2. Budget horaire (P12)

**Convention** : le champ `duration` d'un module indique **l'exposé + le lab en séance**, sous la forme `'≈ 60 min + lab 20 min'`. Chaque lab comporte un **noyau en séance** (étapes obligatoires) et des **étapes bonus en autonomie**, signalées « (bonus) » en fin de liste dans le bloc `lab`.

Journée = **7 h effectives** (420 min, hors pauses et déjeuner).

| Module | Exposé | Lab en séance | Total |
|---|---|---|---|
| 00 Environnement de lab (**hors séance**, avant J1, non compté) | (30) | — | (30) |
| 01 K8s vs OCP | 45 | 15 | 60 |
| 02 Architecture | 60 | 20 | 80 |
| 03 Installation | 75 | 20 | 95 |
| 04 Configuration | 60 | 20 | 80 |
| **J1** | **240** | **75** | **315 (marge 105)** |
| 05 Supervision & monitoring | 70 | 20 | 90 |
| 06 HBAC / RBAC | 60 | 20 | 80 |
| 07 Réseau | 70 | 20 | 90 |
| 08 Stockage | 60 | 20 | 80 |
| 09 Sécurité avancée | 60 | 20 | 80 |
| **J2** | **320** | **100** | **420 (marge 0)** |
| 10 CI/CD & GitOps | 45 | 20 | 65 |
| 11 Backup & DR | 45 | 20 | 65 |
| 12 Opérations jour 2 | 60 | 20 | 80 |
| 13 Virtualisation & Serverless | 60 | 25 | 85 |
| 14 Best practices (check-list) | 30 | 15 | 45 |
| 15 Aide-mémoire & quiz final | 30 | — | 30 |
| **J3** | **270** | **100** | **370 (marge 50)** |
| **Total** | **830 (13 h 50)** | **275 (4 h 35)** | **1 105 min ≈ 18 h 25 / 21 h → marge ≈ 2 h 35** |

- J2 est saturé. **Fusible** : le lab 09 bascule en ouverture de J3, qui absorbe 20 min sur ses 50 de marge.
- Préparation **hors séance** : le module 00 (≈ 30 min d'exposé) et l'installation du cluster de lab (2 à 3 h) se font **avant J1** ; ils ne sont comptés dans aucune journée.
- En mode « lecture seule » (sans labs), compter ≈ 13 h 50, soit un peu plus de 2 jours.

---

## 3. Environnements de lab (référence pour le module 00)

| Niveau | Environnement | Ce qu'il permet | Limites |
|---|---|---|---|
| **E0** | Tout cluster avec `cluster-admin` ; **OpenShift Local** (ex-CRC) suffit | `oc`, RBAC, IdP htpasswd/LDAP, Operators légers, GitOps | Un seul nœud, pas de Machine API, pas de mise à jour, monitoring désactivé par défaut (activable : à vérifier) ; ressources minimales à vérifier |
| **E1** | **SNO** (Single Node OpenShift) sur KVM, vSphere ou bare metal, essai 60 j | MachineConfig avec reboot, LVMS, monitoring/logging, Compliance, OADP, etcd backup, must-gather, mise à jour | Pas de quorum etcd réel, pas de MHC utile, pas d'ODF ; minimums SNO à vérifier (ordre de grandeur 8 vCPU / 16 Go / 120 Go, plus pour logging et virtualisation) |
| **E2** | **Compact 3 nœuds** (ou 3 masters + 2 workers) | Quorum etcd, MachineHealthCheck, ODF, MetalLB, EgressIP, mise à jour progressive | Coût en ressources |
| **E3** | Bare metal ou virtualisation imbriquée | OpenShift Virtualization (VM, migration à chaud) | Virtualisation imbriquée non supportée en production (acceptable en lab : à vérifier) |

Environnement **recommandé pour suivre tout le cours** : un SNO (E1) bien dimensionné (16 vCPU, 48–64 Go), complété en option par un compact (E2) pour les étapes bonus. Licence : **essai 60 jours** via console.redhat.com (durée et conditions à vérifier). Alternative communautaire **OKD** (base CentOS Stream CoreOS, sans support ; écarts à signaler, à vérifier).
Les labs ne s'appuient jamais sur le Developer Sandbox (pas de `cluster-admin`).

Annonce dans chaque lab : premier `step` = « Prérequis : E1 (SNO) » ou équivalent, avec renvoi au module 00.

---

## 4. Les 16 modules

Format des fiches : **Objectif** · **Traité** · **Renvoyé** (sujet → module propriétaire) · **Durée** · **Jour** · **Public / accent** · **Lab** (noyau en séance / bonus, prérequis) · **À vérifier**.
État au 2026-10-06 : ✅ rédigé (01, 02, 06, 08, mises à jour v2 à appliquer) · ⬜ à écrire.

### Jour 1 — Comprendre et installer

#### 00 — Environnement de lab ⬜ (`m00-environnement.js`)
- **Objectif** : disposer d'un cluster adapté avant J1 et savoir quel lab exige quel environnement.
- **Traité** : niveaux E0–E3 (§3) ; OpenShift Local (installation, `crc setup/start`, utilisateurs `kubeadmin`/`developer`) ; SNO via Assisted Installer (parcours rapide) ; essai 60 j et pull secret ; OKD en alternative ; poste de travail (`oc`, `openshift-install`, `oc-mirror`, `butane`, `jq`) ; **matrice prérequis par lab** (copie du tableau §5) ; remise à zéro d'un lab.
- **Renvoyé** : méthodes d'installation détaillées, `install-config.yaml`, air-gap → 03 ; topologies → 02.
- **Durée** : `'≈ 30 min'` (hors séance, avant J1 ; lab de préparation en autonomie, non compté dans le budget). **Taille** : 14–16 slides (seuil bas du validateur : 14), 2 quiz, 1 lab.
- **Lab** : « Prépare ton cluster » (E0 ou E1, avant J1) : installer les CLI, se connecter, `oc whoami --show-server`, `oc get clusterversion`, `oc get nodes`, vérifier les ressources disponibles.
- **À vérifier** : option d'activation du monitoring dans OpenShift Local ; modalités et expiration de l'essai (la durée de 60 jours et les minimums SNO / OpenShift Local sont confirmés).

#### 01 — K8s vs OCP ✅
- **Objectif** : situer OCP face au K8s vanilla, dictionnaire, verrous, éditions, cycle de vie, choix.
- **Traité** : tel que rédigé (18 slides). SCC présentés comme **piège de migration** uniquement.
- **Renvoyé** : SCC en profondeur → 09 ; procédure de mise à jour → 12 ; air-gap → 03 ; Operators/OLM → 04.
- **Durée** : ≈ 45 min + lab 15 min. **Lab** : E0.
- **À vérifier** : voir la liste des mises à jour v2 (canaux, exemples de version, éditions).

#### 02 — Architecture ✅
- **Objectif** : nœuds, RHCOS, etcd, CVO/Cluster Operators, Machine API, MCO, topologies, trajet d'une requête, ports.
- **Traité** : tel que rédigé (22 slides). Propriétaire des **concepts** : MCO/MachineConfig, topologies, LB/DNS/VIP, ports, Machine API.
- **Renvoyé** : mise en œuvre de LB/DNS/VIP et choix de méthode → 03 ; MachineConfig d'usage (chrony, kargs) → 04 ; admission SCC → 09 ; RBAC → 06.
- **Durée** : ≈ 60 min + lab 20 min. **Lab** : E1 (reboot MachineConfig), bonus E2 (MHC, quorum).
- **À vérifier** : passage en GA du 2 nœuds avec fencing (Technology Preview en 4.20, GA en 4.22) ; l'arbitre est GA en 4.20, les node disruption policies existent depuis 4.17 et les plateformes HCP de 4.20 sont documentées.

#### 03 — Installation ⬜ (`m03-installation.js`)
- **Objectif** : choisir et dérouler une installation on-prem, connectée ou déconnectée, et la valider.
- **Traité** : panorama des méthodes (Agent-based, Assisted, IPI, UPI ; plateformes `baremetal`, `vsphere`, `none`) et arbre de décision ; prérequis concrets (DNS `api`/`api-int`/`*.apps`, LB ou VIP, NTP, DHCP/statique, ports, certificats) ; `install-config.yaml` et `agent-config.yaml` commentés ; bootstrap et suivi (`wait-for`), CSR ; **installation déconnectée** (P6) : registre miroir, `oc-mirror` (v2), `ImageSetConfiguration`, `ImageDigestMirrorSet`/`ImageTagMirrorSet`, catalogues miroités, pull secret fusionné ; vérifications post-install (`oc get co`, `clusterversion`, nœuds) ; erreurs classiques.
- **Renvoyé** : description des topologies et des rôles → 02 ; utilisation des catalogues (CatalogSource, OLM) → 04 ; IdP et suppression de kubeadmin → 06 ; choix du backend de stockage → 08 ; réseau des nœuds (NMState) → 07.
- **Durée** : ≈ 75 min + lab 20 min. **Taille** : 20–22 slides.
- **Lab** : noyau (poste de travail, sans cluster) : rédiger `install-config.yaml` + `agent-config.yaml` d'un SNO et générer les manifests (`openshift-install agent create cluster-manifests`) ; bonus (E1) : relire le journal d'installation du cluster du module 00, préparer un `ImageSetConfiguration` et lancer un `oc-mirror` vers disque.
- **À vérifier** : `apiVersion` d'`AgentConfig` en 4.20 (v1beta1 documenté en 4.22) ; privilèges vCenter ; PTR exigé selon la méthode ; registres miroir supportés ; option `--dry-run` d'`oc-mirror` ; plateformes supportées par l'Agent-based installer ; IDMS/ITMS vs ICSP (déprécié) ; sous-commandes exactes d'`openshift-install agent`.

#### 04 — Configuration ⬜ (`m04-configuration.js`)
- **Objectif** : configurer un cluster fraîchement installé (« jour 1 ») de façon déclarative, et gérer les Operators.
- **Traité** (P5) : ressources `config.openshift.io` (`Proxy`, `Image` / sources de registres autorisées, `APIServer` avec profil TLS, `Ingress` de cluster, `Scheduler`, `Console`) ; **certificats** (remplacement du certificat ingress par défaut et de l'API, CA de confiance du cluster) ; MachineConfig d'usage (chrony/NTP, kargs) via `butane` ; **OLM** : OperatorHub, `Subscription`, canaux, approbation manuelle des `InstallPlan`, `CatalogSource` miroités, OLM v1 (`ClusterExtension`) ; console et plugins ; check-list post-install.
- **Renvoyé** : concept MCO → 02 ; IdP/OAuth → 06 ; IngressController (sharding, routes) → 07 ; stockage du registre → 08 ; rotation des certificats et CSR → 12 ; GitOps de cette configuration → 10.
- **Durée** : ≈ 60 min + lab 20 min. **Lab** : E1 (MachineConfig chrony, certificat ingress auto-signé par une CA de lab, installation d'un Operator en approbation manuelle) ; bonus : ClusterExtension OLM v1.
- **À vérifier** : détails de l'API OLM v1 (OLM v1 est GA depuis 4.18) ; comportement des kubeconfig après remplacement du certificat de l'API ; label `inject-trusted-cabundle`.

### Jour 2 — Brancher, sécuriser, observer

#### 05 — Supervision & monitoring ⬜ (`m05-monitoring.js`)
- **Objectif** (observabilité : métriques, alertes, logs) : exploiter la stack de monitoring de plateforme, ouvrir le monitoring aux équipes, router les alertes et centraliser les logs.
- **Traité** : Prometheus/Alertmanager/Thanos de plateforme (`cluster-monitoring-config`), persistance et rétention ; monitoring des workloads utilisateur (`user-workload-monitoring-config`, `ServiceMonitor`, `PrometheusRule`) ; routage d'alertes (Alertmanager, receivers, silences) ; tableaux de bord de la console (Grafana retiré) ; alertes clés (etcd, certificats, nœuds) ; **logging** (P2) : Logging 6, Vector, `ClusterLogForwarder`, LokiStack, transfert vers SIEM (dont logs d'audit) ; survol Network Observability et Cluster Observability Operator.
- **Renvoyé** : stockage de Prometheus/Loki (StorageClass, S3) → 08 ; politique d'audit de l'API → 06 ; métriques disque etcd → 08 ; RBAC d'accès aux métriques → 06.
- **Durée** : ≈ 70 min + lab 20 min. **Lab** : E1 (activer le monitoring utilisateur, `ServiceMonitor` + `PrometheusRule`, receiver webhook) ; bonus : LokiStack taille démo sur MinIO, `ClusterLogForwarder` vers un syslog.
- **À vérifier** : forme exacte des blocs `authentication` / TLS de la sortie `lokiStack` ; canaux d'abonnement Logging 6.x ; statut du plugin de monitoring du Cluster Observability Operator et du Network Observability Operator en 4.20 ; noms et sévérités des alertes livrées (seuls `Watchdog` et `etcdMembersDown` vérifiés). Confirmés : `observability.openshift.io/v1`, LokiStack `loki.grafana.com/v1` et ses tailles, ConfigMaps et rétention (15 j plateforme, 24 h utilisateur).

#### 06 — HBAC / RBAC ✅
- **Objectif** : authn/authz, IdP, rôles, groupes, multi-tenance, « HBAC », break-glass, audit.
- **Traité** : tel que rédigé (22 slides). Propriétaire : OAuth/IdP, RBAC, project template, quotas, kubeadmin, politique d'audit. SCC limités à l'**angle autorisation** (verbe `use`, ServiceAccount).
- **Renvoyé** : SCC en profondeur → 09 ; NetworkPolicy → 07 ; expédition des logs d'audit → 05.
- **Durée** : ≈ 60 min + lab 20 min. **Lab** : E0 (htpasswd/LDAP conteneurisé), suppression de kubeadmin sur cluster jetable uniquement.
- **À vérifier** : rien de propre. `claims.groups` du serveur OAuth (IdP OpenID) existe depuis 4.10 et crée des objets Group ; l'OIDC direct (GA en 4.20) ne crée pas d'objets Group.

#### 07 — Réseau ⬜ (`m07-reseau.js`)
- **Objectif** : comprendre et exploiter le réseau d'un cluster on-prem, du nœud jusqu'à la sortie.
- **Traité** : OVN-Kubernetes (seul CNI ; migration depuis SDN mentionnée) ; plages réseau (`clusterNetwork`, `serviceNetwork`, `machineNetwork`) et leur caractère définitif ; DNS interne ; Services, Routes (edge/passthrough/reencrypt), IngressController (sharding, nœuds infra) ; Gateway API (statut à vérifier) ; NetworkPolicy, AdminNetworkPolicy/BaselineAdminNetworkPolicy ; egress (EgressIP, EgressFirewall, proxy) ; MetalLB (L2/BGP) ; NMState (bonds, VLAN) ; Multus et réseaux secondaires ; User-Defined Networks ; dépannage (`oc debug`, `ovnkube-trace`, must-gather réseau).
- **Renvoyé** : LB API et ports → 02 ; proxy de cluster → 04 ; réseau des VM → 13 ; Network Observability → 05.
- **Durée** : ≈ 70 min + lab 20 min. **Lab** : E1 (Route reencrypt, NetworkPolicy deny-all + ouverture, EgressFirewall) ; bonus E2 : MetalLB L2, EgressIP.
- **À vérifier** : statut GA d'AdminNetworkPolicy (API `v1alpha1`, aucun marquage Tech Preview dans la doc 4.20 lue) ; nom de la CR `MetalLB` (namespace `metallb-system` et canal `stable` confirmés) ; label `policy-group.network.openshift.io/ingress` ; `EgressService`. Confirmés : UDN GA depuis 4.18, Gateway API GA depuis 4.19, `ovnkube-trace` documenté en 4.20, SDN retiré en 4.17, règles de modification des plages réseau.

#### 08 — Stockage ✅
- **Objectif** : backends on-prem, StorageClass, ODF, snapshots/expansion, etcd et disques, stockage des briques plateforme, permissions, dépannage.
- **Traité** : tel que rédigé (21 slides). Permissions limitées à l'**angle volume** (fsGroup, NFS).
- **Renvoyé** : SCC → 09 ; sauvegarde → 11 ; logging/monitoring (configuration) → 05 ; RWX block pour VM → 13.
- **Durée** : ≈ 60 min + lab 20 min. **Lab** : E1 (LVMS) ; bonus E2 : ODF.
- **À vérifier** : expansion à chaud selon le driver CSI (RWX vSphere via vSAN File Services et sélection de disques LVMS sont confirmés ; namespace LVMS 4.20 : `openshift-lvm-storage`).

#### 09 — Sécurité avancée ⬜ (`m09-securite.js`)
- **Objectif** : maîtriser la sécurité des workloads et de la plateforme au-delà du RBAC. **Propriétaire unique des SCC** (P7).
- **Traité** : SCC en profondeur (stratégies UID/SELinux/fsGroup, priorité de sélection, `restricted-v2`, création d'un SCC dédié, `scc-subject-review`) ; articulation SCC ↔ Pod Security Admission (synchronisation des labels) ; sécurité des images (sources autorisées, signatures sigstore / `ClusterImagePolicy`) ; secrets (chiffrement etcd, External Secrets / Secrets Store CSI avec Vault) ; Compliance Operator (profils CIS, PCI-DSS, FedRAMP, STIG… ; aucun profil ANSSI dans la liste supportée de la doc 4.20), File Integrity Operator ; RHCOS (SELinux, FIPS à l'installation) ; ACS en survol.
- **Renvoyé** : RBAC et autorisation `use` des SCC → 06 ; NetworkPolicy → 07 ; politique d'audit → 06 ; sources de registres (configuration) → 04.
- **Durée** : ≈ 60 min + lab 20 min (**fusible J2**, cf. §2). **Lab** : E1 (diagnostiquer un pod refusé, SCC dédié minimal, scan Compliance Operator) ; bonus : chiffrement etcd.
- **À vérifier** : statut PSA (enforce global ou non) en 4.20 ; `ClusterImagePolicy` / `ImagePolicy` GA en 4.20 (`config.openshift.io/v1`) ; politique par défaut `openshift` et BYOPKI en Technology Preview en 4.20, GA en 4.21 (release notes 4.21) ; profils disponibles dans le Compliance Operator ; algorithmes de chiffrement etcd (aescbc / aesgcm).

### Jour 3 — Exploiter dans la durée

#### 10 — CI/CD & GitOps ⬜ (`m10-cicd-gitops.js`)
- **Objectif** : gérer la configuration de la plateforme en GitOps ; situer Pipelines et Builds.
- **Traité** : OpenShift GitOps (Argo CD) pour la **config cluster** (instance de cluster vs instances d'équipe, RBAC Argo CD, app-of-apps, sync waves, gestion des secrets) ; arborescence de dépôt type (base/overlays par cluster) ; survol OpenShift Pipelines (Tekton) et Builds (BuildConfig, Builds for OpenShift / Shipwright) ; place du dev applicatif (hors périmètre).
- **Renvoyé** : ressources configurées → 04/06/07 ; secrets → 09 ; multi-cluster (ACM) → 14.
- **Durée** : ≈ 45 min + lab 20 min. **Lab** : E0/E1 + dépôt Git (GitHub ou Gitea) : installer GitOps, synchroniser un project template et un quota.
- **À vérifier** : champs `rbac` et authentification de la CR `ArgoCD` ; champs de l'`ApplicationSet` ; statut de dépréciation de BuildConfig en 4.20 ; statut actuel du pull model ACM. Confirmés : OpenShift GitOps 1.18 à 1.21 compatibles avec la 4.20 (Argo CD 3.1.9 en 1.19, 3.3.2 en 1.20, 3.4.3 en 1.21), instance par défaut sans cluster-admin, Keycloak non supporté dès la 1.18, Argo CD Agent GA en 1.19, ClusterTask retiré en Pipelines 1.17, Builds 1.6 (Shipwright GA) pour la 4.20.

#### 11 — Backup & reprise d'activité ⬜ (`m11-backup-dr.js`)
- **Objectif** : sauvegarder et restaurer un cluster et ses applications, et bâtir une stratégie de DR on-prem.
- **Traité** : sauvegarde etcd (`cluster-backup.sh`, CronJob/automatisation), restauration à un état antérieur et restauration du quorum ; OADP (Velero, `DataProtectionApplication`, `Backup`/`Restore`, snapshots CSI vs copie de données) ; ce qu'on ne sauvegarde pas (reconstruire par GitOps) ; stratégies DR (reconstruction + GitOps + OADP, cluster passif, stretch) ; tests de restauration.
- **Renvoyé** : snapshots CSI → 08 ; GitOps → 10 ; ODF stretch / Regional DR → 08 (mention).
- **Durée** : ≈ 45 min + lab 20 min. **Lab** : E1 + S3 (MinIO) : sauvegarde etcd, OADP backup puis restauration d'un namespace supprimé ; bonus (cluster jetable) : restauration etcd.
- **À vérifier** : nom du paquet et canal d'OADP en 4.20 ; champs exacts de la `DataProtectionApplication` ; restauration OADP inter-cluster. Ordre de la restauration etcd (multi-nœuds et SNO) tranché sur la doc 4.20 ; OADP 1.6 vise OCP 4.22 (le cours retient la 1.5). Confirmés : `cluster-backup.sh`, contenu de l'archive, règles (un seul nœud, 24 h, même z-stream), `quorum-restore.sh`, `cluster-restore.sh`, `disable-etcd.sh`, OADP 1.5 compatible OCP 4.19-4.21, limites d'OADP vis-à-vis d'etcd.

#### 12 — Opérations jour 2 ⬜ (`m12-jour2.js`)
- **Objectif** : maintenir le cluster en condition opérationnelle.
- **Traité** : mises à jour (canaux, graphe, EUS → EUS 4.20 → 4.22, pause des MachineConfigPools, mise à jour du control plane seul, pré-checks, Operators) ; ajout/retrait de nœuds (Machine API ou manuel, CSR) ; rotation des certificats et approbation des CSR ; diagnostic (`must-gather`, `oc adm inspect`, `oc adm node-logs`, `oc debug`, Insights) ; capacité (requests/limits, overcommit, `ClusterAutoscaler` si Machine API) ; drain et maintenance matérielle.
- **Renvoyé** : cycle de vie et EUS (concepts) → 01 ; Machine API, MHC → 02 ; remplacement de certificats → 04 ; quotas par projet → 06.
- **Durée** : ≈ 60 min + lab 20 min. **Lab** : E1 (must-gather ciblé, `oc adm upgrade` en lecture, simulation de maintenance par drain) ; bonus : mise à jour mineure réelle (E1/E2).
- **À vérifier** : commandes détaillées de la procédure Control Plane Only en 4.20 et contraintes de skew ; clé `admin-acks` de la montée 4.20 → 4.21 (sigstore) ; option `--to-image` et procédure déconnectée ; valeurs par défaut de `system-reserved` selon les versions OCP et MCO. Confirmés : `autoSizingReserved` désactivé par défaut en 4.20, automatique dès la 4.21 (notes de version 4.21) ; `oc adm upgrade recommend` GA en 4.20, canaux, pause des pools, `admin-acks` 4.20, `oc adm node-image create`, durées de rotation des certificats.

#### 13 — Virtualisation & Serverless ⬜ (`m13-virt-serverless.js`) — **parts égales**
- **Objectif** : exploiter des VM sur OpenShift et situer le serverless pour un admin plateforme.
- **Traité — Virtualisation (≈ 50 %)** : OpenShift Virtualization (KubeVirt, `VirtualMachine`, templates, `virtctl`) ; exigences (bare metal, RWX block pour la migration à chaud) ; réseau des VM (pod network, bridge/Multus, UDN) ; migration depuis VMware avec MTV ; sauvegarde des VM (OADP) ; dimensionnement.
- **Traité — Serverless (≈ 50 %)** : OpenShift Serverless (Knative Serving : scale to zero, révisions, trafic ; Eventing : sources, brokers, Kafka) ; installation et ce que l'admin gère (`KnativeServing`, ingress, quotas) ; cas d'usage et limites ; Functions en survol.
- **Renvoyé** : stockage RWX block → 08 ; Multus/NMState → 07 ; OADP → 11.
- **Durée** : ≈ 60 min + lab 25 min. **Lab** : noyau E1 (Serverless : service Knative, scale to zero) + E3 (VM depuis un template, console, `virtctl`) ; bonus E2/E3 : migration à chaud.
- **À vérifier** : exigences matérielles détaillées et plateformes supportées d'OpenShift Virtualization 4.20 ; `apiVersion` des instance types / CDI / boot sources ; statut des runtimes Functions autres que Python. Confirmés : OpenShift Serverless 1.37 supporté sur OCP 4.16-4.20 (page de cycle de vie des Operators Red Hat) ; MTV 2.10 (OCP 4.18-4.20), 2.11 (4.19-4.21), 2.12 (4.20-4.22) ; MTV 2.10 (vSphere 6.5+, VDDK, `forklift.konveyor.io/v1beta1`), prérequis de la migration à chaud (RWX), Operator `kubevirt-hyperconverged` (canal stable, `openshift-cnv`), Serverless 1.37 (Knative 1.17, canal stable, `operator.knative.dev/v1beta1`), runtime Python des Functions GA en 1.37.

#### 14 — Best practices (check-list de mise en production) ⬜ (`m14-best-practices.js`)
- **Objectif** (P8) : disposer d'une **check-list transverse** de mise en production, réutilisable en mission.
- **Traité** : check-list par domaine (architecture et dimensionnement, installation, identité, réseau, stockage, observabilité, sécurité, sauvegarde, mises à jour, GitOps), chaque point renvoyant au module propriétaire ; anti-patterns récurrents ; ouverture multi-cluster (ACM) ; gouvernance (qui fait quoi). **Ne répète pas** les bonnes pratiques détaillées des modules.
- **Durée** : ≈ 30 min + lab 15 min. **Taille** : 16 slides environ.
- **Lab** : E1 : auditer son propre cluster avec la check-list (quels points sont verts ?), en lecture seule.
- **Rédigé** : 21 slides, dont 6 slides de check-list « à consulter, hors exposé » (exposé de 30 min sur les 15 autres ; budget §2 inchangé) : (6 slides de check-list par phase, dimensionnement, nœuds d'infra, multi-tenance, HA, écart cloud, ACM, anti-patterns, go/no-go, erreurs en mission, quiz, lab).
- **À vérifier** : souscription du hub ACM, labels de zone hors vSphere, valeurs par défaut de `system-reserved` selon versions. Confirmés : matrices de support ACM 2.14 et 2.15 listent OCP 4.20 EUS (hub et gérés) ; dans la doc 4.20 : dimensionnement control plane et infra, 60 % de capacité, composants éligibles aux nœuds d'infra, pool `infra` et double label `infra,worker`, `system-reserved` 500m/1Gi, `autoSizingReserved` désactivé par défaut en 4.20 (automatique dès la 4.21), 250 pods par nœud par défaut, maximums testés.

#### 15 — Aide-mémoire & quiz final ⬜ (`m15-aide-memoire.js`)
- **Objectif** : réviser et emporter les commandes essentielles.
- **Traité** : fiches `oc` par domaine (reprises des modules), dictionnaire K8s ↔ OCP, quiz final (≈ 10 questions couvrant J1–J3). Pas de lab (exception prévue dans `CONVENTIONS.md`).
- **Durée** : ≈ 30 min.

---

## 5. Matrice des prérequis de lab

> Alignée sur les labs **rédigés** (modules 00 à 14) ; les lignes des modules à venir restent le plan.

| Module | Noyau en séance | Bonus |
|---|---|---|
| 00 | E0 (poste de travail, OpenShift Local ou cluster existant), en autonomie | E1 (SNO + snapshot) |
| 01 | E0 (OpenShift Local ou SNO) | — |
| 02 | E1 | E1 : MachineConfig `/etc/motd` (redémarre le SNO). MHC et quorum etcd (E2) non rédigés |
| 03 | Poste de travail (E0 suffit) | E1 (lecture de `clusterversion`) ; `oc-mirror` en simulation (accès réseau, pull secret) |
| 04 | E1 (chrony avec reboot, Operator en approbation manuelle) | E1 : certificat Ingress (cluster jetable, retour arrière), bannière console, OLM v1 |
| 05 | E1 (monitoring utilisateur, `ServiceMonitor` + `PrometheusRule`, receiver webhook Alertmanager, silence) | E1 : PVC du monitoring ; E1 + S3 (MinIO) : LokiStack `1x.demo` + `ClusterLogForwarder` ; sortie syslog avec pipeline audit |
| 06 | E0 ou E1 | (bonus : audit) |
| 07 | E1 (Route edge, NetworkPolicy `deny-all` + `allow-from-openshift-ingress` + `allow-from-hostnetwork`, test inter-projets) | E1 : EgressFirewall, MetalLB L2 (plage IP libre), UDN primaire ; EgressIP (E2 de préférence) ; NMState (cluster jetable) |
| 08 | E1 (LVMS ou StorageClass CSI) | E1 (provoquer une erreur de PVC) ; ODF (E2) non rédigé |
| 09 | E1 (pod refusé et diagnostic, SCC dédiée + RBAC, installation du Compliance Operator et `ScanSettingBinding` CIS) ; lab fusible J3 | E1 : lecture du scan et d'une remédiation, PSA warn/audit, chiffrement etcd (cluster jetable), File Integrity Operator |
| 10 | E0 ou E1 + dépôt Git joignable depuis le cluster (installation d'OpenShift GitOps, Application sur `ResourceQuota` et `ConfigMap`, dérive et `selfHeal`) | E1 : app-of-apps et sync wave ; E1 jetable : ClusterRole minimal pour Argo CD ; E2 : `ApplicationSet` sur deux clusters |
| 11 | E1 (sauvegarde etcd non destructive, export hors du nœud, lecture de l'archive, installation d'OADP) | E1 + S3 (MinIO) : `DataProtectionApplication`, sauvegarde, suppression puis restauration d'un namespace ; cluster JETABLE (E1 jetable ou E2) : restauration etcd complète |
| 12 | E1 (état de mise à jour en lecture, `must-gather` et `oc adm inspect`, quota et LimitRange, cordon / drain / uncordon) | E1 jetable ou E2 : mise à jour mineure réelle ; E2 : pause d'un pool `worker`, ajout d'un nœud (`oc adm node-image create` ou MachineSet) |
| 13 | E1 (Serverless : Operator, `KnativeServing`/`KnativeEventing`, service Knative, scale-to-zero, répartition de trafic) | E3 : OpenShift Virtualization, VM depuis une boot source, `virtctl` ; E3 multi-nœuds + stockage RWX : migration à chaud ; vCenter de test : migration MTV cold |
| 14 | E1 (audit en lecture seule d'un cluster avec la check-list : `oc get`, `describe`, `top`, sans modification) | Go / no-go sur un cluster fictif (sans cluster) ; revue des `Subscription` (E1, lecture seule ; approbation manuelle) |
| 15 | — | — |

---

## 6. Règles de renvoi entre modules

1. **Un sujet = un module propriétaire** (tableau ci-dessous). Les autres modules n'en gardent que l'angle utile à leur propos, en **une slide au plus**, et terminent par un renvoi.
2. **Forme du renvoi** : « voir module NN » avec numéro sur **deux chiffres** (`module 09`), éventuellement suivi du titre court (« module 09, Sécurité avancée »). Les numéros sont **stables** (pas de renumérotation en v2) ; les renvois vers des modules non encore rédigés sont autorisés.
3. Un renvoi **en avant** (vers un module plus loin) se limite à un signalement ; il n'exige pas de comprendre la suite.
4. Toute modification de périmètre d'un module propriétaire met à jour ce tableau.

| Sujet | Propriétaire | Usages autorisés ailleurs |
|---|---|---|
| SCC, PSA, sécurité des images, secrets, conformité | **09** | 01 (piège de migration), 06 (autorisation `use`), 08 (permissions de volume) |
| MCO / MachineConfig (concept), topologies, LB/DNS/VIP, ports, Machine API | **02** | 03 (mise en œuvre), 04 (MachineConfig d'usage) |
| Méthodes d'installation, air-gap, miroir | **03** | 01 (mention), 04 (CatalogSource miroité) |
| Ressources `config.openshift.io`, certificats (remplacement), OLM | **04** | 12 (rotation) |
| Monitoring, alertes, logging | **05** | 08 (stockage), 06 (audit) |
| OAuth, IdP, RBAC, project template, quotas, audit (politique) | **06** | 02 (chaîne authz), 12 (capacité) |
| CNI, Routes, IngressController, NetworkPolicy, egress, MetalLB, NMState | **07** | 06 (NetworkPolicy du template), 13 (réseau des VM) |
| Backends, StorageClass, snapshots, disques etcd | **08** | 11 (sauvegarde), 13 (RWX block) |
| Sauvegarde etcd, OADP, DR | **11** | 08 (« un snapshot n'est pas une sauvegarde ») |
| Mises à jour (procédure), diagnostic, nœuds | **12** | 01 (cycle de vie, EUS) |
| Check-list de mise en production | **14** | tous (bonnes pratiques locales) |

---

## 7. Points ouverts

Aucun point ouvert de structure. Résolus : **P11** (modules non rédigés) par le manifeste `assets/plan.js` (sommaire complet, modules « à venir » grisés, aucun 404) et la règle `index.html` de `CONVENTIONS.md` ; la balise `<script>` de chaque nouveau module est la seule modification autorisée de `index.html`.
Les points techniques « à vérifier » restent portés par chaque fiche de module (§4).
