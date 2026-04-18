from rest_framework import serializers

from api.date_utils import parse_calendar_date, student_pk
from api.models import Student

from .models import Attendance


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
            'reason',
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

        if instance is None:
            st_raw = attrs.get('student')
            d_raw = attrs.get('date')
        else:
            st_raw = attrs.get('student', instance.student)
            d_raw = attrs.get('date', instance.date)

        status_val = attrs.get('status', getattr(instance, 'status', None) if instance else None)
        reason = attrs.get('reason')
        if instance is not None and reason is None:
            reason = instance.reason
        reason = (reason or '').strip()

        if status_val == Attendance.Status.PRESENT:
            attrs['reason'] = ''
        elif status_val in (Attendance.Status.ABSENT, Attendance.Status.LEAVE):
            if not reason:
                raise serializers.ValidationError(
                    {'reason': 'Reason is required when status is Absent or Leave.'}
                )
            attrs['reason'] = reason

        pk_stu = student_pk(st_raw) if st_raw is not None else None
        date_val = parse_calendar_date(d_raw) if d_raw is not None else None
        if pk_stu is not None and date_val is not None:
            qs = Attendance.objects.filter(student_id=pk_stu, date=date_val)
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
