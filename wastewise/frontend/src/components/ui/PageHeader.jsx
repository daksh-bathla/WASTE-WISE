import { ChevronLeft } from 'lucide-react';

export default function PageHeader({
  title,
  subtitle,
  eyebrow,
  action,
  onBackClick,
  className = '',
}) {
  return (
    <header className={`mb-8 ${className}`}>
      {onBackClick && (
        <button type="button" onClick={onBackClick} className="btn btn-ghost btn-sm mb-4 -ml-2">
          <ChevronLeft size={16} /> Back
        </button>
      )}
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="relative max-w-3xl pl-5">
          <div className="absolute left-0 top-1 h-[calc(100%-4px)] w-1 rounded-full bg-gradient-to-b from-deep-purple to-deep-green" />
          {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-deep-purple">{eyebrow}</p>}
          <h1 className="text-[clamp(2rem,4vw,3.25rem)] leading-tight">{title}</h1>
          {subtitle && <p className="mt-3 max-w-2xl text-base leading-7 text-text-secondary">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
