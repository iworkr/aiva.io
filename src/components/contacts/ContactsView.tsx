/**
 * Contacts View (Performance Optimized)
 * Main contacts list with search, filter, and management
 * Features: Debounced search, localStorage caching, optimistic updates
 */

'use client';

import React, { useEffect, useState, useMemo, useCallback, useTransition, memo, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  UserCircle,
  Plus,
  Search,
  Star,
  Loader2,
  LayoutGrid,
  List,
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
import { useCachedData } from '@/hooks/useCachedData';

interface ContactsViewProps {
  workspaceId: string;
  userId: string;
}

// Sanitize contact name - remove leading/trailing quotes and special chars
const sanitizeContactName = (name: string): string => {
  if (!name) return '';
  return name.replace(/^["'"'"']+|["'"'"']+$/g, '').trim();
};

const CONTACTS_PER_PAGE = 12; // Show 12 contacts per page (4x3 grid)

export const ContactsView = memo(function ContactsView({ workspaceId, userId }: ContactsViewProps) {
  const [additionalContacts, setAdditionalContacts] = useState<any[]>([]); // For pagination
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useLocalStorage(
    `contacts-favorites-filter-${workspaceId}`,
    false
  );
  const [viewMode, setViewMode] = useLocalStorage<'grid' | 'list'>(
    `contacts-view-mode-${workspaceId}`,
    'grid'
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [isPending, startTransition] = useTransition();
  
  // Pagination state
  const [currentOffset, setCurrentOffset] = useState(CONTACTS_PER_PAGE);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // Optimistic updates - track changes before server confirms
  const [optimisticUpdates, setOptimisticUpdates] = useState<{
    toggledFavorites: Set<string>;
    deletedIds: Set<string>;
  }>({ toggledFavorites: new Set(), deletedIds: new Set() });

  // Debounce search query for better performance
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  
  // Use cached data for initial contacts - shows instantly if cached
  const {
    data: cachedContacts,
    isLoading: loading,
    isRefreshing,
    refresh: refreshContacts,
  } = useCachedData<any[]>(
    `contacts-${workspaceId}-${showFavoritesOnly ? 'favorites' : 'all'}`,
    useCallback(async () => {
      const data = await getContacts(workspaceId, userId, {
        isFavorite: showFavoritesOnly || undefined,
        limit: CONTACTS_PER_PAGE,
        offset: 0,
      });
      return data || [];
    }, [workspaceId, userId, showFavoritesOnly]),
    {
      ttl: 3 * 60 * 1000, // 3 minutes cache
      deps: [workspaceId, userId, showFavoritesOnly],
      onUpdate: (data) => {
        // Reset pagination when initial data updates
        setAdditionalContacts([]);
        setCurrentOffset(data.length);
        setHasMore(data.length === CONTACTS_PER_PAGE);
        setTotalCount(data.length);
        // Clear optimistic updates when fresh data arrives
        setOptimisticUpdates({ toggledFavorites: new Set(), deletedIds: new Set() });
      },
    }
  );

  // Combine cached contacts with additional paginated contacts, applying optimistic updates
  const allContacts = useMemo(() => {
    const base = cachedContacts || [];
    const combined = [...base, ...additionalContacts];
    
    // Apply optimistic updates
    return combined
      .filter(c => !optimisticUpdates.deletedIds.has(c.id))
      .map(c => ({
        ...c,
        is_favorite: optimisticUpdates.toggledFavorites.has(c.id) 
          ? !c.is_favorite 
          : c.is_favorite,
      }));
  }, [cachedContacts, additionalContacts, optimisticUpdates]);

  // Legacy fetchContacts for backward compatibility
  const fetchContacts = useCallback(async (reset = true) => {
    if (reset) {
      setAdditionalContacts([]);
      setCurrentOffset(CONTACTS_PER_PAGE);
      refreshContacts();
    }
  }, [refreshContacts]);

  // Load more contacts (pagination)
  const loadMoreContacts = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const data = await getContacts(workspaceId, userId, {
        isFavorite: showFavoritesOnly || undefined,
        limit: CONTACTS_PER_PAGE,
        offset: currentOffset,
      });
      const newContacts = data || [];
      
      if (newContacts.length > 0) {
        setAdditionalContacts((prev) => [...prev, ...newContacts]);
        setCurrentOffset((prev) => prev + newContacts.length);
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
      refreshContacts();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to toggle favorite');
      // Revert optimistic update by clearing
      setOptimisticUpdates({ toggledFavorites: new Set(), deletedIds: new Set() });
      refreshContacts();
    },
  });

  // Optimistic toggle favorite
  const handleToggleFavorite = useCallback((contact: any) => {
    // Apply optimistic update
    setOptimisticUpdates(prev => {
      const newToggles = new Set(prev.toggledFavorites);
      if (newToggles.has(contact.id)) {
        newToggles.delete(contact.id); // Toggle off if already toggled
      } else {
        newToggles.add(contact.id);
      }
      return { ...prev, toggledFavorites: newToggles };
    });
    // Execute actual update
    toggleFavorite({ id: contact.id, workspaceId });
  }, [toggleFavorite, workspaceId]);

  // Delete contact with optimistic update
  const { execute: deleteContact } = useAction(deleteContactAction, {
    onSuccess: () => {
      toast.success('Contact deleted successfully');
      refreshContacts();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to delete contact');
      // Revert optimistic delete
      setOptimisticUpdates({ toggledFavorites: new Set(), deletedIds: new Set() });
      refreshContacts();
    },
  });

  // Optimistic delete
  const handleDeleteContact = useCallback((contact: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const displayName = sanitizeContactName(contact.full_name) || contact.full_name;
    if (!confirm(`Are you sure you want to delete ${displayName}?`)) return;
    
    // Apply optimistic delete
    setOptimisticUpdates(prev => {
      const newDeleted = new Set(prev.deletedIds);
      newDeleted.add(contact.id);
      return { ...prev, deletedIds: newDeleted };
    });
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

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Minimal Header */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-medium">Contacts</h1>
            <span className="text-sm text-muted-foreground">({contacts.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Search - Compact */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 h-8 pl-8 text-sm bg-muted/30 border-border/50 hover:border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                aria-label="Search contacts by name, email, or company"
              />
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center rounded-lg border border-border/50 p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
            
            {/* Favorites Filter - Icon only */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={cn(
                'h-8 w-8 rounded-lg',
                showFavoritesOnly && 'bg-primary/10 text-primary'
              )}
              aria-label={showFavoritesOnly ? 'Show all contacts' : 'Show only favorite contacts'}
              aria-pressed={showFavoritesOnly}
            >
              <Star className={cn('h-4 w-4', showFavoritesOnly && 'fill-current')} aria-hidden="true" />
            </Button>

            {/* Add Contact - Compact */}
            <Button 
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedContact(null);
                setTimeout(() => {
                  setShowCreateDialog(true);
                }, 0);
              }}
              className="h-8 gap-1.5"
              aria-label="Add new contact"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {loading ? (
          <ContactsSkeleton />
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <UserCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              {showFavoritesOnly
                ? 'No favorites yet'
                : searchQuery
                  ? `No contacts match "${searchQuery}"`
                  : 'No contacts yet'}
            </p>
            {!searchQuery && !showFavoritesOnly && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowCreateDialog(true)}
                className="h-8 gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Contact
              </Button>
            )}
            {showFavoritesOnly && (
              <button
                onClick={() => setShowFavoritesOnly(false)}
                className="text-sm text-primary hover:underline"
              >
                Show all contacts
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Contacts - Grid or List */}
            <div className={cn(
              viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3' 
                : 'flex flex-col gap-1'
            )}>
            {contacts.map((contact) => (
              <ContactTile
                key={contact.id}
                contact={contact}
                  variant={viewMode}
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
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                {hasMore 
                  ? `Showing ${contacts.length} of ${totalCount} or more contacts`
                  : `Showing ${contacts.length} contact${contacts.length !== 1 ? 's' : ''}`
                }
              </p>
              {hasMore && !debouncedSearchQuery && (
                <button
                  onClick={loadMoreContacts}
                  disabled={loadingMore}
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Load more
                      <span className="text-muted-foreground">({CONTACTS_PER_PAGE})</span>
                    </>
                  )}
                </button>
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
