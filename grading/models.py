from django.db import models
from django.conf import settings


User = settings.AUTH_USER_MODEL


class AnswerGrade(models.Model):
    answer = models.OneToOneField(
        "answers.Answer",
        on_delete=models.CASCADE,
        related_name="grade",
    )
    teacher = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="given_answer_grades",
    )
    score = models.DecimalField(max_digits=5, decimal_places=2)
    feedback = models.TextField(blank=True)
    is_final_for_answer = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Grade {self.score} for {self.answer_id}"


class WorksheetGrade(models.Model):
    worksheet = models.ForeignKey(
        "workbooks.Worksheet",
        on_delete=models.CASCADE,
        related_name="grades",
    )
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="worksheet_grades",
    )
    teacher = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="issued_worksheet_grades",
    )
    score_total = models.DecimalField(max_digits=6, decimal_places=2)
    status = models.CharField(
        max_length=30,
        choices=[
            ("PENDING_APPROVAL", "Pending approval"),
            ("APPROVED", "Approved"),
            ("REJECTED", "Rejected"),
        ],
        default="PENDING_APPROVAL",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("worksheet", "student")

    def __str__(self) -> str:
        return f"{self.worksheet} / {self.student} = {self.score_total}"


class WorksheetGradeApproval(models.Model):
    worksheet_grade = models.OneToOneField(
        WorksheetGrade,
        on_delete=models.CASCADE,
        related_name="approval",
    )
    director = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="worksheet_approvals",
    )
    status = models.CharField(
        max_length=20,
        choices=[("APPROVED", "Approved"), ("REJECTED", "Rejected")],
    )
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.status} by {self.director} on {self.worksheet_grade_id}"

