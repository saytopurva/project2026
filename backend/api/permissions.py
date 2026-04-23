"""
DRF permissions — SMS access requires approved profile (except /api/me/).
"""

from rest_framework.permissions import BasePermission

from .rbac import user_has_operational_access


class IsAuthenticatedAndSmsApproved(BasePermission):
    """
    JWT-authenticated users only. Pending UNASSIGNED users may only call GET /api/me/.
    """

    message = 'Access pending approval by administration.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if getattr(user, 'is_superuser', False):
            return True
        path = request.path or ''
        if path.rstrip('/').endswith('/me') or '/me/' in path:
            return True
        return user_has_operational_access(user)
