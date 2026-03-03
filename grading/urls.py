from rest_framework.routers import DefaultRouter

from .views import AnswerGradeViewSet, WorksheetGradeViewSet

router = DefaultRouter()
router.register("answer-grades", AnswerGradeViewSet, basename="answer-grade")
router.register("worksheet-grades", WorksheetGradeViewSet, basename="worksheet-grade")

urlpatterns = router.urls

