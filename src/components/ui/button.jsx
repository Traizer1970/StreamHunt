import React from 'react'

const cn = (...c) => c.filter(Boolean).join(' ')

export function Button({
  className = '',
  variant = 'default',
  size = 'md',
  asChild,
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-black/20 disabled:opacity-50 disabled:pointer-events-none';
  const variants = {
    default: 'bg-black/80 text-white hover:bg-black',
    outline:
      'border border-zinc-300 text-zinc-900 hover:bg-black/5 dark:border-white/20 dark:text-zinc-100',
    ghost: 'bg-transparent hover:bg-black/5 text-inherit',
    secondary: 'bg-zinc-200 hover:bg-zinc-300 text-zinc-900',
    destructive: 'bg-red-600 hover:bg-red-700 text-white',
    link: 'bg-transparent text-blue-600 hover:underline p-0 h-auto',
  };
  const sizes = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-5 text-base',
    icon: 'h-8 w-8 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:stroke-[1.75]',
  };
  const Comp = asChild ? 'span' : 'button';
  return (
    <Comp
      className={cn(base, variants[variant] ?? variants.default, sizes[size] ?? sizes.md, className)}
      {...props}
    />
  );
}
