'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

type EmailTemplate = {
  name: string;
  subject: string;
  body: string;
  description: string;
};

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    name: 'Custom Email',
    subject: '',
    body: '',
    description: 'Create a custom test email',
  },
  {
    name: 'Urgent: Bulk Order Pricing',
    subject: 'Urgent: Need to discuss custom product pricing for bulk order',
    body: `Dear Aiva Team,

I hope this email finds you well.

I'm writing to follow up on our previous discussions regarding a potential bulk order for custom products. We are very interested in placing a significant order, but we need to finalize the pricing structure and custom specifications.

Specifically, we are looking for:
- Product A: 500 units, custom color #R2D2, with our logo embossed.
- Product B: 200 units, custom material (eco-friendly recycled plastic), with a unique packaging design.

Could you please provide an updated quote that reflects a bulk discount for these quantities? We are also open to discussing a long-term partnership if the pricing is competitive.

Please let me know your availability for a quick call early next week to go over these details.

Best regards,
Joseph Evan Lewis
joseph.evan.lewis@gmail.com`,
    description: 'Requires manual review - complex pricing negotiation',
  },
  {
    name: 'Shipping Times Question',
    subject: 'Question about shipping times',
    body: `Hi Aiva Support,

I recently placed an order (#ABC12345) and was wondering what the estimated shipping time is for international orders. Also, what is your return policy for items purchased online?

Thanks,
Joseph Evan Lewis
joseph.evan.lewis@gmail.com`,
    description: 'Auto-reply candidate - routine inquiry',
  },
  {
    name: 'Product Availability Inquiry',
    subject: 'Inquiry about product availability',
    body: `Hello,

I'm interested in purchasing Product XYZ in size Large, but I see it's currently out of stock. When do you expect to have it back in stock? I'm also wondering if you have any similar products you could recommend.

Thank you,
Joseph Evan Lewis
joseph.evan.lewis@gmail.com`,
    description: 'Auto-reply candidate - product availability question',
  },
  {
    name: 'Complaint: Damaged Item',
    subject: 'Complaint: Received damaged item',
    body: `Dear Aiva Support,

I received my order (#DEF67890) yesterday, but unfortunately, one of the items arrived damaged. The packaging was intact, but the product itself has a visible crack. I've attached photos of the damage.

I would like to request either a replacement or a full refund for this item. Please let me know how you would like to proceed.

Best regards,
Joseph Evan Lewis
joseph.evan.lewis@gmail.com`,
    description: 'Requires manual review - customer complaint',
  },
  {
    name: 'Meeting Request',
    subject: 'Request for a meeting to discuss partnership',
    body: `Hi Aiva Team,

I represent a company that's interested in exploring a potential partnership with Aiva. We believe there could be significant synergies between our products and services.

Would you be available for a 30-minute call next week to discuss this opportunity? I'm flexible on timing and can work around your schedule.

Looking forward to hearing from you.

Best,
Joseph Evan Lewis
joseph.evan.lewis@gmail.com`,
    description: 'Requires manual review - business partnership inquiry',
  },
  {
    name: 'Simple Thank You',
    subject: 'Thank you for your help',
    body: `Hi,

Just wanted to say thank you for the excellent customer service I received. The team was very helpful and responsive.

Thanks again,
Joseph Evan Lewis
joseph.evan.lewis@gmail.com`,
    description: 'Auto-reply candidate - simple acknowledgment',
  },
];

export default function CreateTestEmailsPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('Custom Email');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingDefaults, setIsCreatingDefaults] = useState(false);

  const handleTemplateChange = (templateName: string) => {
    setSelectedTemplate(templateName);
    const template = EMAIL_TEMPLATES.find((t) => t.name === templateName);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
    }
  };

  const handleCreateCustomEmail = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Please provide both subject and body');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/debug/create-test-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create test email');
      }

      toast.success('Test email created successfully!');
      setSubject('');
      setBody('');
      setSelectedTemplate('Custom Email');
    } catch (error) {
      console.error('Error creating test email:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to create test email'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateDefaultEmails = async () => {
    setIsCreatingDefaults(true);
    try {
      const response = await fetch('/api/debug/create-test-emails', {
        method: 'GET',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create test emails');
      }

      toast.success('Default test emails created successfully!');
    } catch (error) {
      console.error('Error creating default test emails:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to create test emails'
      );
    } finally {
      setIsCreatingDefaults(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create Test Emails</h1>
          <p className="text-muted-foreground mt-2">
            Generate test emails from joseph.evan.lewis@gmail.com for testing
            Aiva's auto-reply and manual review features.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Create the default set of test emails (one requiring manual review,
              one auto-reply candidate)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleCreateDefaultEmails}
              disabled={isCreatingDefaults}
            >
              {isCreatingDefaults && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Default Test Emails
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Custom Test Email</CardTitle>
            <CardDescription>
              Select a template or create your own custom test email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="template" className="text-sm font-medium">
                Email Template
              </label>
              <Select
                value={selectedTemplate}
                onValueChange={handleTemplateChange}
              >
                <SelectTrigger id="template" className="w-full">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_TEMPLATES.map((template) => (
                    <SelectItem key={template.name} value={template.name}>
                      <div className="flex flex-col">
                        <span>{template.name}</span>
                        {template.description && (
                          <span className="text-xs text-muted-foreground">
                            {template.description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="subject" className="text-sm font-medium">
                Subject
              </label>
              <Input
                id="subject"
                placeholder="Email subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="body" className="text-sm font-medium">
                Body
              </label>
              <Textarea
                id="body"
                placeholder="Email body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            <Button
              onClick={handleCreateCustomEmail}
              disabled={isSubmitting || !subject.trim() || !body.trim()}
              className="w-full"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Test Email
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

