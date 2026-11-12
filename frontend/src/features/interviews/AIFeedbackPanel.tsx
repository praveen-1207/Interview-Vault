import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

const sectionStyles: Record<string, string> = {
  Score: 'border-indigo-300 bg-indigo-50/70',
  'Technical Correctness': 'border-emerald-200 bg-emerald-50/60',
  'Conceptual Understanding': 'border-sky-200 bg-sky-50/60',
  'Missing Points': 'border-amber-200 bg-amber-50/60',
  Strengths: 'border-emerald-200 bg-emerald-50/60',
  Weaknesses: 'border-rose-200 bg-rose-50/60',
  'Suggested Improvements': 'border-violet-200 bg-violet-50/60',
  'Improved Sample Answer': 'border-zinc-300 bg-zinc-50',
}

const sectionIcons: Record<string, string> = {
  Score: '★',
  'Technical Correctness': '✓',
  'Conceptual Understanding': 'ℹ',
  'Missing Points': '!',
  Strengths: '↑',
  Weaknesses: '↓',
  'Suggested Improvements': '↗',
  'Improved Sample Answer': '✦',
}

export function parseAiSections(markdown: string): Array<{ title: string; body: string }> {
  const lines = markdown.split('\n')
  const sections: Array<{ title: string; body: string[] }> = []
  let current: { title: string; body: string[] } | null = null

  for (const line of lines) {
    const match = line.match(/^##\s+(.+)$/)
    if (match) {
      current = { title: match[1].trim(), body: [] }
      sections.push(current)
    } else if (current) {
      current.body.push(line)
    }
  }
  return sections.map((s) => ({ title: s.title, body: s.body.join('\n').trim() }))
}

export function AIFeedbackPanel({ markdown }: { markdown: string }) {
  const sections = parseAiSections(markdown)

  if (sections.length === 0) {
    return (
      <div className="rounded-md bg-zinc-50 p-4 text-sm text-zinc-600">
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <div
          key={section.title}
          className={cn(
            'rounded-md border p-4',
            sectionStyles[section.title] ?? 'border-zinc-200 bg-zinc-50',
          )}
        >
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <span
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white',
                section.title in sectionIcons ? 'bg-zinc-800' : 'bg-zinc-400',
              )}
            >
              {sectionIcons[section.title] ?? '•'}
            </span>
            {section.title}
          </h4>
          <div className="text-sm leading-relaxed text-zinc-700">
            <ReactMarkdown>{section.body}</ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  )
}
