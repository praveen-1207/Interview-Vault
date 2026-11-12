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
    """Read the Gemini API key from the environment.

    The key is read at call time (not at import) so changing .env doesn't
    require a restart for tests. Returns "" if not configured — callers check
    for an empty string and fail with a friendly 503 error.
    """
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
    """Parse JSON out of Gemini's raw response text.

    The model sometimes wraps its answer in markdown code fences (```json ... ```).
    This strips leading/trailing fences first, then runs json.loads. The caller
    catches json.JSONDecodeError and turns it into a 502 response.
    """
    cleaned = re.sub(r"^```(json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    return json.loads(cleaned)


CONFIDENCE_SYSTEM_PROMPT = """You are an AI Interview Answer Evaluator inside an interview preparation application.

Your task is to analyze a candidate's interview answer and calculate a **Confidence Score from 0 to 10**.

The score should represent how confidently the candidate can be considered to understand and answer the given interview question based on their response.

## Input

You will receive:

* Interview Question
* Candidate's Answer
* Correct/Expected Answer

Analyze all three before assigning the score.

## Scoring Criteria

Evaluate the candidate using these factors:

### 1. Correctness — 40%
Check whether the candidate's answer is technically and factually correct.
* Completely correct → high score
* Partially correct → medium score
* Incorrect → low score

### 2. Completeness — 25%
Check whether the candidate covered the important points required to answer the question.
* Covers most important points → high score
* Covers some points → medium score
* Misses most important points → low score

### 3. Technical Understanding — 20%
Determine whether the candidate demonstrates actual understanding rather than simply mentioning keywords.
Look for:
* Correct concepts
* Appropriate terminology
* Logical explanation
* Relevant examples
* Practical understanding

### 4. Clarity and Reasoning — 10%
Evaluate how clearly the candidate explains the answer.
Consider:
* Logical structure
* Clear explanation
* Relevant reasoning
* Ability to connect concepts

Do NOT penalize grammar or minor spelling mistakes heavily.

### 5. Uncertainty — 5%
Identify uncertainty in the candidate's answer.

Examples:
High uncertainty:
* "I don't know."
* "Maybe..."
* "I think..."
* "I'm not sure."
* Contradictory statements

Low uncertainty:
* Clear explanation
* Direct answer
* Confident reasoning

Do not automatically give a low score simply because the candidate uses phrases such as "I think". Evaluate the complete answer.

---

# Score Interpretation

Use the following scale:

### 9–10 → Excellent Confidence
The candidate demonstrates strong understanding.
The answer is:
* Correct
* Complete
* Well explained
* Technically strong
* Supported by reasoning or examples

### 7–8 → Good Confidence
The candidate understands the concept well but has some minor gaps.
The answer is mostly correct with limited missing details.

### 5–6 → Moderate Confidence
The candidate has a basic understanding but has noticeable gaps.
The answer may be partially correct, incomplete, or lack technical depth.

### 3–4 → Low Confidence
The candidate shows limited understanding.
The answer contains significant mistakes, missing concepts, or weak reasoning.

### 0–2 → Very Low Confidence
The candidate does not demonstrate sufficient understanding.
The answer may be completely incorrect, irrelevant, or essentially unanswered.

---

# Important Rules

1. Do NOT judge confidence based only on the length of the answer.
2. A short but technically correct answer can receive a high score.
3. A long answer containing incorrect information must receive a low score.
4. Do not reward unnecessary explanations.
5. Do not heavily penalize grammar, spelling, or English fluency.
6. Focus primarily on technical knowledge and understanding.
7. Compare the candidate's answer against the expected answer.
8. Do not copy the expected answer into the feedback.
9. Identify the candidate's actual strengths and weaknesses.
10. Be consistent when scoring similar answers.
11. Never give 10 unless the answer demonstrates excellent understanding.
12. Never give a high score simply because the candidate sounds confident.
13. If the question cannot be answered meaningfully from the provided information, explain why.
14. The score must always be an integer between 0 and 10.

---

# Required Output

Return ONLY valid JSON.

Use exactly this structure:
{
  "confidence_score": 0,
  "confidence_level": "Very Low",
  "reason": "Short explanation of why this score was given.",
  "strengths": ["Strength 1", "Strength 2"],
  "weaknesses": ["Weakness 1", "Weakness 2"],
  "improvement": "One practical suggestion for improving this answer."
}

## Confidence Level Mapping

0–2 → "Very Low"
3–4 → "Low"
5–6 → "Moderate"
7–8 → "Good"
9–10 → "Excellent"

## Example

Question:
"What is useState in React?"

Candidate Answer:
"useState is a React Hook that allows functional components to store and manage state. When the state changes, React re-renders the component."

Expected Answer:
"useState is a React Hook used to add state to functional components. It returns the current state value and a setter function. Calling the setter updates the state and causes the component to re-render."

Expected Output:
{
  "confidence_score": 8,
  "confidence_level": "Good",
  "reason": "The candidate correctly explains that useState is a React Hook used for managing state and understands that updating state causes a re-render. The answer does not mention that useState returns a state value and setter function.",
  "strengths": [
    "Correctly identifies useState as a React Hook.",
    "Correctly explains its purpose and re-render behavior."
  ],
  "weaknesses": [
    "Does not explain the state value and setter function returned by useState."
  ],
  "improvement": "Explain that useState returns the current state value and a setter function used to update it."
}
"""


def generate_confidence_score(question: str, user_answer: str, correct_answer: str) -> dict:
    """Ask Gemini to score the candidate's confidence (0-10) for a question.

    The confidence level is determined ONLY by the AI model itself (using the
    CONFIDENCE_SYSTEM_PROMPT scoring rubric). We give the model the question,
    the candidate's answer, and the expected/correct answer — the expected
    answer comes from the original AI feedback (generate_ai_feedback) so the
    scoring is based on a real reference answer, not a fabricated one.

    Steps:
    1. Make sure GEMINI_API_KEY exists (else 503 with an actionable message).
    2. Build a prompt with ONLY the question + the candidate's answer + the
       expected answer. The system prompt tells the model how to weigh
       correctness (40%), completeness (25%), understanding (20%), clarity
       (10%) and uncertainty (5%).
    3. Call Gemini and force a JSON response via response_mime_type.
    4. Parse the JSON and normalize the fields the frontend expects:
       (confidence_score, confidence_level, reason, strengths, weaknesses,
       improvement).

    Any failure is wrapped up as an HTTPError so the router returns a clean
    502 to the browser instead of crashing.
    """
    GEMINI_API_KEY = _get_api_key()
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY is not configured on the server. Add it to backend/.env",
        )

    client = genai.Client(api_key=GEMINI_API_KEY)
    prompt = (
        f"Question: {question}\n\n"
        f"Candidate's Answer: {user_answer}\n\n"
        f"Correct/Expected Answer: {correct_answer}"
    )

    try:
        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=CONFIDENCE_SYSTEM_PROMPT,
                response_mime_type="application/json",
            ),
        )
        data = _extract_json(response.text)

        score = int(data.get("confidence_score", 0))
        score = max(0, min(10, score))  # safety clamp to the valid 0-10 range

        return {
            "confidence_score": score,
            "confidence_level": data.get("confidence_level", "Very Low"),
            "reason": data.get("reason", ""),
            "strengths": data.get("strengths", []),
            "weaknesses": data.get("weaknesses", []),
            "improvement": data.get("improvement", ""),
        }
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="AI response could not be parsed. Try again.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {str(e)}")


def generate_ai_feedback(question: str, user_answer: str) -> dict:
    """Ask Gemini to evaluate a user's interview answer and return structured feedback.

    Steps:
    1. Make sure GEMINI_API_KEY exists (else 503 with an actionable message).
    2. Build a prompt with ONLY the question + the user's answer. The system
       prompt (SYSTEM_PROMPT) forbids the model from inventing facts or doing
       web searches — it can only critique the given text.
    3. Call Gemini and force a JSON response via response_mime_type.
    4. Parse the JSON and normalize the fields the frontend expects
       (correct_answer, improved_answer, explanation, missing_points,
       is_correct, verdict).

    Any failure is wrapped up as an HTTPError so the router returns a clean
    502 to the browser instead of crashing.
    """
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
