"""
Custom exception handlers for DRF.
Ensures consistent error format and avoids leaking sensitive data in production.
"""
import logging

from rest_framework.views import exception_handler
from rest_framework.response import Response

logger = logging.getLogger(__name__)


def mtihani_exception_handler(exc, context):
    """
    Custom exception handler that:
    - Uses DRF's default handler for standard responses
    - Normalizes 500 responses to avoid traceback leaks in production
    - Logs server errors
    """
    response = exception_handler(exc, context)
    if response is not None:
        return response

    # Unhandled exception (500)
    logger.exception("Unhandled exception in API view: %s", exc)
    from django.conf import settings
    if settings.DEBUG:
        raise
    return Response(
        {"detail": "An error occurred. Please try again later."},
        status=500
    )
