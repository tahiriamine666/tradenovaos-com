import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, ExternalLink, Loader2, Crown, Sparkles, ChevronLeft, Shield, Download, RotateCcw, XCircle } from 'lucide-react';
import { fetchBillingSummary, setCancelAtPeriodEnd, startPaymentMethodUpdate, downloadInvoice, formatMinorAmount, intervalLabel, type BillingSummary } from '@/lib/billingNative';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlan } from '@/hooks/usePlan';
import { openCustomerPortal } from '@/lib/dodo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface BillingRow {
  plan: 'pro' | 'elite' | null;
  status: string | null;
  trial_end: string | null;
  renews_at: string | null;
  ends_at: string | null;
  dodo_subscription_id: string | null;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    return iso;
  }
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  on_trial:  { label: 'Trial active',   color: 'bg-primary/15 text-primary dark:text-primary' },
  trialing:  { label: 'Trial active',   color: 'bg-primary/15 text-primary dark:text-primary' },
  active:    { label: 'Active',         color: 'bg-primary/15 text-primary dark:text-primary' },
  past_due:  { label: 'Past due',       color: 'bg-muted/15 text-muted-foreground dark:text-muted-foreground' },
  paused:    { label: 'Paused',         color: 'bg-muted/15 text-muted-foreground dark:text-muted-foreground' },
  cancelled: { label: 'Cancelled',      color: 'bg-muted text-muted-foreground' },
  canceled:  { label: 'Cancelled',      color: 'bg-muted text-muted-foreground' },
  expired:   { label: 'Expired',        color: 'bg-muted text-muted-foreground' },
  inactive:  { label: 'No subscription', color: 'bg-muted text-muted-foreground' },
};

