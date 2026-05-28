# backend/apps/accounts/models.py

from django.contrib.auth.models import AbstractUser
from django.db import models
from apps.tenants.models import Tenant


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        ANALYST = "analyst", "Analyst"
        VIEWER = "viewer", "Viewer"

    tenant = models.ForeignKey(
        Tenant, on_delete=models.CASCADE, related_name="users", null=True, blank=True
    )
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.VIEWER)

    class Meta:
        db_table = "users"
        indexes = [models.Index(fields=["tenant", "role"])]