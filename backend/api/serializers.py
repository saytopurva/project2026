from rest_framework import serializers
from .models import (
    AcademicDetails,
    Attendance,
    Certificate,
    Event,
    FeesDetails,
    Marks,
    Notice,
    ParentDetails,
    Student,
)


class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = '__all__'


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
            'unit_test_marks',
            'surprise_test_marks',
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


class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    marked_by_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Attendance
        fields = [
            'id',
            'student',
            'student_name',
            'date',
            'status',
            'leave_reason',
            'marked_by',
            'marked_by_name',
            'created_at',
        ]
        read_only_fields = ['marked_by', 'marked_by_name', 'created_at']

    def get_marked_by_name(self, obj):
        u = obj.marked_by
        if not u:
            return ''
        full = (u.get_full_name() or '').strip()
        if full:
            return full
        return u.username or u.email or ''

    def validate(self, attrs):
        attrs = super().validate(attrs)
        instance = getattr(self, 'instance', None)
        status_val = attrs.get('status', getattr(instance, 'status', None) if instance else None)
        lr = attrs.get('leave_reason', None)
        if instance is not None and lr is None:
            lr = instance.leave_reason
        elif instance is None and lr is None:
            lr = ''
        if status_val == Attendance.Status.LEAVE and not (lr or '').strip():
            raise serializers.ValidationError(
                {'leave_reason': 'Leave reason is required when status is Leave.'}
            )

        student = attrs.get('student', getattr(instance, 'student', None) if instance else None)
        date_val = attrs.get('date', getattr(instance, 'date', None) if instance else None)
        if student and date_val:
            qs = Attendance.objects.filter(student=student, date=date_val)
            if instance is not None:
                qs = qs.exclude(pk=instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {'detail': 'Attendance for this student on this date already exists.'}
                )
        return attrs

    def create(self, validated_data):
        validated_data['marked_by'] = self.context['request'].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data['marked_by'] = self.context['request'].user
        return super().update(instance, validated_data)


class MarksSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)

    class Meta:
        model = Marks
        fields = ['id', 'student', 'student_name', 'subject', 'marks']

    def validate_marks(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError('Marks must be between 0 and 100.')
        return value


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
