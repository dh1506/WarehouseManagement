interface StatePanelProps {
  title: string;
  description: string;
  icon?: string;
  tone?: 'default' | 'error';
  action?: React.ReactNode;
}

export function StatePanel({
  title,
  description,
  icon = 'inventory',
  tone = 'default',
  action,
}: StatePanelProps) {
  const toneClass =
    tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <div className={`flex flex-col items-center justify-center rounded-3xl border px-6 py-12 text-center ${toneClass}`}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
        <span className="material-symbols-outlined text-[28px]">{icon}</span>
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm opacity-80">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
