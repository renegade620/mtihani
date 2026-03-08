from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.models import User
from .models import Answer, AnswerVersion
from .serializers import AnswerSerializer, AnswerVersionSerializer


class IsStudentOrTeacher(permissions.BasePermission):
    """
    Very simple role-based permission for now:
    - Students can manage their own answers.
    - Teachers can see answers in their organization (we'll refine later).
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj: Answer):
        user: User = request.user
        if user.role == User.Role.STUDENT:
            return obj.student_id == user.id
        if user.role == User.Role.TEACHER:
            # Later: restrict to specific worksheets/assignments.
            return True
        if user.role == User.Role.DIRECTOR:
            return True
        return False


class AnswerViewSet(viewsets.ModelViewSet):
    """
    - Students: create/update their own answers.
    - Teachers/Directors: read answers (for now).
    """

    serializer_class = AnswerSerializer
    permission_classes = [IsStudentOrTeacher]

    def get_queryset(self):
        user: User = self.request.user
        qs = Answer.objects.select_related("student", "question", "question__worksheet")
        worksheet_id = self.request.query_params.get("worksheet")
        if worksheet_id:
            qs = qs.filter(question__worksheet_id=worksheet_id)
        if user.role == User.Role.STUDENT:
            return qs.filter(student=user)
        if user.organization_id:
            return qs.filter(student__organization=user.organization)
        return qs

    def perform_create(self, serializer):
        # Force student to be the current user.
        serializer.save(student=self.request.user)

    @action(detail=True, methods=["post"], url_path="suggest")
    def suggest(self, request, pk=None):
        """
        Teachers can create a suggestion version for an answer.
        """
        answer = self.get_object()
        user: User = request.user
        if user.role != User.Role.TEACHER:
            return Response({"detail": "Only teachers can create suggestions."}, status=status.HTTP_403_FORBIDDEN)

        text = request.data.get("text")
        if not text:
            return Response({"detail": "text is required"}, status=status.HTTP_400_BAD_REQUEST)

        based_on_id = request.data.get("based_on")
        based_on = None
        if based_on_id:
            based_on = answer.versions.filter(id=based_on_id).first()

        version = AnswerVersion.objects.create(
            answer=answer,
            author=user,
            text=text,
            is_teacher_suggestion=True,
            based_on=based_on,
        )
        return Response(AnswerVersionSerializer(version).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="apply-suggestion")
    def apply_suggestion(self, request, pk=None):
        """
        Student applies a teacher suggestion: copies the suggested text into current_text.
        Body: { "version_id": <id> }
        """
        answer = self.get_object()
        user: User = request.user
        if user.role != User.Role.STUDENT or answer.student_id != user.id:
            return Response(
                {"detail": "Only the student who owns this answer can apply suggestions."},
                status=status.HTTP_403_FORBIDDEN,
            )

        version_id = request.data.get("version_id")
        if not version_id:
            return Response({"detail": "version_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        version = answer.versions.filter(id=version_id, is_teacher_suggestion=True).first()
        if not version:
            return Response({"detail": "Suggestion not found"}, status=status.HTTP_404_NOT_FOUND)

        answer.current_text = version.text
        answer.save(update_fields=["current_text", "updated_at"])

        AnswerVersion.objects.create(
            answer=answer,
            author=user,
            text=version.text,
            is_teacher_suggestion=False,
        )
        return Response(AnswerSerializer(answer).data)

