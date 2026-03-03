from rest_framework import viewsets, permissions

from .models import Workbook, Worksheet, Question
from .serializers import (
    WorkbookSerializer,
    WorksheetDetailSerializer,
    QuestionSerializer,
)


class IsAuthenticatedReadOnly(permissions.IsAuthenticated):
    """
    For now, require auth and allow safe (read-only) methods.
    We can refine role-based permissions later.
    """

    def has_permission(self, request, view):
        base = super().has_permission(request, view)
        if not base:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return False


class WorkbookViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = WorkbookSerializer
    permission_classes = [IsAuthenticatedReadOnly]

    def get_queryset(self):
        user = self.request.user
        # For now, filter by user's organization if set; otherwise all.
        qs = Workbook.objects.all()
        if getattr(user, "organization_id", None):
            qs = qs.filter(organization=user.organization)
        return qs


class WorksheetViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = WorksheetDetailSerializer
    permission_classes = [IsAuthenticatedReadOnly]

    def get_queryset(self):
        user = self.request.user
        qs = Worksheet.objects.select_related("workbook")
        if getattr(user, "organization_id", None):
            qs = qs.filter(workbook__organization=user.organization)
        return qs


class QuestionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = QuestionSerializer
    permission_classes = [IsAuthenticatedReadOnly]

    def get_queryset(self):
        user = self.request.user
        qs = Question.objects.select_related("worksheet", "worksheet__workbook")
        if getattr(user, "organization_id", None):
            qs = qs.filter(worksheet__workbook__organization=user.organization)
        return qs

from django.shortcuts import render

# Create your views here.
