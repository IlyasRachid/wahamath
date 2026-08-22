import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / '.env.local')


@dataclass(frozen=True)
class Settings:
    frontend_origins: list[str]
    supabase_url: str | None
    supabase_service_role_key: str | None


def get_settings() -> Settings:
    origins = os.getenv('FRONTEND_ORIGINS', 'http://localhost:3000')
    supabase_url = os.getenv('SUPABASE_URL', '').rstrip('/')
    # Supabase client libraries expect the project root. Accept a copied REST
    # endpoint too, so local configuration remains recoverable.
    if supabase_url.endswith('/rest/v1'):
        supabase_url = supabase_url.removesuffix('/rest/v1')
    return Settings(
        frontend_origins=[origin.strip() for origin in origins.split(',') if origin.strip()],
        supabase_url=supabase_url or None,
        supabase_service_role_key=os.getenv('SUPABASE_SERVICE_ROLE_KEY'),
    )
