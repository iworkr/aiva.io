/**
 * Manage Calendar Accounts Dialog
 * Add, remove, and manage calendar connections
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {  
  Mail,
  Calendar,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAction } from 'next-safe-action/hooks';
import {
  getCalendarConnections,
  deleteCalendarConnectionAction,
} from '@/data/user/calendar';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ManageAccountsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  userId: string;
}

export function ManageAccountsDialog({
  open,
  onOpenChange,
  workspaceId,
  userId,
}: ManageAccountsDialogProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch accounts
  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const data = await getCalendarConnections(workspaceId, userId);
      setAccounts(data || []);
    } catch (error) {
      toast.error('Failed to load accounts');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAccounts();
    }
  }, [open, workspaceId, userId]);

  // Delete account
  const { execute: deleteAccount, status: deleteStatus } = useAction(
    deleteCalendarConnectionAction,
    {
      onSuccess: () => {
        toast.success('Account removed successfully');
        fetchAccounts();
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Failed to remove account');
      },
    }
  );

  const getProviderLogo = (provider: string) => {
    const providerLower = provider.toLowerCase();
    
    if (providerLower === 'aiva') {
      return <Calendar className="h-6 w-6 text-primary" />;
    }
    
    if (providerLower === 'outlook' || providerLower === 'microsoft' || providerLower === 'outlook_calendar') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48">
          <path fill="#1976d2" d="M28,13h14.533C43.343,13,44,13.657,44,14.467v19.066C44,34.343,43.343,35,42.533,35H28V13z"></path>
          <rect width="14" height="15.542" x="28" y="17.958" fill="#fff"></rect>
          <polygon fill="#1976d2" points="27,44 4,39.5 4,8.5 27,4"></polygon>
          <path fill="#fff" d="M15.25,16.5c-3.176,0-5.75,3.358-5.75,7.5s2.574,7.5,5.75,7.5S21,28.142,21,24 S18.426,16.5,15.25,16.5z M15,28.5c-1.657,0-3-2.015-3-4.5s1.343-4.5,3-4.5s3,2.015,3,4.5S16.657,28.5,15,28.5z"></path>
          <rect width="2.7" height="2.9" x="28.047" y="29.737" fill="#1976d2"></rect>
          <rect width="2.7" height="2.9" x="31.448" y="29.737" fill="#1976d2"></rect>
          <rect width="2.7" height="2.9" x="34.849" y="29.737" fill="#1976d2"></rect>
          <rect width="2.7" height="2.9" x="28.047" y="26.159" fill="#1976d2"></rect>
          <rect width="2.7" height="2.9" x="31.448" y="26.159" fill="#1976d2"></rect>
          <rect width="2.7" height="2.9" x="34.849" y="26.159" fill="#1976d2"></rect>
          <rect width="2.7" height="2.9" x="38.25" y="26.159" fill="#1976d2"></rect>
          <rect width="2.7" height="2.9" x="28.047" y="22.706" fill="#1976d2"></rect>
          <rect width="2.7" height="2.9" x="31.448" y="22.706" fill="#1976d2"></rect>
          <rect width="2.7" height="2.9" x="34.849" y="22.706" fill="#1976d2"></rect>
          <rect width="2.7" height="2.9" x="38.25" y="22.706" fill="#1976d2"></rect>
          <rect width="2.7" height="2.9" x="31.448" y="19.112" fill="#1976d2"></rect>
          <rect width="2.7" height="2.9" x="34.849" y="19.112" fill="#1976d2"></rect>
          <rect width="2.7" height="2.9" x="38.25" y="19.112" fill="#1976d2"></rect>
        </svg>
      );
    }
    
    if (providerLower === 'gmail' || providerLower === 'google' || providerLower === 'google_calendar') {
      return (
        <Image
          src="https://static.cdnlogo.com/logos/g/96/google-calendar.svg"
          alt="Google Calendar logo"
          width={24}
          height={24}
          className="object-contain"
          loading="lazy"
          unoptimized
        />
      );
    }
    
    if (providerLower === 'apple' || providerLower === 'apple_calendar') {
      return (
        <Image
          src="https://static.cdnlogo.com/logos/a/19/apple.svg"
          loading="lazy"
          unoptimized
          alt="Apple Calendar logo"
          width={24}
          height={24}
          className="object-contain"
        />
      );
    }
    
    return <Calendar className="h-6 w-6 text-muted-foreground" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-sky-500/10 text-sky-600 border-sky-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Calendar Accounts</DialogTitle>
          <DialogDescription>
            Add, remove, or manage your connected calendar accounts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Connected Accounts */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Connected Accounts</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No calendar accounts connected yet
              </div>
            ) : (
              <div className="space-y-2">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-primary/5 hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        {getProviderLogo(account.provider)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {account.provider === 'aiva' ? 'Aiva Calendar' : account.provider_account_email}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {account.provider === 'aiva' ? 'Default Calendar' : account.provider.replace('_', ' ')}
                        </p>
                      </div>
                      {getStatusBadge(account.status)}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {account.provider !== 'aiva' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => fetchAccounts()}
                            title="Refresh connection"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm('Are you sure you want to remove this account?')) {
                                deleteAccount({
                                  id: account.id,
                                  workspaceId,
                                });
                              }
                            }}
                            disabled={deleteStatus === 'executing'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {account.provider === 'aiva' && (
                        <Badge variant="secondary" className="text-xs">
                          Built-in
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Account */}
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold mb-3">Add New Account</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                className="group flex flex-col items-center gap-3 p-6 border border-border rounded-lg hover:bg-primary/5 hover:border-primary/30 transition-all"
                onClick={() => {
                  toast.info('Google Calendar integration coming soon');
                }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted group-hover:bg-background transition-colors">
                  <Image
                    src="https://static.cdnlogo.com/logos/g/96/google-calendar.svg"
                    alt="Google Calendar"
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                </div>
                <span className="text-sm font-medium">Connect Google Calendar</span>
              </button>
              <button
                className="group flex flex-col items-center gap-3 p-6 border border-border rounded-lg hover:bg-primary/5 hover:border-primary/30 transition-all"
                onClick={() => {
                  toast.info('Outlook integration coming soon');
                }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted group-hover:bg-background transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 48 48">
                    <path fill="#1976d2" d="M28,13h14.533C43.343,13,44,13.657,44,14.467v19.066C44,34.343,43.343,35,42.533,35H28V13z"></path>
                    <rect width="14" height="15.542" x="28" y="17.958" fill="#fff"></rect>
                    <polygon fill="#1976d2" points="27,44 4,39.5 4,8.5 27,4"></polygon>
                    <path fill="#fff" d="M15.25,16.5c-3.176,0-5.75,3.358-5.75,7.5s2.574,7.5,5.75,7.5S21,28.142,21,24 S18.426,16.5,15.25,16.5z M15,28.5c-1.657,0-3-2.015-3-4.5s1.343-4.5,3-4.5s3,2.015,3,4.5S16.657,28.5,15,28.5z"></path>
                    <rect width="2.7" height="2.9" x="28.047" y="29.737" fill="#1976d2"></rect>
                    <rect width="2.7" height="2.9" x="31.448" y="29.737" fill="#1976d2"></rect>
                    <rect width="2.7" height="2.9" x="34.849" y="29.737" fill="#1976d2"></rect>
                    <rect width="2.7" height="2.9" x="28.047" y="26.159" fill="#1976d2"></rect>
                    <rect width="2.7" height="2.9" x="31.448" y="26.159" fill="#1976d2"></rect>
                    <rect width="2.7" height="2.9" x="34.849" y="26.159" fill="#1976d2"></rect>
                    <rect width="2.7" height="2.9" x="38.25" y="26.159" fill="#1976d2"></rect>
                    <rect width="2.7" height="2.9" x="28.047" y="22.706" fill="#1976d2"></rect>
                    <rect width="2.7" height="2.9" x="31.448" y="22.706" fill="#1976d2"></rect>
                    <rect width="2.7" height="2.9" x="34.849" y="22.706" fill="#1976d2"></rect>
                    <rect width="2.7" height="2.9" x="38.25" y="22.706" fill="#1976d2"></rect>
                    <rect width="2.7" height="2.9" x="31.448" y="19.112" fill="#1976d2"></rect>
                    <rect width="2.7" height="2.9" x="34.849" y="19.112" fill="#1976d2"></rect>
                    <rect width="2.7" height="2.9" x="38.25" y="19.112" fill="#1976d2"></rect>
                  </svg>
                </div>
                <span className="text-sm font-medium">Connect Outlook Calendar</span>
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

