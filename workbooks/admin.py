from django.contrib import admin

from .models import Workbook, Worksheet, Question


@admin.register(Workbook)
class WorkbookAdmin(admin.ModelAdmin):
    list_display = ("title", "organization", "owner", "is_archived", "created_at")
    list_filter = ("organization", "is_archived")
    search_fields = ("title", "description")


@admin.register(Worksheet)
class WorksheetAdmin(admin.ModelAdmin):
    list_display = ("title", "workbook", "order_index", "published", "created_by")
    list_filter = ("workbook", "published")
    search_fields = ("title",)


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("prompt", "worksheet", "order_index", "max_score", "is_active")
    list_filter = ("worksheet", "is_active")
    search_fields = ("prompt",)
