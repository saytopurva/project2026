from django.contrib.auth import get_user_model
from rest_framework import serializers

from marks.models import Subject

from .models import ClassSchedule, Substitution

User = get_user_model()


class SubjectMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'name']


class TeacherMiniSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'name']

    def get_name(self, obj):
        return (obj.get_full_name() or obj.first_name or obj.username or '').strip()


class ClassScheduleSerializer(serializers.ModelSerializer):
    subject = SubjectMiniSerializer(read_only=True)

    class Meta:
        model = ClassSchedule
        fields = [
            'id',
            'day',
            'start_time',
            'end_time',
            'class_name',
            'subject',
        ]


class FreeSlotSerializer(serializers.Serializer):
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()


class SubstitutionSerializer(serializers.ModelSerializer):
    subject = SubjectMiniSerializer(read_only=True)
    original_teacher = TeacherMiniSerializer(read_only=True)
    substitute_teacher = TeacherMiniSerializer(read_only=True, allow_null=True)

    class Meta:
        model = Substitution
        fields = [
            'id',
            'date',
            'start_time',
            'end_time',
            'class_name',
            'subject',
            'original_teacher',
            'substitute_teacher',
            'status',
        ]


class AssignSubstitutionSerializer(serializers.Serializer):
    substitution_id = serializers.IntegerField()
    substitute_teacher_id = serializers.IntegerField(required=False, allow_null=True)

