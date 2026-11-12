from datetime import date, datetime
from enum import Enum

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class InterviewStatus(str, Enum):
    waiting = "waiting"
    selected = "selected"
    rejected = "rejected"
    in_progress = "in_progress"


class PublicationStatus(str, Enum):
    draft = "draft"
    pending_review = "pending_review"
    approved = "approved"
    rejected = "rejected"


class Interview(Base):
    __tablename__ = "interviews"
    __table_args__ = (
        UniqueConstraint("user_id", "submission_key", name="uq_interviews_user_submission_key"),
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default=func.gen_random_uuid()
    )
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    company_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("companies.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    interview_type: Mapped[str] = mapped_column(
        String(30), nullable=False, default="other", server_default="other", index=True
    )
    date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[InterviewStatus] = mapped_column(
        SAEnum(InterviewStatus, name="interview_status", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=InterviewStatus.waiting,
        index=True,
    )

    # Community sharing fields
    experience_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    difficulty: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    interview_mode: Mapped[str | None] = mapped_column(String(30), nullable=True)
    submission_key: Mapped[str | None] = mapped_column(String(36), nullable=True)
    publication_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=PublicationStatus.draft.value, server_default="draft", index=True
    )
    publish_consent: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    public_identity: Mapped[str] = mapped_column(
        String(20), nullable=False, default="anonymous", server_default="anonymous"
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    company: Mapped["Company"] = relationship(lazy="joined")
    user: Mapped["User"] = relationship(lazy="joined", foreign_keys=[user_id])
    rounds: Mapped[list["Round"]] = relationship(
        back_populates="interview", cascade="all, delete-orphan", lazy="selectin"
    )

    @property
    def public_author(self) -> str:
        """Display name used in the public community feed."""
        if self.public_identity == "username" and self.user and self.user.public_username:
            return self.user.public_username
        return "Anonymous"

    @property
    def author(self) -> str:
        return self.public_author

    @property
    def owner_name(self) -> str:
        return self.user.name if self.user else ""

    @property
    def owner_email(self) -> str:
        return self.user.email if self.user else ""

    @property
    def question_count(self) -> int:
        return sum(len(round_.questions) for round_ in self.rounds)

    @property
    def rounds_count(self) -> int:
        return len(self.rounds)
