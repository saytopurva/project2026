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
    # First user in DB → Principal; others default to class teacher until staff assigns role
    role = (
        UserProfile.Role.PRINCIPAL
        if User.objects.count() <= 1
        else UserProfile.Role.CLASS_TEACHER
    )
    UserProfile.objects.create(user=instance, role=role)
