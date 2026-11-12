from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AIEvaluation(Base):
    """One counted AI evaluation per user / interview / question.

    The unique constraint is the final guard against quota bypass; the quota
    service also counts rows under an advisory lock for concurrency safety.
    """

    __tablename__ = "ai_evaluations"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "interview_id", "question_id", name="uq_ai_eval_user_interview_question"
        ),
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default=func.gen_random_uuid()
    )
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    interview_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    answer_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("answers.id", ondelete="CASCADE"), nullable=True
    )
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    feedback: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
