"""
app/core/roles.py
Central definition of roles and their permissions.

This replaces the role_collections DB round-trip on every login.
Roles are a closed set – adding a new one requires a code change and deploy,
which is the correct security posture for a SaaS.

Roles (in descending privilege order):
  owner   – the user who created the org. Full control including billing.
  admin   – can manage members, KB, and projects. Cannot delete the org.
  agent   – can chat and read KB. Cannot manage members.
  viewer  – read-only access to chat history and KB.
"""

from __future__ import annotations

ROLE_PERMISSIONS: dict[str, list[str]] = {
    "owner": [
        "org:manage",        # suspend/delete org, change plan
        "user:create",
        "user:read",
        "user:delete",
        "project:create",
        "project:read",
        "project:update",
        "project:delete",
        "kb:write",
        "kb:read",
        "kb:delete",
        "chat:write",
        "chat:read",
        "audit:read",
    ],
    "admin": [
        "user:create",
        "user:read",
        "project:create",
        "project:read",
        "project:update",
        "project:delete",
        "kb:write",
        "kb:read",
        "kb:delete",
        "chat:write",
        "chat:read",
        "audit:read",
    ],
    "agent": [
        "project:read",
        "kb:read",
        "chat:write",
        "chat:read",
    ],
    "viewer": [
        "project:read",
        "kb:read",
        "chat:read",
    ],
}

VALID_ROLES = set(ROLE_PERMISSIONS.keys())


def get_permissions(role: str) -> list[str]:
    """
    Return the permission list for a role.
    Raises ValueError if the role is not recognized – callers must handle this.
    """
    if role not in ROLE_PERMISSIONS:
        raise ValueError(
            f"Unknown role '{role}'. "
            f"Valid roles are: {sorted(VALID_ROLES)}"
        )
    return ROLE_PERMISSIONS[role]


def validate_role(role: str) -> str:
    """Validate and return the role string, or raise ValueError."""
    if role not in VALID_ROLES:
        raise ValueError(
            f"Invalid role '{role}'. "
            f"Valid roles are: {sorted(VALID_ROLES)}"
        )
    return role
