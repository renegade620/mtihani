from django.contrib import admin

from .models import AnswerGrade, WorksheetGrade, WorksheetGradeApproval


@admin.register(AnswerGrade)
class AnswerGradeAdmin(admin.ModelAdmin):
    list_display = ("answer", "teacher", "score", "created_at")
    list_filter = ("teacher",)


@admin.register(WorksheetGrade)
class WorksheetGradeAdmin(admin.ModelAdmin):
    list_display = ("worksheet", "student", "teacher", "score_total", "status")
    list_filter = ("status", "worksheet")


@admin.register(WorksheetGradeApproval)
class WorksheetGradeApprovalAdmin(admin.ModelAdmin):
    list_display = ("worksheet_grade", "director", "status", "created_at")
    list_filter = ("status",)
