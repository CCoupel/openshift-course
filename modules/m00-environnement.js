COURSE.add({
  id: 'm00', num: 0, emoji: '🧪',
  title: 'Environnement de lab',
  tagline: 'Avant le jour 1 : un cluster qui tient la route, les bons outils, et la certitude de savoir quel lab demande quoi.',
  duration: '≈ 30 min',
  objectives: [
    'Choisir un niveau d\'environnement (E0 à E3) adapté aux labs que tu veux faire',
    'Mettre en place un cluster de lab : OpenShift Local, SNO ou compact, avec les options on-prem',
    'Préparer ton poste de travail : outils, pull secret, DNS, ressources',
    'Vérifier la santé du cluster et savoir t\'y connecter en administrateur',
    'Sauvegarder et remettre à zéro ton lab sans perdre une journée'
  ],
  slides: [
    {
      title: 'Pourquoi un module 00 ?',
      blocks: [
        { t: 'text', html: "<p>Le cours est <b>pratique</b> : chaque module se termine par un lab sur un vrai cluster. Un lab bloqué par un environnement mal préparé coûte plus cher qu'un exposé raté. Ce module est <b>hors séance</b> : à faire <b>avant le jour 1</b>, à ton rythme.</p>" },
        { t: 'bullets', frag: true, items: [
          '<b>Objectif</b> : arriver au jour 1 avec un cluster sain, <code>cluster-admin</code> en main, et les outils installés.',
          '<b>Ce module n\'est pas</b> le cours sur l\'installation : le <b>comment</b> d\'une installation (méthodes, DNS, LB, déconnecté) est au <b>module 03</b>.',
          'Il te dit <b>quoi viser</b> (niveau d\'environnement) et <b>comment démarrer vite</b> avec un cluster de lab.'
        ] },
        { t: 'callout', kind: 'tip', html: "Compte <b>2 à 3 heures</b> la première fois (téléchargements, installation, vérifications). Ne le fais pas la veille du jour 1." }
      ]
    },
    {
      title: 'Quatre niveaux d\'environnement',
      blocks: [
        { t: 'table', head: ['Niveau', 'Environnement', 'Ce qu\'il permet', 'Limites'], rows: [
          ['<b>E0</b>', 'Poste de travail seul, ou <b>OpenShift Local</b>, ou tout cluster en <code>cluster-admin</code>', '<code>oc</code>, RBAC, IdP htpasswd, Operators légers, GitOps', 'Un seul nœud, pas de Machine API, pas de mise à jour ; monitoring désactivé par défaut (à vérifier)'],
          ['<b>E1</b>', '<b>SNO</b> (un nœud) sur KVM, vSphere ou bare metal', 'MachineConfig avec reboot, LVMS, monitoring et logging, sauvegarde etcd, mise à jour', 'Pas de quorum etcd réel, pas d\'ODF ; minimum officiel 8 vCPU / 16 Go / 120 Go'],
          ['<b>E2</b>', '<b>Compact</b> 3 nœuds (ou 3 masters + 2 workers)', 'Quorum etcd, MachineHealthCheck, ODF, MetalLB, EgressIP, mise à jour progressive', 'Consomme beaucoup de ressources'],
          ['<b>E3</b>', 'Bare metal ou virtualisation imbriquée', 'OpenShift Virtualization (VM, migration à chaud)', 'Virtualisation imbriquée : acceptable en lab, pas en production (à vérifier)']
        ] },
        { t: 'callout', kind: 'tip', html: "Recommandation : un <b>SNO (E1) bien dimensionné</b> couvre presque tout le cours. Ajoute un compact (E2) seulement si tu veux les étapes bonus qui le demandent." }
      ]
    },
    {
      title: 'Quel lab demande quel niveau ?',
      tag: 'à consulter',
      blocks: [
        { t: 'table', head: ['Niveau du noyau', 'Modules', 'Bonus / remarque'], rows: [
          ['<b>Poste de travail</b> (E0 suffit)', '03 Installation', 'Bonus : E1 (cluster) et accès réseau pour <code>oc-mirror</code>'],
          ['<b>E0</b> (OpenShift Local ou tout cluster)', '01 K8s vs OCP, 06 HBAC / RBAC (E0 ou E1)', '—'],
          ['<b>E1</b> (SNO)', '02 Architecture, 04 Configuration, 08 Stockage (LVMS ou StorageClass CSI), 05 Supervision (monitoring utilisateur, règle d\'alerte, receiver Alertmanager), 07 Réseau (Route, NetworkPolicy deny-all et ouverture), 09 Sécurité avancée (SCC dédiée, Compliance Operator ; lab fusible J3), 10 CI/CD & GitOps (E0 ou E1 + dépôt Git joignable : OpenShift GitOps, Application, dérive et selfHeal), 11 Backup & DR (sauvegarde etcd non destructive, export, lecture de l\'archive, installation d\'OADP), 12 Opérations jour 2 (état de mise à jour, must-gather, quotas, drain), 13 Virtualisation & Serverless (volet Serverless : service Knative, scale-to-zero, répartition de trafic)', 'Bonus : 02 MachineConfig <code>/etc/motd</code> (redémarre le SNO), 04 certificat Ingress (cluster jetable), bannière console et OLM v1, 05 PVC du monitoring, 07 EgressFirewall, MetalLB L2 (plage IP libre), UDN, EgressIP (E2 de préférence), NMState (cluster jetable), 05 LokiStack sur S3 (MinIO) et ClusterLogForwarder, sortie syslog, 08 provoquer une erreur de PVC, 09 lecture du scan, 10 app-of-apps, ClusterRole minimal pour Argo CD, ApplicationSet sur deux clusters (E2), 11 OADP avec bucket S3 (MinIO), restauration etcd (cluster JETABLE seulement), 12 mise à jour mineure réelle (E1 jetable ou E2), pause d\'un pool et ajout de nœud (E2), PSA warn/audit, chiffrement etcd (cluster jetable), File Integrity'],
          ['<b>E1</b> (lecture seule)', '14 Best practices (audit d\'un cluster avec la check-list, sans rien modifier)', 'Bonus : go / no-go sur un cluster fictif (sans cluster) ; revue des <code>Subscription</code> (E1, lecture seule)'],
          ['<b>E2</b> (compact)', 'Étapes bonus : EgressIP (07, de préférence multi-nœuds) ; 12 : pause d\'un pool et ajout de nœud ; aucun lab ne l\'exige pour son noyau', 'Selon le plan'],
          ['<b>E3</b> (bare metal)', '13 Virtualisation & Serverless : volet VM (installation d\'OpenShift Virtualization, VM, console et virtctl) en bonus E3', 'Migration à chaud : E3 multi-nœuds avec stockage RWX ; migration MTV : vCenter de test ; le noyau du module reste en E1 (Serverless)']
        ] },
        { t: 'callout', kind: 'warn', html: "Cette matrice reflète les labs <b>actuels</b> des modules rédigés et le <b>plan</b> pour les autres. Chaque lab annonce son niveau dans son <b>premier step</b> ; en cas de divergence, c'est le lab qui fait foi." }
      ]
    },
    {
      title: 'Options concrètes on-prem',
      blocks: [
        { t: 'table', head: ['Option', 'Pour qui', 'Permet', 'Ne permet pas / attention'], rows: [
          ['<b>OpenShift Local</b> (ex-CRC)', 'Poste personnel, E0', 'Cluster à un nœud, rapide à lancer', 'Pas de mise à jour ni de Machine API ; preset <code>openshift</code> : 4 cœurs physiques, 10,5 Go de RAM libre, 35 Go de disque'],
          ['<b>SNO sur KVM / vSphere</b>', 'Poste ou serveur de lab, E1', 'Presque tous les labs du cours', 'Installation à faire (module 03) ; ressources à prévoir'],
          ['<b>SNO / compact sur bare metal</b>', 'Si tu as du matériel, E1 à E3', 'Le plus proche de la production', 'Matériel et réseau à ta charge'],
          ['<b>Compact 3 nœuds</b> (VM)', 'Étapes bonus E2', 'Quorum, MHC, ODF', 'RAM et disque ×3'],
          ['<b>OKD</b>', 'Alternative communautaire', 'Même socle OCP sans support Red Hat', 'Écarts de comportement possibles (base OS : CentOS Stream CoreOS depuis OKD 4.16)'],
          ['<b>Developer Sandbox</b> ☁️', 'Découvrir la console', 'Console et <code>oc</code> en espace partagé', '<b>Pas de <code>cluster-admin</code></b> : inadapté à ce cours ; cluster partagé, quotas limités (≈ 3 cœurs / 14 Go / 40 Go, essai de 30 jours : chiffres datés, à recouper)']
        ] },
        { t: 'callout', kind: 'cloud', html: "Le Developer Sandbox ne donne pas <code>cluster-admin</code>. Les offres managées (ROSA, ARO, OSD) <b>restreignent</b> certaines actions (nœuds, MachineConfig, OAuth, etcd : détail à vérifier selon l\'offre) et sortent du périmètre on-prem de ce cours. Pour les labs, choisis un environnement <b>à toi</b>." }
      ]
    },
    {
      title: 'OpenShift Local : démarrer en quelques commandes',
      layout: 'two',
      blocks: [
        { t: 'code', lang: 'bash', file: 'terminal', code: "# Après téléchargement de crc et du pull secret (console.redhat.com)\n$ crc setup\n$ crc start -p pull-secret.txt\n\n# Accès en ligne de commande et console\n$ eval $(crc oc-env)\n$ crc console --credentials     # utilisateurs kubeadmin et developer\n$ crc console\n\n# Cycle de vie\n$ crc status\n$ crc stop\n$ crc delete                    # repart de zéro" },
        { t: 'bullets', items: [
          'Les commandes <code>crc setup</code> et <code>crc start</code> préparent l\'hyperviseur local puis lancent le cluster.',
          'Tu obtiens deux comptes : <code>kubeadmin</code> (<code>cluster-admin</code> temporaire) et <code>developer</code>.',
          'Le monitoring est désactivé par défaut (option d\'activation et ressources associées : à vérifier).'
        ] },
        { t: 'callout', kind: 'warn', wide: true, html: "Les ressources du preset <code>openshift</code> (4 cœurs physiques, 10,5 Go de RAM libre, 35 Go) sont celles de la documentation actuelle ; systèmes supportés et options de <code>crc config</code> : <b>à vérifier dans la documentation d'OpenShift Local</b> pour ta version." }
      ]
    },
    {
      title: 'SNO : le parcours rapide',
      blocks: [
        { t: 'flow', nodes: [
          { label: 'Pull secret', sub: 'console.redhat.com' },
          { label: 'DNS du lab', sub: 'api et *.apps' },
          { label: 'Machine / VM', sub: 'CPU, RAM, disque' },
          { label: 'Assisted ou Agent', sub: 'ISO de découverte', hl: true },
          { label: 'Cluster SNO', sub: 'oc get co' }
        ], caption: 'Le détail (<code>install-config.yaml</code>, <code>agent-config.yaml</code>, déroulé) est au <b>module 03</b> ; ici, ce qu\'il faut pour être prêt.' },
        { t: 'bullets', frag: true, items: [
          '<b>Assisted Installer</b> (console.redhat.com) : le plus rapide pour un premier SNO ; tu démarres la machine sur l\'ISO fournie et suis l\'installation dans l\'interface.',
          '<b>Agent-based</b> : même résultat, préparé en local (utile hors ligne), voir module 03.',
          'Un SNO <b>est</b> son propre control plane : un reboot interrompt tout, y compris l\'API (module 02).'
        ] },
        { t: 'callout', kind: 'onprem', html: "Sur KVM ou vSphere, une VM SNO bien dimensionnée est l'environnement le plus pratique : snapshots, clone et remise à zéro faciles (voir la slide sur la sauvegarde)." }
      ]
    },
    {
      title: 'Licence d\'essai et pull secret',
      layout: 'two',
      blocks: [
        { t: 'bullets', frag: true, items: [
          'Un <b>essai de 60 jours</b> (auto-support, compte Red Hat suffisant) est proposé via console.redhat.com ; conditions précises : à vérifier au moment de la souscription.',
          'Le <b>pull secret</b> (compte Red Hat) est requis pour installer et tirer les images de la plateforme : télécharge-le depuis la console.',
          'Pense à l\'<b>échéance</b> : passé l\'essai, le cluster continue de fonctionner mais n\'est plus sous souscription (conséquences : à vérifier).'
        ] },
        { t: 'callout', kind: 'trap', html: "Le pull secret est un <b>secret</b> : ne le <b>commit</b> jamais dans Git (même un dépôt privé), ne le colle pas dans un ticket. Garde-le <code>chmod 600</code> hors de ton dépôt de lab." },
        { t: 'callout', kind: 'tip', html: "Garde l'<b>identifiant de souscription</b> et la date de fin de l'essai quelque part : un cluster de lab oublié qui perd sa licence est un classique." }
      ]
    },
    {
      title: 'Dimensionner sa machine de lab',
      blocks: [
        { t: 'table', head: ['Environnement', 'vCPU', 'RAM', 'Disque'], rows: [
          ['SNO minimal (minimum officiel 4.20)', '8', '16 Go', '120 Go'],
          ['SNO <b>recommandé</b> pour tout le cours', '16', '48 à 64 Go', '≥ 200 Go (à ajuster)'],
          ['Compact 3 nœuds (minimum par control plane)', '3 × 4', '3 × 16 Go', '3 × 100 Go'],
          ['OpenShift Local (preset <code>openshift</code>)', '4 cœurs physiques', '10,5 Go de RAM libre', '35 Go']
        ] },
        { t: 'bullets', items: [
          'Les <b>minimums</b> ci-dessus sont des ordres de grandeur : vérifie la documentation de 4.20 pour ta version.',
          'Logging, virtualisation et ODF multiplient les besoins : prévois de la marge.',
          'Disque <b>rapide</b> (SSD/NVMe) : la latence d\'etcd fait la stabilité du cluster (module 08).'
        ] },
        { t: 'callout', kind: 'warn', html: "Un SNO sous-dimensionné ne plante pas franchement : il devient <b>lent et instable</b> (opérateurs Degraded, pods en attente), ce qui ressemble à un bug du cours alors que c'est un manque de ressources." }
      ]
    },
    {
      title: 'Réseau et DNS du lab',
      layout: 'two',
      blocks: [
        { t: 'bullets', items: [
          'Deux noms à résoudre : <code>api.&lt;cluster&gt;.&lt;domaine&gt;</code> et le wildcard <code>*.apps.&lt;cluster&gt;.&lt;domaine&gt;</code>, qui pointent vers l\'IP du nœud pour un SNO.',
          'Le DNS doit être résolu <b>depuis ton poste</b> et <b>depuis le cluster</b> ; un simple fichier <code>/etc/hosts</code> ne couvre pas le wildcard.',
          'Prévois l\'accès sortant vers Internet (ou un miroir) pour les images ; en déconnecté : module 03.'
        ] },
        { t: 'code', lang: 'bash', file: 'dnsmasq.conf (exemple de lab)', code: "# Domaine du lab : ocp4.lab.example.com, SNO sur 192.168.100.10\nhost-record=api.ocp4.lab.example.com,192.168.100.10\nhost-record=api-int.ocp4.lab.example.com,192.168.100.10\naddress=/apps.ocp4.lab.example.com/192.168.100.10   # wildcard *.apps" },
        { t: 'callout', kind: 'trap', wide: true, html: "Le wildcard <code>*.apps</code> oublié est la panne n°1 d'un lab : l'installation semble avancer puis la console reste injoignable (module 03). Teste avec <code>dig +short test.apps.&lt;cluster&gt;.&lt;domaine&gt;</code> avant de continuer." }
      ]
    },
    {
      title: 'Ton poste de travail : les outils',
      blocks: [
        { t: 'cmds', items: [
          ['oc version --client', 'Client OpenShift (inclut une copie de <code>kubectl</code>)'],
          ['openshift-install version', 'Programme d\'installation (module 03)'],
          ['oc-mirror version', 'Miroir d\'images pour les installations déconnectées (syntaxe et version : à vérifier)'],
          ['butane --version', 'MachineConfig en YAML lisible (module 04)'],
          ['jq --version', 'Lecture de JSON (pull secret, sorties <code>oc -o json</code>)'],
          ['podman --version', 'Conteneurs et authentification aux registres']
        ] },
        { t: 'bullets', items: [
          'Récupère <code>oc</code> et <code>openshift-install</code> depuis la console Red Hat ou le miroir officiel (à vérifier) ; prends une version <b>proche de 4.20</b> (la doc avertit qu\'un <code>oc</code> trop différent du cluster peut ne pas accéder à toutes ses fonctionnalités).',
          'Système : Linux (ou WSL) recommandé ; macOS possible pour <code>oc</code>.',
          'Ajoute aussi <code>openssl</code> pour les labs sur les certificats (module 04).'
        ] },
        { t: 'callout', kind: 'tip', html: "Note les <b>versions exactes</b> de tes outils au premier jour : un écart de version entre <code>oc</code>, <code>openshift-install</code> et le cluster est une source de comportements surprenants." }
      ]
    },
    {
      title: 'Santé du lab et accès administrateur',
      blocks: [
        { t: 'cmds', items: [
          ['oc login -u kubeadmin https://api.<cluster>:6443', 'Connexion avec <code>kubeadmin</code>, ou <code>KUBECONFIG</code> pointant sur le kubeconfig d\'installation ; <code>--web</code> suppose un fournisseur d\'identité (à vérifier selon ta version d\'<code>oc</code>)'],
          ['oc whoami --show-server', 'Vérifie le serveur visé'],
          ['oc get clusterversion', 'Version et Available=True'],
          ['oc get nodes', 'Tous les nœuds Ready'],
          ['oc get co', 'Cluster Operators : Available, pas Degraded'],
          ['oc whoami --show-console', 'URL de la console web']
        ] },
        { t: 'bullets', frag: true, items: [
          '<b>kubeadmin</b> : compte temporaire créé à l\'installation, <code>cluster-admin</code> ; son mot de passe est dans le dossier d\'installation (<code>auth/kubeadmin-password</code> avec <code>openshift-install</code> ; avec OpenShift Local : <code>crc console --credentials</code> ; avec Assisted Installer : affiché en fin d\'installation, à vérifier). À remplacer par un IdP au module 06 ; sur ton lab, garde-le tant que le module 06 n\'est pas fait.',
          '<b>Break-glass</b> : le <code>kubeconfig</code> de l\'installeur (<code>auth/kubeconfig</code>) donne un accès admin sans passer par OAuth : <b>garde-le</b> hors de ton dépôt.',
          'Un cluster sain, c\'est <b>tous les opérateurs Available</b> avant de commencer un lab.'
        ] },
        { t: 'callout', kind: 'warn', html: "Un opérateur <b>Degraded</b> avant le lab est un état à comprendre (<code>oc describe co NOM</code>), pas à ignorer : il fausserait les résultats des labs." }
      ]
    },
    {
      title: 'Sauvegarder et remettre à zéro',
      tag: 'filet de sécurité',
      blocks: [
        { t: 'table', head: ['Méthode', 'Avantage', 'Limite'], rows: [
          ['<b>Snapshot de VM</b> (SNO sur KVM / vSphere)', 'Retour arrière complet en quelques minutes', 'Après restauration, l\'horloge et les certificats peuvent poser problème (à vérifier)'],
          ['<b>Sauvegarde etcd</b>', 'Procédure officielle, scriptée', 'Ne sauvegarde pas tout (module 11)'],
          ['<b>Recréer le cluster</b>', 'Environnement propre garanti', 'Plusieurs dizaines de minutes à plusieurs heures'],
          ['<b><code>crc delete</code></b> puis <code>crc start</code> (OpenShift Local)', 'Remise à zéro rapide', 'Perd tout le contenu du lab']
        ] },
        { t: 'bullets', items: [
          'Fais un <b>snapshot juste après l\'installation saine</b> (« état propre ») et avant tout lab risqué (MachineConfig, certificats).',
          'Un cluster arrêté longtemps peut avoir des <b>certificats expirés</b> au redémarrage : à vérifier dans la doc ; c\'est l\'une des raisons de ne pas laisser un lab dormir des mois (module 12).'
        ] },
        { t: 'callout', kind: 'tip', html: "Avant un lab destructif (module 04 : certificat Ingress, module 11 : restauration etcd), <b>reviens</b> à ton snapshot « propre » plutôt que d'enchaîner les expériences sur un cluster fragilisé." }
      ]
    },
    {
      title: 'Erreurs classiques et temps à prévoir',
      tag: 'pièges',
      blocks: [
        { t: 'cards', items: [
          { front: 'Lab « cassé » dès le début', back: '<b>RAM ou CPU insuffisants</b> : opérateurs Degraded, pods Pending.' },
          { front: 'Console injoignable', back: '<b>DNS wildcard</b> <code>*.apps</code> manquant (module 03).' },
          { front: 'Je n\'ai pas cluster-admin', back: '<b>Sandbox</b> : pas de <code>cluster-admin</code>. Managé : actions restreintes (à vérifier selon l\'offre). Prends un environnement à toi.' },
          { front: 'Pull secret dans Git', back: 'Re-télécharge-le depuis la console Red Hat ; en cas de fuite, contacte le support Red Hat ; ne jamais le committer.' },
          { front: 'Lab dormant', back: 'Licence expirée ou <b>certificats</b> périmés : plan de maintenance.' },
          { front: 'Version décalée', back: '<code>oc</code> ou installeur d\'une autre version que le cluster : comportements surprenants.' }
        ] },
        { t: 'callout', kind: 'tip', html: "Temps à prévoir (ordres de grandeur, à ajuster à ta machine et ton débit) : outils et pull secret <b>≈ 30 min</b>, OpenShift Local <b>≈ 1 h</b> la première fois, SNO via Assisted Installer <b>≈ 1 h à 2 h</b>." }
      ]
    },
    {
      title: 'Quiz',
      tag: 'quiz',
      blocks: [
        { t: 'quiz', q: 'Quel est le niveau d\'environnement minimal pour le noyau du lab du module 04 (MachineConfig chrony avec reboot, Operator en approbation manuelle) ?', options: ['Le poste de travail seul, sans cluster (E0)', 'Un SNO (E1) avec <code>cluster-admin</code>', 'Un compact 3 nœuds (E2), obligatoirement', 'Un cluster bare metal pour la virtualisation (E3)'], answer: 1, explain: 'Un SNO (E1) permet le MachineConfig avec reboot et l\'installation d\'Operators. Le compact (E2) n\'est utile que pour des étapes bonus prévues au plan ; E3 ne concerne que la virtualisation (module 13).' },
        { t: 'quiz', q: 'Avant de commencer un lab, quel est le contrôle de santé de base du cluster ?', options: ['<code>oc get pods -A</code> et vérifier qu\'il y a des pods', 'Seulement ouvrir la console web', '<code>oc whoami</code>', '<code>oc get co</code> et <code>oc get nodes</code> : opérateurs Available et non Degraded, nœuds Ready'], answer: 3, explain: 'Les Cluster Operators résument la santé de la plateforme. Un opérateur Degraded avant le lab fausse ses résultats : comprends-le (<code>oc describe co NOM</code>) avant de continuer.' }
      ]
    },
    {
      title: 'Lab : prépare ton cluster',
      tag: 'lab',
      blocks: [
        { t: 'lab', title: 'Outils, pull secret, cluster de lab sain', goal: 'Lab de préparation en autonomie, avant le jour 1 (non compté dans le budget des séances). Noyau : E0 (poste de travail et, si possible, OpenShift Local ou un cluster existant).', steps: [
          'Prérequis : un poste Linux (ou WSL) ou macOS avec accès Internet et un compte Red Hat ; E0 suffit pour le noyau, E1 pour le bonus.',
          'Vérifie les ressources de ton poste (<code>nproc</code>, <code>free -h</code>, <code>df -h</code>) et compare-les aux besoins de l\'environnement choisi (slide « Dimensionner ») ; note ce qui manque.',
          'Installe les outils (<code>oc</code>, <code>openshift-install</code>, <code>oc-mirror</code>, <code>butane</code>, <code>jq</code>, <code>podman</code>, <code>openssl</code>) et relève leurs versions avec les commandes de la slide « Ton poste de travail ».',
          'Télécharge ton pull secret depuis la console Red Hat, mets-le en <code>chmod 600</code> hors de tout dépôt Git.',
          'Démarre un cluster de lab (OpenShift Local avec <code>crc setup</code> et <code>crc start</code>, ou connecte-toi au cluster que tu as déjà) puis exécute <code>oc whoami --show-server</code>, <code>oc get clusterversion</code>, <code>oc get nodes</code> et <code>oc get co</code>.',
          'Vérifie que tous les opérateurs sont <i>Available</i> et non <i>Degraded</i> ; si un opérateur est Degraded, lis <code>oc describe co NOM</code> et note la cause.',
          'Retrouve l\'URL de la console (<code>oc whoami --show-console</code>), connecte-toi en <code>kubeadmin</code> et repère le mot de passe ou le kubeconfig d\'installation à conserver.',
          '(bonus) Prépare un SNO (E1) : DNS <code>api</code> et <code>*.apps</code>, pull secret, VM ou machine dimensionnée ; l\'installation elle-même est au module 03.',
          '(bonus) Une fois le SNO sain, fais un snapshot « état propre » et note comment tu reviens à cet état.'
        ] }
      ]
    }
  ],
  takeaways: [
    'Quatre niveaux : E0 (poste ou OpenShift Local), E1 (SNO), E2 (compact), E3 (bare metal / virtualisation) ; un SNO bien dimensionné couvre presque tout le cours.',
    'Chaque lab annonce son niveau dans son premier step ; le Developer Sandbox n\'a pas <code>cluster-admin</code> et les offres managées restreignent des actions (à vérifier) : prends un environnement à toi.',
    'Préparer avant le jour 1 : outils, pull secret (jamais dans Git), DNS <code>api</code> et <code>*.apps</code>, ressources suffisantes.',
    'Un lab sain commence par <code>oc get co</code> : tous Available, pas Degraded.',
    'Snapshot « état propre », <code>kubeadmin</code> et kubeconfig d\'installation conservés : le filet de sécurité de ton lab.'
  ]
});
