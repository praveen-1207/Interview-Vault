"""
Gemini AI service.

Strict rule enforced here: the model is ONLY ever given the user's own
question + answer text. No web search, no retrieval, no invented
interview experiences — the prompt explicitly forbids it.
"""
import os
import json
import re
from fastapi import HTTPException
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

def _get_api_key() -> str:
    return os.getenv("GEMINI_API_KEY", "")

SYSTEM_PROMPT = """You are an interview-answer analysis assistant.

STRICT RULES:
- Only use the question and answer text given to you by the user.
- Do NOT invent facts about companies or interviews.
- Do NOT claim to have searched the web.
- Do NOT fabricate a "real" interview experience.
- Just evaluate the given answer and produce a better one.

Return ONLY valid JSON with exactly these keys:
{
  "correct_answer": "the ideal/correct answer to the question",
  "improved_answer": "an improved version of the user's own answer, keeping their approach where reasonable",
  "explanation": "why the ideal answer is correct, explained clearly",
  "missing_points": "important points the user's answer missed, as a short bullet-style string",
  "is_correct": true_or_false,
  "verdict": "Exact text: 'Your answer is correct' if is_correct is true, otherwise 'Your answer is wrong'"
}
"""


def _extract_json(text: str) -> dict:
    cleaned = re.sub(r"^```(json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    return json.loads(cleaned)


def generate_ai_feedback(question: str, user_answer: str) -> dict:
    GEMINI_API_KEY = _get_api_key()
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY is not configured on the server. Add it to backend/.env",
        )

    client = genai.Client(api_key=GEMINI_API_KEY)
    prompt = f"Question: {question}\n\nUser Answer: {user_answer}"

    try:
        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
            ),
        )
        data = _extract_json(response.text)
        is_correct = bool(data.get("is_correct", True))
        return {
            "correct_answer": data.get("correct_answer", ""),
            "improved_answer": data.get("improved_answer", ""),
            "explanation": data.get("explanation", ""),
            "missing_points": data.get("missing_points", ""),
            "is_correct": is_correct,
            "verdict": "Your answer is correct" if is_correct else "Your answer is wrong",
        }
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="AI response could not be parsed. Try again.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {str(e)}")
