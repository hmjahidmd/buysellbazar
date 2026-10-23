import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  const sizeMap = {
    sm: 'w-3.5 h-3.5 text-xs',
    md: 'w-4 h-4 text-sm',
    lg: 'w-5 h-5 text-base',
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium text-verified-blue ${sizeMap[size]} ${className}`}
      title="National NID Verified Seller (e-KYC & Biometric Match)"
    >
      <ShieldCheck
        size={iconSizes[size]}
        className="fill-verified-blue/15 text-verified-blue shrink-0"
      />
      {showLabel && <span className="font-semibold text-xs tracking-tight">Verified</span>}
    </span>
  );
};

export default VerifiedBadge;
