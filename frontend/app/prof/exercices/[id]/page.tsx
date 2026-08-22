'use client';

import ExerciseViewerPage from '@/app/eleve/exercices/[id]/page';

export default function TeacherExerciseViewerPage({ params }: { params: { id: string } }) {
  return <ExerciseViewerPage params={params} />;
}
