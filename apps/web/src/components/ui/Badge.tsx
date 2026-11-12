import type { HTMLAttributes } from 'react';

type BadgeVariant =
  | 'valid'
  | 'revoked'
  | 'mismatch'
  | 'siginvalid'
  | 'untrusted'
  | 'expired'
  | 'notfound'
  | 'unavailable'
  | 'pending'
  | 'issued'
  | 'failed'
  | 'active'
  | 'disabled'
  | 'retired'
  | 'compromised'
  | 'default'
  | string;

const variantStyles: Record<BadgeVariant, string> = {
  valid: 'bg-valid-bg text-valid-fg',
  revoked: 'bg-revoked-bg text-revoked-fg',
  mismatch: 'bg-mismatch-bg text-mismatch-fg',
  siginvalid: 'bg-siginvalid-bg text-siginvalid-fg',
  untrusted: 'bg-untrusted-bg text-untrusted-fg',
  expired: 'bg-expired-bg text-expired-fg',
  notfound: 'bg-notfound-bg text-notfound-fg',
  unavailable: 'bg-unavailable-bg text-unavailable-fg',
  pending: 'bg-yellow-100 text-yellow-800',
  issued: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  active: 'bg-green-100 text-green-800',
  disabled: 'bg-gray-100 text-gray-800',
  retired: 'bg-amber-100 text-amber-800',
  compromised: 'bg-red-100 text-red-800',
  default: 'bg-gray-100 text-gray-800',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
}

export function Badge({
  variant = 'default',
  icon,
  children,
  className = '',
  ...props
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium
        ${variantStyles[variant]} ${className}
      `}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}
