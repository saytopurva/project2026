from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import UserProfile

User = get_user_model()


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if not created:
        return
    if UserProfile.objects.filter(user=instance).exists():
        return
    # Bootstrap: first user becomes Principal (approved). Everyone else starts UNASSIGNED pending.
    if User.objects.count() <= 1:
        UserProfile.objects.create(
            user=instance,
            role=UserProfile.Role.PRINCIPAL,
            approval_status=UserProfile.ApprovalStatus.APPROVED,
        )
    else:
        UserProfile.objects.create(
            user=instance,
            role=UserProfile.Role.UNASSIGNED,
            approval_status=UserProfile.ApprovalStatus.PENDING,
        )
