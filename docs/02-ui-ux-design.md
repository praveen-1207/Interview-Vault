# PHASE 2 — UI/UX Design

## Design language

- **Pattern:** Linear/Notion-style data SaaS — dark sidebar, light canvas, subtle borders.
- **Colors:**
  - Primary: `indigo-600` (#4f46e5) — one accent color, used for actions/active nav
  - Status: `emerald-500` selected, `amber-500` waiting, `rose-500` rejected
  - Neutrals: zinc scale (zinc-50 bg, zinc-900 text, zinc-200 borders)
- **Type:** Inter, sizes 12–24px, tabular-nums for stats
- **Spacing/radius:** Tailwind defaults, `rounded-lg` for cards, `rounded-md` for inputs
- **Feedback:** skeleton loaders on fetch, inline field errors, toast for mutations, optimistic updates

## Pages & layouts

### Auth layout (centered card, no sidebar)
- `/login`, `/register`

### App layout (sidebar + topbar + content)
- **Sidebar (desktop, drawer on mobile):** logo, nav (Dashboard, Interviews, Question Library, Settings/Profile), user card at bottom with logout
- **Topbar:** page title, mobile menu button

| Route | Page | Primary action | Key content |
|---|---|---|---|
| `/` | Landing | "Get Started" | hero, features, how AI works, CTA |
| `/login` `/register` | Auth | Submit | centered card, demo hint |
| `/dashboard` | Dashboard | "New Interview" | 4 stat cards, success %, 3 charts, recent activity |
| `/interviews` | Interview list | "New Interview" | table + filters + status badges |
| `/interviews/new` | Create | Save | form: company (autocomplete), role, date, status |
| `/interviews/:id` | Detail | "Add Round" / "Analyze" | status header, rounds accordion, questions w/ AI panel |
| `/questions` | Library | — | search bar + filters + sort + cards |
| `/profile` | Profile | Save | name/email, change password, API usage |

## Interview detail page layout (most important screen)

```
┌─────────────────────────────────────────────┐
│ Back  [Company · Role]      [Status badge]   │
│       12 Aug 2026                 [Edit]     │
├─────────────────────────────────────────────┤
│ Round 1 · Technical           [+ Add Round]  │
│  ┌ Question 1 ──────────────────────────┐   │
│  │ "Explain closures"       [Analyze]    │   │
│  │ Your answer ▾                       │   │
│  │ ┌─── AI Feedback (markdown) ───────┐ │   │
│  │ │ Correct Answer / Better Response │ │   │
│  │ │ Explanation / Missing points      │ │   │
│  │ └───────────────────────────────────┘ │   │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## Component hierarchy

```
App
├── <RouterProvider>
│   ├── AuthLayout        (LoginPage, RegisterPage)
│   ├── AppLayout         (Sidebar, Topbar, <Outlet/>)
│   │   ├── DashboardPage
│   │   ├── InterviewsPage
│   │   ├── InterviewFormPage
│   │   ├── InterviewDetailPage
│   │   ├── QuestionLibraryPage
│   │   └── ProfilePage
│   └── LandingPage
│
Reusable:
├── ui/  Button, Input, Select, Badge, Card, Skeleton, Spinner,
│        EmptyState, StatCard, Modal, Tabs, Accordion, Toast
├── layout/  AppLayout, Sidebar, Topbar, AuthLayout
├── features/
│   ├── auth/    AuthForm, ProtectedRoute
│   ├── interviews/  InterviewTable, InterviewForm, RoundList, QuestionItem,
│   │                AIFeedbackPanel, StatusBadge
│   ├── dashboard/   StatCards, MonthlyChart, CompanyChart, SuccessGauge, RecentActivity
│   └── questions/   SearchBar, FilterBar, QuestionCard
```

## Responsive behavior
- Sidebar → overlay drawer below `lg` breakpoint
- Charts stack vertically on mobile; stat cards 2×2 grid
- Tables → cards with horizontal scroll on mobile

## Empty states (designed, not an afterthought)
- No interviews → illustration + "Log your first interview"
- Interview with no rounds → "Add your first round"
- Question not analyzed → big "Analyze with Gemini" button

## Common mistakes
1. No empty states → app looks broken to new users
2. Icons everywhere with no text → accessibility fail, we label everything
3. Too many colors → statuses keep a 3-color language only
4. Forms without optimistic UX → TanStack Query invalidate-on-success pattern
5. AI panel that blocks the form → analysis renders inline per question, async
