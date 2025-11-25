/**
 * Create/Edit Contact Dialog
 * Form for creating or editing contact profiles
 */

'use client';

import React, { useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Loader2, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAction } from 'next-safe-action/hooks';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createContactAction, updateContactAction } from '@/data/user/contacts';
import { createContactSchema } from '@/utils/zod-schemas/aiva-schemas';
import { z } from 'zod';

interface CreateEditContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  userId: string;
  contact?: any | null;
  onSuccess: () => void;
}

export function CreateEditContactDialog({
  open,
  onOpenChange,
  workspaceId,
  userId,
  contact,
  onSuccess,
}: CreateEditContactDialogProps) {
  const isEditing = !!contact;

  const form = useForm({
    resolver: zodResolver(createContactSchema),
    defaultValues: {
      workspaceId,
      fullName: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: '',
      jobTitle: '',
      avatarUrl: '',
      bio: '',
      notes: '',
    },
  });

  // Reset form when contact changes
  useEffect(() => {
    if (contact) {
      form.reset({
        workspaceId,
        fullName: contact.full_name || '',
        firstName: contact.first_name || '',
        lastName: contact.last_name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        company: contact.company || '',
        jobTitle: contact.job_title || '',
        avatarUrl: contact.avatar_url || '',
        bio: contact.bio || '',
        notes: contact.notes || '',
      });
    } else {
      form.reset({
        workspaceId,
        fullName: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        company: '',
        jobTitle: '',
        avatarUrl: '',
        bio: '',
        notes: '',
      });
    }
  }, [contact, workspaceId, open]);

  // Create contact
  const { execute: createContact, status: createStatus } = useAction(createContactAction, {
    onSuccess: () => {
      toast.success('Contact created successfully');
      onSuccess();
      onOpenChange(false);
      form.reset();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to create contact');
    },
  });

  // Update contact
  const { execute: updateContact, status: updateStatus } = useAction(updateContactAction, {
    onSuccess: () => {
      toast.success('Contact updated successfully');
      onSuccess();
      onOpenChange(false);
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to update contact');
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    if (isEditing) {
      updateContact({
        id: contact.id,
        ...data,
      });
    } else {
      createContact(data);
    }
  });

  const isSubmitting = createStatus === 'executing' || updateStatus === 'executing';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            {isEditing ? 'Edit Contact' : 'Add New Contact'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update contact information and linked channels'
              : 'Create a new unified contact profile'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Basic Information</h3>
            
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                {...form.register('fullName')}
                placeholder="e.g., Theo Lewis"
              />
              {form.formState.errors.fullName && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.fullName.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  {...form.register('firstName')}
                  placeholder="Theo"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  {...form.register('lastName')}
                  placeholder="Lewis"
                />
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Contact Details</h3>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...form.register('email')}
                placeholder="theo@example.com"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                {...form.register('phone')}
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>

          {/* Professional Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Professional Information</h3>
            
            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                {...form.register('company')}
                placeholder="Aiva Inc."
              />
            </div>

            <div>
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                {...form.register('jobTitle')}
                placeholder="Software Engineer"
              />
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Additional Information</h3>
            
            <div>
              <Label htmlFor="avatarUrl">Avatar URL</Label>
              <Input
                id="avatarUrl"
                {...form.register('avatarUrl')}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                {...form.register('bio')}
                placeholder="Brief bio or description..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...form.register('notes')}
                placeholder="Private notes about this contact..."
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Update Contact' : 'Create Contact'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

