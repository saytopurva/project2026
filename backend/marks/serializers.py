from rest_framework import serializers

from .exam_totals import total_marks_for_exam_slug
from .models import ExamType, Marks, Subject
from .services.grading import letter_grade, percentage


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'name']


class ExamTypeSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='get_slug_display', read_only=True)
    max_marks = serializers.SerializerMethodField()

    class Meta:
        model = ExamType
        fields = ['id', 'slug', 'name', 'max_marks']

    def get_max_marks(self, obj):
        return total_marks_for_exam_slug(obj.slug)


class MarksSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    exam_type_slug = serializers.CharField(source='exam_type.slug', read_only=True)
    exam_type_name = serializers.CharField(source='exam_type.get_slug_display', read_only=True)
    student_name = serializers.CharField(source='student.name', read_only=True)
    percentage = serializers.SerializerMethodField()
    grade = serializers.SerializerMethodField()

    class Meta:
        model = Marks
        fields = [
            'id',
            'student',
            'student_name',
            'subject',
            'subject_name',
            'exam_type',
            'exam_type_slug',
            'exam_type_name',
            'marks_obtained',
            'total_marks',
            'exam_date',
            'percentage',
            'grade',
        ]
        extra_kwargs = {
            'total_marks': {'read_only': True},
        }

    def get_percentage(self, obj):
        return percentage(obj.marks_obtained, obj.total_marks)

    def get_grade(self, obj):
        return letter_grade(percentage(obj.marks_obtained, obj.total_marks))

    def _resolve_exam_type(self, attrs):
        """ExamType instance for validation (handles PK on create/update)."""
        et_in = attrs.get('exam_type')
        if self.instance is not None and et_in is None:
            return self.instance.exam_type
        if et_in is None:
            return None
        if isinstance(et_in, ExamType):
            return et_in
        return ExamType.objects.get(pk=et_in)

    def validate(self, attrs):
        attrs.pop('total_marks', None)
        mo = attrs.get('marks_obtained')
        et_obj = self._resolve_exam_type(attrs)
        if self.instance is not None:
            mo = self.instance.marks_obtained if mo is None else mo

        if et_obj is None or mo is None:
            return attrs

        cap = total_marks_for_exam_slug(et_obj.slug)
        if mo > cap:
            raise serializers.ValidationError(
                {'marks_obtained': f'Cannot exceed {cap:g} for this exam type.'}
            )
        if mo < 0:
            raise serializers.ValidationError({'marks_obtained': 'Cannot be negative.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('total_marks', None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('total_marks', None)
        return super().update(instance, validated_data)


class MarksSummarySerializer(serializers.Serializer):
    """Aggregated totals for a student (used by profile Results tab)."""

    total_marks_obtained = serializers.FloatField()
    total_max_marks = serializers.FloatField()
    percentage = serializers.FloatField()
    grade = serializers.CharField()
