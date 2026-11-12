import { Link } from 'react-router-dom'

const features = [
  {
    number: '01',
    title: 'Capture privately',
    body: 'Keep a thoughtful record of the companies, rounds, questions, and answers that shaped your journey.',
  },
  {
    number: '02',
    title: 'Learn together',
    body: 'Questions you add join the Community Library with useful interview context. Your answers, AI feedback, and personal notes stay private.',
  },
  {
    number: '03',
    title: 'Grow with feedback',
    body: 'Use structured AI feedback to reflect on your own answers and spot what to practise next.',
  },
]

export function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-nav sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="InterviewVault home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
              IV
            </span>
            <span className="text-base font-semibold tracking-tight text-slate-800">
              InterviewVault
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost hidden sm:inline-flex">
              Sign in
            </Link>
            <Link to="/register" className="btn-primary">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-16 sm:px-8 sm:pb-24 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative z-0">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/45 px-4 py-2 text-xs font-semibold tracking-wide text-indigo-700 shadow-sm backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]" />
              A calmer way to prepare
            </div>
            <h1 className="max-w-2xl text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-6xl">
              Turn every interview into{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                forward motion.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Save what you learn, reflect on your answers, and share useful experiences with a
              community that is preparing for what comes next.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/register" className="btn-primary px-5 py-3">
                Create your private vault
                <span aria-hidden>→</span>
              </Link>
              <Link to="/login" className="btn-secondary px-5 py-3">
                I already have an account
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-500">
              <span>Private by default</span>
              <span>Reviewed before sharing</span>
              <span>AI runs server-side</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-indigo-300/40 via-violet-300/20 to-pink-200/40 blur-2xl" />
            <div className="glass-surface rounded-3xl p-5 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
                    Your learning space
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-800">A little progress, often.</h2>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-xl text-indigo-600">
                  ✦
                </span>
              </div>

              <div className="mt-6 space-y-3">
                <div className="rounded-2xl border border-white/80 bg-white/55 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Frontend Engineer</p>
                      <p className="mt-1 text-xs text-slate-500">Product team · Technical round</p>
                    </div>
                    <span className="rounded-full bg-emerald-100/80 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                      Saved privately
                    </span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-indigo-100/80">
                    <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">Reflection added · 3 questions logged</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/75 bg-white/45 p-4">
                    <p className="text-xs text-slate-500">Your experiences</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-800">Organized</p>
                  </div>
                  <div className="rounded-2xl border border-white/75 bg-white/45 p-4">
                    <p className="text-xs text-slate-500">Next step</p>
                    <p className="mt-2 text-2xl font-semibold text-indigo-700">Keep growing</p>
                  </div>
                </div>
                <p className="px-1 pt-1 text-xs leading-5 text-slate-500">
                  Questions you add appear in the Community Library. Your answers, AI feedback, and
                  personal notes remain private.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8 sm:pb-28">
          <div className="mb-6 max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
              Built around your progress
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Your experience is worth keeping.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.number} className="landing-feature rounded-2xl p-6 sm:p-7">
                <p className="text-sm font-semibold text-indigo-500">{feature.number}</p>
                <h3 className="mt-5 text-lg font-semibold text-slate-800">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/55 bg-white/20 px-5 py-7 text-center text-xs leading-5 text-slate-500 backdrop-blur-lg">
        InterviewVault · Your private answers stay private. AI only evaluates the question and
        answer you choose to submit.
      </footer>
    </div>
  )
}
