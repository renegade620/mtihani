from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.models import User
from .models import AnswerGrade, WorksheetGrade, WorksheetGradeApproval
from .serializers import (
    AnswerGradeSerializer,
    WorksheetGradeSerializer,
    WorksheetGradeApprovalSerializer,
)


class IsTeacherOrDirector(permissions.BasePermission):
    def has_permission(self, request, view):
        user: User = request.user
        return bool(user and user.is_authenticated and user.role in {User.Role.TEACHER, User.Role.DIRECTOR})


class IsDirectorOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        user: User = request.user
        return bool(user and user.is_authenticated and user.role == User.Role.DIRECTOR)


class AnswerGradeViewSet(viewsets.ModelViewSet):
    """
    Teachers create/update grades for answers.
    Directors can read them.
    """

    serializer_class = AnswerGradeSerializer
    permission_classes = [IsTeacherOrDirector]

    def get_queryset(self):
        user: User = self.request.user
        qs = AnswerGrade.objects.select_related("answer", "teacher")
        if user.role == User.Role.TEACHER:
            return qs.filter(teacher=user)
        # Directors see all in their org (simple version)
        if user.organization_id:
            return qs.filter(answer__student__organization=user.organization)
        return qs

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)


class WorksheetGradeViewSet(viewsets.ModelViewSet):
    """
    Teachers calculate per-worksheet grades; directors approve via separate endpoint.
    """

    serializer_class = WorksheetGradeSerializer

    def get_permissions(self):
        # Students may read their own grades; teachers/directors can read/write.
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [IsTeacherOrDirector()]

    def get_queryset(self):
        user: User = self.request.user
        qs = WorksheetGrade.objects.select_related("worksheet", "student", "teacher")
        if user.role == User.Role.TEACHER:
            return qs.filter(teacher=user)
        if user.role == User.Role.STUDENT:
            return qs.filter(student=user)
        if user.organization_id:
            return qs.filter(student__organization=user.organization)
        return qs

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[IsDirectorOnly], url_path="approve")
    def approve(self, request, pk=None):
        """
        Director approves or rejects a worksheet grade.
        Body: { "status": "APPROVED" | "REJECTED", "comment": "..." }
        """
        grade = self.get_object()
        status_value = request.data.get("status")
        comment = request.data.get("comment", "")

        if status_value not in {"APPROVED", "REJECTED"}:
            return Response(
                {"detail": "status must be APPROVED or REJECTED"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        approval, _ = WorksheetGradeApproval.objects.update_or_create(
            worksheet_grade=grade,
            defaults={
                "director": request.user,
                "status": status_value,
                "comment": comment,
            },
        )
        grade.status = f"{status_value}"
        grade.save(update_fields=["status"])
        return Response(WorksheetGradeApprovalSerializer(approval).data)

