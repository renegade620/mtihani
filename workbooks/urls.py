from rest_framework.routers import DefaultRouter

from .views import WorkbookViewSet, WorksheetViewSet, QuestionViewSet


router = DefaultRouter()
router.register("workbooks", WorkbookViewSet, basename="workbook")
router.register("worksheets", WorksheetViewSet, basename="worksheet")
router.register("questions", QuestionViewSet, basename="question")

urlpatterns = router.urls

