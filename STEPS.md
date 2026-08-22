# WahaMath — guide de reprise Codex

Ce fichier explique à une nouvelle session Codex comment reprendre le développement du projet sans casser les flux déjà fonctionnels.

## 1. Lire le projet avant toute modification

- Le dépôt de travail est `wahamath/`.
- Le frontend Next.js est dans `frontend/`.
- L'API FastAPI est dans `backend/`.
- Les migrations et le contenu de base Supabase sont dans `database/`.
- Les images sources d'exercices sont dans `exercises-pages/`.
- L'application ne doit **pas** inclure de chat ou fonctionnalité IA.
- Ne jamais mettre de vraies clés, mots de passe ou jetons dans `.env.example`, dans le code ou dans un message de commit.

Avant de modifier un flux, chercher d'abord les composants et routes concernés avec `rg`.

## 2. Lancer l'application localement

Dans un premier terminal, lancer le backend :

```bash
cd ~/Documents/projects/wahamath/backend
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Vérifier ensuite :

```bash
curl http://127.0.0.1:8000/health
```

La réponse attendue est :

```json
{"status":"ok","service":"wahamath-api"}
```

Dans un second terminal, lancer le frontend :

```bash
cd ~/Documents/projects/wahamath/frontend
npm run dev
```

Le frontend utilise normalement `http://localhost:3000` et le backend `http://localhost:8000`.

Si un port est déjà occupé, identifier le processus existant avant de lancer une seconde instance. Après toute modification de route FastAPI, redémarrer le backend si `--reload` ne l'a pas fait correctement.

## 3. Configuration Supabase

Les fichiers locaux requis sont :

- `frontend/.env.local`
- `backend/.env.local`

Le frontend utilise les variables publiques Supabase et `NEXT_PUBLIC_API_URL`.

Le backend a besoin de l'URL Supabase et de la clé `service_role`. Cette clé reste strictement côté serveur. `backend/app/config.py` normalise également une URL terminant par `/rest/v1/`, mais il faut préférer l'URL racine du projet Supabase.

Les migrations doivent être appliquées dans l'éditeur SQL Supabase, dans cet ordre :

1. `database/migrations/20260821_initial_schema.sql`
2. `database/migrations/20260821_pending_enrollment.sql`
3. `database/migrations/20260822_notifications.sql`
4. `database/migrations/20260822_student_contact_and_administration.sql`
5. `database/migrations/20260822_require_phone_for_new_students.sql`
6. `database/migrations/20260822_fix_phone_number_constraint.sql`

Dans Supabase → Authentication → URL Configuration, autoriser `http://localhost:3000/reinitialiser-mot-de-passe` et l’URL équivalente du domaine de production.

Ne pas recréer des comptes de test ni modifier des données Supabase sans demande explicite de l'utilisateur.

## 4. Règles métier déjà implémentées

### Authentification et rôles

- La page d'accueil n'accorde aucun accès : ses boutons vont vers `/connexion?role=student` ou `/connexion?role=teacher`.
- Les layouts `/eleve` et `/prof` vérifient la session Supabase, le rôle et le statut du profil.
- Seuls les profils `active` peuvent accéder à l'application.
- Le professeur est le rôle `teacher`; les élèves utilisent `student`.
- Les nouveaux élèves sont `pending` puis doivent être acceptés par le professeur.

### Inscriptions et classes

- L'inscription élève fournit une classe demandée.
- Le professeur traite les demandes dans `/prof/inscriptions`.
- L'acceptation crée l'adhésion dans `class_memberships`.
- L'accès élève aux exercices est imposé par le backend à partir de cette adhésion, jamais seulement par un filtre frontend.

### Exercices

- Le dépôt d'exercice se fait via `/prof/ajouter` et envoie l'image au backend.
- Les images sont stockées dans le bucket Supabase `exercise-images`; l'API génère des URLs signées.
- L'élève ne voit que les exercices `publie` de sa classe.
- La page élève ne doit pas refaire un filtrage de publication ou de classe : l'API renvoie déjà exactement le catalogue autorisé. Ses filtres locaux doivent repartir sur `all` après le chargement.
- Le résultat filtré de `frontend/app/eleve/exercices/page.tsx` dépend impérativement de `exercises` dans son `useMemo`; sans cela, il reste vide après le chargement initial jusqu'à ce que l'utilisateur touche un filtre.
- Le professeur voit tous les exercices, y compris `brouillon` et `depublie`.
- Dans `/prof/exercices`, le professeur peut filtrer, publier, dépublier et supprimer un exercice.
- La suppression efface l'enregistrement, les commentaires liés (cascade SQL) et tente de retirer l'image du stockage. Elle doit toujours rester confirmée dans l'interface.

Routes API correspondantes :

```text
GET    /api/exercises
GET    /api/exercises/{id}
POST   /api/exercises
PATCH  /api/exercises/{id}/publication
DELETE /api/exercises/{id}
```

### Classes

- `/api/classes` est la source de données des pages de classes.
- Pour un élève, elle ne renvoie que les classes présentes dans `class_memberships`, leurs chapitres et le nombre d’exercices publiés.
- Pour le professeur, elle renvoie les quatre classes, leurs chapitres, leurs exercices, leurs effectifs et les noms des élèves inscrits.
- Les liens depuis les cartes de classes utilisent `?chapter=` pour l’élève et `?classe=` pour le professeur; les pages d’exercices doivent lire ces paramètres et initialiser le filtre correspondant.

### Commentaires et modération

- Élèves et professeur consultent le même exercice et les mêmes commentaires visibles.
- Un commentaire signalé crée ou rouvre un `comment_report` non traité.
- La page `/prof/moderation` ne montre que les rapports non traités.
- Masquer un commentaire le rend invisible pour les deux rôles, masque récursivement toutes ses réponses et clôt les rapports associés à toute la discussion.
- Ignorer un rapport le clôt sans masquer le commentaire.
- Le badge de modération dans la navigation professeur doit toujours provenir de la vraie liste de rapports non traités, jamais d'une valeur mockée.

### Questions

- Une question est le commentaire racine d'une discussion d'exercice; aucune table de questions séparée n'est utilisée.
- `/api/questions` retourne les discussions accessibles : uniquement celles créées par l'élève connecté pour un élève, toutes les discussions pour le professeur.
- Le professeur répond via la route de commentaire existante, puis peut marquer le commentaire racine comme résolu.
- Le badge « Questions » représente les questions non résolues sans réponse et doit rester issu de cette route.

### Tableaux de bord

- Les tableaux de bord élève et professeur ne doivent contenir aucun chiffre mocké.
- Ils agrègent les routes existantes `/api/classes`, `/api/exercises`, `/api/questions` et, pour le professeur, `/api/moderation/reports`.
- Ne pas afficher d'historique ou de progression inventée tant qu'une table d'activité/progression réelle n'existe pas.

### Activité professeur

- `/prof/activite` dérive son historique des exercices publiés et des questions réellement créées. Le graphique hebdomadaire représente uniquement les questions, car les vues et une journalisation d'activité détaillée ne sont pas encore stockées.


### Paramètres et récupération de compte

- `/api/profile` lit et met à jour uniquement le nom affiché du compte connecté; les rôles et statuts ne sont jamais modifiables depuis cette route.
- Les pages Paramètres élève et professeur utilisent `supabase.auth.updateUser` pour changer le mot de passe d’une session connectée.
- `/mot-de-passe-oublie` envoie un lien avec `supabase.auth.resetPasswordForEmail`; `/reinitialiser-mot-de-passe` échange le lien de récupération, valide le nouveau mot de passe, puis déconnecte la session avant de revenir à la connexion.

### Notifications

- La table `notifications` est créée par `20260822_notifications.sql`.
- Les élèves reçoivent une notification quand un exercice est publié pour leur classe, y compris lors de la publication ultérieure d'un brouillon, et quand un professeur répond à leur discussion.
- La page `/eleve/notifications` charge la vraie liste et peut marquer une notification ou toutes les notifications comme lues.

## 5. Organisation technique importante

### Frontend

- `frontend/lib/supabase/client.ts` : client Supabase navigateur.
- `frontend/lib/api-cache.ts` : cache client pour les GET coûteux. Chaque entrée porte des tags métier (`exercises`, `classes`, `questions`, etc.); utiliser `cachedApiGet` avec ses tags et invalider uniquement les tags concernés après une mutation. Les requêtes simultanées vers une même URL sont dédupliquées. Le cache est conservé dans `sessionStorage` pour survivre à un rechargement dans le même onglet, isolé par utilisateur, puis vidé à la déconnexion.
- `frontend/components/shared/app-shell.tsx` : navigation, badges réels et préchargement après authentification. Le tableau de bord est chargé en priorité; les données des autres onglets accessibles au rôle sont ensuite mises en cache.
- `frontend/app/prof/parametres/page.tsx` et `frontend/app/eleve/parametres/page.tsx` : pages Paramètres des deux rôles. Elles permettent de changer le nom affiché et le mot de passe Supabase avec retours Sonner; les liens Paramètres sont dans la partie basse de chaque navigation.
- `frontend/app/prof/classes/page.tsx` et `frontend/components/shared/teacher-student-roster.tsx` : le professeur voit le registre complet des élèves actifs, regroupé par classe et filtrable par classe. La source est `/api/classes`, qui inclut déjà les membres approuvés pour le rôle professeur; ne pas dupliquer cette requête avec une nouvelle liste simulée.
- `database/migrations/20260822_student_contact_and_administration.sql` : ajoute `profiles.phone_number` et met à jour le trigger d’inscription pour stocker le téléphone fourni dans les métadonnées Auth. À appliquer dans Supabase avant de tester une nouvelle inscription. La fiche élève appelle `GET /api/admin/students/{id}` (e-mail depuis Supabase Auth, téléphone et classes depuis la base) uniquement après clic du professeur. `DELETE /api/admin/students/{id}` est réservé au professeur et supprime définitivement le compte Auth étudiant, avec les cascades de la base; l’interface impose une seconde confirmation.
- `database/migrations/20260822_require_phone_for_new_students.sql` : rend le téléphone obligatoire aussi dans le trigger SQL (pas seulement dans le formulaire). L’appliquer après la migration de contact; les comptes Auth créés manuellement doivent alors inclure `phone_number` dans leurs métadonnées ou être créés avec un numéro valide.
- La fiche élève professeur permet aussi de changer la classe, suspendre ou réactiver le compte. Ces opérations passent par `PATCH /api/admin/students/{id}` et exigent le rôle professeur côté API. Une suspension conserve le compte et la classe mais bloque l’accès; seule la suppression appelle Supabase Auth et efface les données de façon définitive.
- `frontend/app/prof/exercices/[id]/modifier/page.tsx` et `PUT /api/exercises/{exercise_id}` fournissent l’édition complète d’un exercice : titre, description, classe, chapitre, difficulté, tags, statut et remplacement optionnel de l’image. Lors d’un remplacement, la nouvelle image est téléversée avant la mise à jour; elle est supprimée si la base échoue, et l’ancienne image n’est supprimée qu’après succès. Le frontend invalide `exercises`, `classes` et `notifications` après l’enregistrement.
- `frontend/app/eleve/exercices/page.tsx` : liste élève; ne pas réintroduire de filtre « Toutes les classes ».
- `frontend/app/prof/exercices/page.tsx` : catalogue et cycle de publication professeur.
- `frontend/app/eleve/exercices/[id]/page.tsx` : lecteur d'exercice et commentaires réels. La route professeur réutilise ce lecteur.
- Les composants UI sont sous `frontend/components/ui/` et les notifications visibles utilisent Sonner, monté dans le layout racine.

### Backend

- `backend/app/main.py` enregistre toutes les routes FastAPI.
- `backend/app/supabase.py` centralise l'authentification serveur, les appels REST/Storage Supabase et les règles d'autorisation.
- `require_active_user` valide le jeton Supabase et charge le profil.
- `require_teacher` doit protéger toute action réservée au professeur.
- `accessible_exercises` est le point essentiel pour les règles de visibilité : professeur = catalogue complet; élève = classe(s) membre(s) et exercices publiés.
- `list_questions` applique la même séparation professeur/élève sans générer d'URL d'image, car la liste de questions n'en a pas besoin.

## 6. Méthode obligatoire pour la prochaine fonctionnalité

Traiter chaque fonctionnalité comme une tranche verticale complète avant de dire qu'elle est terminée :

1. Définir clairement qui peut faire l'action et qui peut voir le résultat.
2. Ajouter ou adapter la migration Supabase si le modèle de données doit changer.
3. Implémenter la règle d'autorisation et la route FastAPI.
4. Brancher l'interface sur la vraie route, avec chargement, erreurs et succès visibles.
5. Mettre à jour toute autre page qui doit refléter le changement (badges, listes, lecteur, modération, etc.).
6. Vérifier le flux des deux rôles lorsque cela s'applique : professeur puis élève.
7. Lancer au minimum :

```bash
cd ~/Documents/projects/wahamath/frontend
npm run typecheck

cd ~/Documents/projects/wahamath
backend/.venv/bin/python -m py_compile backend/app/supabase.py backend/app/main.py
```

8. Informer l'utilisateur seulement lorsque le flux entier est câblé; signaler les commandes de redémarrage nécessaires.

Ne pas annoncer une fonctionnalité comme terminée après avoir uniquement créé le composant, le bouton ou la route API.

## 7. Priorités possibles après le cycle actuel

Les zones encore largement mockées comprennent les tableaux de bord, questions, notifications, activités et certaines pages de classes. Choisir une seule fonctionnalité utilisateur importante, puis l'implémenter selon la méthode verticale ci-dessus.

Les URLs signées des images d'exercice sont mises en cache en mémoire côté API pendant 9 minutes et les signatures manquantes sont générées en parallèle. Dès qu'une session est autorisée, le shell précharge les données du tableau de bord (classes, exercices, questions et signalements professeur), puis les données secondaires du rôle (notifications élève, inscriptions et profil professeur). Il précharge aussi l’énoncé et les commentaires des cinq premiers exercices seulement; la liste élève est paginée par groupes de cinq et les exercices suivants restent à la demande. Les lectures des pages Exercices, Classes, Questions, Notifications, tableaux de bord, Activité, Inscriptions, Paramètres et lecteur d'exercice utilisent le cache client taggé. Les données détaillées d’un exercice et ses commentaires sont revalidés après 30 secondes : au retour sur leur page si le cache est expiré, puis toutes les 30 secondes lorsque le lecteur est visible. Toute mutation doit invalider les tags métier concernés. Les badges Questions, Modération et Notifications utilisent un polling de 30 secondes, suspendu lorsque l'onglet est masqué. Avant toute optimisation supplémentaire, mesurer les requêtes de navigation restantes; ne pas optimiser au hasard.
