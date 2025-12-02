/**
 * Contacts View (Performance Optimized)
 * Main contacts list with search, filter, and management
 * Features: Debounced search, localStorage caching, optimistic updates
 */

'use client';

import React, { useEffect, useState, useMemo, useCallback, useTransition, useDeferredValue, memo, Suspense } from 'react';
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
import { LazyCreateEditContactDialog, LazyContactDetailDialog } from '@/components/lazy/LazyDialogs';
import { ContactTile } from './ContactTile';
import { ContactsSkeleton } from './ContactsSkeleton';
import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useDebouncedValue } from '@/hooks/usePrefetch';

interface ContactsViewProps {
  workspaceId: string;
  userId: string;
}

const CONTACTS_PER_PAGE = 12; // Show 12 contacts per page (4x3 grid)

export const ContactsView = memo(function ContactsView({ workspaceId, userId }: ContactsViewProps) {
  const [allContacts, setAllContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useLocalStorage(
    `contacts-favorites-filter-${workspaceId}`,
    false
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [isPending, startTransition] = useTransition();
  
  // Pagination state
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce search query for better performance
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  // Fetch initial contacts (with pagination)
  const fetchContacts = useCallback(async (reset = true) => {
    if (reset) {
      setLoading(true);
      setCurrentOffset(0);
    }
    try {
      const data = await getContacts(workspaceId, userId, {
        isFavorite: showFavoritesOnly || undefined,
        limit: CONTACTS_PER_PAGE,
        offset: 0,
      });
      const contactsList = data || [];
      setAllContacts(contactsList);
      setHasMore(contactsList.length === CONTACTS_PER_PAGE);
      setTotalCount(contactsList.length);
    } catch (error) {
      toast.error('Failed to load contacts');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, userId, showFavoritesOnly]);

  // Load more contacts
  const loadMoreContacts = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const nextOffset = currentOffset + CONTACTS_PER_PAGE;
      const data = await getContacts(workspaceId, userId, {
        isFavorite: showFavoritesOnly || undefined,
        limit: CONTACTS_PER_PAGE,
        offset: nextOffset,
      });
      const newContacts = data || [];
      
      if (newContacts.length > 0) {
        setAllContacts((prev) => [...prev, ...newContacts]);
        setCurrentOffset(nextOffset);
        setTotalCount((prev) => prev + newContacts.length);
      }
      
      setHasMore(newContacts.length === CONTACTS_PER_PAGE);
    } catch (error) {
      toast.error('Failed to load more contacts');
      console.error(error);
    } finally {
      setLoadingMore(false);
    }
  }, [workspaceId, userId, showFavoritesOnly, currentOffset, loadingMore, hasMore]);

  useEffect(() => {
    startTransition(() => {
      fetchContacts(true);
    });
  }, [fetchContacts]);

  // Client-side filtering for instant search feedback
  const contacts = useMemo(() => {
    if (!debouncedSearchQuery) return allContacts;
    
    const query = debouncedSearchQuery.toLowerCase();
    return allContacts.filter((contact) => {
      const fullName = (contact.full_name || '').toLowerCase();
      const email = (contact.email || '').toLowerCase();
      const company = (contact.company || '').toLowerCase();
      const phone = (contact.phone || '').toLowerCase();
      
      return (
        fullName.includes(query) ||
        email.includes(query) ||
        company.includes(query) ||
        phone.includes(query)
      );
    });
  }, [allContacts, debouncedSearchQuery]);

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
    setAllContacts((prev) =>
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
    setAllContacts((prev) => prev.filter((c) => c.id !== contact.id));
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
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9 bg-background border-2 border-border hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/20"
                aria-label="Search contacts by name, email, or company"
              />
            </div>
            
            {/* Favorites Filter */}
            <Button
              variant={showFavoritesOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              aria-label={showFavoritesOnly ? 'Show all contacts' : 'Show only favorite contacts'}
              aria-pressed={showFavoritesOnly}
            >
              <Star className={cn('h-4 w-4 mr-2', showFavoritesOnly && 'fill-current')} aria-hidden="true" />
              Favorites
            </Button>

            {/* Add Contact */}
            <Button 
              onClick={() => {
                // Clear search to ensure dialog opens properly
                setSearchQuery('');
                setSelectedContact(null);
                // Use setTimeout to ensure state is cleared before opening dialog
                setTimeout(() => {
                  setShowCreateDialog(true);
                }, 0);
              }}
              aria-label="Add new contact"
            >
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Add Contact
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <ContactsSkeleton />
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <UserCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {showFavoritesOnly 
                ? 'No favorite contacts yet'
                : searchQuery 
                  ? 'No contacts found'
                  : 'No contacts yet'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {showFavoritesOnly
                ? 'Star some contacts to see them here'
                : searchQuery
                  ? `No contacts match "${searchQuery}"`
                  : 'Add your first contact to get started'}
            </p>
            {!searchQuery && !showFavoritesOnly && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            )}
            {showFavoritesOnly && (
              <Button 
                variant="outline"
                onClick={() => setShowFavoritesOnly(false)}
              >
                Show All Contacts
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Contacts Grid */}
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
            
            {/* Pagination Footer */}
            <div className="flex flex-col items-center gap-3 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
                {hasMore && ' • More available'}
              </p>
              
              {/* Load More Button */}
              {hasMore && !debouncedSearchQuery && (
                <Button
                  variant="outline"
                  onClick={loadMoreContacts}
                  disabled={loadingMore}
                  className="min-w-[140px]"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Contact Dialog - Lazy Loaded */}
      <Suspense fallback={null}>
        <LazyCreateEditContactDialog
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
      </Suspense>

      {/* Contact Detail Dialog - Lazy Loaded */}
      {selectedContact && (
        <Suspense fallback={null}>
          <LazyContactDetailDialog
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
        </Suspense>
      )}
    </div>
  );
});
