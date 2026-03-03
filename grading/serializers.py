from rest_framework import serializers

from .models import AnswerGrade, WorksheetGrade, WorksheetGradeApproval


class AnswerGradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnswerGrade
        fields = [
            "id",
            "answer",
            "teacher",
            "score",
            "feedback",
            "is_final_for_answer",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "teacher", "created_at", "updated_at"]


class WorksheetGradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorksheetGrade
        fields = [
            "id",
            "worksheet",
            "student",
            "teacher",
            "score_total",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "teacher", "created_at", "updated_at", "status"]


class WorksheetGradeApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorksheetGradeApproval
        fields = ["id", "worksheet_grade", "director", "status", "comment", "created_at"]
        read_only_fields = ["id", "director", "created_at"]

