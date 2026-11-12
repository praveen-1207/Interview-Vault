import { cn } from '@/lib/utils'
import type {
  Difficulty,
  InterviewStatus,
  PublicationStatus,
  QuestionCategory,
} from '@/types'

const statusStyles: Record<InterviewStatus, string> = {
  selected: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  waiting: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  in_progress: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
}

const statusLabel: Record<InterviewStatus, string> = {
  selected: 'Selected',
  waiting: 'Waiting',
  rejected: 'Rejected',
  in_progress: 'In progress',
}

export function StatusBadge({ status, className }: { status: InterviewStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        statusStyles[status],
        className,
      )}
    >
      {statusLabel[status]}
    </span>
  )
}

const publicationStyles: Record<PublicationStatus, string> = {
  draft: 'bg-zinc-100 text-zinc-600 ring-zinc-500/20',
  pending_review: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-600/20',
}

const publicationLabel: Record<PublicationStatus, string> = {
  draft: 'Private draft',
  pending_review: 'Pending review',
  approved: 'Published',
  rejected: 'Changes requested',
}

export function PublicationBadge({
  status,
  className,
}: {
  status: PublicationStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        publicationStyles[status],
        className,
      )}
    >
      {publicationLabel[status]}
    </span>
  )
}

const categoryLabels: Record<QuestionCategory, string> = {
  technical: 'Technical',
  coding: 'Coding',
  hr: 'HR',
  aptitude: 'Aptitude',
  system_design: 'System design',
  behavioral: 'Behavioral',
  other: 'Other',
}

export function CategoryBadge({ category }: { category: QuestionCategory }) {
  return (
    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
      {categoryLabels[category]}
    </span>
  )
}

export const difficultyLabel: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

export const modeLabel: Record<string, string> = {
  online: 'Online',
  offline: 'In person',
  phone: 'Phone',
  video: 'Video call',
}
