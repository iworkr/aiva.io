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
import { Loader2 } from 'lucide-react';
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
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg font-semibold">
            {isEditing ? 'Edit Contact' : 'Add Contact'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {isEditing
              ? 'Update contact details'
              : 'Create a new contact profile'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="fullName" className="text-xs">Full Name *</Label>
              <Input
                id="fullName"
                {...form.register('fullName')}
                placeholder="Full name"
                className="h-9"
              />
              {form.formState.errors.fullName && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.fullName.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName" className="text-xs">First</Label>
                <Input
                  id="firstName"
                  {...form.register('firstName')}
                  placeholder="First"
                  className="h-9"
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-xs">Last</Label>
                <Input
                  id="lastName"
                  {...form.register('lastName')}
                  placeholder="Last"
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input
                id="email"
                type="email"
                {...form.register('email')}
                placeholder="email@example.com"
                className="h-9"
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="phone" className="text-xs">Phone</Label>
              <Input
                id="phone"
                {...form.register('phone')}
                placeholder="+1 234 567 8900"
                className="h-9"
              />
            </div>
          </div>

          {/* Professional */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="company" className="text-xs">Company</Label>
              <Input
                id="company"
                {...form.register('company')}
                placeholder="Company"
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="jobTitle" className="text-xs">Job Title</Label>
              <Input
                id="jobTitle"
                {...form.register('jobTitle')}
                placeholder="Title"
                className="h-9"
              />
            </div>
          </div>

          {/* Additional */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="avatarUrl" className="text-xs">Avatar URL</Label>
              <Input
                id="avatarUrl"
                {...form.register('avatarUrl')}
                placeholder="https://..."
                className="h-9"
              />
            </div>

            <div>
              <Label htmlFor="bio" className="text-xs">Bio</Label>
              <Textarea
                id="bio"
                {...form.register('bio')}
                placeholder="Brief description..."
                rows={2}
                className="resize-none"
              />
            </div>

            <div>
              <Label htmlFor="notes" className="text-xs">Notes</Label>
              <Textarea
                id="notes"
                {...form.register('notes')}
                placeholder="Private notes..."
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-8"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="h-8">
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

