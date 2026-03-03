from django.db import models
from django.conf import settings


User = settings.AUTH_USER_MODEL


class Answer(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SUBMITTED = "SUBMITTED", "Submitted"

    question = models.ForeignKey(
        "workbooks.Question",
        on_delete=models.CASCADE,
        related_name="answers",
    )
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="answers",
    )
    current_text = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Answer by {self.student} for {self.question}"


class AnswerVersion(models.Model):
    answer = models.ForeignKey(
        Answer,
        on_delete=models.CASCADE,
        related_name="versions",
    )
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="answer_versions",
    )
    text = models.TextField()
    is_teacher_suggestion = models.BooleanField(default=False)
    based_on = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="derived_versions",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Version for {self.answer_id} by {self.author_id}"

