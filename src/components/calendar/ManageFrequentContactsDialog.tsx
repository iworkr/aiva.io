/**
 * Manage Frequent Contacts Dialog
 * Add and manage frequently met with contacts
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Users,
  Trash2,
  Plus,
  Loader2,
  Mail,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAction } from 'next-safe-action/hooks';
import {
  getFrequentContacts,
  createFrequentContactAction,
  deleteFrequentContactAction,
} from '@/data/user/calendar';

interface ManageFrequentContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  userId: string;
}

export function ManageFrequentContactsDialog({
  open,
  onOpenChange,
  workspaceId,
  userId,
}: ManageFrequentContactsDialogProps) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', email: '' });

  // Fetch contacts
  const fetchContacts = async () => {
    setLoading(true);
    try {
      const data = await getFrequentContacts(workspaceId, userId);
      setContacts(data || []);
    } catch (error) {
      toast.error('Failed to load contacts');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchContacts();
      setShowAddForm(false);
      setNewContact({ name: '', email: '' });
    }
  }, [open, workspaceId, userId]);

  // Create contact
  const { execute: createContact, status: createStatus } = useAction(
    createFrequentContactAction,
    {
      onSuccess: () => {
        toast.success('Contact added successfully');
        setShowAddForm(false);
        setNewContact({ name: '', email: '' });
        fetchContacts();
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Failed to add contact');
      },
    }
  );

  // Delete contact
  const { execute: deleteContact, status: deleteStatus } = useAction(
    deleteFrequentContactAction,
    {
      onSuccess: () => {
        toast.success('Contact removed successfully');
        fetchContacts();
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Failed to remove contact');
      },
    }
  );

  const handleAddContact = () => {
    if (!newContact.name.trim() || !newContact.email.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    createContact({
      workspaceId,
      name: newContact.name.trim(),
      email: newContact.email.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Frequently Met With
          </DialogTitle>
          <DialogDescription>
            Manage your frequently met contacts for quick scheduling. These contacts will appear as suggestions when creating events.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact List */}
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No frequent contacts yet. Add your first contact below.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          <Mail className="h-3 w-3 inline mr-1" />
                          {contact.email}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive ml-2"
                      onClick={() => {
                        if (confirm(`Remove ${contact.name} from frequent contacts?`)) {
                          deleteContact({
                            id: contact.id,
                            workspaceId,
                          });
                        }
                      }}
                      disabled={deleteStatus === 'executing'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Contact Form */}
          <div className="border-t border-border pt-4">
            {!showAddForm ? (
              <Button
                onClick={() => setShowAddForm(true)}
                className="w-full"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            ) : (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Add New Contact</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., John Doe"
                      value={newContact.name}
                      onChange={(e) =>
                        setNewContact({ ...newContact, name: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddContact();
                        }
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="e.g., john@example.com"
                      value={newContact.email}
                      onChange={(e) =>
                        setNewContact({ ...newContact, email: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddContact();
                        }
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddContact}
                      disabled={createStatus === 'executing'}
                      className="flex-1"
                    >
                      {createStatus === 'executing' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Add
                    </Button>
                    <Button
                      onClick={() => {
                        setShowAddForm(false);
                        setNewContact({ name: '', email: '' });
                      }}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

