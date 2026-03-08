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
    worksheet_title = serializers.CharField(source="worksheet.title", read_only=True)
    student_username = serializers.CharField(source="student.username", read_only=True)
    teacher_username = serializers.CharField(source="teacher.username", read_only=True)

    class Meta:
        model = WorksheetGrade
        fields = [
            "id",
            "worksheet",
            "worksheet_title",
            "student",
            "student_username",
            "teacher",
            "teacher_username",
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

