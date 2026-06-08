import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./forecastiq.db")
    OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY", None)
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    CLERK_SECRET_KEY: str | None = os.getenv("CLERK_SECRET_KEY", None)
    
    # Target CPA/ROAS thresholds used for rules
    TARGET_ROAS: float = 2.0
    TARGET_CPA: float = 30.0

    class Config:
        env_file = ".env"

settings = Settings()
