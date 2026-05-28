# backend/apps/tenants/utils.py

from apps.tenants.models import Tenant


def get_tenant(request) -> Tenant:
    """
    Returns the tenant for the current request user.
    Raises if user has no tenant — shouldn't happen in production
    but we want a loud failure rather than data leakage.
    """
    tenant = getattr(request.user, "tenant", None)
    if tenant is None:
        raise ValueError("User has no associated tenant.")
    return tenant