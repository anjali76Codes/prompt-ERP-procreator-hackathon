"""Agent contract.

Agents are the chat/reasoning layer. They consume a user message + history,
optionally call tools from the registry, and emit a reply (and optionally a
Workflow plan).
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from app.core.security import AuthPrincipal
from app.schemas.chat import ChatMessage, ChatResponse


class Agent(ABC):
    """Base class for chat agents. Implementations live in sibling modules."""

    @abstractmethod
    async def chat(
        self,
        *,
        message: str,
        history: list[ChatMessage],
        principal: AuthPrincipal,
    ) -> ChatResponse: ...
