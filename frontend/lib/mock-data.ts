import type {
  ActivityItem,
  Chapter,
  ClassCode,
  Comment,
  Exercise,
  ModerationItem,
  Notification,
  QuestionThread,
  Student,
  Teacher,
} from './types';

export const classes: { code: ClassCode; label: string; description: string }[] =
  [
    { code: 'SM2', label: 'Sciences Mathématiques 2', description: 'Terminale SM' },
    { code: 'SM1', label: 'Sciences Mathématiques 1', description: '1ère SM' },
    { code: 'PC2', label: 'Physique-Chimie 2', description: 'Terminale PC' },
    { code: 'TC', label: 'Tronc Commun', description: 'Tronc commun scientifique' },
  ];

export const chapters: Chapter[] = [
  { id: 'ch-sm2-1', classCode: 'SM2', name: 'Limites et continuité', slug: 'limites-continuite' },
  { id: 'ch-sm2-2', classCode: 'SM2', name: 'Dérivation', slug: 'derivation' },
  { id: 'ch-sm2-3', classCode: 'SM2', name: 'Suites numériques', slug: 'suites' },
  { id: 'ch-sm2-4', classCode: 'SM2', name: 'Fonctions exponentielles', slug: 'exponentielles' },
  { id: 'ch-sm2-5', classCode: 'SM2', name: 'Équations différentielles', slug: 'equations-differentielles' },
  { id: 'ch-sm2-6', classCode: 'SM2', name: 'Probabilités', slug: 'probabilites' },
  { id: 'ch-sm1-1', classCode: 'SM1', name: 'Étude de fonctions', slug: 'etude-fonctions' },
  { id: 'ch-sm1-2', classCode: 'SM1', name: 'Suites et récurrence', slug: 'suites-recurrence' },
  { id: 'ch-sm1-3', classCode: 'SM1', name: 'Trigonométrie', slug: 'trigonometrie' },
  { id: 'ch-pc2-1', classCode: 'PC2', name: 'Limites et continuité', slug: 'limites-pc2' },
  { id: 'ch-pc2-2', classCode: 'PC2', name: 'Géométrie dans l\'espace', slug: 'geometrie-espace' },
  { id: 'ch-tc-1', classCode: 'TC', name: 'Généralités sur les fonctions', slug: 'generalites-fonctions' },
  { id: 'ch-tc-2', classCode: 'TC', name: 'Barycentre', slug: 'barycentre' },
];

export const student: Student = {
  id: 'stu-1',
  name: 'Youssef El Amrani',
  pseudonym: 'youssef_a',
  classCode: 'SM2',
  avatarColor: 'hsl(224 76% 28%)',
};

export const teacher: Teacher = {
  id: 'tea-1',
  name: 'Mme Benali',
  title: 'Professeure de mathématiques',
  avatarColor: 'hsl(173 58% 39%)',
};

export const students: Student[] = [
  student,
  { id: 'stu-2', name: 'Salma Tazi', pseudonym: 'salma_t', classCode: 'SM2', avatarColor: 'hsl(280 50% 50%)' },
  { id: 'stu-3', name: 'Mehdi Alaoui', pseudonym: 'mehdi_92', classCode: 'SM2', avatarColor: 'hsl(38 92% 45%)' },
  { id: 'stu-4', name: 'Imane Cherkaoui', pseudonym: 'imane_c', classCode: 'SM1', avatarColor: 'hsl(142 52% 38%)' },
  { id: 'stu-5', name: 'Omar Berrada', pseudonym: 'omar_b', classCode: 'PC2', avatarColor: 'hsl(0 72% 51%)' },
  { id: 'stu-6', name: 'Lina Saadi', pseudonym: 'lina_s', classCode: 'SM1', avatarColor: 'hsl(200 70% 45%)' },
];

export const exercises: Exercise[] = [
  {
    id: 'ex-1', number: 1, title: 'Étude d\'une fonction rationnelle', classCode: 'SM2',
    chapter: 'Limites et continuité', difficulty: 'moyen', status: 'en_cours',
    publicationStatus: 'publie', viewCount: 342, questionCount: 8,
    publishedAt: '2026-08-14', tags: ['limites', 'asymptotes', 'continuité'], artVariant: 1,
  },
  {
    id: 'ex-2', number: 2, title: 'Suites numériques et convergence', classCode: 'SM2',
    chapter: 'Suites numériques', difficulty: 'difficile', status: 'consulte',
    publicationStatus: 'publie', viewCount: 287, questionCount: 12,
    publishedAt: '2026-08-12', tags: ['récurrence', 'convergence', 'limites'], artVariant: 2,
  },
  {
    id: 'ex-3', number: 3, title: 'Dérivation et tableau de variations', classCode: 'SM2',
    chapter: 'Dérivation', difficulty: 'moyen', status: 'nouveau',
    publicationStatus: 'publie', viewCount: 156, questionCount: 4,
    publishedAt: '2026-08-18', tags: ['dérivée', 'variations', 'extrema'], artVariant: 3,
  },
  {
    id: 'ex-4', number: 4, title: 'Probabilités conditionnelles', classCode: 'SM2',
    chapter: 'Probabilités', difficulty: 'facile', status: 'consulte',
    publicationStatus: 'publie', viewCount: 401, questionCount: 6,
    publishedAt: '2026-08-10', tags: ['probabilités', 'Bayes', 'indépendance'], artVariant: 4,
  },
  {
    id: 'ex-5', number: 5, title: 'Résolution d\'une équation différentielle', classCode: 'SM2',
    chapter: 'Équations différentielles', difficulty: 'difficile', status: 'nouveau',
    publicationStatus: 'publie', viewCount: 98, questionCount: 2,
    publishedAt: '2026-08-19', tags: ['EDO', 'solution', 'primitive'], artVariant: 5,
  },
  {
    id: 'ex-6', number: 6, title: 'Géométrie dans l\'espace — Produit vectoriel', classCode: 'PC2',
    chapter: 'Géométrie dans l\'espace', difficulty: 'moyen', status: 'consulte',
    publicationStatus: 'publie', viewCount: 211, questionCount: 5,
    publishedAt: '2026-08-15', tags: ['vecteurs', 'produit vectoriel', 'plan'], artVariant: 6,
  },
  {
    id: 'ex-7', number: 7, title: 'Limites et continuité — Théorème des gendarmes', classCode: 'PC2',
    chapter: 'Limites et continuité', difficulty: 'moyen', status: 'termine',
    publicationStatus: 'publie', viewCount: 520, questionCount: 9,
    publishedAt: '2026-08-05', tags: ['théorème gendarmes', 'limites', 'encadrement'], artVariant: 7,
  },
  {
    id: 'ex-8', number: 8, title: 'Étude de fonctions — Fonction exponentielle', classCode: 'SM1',
    chapter: 'Étude de fonctions', difficulty: 'moyen', status: 'consulte',
    publicationStatus: 'publie', viewCount: 368, questionCount: 7,
    publishedAt: '2026-08-11', tags: ['exponentielle', 'limites', 'variations'], artVariant: 8,
  },
  {
    id: 'ex-9', number: 9, title: 'Trigonométrie — Équations trigonométriques', classCode: 'SM1',
    chapter: 'Trigonométrie', difficulty: 'difficile', status: 'nouveau',
    publicationStatus: 'publie', viewCount: 134, questionCount: 3,
    publishedAt: '2026-08-20', tags: ['cosinus', 'sinus', 'équations'], artVariant: 9,
  },
  {
    id: 'ex-10', number: 10, title: 'Suites et récurrence — Démonstration par récurrence', classCode: 'SM1',
    chapter: 'Suites et récurrence', difficulty: 'difficile', status: 'consulte',
    publicationStatus: 'publie', viewCount: 275, questionCount: 10,
    publishedAt: '2026-08-08', tags: ['récurrence', 'hérédité', 'initialisation'], artVariant: 10,
  },
  {
    id: 'ex-11', number: 11, title: 'Généralités sur les fonctions — Parité et périodicité', classCode: 'TC',
    chapter: 'Généralités sur les fonctions', difficulty: 'facile', status: 'consulte',
    publicationStatus: 'publie', viewCount: 489, questionCount: 4,
    publishedAt: '2026-08-09', tags: ['parité', 'période', 'domaine'], artVariant: 11,
  },
  {
    id: 'ex-12', number: 12, title: 'Barycentre — Centre de gravité et alignement', classCode: 'TC',
    chapter: 'Barycentre', difficulty: 'moyen', status: 'nouveau',
    publicationStatus: 'publie', viewCount: 76, questionCount: 1,
    publishedAt: '2026-08-21', tags: ['barycentre', 'vecteurs', 'alignement'], artVariant: 12,
  },
  {
    id: 'ex-13', number: 13, title: 'Fonctions exponentielles — Croissance et décroissance', classCode: 'SM2',
    chapter: 'Fonctions exponentielles', difficulty: 'moyen', status: 'nouveau',
    publicationStatus: 'brouillon', viewCount: 0, questionCount: 0,
    publishedAt: '2026-08-21', tags: ['exponentielle', 'croissance', 'modélisation'], artVariant: 13,
  },
  {
    id: 'ex-14', number: 14, title: 'Probabilités — Variables aléatoires', classCode: 'SM2',
    chapter: 'Probabilités', difficulty: 'difficile', status: 'nouveau',
    publicationStatus: 'depublie', viewCount: 0, questionCount: 0,
    publishedAt: '2026-08-16', tags: ['espérance', 'variance', 'loi'], artVariant: 14,
  },
];

export const commentsByExercise: Record<string, Comment[]> = {
  'ex-1': [
    {
      id: 'c-1', exerciseId: 'ex-1', author: 'Salma Tazi', isTeacher: false, isPinned: false,
      text: "Je ne comprends pas comment on trouve la limite en +∞ pour cette fonction rationnelle. Est-ce qu'on doit factoriser par le terme de plus haut degré ?",
      createdAt: '2026-08-15T09:24:00',
      replies: [
        {
          id: 'c-1-r1', exerciseId: 'ex-1', author: 'Mme Benali', isTeacher: true, isPinned: true,
          text: "Oui, exactement. Pour une fonction rationnelle, on factorise le numérateur et le dénominateur par le terme de plus haut degré, puis on simplifie. La limite se déduit ensuite directement. Voir l'exemple du cours page 23.",
          createdAt: '2026-08-15T11:02:00', replies: [],
        },
        {
          id: 'c-1-r2', exerciseId: 'ex-1', author: 'Mehdi Alaoui', isTeacher: false, isPinned: false,
          text: "Merci, j'avais le même problème. Du coup après factorisation on obtient 2/3 c'est bien ça ?",
          createdAt: '2026-08-15T13:15:00', replies: [],
        },
      ],
    },
    {
      id: 'c-2', exerciseId: 'ex-1', author: 'Imane Cherkaoui', isTeacher: false, isPinned: false,
      text: "Pour la question 3, est-ce que la fonction est continue sur tout le domaine de définition ? Je pense qu'il y a une discontinuité en x = 2.",
      createdAt: '2026-08-16T16:40:00',
      replies: [],
    },
  ],
  'ex-2': [
    {
      id: 'c-3', exerciseId: 'ex-2', author: 'Omar Berrada', isTeacher: false, isPinned: false,
      text: "Comment démontrer l'hérédité pour la suite u(n+1) = u(n)² + 1 ? J'ai l'initialisation mais je bloque sur l'hérédité.",
      createdAt: '2026-08-13T10:12:00',
      replies: [
        {
          id: 'c-3-r1', exerciseId: 'ex-2', author: 'Mme Benali', isTeacher: true, isPinned: true,
          text: "Pour l'hérédité, suppose u(n) ≥ 2 et montre que u(n+1) ≥ 2. Comme u(n+1) = u(n)² + 1 et u(n) ≥ 2, alors u(n)² ≥ 4, donc u(n+1) ≥ 5 ≥ 2. CQFD.",
          createdAt: '2026-08-13T14:30:00', replies: [],
        },
      ],
    },
  ],
};

export const questionThreads: QuestionThread[] = [
  {
    id: 'q-1', exerciseId: 'ex-1', exerciseTitle: 'Étude d\'une fonction rationnelle',
    author: 'Salma Tazi', question: "Comment trouver la limite en +∞ de la fonction f(x) = (2x²+3x)/(x²-1) ?",
    createdAt: '2026-08-15T09:24:00', replyCount: 2, status: 'resolu', locked: false,
  },
  {
    id: 'q-2', exerciseId: 'ex-2', exerciseTitle: 'Suites numériques et convergence',
    author: 'Omar Berrada', question: "Démonstration par récurrence — je bloque sur l'hérédité de la suite.",
    createdAt: '2026-08-13T10:12:00', replyCount: 1, status: 'repondu', locked: false,
  },
  {
    id: 'q-3', exerciseId: 'ex-5', exerciseTitle: 'Résolution d\'une équation différentielle',
    author: 'youssef_a', question: "Quelle est la solution générale de y' = 2y + 3 ?",
    createdAt: '2026-08-20T18:05:00', replyCount: 0, status: 'en_attente', locked: false,
  },
  {
    id: 'q-4', exerciseId: 'ex-9', exerciseTitle: 'Trigonométrie — Équations trigonométriques',
    author: 'Imane Cherkaoui', question: "Comment résoudre cos(2x) = 1/2 sur [0, 2π] ?",
    createdAt: '2026-08-20T15:30:00', replyCount: 0, status: 'en_attente', locked: false,
  },
  {
    id: 'q-5', exerciseId: 'ex-4', exerciseTitle: 'Probabilités conditionnelles',
    author: 'Mehdi Alaoui', question: "Quand est-ce qu'on utilise la formule de Bayes dans cet exercice ?",
    createdAt: '2026-08-11T14:00:00', replyCount: 3, status: 'resolu', locked: true,
  },
  {
    id: 'q-6', exerciseId: 'ex-7', exerciseTitle: 'Limites et continuité — Théorème des gendarmes',
    author: 'Lina Saadi', question: "Pourquoi le théorème des gendarmes ne s'applique-t-il pas en 0 ici ?",
    createdAt: '2026-08-08T11:20:00', replyCount: 2, status: 'repondu', locked: false,
  },
];

export const notifications: Notification[] = [
  {
    id: 'n-1', type: 'reply', title: 'Mme Benali a répondu à votre question',
    body: 'Sur l\'exercice « Étude d\'une fonction rationnelle »',
    createdAt: '2026-08-20T11:02:00', read: false,
  },
  {
    id: 'n-2', type: 'new_reply', title: 'Une nouvelle réponse a été ajoutée',
    body: 'Mehdi Alaoui a répondu dans la discussion « Suites numériques »',
    createdAt: '2026-08-19T13:15:00', read: false,
  },
  {
    id: 'n-3', type: 'new_exercise', title: 'Un nouvel exercice a été publié dans SM2',
    body: '« Résolution d\'une équation différentielle »',
    createdAt: '2026-08-19T08:00:00', read: true,
  },
  {
    id: 'n-4', type: 'new_exercise', title: 'Un nouvel exercice a été publié dans SM2',
    body: '« Dérivation et tableau de variations »',
    createdAt: '2026-08-18T08:00:00', read: true,
  },
  {
    id: 'n-5', type: 'system', title: 'Bienvenue sur WahaMath',
    body: 'Votre compte a été créé. Bon courage pour cette année !',
    createdAt: '2026-08-01T09:00:00', read: true,
  },
];

export const moderationItems: ModerationItem[] = [
  {
    id: 'm-1', pseudonym: 'anonyme_42', exerciseTitle: 'Étude d\'une fonction rationnelle',
    comment: "Cette fonction n'a aucun sens, le prof devrait revoir son cours...",
    createdAt: '2026-08-20T22:14:00', reason: 'Langage irrespectueux', priority: 'high',
  },
  {
    id: 'm-2', pseudonym: 'x_math_x', exerciseTitle: 'Suites numériques et convergence',
    comment: "Quelqu'un peut juste me donner la réponse finale svp, j'ai pas le temps de chercher.",
    createdAt: '2026-08-20T19:30:00', reason: 'Demande de solution directe', priority: 'medium',
  },
  {
    id: 'm-3', pseudonym: 'student_99', exerciseTitle: 'Probabilités conditionnelles',
    comment: "Je trouve que cet exercice est trop facile par rapport au contrôle.",
    createdAt: '2026-08-19T16:45:00', reason: null, priority: 'low',
  },
  {
    id: 'm-4', pseudonym: 'pseudo_new', exerciseTitle: 'Trigonométrie — Équations trigonométriques',
    comment: "On peut échanger les réponses du devoir sur WhatsApp ?",
    createdAt: '2026-08-19T14:02:00', reason: 'Triche / partage de solutions', priority: 'high',
  },
];

export const teacherActivity: ActivityItem[] = [
  { id: 'a-1', actor: 'Mme Benali', action: 'a publié l\'exercice', target: 'Résolution d\'une équation différentielle', createdAt: '2026-08-19T08:00:00', type: 'publish' },
  { id: 'a-2', actor: 'Mme Benali', action: 'a répondu à une question sur', target: 'Étude d\'une fonction rationnelle', createdAt: '2026-08-15T11:02:00', type: 'comment' },
  { id: 'a-3', actor: 'Salma Tazi', action: 'a posé une question sur', target: 'Étude d\'une fonction rationnelle', createdAt: '2026-08-15T09:24:00', type: 'comment' },
  { id: 'a-4', actor: 'Mme Benali', action: 'a marqué comme résolu', target: 'Probabilités conditionnelles', createdAt: '2026-08-11T17:00:00', type: 'resolve' },
  { id: 'a-5', actor: 'Lina Saadi', action: 's\'est inscrite dans', target: 'SM1', createdAt: '2026-08-09T10:00:00', type: 'register' },
  { id: 'a-6', actor: 'Mehdi Alaoui', action: 'a consulté', target: 'Dérivation et tableau de variations', createdAt: '2026-08-18T14:20:00', type: 'view' },
];

export const weeklyActivity = [
  { day: 'Lun', questions: 8, exercises: 3, views: 42 },
  { day: 'Mar', questions: 12, exercises: 2, views: 55 },
  { day: 'Mer', questions: 6, exercises: 4, views: 38 },
  { day: 'Jeu', questions: 15, exercises: 5, views: 67 },
  { day: 'Ven', questions: 10, exercises: 2, views: 49 },
  { day: 'Sam', questions: 4, exercises: 1, views: 22 },
  { day: 'Dim', questions: 2, exercises: 0, views: 15 },
];

export function getExerciseById(id: string): Exercise | undefined {
  return exercises.find((e) => e.id === id);
}

export function getCommentsForExercise(exerciseId: string): Comment[] {
  return commentsByExercise[exerciseId] ?? [];
}
