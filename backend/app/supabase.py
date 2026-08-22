import uuid
import asyncio
import time
from datetime import datetime, timezone

import httpx
from fastapi import Body, Depends, File, Form, Header, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.config import Settings, get_settings

ALLOWED_IMAGE_TYPES = {'image/png', 'image/jpeg', 'image/webp'}
MAX_IMAGE_BYTES = 10 * 1024 * 1024
SIGNED_IMAGE_CACHE_TTL_SECONDS = 540
signed_image_cache: dict[str, tuple[str, float]] = {}


class CommentPayload(BaseModel):
    body: str
    parent_id: str | None = None


class ModerationPayload(BaseModel):
    action: str

class ReportPayload(BaseModel):
    reason: str = 'Signalé par un élève'


class PublicationPayload(BaseModel):
    publication_status: str


class ProfilePayload(BaseModel):
    display_name: str


class StudentManagementPayload(BaseModel):
    action: str
    class_id: str | None = None


async def create_notifications(client: httpx.AsyncClient, headers: dict[str, str], recipient_ids: list[str], notification_type: str, title: str, body: str, href: str) -> None:
    if not recipient_ids:
        return
    await client.post('/rest/v1/notifications', headers=headers, json=[{
        'recipient_id': recipient_id, 'type': notification_type, 'title': title, 'body': body, 'href': href,
    } for recipient_id in recipient_ids])


def server_settings() -> Settings:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='L’API n’est pas encore configurée avec Supabase.',
        )
    return settings


async def require_active_user(
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(server_settings),
) -> dict[str, str]:
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Authentification requise.')

    user_token = authorization.removeprefix('Bearer ').strip()
    headers = {'apikey': settings.supabase_service_role_key, 'Authorization': f'Bearer {user_token}'}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=15) as client:
        user_response = await client.get('/auth/v1/user', headers=headers)
        if user_response.is_error:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Session invalide ou expirée.')
        user_id = user_response.json().get('id')
        profile_response = await client.get(
            '/rest/v1/profiles',
            params={'id': f'eq.{user_id}', 'select': 'id,display_name,role,status'},
            headers={
                'apikey': settings.supabase_service_role_key,
                'Authorization': f'Bearer {settings.supabase_service_role_key}',
            },
        )
        profile = profile_response.json()[0] if profile_response.is_success and profile_response.json() else None

    if not profile or profile['status'] != 'active':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Compte non autorisé.')
    return profile


async def require_teacher(
    profile: dict[str, str] = Depends(require_active_user),
) -> dict[str, str]:
    if profile['role'] != 'teacher':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Accès réservé au professeur administrateur.')
    return profile


async def get_profile(profile: dict[str, str] = Depends(require_active_user)) -> dict[str, str]:
    return profile


async def update_profile(
    payload: ProfilePayload,
    profile: dict[str, str] = Depends(require_active_user),
    settings: Settings = Depends(server_settings),
) -> dict:
    name = payload.display_name.strip()
    if not 2 <= len(name) <= 50:
        raise HTTPException(status_code=400, detail='Le nom doit contenir entre 2 et 50 caractères.')
    headers = {'apikey': settings.supabase_service_role_key, 'Authorization': f'Bearer {settings.supabase_service_role_key}', 'Prefer': 'return=representation'}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        response = await client.patch('/rest/v1/profiles', params={'id': f"eq.{profile['id']}"}, headers=headers, json={'display_name': name})
    if response.is_error or not response.json():
        raise HTTPException(status_code=502, detail='Impossible de mettre à jour le profil.')
    return response.json()[0]


async def accessible_exercises(
    profile: dict[str, str],
    settings: Settings,
    exercise_id: str | None = None,
) -> list[dict]:
    service_headers = {
        'apikey': settings.supabase_service_role_key,
        'Authorization': f'Bearer {settings.supabase_service_role_key}',
    }
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=30) as client:
        class_ids: list[str] | None = None
        if profile['role'] != 'teacher':
            memberships = await client.get(
                '/rest/v1/class_memberships',
                params={'profile_id': f"eq.{profile['id']}", 'select': 'class_id'},
                headers=service_headers,
            )
            class_ids = [membership['class_id'] for membership in memberships.json()] if memberships.is_success else []
            if not class_ids:
                return []

        params = {
            'select': 'id,title,description,difficulty,tags,published_at,publication_status,image_path,classes(code),chapters(title)',
            'order': 'published_at.desc',
        }
        # Teachers manage the complete catalogue. Students are deliberately
        # limited to published exercises belonging to one of their memberships.
        if profile['role'] != 'teacher':
            params['publication_status'] = 'eq.publie'
        if exercise_id:
            params['id'] = f'eq.{exercise_id}'
        if class_ids is not None:
            params['class_id'] = f"in.({','.join(class_ids)})"
        response = await client.get('/rest/v1/exercises', params=params, headers=service_headers)
        if response.is_error:
            raise HTTPException(status_code=502, detail='Impossible de charger les exercices.')
        exercises = response.json()

        now = time.monotonic()
        missing_paths = list({exercise['image_path'] for exercise in exercises if exercise['image_path'] not in signed_image_cache or signed_image_cache[exercise['image_path']][1] <= now})

        async def sign_path(path: str) -> tuple[str, str]:
            signed = await client.post(
                f'/storage/v1/object/sign/exercise-images/{path}',
                json={'expiresIn': 600},
                headers=service_headers,
            )
            if signed.is_error:
                raise HTTPException(status_code=502, detail='Impossible de préparer l’image de l’exercice.')
            return path, f"{settings.supabase_url}/storage/v1{signed.json()['signedURL']}"

        if missing_paths:
            for path, url in await asyncio.gather(*(sign_path(path) for path in missing_paths)):
                signed_image_cache[path] = (url, now + SIGNED_IMAGE_CACHE_TTL_SECONDS)
        for exercise in exercises:
            exercise['image_url'] = signed_image_cache[exercise['image_path']][0]
    return exercises


async def list_exercises(
    profile: dict[str, str] = Depends(require_active_user),
    settings: Settings = Depends(server_settings),
) -> dict[str, list[dict]]:
    return {'items': await accessible_exercises(profile, settings)}


async def list_classes(
    profile: dict[str, str] = Depends(require_active_user),
    settings: Settings = Depends(server_settings),
) -> dict[str, list[dict]]:
    """Return class content appropriate to the connected role."""
    headers = {
        'apikey': settings.supabase_service_role_key,
        'Authorization': f'Bearer {settings.supabase_service_role_key}',
    }
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=30) as client:
        class_params = {'select': 'id,code,name,academic_year', 'order': 'code.asc'}
        if profile['role'] != 'teacher':
            memberships = await client.get(
                '/rest/v1/class_memberships',
                params={'profile_id': f"eq.{profile['id']}", 'select': 'class_id'},
                headers=headers,
            )
            class_ids = [membership['class_id'] for membership in memberships.json()] if memberships.is_success else []
            if not class_ids:
                return {'items': []}
            class_params['id'] = f"in.({','.join(class_ids)})"

        classes_response = await client.get('/rest/v1/classes', params=class_params, headers=headers)
        if classes_response.is_error:
            raise HTTPException(status_code=502, detail='Impossible de charger les classes.')
        classes = classes_response.json()
        class_ids = [class_item['id'] for class_item in classes]
        if not class_ids:
            return {'items': []}

        class_filter = f"in.({','.join(class_ids)})"
        chapters_response = await client.get(
            '/rest/v1/chapters',
            params={'class_id': class_filter, 'select': 'id,class_id,title,slug,sort_order', 'order': 'sort_order.asc'},
            headers=headers,
        )
        exercise_params = {'class_id': class_filter, 'select': 'id,class_id'}
        if profile['role'] != 'teacher':
            exercise_params['publication_status'] = 'eq.publie'
        exercises_response = await client.get('/rest/v1/exercises', params=exercise_params, headers=headers)
        if chapters_response.is_error or exercises_response.is_error:
            raise HTTPException(status_code=502, detail='Impossible de charger le contenu des classes.')

        students_by_class: dict[str, list[dict]] = {class_id: [] for class_id in class_ids}
        if profile['role'] == 'teacher':
            members_response = await client.get(
                '/rest/v1/class_memberships',
                params={'class_id': class_filter, 'select': 'class_id,profiles(id,display_name,status)'},
                headers=headers,
            )
            if members_response.is_error:
                raise HTTPException(status_code=502, detail='Impossible de charger les élèves des classes.')
            for membership in members_response.json():
                student = membership.get('profiles') or {}
                students_by_class[membership['class_id']].append({'id': student.get('id'), 'display_name': student.get('display_name', 'Élève'), 'status': student.get('status', 'active')})

    chapters_by_class: dict[str, list[dict]] = {class_id: [] for class_id in class_ids}
    for chapter in chapters_response.json():
        chapters_by_class[chapter['class_id']].append(chapter)
    exercise_count_by_class: dict[str, int] = {class_id: 0 for class_id in class_ids}
    for exercise in exercises_response.json():
        exercise_count_by_class[exercise['class_id']] += 1
    return {'items': [{
        **class_item,
        'chapters': chapters_by_class[class_item['id']],
        'exercise_count': exercise_count_by_class[class_item['id']],
        'students': students_by_class[class_item['id']] if profile['role'] == 'teacher' else [],
        'student_count': len(students_by_class[class_item['id']]) if profile['role'] == 'teacher' else None,
    } for class_item in classes]}


async def get_exercise(
    exercise_id: str,
    profile: dict[str, str] = Depends(require_active_user),
    settings: Settings = Depends(server_settings),
) -> dict:
    exercises = await accessible_exercises(profile, settings, exercise_id)
    if not exercises:
        raise HTTPException(status_code=404, detail='Exercice introuvable.')
    return exercises[0]


async def list_pending_students(
    _: dict[str, str] = Depends(require_teacher),
    settings: Settings = Depends(server_settings),
) -> dict[str, list[dict]]:
    headers = {
        'apikey': settings.supabase_service_role_key,
        'Authorization': f'Bearer {settings.supabase_service_role_key}',
    }
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        profiles_response = await client.get(
            '/rest/v1/profiles',
            params={
                'role': 'eq.student',
                'status': 'eq.pending',
                'select': 'id,display_name,requested_class_id,created_at',
                'order': 'created_at.asc',
            },
            headers=headers,
        )
        classes_response = await client.get('/rest/v1/classes', params={'select': 'id,code,name'}, headers=headers)
        if profiles_response.is_error or classes_response.is_error:
            raise HTTPException(status_code=502, detail='Impossible de charger les demandes d’inscription.')
    classes_by_id = {class_item['id']: class_item for class_item in classes_response.json()}
    items = [
        {
            **profile,
            'requested_class': classes_by_id.get(profile['requested_class_id']),
        }
        for profile in profiles_response.json()
    ]
    return {'items': items}


async def decide_student_application(
    profile_id: str,
    decision: str = Body(embed=True),
    _: dict[str, str] = Depends(require_teacher),
    settings: Settings = Depends(server_settings),
) -> dict[str, str]:
    if decision not in {'approve', 'refuse'}:
        raise HTTPException(status_code=400, detail='Décision invalide.')
    headers = {
        'apikey': settings.supabase_service_role_key,
        'Authorization': f'Bearer {settings.supabase_service_role_key}',
        'Content-Type': 'application/json',
    }
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        profile_response = await client.get(
            '/rest/v1/profiles',
            params={'id': f'eq.{profile_id}', 'select': 'id,role,status,requested_class_id'},
            headers=headers,
        )
        profile = profile_response.json()[0] if profile_response.is_success and profile_response.json() else None
        if not profile or profile['role'] != 'student' or profile['status'] != 'pending':
            raise HTTPException(status_code=404, detail='Demande d’inscription introuvable.')

        if decision == 'approve':
            if not profile['requested_class_id']:
                raise HTTPException(status_code=400, detail='Cette demande ne contient pas de classe sélectionnée.')
            membership_response = await client.post(
                '/rest/v1/class_memberships',
                params={'on_conflict': 'profile_id,class_id'},
                headers={**headers, 'Prefer': 'resolution=merge-duplicates'},
                json={'profile_id': profile_id, 'class_id': profile['requested_class_id']},
            )
            if membership_response.is_error:
                raise HTTPException(status_code=502, detail='Impossible d’inscrire l’élève dans sa classe.')
            next_status = 'active'
        else:
            next_status = 'suspended'

        update_response = await client.patch(
            '/rest/v1/profiles',
            params={'id': f'eq.{profile_id}'},
            headers=headers,
            json={'status': next_status},
        )
        if update_response.is_error:
            raise HTTPException(status_code=502, detail='Impossible de mettre à jour la demande.')
    return {'status': next_status}


async def get_student_details(
    profile_id: str,
    _: dict[str, str] = Depends(require_teacher),
    settings: Settings = Depends(server_settings),
) -> dict:
    """Return private contact and class details for one student to the teacher."""
    headers = {'apikey': settings.supabase_service_role_key, 'Authorization': f'Bearer {settings.supabase_service_role_key}'}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        profile_response = await client.get(
            '/rest/v1/profiles',
            params={'id': f'eq.{profile_id}', 'role': 'eq.student', 'select': 'id,display_name,phone_number,status,created_at'},
            headers=headers,
        )
        if profile_response.is_error:
            raise HTTPException(status_code=502, detail='Impossible de charger la fiche de l’élève.')
        profiles = profile_response.json()
        if not profiles:
            raise HTTPException(status_code=404, detail='Élève introuvable.')

        memberships_response = await client.get(
            '/rest/v1/class_memberships',
            params={'profile_id': f'eq.{profile_id}', 'select': 'classes(id,code,name)'},
            headers=headers,
        )
        auth_response = await client.get(f'/auth/v1/admin/users/{profile_id}', headers=headers)
        if memberships_response.is_error or auth_response.is_error:
            raise HTTPException(status_code=502, detail='Impossible de charger les coordonnées de l’élève.')

    auth_user = auth_response.json().get('user', auth_response.json())
    profile = profiles[0]
    return {
        **profile,
        'email': auth_user.get('email'),
        'classes': [membership.get('classes') for membership in memberships_response.json() if membership.get('classes')],
    }


async def delete_student(
    profile_id: str,
    _: dict[str, str] = Depends(require_teacher),
    settings: Settings = Depends(server_settings),
) -> dict[str, str]:
    """Permanently remove a student Auth account and its cascade-linked data."""
    headers = {'apikey': settings.supabase_service_role_key, 'Authorization': f'Bearer {settings.supabase_service_role_key}'}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        profile_response = await client.get(
            '/rest/v1/profiles',
            params={'id': f'eq.{profile_id}', 'role': 'eq.student', 'select': 'id'},
            headers=headers,
        )
        if profile_response.is_error:
            raise HTTPException(status_code=502, detail='Impossible de vérifier l’élève.')
        if not profile_response.json():
            raise HTTPException(status_code=404, detail='Élève introuvable.')

        delete_response = await client.delete(f'/auth/v1/admin/users/{profile_id}', headers=headers)
        if delete_response.is_error:
            raise HTTPException(status_code=502, detail='Impossible de supprimer l’élève.')
    return {'status': 'deleted'}


async def manage_student(
    profile_id: str,
    payload: StudentManagementPayload,
    _: dict[str, str] = Depends(require_teacher),
    settings: Settings = Depends(server_settings),
) -> dict[str, str]:
    if payload.action not in {'suspend', 'activate', 'move_class'}:
        raise HTTPException(status_code=400, detail='Action de gestion invalide.')
    headers = {'apikey': settings.supabase_service_role_key, 'Authorization': f'Bearer {settings.supabase_service_role_key}', 'Content-Type': 'application/json'}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        student_response = await client.get('/rest/v1/profiles', params={'id': f'eq.{profile_id}', 'role': 'eq.student', 'select': 'id'}, headers=headers)
        if student_response.is_error:
            raise HTTPException(status_code=502, detail='Impossible de vérifier l’élève.')
        if not student_response.json():
            raise HTTPException(status_code=404, detail='Élève introuvable.')

        if payload.action in {'suspend', 'activate'}:
            next_status = 'suspended' if payload.action == 'suspend' else 'active'
            response = await client.patch('/rest/v1/profiles', params={'id': f'eq.{profile_id}'}, headers=headers, json={'status': next_status})
            if response.is_error:
                raise HTTPException(status_code=502, detail='Impossible de modifier le statut de l’élève.')
            return {'status': next_status}

        if not payload.class_id:
            raise HTTPException(status_code=400, detail='Veuillez sélectionner une classe.')
        class_response = await client.get('/rest/v1/classes', params={'id': f'eq.{payload.class_id}', 'select': 'id'}, headers=headers)
        if class_response.is_error or not class_response.json():
            raise HTTPException(status_code=404, detail='Classe introuvable.')
        remove_response = await client.delete('/rest/v1/class_memberships', params={'profile_id': f'eq.{profile_id}'}, headers=headers)
        if remove_response.is_error:
            raise HTTPException(status_code=502, detail='Impossible de retirer l’élève de son ancienne classe.')
        add_response = await client.post('/rest/v1/class_memberships', params={'on_conflict': 'profile_id,class_id'}, headers={**headers, 'Prefer': 'resolution=merge-duplicates'}, json={'profile_id': profile_id, 'class_id': payload.class_id})
        if add_response.is_error:
            raise HTTPException(status_code=502, detail='Impossible d’inscrire l’élève dans la nouvelle classe.')
    return {'status': 'moved'}


async def get_exercise_comments(
    exercise_id: str,
    profile: dict[str, str] = Depends(require_active_user),
    settings: Settings = Depends(server_settings),
) -> dict[str, list[dict]]:
    if not await accessible_exercises(profile, settings, exercise_id):
        raise HTTPException(status_code=404, detail='Exercice introuvable.')
    headers = {'apikey': settings.supabase_service_role_key, 'Authorization': f'Bearer {settings.supabase_service_role_key}'}
    params = {
        'exercise_id': f'eq.{exercise_id}',
        'select': 'id,parent_id,body,is_pinned,is_resolved,is_locked,created_at,profiles(display_name,role)',
        'order': 'created_at.asc',
    }
    params['status'] = 'eq.visible'
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        response = await client.get('/rest/v1/comments', params=params, headers=headers)
    if response.is_error:
        raise HTTPException(status_code=502, detail='Impossible de charger les discussions.')
    items = []
    for comment in response.json():
        author = comment.pop('profiles', None) or {}
        items.append({**comment, 'author': author.get('display_name', 'Utilisateur'), 'is_teacher': author.get('role') == 'teacher'})
    return {'items': items}


async def list_questions(
    profile: dict[str, str] = Depends(require_active_user),
    settings: Settings = Depends(server_settings),
) -> dict[str, list[dict]]:
    """Return root discussion messages as question threads the user may access."""
    headers = {
        'apikey': settings.supabase_service_role_key,
        'Authorization': f'Bearer {settings.supabase_service_role_key}',
    }
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=30) as client:
        exercise_params = {'select': 'id'}
        if profile['role'] != 'teacher':
            memberships = await client.get(
                '/rest/v1/class_memberships',
                params={'profile_id': f"eq.{profile['id']}", 'select': 'class_id'},
                headers=headers,
            )
            class_ids = [membership['class_id'] for membership in memberships.json()] if memberships.is_success else []
            if not class_ids:
                return {'items': []}
            exercise_params['class_id'] = f"in.({','.join(class_ids)})"
            exercise_params['publication_status'] = 'eq.publie'
        exercises = await client.get('/rest/v1/exercises', params=exercise_params, headers=headers)
        if exercises.is_error:
            raise HTTPException(status_code=502, detail='Impossible de charger les questions.')
        exercise_ids = [exercise['id'] for exercise in exercises.json()]
        if not exercise_ids:
            return {'items': []}

        params = {
            'exercise_id': f"in.({','.join(exercise_ids)})",
            'parent_id': 'is.null',
            'status': 'eq.visible',
            'select': 'id,exercise_id,body,is_resolved,is_locked,created_at,profiles(display_name),exercises(title)',
            'order': 'created_at.desc',
        }
        if profile['role'] != 'teacher':
            params['author_id'] = f"eq.{profile['id']}"

        response = await client.get('/rest/v1/comments', params=params, headers=headers)
        if response.is_error:
            raise HTTPException(status_code=502, detail='Impossible de charger les questions.')

        items = []
        for question in response.json():
            replies = await client.get(
                '/rest/v1/comments',
                params={'parent_id': f"eq.{question['id']}", 'status': 'eq.visible', 'select': 'id'},
                headers=headers,
            )
            if replies.is_error:
                raise HTTPException(status_code=502, detail='Impossible de charger les questions.')
            author = question.pop('profiles', None) or {}
            exercise = question.pop('exercises', None) or {}
            items.append({
                **question,
                'author': author.get('display_name', 'Utilisateur'),
                'exercise_title': exercise.get('title', 'Exercice'),
                'reply_count': len(replies.json()),
            })
    return {'items': items}


async def list_notifications(
    profile: dict[str, str] = Depends(require_active_user),
    settings: Settings = Depends(server_settings),
) -> dict[str, list[dict]]:
    headers = {'apikey': settings.supabase_service_role_key, 'Authorization': f'Bearer {settings.supabase_service_role_key}'}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        response = await client.get('/rest/v1/notifications', params={'recipient_id': f"eq.{profile['id']}", 'select': 'id,type,title,body,href,read_at,created_at', 'order': 'created_at.desc'}, headers=headers)
    if response.is_error:
        raise HTTPException(status_code=502, detail='Impossible de charger les notifications.')
    return {'items': response.json()}


async def mark_notifications_read(
    notification_id: str | None = None,
    profile: dict[str, str] = Depends(require_active_user),
    settings: Settings = Depends(server_settings),
) -> dict[str, str]:
    headers = {'apikey': settings.supabase_service_role_key, 'Authorization': f'Bearer {settings.supabase_service_role_key}'}
    params = {'recipient_id': f"eq.{profile['id']}", 'read_at': 'is.null'}
    if notification_id:
        params['id'] = f'eq.{notification_id}'
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        response = await client.patch('/rest/v1/notifications', params=params, headers=headers, json={'read_at': datetime.now(timezone.utc).isoformat()})
    if response.is_error:
        raise HTTPException(status_code=502, detail='Impossible de mettre à jour les notifications.')
    return {'status': 'read'}


async def create_comment(
    exercise_id: str,
    payload: CommentPayload,
    profile: dict[str, str] = Depends(require_active_user),
    settings: Settings = Depends(server_settings),
) -> dict:
    if not 1 <= len(payload.body.strip()) <= 2000:
        raise HTTPException(status_code=400, detail='Votre message doit contenir entre 1 et 2 000 caractères.')
    if not await accessible_exercises(profile, settings, exercise_id):
        raise HTTPException(status_code=404, detail='Exercice introuvable.')
    headers = {
        'apikey': settings.supabase_service_role_key,
        'Authorization': f'Bearer {settings.supabase_service_role_key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
    }
    parent_author_id: str | None = None
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        if payload.parent_id:
            parent = await client.get('/rest/v1/comments', params={'id': f'eq.{payload.parent_id}', 'exercise_id': f'eq.{exercise_id}', 'select': 'id,is_locked,author_id'}, headers=headers)
            if not parent.is_success or not parent.json() or parent.json()[0]['is_locked']:
                raise HTTPException(status_code=400, detail='Cette discussion est verrouillée ou introuvable.')
            parent_author_id = parent.json()[0]['author_id']
        response = await client.post(
            '/rest/v1/comments',
            headers=headers,
            json={'exercise_id': exercise_id, 'author_id': profile['id'], 'parent_id': payload.parent_id, 'body': payload.body.strip()},
        )
        if response.is_success and profile['role'] == 'teacher' and parent_author_id and parent_author_id != profile['id']:
            await create_notifications(client, headers, [parent_author_id], 'reply', 'Nouvelle réponse du professeur', f'Le professeur a répondu à votre discussion sur un exercice.', f'/eleve/exercices/{exercise_id}')
    if response.is_error:
        raise HTTPException(status_code=502, detail='Impossible de publier votre message.')
    comment = response.json()[0]
    return {**comment, 'author': profile['display_name'], 'is_teacher': profile['role'] == 'teacher'}


async def moderate_comment(
    comment_id: str,
    payload: ModerationPayload,
    teacher: dict[str, str] = Depends(require_teacher),
    settings: Settings = Depends(server_settings),
) -> dict:
    if payload.action not in {'hide', 'pin', 'resolve', 'lock'}:
        raise HTTPException(status_code=400, detail='Action de modération invalide.')
    headers = {'apikey': settings.supabase_service_role_key, 'Authorization': f'Bearer {settings.supabase_service_role_key}', 'Content-Type': 'application/json', 'Prefer': 'return=representation'}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        current = await client.get('/rest/v1/comments', params={'id': f'eq.{comment_id}', 'select': 'id,status,is_pinned,is_resolved,is_locked'}, headers=headers)
        if not current.is_success or not current.json():
            raise HTTPException(status_code=404, detail='Commentaire introuvable.')
        comment = current.json()[0]
        comment_ids = [comment_id]
        if payload.action == 'hide':
            # A discussion can contain replies at more than one level. Gather
            # the complete subtree so hiding its root never leaves orphaned,
            # visible replies in the exercise or questions pages.
            pending_parent_ids = [comment_id]
            while pending_parent_ids:
                children = await client.get(
                    '/rest/v1/comments',
                    params={'parent_id': f"in.({','.join(pending_parent_ids)})", 'select': 'id'},
                    headers=headers,
                )
                if children.is_error:
                    raise HTTPException(status_code=502, detail='Impossible de charger les réponses de ce commentaire.')
                pending_parent_ids = [child['id'] for child in children.json()]
                comment_ids.extend(pending_parent_ids)
        changes = {
            'hide': {'status': 'hidden' if comment['status'] == 'visible' else 'visible'},
            'pin': {'is_pinned': not comment['is_pinned']},
            'resolve': {'is_resolved': not comment['is_resolved']},
            'lock': {'is_locked': not comment['is_locked']},
        }[payload.action]
        target_ids = comment_ids if payload.action == 'hide' else [comment_id]
        updated = await client.patch('/rest/v1/comments', params={'id': f"in.({','.join(target_ids)})"}, headers=headers, json=changes)
        if payload.action == 'hide':
            await client.patch('/rest/v1/comment_reports', params={'comment_id': f"in.({','.join(target_ids)})", 'reviewed_at': 'is.null'}, headers=headers, json={'reviewed_at': datetime.now(timezone.utc).isoformat(), 'reviewed_by': teacher['id']})
    if updated.is_error:
        raise HTTPException(status_code=502, detail='Impossible de modérer ce commentaire.')
    return updated.json()[0]

async def dismiss_report(report_id: str, teacher: dict[str, str] = Depends(require_teacher), settings: Settings = Depends(server_settings)) -> dict:
    h={'apikey':settings.supabase_service_role_key,'Authorization':f'Bearer {settings.supabase_service_role_key}','Content-Type':'application/json'}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        r=await client.patch('/rest/v1/comment_reports',params={'id':f'eq.{report_id}','reviewed_at':'is.null'},headers=h,json={'reviewed_at':datetime.now(timezone.utc).isoformat(),'reviewed_by':teacher['id']})
    if r.is_error: raise HTTPException(status_code=502,detail='Impossible de fermer ce signalement.')
    return {'status':'dismissed'}

async def report_comment(comment_id: str, payload: ReportPayload, profile: dict[str, str] = Depends(require_active_user), settings: Settings = Depends(server_settings)) -> dict:
    headers={'apikey':settings.supabase_service_role_key,'Authorization':f'Bearer {settings.supabase_service_role_key}','Content-Type':'application/json','Prefer':'return=representation'}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        response=await client.post('/rest/v1/comment_reports',headers=headers,json={'comment_id':comment_id,'reporter_id':profile['id'],'reason':payload.reason[:500]})
        if response.status_code == 409:
            response = await client.patch(
                '/rest/v1/comment_reports',
                params={'comment_id': f'eq.{comment_id}', 'reporter_id': f'eq.{profile["id"]}'},
                headers=headers,
                json={'reason': payload.reason[:500], 'reviewed_at': None, 'reviewed_by': None},
            )
            if response.is_error:
                raise HTTPException(status_code=502, detail='Impossible de rouvrir ce signalement.')
            return {'status': 'reopened'}
    if response.is_error: raise HTTPException(status_code=502,detail='Impossible de signaler ce commentaire.')
    return {'status':'reported'}

async def list_reports(_: dict[str, str] = Depends(require_teacher), settings: Settings = Depends(server_settings)) -> dict:
    h={'apikey':settings.supabase_service_role_key,'Authorization':f'Bearer {settings.supabase_service_role_key}'}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        reports=await client.get('/rest/v1/comment_reports',params={'reviewed_at':'is.null','select':'id,comment_id,reason,created_at','order':'created_at.asc'},headers=h)
        if reports.is_error: raise HTTPException(status_code=502,detail='Impossible de charger les signalements.')
        items=[]
        for report in reports.json():
            comment=await client.get('/rest/v1/comments',params={'id':f"eq.{report['comment_id']}",'select':'id,body,profiles(display_name),exercises(title)'},headers=h)
            data=comment.json()[0] if comment.is_success and comment.json() else {}
            author=data.get('profiles') or {}; exercise=data.get('exercises') or {}
            items.append({**report,'comment':data.get('body','Commentaire supprimé'),'author':author.get('display_name','Utilisateur'),'exercise_title':exercise.get('title','Exercice')})
    return {'items':items}


async def create_exercise(
    title: str = Form(),
    class_code: str = Form(),
    chapter_title: str = Form(),
    difficulty: str = Form(),
    tags: str = Form(''),
    description: str = Form(''),
    publication_status: str = Form('brouillon'),
    image: UploadFile = File(),
    teacher: dict[str, str] = Depends(require_teacher),
    settings: Settings = Depends(server_settings),
) -> dict:
    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail='Utilisez une image PNG, JPEG ou WebP.')
    if difficulty not in {'facile', 'moyen', 'difficile'} or publication_status not in {'brouillon', 'publie'}:
        raise HTTPException(status_code=400, detail='Les métadonnées de l’exercice sont invalides.')
    if not 3 <= len(title.strip()) <= 160:
        raise HTTPException(status_code=400, detail='Le titre doit contenir entre 3 et 160 caractères.')

    image_data = await image.read()
    if not image_data or len(image_data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail='L’image doit peser au maximum 10 Mo.')

    try:
        parsed_tags = [tag.strip().lower() for tag in tags.split(',') if tag.strip()][:10]
    except AttributeError:
        raise HTTPException(status_code=400, detail='Les tags sont invalides.')

    service_headers = {
        'apikey': settings.supabase_service_role_key,
        'Authorization': f'Bearer {settings.supabase_service_role_key}',
    }
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=30) as client:
        class_response = await client.get('/rest/v1/classes', params={'code': f'eq.{class_code}', 'select': 'id'}, headers=service_headers)
        selected_class = class_response.json()[0] if class_response.is_success and class_response.json() else None
        if not selected_class:
            raise HTTPException(status_code=400, detail='Classe introuvable.')

        chapter_response = await client.get(
            '/rest/v1/chapters',
            params={'class_id': f"eq.{selected_class['id']}", 'title': f'eq.{chapter_title}', 'select': 'id'},
            headers=service_headers,
        )
        chapter = chapter_response.json()[0] if chapter_response.is_success and chapter_response.json() else None
        if not chapter:
            raise HTTPException(status_code=400, detail='Chapitre introuvable pour cette classe.')

        file_extension = {'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp'}[image.content_type]
        image_path = f"{selected_class['id']}/{uuid.uuid4()}.{file_extension}"
        upload_response = await client.post(
            f'/storage/v1/object/exercise-images/{image_path}',
            content=image_data,
            headers={**service_headers, 'Content-Type': image.content_type, 'x-upsert': 'false'},
        )
        if upload_response.is_error:
            raise HTTPException(status_code=502, detail='Impossible d’enregistrer l’image.')

        payload = {
            'title': title.strip(),
            'description': description.strip() or None,
            'class_id': selected_class['id'],
            'chapter_id': chapter['id'],
            'image_path': image_path,
            'image_alt': title.strip(),
            'difficulty': difficulty,
            'tags': parsed_tags,
            'publication_status': publication_status,
            'published_at': datetime.now(timezone.utc).isoformat() if publication_status == 'publie' else None,
            'created_by': teacher['id'],
        }
        exercise_response = await client.post(
            '/rest/v1/exercises',
            json=payload,
            headers={**service_headers, 'Prefer': 'return=representation'},
        )
        if exercise_response.is_error:
            await client.delete(f'/storage/v1/object/exercise-images/{image_path}', headers=service_headers)
            raise HTTPException(status_code=502, detail='Impossible d’enregistrer l’exercice.')
        if publication_status == 'publie':
            members = await client.get('/rest/v1/class_memberships', params={'class_id': f"eq.{selected_class['id']}", 'select': 'profile_id'}, headers=service_headers)
            if members.is_success:
                created = exercise_response.json()[0]
                await create_notifications(client, service_headers, [member['profile_id'] for member in members.json()], 'new_exercise', 'Nouvel exercice publié', title.strip(), f"/eleve/exercices/{created['id']}")

    return exercise_response.json()[0]


async def update_exercise(
    exercise_id: str,
    title: str = Form(),
    class_code: str = Form(),
    chapter_title: str = Form(),
    difficulty: str = Form(),
    tags: str = Form(''),
    description: str = Form(''),
    publication_status: str = Form(),
    image: UploadFile | None = File(None),
    _: dict[str, str] = Depends(require_teacher),
    settings: Settings = Depends(server_settings),
) -> dict:
    clean_title = title.strip()
    if not 3 <= len(clean_title) <= 160:
        raise HTTPException(status_code=400, detail='Le titre doit contenir entre 3 et 160 caractères.')
    if difficulty not in {'facile', 'moyen', 'difficile'} or publication_status not in {'brouillon', 'publie', 'depublie'}:
        raise HTTPException(status_code=400, detail='Les métadonnées de l’exercice sont invalides.')
    if image and image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail='Utilisez une image PNG, JPEG ou WebP.')

    parsed_tags = [tag.strip().lower() for tag in tags.split(',') if tag.strip()][:10]
    headers = {'apikey': settings.supabase_service_role_key, 'Authorization': f'Bearer {settings.supabase_service_role_key}'}
    new_image_path: str | None = None
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=30) as client:
        current_response = await client.get(
            '/rest/v1/exercises',
            params={'id': f'eq.{exercise_id}', 'select': 'id,class_id,title,image_path,publication_status'},
            headers=headers,
        )
        current = current_response.json()[0] if current_response.is_success and current_response.json() else None
        if not current:
            raise HTTPException(status_code=404, detail='Exercice introuvable.')

        class_response = await client.get('/rest/v1/classes', params={'code': f'eq.{class_code}', 'select': 'id'}, headers=headers)
        selected_class = class_response.json()[0] if class_response.is_success and class_response.json() else None
        if not selected_class:
            raise HTTPException(status_code=400, detail='Classe introuvable.')
        chapter_response = await client.get(
            '/rest/v1/chapters',
            params={'class_id': f"eq.{selected_class['id']}", 'title': f'eq.{chapter_title}', 'select': 'id'},
            headers=headers,
        )
        chapter = chapter_response.json()[0] if chapter_response.is_success and chapter_response.json() else None
        if not chapter:
            raise HTTPException(status_code=400, detail='Chapitre introuvable pour cette classe.')

        image_path = current['image_path']
        if image:
            image_data = await image.read()
            if not image_data or len(image_data) > MAX_IMAGE_BYTES:
                raise HTTPException(status_code=400, detail='L’image doit peser au maximum 10 Mo.')
            extension = {'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp'}[image.content_type]
            new_image_path = f"{selected_class['id']}/{uuid.uuid4()}.{extension}"
            upload_response = await client.post(
                f'/storage/v1/object/exercise-images/{new_image_path}',
                content=image_data,
                headers={**headers, 'Content-Type': image.content_type, 'x-upsert': 'false'},
            )
            if upload_response.is_error:
                raise HTTPException(status_code=502, detail='Impossible d’enregistrer la nouvelle image.')
            image_path = new_image_path

        update = {
            'title': clean_title,
            'description': description.strip() or None,
            'class_id': selected_class['id'],
            'chapter_id': chapter['id'],
            'difficulty': difficulty,
            'tags': parsed_tags,
            'publication_status': publication_status,
            'image_path': image_path,
            'image_alt': clean_title,
        }
        if publication_status == 'publie' and current['publication_status'] != 'publie':
            update['published_at'] = datetime.now(timezone.utc).isoformat()

        update_response = await client.patch(
            '/rest/v1/exercises',
            params={'id': f'eq.{exercise_id}'},
            json=update,
            headers={**headers, 'Content-Type': 'application/json', 'Prefer': 'return=representation'},
        )
        if update_response.is_error or not update_response.json():
            if new_image_path:
                await client.delete(f'/storage/v1/object/exercise-images/{new_image_path}', headers=headers)
            raise HTTPException(status_code=502, detail='Impossible de mettre à jour l’exercice.')

        if new_image_path:
            signed_image_cache.pop(current['image_path'], None)
            await client.delete(f"/storage/v1/object/exercise-images/{current['image_path']}", headers=headers)

        if publication_status == 'publie' and current['publication_status'] != 'publie':
            members = await client.get('/rest/v1/class_memberships', params={'class_id': f"eq.{selected_class['id']}", 'select': 'profile_id'}, headers=headers)
            if members.is_success:
                await create_notifications(client, headers, [member['profile_id'] for member in members.json()], 'new_exercise', 'Nouvel exercice publié', clean_title, f'/eleve/exercices/{exercise_id}')

    return update_response.json()[0]


async def update_exercise_publication(
    exercise_id: str,
    payload: PublicationPayload,
    _: dict[str, str] = Depends(require_teacher),
    settings: Settings = Depends(server_settings),
) -> dict:
    if payload.publication_status not in {'brouillon', 'publie', 'depublie'}:
        raise HTTPException(status_code=400, detail='Statut de publication invalide.')

    headers = {
        'apikey': settings.supabase_service_role_key,
        'Authorization': f'Bearer {settings.supabase_service_role_key}',
        'Prefer': 'return=representation',
    }
    update = {'publication_status': payload.publication_status}
    if payload.publication_status == 'publie':
        update['published_at'] = datetime.now(timezone.utc).isoformat()

    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        previous = await client.get('/rest/v1/exercises', params={'id': f'eq.{exercise_id}', 'select': 'id,class_id,title,publication_status'}, headers=headers)
        before = previous.json()[0] if previous.is_success and previous.json() else None
        if not before:
            raise HTTPException(status_code=404, detail='Exercice introuvable.')
        response = await client.patch(
            '/rest/v1/exercises',
            params={'id': f'eq.{exercise_id}'},
            json=update,
            headers=headers,
        )
        if response.is_success and payload.publication_status == 'publie' and before['publication_status'] != 'publie':
            members = await client.get('/rest/v1/class_memberships', params={'class_id': f"eq.{before['class_id']}", 'select': 'profile_id'}, headers=headers)
            if members.is_success:
                await create_notifications(client, headers, [member['profile_id'] for member in members.json()], 'new_exercise', 'Nouvel exercice publié', before['title'], f'/eleve/exercices/{exercise_id}')
    if response.is_error:
        raise HTTPException(status_code=502, detail='Impossible de mettre à jour la publication de cet exercice.')
    if not response.json():
        raise HTTPException(status_code=404, detail='Exercice introuvable.')
    return response.json()[0]


async def delete_exercise(
    exercise_id: str,
    _: dict[str, str] = Depends(require_teacher),
    settings: Settings = Depends(server_settings),
) -> dict[str, str]:
    headers = {
        'apikey': settings.supabase_service_role_key,
        'Authorization': f'Bearer {settings.supabase_service_role_key}',
        'Prefer': 'return=representation',
    }
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=30) as client:
        lookup = await client.get(
            '/rest/v1/exercises',
            params={'id': f'eq.{exercise_id}', 'select': 'id,image_path'},
            headers=headers,
        )
        exercise = lookup.json()[0] if lookup.is_success and lookup.json() else None
        if not exercise:
            raise HTTPException(status_code=404, detail='Exercice introuvable.')

        deleted = await client.delete(
            '/rest/v1/exercises',
            params={'id': f'eq.{exercise_id}'},
            headers=headers,
        )
        if deleted.is_error:
            raise HTTPException(status_code=502, detail='Impossible de supprimer cet exercice.')

        # The database record is the source of truth. A storage-cleanup failure
        # must not report a failed deletion after the exercise is already gone.
        await client.delete(f"/storage/v1/object/exercise-images/{exercise['image_path']}", headers=headers)
    return {'status': 'deleted'}
