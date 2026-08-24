import uuid
import asyncio
import time
import re
import unicodedata
from datetime import datetime, timezone

import httpx
from fastapi import Body, Depends, File, Form, Header, HTTPException, Query, UploadFile, status
from pydantic import BaseModel

from app.config import Settings, get_settings

ALLOWED_IMAGE_TYPES = {'image/png', 'image/jpeg', 'image/webp'}
MAX_IMAGE_BYTES = 10 * 1024 * 1024
SIGNED_IMAGE_CACHE_TTL_SECONDS = 540
signed_image_cache: dict[str, tuple[str, float]] = {}
WRITE_RATE_LIMITS = {'comment': (12, 60), 'report': (5, 300), 'exercise_upload': (12, 3600)}


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


class InstructionPayload(BaseModel):
    body: str
    exercise_id: str | None = None


class InstructionMessagePayload(BaseModel):
    body: str


class ChapterPayload(BaseModel):
    title: str


class PasswordChangeDecisionPayload(BaseModel):
    decision: str


class PasswordChangePayload(BaseModel):
    password: str


async def create_notifications(client: httpx.AsyncClient, headers: dict[str, str], recipient_ids: list[str], notification_type: str, title: str, body: str, href: str) -> None:
    if not recipient_ids:
        return
    await client.post('/rest/v1/notifications', headers=headers, json=[{
        'recipient_id': recipient_id, 'type': notification_type, 'title': title, 'body': body, 'href': href,
    } for recipient_id in recipient_ids])

async def enforce_write_rate_limit(client: httpx.AsyncClient, settings: Settings, profile_id: str, action: str) -> None:
    limit, window_seconds = WRITE_RATE_LIMITS[action]
    response = await client.post('/rest/v1/rpc/consume_api_rate_limit', headers={'apikey': settings.supabase_secret_key, 'Content-Type': 'application/json'}, json={'p_subject_id': profile_id, 'p_action': action, 'p_limit': limit, 'p_window_seconds': window_seconds})
    if response.is_error or not response.json():
        raise HTTPException(status_code=503, detail='La protection anti-abus est temporairement indisponible. Réessayez dans un instant.')
    result = response.json()[0]
    if not result['allowed']:
        raise HTTPException(status_code=429, detail=f"Trop de demandes. Réessayez dans {result['retry_after_seconds']} secondes.")


def server_settings() -> Settings:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_secret_key:
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
    headers = {'apikey': settings.supabase_secret_key, 'Authorization': f'Bearer {user_token}'}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=15) as client:
        user_response = await client.get('/auth/v1/user', headers=headers)
        if user_response.is_error:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Session invalide ou expirée.')
        user_id = user_response.json().get('id')
        profile_response = await client.get(
            '/rest/v1/profiles',
            params={'id': f'eq.{user_id}', 'select': 'id,display_name,role,status'},
            headers={
                'apikey': settings.supabase_secret_key,
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


async def get_data_revisions(profile: dict[str, str] = Depends(require_active_user), settings: Settings = Depends(server_settings)) -> dict:
    headers = {'apikey': settings.supabase_secret_key}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=15) as client:
        response = await client.get('/rest/v1/data_revisions', params={'select': 'resource,updated_at'}, headers=headers)
    if response.is_error:
        raise HTTPException(status_code=502, detail='Impossible de vérifier les mises à jour.')
    return {'items': response.json()}


async def update_profile(
    payload: ProfilePayload,
    profile: dict[str, str] = Depends(require_active_user),
    settings: Settings = Depends(server_settings),
) -> dict:
    name = payload.display_name.strip()
    if not 2 <= len(name) <= 50:
        raise HTTPException(status_code=400, detail='Le nom doit contenir entre 2 et 50 caractères.')
    headers = {'apikey': settings.supabase_secret_key, 'Prefer': 'return=representation'}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        response = await client.patch('/rest/v1/profiles', params={'id': f"eq.{profile['id']}"}, headers=headers, json={'display_name': name})
    if response.is_error or not response.json():
        raise HTTPException(status_code=502, detail='Impossible de mettre à jour le profil.')
    return response.json()[0]


async def get_student_password_change_status(
    profile: dict[str, str] = Depends(require_active_user),
    settings: Settings = Depends(server_settings),
) -> dict:
    if profile['role'] != 'student':
        raise HTTPException(status_code=403, detail='Cette demande est réservée aux élèves.')
    headers = {'apikey': settings.supabase_secret_key}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        response = await client.get(
            '/rest/v1/password_change_requests',
            params={'profile_id': f"eq.{profile['id']}", 'status': 'in.(pending,approved)', 'select': 'id,status,requested_at,reviewed_at', 'order': 'requested_at.desc', 'limit': '1'},
            headers=headers,
        )
    if response.is_error:
        raise HTTPException(status_code=502, detail='Impossible de charger la demande de changement de mot de passe.')
    return response.json()[0] if response.json() else {'status': 'none'}


async def request_student_password_change(
    profile: dict[str, str] = Depends(require_active_user),
    settings: Settings = Depends(server_settings),
) -> dict:
    if profile['role'] != 'student':
        raise HTTPException(status_code=403, detail='Cette demande est réservée aux élèves.')
    current = await get_student_password_change_status(profile, settings)
    if current['status'] in {'pending', 'approved'}:
        return current
    headers = {'apikey': settings.supabase_secret_key, 'Content-Type': 'application/json', 'Prefer': 'return=representation'}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        response = await client.post('/rest/v1/password_change_requests', headers=headers, json={'profile_id': profile['id']})
    if response.is_error or not response.json():
        raise HTTPException(status_code=502, detail='Impossible d’envoyer la demande de changement de mot de passe.')
    return response.json()[0]


async def list_student_password_change_requests(
    _: dict[str, str] = Depends(require_teacher),
    settings: Settings = Depends(server_settings),
) -> dict:
    headers = {'apikey': settings.supabase_secret_key}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        response = await client.get(
            '/rest/v1/password_change_requests',
            params={'status': 'eq.pending', 'select': 'id,profile_id,requested_at,profiles(display_name)', 'order': 'requested_at.asc'},
            headers=headers,
        )
    if response.is_error:
        raise HTTPException(status_code=502, detail='Impossible de charger les demandes de mot de passe.')
    return {'items': [{**request, 'student_name': (request.pop('profiles', None) or {}).get('display_name', 'Élève')} for request in response.json()]}


async def decide_student_password_change_request(
    request_id: str,
    payload: PasswordChangeDecisionPayload,
    teacher: dict[str, str] = Depends(require_teacher),
    settings: Settings = Depends(server_settings),
) -> dict:
    if payload.decision not in {'approve', 'refuse'}:
        raise HTTPException(status_code=400, detail='Décision invalide.')
    headers = {'apikey': settings.supabase_secret_key, 'Content-Type': 'application/json', 'Prefer': 'return=representation'}
    changes = {'status': 'approved' if payload.decision == 'approve' else 'refused', 'reviewed_at': datetime.now(timezone.utc).isoformat(), 'reviewed_by': teacher['id']}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        response = await client.patch('/rest/v1/password_change_requests', params={'id': f'eq.{request_id}', 'status': 'eq.pending'}, headers=headers, json=changes)
    if response.is_error:
        raise HTTPException(status_code=502, detail='Impossible de traiter la demande de mot de passe.')
    if not response.json():
        raise HTTPException(status_code=404, detail='Cette demande est introuvable ou a déjà été traitée.')
    return response.json()[0]


async def change_student_password(
    payload: PasswordChangePayload,
    profile: dict[str, str] = Depends(require_active_user),
    settings: Settings = Depends(server_settings),
) -> dict:
    if profile['role'] != 'student':
        raise HTTPException(status_code=403, detail='Les professeurs gèrent leur mot de passe directement depuis leur session.')
    password = payload.password
    if len(password) < 8 or not any(character.isalpha() for character in password) or not any(character.isdigit() for character in password):
        raise HTTPException(status_code=400, detail='Le mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre.')
    headers = {'apikey': settings.supabase_secret_key, 'Content-Type': 'application/json', 'Prefer': 'return=representation'}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        request_response = await client.get('/rest/v1/password_change_requests', params={'profile_id': f"eq.{profile['id']}", 'status': 'eq.approved', 'select': 'id', 'order': 'requested_at.desc', 'limit': '1'}, headers=headers)
        if request_response.is_error:
            raise HTTPException(status_code=502, detail='Impossible de vérifier l’autorisation du professeur.')
        if not request_response.json():
            raise HTTPException(status_code=403, detail='Le professeur doit approuver votre demande avant ce changement.')
        request_id = request_response.json()[0]['id']
        update = await client.put(f"/auth/v1/admin/users/{profile['id']}", headers=headers, json={'password': password})
        if update.is_error:
            raise HTTPException(status_code=502, detail='Impossible de modifier le mot de passe.')
        used = await client.patch('/rest/v1/password_change_requests', params={'id': f'eq.{request_id}', 'status': 'eq.approved'}, headers=headers, json={'status': 'used', 'used_at': datetime.now(timezone.utc).isoformat()})
    if used.is_error:
        raise HTTPException(status_code=502, detail='Le mot de passe a été modifié, mais la demande doit être vérifiée par un administrateur.')
    return {'status': 'changed'}


async def accessible_exercises(
    profile: dict[str, str],
    settings: Settings,
    exercise_id: str | None = None,
) -> list[dict]:
    service_headers = {
        'apikey': settings.supabase_secret_key,
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
        'apikey': settings.supabase_secret_key,
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
        'apikey': settings.supabase_secret_key,
    }
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        profiles_response = await client.get(
            '/rest/v1/profiles',
            params={
                'role': 'eq.student',
                'status': 'eq.pending',
                'select': 'id,display_name,phone_number,requested_class_id,created_at',
                'order': 'created_at.asc',
            },
            headers=headers,
        )
        classes_response = await client.get('/rest/v1/classes', params={'select': 'id,code,name'}, headers=headers)
        if profiles_response.is_error or classes_response.is_error:
            raise HTTPException(status_code=502, detail='Impossible de charger les demandes d’inscription.')
        pending_profiles = profiles_response.json()
        auth_responses = await asyncio.gather(*[
            client.get(f"/auth/v1/admin/users/{profile['id']}", headers=headers)
            for profile in pending_profiles
        ])
        if any(response.is_error for response in auth_responses):
            raise HTTPException(status_code=502, detail='Impossible de vérifier les adresses e-mail des demandes.')
    classes_by_id = {class_item['id']: class_item for class_item in classes_response.json()}
    confirmed_by_profile_id = {
        profile['id']: bool(response.json().get('user', response.json()).get('email_confirmed_at'))
        for profile, response in zip(pending_profiles, auth_responses)
    }
    email_by_profile_id = {
        profile['id']: response.json().get('user', response.json()).get('email')
        for profile, response in zip(pending_profiles, auth_responses)
    }
    items = [
        {
            **profile,
            'requested_class': classes_by_id.get(profile['requested_class_id']),
            'email_confirmed': confirmed_by_profile_id[profile['id']],
            'email': email_by_profile_id[profile['id']],
        }
        for profile in pending_profiles
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
        'apikey': settings.supabase_secret_key,
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
            auth_response = await client.get(f'/auth/v1/admin/users/{profile_id}', headers=headers)
            if auth_response.is_error:
                raise HTTPException(status_code=502, detail='Impossible de vérifier l’adresse e-mail de cet élève.')
            auth_user = auth_response.json().get('user', auth_response.json())
            if not auth_user.get('email_confirmed_at'):
                raise HTTPException(status_code=400, detail='Cet élève doit confirmer son adresse e-mail avant que son inscription puisse être acceptée.')
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
    headers = {'apikey': settings.supabase_secret_key,}
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


async def send_student_instruction(
    profile_id: str,
    payload: InstructionPayload,
    teacher: dict[str, str] = Depends(require_teacher),
    settings: Settings = Depends(server_settings),
) -> dict:
    body = payload.body.strip()
    if not 1 <= len(body) <= 500:
        raise HTTPException(status_code=400, detail='L’instruction doit contenir entre 1 et 500 caractères.')
    headers = {'apikey': settings.supabase_secret_key, 'Content-Type': 'application/json', 'Prefer': 'return=representation'}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        student = await client.get('/rest/v1/profiles', params={'id': f'eq.{profile_id}', 'role': 'eq.student', 'status': 'eq.active', 'select': 'id'}, headers=headers)
        if student.is_error or not student.json():
            raise HTTPException(status_code=404, detail='Élève actif introuvable.')
        if payload.exercise_id:
            exercise = await client.get('/rest/v1/exercises', params={'id': f'eq.{payload.exercise_id}', 'publication_status': 'eq.publie', 'select': 'id'}, headers=headers)
            if exercise.is_error or not exercise.json():
                raise HTTPException(status_code=404, detail='Exercice introuvable ou non publié.')
        thread_response = await client.post(
            '/rest/v1/private_instruction_threads',
            headers=headers,
            json={'student_id': profile_id, 'teacher_id': teacher['id'], 'exercise_id': payload.exercise_id},
        )
        if thread_response.is_error or not thread_response.json():
            raise HTTPException(status_code=502, detail='Impossible de créer la discussion privée.')
        thread = thread_response.json()[0]
        message_response = await client.post(
            '/rest/v1/private_instruction_messages',
            headers=headers,
            json={'thread_id': thread['id'], 'author_id': teacher['id'], 'body': body},
        )
        response = await client.post(
            '/rest/v1/notifications',
            headers=headers,
            json={'recipient_id': profile_id, 'type': 'instruction', 'title': 'Instruction du professeur', 'body': body, 'href': f"/eleve/instructions/{thread['id']}"},
        )
    if message_response.is_error or response.is_error:
        raise HTTPException(status_code=502, detail='Impossible d’envoyer l’instruction.')
    return {'status': 'sent', 'thread_id': thread['id']}


async def get_instruction_thread(
    thread_id: str,
    profile: dict[str, str] = Depends(require_active_user),
    settings: Settings = Depends(server_settings),
) -> dict:
    headers = {'apikey': settings.supabase_secret_key, 'Content-Type': 'application/json'}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        thread_response = await client.get(
            '/rest/v1/private_instruction_threads',
            params={'id': f'eq.{thread_id}', 'select': 'id,student_id,teacher_id,exercise_id,status,created_at,closed_at,exercises(id,title)'},
            headers=headers,
        )
        if thread_response.is_error or not thread_response.json():
            raise HTTPException(status_code=404, detail='Discussion introuvable.')
        thread = thread_response.json()[0]
        if profile['id'] not in (thread['student_id'], thread['teacher_id']):
            raise HTTPException(status_code=403, detail='Accès non autorisé à cette discussion.')
        messages_response = await client.get(
            '/rest/v1/private_instruction_messages',
            params={'thread_id': f'eq.{thread_id}', 'select': 'id,author_id,body,created_at', 'order': 'created_at.asc'},
            headers=headers,
        )
        if messages_response.is_error:
            raise HTTPException(status_code=502, detail='Impossible de charger les messages.')
    return {'thread': thread, 'messages': messages_response.json(), 'viewer_id': profile['id'], 'viewer_role': profile['role']}


async def list_instruction_threads(
    profile: dict[str, str] = Depends(require_active_user),
    settings: Settings = Depends(server_settings),
) -> dict:
    participant_field = 'student_id' if profile['role'] == 'student' else 'teacher_id'
    headers = {'apikey': settings.supabase_secret_key, 'Content-Type': 'application/json'}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        response = await client.get(
            '/rest/v1/private_instruction_threads',
            params={participant_field: f"eq.{profile['id']}", 'select': 'id,student_id,teacher_id,exercise_id,status,created_at,closed_at,exercises(id,title)', 'order': 'created_at.desc'},
            headers=headers,
        )
    if response.is_error:
        raise HTTPException(status_code=502, detail='Impossible de charger les instructions.')
    return {'items': response.json()}


def chapter_slug(title: str) -> str:
    normalized = unicodedata.normalize('NFKD', title).encode('ascii', 'ignore').decode('ascii').lower()
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', normalized)).strip('-')


async def create_chapter(
    class_id: str,
    payload: ChapterPayload,
    _: dict[str, str] = Depends(require_teacher),
    settings: Settings = Depends(server_settings),
) -> dict:
    title = ' '.join(payload.title.split())
    if not 2 <= len(title) <= 100:
        raise HTTPException(status_code=400, detail='Le titre du chapitre doit contenir entre 2 et 100 caractères.')
    slug = chapter_slug(title)
    if not slug:
        raise HTTPException(status_code=400, detail='Le titre du chapitre contient des caractères non valides.')
    headers = {'apikey': settings.supabase_secret_key, 'Content-Type': 'application/json', 'Prefer': 'return=representation'}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        class_response = await client.get('/rest/v1/classes', params={'id': f'eq.{class_id}', 'select': 'id'}, headers=headers)
        if class_response.is_error or not class_response.json():
            raise HTTPException(status_code=404, detail='Classe introuvable.')
        existing = await client.get('/rest/v1/chapters', params={'class_id': f'eq.{class_id}', 'slug': f'eq.{slug}', 'select': 'id'}, headers=headers)
        if existing.is_error:
            raise HTTPException(status_code=502, detail='Impossible de vérifier les chapitres.')
        if existing.json():
            raise HTTPException(status_code=409, detail='Un chapitre avec ce titre existe déjà dans cette classe.')
        latest = await client.get('/rest/v1/chapters', params={'class_id': f'eq.{class_id}', 'select': 'sort_order', 'order': 'sort_order.desc', 'limit': '1'}, headers=headers)
        if latest.is_error:
            raise HTTPException(status_code=502, detail='Impossible de créer le chapitre.')
        sort_order = (latest.json()[0]['sort_order'] + 1) if latest.json() else 0
        response = await client.post('/rest/v1/chapters', headers=headers, json={'class_id': class_id, 'title': title, 'slug': slug, 'sort_order': sort_order})
    if response.is_error or not response.json():
        raise HTTPException(status_code=502, detail='Impossible de créer le chapitre.')
    return response.json()[0]


async def delete_chapter(
    class_id: str,
    chapter_id: str,
    _: dict[str, str] = Depends(require_teacher),
    settings: Settings = Depends(server_settings),
) -> dict:
    headers = {'apikey': settings.supabase_secret_key, 'Content-Type': 'application/json', 'Prefer': 'return=representation'}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        chapter_response = await client.get('/rest/v1/chapters', params={'id': f'eq.{chapter_id}', 'class_id': f'eq.{class_id}', 'select': 'id,title'}, headers=headers)
        if chapter_response.is_error or not chapter_response.json():
            raise HTTPException(status_code=404, detail='Chapitre introuvable dans cette classe.')
        published = await client.get('/rest/v1/exercises', params={'chapter_id': f'eq.{chapter_id}', 'publication_status': 'eq.publie', 'select': 'id', 'limit': '1'}, headers=headers)
        if published.is_error:
            raise HTTPException(status_code=502, detail='Impossible de vérifier les exercices du chapitre.')
        if published.json():
            raise HTTPException(status_code=409, detail='Ce chapitre contient au moins un exercice publié. Dépubliez-les ou déplacez-les avant de le supprimer.')
        response = await client.delete('/rest/v1/chapters', params={'id': f'eq.{chapter_id}', 'class_id': f'eq.{class_id}'}, headers=headers)
    if response.is_error:
        raise HTTPException(status_code=502, detail='Impossible de supprimer le chapitre.')
    return {'status': 'deleted'}


async def post_instruction_message(
    thread_id: str,
    payload: InstructionMessagePayload,
    profile: dict[str, str] = Depends(require_active_user),
    settings: Settings = Depends(server_settings),
) -> dict:
    body = payload.body.strip()
    if not 1 <= len(body) <= 2000:
        raise HTTPException(status_code=400, detail='Le message doit contenir entre 1 et 2 000 caractères.')
    headers = {'apikey': settings.supabase_secret_key, 'Content-Type': 'application/json', 'Prefer': 'return=representation'}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        thread_response = await client.get('/rest/v1/private_instruction_threads', params={'id': f'eq.{thread_id}', 'select': 'id,student_id,teacher_id,status'}, headers=headers)
        if thread_response.is_error or not thread_response.json():
            raise HTTPException(status_code=404, detail='Discussion introuvable.')
        thread = thread_response.json()[0]
        if profile['id'] not in (thread['student_id'], thread['teacher_id']):
            raise HTTPException(status_code=403, detail='Accès non autorisé à cette discussion.')
        if thread['status'] != 'open':
            raise HTTPException(status_code=400, detail='Cette discussion est fermée par le professeur.')
        message_response = await client.post('/rest/v1/private_instruction_messages', headers=headers, json={'thread_id': thread_id, 'author_id': profile['id'], 'body': body})
        if message_response.is_error or not message_response.json():
            raise HTTPException(status_code=502, detail='Impossible d’envoyer le message.')
        recipient_id = thread['teacher_id'] if profile['id'] == thread['student_id'] else thread['student_id']
        recipient_href = f'/prof/instructions/{thread_id}' if profile['id'] == thread['student_id'] else f'/eleve/instructions/{thread_id}'
        title = 'Réponse de l’élève' if profile['id'] == thread['student_id'] else 'Réponse du professeur'
        await create_notifications(client, headers, [recipient_id], 'instruction', title, body, recipient_href)
    return {'message': message_response.json()[0]}


async def close_instruction_thread(
    thread_id: str,
    teacher: dict[str, str] = Depends(require_teacher),
    settings: Settings = Depends(server_settings),
) -> dict:
    headers = {'apikey': settings.supabase_secret_key, 'Content-Type': 'application/json', 'Prefer': 'return=representation'}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        thread_response = await client.get('/rest/v1/private_instruction_threads', params={'id': f'eq.{thread_id}', 'select': 'id,student_id,teacher_id,status'}, headers=headers)
        if thread_response.is_error or not thread_response.json():
            raise HTTPException(status_code=404, detail='Discussion introuvable.')
        thread = thread_response.json()[0]
        if thread['teacher_id'] != teacher['id']:
            raise HTTPException(status_code=403, detail='Seul le professeur ayant créé cette instruction peut la fermer.')
        if thread['status'] == 'closed':
            return {'status': 'closed'}
        response = await client.patch('/rest/v1/private_instruction_threads', params={'id': f'eq.{thread_id}'}, headers=headers, json={'status': 'closed', 'closed_at': datetime.now(timezone.utc).isoformat(), 'closed_by': teacher['id']})
        if response.is_error:
            raise HTTPException(status_code=502, detail='Impossible de fermer la discussion.')
        await create_notifications(client, headers, [thread['student_id']], 'instruction', 'Discussion clôturée', 'Le professeur a clôturé cette instruction.', f'/eleve/instructions/{thread_id}')
    return {'status': 'closed'}


async def reopen_instruction_thread(
    thread_id: str,
    teacher: dict[str, str] = Depends(require_teacher),
    settings: Settings = Depends(server_settings),
) -> dict:
    headers = {'apikey': settings.supabase_secret_key, 'Content-Type': 'application/json', 'Prefer': 'return=representation'}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        thread_response = await client.get('/rest/v1/private_instruction_threads', params={'id': f'eq.{thread_id}', 'select': 'id,student_id,teacher_id,status'}, headers=headers)
        if thread_response.is_error or not thread_response.json():
            raise HTTPException(status_code=404, detail='Discussion introuvable.')
        thread = thread_response.json()[0]
        if thread['teacher_id'] != teacher['id']:
            raise HTTPException(status_code=403, detail='Seul le professeur ayant créé cette instruction peut la rouvrir.')
        if thread['status'] == 'open':
            return {'status': 'open'}
        response = await client.patch('/rest/v1/private_instruction_threads', params={'id': f'eq.{thread_id}'}, headers=headers, json={'status': 'open', 'closed_at': None, 'closed_by': None})
        if response.is_error:
            raise HTTPException(status_code=502, detail='Impossible de rouvrir la discussion.')
        await create_notifications(client, headers, [thread['student_id']], 'instruction', 'Discussion rouverte', 'Le professeur a rouvert cette instruction.', f'/eleve/instructions/{thread_id}')
    return {'status': 'open'}


async def delete_student(
    profile_id: str,
    _: dict[str, str] = Depends(require_teacher),
    settings: Settings = Depends(server_settings),
) -> dict[str, str]:
    """Permanently remove a student Auth account and its cascade-linked data."""
    headers = {'apikey': settings.supabase_secret_key,}
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
    headers = {'apikey': settings.supabase_secret_key, 'Content-Type': 'application/json'}
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
        move_response = await client.post('/rest/v1/rpc/move_student_to_class', headers=headers, json={'p_profile_id': profile_id, 'p_class_id': payload.class_id})
        if move_response.is_error:
            raise HTTPException(status_code=502, detail='Impossible de changer la classe de l’élève.')
    return {'status': 'moved'}


async def get_exercise_comments(
    exercise_id: str,
    profile: dict[str, str] = Depends(require_active_user),
    settings: Settings = Depends(server_settings),
) -> dict[str, list[dict]]:
    if not await accessible_exercises(profile, settings, exercise_id):
        raise HTTPException(status_code=404, detail='Exercice introuvable.')
    headers = {'apikey': settings.supabase_secret_key,}
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
        'apikey': settings.supabase_secret_key,
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

        questions = response.json()
        if not questions:
            return {'items': []}
        question_ids = [question['id'] for question in questions]
        replies = await client.get(
            '/rest/v1/comments',
            params={
                'parent_id': f"in.({','.join(question_ids)})",
                'status': 'eq.visible',
                'select': 'parent_id',
            },
            headers=headers,
        )
        if replies.is_error:
            raise HTTPException(status_code=502, detail='Impossible de charger les questions.')
        reply_counts: dict[str, int] = {}
        for reply in replies.json():
            parent_id = reply['parent_id']
            reply_counts[parent_id] = reply_counts.get(parent_id, 0) + 1

        items = []
        for question in questions:
            author = question.pop('profiles', None) or {}
            exercise = question.pop('exercises', None) or {}
            items.append({
                **question,
                'author': author.get('display_name', 'Utilisateur'),
                'exercise_title': exercise.get('title', 'Exercice'),
                'reply_count': reply_counts.get(question['id'], 0),
            })
    return {'items': items}


async def list_notifications(
    profile: dict[str, str] = Depends(require_active_user),
    settings: Settings = Depends(server_settings),
) -> dict[str, list[dict]]:
    headers = {'apikey': settings.supabase_secret_key,}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        response = await client.get('/rest/v1/notifications', params={'recipient_id': f"eq.{profile['id']}", 'select': 'id,type,title,body,href,read_at,created_at', 'order': 'created_at.desc'}, headers=headers)
    if response.is_error:
        raise HTTPException(status_code=502, detail='Impossible de charger les notifications.')
    return {'items': response.json()}


async def mark_notifications_read(
    notification_id: str | None = None,
    notification_type: str | None = None,
    profile: dict[str, str] = Depends(require_active_user),
    settings: Settings = Depends(server_settings),
) -> dict[str, str]:
    headers = {'apikey': settings.supabase_secret_key,}
    params = {'recipient_id': f"eq.{profile['id']}", 'read_at': 'is.null'}
    if notification_id:
        params['id'] = f'eq.{notification_id}'
    if notification_type:
        params['type'] = f'eq.{notification_type}'
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        response = await client.patch('/rest/v1/notifications', params=params, headers=headers, json={'read_at': datetime.now(timezone.utc).isoformat()})
    if response.is_error:
        raise HTTPException(status_code=502, detail='Impossible de mettre à jour les notifications.')
    return {'status': 'read'}


async def mark_instruction_notifications_read(
    profile: dict[str, str] = Depends(require_active_user),
    settings: Settings = Depends(server_settings),
) -> dict[str, str]:
    return await mark_notifications_read(notification_type='instruction', profile=profile, settings=settings)


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
        'apikey': settings.supabase_secret_key,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
    }
    parent_author_id: str | None = None
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        await enforce_write_rate_limit(client, settings, profile['id'], 'comment')
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
    if payload.action not in {'hide', 'restore', 'pin', 'resolve', 'lock'}:
        raise HTTPException(status_code=400, detail='Action de modération invalide.')
    headers = {'apikey': settings.supabase_secret_key, 'Content-Type': 'application/json', 'Prefer': 'return=representation'}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        current = await client.get('/rest/v1/comments', params={'id': f'eq.{comment_id}', 'select': 'id,status,is_pinned,is_resolved,is_locked'}, headers=headers)
        if not current.is_success or not current.json():
            raise HTTPException(status_code=404, detail='Commentaire introuvable.')
        comment = current.json()[0]
        comment_ids = [comment_id]
        if payload.action in {'hide', 'restore'}:
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
            'hide': {'status': 'hidden'},
            'restore': {'status': 'visible'},
            'pin': {'is_pinned': not comment['is_pinned']},
            'resolve': {'is_resolved': not comment['is_resolved']},
            'lock': {'is_locked': not comment['is_locked']},
        }[payload.action]
        target_ids = comment_ids if payload.action in {'hide', 'restore'} else [comment_id]
        updated = await client.patch('/rest/v1/comments', params={'id': f"in.({','.join(target_ids)})"}, headers=headers, json=changes)
        if payload.action == 'hide':
            await client.patch('/rest/v1/comment_reports', params={'comment_id': f"in.({','.join(target_ids)})", 'reviewed_at': 'is.null'}, headers=headers, json={'reviewed_at': datetime.now(timezone.utc).isoformat(), 'reviewed_by': teacher['id']})
    if updated.is_error:
        raise HTTPException(status_code=502, detail='Impossible de modérer ce commentaire.')
    return updated.json()[0]

async def dismiss_report(report_id: str, teacher: dict[str, str] = Depends(require_teacher), settings: Settings = Depends(server_settings)) -> dict:
    h={'apikey':settings.supabase_secret_key,'Content-Type':'application/json'}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        r=await client.patch('/rest/v1/comment_reports',params={'id':f'eq.{report_id}','reviewed_at':'is.null'},headers=h,json={'reviewed_at':datetime.now(timezone.utc).isoformat(),'reviewed_by':teacher['id']})
    if r.is_error: raise HTTPException(status_code=502,detail='Impossible de fermer ce signalement.')
    return {'status':'dismissed'}

async def report_comment(comment_id: str, payload: ReportPayload, profile: dict[str, str] = Depends(require_active_user), settings: Settings = Depends(server_settings)) -> dict:
    headers={'apikey':settings.supabase_secret_key,'Content-Type':'application/json','Prefer':'return=representation'}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        await enforce_write_rate_limit(client, settings, profile['id'], 'report')
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
    h={'apikey':settings.supabase_secret_key,}
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        reports=await client.get('/rest/v1/comment_reports',params={'reviewed_at':'is.null','select':'id,comment_id,reason,created_at','order':'created_at.asc'},headers=h)
        if reports.is_error: raise HTTPException(status_code=502,detail='Impossible de charger les signalements.')
        report_items = reports.json()
        comment_ids = [report['comment_id'] for report in report_items]
        comments_by_id: dict[str, dict] = {}
        if comment_ids:
            comments = await client.get(
                '/rest/v1/comments',
                params={
                    'id': f"in.({','.join(comment_ids)})",
                    'select': 'id,body,profiles(display_name),exercises(title)',
                },
                headers=h,
            )
            if comments.is_error:
                raise HTTPException(status_code=502, detail='Impossible de charger les signalements.')
            comments_by_id = {comment['id']: comment for comment in comments.json()}
        items=[]
        for report in report_items:
            data = comments_by_id.get(report['comment_id'], {})
            author=data.get('profiles') or {}; exercise=data.get('exercises') or {}
            items.append({**report,'comment':data.get('body','Commentaire supprimé'),'author':author.get('display_name','Utilisateur'),'exercise_title':exercise.get('title','Exercice')})
    return {'items':items}


async def list_hidden_comments(
    limit: int = Query(default=10, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    _: dict[str, str] = Depends(require_teacher),
    settings: Settings = Depends(server_settings),
) -> dict:
    """Return comments hidden by a teacher so a moderation decision can be reversed."""
    headers = {
        'apikey': settings.supabase_secret_key,
        'Prefer': 'count=exact',
        'Range': f'{offset}-{offset + limit - 1}',
    }
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as client:
        response = await client.get(
            '/rest/v1/comments',
            params={
                'status': 'eq.hidden',
                'select': 'id,body,created_at,profiles(display_name),exercises(title)',
                'order': 'created_at.desc',
            },
            headers=headers,
        )
    if response.is_error:
        raise HTTPException(status_code=502, detail='Impossible de charger les commentaires masqués.')

    items = []
    for comment in response.json():
        author = comment.pop('profiles', None) or {}
        exercise = comment.pop('exercises', None) or {}
        items.append({
            **comment,
            'author': author.get('display_name', 'Utilisateur'),
            'exercise_title': exercise.get('title', 'Exercice'),
        })
    content_range = response.headers.get('content-range', '')
    try:
        total = int(content_range.rsplit('/', 1)[1])
    except (IndexError, ValueError):
        total = offset + len(items)
    return {'items': items, 'next_offset': offset + len(items), 'has_more': offset + len(items) < total}


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
        'apikey': settings.supabase_secret_key,
    }
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=30) as client:
        await enforce_write_rate_limit(client, settings, teacher['id'], 'exercise_upload')
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
    headers = {'apikey': settings.supabase_secret_key,}
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
        'apikey': settings.supabase_secret_key,
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
        'apikey': settings.supabase_secret_key,
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
