export type Role = 'student' | 'teacher';

// Class codes are managed by the teacher and returned by the API. Keep this
// open-ended so new or renamed classes do not require a frontend release.
export type ClassCode = string;

export type Difficulty = 'facile' | 'moyen' | 'difficile';

export type ExerciseStatus = 'nouveau' | 'consulte' | 'en_cours' | 'termine';

export type PublicationStatus = 'publie' | 'brouillon' | 'depublie';

export type QuestionStatus = 'en_attente' | 'repondu' | 'resolu';

export type Chapter = {
  id: string;
  classCode: ClassCode;
  name: string;
  slug: string;
};

export type Exercise = {
  id: string;
  number: number;
  title: string;
  classCode: ClassCode;
  chapter: string;
  difficulty: Difficulty;
  status: ExerciseStatus;
  publicationStatus: PublicationStatus;
  viewCount: number;
  questionCount: number;
  publishedAt: string;
  createdAt?: string;
  tags: string[];
  artVariant: number;
  imageUrl?: string;
};

export type Comment = {
  id: string;
  exerciseId: string;
  author: string;
  isTeacher: boolean;
  isPinned: boolean;
  text: string;
  createdAt: string;
  replies: Comment[];
  resolved?: boolean;
};

export type QuestionThread = {
  id: string;
  exerciseId: string;
  exerciseTitle: string;
  author: string;
  question: string;
  createdAt: string;
  replyCount: number;
  status: QuestionStatus;
  locked: boolean;
};

export type Notification = {
  id: string;
  type: 'reply' | 'new_exercise' | 'new_reply' | 'moderation' | 'instruction' | 'meeting' | 'system';
  title: string;
  body: string;
  href?: string | null;
  exercise?: {
    title: string;
    chapter?: string | null;
    level?: string | null;
  };
  createdAt: string;
  read: boolean;
};

export type Student = {
  id: string;
  name: string;
  pseudonym: string;
  classCode: ClassCode;
  avatarColor: string;
};

export type Teacher = {
  id: string;
  name: string;
  title: string;
  avatarColor: string;
};

export type ModerationItem = {
  id: string;
  pseudonym: string;
  exerciseTitle: string;
  comment: string;
  createdAt: string;
  reason: string | null;
  priority: 'high' | 'medium' | 'low';
};

export type ActivityItem = {
  id: string;
  actor: string;
  action: string;
  target: string;
  createdAt: string;
  type: 'publish' | 'comment' | 'resolve' | 'register' | 'view';
};

export type KPI = {
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down' | 'flat';
};
