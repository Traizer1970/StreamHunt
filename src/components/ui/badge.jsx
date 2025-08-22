import React from 'react'
const cn = (...c) => c.filter(Boolean).join(' ')
export function Badge({ className = '', variant = 'default', ...props }) {
  const styles = {
    default: 'bg-amber-600 text-white',
    secondary: 'bg-zinc-200 text-zinc-900',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', styles[variant], className)} {...props} />
  )
}
