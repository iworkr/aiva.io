/**
 * Contacts View (Performance Optimized)
 * Main contacts list with search, filter, and management
 * Features: Debounced search, localStorage caching, optimistic updates
 */

'use client';

import React, { useEffect, useState, useMemo, useCallback, useTransition, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  UserCircle,
  Plus,
  Search,
  Star,
  Mail,
  Phone,
  Building,
  Instagram,
  MessageCircle,
  Loader2,
  Trash2,
  Edit,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAction } from 'next-safe-action/hooks';
import {
  getContacts,
  deleteContactAction,
  toggleContactFavoriteAction,
} from '@/data/user/contacts';
import { CreateEditContactDialog } from './CreateEditContactDialog';
import { ContactDetailDialog } from './ContactDetailDialog';
import { ContactTile } from './ContactTile';
import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useDebouncedValue } from '@/hooks/usePrefetch';

interface ContactsViewProps {
  workspaceId: string;
  userId: string;
}

export const ContactsView = memo(function ContactsView({ workspaceId, userId }: ContactsViewProps) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useLocalStorage(
    `contacts-favorites-filter-${workspaceId}`,
    false
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Debounce search query for better performance
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  // Fetch contacts with memoization
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getContacts(workspaceId, userId, {
        search: debouncedSearchQuery || undefined,
        isFavorite: showFavoritesOnly || undefined,
      });
      setContacts(data || []);
    } catch (error) {
      toast.error('Failed to load contacts');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, userId, debouncedSearchQuery, showFavoritesOnly]);

  useEffect(() => {
    startTransition(() => {
      fetchContacts();
    });
  }, [fetchContacts]);

  // Toggle favorite with optimistic update
  const { execute: toggleFavorite } = useAction(toggleContactFavoriteAction, {
    onSuccess: () => {
      // Silently refetch in background
      fetchContacts();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to toggle favorite');
      // Revert optimistic update
      fetchContacts();
    },
  });

  // Optimistic toggle favorite
  const handleToggleFavorite = useCallback((contact: any) => {
    // Optimistically update UI
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contact.id ? { ...c, is_favorite: !c.is_favorite } : c
      )
    );
    // Execute actual update
    toggleFavorite({ id: contact.id, workspaceId });
  }, [toggleFavorite, workspaceId]);

  // Delete contact with optimistic update
  const { execute: deleteContact } = useAction(deleteContactAction, {
    onSuccess: () => {
      toast.success('Contact deleted successfully');
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to delete contact');
      // Revert optimistic delete
      fetchContacts();
    },
  });

  // Optimistic delete
  const handleDeleteContact = useCallback((contact: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete ${contact.full_name}?`)) return;
    
    // Optimistically remove from UI
    setContacts((prev) => prev.filter((c) => c.id !== contact.id));
    // Execute actual delete
    deleteContact({ id: contact.id, workspaceId });
  }, [deleteContact, workspaceId]);

  const handleContactClick = useCallback((contact: any) => {
    setSelectedContact(contact);
    setShowDetailDialog(true);
  }, []);

  const handleEditContact = useCallback((contact: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedContact(contact);
    setShowCreateDialog(true);
  }, []);

  const getChannelIcon = useCallback((channelType: string) => {
    switch (channelType.toLowerCase()) {
      case 'instagram':
        return <Instagram className="h-4 w-4" />;
      case 'whatsapp':
      case 'sms':
        return <MessageCircle className="h-4 w-4" />;
      case 'email':
      case 'gmail':
      case 'outlook':
        return <Mail className="h-4 w-4" />;
      case 'phone':
        return <Phone className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  }, []);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Contacts</h1>
            <Badge variant="secondary">{contacts.length}</Badge>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9"
              />
            </div>
            
            {/* Favorites Filter */}
            <Button
              variant={showFavoritesOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              <Star className={cn('h-4 w-4 mr-2', showFavoritesOnly && 'fill-current')} />
              Favorites
            </Button>

            {/* Add Contact */}
            <Button onClick={() => {
              setSelectedContact(null);
              setShowCreateDialog(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <UserCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No contacts yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery
                ? 'No contacts match your search'
                : 'Add your first contact to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contacts.map((contact) => (
              <ContactTile
                key={contact.id}
                contact={contact}
                onClick={() => handleContactClick(contact)}
                onToggleFavorite={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite(contact);
                }}
                onEdit={(e) => handleEditContact(contact, e)}
                onDelete={(e) => handleDeleteContact(contact, e)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Contact Dialog */}
      <CreateEditContactDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        workspaceId={workspaceId}
        userId={userId}
        contact={selectedContact}
        onSuccess={() => {
          fetchContacts();
          setSelectedContact(null);
        }}
      />

      {/* Contact Detail Dialog */}
      {selectedContact && (
        <ContactDetailDialog
          open={showDetailDialog}
          onOpenChange={setShowDetailDialog}
          contact={selectedContact}
          workspaceId={workspaceId}
          userId={userId}
          onEdit={() => {
            setShowDetailDialog(false);
            setShowCreateDialog(true);
          }}
          onUpdate={fetchContacts}
        />
      )}
    </div>
  );
});
