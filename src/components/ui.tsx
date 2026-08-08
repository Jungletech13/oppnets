import { useId, type ReactNode } from 'react';
import type { VerificationClaim } from '@/types';
import { CheckCircle2, Clock, AlertTriangle, XCircle, ShieldCheck, Sparkles } from 'lucide-react';

export function ProgressBar({ value, className = '', showLabel = false }: { value: number; className?: string; showLabel?: boolean }) {
  const v = Math.max(0, Math.min(100, value));
  const color = v >= 80 ? 'bg-accent-500' : v >= 40 ? 'bg-brand-500' : v > 0 ? 'bg-amber-400' : 'bg-ink-300';
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-2 bg-ink-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-300`} style={{ width: `${v}%` }} />
      </div>
      {showLabel && <span className="text-xs font-medium text-ink-600 tabular-nums w-9 text-right">{v}%</span>}
    </div>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'brand' | 'accent' | 'amber' | 'red' | 'slate' }) {
  const tones: Record<string, string> = {
    neutral: 'bg-ink-100 text-ink-600',
    brand: 'bg-brand-50 text-brand-700',
    accent: 'bg-accent-50 text-accent-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    slate: 'bg-slate-100 text-slate-600',
  };
  return <span className={`badge ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <div className="w-12 h-12 rounded-full bg-ink-100 flex items-center justify-center text-ink-400 mb-3">{icon}</div>
      <h3 className="text-sm font-semibold text-ink-800">{title}</h3>
      <p className="text-sm text-ink-500 mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Avatar({ src, name, size = 40 }: { src?: string; name: string; size?: number }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div
      className="rounded-full bg-brand-100 text-brand-700 font-semibold flex items-center justify-center overflow-hidden shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : initials}
    </div>
  );
}

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="text-sm text-ink-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function TrustIndicators({ profile, size = 'sm' }: { profile: { verifications: VerificationClaim[]; communityStanding?: 'positive' | 'neutral' | 'monitoring' }; size?: 'sm' | 'md' }) {
  const verified = profile.verifications.filter((v) => v.state === 'verified');
  const iconCls = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  const textCls = size === 'md' ? 'text-sm' : 'text-xs';
  const padCls = size === 'md' ? 'px-2.5 py-1' : 'px-2 py-0.5';
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {verified.map((v) => (
        <span key={v.id} className={`badge ${padCls} ${textCls} bg-accent-50 text-accent-700`}>
          <ShieldCheck className={`${iconCls}`} />
          {v.label.replace(' verified', '')}
        </span>
      ))}
      {profile.communityStanding && (
        <span className={`badge ${padCls} ${textCls} ${profile.communityStanding === 'positive' ? 'bg-accent-50 text-accent-700' : profile.communityStanding === 'neutral' ? 'bg-ink-100 text-ink-600' : 'bg-amber-50 text-amber-700'}`}>
          <ShieldCheck className={`${iconCls}`} />
          {profile.communityStanding === 'positive' ? 'Good standing' : profile.communityStanding === 'neutral' ? 'Neutral' : 'Under monitoring'}
        </span>
      )}
    </div>
  );
}

export function VerificationPill({ state }: { state: 'verified' | 'pending' | 'unverified' | 'could_not_verify' }) {
  const map = {
    verified: { icon: CheckCircle2, cls: 'text-accent-600', label: 'Verified' },
    pending: { icon: Clock, cls: 'text-amber-500', label: 'Pending' },
    unverified: { icon: Clock, cls: 'text-ink-400', label: 'Not started' },
    could_not_verify: { icon: XCircle, cls: 'text-red-500', label: 'Could not verify' },
  };
  const { icon: Icon, cls, label } = map[state];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${cls}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, { tone: 'neutral' | 'brand' | 'accent' | 'amber' | 'red' | 'slate'; icon: typeof CheckCircle2 }> = {
    'Not started': { tone: 'slate', icon: Clock },
    'In progress': { tone: 'brand', icon: Clock },
    Blocked: { tone: 'red', icon: AlertTriangle },
    'Ready for review': { tone: 'amber', icon: Clock },
    'Changes requested': { tone: 'red', icon: AlertTriangle },
    'Needs discussion': { tone: 'amber', icon: AlertTriangle },
    Approved: { tone: 'accent', icon: CheckCircle2 },
    Completed: { tone: 'accent', icon: CheckCircle2 },
  };
  const cfg = map[status] || { tone: 'neutral' as const, icon: Clock };
  const { icon: Icon } = cfg;
  return (
    <Badge tone={cfg.tone}>
      <Icon className="w-3 h-3" />
      {status}
    </Badge>
  );
}

export function Card({ children, className = '', hover = false, onClick, style }: { children: ReactNode; className?: string; hover?: boolean; onClick?: () => void; style?: React.CSSProperties }) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`${hover ? 'card-hover cursor-pointer' : 'card'} ${className}`}
    >
      {children}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const titleId = useId();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`bg-white rounded-xl shadow-xl border border-ink-200 w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[85vh] overflow-y-auto animate-fadein`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-200 sticky top-0 bg-white rounded-t-xl">
          <h3 id={titleId} className="font-semibold text-ink-900">{title}</h3>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="text-ink-400 hover:text-ink-700 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children, hint, required = false }: { label: string; children: ReactNode; hint?: string; required?: boolean }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-red-500"> *</span>}</label>
      {children}
      {hint && <p className="text-xs text-ink-400 mt-1">{hint}</p>}
    </div>
  );
}

export function BetaNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-xs text-ink-500 bg-ink-100 rounded-lg px-3 py-2">
      <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0 text-brand-500" />
      <span>{children}</span>
    </div>
  );
}
