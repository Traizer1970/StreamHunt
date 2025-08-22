import React from 'react'
export function Switch({ checked, onCheckedChange }) {
  return (
    <button
      onClick={() => onCheckedChange && onCheckedChange(!checked)}
      className={`w-10 h-6 rounded-full p-0.5 transition ${checked ? 'bg-amber-500' : 'bg-zinc-300'}`}
      type="button"
      role="switch"
      aria-checked={checked}
    >
      <span className={`block w-5 h-5 rounded-full bg-white transition ${checked ? 'translate-x-4' : ''}`} />
    </button>
  )
}
