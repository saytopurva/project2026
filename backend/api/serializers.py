from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import (
    AcademicDetails,
    Certificate,
    Event,
    FeesDetails,
    Notice,
    ParentDetails,
    Student,
    UserProfile,
)

User = get_user_model()


class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = '__all__'


class StudentLimitedSerializer(serializers.ModelSerializer):
    """Subject teachers: minimal student fields."""

    class Meta:
        model = Student
        fields = ['id', 'name', 'student_class', 'roll_no', 'division']


class UserProfileSerializer(serializers.ModelSerializer):
    assigned_subject_name = serializers.CharField(source='assigned_subject.name', read_only=True)

    class Meta:
        model = UserProfile
        fields = ['role', 'assigned_class', 'assigned_subject', 'assigned_subject_name']


class MeSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    email = serializers.EmailField(read_only=True)
    name = serializers.CharField(read_only=True)
    role = serializers.CharField(read_only=True)
    assigned_class = serializers.CharField(read_only=True)
    assigned_subject_id = serializers.IntegerField(allow_null=True, read_only=True)
    assigned_subject_name = serializers.CharField(allow_null=True, read_only=True)
    rbac_label = serializers.CharField(read_only=True)


class CreateTeacherSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    name = serializers.CharField(max_length=150)
    role = serializers.ChoiceField(choices=UserProfile.Role.choices)
    assigned_class = serializers.CharField(max_length=40, required=False, allow_blank=True)
    assigned_subject = serializers.PrimaryKeyRelatedField(
        queryset=__import__('marks.models', fromlist=['Subject']).Subject.objects.all(),
        required=False,
        allow_null=True,
    )

    def validate(self, attrs):
        role = attrs['role']
        if role in (UserProfile.Role.CLASS_TEACHER,) and not (attrs.get('assigned_class') or '').strip():
            raise serializers.ValidationError({'assigned_class': 'Required for class teacher.'})
        if role == UserProfile.Role.SUBJECT_TEACHER and not attrs.get('assigned_subject'):
            raise serializers.ValidationError({'assigned_subject': 'Required for subject teacher.'})
        return attrs

    def create(self, validated_data):
        email = validated_data['email'].strip().lower()
        if User.objects.filter(username=email).exists():
            raise serializers.ValidationError({'email': 'A user with this email already exists.'})
        u = User.objects.create_user(
            username=email,
            email=email,
            password=validated_data['password'],
            first_name=validated_data['name'][:150],
        )
        subj = validated_data.get('assigned_subject')
        profile, _ = UserProfile.objects.update_or_create(
            user=u,
            defaults={
                'role': validated_data['role'],
                'assigned_class': (validated_data.get('assigned_class') or '').strip(),
                'assigned_subject': subj,
            },
        )
        return u


class ParentDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParentDetails
        fields = [
            'mother_name',
            'father_name',
            'parents_phone',
            'parents_occupation',
        ]


class AcademicDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicDetails
        fields = [
            'attendance_percentage',
            'overall_result',
            'semester',
            'performance',
            'creativity',
            'teacher_remarks',
        ]


class FeesDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeesDetails
        fields = ['fees_paid', 'amount', 'payment_date']


class CertificateSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Certificate
        fields = ['id', 'title', 'year', 'file', 'file_url', 'created_at']
        read_only_fields = ['id', 'file_url', 'created_at']

    def get_file_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get('request')
        url = obj.file.url
        if request:
            return request.build_absolute_uri(url)
        return url


class StudentDetailSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField(read_only=True)
    parents = ParentDetailsSerializer(required=False, allow_null=True)
    academic = AcademicDetailsSerializer(required=False, allow_null=True)
    fees = FeesDetailsSerializer(required=False, allow_null=True)
    certificates = CertificateSerializer(many=True, read_only=True)

    class Meta:
        model = Student
        fields = [
            'id',
            'name',
            'email',
            'parent_email',
            'parent_phone',
            'student_class',
            'roll_no',
            'photo',
            'photo_url',
            'dob',
            'gender',
            'phone_number',
            'address',
            'division',
            'height',
            'weight',
            'parents',
            'academic',
            'fees',
            'certificates',
        ]

    def get_photo_url(self, obj):
        if not obj.photo:
            return None
        request = self.context.get('request')
        url = obj.photo.url
        if request:
            return request.build_absolute_uri(url)
        return url

    def update(self, instance, validated_data):
        parents_data = validated_data.pop('parents', None)
        academic_data = validated_data.pop('academic', None)
        fees_data = validated_data.pop('fees', None)

        # Update base student fields (including photo)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if parents_data is not None:
            ParentDetails.objects.update_or_create(student=instance, defaults=parents_data)
        if academic_data is not None:
            AcademicDetails.objects.update_or_create(student=instance, defaults=academic_data)
        if fees_data is not None:
            FeesDetails.objects.update_or_create(student=instance, defaults=fees_data)

        return instance


class NoticeSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField(read_only=True)
    is_mine = serializers.SerializerMethodField(read_only=True)
    attachment_url = serializers.SerializerMethodField(read_only=True)
    attachment = serializers.FileField(
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Notice
        fields = [
            'id',
            'title',
            'content',
            'is_important',
            'attachment',
            'attachment_url',
            'created_at',
            'created_by',
            'author_name',
            'is_mine',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'created_by',
            'author_name',
            'is_mine',
            'attachment_url',
        ]

    def get_author_name(self, obj):
        u = obj.created_by
        full = (u.get_full_name() or '').strip()
        if full:
            return full
        if (u.first_name or '').strip():
            return u.first_name.strip()
        return u.username or u.email or 'Staff'

    def get_is_mine(self, obj):
        request = self.context.get('request')
        if not request or not getattr(request.user, 'is_authenticated', False):
            return False
        return obj.created_by_id == request.user.id

    def get_attachment_url(self, obj):
        if not obj.attachment:
            return None
        request = self.context.get('request')
        url = obj.attachment.url
        if request:
            return request.build_absolute_uri(url)
        return url

    def validate(self, attrs):
        v = attrs.get('is_important')
        if isinstance(v, str):
            attrs['is_important'] = v.lower() in ('true', '1', 'yes', 'on')
        return attrs

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class EventSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField(read_only=True)
    is_mine = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Event
        fields = [
            'id',
            'title',
            'description',
            'date',
            'event_type',
            'created_at',
            'created_by',
            'author_name',
            'is_mine',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'created_by',
            'author_name',
            'is_mine',
        ]

    def get_author_name(self, obj):
        u = obj.created_by
        full = (u.get_full_name() or '').strip()
        if full:
            return full
        if (u.first_name or '').strip():
            return u.first_name.strip()
        return u.username or u.email or 'Staff'

    def get_is_mine(self, obj):
        request = self.context.get('request')
        if not request or not getattr(request.user, 'is_authenticated', False):
            return False
        return obj.created_by_id == request.user.id

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)
