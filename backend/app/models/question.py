from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default=func.gen_random_uuid()
    )
    round_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("rounds.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    user_answer: Mapped[str] = mapped_column(Text, nullable=False, default="")
    ai_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(
        String(30), nullable=False, default="other", server_default="other"
    )
    difficulty: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    order_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    round: Mapped["Round"] = relationship(back_populates="questions")

    @property
    def company_name(self) -> str:
        return self.round.interview.company.name if self.round and self.round.interview and self.round.interview.company else ""

    @property
    def role(self) -> str:
        return self.round.interview.role if self.round and self.round.interview else ""

    @property
    def interview_type(self) -> str:
        return (
            self.round.interview.interview_type
            if self.round and self.round.interview
            else "other"
        )

    @property
    def round_name(self) -> str:
        return self.round.name if self.round else ""

    @property
    def interview_mode(self) -> str | None:
        return self.round.interview.interview_mode if self.round and self.round.interview else None

    @property
    def publication_status(self) -> str:
        return self.round.interview.publication_status if self.round and self.round.interview else "draft"
