from django.db import models
from django.conf import settings


User = settings.AUTH_USER_MODEL


class Workbook(models.Model):
    organization = models.ForeignKey(
        "accounts.Organization",
        on_delete=models.CASCADE,
        related_name="workbooks",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="owned_workbooks",
    )
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.title


class Worksheet(models.Model):
    workbook = models.ForeignKey(
        Workbook,
        on_delete=models.CASCADE,
        related_name="worksheets",
    )
    title = models.CharField(max_length=255)
    instructions = models.TextField(blank=True)
    order_index = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="created_worksheets",
    )
    published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order_index", "id"]

    def __str__(self) -> str:
        return f"{self.workbook.title} - {self.title}"


class Question(models.Model):
    worksheet = models.ForeignKey(
        Worksheet,
        on_delete=models.CASCADE,
        related_name="questions",
    )
    prompt = models.TextField()
    max_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    order_index = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order_index", "id"]

    def __str__(self) -> str:
        return f"Q{self.order_index} on {self.worksheet}"

