from rest_framework import serializers

from .models import Workbook, Worksheet, Question


class WorksheetSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Worksheet
        fields = ["id", "title", "order_index", "published"]


class WorkbookSerializer(serializers.ModelSerializer):
    worksheets = WorksheetSummarySerializer(many=True, read_only=True)

    class Meta:
        model = Workbook
        fields = [
            "id",
            "title",
            "description",
            "is_archived",
            "created_at",
            "updated_at",
            "worksheets",
        ]


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ["id", "worksheet", "prompt", "max_score", "order_index", "is_active"]


class WorksheetDetailSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Worksheet
        fields = [
            "id",
            "workbook",
            "title",
            "instructions",
            "order_index",
            "published",
            "questions",
        ]
        read_only_fields = ["id", "questions"]

