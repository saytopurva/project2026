"""JWT payload + login response includes RBAC claims."""

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .rbac import get_profile, profile_to_claims


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        profile = get_profile(user)
        claims = profile_to_claims(profile)
        token['role'] = claims['role']
        token['assigned_class'] = claims['assigned_class']
        token['assigned_classes'] = claims.get('assigned_classes') or []
        token['subject_id'] = claims['assigned_subject_id']
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        profile = get_profile(self.user)
        claims = profile_to_claims(profile)
        data['role'] = claims['role']
        data['assigned_class'] = claims['assigned_class']
        data['assigned_classes'] = claims.get('assigned_classes') or []
        data['assigned_subject_id'] = claims['assigned_subject_id']
        return data
