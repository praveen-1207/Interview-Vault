export function toast(message: string, type: 'success' | 'error' = 'success') {
  const el = document.createElement('div')
  el.className =
    'fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-md px-4 py-2 text-sm font-medium text-white shadow-lg ' +
    (type === 'success' ? 'bg-zinc-900' : 'bg-rose-600')
  el.textContent = message
  document.body.appendChild(el)
  setTimeout(() => {
    el.style.transition = 'opacity 0.3s'
    el.style.opacity = '0'
    setTimeout(() => el.remove(), 300)
  }, 2500)
}
