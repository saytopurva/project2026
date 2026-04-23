"""
Email OTP login — public endpoints returning JWT.
"""

from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.mail import send_mail
from django.db.models import F
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from .models import LoginOTP
from .rbac import get_profile, profile_to_claims

User = get_user_model()
logger = logging.getLogger(__name__)


def _hash_otp(email: str, otp: str) -> str:
    pepper = getattr(settings, 'OTP_PEPPER', settings.SECRET_KEY)
    raw = f'{pepper}|{email.strip().lower()}|{otp}'.encode()
    return hashlib.sha256(raw).hexdigest()


def _otp_expiry():
    return timedelta(minutes=getattr(settings, 'OTP_EXPIRY_MINUTES', 5))


def _max_verify_attempts():
    return getattr(settings, 'OTP_MAX_VERIFY_ATTEMPTS', 5)


def _hourly_send_count(email: str) -> int:
    return int(cache.get(f'otp_send_rl:{email.lower()}', 0))


def _burst_send_count(email: str) -> int:
    return int(cache.get(f'otp_burst:{email.lower()}', 0))


def _record_successful_send(email: str) -> None:
    """After email is queued — burst window + hourly cap."""
    elower = email.lower()
    window = getattr(settings, 'OTP_BURST_WINDOW_SECONDS', 900)
    n_b = cache.get(f'otp_burst:{elower}', 0)
    cache.set(f'otp_burst:{elower}', n_b + 1, window)

    n_h = cache.get(f'otp_send_rl:{elower}', 0)
    cache.set(f'otp_send_rl:{elower}', n_h + 1, 3600)


def _otp_delivery_requires_smtp_credentials() -> bool:
    eb = (getattr(settings, 'EMAIL_BACKEND', '') or '').lower()
    return eb.endswith('smtp.emailbackend')


def _issue_tokens_response(user: User, *, auth_method: str | None = None) -> dict:
    refresh = RefreshToken.for_user(user)
    name = (user.get_full_name() or '').strip() or (user.first_name or '').strip()
    if not name:
        name = user.email.split('@')[0] if user.email else 'User'
    last_login = user.last_login.isoformat() if user.last_login else None
    p = get_profile(user)
    claims = profile_to_claims(p)
    picture = (p.avatar_url or '') if p else ''
    method = auth_method or 'otp'
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'email': user.email or user.username,
            'name': name,
            'last_login': last_login,
            'role': claims['role'],
            'picture': picture,
            'auth_method': method,
        },
    }


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def send_otp(request):
    """
    POST /api/auth/send-otp/  Body: { "email": "..." }
    """
    email = (request.data.get('email') or '').strip().lower()
    if not email:
        return Response({'detail': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

    if _otp_delivery_requires_smtp_credentials() and (
        not getattr(settings, 'EMAIL_HOST_USER', None)
        or not getattr(settings, 'EMAIL_HOST_PASSWORD', None)
    ):
        logger.error('OTP requested but SMTP credentials are not configured.')
        return Response(
            {
                'detail': 'Email is not configured on the server. Set EMAIL_HOST_USER and EMAIL_HOST_PASSWORD (Gmail app password).',
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    if _burst_send_count(email) >= getattr(settings, 'OTP_MAX_BURST_SENDS', 3):
        return Response(
            {
                'detail': 'Too many code requests in a short period. Wait a few minutes and try again.',
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    if _hourly_send_count(email) >= getattr(settings, 'OTP_MAX_SENDS_PER_HOUR', 5):
        return Response(
            {'detail': 'Too many verification requests for this email. Try again in about an hour.'},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    LoginOTP.objects.filter(email=email, is_used=False).delete()
    code = f'{secrets.randbelow(900000) + 100000}'
    now = timezone.now()
    expires = now + _otp_expiry()
    row = LoginOTP.objects.create(
        email=email,
        otp=_hash_otp(email, code),
        expires_at=expires,
    )

    subject = getattr(settings, 'OTP_EMAIL_SUBJECT', 'Your Login OTP')
    expiry_minutes = getattr(settings, 'OTP_EXPIRY_MINUTES', 5)
    body = (
        f'Your OTP is: {code}. It will expire in {expiry_minutes} minutes.\n\n'
        f'If you did not request this, you can ignore this email.'
    )
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or settings.EMAIL_HOST_USER

    try:
        send_mail(
            subject,
            body,
            from_email,
            [email],
            fail_silently=False,
        )
    except Exception as e:
        logger.exception('Failed to send OTP email: %s', e)
        row.delete()
        return Response(
            {'detail': 'Could not send email. Check SMTP settings and app password.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    _record_successful_send(email)

    payload = {
        'detail': 'Verification code sent.',
        'expires_in_seconds': int((row.expires_at - now).total_seconds()),
        'resend_after_seconds': getattr(settings, 'OTP_RESEND_COOLDOWN_SECONDS', 30),
    }
    if settings.DEBUG and not _otp_delivery_requires_smtp_credentials():
        payload['dev_otp_code'] = code

    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def verify_otp(request):
    """
    POST /api/auth/verify-otp/  Body: { "email": "...", "otp": "123456" }
    """
    email = (request.data.get('email') or '').strip().lower()
    otp = (request.data.get('otp') or '').strip().replace(' ', '')
    if not email:
        return Response({'detail': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(otp) != 6 or not otp.isdigit():
        return Response({'detail': 'Enter the 6-digit code.'}, status=status.HTTP_400_BAD_REQUEST)

    row = LoginOTP.objects.filter(email=email, is_used=False).order_by('-created_at').first()
    if not row:
        return Response(
            {'detail': 'No verification code found. Request a new code.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    now = timezone.now()
    if row.expires_at <= now:
        return Response(
            {'detail': 'Code expired. Request a new one.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if row.verify_attempts >= _max_verify_attempts():
        return Response(
            {'detail': 'Too many incorrect attempts. Request a new code.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    if not secrets.compare_digest(_hash_otp(email, otp), row.otp):
        LoginOTP.objects.filter(pk=row.pk).update(verify_attempts=F('verify_attempts') + 1)
        return Response({'detail': 'Invalid code.'}, status=status.HTTP_400_BAD_REQUEST)

    row.is_used = True
    row.save(update_fields=['is_used'])

    user, created = User.objects.get_or_create(
        username=email,
        defaults={
            'email': email,
            'first_name': email.split('@')[0][:150],
        },
    )
    if created:
        user.set_unusable_password()
        user.save()

    user.last_login = now
    user.save(update_fields=['last_login'])

    return Response(_issue_tokens_response(user, auth_method='otp'), status=status.HTTP_200_OK)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def logout_all_devices(request):
    """
    POST /api/auth/logout-all/
    Blacklist all outstanding refresh tokens for this user (other devices / sessions).
    """
    user = request.user
    qs = OutstandingToken.objects.filter(user=user)
    for ot in qs:
        BlacklistedToken.objects.get_or_create(token=ot)
    return Response(
        {'detail': 'Signed out from all devices. Sign in again with email OTP.'},
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def google_login(request):
    """
    POST /api/auth/google-login/
    Body: { "token": "<Google ID token (JWT)>" }
    Verifies token with Google; creates/links Django user; returns JWT (same shape as verify-otp).
    """
    client_id = (getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', '') or '').strip()
    if not client_id:
        return Response(
            {
                'detail': 'Google sign-in is not configured on the server (GOOGLE_OAUTH_CLIENT_ID).',
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    raw = request.data.get('token') or request.data.get('id_token') or ''
    token = str(raw).strip()
    if not token:
        return Response({'detail': 'token is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        idinfo = google_id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            client_id,
        )
    except ValueError as e:
        logger.warning('Invalid Google ID token: %s', e)
        return Response(
            {'detail': 'Invalid or expired Google token.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    iss = idinfo.get('iss')
    if iss not in ('accounts.google.com', 'https://accounts.google.com'):
        return Response({'detail': 'Invalid token issuer.'}, status=status.HTTP_401_UNAUTHORIZED)

    if idinfo.get('email_verified') is False:
        return Response(
            {'detail': 'Email not verified with Google.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    email = (idinfo.get('email') or '').strip().lower()
    if not email:
        return Response({'detail': 'No email in Google token.'}, status=status.HTTP_400_BAD_REQUEST)

    given = (idinfo.get('given_name') or '').strip()
    family = (idinfo.get('family_name') or '').strip()
    display_name = (idinfo.get('name') or '').strip()
    if not display_name and (given or family):
        display_name = f'{given} {family}'.strip()
    if not display_name:
        display_name = email.split('@')[0]

    if given:
        first_name = given[:150]
    else:
        first_name = (display_name.split()[0] if display_name else email.split('@')[0])[:150]

    picture = (idinfo.get('picture') or '').strip()[:512]

    now = timezone.now()
    user, created = User.objects.get_or_create(
        username=email,
        defaults={
            'email': email,
            'first_name': first_name,
        },
    )
    if created:
        user.set_unusable_password()
        user.save()
    else:
        to_update = []
        if email and user.email != email:
            user.email = email
            to_update.append('email')
        if not (user.first_name or '').strip() and first_name:
            user.first_name = first_name
            to_update.append('first_name')
        if to_update:
            user.save(update_fields=to_update)

    user.last_login = now
    user.save(update_fields=['last_login'])

    p = get_profile(user)
    if p is None:
        return Response(
            {'detail': 'User profile missing. Contact support.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    if picture and p.avatar_url != picture:
        p.avatar_url = picture
        p.save(update_fields=['avatar_url'])

    return Response(_issue_tokens_response(user, auth_method='google'), status=status.HTTP_200_OK)
