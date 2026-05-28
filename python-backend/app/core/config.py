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
    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8000, alias="PORT")
    environment: Literal["development", "staging", "production"] = Field(
        default="development",
        alias="ENVIRONMENT",
    )
    cors_origins: str = Field(
        default="http://localhost:5173",
        alias="CORS_ORIGINS",
    )

    # --- Logging ---------------------------------------------------------
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO",
        alias="LOG_LEVEL",
    )
    log_json: bool = Field(default=False, alias="LOG_JSON")

    # --- Auth bridge -----------------------------------------------------
    jwt_secret: str = Field(
        default="",
        alias="JWT_SECRET",
        description="Same secret as the Node backend",
    )
    jwt_algorithm: Literal["HS256", "HS384", "HS512"] = Field(
        default="HS256",
        alias="JWT_ALGORITHM",
    )

    # --- Node backend ----------------------------------------------------
    node_api_url: str = Field(
        default="http://localhost:3000/api",
        alias="NODE_API_URL",
    )

    # --- Google Gemini ---------------------------------------------------
    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")
    gemini_model: str = Field(
        default="gemini-2.0-flash",
        alias="GEMINI_MODEL",
    )
    gemini_max_output_tokens: int = Field(
        default=4096,
        alias="GEMINI_MAX_OUTPUT_TOKENS",
    )
    gemini_temperature: float = Field(
        default=0.1,
        alias="GEMINI_TEMPERATURE",
    )

    # --- MCP -------------------------------------------------------------
    mcp_servers: str = Field(default="", alias="MCP_SERVERS")

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