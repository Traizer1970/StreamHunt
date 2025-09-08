import React from 'react'
const cn = (...c) => c.filter(Boolean).join(' ')

export function Card({ className = '', ...props }) {
  return <div className={cn('rounded-2xl border', className)} {...props} />
}
export function CardHeader({ className = '', ...props }) {
  return <div className={cn('p-6', className)} {...props} />
}
export function CardTitle({ className = '', ...props }) {
  return <div className={cn('text-xl font-semibold', className)} {...props} />
}
export function CardDescription({ className = '', ...props }) {
  return <div className={cn('text-sm opacity-70', className)} {...props} />
}
export function CardContent({ className = '', ...props }) {
  return <div className={cn('p-6 pt-0', className)} {...props} />
}
