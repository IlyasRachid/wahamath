from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.supabase import (
    create_exercise,
    create_comment,
    delete_student,
    decide_student_application,
    dismiss_report,
    delete_exercise,
    get_exercise,
    get_exercise_comments,
    get_profile,
    get_student_details,
    list_exercises,
    list_classes,
    list_pending_students,
    list_questions,
    list_notifications,
    mark_notifications_read,
    list_reports,
    manage_student,
    moderate_comment,
    report_comment,
    update_exercise,
    update_exercise_publication,
    update_profile,
)

settings = get_settings()

app = FastAPI(
    title='WahaMath API',
    version='0.1.0',
    description='Server-side endpoints for WahaMath. AI chat is intentionally out of scope.',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allow_headers=['Authorization', 'Content-Type'],
)


@app.get('/health', tags=['system'])
def health_check() -> dict[str, str]:
    """Public readiness check used by local development and deployment."""
    return {'status': 'ok', 'service': 'wahamath-api'}


app.post('/api/exercises', status_code=201, tags=['exercises'])(create_exercise)
app.get('/api/exercises', tags=['exercises'])(list_exercises)
app.get('/api/classes', tags=['classes'])(list_classes)
app.get('/api/profile', tags=['profile'])(get_profile)
app.patch('/api/profile', tags=['profile'])(update_profile)
app.get('/api/exercises/{exercise_id}', tags=['exercises'])(get_exercise)
app.put('/api/exercises/{exercise_id}', tags=['exercises'])(update_exercise)
app.patch('/api/exercises/{exercise_id}/publication', tags=['exercises'])(update_exercise_publication)
app.delete('/api/exercises/{exercise_id}', tags=['exercises'])(delete_exercise)
app.get('/api/exercises/{exercise_id}/comments', tags=['comments'])(get_exercise_comments)
app.post('/api/exercises/{exercise_id}/comments', status_code=201, tags=['comments'])(create_comment)
app.get('/api/questions', tags=['comments'])(list_questions)
app.get('/api/notifications', tags=['notifications'])(list_notifications)
app.post('/api/notifications/read', tags=['notifications'])(mark_notifications_read)
app.post('/api/notifications/{notification_id}/read', tags=['notifications'])(mark_notifications_read)
app.post('/api/comments/{comment_id}/moderate', tags=['moderation'])(moderate_comment)
app.post('/api/comments/{comment_id}/report', tags=['moderation'])(report_comment)
app.get('/api/moderation/reports', tags=['moderation'])(list_reports)
app.post('/api/moderation/reports/{report_id}/dismiss', tags=['moderation'])(dismiss_report)
app.get('/api/admin/students/pending', tags=['administration'])(list_pending_students)
app.post('/api/admin/students/{profile_id}/decision', tags=['administration'])(decide_student_application)
app.get('/api/admin/students/{profile_id}', tags=['administration'])(get_student_details)
app.delete('/api/admin/students/{profile_id}', tags=['administration'])(delete_student)
app.patch('/api/admin/students/{profile_id}', tags=['administration'])(manage_student)
