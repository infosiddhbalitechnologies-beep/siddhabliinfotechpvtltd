import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Gemini
    gemini_api_key: str = os.environ.get("GEMINI_API_KEY", "")
    gemini_model: str = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

    # Supabase (same project/tables the website already uses — the service
    # role key bypasses RLS, which is fine here because this process is a
    # trusted backend, never exposed directly to the browser).
    supabase_url: str = os.environ.get("SUPABASE_URL", "")
    supabase_service_role_key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    # Publishable ("anon") key — same one the website's .env calls
    # SUPABASE_PUBLISHABLE_KEY. Used only to verify a visitor's access token
    # and, where possible, to run ticket-creation inserts through an
    # RLS-scoped client (defense in depth) instead of the all-powerful
    # service-role client.
    supabase_publishable_key: str = os.environ.get("SUPABASE_PUBLISHABLE_KEY", "")

    # CORS — comma-separated list of allowed origins, e.g.
    # "https://sidddhbali.tech,https://www.sidddhbali.tech"
    cors_origins: list[str] = [
        o.strip()
        for o in os.environ.get("CORS_ORIGINS", "*").split(",")
        if o.strip()
    ]

    def validate(self) -> None:
        missing = []
        if not self.gemini_api_key:
            missing.append("GEMINI_API_KEY")
        if not self.supabase_url:
            missing.append("SUPABASE_URL")
        if not self.supabase_service_role_key:
            missing.append("SUPABASE_SERVICE_ROLE_KEY")
        if missing:
            raise RuntimeError(
                f"Missing required environment variable(s): {', '.join(missing)}"
            )
        if not self.supabase_publishable_key:
            print(
                "[config] SUPABASE_PUBLISHABLE_KEY is not set — authenticated "
                "features (ticket creation) will always be treated as "
                "unauthenticated until it's configured."
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()
