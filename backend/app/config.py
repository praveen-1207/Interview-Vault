from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables (.env)."""

    app_name: str = "InterviewVault API"
    api_prefix: str = "/api/v1"

    database_url: str = (
        "postgresql+psycopg://postgres:postgres@localhost:5432/interviewvault"
    )

    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.6-flash"

    allowed_origins: str = "http://localhost:5173"

    # Community / admin
    admin_emails: str = ""

    # AI quota and safety limits
    max_ai_evaluations_per_interview: int = 5
    max_ai_input_chars: int = 20000
    ai_request_timeout_seconds: float = 60.0
    rate_limit_requests_per_minute: int = 20

    # Public feed
    community_page_size: int = 20

    @property
    def cors_origins(self) -> list[str]:
        """Comma-separated ALLOWED_ORIGINS parsed into a list."""
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def admin_email_set(self) -> set[str]:
        """Lower-cased emails that should be promoted to admin."""
        return {email.strip().lower() for email in self.admin_emails.split(",") if email.strip()}

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
