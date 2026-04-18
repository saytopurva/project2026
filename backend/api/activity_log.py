"""Write ActivityLog rows (audit)."""

from __future__ import annotations

from typing import Any

from .models import ActivityLog


def log_activity(
    user,
    action: str,
    *,
    target: str = '',
    metadata: dict[str, Any] | None = None,
) -> None:
    try:
        ActivityLog.objects.create(
            user=user if user and getattr(user, 'is_authenticated', False) else None,
            action=action,
            target=target[:200],
            metadata=metadata or {},
        )
    except Exception:
        pass
