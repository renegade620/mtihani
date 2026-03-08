from rest_framework import viewsets, permissions

from accounts.models import User
from .models import Workbook, Worksheet, Question
from .serializers import (
    WorkbookSerializer,
    WorksheetDetailSerializer,
    QuestionSerializer,
)


class IsAuthenticatedReadOnly(permissions.IsAuthenticated):
    """
    Require auth; allow only safe (read-only) methods.
    """

    def has_permission(self, request, view):
        base = super().has_permission(request, view)
        if not base:
            return False
        return request.method in permissions.SAFE_METHODS


class IsDirectorOrReadOnly(permissions.BasePermission):
    """
    Allow anyone authenticated to read; only Directors can write.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and getattr(user, "role", None) == User.Role.DIRECTOR
        )


class WorkbookViewSet(viewsets.ModelViewSet):
    serializer_class = WorkbookSerializer
    permission_classes = [IsDirectorOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        qs = Workbook.objects.all()
        if getattr(user, "organization_id", None):
            qs = qs.filter(organization=user.organization)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(owner=user, organization=user.organization)


class WorksheetViewSet(viewsets.ModelViewSet):
    serializer_class = WorksheetDetailSerializer
    permission_classes = [IsDirectorOrReadOnly]

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

