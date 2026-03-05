import { T } from "@/components/ui/Typography";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Metadata } from "next";
import {
  FileText,
  Shield,
  UserCheck,
  Ban,
  CreditCard,
  Bot,
  Mail,
  Scale,
  AlertTriangle,
  RefreshCw,
  Globe,
  Gavel,
  Handshake,
  Lock,
  ShieldAlert,
  Clock,
  MessageSquare,
  Building,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service - Aiva",
  description:
    "Terms of Service for Aiva.io — AI-powered communication assistant. Covers acceptable use, subscriptions, AI features, data handling, liability, and governing law.",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
          <Gavel className="w-8 h-8 text-primary" />
        </div>
        <T.H1 className="mb-4">Terms of Service</T.H1>
        <T.P className="text-muted-foreground">
          Effective Date: March 5, 2026 | Last Updated: March 5, 2026
        </T.P>
      </div>

      {/* Section 1: Introduction & Acceptance */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            1. Introduction and Acceptance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>
            Welcome to Aiva.io (&quot;Aiva&quot;, &quot;we&quot;,
            &quot;us&quot;, or &quot;our&quot;). These Terms of Service
            (&quot;Terms&quot;) govern your access to and use of the Aiva
            website at{" "}
            <a
              href="https://www.tryaiva.io"
              className="text-primary hover:underline"
            >
              www.tryaiva.io
            </a>{" "}
            (the &quot;Website&quot;), our AI-powered communication assistant
            application, and all related services, features, and content
            (collectively, the &quot;Service&quot;).
          </T.P>
          <T.P>
            By creating an account, connecting a third-party service, or
            otherwise accessing or using the Service, you agree to be bound by
            these Terms. If you are using the Service on behalf of an
            organisation, you represent and warrant that you have the authority
            to bind that organisation to these Terms, and references to
            &quot;you&quot; shall include that organisation.
          </T.P>
          <T.P>
            <strong>
              If you do not agree to these Terms, you must not access or use the
              Service.
            </strong>
          </T.P>
          <T.P>
            These Terms should be read alongside our{" "}
            <a href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </a>
            , which describes how we collect, use, and protect your data.
          </T.P>
        </CardContent>
      </Card>

      {/* Section 2: Definitions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            2. Definitions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <T.P>In these Terms:</T.P>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>&quot;Account&quot;</strong> means your registered user
              account on the Service.
            </li>
            <li>
              <strong>&quot;AI Features&quot;</strong> means the artificial
              intelligence functionality of the Service, including email
              classification, reply drafting, auto-send, task extraction,
              scheduling assistance, summarisation, and voice assistant
              capabilities.
            </li>
            <li>
              <strong>&quot;Auto-Send&quot;</strong> means the feature that
              automatically sends AI-generated email replies on your behalf based
              on your configured confidence thresholds and preferences.
            </li>
            <li>
              <strong>&quot;Channel Connection&quot;</strong> means an
              authorised link between the Service and a third-party
              communication platform (e.g., Gmail, Microsoft Outlook, Google
              Calendar) established via OAuth 2.0.
            </li>
            <li>
              <strong>&quot;Content&quot;</strong> means any data, text, emails,
              calendar events, files, or other materials accessed, processed, or
              generated through the Service.
            </li>
            <li>
              <strong>&quot;Subscription&quot;</strong> means a paid plan
              (Basic, Pro, or Enterprise) that grants access to specific
              features and usage limits.
            </li>
            <li>
              <strong>&quot;User Content&quot;</strong> means any content you
              provide, upload, or make accessible through the Service, including
              emails, settings, AI rules, and configuration.
            </li>
            <li>
              <strong>&quot;Workspace&quot;</strong> means a multi-tenant
              organisational unit within the Service where your data, team
              members, and settings are managed.
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Section 3: Eligibility */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            3. Eligibility
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>To use the Service, you must:</T.P>
          <ul className="list-disc list-inside space-y-2">
            <li>Be at least 16 years of age (or the age of digital consent in your jurisdiction)</li>
            <li>Have the legal capacity to enter into a binding agreement</li>
            <li>Not be barred from using the Service under applicable law</li>
            <li>
              Provide accurate, current, and complete information during
              registration and keep your account information up to date
            </li>
          </ul>
          <T.P>
            If you are under 16 years of age, you may not create an account or
            use the Service. We do not knowingly collect or process data from
            anyone under 16.
          </T.P>
        </CardContent>
      </Card>

      {/* Section 4: Account Registration & Security */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            4. Account Registration and Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>
            You may register for an account using your email address, a magic
            link, or a supported third-party OAuth provider (Google, Microsoft,
            GitHub).
          </T.P>
          <T.P>You are responsible for:</T.P>
          <ul className="list-disc list-inside space-y-2">
            <li>
              Maintaining the confidentiality of your account credentials
            </li>
            <li>
              All activities that occur under your account, whether or not you
              authorised them
            </li>
            <li>
              Immediately notifying us at{" "}
              <a
                href="mailto:support@tryaiva.io"
                className="text-primary hover:underline"
              >
                support@tryaiva.io
              </a>{" "}
              if you suspect any unauthorised access to your account
            </li>
          </ul>
          <T.P>
            We reserve the right to suspend or terminate accounts that we
            reasonably believe have been compromised or are being used in
            violation of these Terms.
          </T.P>
        </CardContent>
      </Card>

      {/* Section 5: The Service */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            5. Description of the Service
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>
            Aiva is an AI-powered communication assistant that integrates with
            your email and calendar accounts to help you manage your inbox more
            efficiently. The Service includes, but is not limited to:
          </T.P>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Unified Inbox:</strong> Aggregating messages from
              connected email channels (Gmail, Microsoft Outlook) into a single
              interface
            </li>
            <li>
              <strong>AI Classification:</strong> Automatically categorising
              emails by priority, category, sentiment, and actionability
            </li>
            <li>
              <strong>AI Draft Replies:</strong> Generating contextual email
              reply drafts using artificial intelligence
            </li>
            <li>
              <strong>Auto-Send:</strong> Optionally sending AI-generated
              replies automatically based on configurable confidence thresholds
            </li>
            <li>
              <strong>Calendar Integration:</strong> Reading and creating
              calendar events, detecting scheduling conflicts, and proposing
              meeting times
            </li>
            <li>
              <strong>Task Extraction:</strong> Identifying actionable tasks
              from email content
            </li>
            <li>
              <strong>Contact Management:</strong> Building contact profiles
              from communication interactions
            </li>
            <li>
              <strong>Voice Assistant:</strong> Voice-based interaction with your
              inbox (Pro plan and above)
            </li>
            <li>
              <strong>Shopify Integration:</strong> AI-powered customer support
              for Shopify merchants
            </li>
          </ul>
          <T.P>
            Features may vary by subscription plan. We reserve the right to
            modify, add, or remove features at any time with reasonable notice.
          </T.P>
        </CardContent>
      </Card>

      {/* Section 6: AI Features & Limitations */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            6. AI Features, Accuracy, and Limitations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>
            The Service uses third-party artificial intelligence models
            (currently OpenAI GPT-4o-mini) to process, classify, and generate
            content. By using AI Features, you acknowledge and agree that:
          </T.P>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>AI Output Is Not Guaranteed:</strong> AI-generated
              content (including draft replies, classifications, summaries, and
              scheduling suggestions) may contain errors, inaccuracies, or
              inappropriate content. You are solely responsible for reviewing
              and approving any AI-generated content before it is sent or acted
              upon.
            </li>
            <li>
              <strong>Auto-Send Responsibility:</strong> If you enable the
              Auto-Send feature, emails will be sent on your behalf
              automatically when the AI&apos;s confidence exceeds your
              configured threshold. You acknowledge that you are fully
              responsible for all emails sent through Auto-Send, including any
              errors or unintended consequences. We provide safeguards
              (confidence thresholds, review periods, excluded categories, and a
              kill switch), but these do not eliminate all risk.
            </li>
            <li>
              <strong>No Professional Advice:</strong> AI-generated content does
              not constitute legal, financial, medical, or other professional
              advice. You should not rely on AI output for decisions requiring
              professional judgement.
            </li>
            <li>
              <strong>Data Processing by Third Parties:</strong> To provide AI
              Features, your email content is sent to OpenAI for processing.
              OpenAI processes this data under their enterprise privacy terms
              and does not use it to train their models. See our{" "}
              <a href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </a>{" "}
              for full details.
            </li>
            <li>
              <strong>Continuous Improvement:</strong> AI models and algorithms
              may be updated, which could change the behaviour, quality, or
              output of AI Features. We will endeavour to maintain or improve
              quality but cannot guarantee consistent results across model
              updates.
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Section 7: Third-Party Integrations */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            7. Third-Party Integrations and Channel Connections
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>
            The Service integrates with third-party platforms through OAuth 2.0
            authorisation. By connecting a third-party account, you:
          </T.P>
          <ul className="list-disc list-inside space-y-2">
            <li>
              Authorise Aiva to access and interact with your data on that
              platform within the scope of the permissions you grant
            </li>
            <li>
              Acknowledge that your use of third-party platforms is governed by
              their respective terms of service and privacy policies
            </li>
            <li>
              Agree that we are not responsible for the availability, accuracy,
              or security of third-party platforms
            </li>
            <li>
              Understand that you may revoke access at any time through your
              workspace settings or the third-party platform&apos;s account
              permissions
            </li>
          </ul>
          <T.P>
            Third-party integrations currently supported include:
          </T.P>
          <ul className="list-disc list-inside space-y-1">
            <li>Google (Gmail, Google Calendar, Google Sign-In)</li>
            <li>Microsoft (Outlook, Outlook Calendar)</li>
            <li>Shopify (for Shopify App users)</li>
            <li>Stripe (payment processing)</li>
          </ul>
          <T.P>
            Additional integrations (Slack, Microsoft Teams, and others) may be
            added in the future. We will update these Terms and notify you
            accordingly.
          </T.P>
        </CardContent>
      </Card>

      {/* Section 8: Acceptable Use */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-primary" />
            8. Acceptable Use Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>
            You agree to use the Service only for lawful purposes and in
            compliance with these Terms. You must not:
          </T.P>
          <ul className="list-disc list-inside space-y-2">
            <li>
              Use the Service to send unsolicited bulk emails (spam),
              phishing messages, or malicious content
            </li>
            <li>
              Use Auto-Send or AI Features to harass, threaten, defame, or
              impersonate any person or entity
            </li>
            <li>
              Attempt to bypass, disable, or interfere with any security
              features, rate limits, or access controls of the Service
            </li>
            <li>
              Reverse-engineer, decompile, disassemble, or attempt to extract
              the source code of the Service
            </li>
            <li>
              Use the Service to violate any applicable local, state, national,
              or international law or regulation
            </li>
            <li>
              Transmit any viruses, malware, or other harmful code through the
              Service
            </li>
            <li>
              Use the Service in any manner that could damage, disable,
              overburden, or impair the Service or interfere with any other
              party&apos;s use
            </li>
            <li>
              Create multiple accounts to circumvent usage limits, bans, or
              billing obligations
            </li>
            <li>
              Use the Service to collect, store, or process data in violation
              of applicable data protection laws
            </li>
            <li>
              Resell, sublicense, or commercially exploit the Service without
              our express written consent
            </li>
          </ul>
          <T.P>
            We reserve the right to investigate and take appropriate action
            (including suspension or termination of your account) if we
            reasonably believe you have violated this Acceptable Use Policy.
          </T.P>
        </CardContent>
      </Card>

      {/* Section 9: User Content & Ownership */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            9. User Content, Ownership, and Licences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <T.H4 className="mb-2">9.1 Your Content</T.H4>
            <T.P>
              You retain all ownership rights in User Content that you provide
              to the Service. This includes your emails, calendar events,
              contacts, settings, and configurations. We do not claim ownership
              of your User Content.
            </T.P>
          </div>
          <div>
            <T.H4 className="mb-2">9.2 Licence to Us</T.H4>
            <T.P>
              By using the Service, you grant Aiva a limited, non-exclusive,
              worldwide, royalty-free licence to access, process, store, and
              transmit your User Content solely as necessary to provide,
              maintain, and improve the Service. This licence terminates when
              you delete your content or close your account.
            </T.P>
          </div>
          <div>
            <T.H4 className="mb-2">9.3 AI-Generated Content</T.H4>
            <T.P>
              Content generated by AI Features (such as draft replies,
              summaries, and classifications) is provided for your use. You are
              free to use, modify, or discard AI-generated content. However, we
              make no warranties regarding the originality, accuracy, or fitness
              for purpose of AI-generated content, and you assume full
              responsibility for any use of such content.
            </T.P>
          </div>
          <div>
            <T.H4 className="mb-2">9.4 Our Intellectual Property</T.H4>
            <T.P>
              The Service, including its design, software, algorithms, user
              interface, branding, logos, documentation, and all other
              proprietary materials, is owned by Aiva.io and is protected by
              copyright, trademark, and other intellectual property laws. These
              Terms do not grant you any right to use our brand, trademarks, or
              logos without prior written consent.
            </T.P>
          </div>
        </CardContent>
      </Card>

      {/* Section 10: Subscriptions & Billing */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            10. Subscriptions, Billing, and Payments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <T.H4 className="mb-2">10.1 Plans</T.H4>
            <T.P>
              The Service is offered under multiple subscription plans (Free,
              Basic, Pro, and Enterprise), each with different feature sets and
              usage limits. Plan details, pricing, and feature comparisons are
              available on our{" "}
              <a href="/#pricing" className="text-primary hover:underline">
                Pricing page
              </a>
              .
            </T.P>
          </div>
          <div>
            <T.H4 className="mb-2">10.2 Payment</T.H4>
            <T.P>
              Paid subscriptions are billed in advance on a monthly or annual
              basis, depending on the billing cycle you select. Payment is
              processed securely through Stripe (for web customers) or Shopify
              Billing (for Shopify App users). By subscribing to a paid plan,
              you authorise us to charge your selected payment method for the
              applicable fees.
            </T.P>
          </div>
          <div>
            <T.H4 className="mb-2">10.3 Free Trials</T.H4>
            <T.P>
              We may offer free trial periods for paid plans. At the end of a
              free trial, your subscription will automatically convert to a paid
              subscription unless you cancel before the trial ends. We will
              notify you before trial expiry.
            </T.P>
          </div>
          <div>
            <T.H4 className="mb-2">10.4 Cancellation</T.H4>
            <T.P>
              You may cancel your subscription at any time through your account
              settings. Upon cancellation, you will retain access to your paid
              plan features until the end of your current billing period. No
              refunds will be issued for the remaining portion of a billing
              period unless required by applicable law.
            </T.P>
          </div>
          <div>
            <T.H4 className="mb-2">10.5 Price Changes</T.H4>
            <T.P>
              We reserve the right to change subscription pricing with at least
              30 days&apos; notice. Price changes will apply to the next billing
              cycle following the notice period. If you do not agree to a price
              change, you may cancel your subscription before the new pricing
              takes effect.
            </T.P>
          </div>
          <div>
            <T.H4 className="mb-2">10.6 Refunds</T.H4>
            <T.P>
              Refunds are generally not provided except where required by
              applicable consumer protection law (including the Australian
              Consumer Law). If you believe you are entitled to a refund, please
              contact{" "}
              <a
                href="mailto:support@tryaiva.io"
                className="text-primary hover:underline"
              >
                support@tryaiva.io
              </a>
              .
            </T.P>
          </div>
        </CardContent>
      </Card>

      {/* Section 11: Privacy & Data Protection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            11. Privacy and Data Protection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>
            Your privacy is important to us. Our collection, use, storage, and
            sharing of your personal information is governed by our{" "}
            <a href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </a>
            , which is incorporated into these Terms by reference.
          </T.P>
          <T.P>Key points include:</T.P>
          <ul className="list-disc list-inside space-y-2">
            <li>
              We access your email and calendar data only with your explicit
              consent via OAuth 2.0
            </li>
            <li>
              Email content is processed by OpenAI to provide AI Features;
              OpenAI does not use your data to train their models
            </li>
            <li>
              All data is encrypted in transit (TLS 1.3) and at rest (AES-256)
            </li>
            <li>
              Your data is isolated within your workspace using row-level
              security
            </li>
            <li>
              We do not sell your personal information to any third party
            </li>
            <li>
              You can disconnect channels, export your data, or delete your
              account at any time
            </li>
          </ul>
          <T.P>
            Our use of Google User Data complies with the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements. See Section 3 of our
            Privacy Policy for detailed disclosures.
          </T.P>
        </CardContent>
      </Card>

      {/* Section 12: Data Retention & Deletion */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            12. Data Retention and Account Deletion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>
            We retain your data for as long as your account is active and as
            needed to provide the Service. You may:
          </T.P>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Disconnect a channel:</strong> Remove a connected account
              (Gmail, Outlook, Calendar) at any time through your workspace
              settings. Associated synced data will be deleted within 30 days.
            </li>
            <li>
              <strong>Delete your account:</strong> Request account deletion
              through your account settings or by emailing{" "}
              <a
                href="mailto:privacy@tryaiva.io"
                className="text-primary hover:underline"
              >
                privacy@tryaiva.io
              </a>
              . All personal data will be permanently deleted within 30 days,
              with backups purged within 90 days.
            </li>
            <li>
              <strong>Export your data:</strong> Request a copy of your data in a
              machine-readable format by contacting support.
            </li>
          </ul>
          <T.P>
            Certain data may be retained longer where required by law (e.g.,
            billing records for tax compliance) or to resolve disputes. See our{" "}
            <a href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </a>{" "}
            for detailed retention schedules.
          </T.P>
        </CardContent>
      </Card>

      {/* Section 13: Availability & Modifications */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            13. Service Availability and Modifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>
            We strive to maintain high availability of the Service but do not
            guarantee uninterrupted or error-free operation. The Service may be
            temporarily unavailable due to:
          </T.P>
          <ul className="list-disc list-inside space-y-2">
            <li>Scheduled maintenance (we will provide reasonable advance notice where practicable)</li>
            <li>Emergency security patches or updates</li>
            <li>Third-party service outages (Google, Microsoft, Supabase, etc.)</li>
            <li>Force majeure events beyond our reasonable control</li>
          </ul>
          <T.P>
            We reserve the right to modify, update, or discontinue any part of
            the Service at any time. For material changes that significantly
            affect your use:
          </T.P>
          <ul className="list-disc list-inside space-y-2">
            <li>
              We will provide at least 30 days&apos; notice via email or
              in-app notification
            </li>
            <li>
              If you disagree with the changes, you may cancel your subscription
              before they take effect
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Section 14: Disclaimer of Warranties */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary" />
            14. Disclaimer of Warranties
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SERVICE IS
            PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT
            WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR
            OTHERWISE.
          </T.P>
          <T.P>We specifically disclaim all implied warranties including:</T.P>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Merchantability:</strong> We do not warrant that the
              Service will meet your specific requirements
            </li>
            <li>
              <strong>Fitness for a Particular Purpose:</strong> We do not
              warrant that AI Features will produce accurate, complete, or
              appropriate results for your use case
            </li>
            <li>
              <strong>Non-Infringement:</strong> We do not warrant that the
              Service does not infringe the rights of any third party
            </li>
            <li>
              <strong>Accuracy of AI Output:</strong> We do not warrant the
              accuracy, reliability, or appropriateness of any AI-generated
              content, classifications, summaries, or scheduling suggestions
            </li>
          </ul>
          <T.P>
            <strong>Australian Consumer Law Notice:</strong> If you are a
            consumer within the meaning of the Australian Consumer Law (Schedule
            2 of the Competition and Consumer Act 2010), certain statutory
            guarantees apply to the Service that cannot be excluded, restricted,
            or modified. Nothing in these Terms is intended to exclude, restrict,
            or modify any statutory guarantee or right that cannot be lawfully
            excluded.
          </T.P>
        </CardContent>
      </Card>

      {/* Section 15: Limitation of Liability */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            15. Limitation of Liability
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:
          </T.P>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>No Indirect Damages:</strong> In no event shall Aiva, its
              officers, directors, employees, agents, or affiliates be liable
              for any indirect, incidental, special, consequential, or punitive
              damages, including but not limited to loss of profits, data,
              business opportunities, goodwill, or other intangible losses,
              arising from your use of or inability to use the Service.
            </li>
            <li>
              <strong>Auto-Send Liability:</strong> We are not liable for any
              damages arising from emails sent through the Auto-Send feature,
              including but not limited to incorrect, inappropriate, or untimely
              responses. You acknowledge that you have configured and enabled
              Auto-Send at your own risk.
            </li>
            <li>
              <strong>AI Output Liability:</strong> We are not liable for
              decisions you make based on AI-generated content, including
              scheduling errors, misclassifications, or inaccurate summaries.
            </li>
            <li>
              <strong>Third-Party Services:</strong> We are not liable for any
              loss or damage caused by the unavailability, malfunction, or
              changes to third-party services (Google, Microsoft, Shopify,
              OpenAI, Stripe, etc.).
            </li>
            <li>
              <strong>Maximum Liability:</strong> Our total aggregate liability
              to you for all claims arising from or related to these Terms or
              the Service shall not exceed the greater of (a) the total fees
              paid by you to Aiva in the 12 months preceding the event giving
              rise to the claim, or (b) AUD $100.
            </li>
          </ul>
          <T.P>
            <strong>Australian Consumer Law Notice:</strong> Liability under
            non-excludable statutory guarantees under Australian Consumer Law is
            limited, to the extent permitted, to resupply of the Service or
            payment of the cost of resupply.
          </T.P>
        </CardContent>
      </Card>

      {/* Section 16: Indemnification */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="w-5 h-5 text-primary" />
            16. Indemnification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>
            You agree to indemnify, defend, and hold harmless Aiva.io, its
            officers, directors, employees, agents, and affiliates from and
            against any and all claims, liabilities, damages, losses, costs, and
            expenses (including reasonable legal fees) arising from or related
            to:
          </T.P>
          <ul className="list-disc list-inside space-y-2">
            <li>Your use of the Service or any violation of these Terms</li>
            <li>Emails sent through the Auto-Send feature on your behalf</li>
            <li>
              Your use of AI-generated content in a manner that causes harm to
              a third party
            </li>
            <li>
              Your violation of any applicable law, regulation, or third-party
              rights
            </li>
            <li>
              Any User Content you provide to the Service that infringes the
              rights of a third party
            </li>
          </ul>
          <T.P>
            This indemnification obligation applies to the maximum extent
            permitted by applicable law.
          </T.P>
        </CardContent>
      </Card>

      {/* Section 17: Termination */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-primary" />
            17. Termination
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <T.H4 className="mb-2">17.1 Termination by You</T.H4>
            <T.P>
              You may terminate your account at any time by cancelling your
              subscription and deleting your account through your account
              settings, or by contacting{" "}
              <a
                href="mailto:support@tryaiva.io"
                className="text-primary hover:underline"
              >
                support@tryaiva.io
              </a>
              .
            </T.P>
          </div>
          <div>
            <T.H4 className="mb-2">17.2 Termination by Us</T.H4>
            <T.P>
              We may suspend or terminate your access to the Service
              immediately, with or without notice, if:
            </T.P>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>You breach these Terms or our Acceptable Use Policy</li>
              <li>
                We are required to do so by law, regulation, or court order
              </li>
              <li>
                Your use of the Service poses a security risk or could harm
                other users
              </li>
              <li>Your account has been inactive for more than 12 months</li>
              <li>
                We decide to discontinue the Service (with at least 30
                days&apos; notice)
              </li>
            </ul>
          </div>
          <div>
            <T.H4 className="mb-2">17.3 Effect of Termination</T.H4>
            <T.P>Upon termination:</T.P>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>
                Your right to access and use the Service will cease immediately
              </li>
              <li>
                We will delete your data in accordance with our{" "}
                <a href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </a>{" "}
                (generally within 30 days)
              </li>
              <li>
                You remain liable for any fees accrued prior to termination
              </li>
              <li>
                Sections that by their nature should survive termination
                (including Limitation of Liability, Indemnification, Governing
                Law, and Dispute Resolution) shall survive
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Section 18: Governing Law & Dispute Resolution */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="w-5 h-5 text-primary" />
            18. Governing Law and Dispute Resolution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <T.H4 className="mb-2">18.1 Governing Law</T.H4>
            <T.P>
              These Terms are governed by and construed in accordance with the
              laws of the State of New South Wales, Australia, without regard to
              its conflict of law principles. The courts of New South Wales,
              Australia shall have non-exclusive jurisdiction over any disputes
              arising under these Terms.
            </T.P>
          </div>
          <div>
            <T.H4 className="mb-2">18.2 Informal Resolution</T.H4>
            <T.P>
              Before initiating any formal proceedings, you agree to first
              contact us at{" "}
              <a
                href="mailto:legal@tryaiva.io"
                className="text-primary hover:underline"
              >
                legal@tryaiva.io
              </a>{" "}
              and attempt to resolve the dispute informally within 60 days.
            </T.P>
          </div>
          <div>
            <T.H4 className="mb-2">18.3 Class Action Waiver</T.H4>
            <T.P>
              To the maximum extent permitted by applicable law, you agree that
              any dispute resolution proceedings will be conducted only on an
              individual basis and not in a class, consolidated, or
              representative action. This class action waiver does not apply
              where prohibited by law.
            </T.P>
          </div>
          <div>
            <T.H4 className="mb-2">18.4 Australian Consumer Rights</T.H4>
            <T.P>
              Nothing in this section limits or excludes any rights you may have
              under the Australian Consumer Law or other mandatory consumer
              protection legislation that cannot be excluded by agreement.
            </T.P>
          </div>
        </CardContent>
      </Card>

      {/* Section 19: General Provisions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            19. General Provisions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <T.H4 className="mb-2">19.1 Entire Agreement</T.H4>
            <T.P>
              These Terms, together with our Privacy Policy, constitute the
              entire agreement between you and Aiva.io regarding the Service
              and supersede all prior agreements, communications, and proposals,
              whether written or oral.
            </T.P>
          </div>
          <div>
            <T.H4 className="mb-2">19.2 Severability</T.H4>
            <T.P>
              If any provision of these Terms is found to be invalid,
              unenforceable, or unlawful by a court of competent jurisdiction,
              that provision shall be modified to the minimum extent necessary
              to make it valid and enforceable, and the remaining provisions
              shall continue in full force and effect.
            </T.P>
          </div>
          <div>
            <T.H4 className="mb-2">19.3 Waiver</T.H4>
            <T.P>
              Our failure to enforce any right or provision of these Terms shall
              not constitute a waiver of that right or provision. A waiver of
              any default shall not be a waiver of any subsequent default.
            </T.P>
          </div>
          <div>
            <T.H4 className="mb-2">19.4 Assignment</T.H4>
            <T.P>
              You may not assign or transfer these Terms or your rights under
              them without our prior written consent. We may assign our rights
              and obligations under these Terms in connection with a merger,
              acquisition, or sale of assets, provided the assignee agrees to
              be bound by these Terms.
            </T.P>
          </div>
          <div>
            <T.H4 className="mb-2">19.5 Force Majeure</T.H4>
            <T.P>
              We shall not be liable for any failure or delay in performing our
              obligations under these Terms if such failure or delay results
              from circumstances beyond our reasonable control, including but
              not limited to natural disasters, war, terrorism, pandemics,
              government actions, power failures, internet outages, or
              third-party service failures.
            </T.P>
          </div>
          <div>
            <T.H4 className="mb-2">19.6 Notices</T.H4>
            <T.P>
              We may provide notices to you via email to the address associated
              with your account, through in-app notifications, or by posting
              updates on the Website. You agree that electronic notices satisfy
              any legal requirement for written communication.
            </T.P>
          </div>
        </CardContent>
      </Card>

      {/* Section 20: Changes to Terms */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            20. Changes to These Terms
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>
            We reserve the right to modify these Terms at any time. When we make
            changes:
          </T.P>
          <ul className="list-disc list-inside space-y-2">
            <li>
              We will update the &quot;Last Updated&quot; date at the top of
              this page
            </li>
            <li>
              For material changes, we will provide at least 30 days&apos;
              notice via email or in-app notification before the changes take
              effect
            </li>
            <li>
              Your continued use of the Service after the effective date
              constitutes acceptance of the updated Terms
            </li>
            <li>
              If you disagree with the changes, you must stop using the Service
              and cancel your subscription before the new Terms take effect
            </li>
          </ul>
          <T.P>
            We encourage you to review these Terms periodically to stay informed
            of any updates.
          </T.P>
        </CardContent>
      </Card>

      {/* Section 21: Contact */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            21. Contact Us
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>
            If you have questions, concerns, or feedback about these Terms of
            Service, please contact us:
          </T.P>
          <div className="space-y-2 mt-3">
            <T.P>
              <strong>General Inquiries:</strong>{" "}
              <a
                href="mailto:support@tryaiva.io"
                className="text-primary hover:underline"
              >
                support@tryaiva.io
              </a>
            </T.P>
            <T.P>
              <strong>Legal and Privacy:</strong>{" "}
              <a
                href="mailto:legal@tryaiva.io"
                className="text-primary hover:underline"
              >
                legal@tryaiva.io
              </a>
            </T.P>
            <T.P>
              <strong>Privacy Inquiries:</strong>{" "}
              <a
                href="mailto:privacy@tryaiva.io"
                className="text-primary hover:underline"
              >
                privacy@tryaiva.io
              </a>
            </T.P>
            <T.P>
              <strong>Website:</strong>{" "}
              <a
                href="https://www.tryaiva.io"
                className="text-primary hover:underline"
              >
                www.tryaiva.io
              </a>
            </T.P>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
