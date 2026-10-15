import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Clock, HelpCircle, ShieldAlert } from 'lucide-react';
import { StockStatus, VerificationStatus, AlertType } from '../../../shared/types';

interface StatusBadgeProps {
  status?: StockStatus | string;
  verification?: VerificationStatus;
  alertType?: AlertType;
  quantity?: number | null;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  verification,
  alertType,
  quantity,
  className = '',
}) => {
  if (verification) {
    switch (verification) {
      case 'VERIFIED':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Verified Page
          </span>
        );
      case 'POTENTIAL_MATCH':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 ${className}`}>
            <HelpCircle className="w-3 h-3 text-blue-600" />
            Potential Match
          </span>
        );
      case 'NEEDS_VERIFICATION':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 ${className}`}>
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Needs Verification
          </span>
        );
      case 'UNVERIFIED':
      default:
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 ${className}`}>
            <HelpCircle className="w-3 h-3 text-slate-400" />
            Unverified
          </span>
        );
    }
  }

  if (alertType) {
    switch (alertType) {
      case 'PRICE_INCREASE':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 ${className}`}>
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Price Spike (+10%+)
          </span>
        );
      case 'PRICE_DECREASE':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Price Drop
          </span>
        );
      case 'OUT_OF_STOCK':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 ${className}`}>
            <XCircle className="w-3 h-3 text-red-600" />
            Stock Depleted
          </span>
        );
      case 'IN_STOCK':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Restocked
          </span>
        );
      case 'AVAILABILITY_CHANGE':
      default:
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 ${className}`}>
            <ShieldAlert className="w-3 h-3 text-amber-600" />
            Availability Changed
          </span>
        );
    }
  }

  switch (status) {
    case 'IN_STOCK':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          In Stock {quantity !== null && quantity !== undefined ? `(${quantity.toLocaleString()})` : ''}
        </span>
      );
    case 'LIMITED_STOCK':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 ${className}`}>
          <AlertTriangle className="w-3 h-3 text-amber-500" />
          Limited Stock {quantity !== null && quantity !== undefined ? `(${quantity.toLocaleString()})` : ''}
        </span>
      );
    case 'OUT_OF_STOCK':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 ${className}`}>
          <XCircle className="w-3 h-3 text-red-500" />
          Out of Stock
        </span>
      );
    case 'BACKORDER':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 ${className}`}>
          <Clock className="w-3 h-3 text-purple-500" />
          Backorder
        </span>
      );
    case 'UNKNOWN':
    default:
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 ${className}`}>
          <HelpCircle className="w-3 h-3 text-slate-400" />
          Not Published
        </span>
      );
  }
};
