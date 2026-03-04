from rest_framework.routers import DefaultRouter

from .views import AnswerViewSet

router = DefaultRouter()
router.register("answers", AnswerViewSet, basename="answer")

urlpatterns = router.urls

