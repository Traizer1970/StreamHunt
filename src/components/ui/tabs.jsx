import React, { createContext, useContext, useState } from 'react'
const TabsCtx = createContext(null)
export function Tabs({ defaultValue, children, className='' }) {
  const [value, setValue] = useState(defaultValue)
  return <TabsCtx.Provider value={{ value, setValue }}><div className={className}>{children}</div></TabsCtx.Provider>
}
export function TabsList({ children, className='' }) {
  return <div className={`inline-flex gap-1 rounded-xl p-1 border ${className}`}>{children}</div>
}
export function TabsTrigger({ value, children }) {
  const ctx = useContext(TabsCtx)
  const active = ctx.value === value
  return (
    <button
      onClick={() => ctx.setValue(value)}
      className={`px-3 py-2 rounded-lg text-sm transition ${active ? 'bg-amber-500 text-black' : 'hover:bg-black/5'}`}
    >{children}</button>
  )
}
export function TabsContent({ value, children }) {
  const ctx = useContext(TabsCtx)
  if (ctx.value !== value) return null
  return <div>{children}</div>
}
