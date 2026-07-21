from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "Malwa CRM API"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_PREFIX: str = "/api"

    DATABASE_URL: str = "mysql+pymysql://crm_user:password@127.0.0.1:3306/malwa_crm?charset=utf8mb4"

    JWT_SECRET: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    SEED_ADMIN_EMAIL: str = "admin@malwatrolley.com"
    SEED_ADMIN_PASSWORD: str = "ChangeMe822!"
    SEED_ADMIN_NAME: str = "Malwa Admin"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
