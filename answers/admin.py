from django.contrib import admin

from .models import Answer, AnswerVersion


@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ("question", "student", "status", "created_at", "updated_at")
    list_filter = ("status", "question__worksheet", "student")
    search_fields = ("question__prompt", "student__username")


@admin.register(AnswerVersion)
class AnswerVersionAdmin(admin.ModelAdmin):
    list_display = ("answer", "author", "is_teacher_suggestion", "created_at")
    list_filter = ("is_teacher_suggestion",)
