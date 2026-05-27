"""Application configuration loaded from environment / .env."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Strongly-typed settings. Reads from `.env` and process env vars."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Server ----------------------------------------------------------
    host: str = "0.0.0.0"
    port: int = 8000
    environment: Literal["development", "staging", "production"] = "development"
    cors_origins: str = "http://localhost:5173"

    # --- Logging ---------------------------------------------------------
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    log_json: bool = False

    # --- Auth bridge -----------------------------------------------------
    jwt_secret: str = Field(default="", description="Same secret as the Node backend")
    jwt_algorithm: Literal["HS256", "HS384", "HS512"] = "HS256"

    # --- Node backend ----------------------------------------------------
    # The Express backend listens on :3000 (see express-backend/.env).
    node_api_url: str = "http://localhost:3000/api"

    # --- Google Gemini ---------------------------------------------------
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    gemini_max_output_tokens: int = 4096
    # Lower temperature → more deterministic tool-arg extraction.
    gemini_temperature: float = 0.1

    # --- MCP -------------------------------------------------------------
    mcp_servers: str = ""

    @field_validator("cors_origins")
    @classmethod
    def _strip_origins(cls, v: str) -> str:
        return ",".join(o.strip() for o in v.split(",") if o.strip())

    @property
    def cors_origin_list(self) -> list[str]:
        return [o for o in self.cors_origins.split(",") if o]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached settings accessor. Call this from FastAPI deps / startup code."""
    return Settings()
