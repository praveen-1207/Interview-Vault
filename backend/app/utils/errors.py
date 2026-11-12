"""Centralized error handling.

Every business error is raised as APIError and rendered by FastAPI handlers
into the documented shape:

    {"detail": {"code": "...", "message": "..."}}

The frontend's getErrorMessage() already reads `detail` (string or object).
"""

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class APIError(Exception):
    """An application-level error with a stable machine code."""

    def __init__(
        self,
        code: str,
        message: str,
        http_status: int = status.HTTP_400_BAD_REQUEST,
        extra: dict | None = None,
    ):
        super().__init__(message)
        self.code = code
        self.message = message
        self.http_status = http_status
        self.extra = extra or {}


def _payload(code: str, message: str, extra: dict | None = None) -> dict:
    detail: dict = {"code": code, "message": message}
    if extra:
        detail.update(extra)
    return {"detail": detail}


def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.http_status,
        content=_payload(exc.code, exc.message, exc.extra),
    )


def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    first = exc.errors()[0] if exc.errors() else {}
    loc = ".".join(str(part) for part in first.get("loc", []) if part != "body")
    message = first.get("msg", "Invalid input")
    if loc:
        message = f"{loc}: {message}"
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        content=_payload("VALIDATION_ERROR", message))


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(APIError, api_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
