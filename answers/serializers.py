from rest_framework import serializers

from .models import Answer, AnswerVersion


class AnswerVersionSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)

    class Meta:
        model = AnswerVersion
        fields = [
            "id",
            "text",
            "is_teacher_suggestion",
            "based_on",
            "created_at",
            "author",
            "author_username",
        ]
        read_only_fields = ["id", "created_at", "author", "author_username"]


class AnswerSerializer(serializers.ModelSerializer):
    versions = AnswerVersionSerializer(many=True, read_only=True)
    student_username = serializers.CharField(source="student.username", read_only=True)
    grade_summary = serializers.SerializerMethodField()

    class Meta:
        model = Answer
        fields = [
            "id",
            "question",
            "student",
            "student_username",
            "current_text",
            "status",
            "created_at",
            "updated_at",
            "versions",
            "grade_summary",
        ]
        read_only_fields = ["id", "student", "created_at", "updated_at", "versions"]

    def get_grade_summary(self, obj):
        if hasattr(obj, "grade") and obj.grade:
            return {"score": str(obj.grade.score), "feedback": obj.grade.feedback or ""}
        return None

