"""Gemini integration for interview answer evaluation.

Security rule (hard requirement): the Gemini API key lives only in the backend.
This module is the ONLY place Gemini is called. The model only ever receives
the user's own question and answer — never scraped questions or fabricated data.
"""

import re

import httpx

from app.config import settings
from app.utils.errors import APIError

ANALYSIS_SYSTEM_PROMPT = """You are a senior interview coach. You are given ONE real interview question and the candidate's own answer.

STRICT RULES:
1. Use ONLY the provided question and answer. Never search external websites, never invent interview questions, never quote questions from other companies or platforms.
2. If the answer is empty, coach on how to approach the question anyway.
3. Answer in plain markdown, starting with an H2 section for each heading below, in exactly this order:
   ## Score
   ## Technical Correctness
   ## Conceptual Understanding
   ## Missing Points
   ## Strengths
   ## Weaknesses
   ## Suggested Improvements
   ## Improved Sample Answer
4. Under "## Score" output only a number from 0 to 100, followed by "/100" (for example: 82/100).
5. Keep "Improved Sample Answer" as a single polished example the candidate could say in the interview.
6. Be honest and concrete. If the answer is already strong, say so and still point out how to make it sharper.
"""

GENERATION_CONFIG = {"temperature": 0.4, "maxOutputTokens": 4096}

FALLBACK_MODELS = ("gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.8-flash")
RETRYABLE_STATUS = {404, 429, 500, 502, 503, 504}


def _is_configured() -> bool:
    return bool(settings.gemini_api_key)


def _models_to_try() -> list[str]:
    ordered: list[str] = []
    for model in (settings.gemini_model, *FALLBACK_MODELS):
        if model and model not in ordered:
            ordered.append(model)
    return ordered


def _parse_score(text: str) -> int | None:
    """Extract the score from the '## Score' section (or first N/100 match)."""
    section = re.search(r"##\s*Score\s*\n+(.+?)(?:\n##|\Z)", text, re.DOTALL | re.IGNORECASE)
    haystack = section.group(1) if section else text
    match = re.search(r"(\d{1,3})\s*(?:/\s*100)?", haystack)
    if not match:
        return None
    score = int(match.group(1))
    if score < 0 or score > 100:
        return None
    return score


async def analyze_question(question: str, user_answer: str) -> tuple[int | None, str, str]:
    """Analyze a single question + answer with Gemini.

    Returns (score_out_of_100, markdown_feedback, model_used).
    Raises APIError with stable codes so the frontend can surface friendly
    messages instead of raw failures.
    """
    if not _is_configured():
        raise APIError(
            "AI_NOT_CONFIGURED",
            "AI analysis is not configured. Set GEMINI_API_KEY on the server.",
            503,
        )

    prompt = f"Interview question:\n{question}\n\nCandidate's answer:\n{user_answer or '(not answered)'}"
    payload = {
        "contents": [
            {"role": "user", "parts": [{"text": ANALYSIS_SYSTEM_PROMPT}, {"text": prompt}]}
        ],
        "generationConfig": GENERATION_CONFIG,
    }
    headers = {"Content-Type": "application/json"}

    data: dict | None = None
    used_model = settings.gemini_model
    last_status: int | None = None
    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(settings.ai_request_timeout_seconds, connect=10.0)
        ) as client:
            for model in _models_to_try():
                url = (
                    "https://generativelanguage.googleapis.com/v1beta/models/"
                    f"{model}:generateContent"
                )
                response = await client.post(
                    url, params={"key": settings.gemini_api_key}, headers=headers, json=payload
                )
                if response.status_code == 200:
                    data = response.json()
                    used_model = model
                    break
                last_status = response.status_code
                if response.status_code not in RETRYABLE_STATUS:
                    break
    except httpx.TimeoutException:
        raise APIError("AI_TIMEOUT", "Gemini took too long. Try again.", 504) from None
    except httpx.HTTPError:
        raise APIError("AI_UNREACHABLE", "Could not reach the AI provider. Try again.", 502) from None

    if data is None:
        raise APIError(
            "AI_FAILED",
            f"AI service returned an error ({last_status}). Please try again.",
            502,
        )

    try:
        parts = data["candidates"][0]["content"]["parts"]
        text = "".join(part.get("text", "") for part in parts)
    except (KeyError, IndexError, TypeError, ValueError):
        raise APIError("AI_BAD_RESPONSE", "AI returned an unexpected response.", 502) from None

    if not text.strip():
        raise APIError("AI_BAD_RESPONSE", "AI returned an empty response.", 502)

    return _parse_score(text), text.strip(), used_model
