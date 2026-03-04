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

    class Meta:
        model = Answer
        fields = [
            "id",
            "question",
            "student",
            "current_text",
            "status",
            "created_at",
            "updated_at",
            "versions",
        ]
        read_only_fields = ["id", "student", "created_at", "updated_at", "versions"]

