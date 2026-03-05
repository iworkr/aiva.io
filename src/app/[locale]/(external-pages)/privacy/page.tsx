import { T } from "@/components/ui/Typography";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Metadata } from "next";
import {
  Shield,
  Lock,
  Eye,
  Database,
  Mail,
  Globe,
  FileText,
  UserCheck,
  Clock,
  Cookie,
  AlertTriangle,
  RefreshCw,
  Building,
  Scale,
  Server,
  Share2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy - Aiva",
  description:
    "Aiva's comprehensive privacy policy covering data collection, usage, storage, sharing, and your rights under Australian, US, and international privacy laws.",
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <T.H1 className="mb-4">Privacy Policy</T.H1>
        <T.P className="text-muted-foreground">
          Effective Date: March 5, 2026 | Last Updated: March 5, 2026
        </T.P>
      </div>

      {/* Section 1: Introduction */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            1. Introduction
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>
            Aiva.io (&quot;Aiva&quot;, &quot;we&quot;, &quot;us&quot;, or
            &quot;our&quot;) is an AI-powered communication assistant operated
            by Aiva.io. Our registered business is located in Australia.
          </T.P>
          <T.P>
            This Privacy Policy explains how we collect, use, disclose, store,
            and protect your personal information when you access or use our
            website at{" "}
            <a
              href="https://www.tryaiva.io"
              className="text-primary hover:underline"
            >
              www.tryaiva.io
            </a>{" "}
            (the &quot;Website&quot;), our application, and any related services
            (collectively, the &quot;Service&quot;).
          </T.P>
          <T.P>
            By accessing or using the Service, you acknowledge that you have
            read, understood, and agree to be bound by this Privacy Policy. If
            you do not agree with the practices described herein, please do not
            use the Service.
          </T.P>
          <T.P>
            This Privacy Policy is designed to comply with the{" "}
            <strong>Australian Privacy Act 1988</strong> (Cth) and the
            Australian Privacy Principles (APPs), the{" "}
            <strong>
              General Data Protection Regulation (GDPR)
            </strong>{" "}
            (EU/EEA), the{" "}
            <strong>
              California Consumer Privacy Act / California Privacy Rights Act
              (CCPA/CPRA)
            </strong>
            , the{" "}
            <strong>Google API Services User Data Policy</strong>, and other
            applicable data protection laws.
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
          <T.P>
            For the purposes of this Privacy Policy:
          </T.P>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>&quot;Personal Information&quot;</strong> means any
              information that identifies, relates to, describes, or could
              reasonably be linked to you as an individual, including but not
              limited to your name, email address, and usage data.
            </li>
            <li>
              <strong>&quot;Google User Data&quot;</strong> means any data
              obtained through Google APIs, including Gmail message content,
              Google Calendar events, and Google account profile information.
            </li>
            <li>
              <strong>&quot;Processing&quot;</strong> means any operation
              performed on personal information, including collection, storage,
              use, disclosure, or deletion.
            </li>
            <li>
              <strong>&quot;Workspace&quot;</strong> means a multi-tenant
              organizational unit within Aiva where your data is isolated and
              managed.
            </li>
            <li>
              <strong>&quot;AI Processing&quot;</strong> means the use of
              artificial intelligence models to classify, summarise, draft
              replies to, or otherwise analyse your communication data within the
              Service.
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Section 3: Google User Data — THE KEY SECTION */}
      <Card className="mb-6 border-primary/30 bg-primary/[0.02]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-primary"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            3. Google User Data — Specific Disclosures
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <T.P>
            Aiva integrates with Google services to provide AI-powered email
            management and calendar scheduling. This section specifically
            addresses how we access, use, store, and protect data obtained
            through Google APIs, in compliance with the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Google API Services User Data Policy
            </a>{" "}
            and the{" "}
            <a
              href="https://developers.google.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Google APIs Terms of Service
            </a>
            .
          </T.P>

          {/* 3a: Data Accessed */}
          <div className="border rounded-lg p-4 space-y-3">
            <T.H4 className="font-semibold">
              3.1 Google Data We Access
            </T.H4>
            <T.P>
              When you connect your Google account, Aiva requests the following
              OAuth scopes and accesses the corresponding data:
            </T.P>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-semibold">
                      OAuth Scope
                    </th>
                    <th className="text-left py-2 font-semibold">
                      Data Accessed
                    </th>
                  </tr>
                </thead>
                <tbody className="space-y-1">
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-xs">
                      gmail.readonly
                    </td>
                    <td className="py-2">
                      Email messages (subject, body, sender, recipients,
                      timestamps, labels, attachments metadata)
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-xs">
                      gmail.send
                    </td>
                    <td className="py-2">
                      Ability to send emails on your behalf (only AI-drafted
                      replies you approve, or auto-send with your configured
                      thresholds)
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-xs">
                      userinfo.email
                    </td>
                    <td className="py-2">
                      Your Google account email address
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-xs">
                      userinfo.profile
                    </td>
                    <td className="py-2">
                      Your Google account name and profile picture
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-xs">
                      calendar.readonly
                    </td>
                    <td className="py-2">
                      Calendar events (title, time, location, attendees,
                      description)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono text-xs">
                      calendar.events
                    </td>
                    <td className="py-2">
                      Ability to create and modify calendar events (for
                      AI-assisted scheduling)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 3b: How We Use Google Data */}
          <div className="border rounded-lg p-4 space-y-3">
            <T.H4 className="font-semibold">
              3.2 How We Use Google User Data
            </T.H4>
            <T.P>
              Google User Data is used exclusively to provide and improve the
              Aiva Service. Specifically:
            </T.P>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>Email Classification:</strong> We use AI to classify
                your emails by priority (urgent, high, medium, low), category
                (e.g., customer inquiry, sales lead, scheduling), and sentiment
                to help you focus on what matters.
              </li>
              <li>
                <strong>AI-Powered Drafting:</strong> We generate draft replies
                to your emails using AI, incorporating conversation context,
                your preferences, and your configured tone.
              </li>
              <li>
                <strong>Auto-Send:</strong> With your explicit opt-in and
                configurable confidence thresholds, Aiva can automatically send
                replies on your behalf. You control which categories are
                eligible, review periods, and can disable auto-send at any time.
              </li>
              <li>
                <strong>Scheduling and Calendar:</strong> We read your calendar
                events to detect scheduling conflicts, propose meeting times,
                and create calendar events from email conversations.
              </li>
              <li>
                <strong>Task Extraction:</strong> We extract actionable tasks
                from your emails (e.g., deadlines, follow-ups) to help you stay
                organised.
              </li>
              <li>
                <strong>Summarisation:</strong> We generate summaries of email
                threads to provide quick overviews in your inbox.
              </li>
              <li>
                <strong>Contact Management:</strong> We build contact profiles
                from your email interactions to provide contextual information
                when composing replies.
              </li>
            </ul>
          </div>

          {/* 3c: Google Data Sharing */}
          <div className="border rounded-lg p-4 space-y-3">
            <T.H4 className="font-semibold">
              3.3 Sharing of Google User Data
            </T.H4>
            <T.P>Google User Data is shared only with:</T.P>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>OpenAI:</strong> Email content (subject, body, sender
                information) is sent to OpenAI&apos;s API for AI classification,
                summarisation, and reply drafting. OpenAI processes this data
                under their{" "}
                <a
                  href="https://openai.com/enterprise-privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  enterprise privacy terms
                </a>{" "}
                and does not use it to train their models.
              </li>
              <li>
                <strong>Supabase:</strong> Google User Data is stored in our
                Supabase-hosted PostgreSQL database with row-level security
                isolation.
              </li>
            </ul>
            <T.P className="mt-3 font-semibold">
              We do NOT:
            </T.P>
            <ul className="list-disc list-inside space-y-2">
              <li>Sell Google User Data to any third party</li>
              <li>
                Use Google User Data for advertising, marketing profiling, or
                any purpose unrelated to providing the Service
              </li>
              <li>
                Allow any third party to use Google User Data for purposes
                unrelated to the Service
              </li>
              <li>
                Transfer or disclose Google User Data except as described in this
                Privacy Policy
              </li>
            </ul>
          </div>

          {/* 3d: Limited Use Disclosure */}
          <div className="border rounded-lg p-4 space-y-3 bg-primary/5">
            <T.H4 className="font-semibold">
              3.4 Google API Services Limited Use Disclosure
            </T.H4>
            <T.P>
              Aiva&apos;s use and transfer to any other app of information
              received from Google APIs will adhere to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements. Specifically:
            </T.P>
            <ul className="list-disc list-inside space-y-2">
              <li>
                We only use Google User Data to provide or improve
                user-facing features that are prominent in our application&apos;s
                user interface.
              </li>
              <li>
                We do not transfer Google User Data to others unless necessary to
                provide and improve user-facing features, to comply with
                applicable laws, or as part of a merger, acquisition, or asset
                sale with prior notice to users.
              </li>
              <li>
                We do not use Google User Data for serving advertisements.
              </li>
              <li>
                We do not allow humans to read Google User Data unless we have
                your affirmative consent for specific messages, it is necessary
                for security purposes (e.g., investigating abuse), it is
                necessary to comply with applicable law, or the data is
                aggregated and anonymised for internal operations.
              </li>
            </ul>
          </div>

          {/* 3e: Google Data Storage */}
          <div className="border rounded-lg p-4 space-y-3">
            <T.H4 className="font-semibold">
              3.5 Storage and Protection of Google User Data
            </T.H4>
            <ul className="list-disc list-inside space-y-2">
              <li>
                Google OAuth tokens (access tokens and refresh tokens) are stored
                securely in our database. We never store your Google password.
              </li>
              <li>
                All Google User Data is encrypted in transit using TLS 1.3 and
                encrypted at rest using AES-256 encryption.
              </li>
              <li>
                Google User Data is isolated per workspace using row-level
                security (RLS) policies, ensuring no cross-tenant data access.
              </li>
              <li>
                Our infrastructure providers (Vercel, Supabase) maintain SOC 2
                compliance.
              </li>
            </ul>
          </div>

          {/* 3f: Google Data Retention & Deletion */}
          <div className="border rounded-lg p-4 space-y-3">
            <T.H4 className="font-semibold">
              3.6 Retention and Deletion of Google User Data
            </T.H4>
            <ul className="list-disc list-inside space-y-2">
              <li>
                Google User Data is retained for as long as your account is
                active and your Google account is connected.
              </li>
              <li>
                You can disconnect your Google account at any time through your
                Aiva workspace settings. Upon disconnection, we delete all
                stored Gmail messages, calendar events, and associated AI
                classifications within 30 days.
              </li>
              <li>
                You can also revoke Aiva&apos;s access directly from your{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google Account permissions page
                </a>
                .
              </li>
              <li>
                Upon account deletion, all Google User Data is permanently
                removed within 30 days. Backup copies are purged within 90 days.
              </li>
              <li>
                To request immediate deletion of your Google User Data, contact{" "}
                <a
                  href="mailto:privacy@tryaiva.io"
                  className="text-primary hover:underline"
                >
                  privacy@tryaiva.io
                </a>
                .
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Information We Collect */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            4. Information We Collect
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <T.H4 className="mb-2">4.1 Account Information</T.H4>
            <T.P>
              When you create an account, we collect your name, email address,
              and authentication credentials. If you sign in via a third-party
              OAuth provider (Google, Microsoft, GitHub), we receive your name,
              email, and profile picture from that provider. For Shopify
              merchants, we also receive your store name, domain, owner
              information, and store email through Shopify&apos;s OAuth system.
            </T.P>
          </div>
          <div>
            <T.H4 className="mb-2">4.2 Communication Data</T.H4>
            <T.P>
              To provide our AI inbox assistant services, we access and store
              messages from your connected communication channels (Gmail,
              Microsoft Outlook) with your explicit permission. This includes
              email subject lines, body content, sender and recipient
              information, timestamps, labels, and attachment metadata. This data
              is used solely to power AI features such as classification, reply
              drafting, summarisation, task extraction, and scheduling.
            </T.P>
          </div>
          <div>
            <T.H4 className="mb-2">4.3 Calendar Data</T.H4>
            <T.P>
              When you connect your Google Calendar or Microsoft Outlook
              Calendar, we access event details including titles, descriptions,
              times, locations, attendees, and organiser information. This is
              used for scheduling conflict detection and AI-assisted event
              creation.
            </T.P>
          </div>
          <div>
            <T.H4 className="mb-2">4.4 Shopify Data (for Shopify App Users)</T.H4>
            <T.P>
              If you use Aiva through our Shopify App, we access and store
              customer data (name, email, phone, address, order history),
              order data (financial details, line items, shipping addresses),
              and product data (titles, descriptions, pricing) from your
              Shopify store. This data is used to provide AI-powered customer
              support and contextual replies to customer inquiries.
            </T.P>
          </div>
          <div>
            <T.H4 className="mb-2">4.5 Usage Data</T.H4>
            <T.P>
              We automatically collect information about how you interact with
              our Service, including features used, pages visited, messages
              processed, AI actions taken (classifications, drafts generated,
              auto-sends), preferences set, timestamps of interactions, and
              error logs. This is collected through privacy-respecting analytics
              tools.
            </T.P>
          </div>
          <div>
            <T.H4 className="mb-2">4.6 Device and Technical Data</T.H4>
            <T.P>
              We collect your IP address, browser type and version, operating
              system, device type, referring URLs, and timezone. This
              information is used for security, fraud prevention, and service
              optimisation.
            </T.P>
          </div>
          <div>
            <T.H4 className="mb-2">4.7 Voice Data (Pro Plan Feature)</T.H4>
            <T.P>
              If you use the Voice Aiva feature, your voice audio is transmitted
              to OpenAI&apos;s Whisper API for speech-to-text transcription. The
              transcribed text and AI responses are stored as part of your voice
              conversation history. Voice audio is not permanently stored by
              Aiva.
            </T.P>
          </div>
          <div>
            <T.H4 className="mb-2">4.8 Billing Information</T.H4>
            <T.P>
              Payment processing is handled by Stripe (for web customers) and
              Shopify Billing (for Shopify App users). We do not directly store
              your credit card numbers. Stripe and Shopify store your payment
              details securely under their respective privacy policies and PCI
              DSS compliance.
            </T.P>
          </div>
        </CardContent>
      </Card>

      {/* Section 5: How We Use Your Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            5. How We Use Your Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>
            We use the information we collect for the following purposes:
          </T.P>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Provide the Service:</strong> Deliver AI-powered email
              classification, draft reply generation, auto-send functionality,
              scheduling assistance, task extraction, and inbox management.
            </li>
            <li>
              <strong>AI Processing:</strong> Send communication data to AI
              models (OpenAI GPT-4o-mini) for classification, summarisation,
              reply drafting, sentiment analysis, and scheduling intent
              detection.
            </li>
            <li>
              <strong>Calendar Integration:</strong> Read calendar events to
              detect conflicts, propose meeting times, and create events from
              email conversations.
            </li>
            <li>
              <strong>Contact Management:</strong> Build and maintain contact
              profiles from your communication interactions for contextual AI
              responses.
            </li>
            <li>
              <strong>Personalisation:</strong> Customise the Service based on
              your preferences, tone settings, AI rules, and workspace
              configuration.
            </li>
            <li>
              <strong>Notifications:</strong> Send you service-related
              notifications about messages requiring review, high-priority
              items, daily digests, and auto-send confirmations.
            </li>
            <li>
              <strong>Billing:</strong> Process subscriptions and payments
              through Stripe or Shopify Billing.
            </li>
            <li>
              <strong>Security:</strong> Detect and prevent fraud, abuse, and
              unauthorised access.
            </li>
            <li>
              <strong>Analytics:</strong> Understand usage patterns and improve
              the Service using privacy-respecting analytics (PostHog).
            </li>
            <li>
              <strong>Error Monitoring:</strong> Identify and fix bugs and
              technical issues (Sentry).
            </li>
            <li>
              <strong>Legal Compliance:</strong> Comply with applicable laws,
              regulations, and legal processes.
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Section 6: Legal Bases for Processing */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            6. Legal Bases for Processing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>
            We process your personal information on the following legal bases:
          </T.P>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Consent:</strong> When you connect a third-party account
              (e.g., Google, Microsoft) via OAuth, you explicitly consent to us
              accessing the data covered by the requested scopes. You may
              withdraw consent at any time by disconnecting the account.
            </li>
            <li>
              <strong>Contract:</strong> Processing necessary to perform our
              contract with you (i.e., providing the Service you subscribed to).
            </li>
            <li>
              <strong>Legitimate Interest:</strong> Processing necessary for our
              legitimate interests, such as improving the Service, ensuring
              security, and preventing fraud, provided these interests are not
              overridden by your rights.
            </li>
            <li>
              <strong>Legal Obligation:</strong> Processing necessary to comply
              with applicable laws, regulations, or legal processes.
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Section 7: Data Sharing and Third-Party Disclosure */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            7. Data Sharing and Third-Party Disclosure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>
            <strong>
              We do not sell your personal information or Google User Data to any
              third party. We never have and never will.
            </strong>
          </T.P>
          <T.P>
            We share data with the following categories of third-party service
            providers, solely to operate and improve the Service:
          </T.P>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-semibold">
                    Provider
                  </th>
                  <th className="text-left py-2 pr-4 font-semibold">
                    Purpose
                  </th>
                  <th className="text-left py-2 font-semibold">
                    Data Shared
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 pr-4 font-medium">OpenAI</td>
                  <td className="py-2 pr-4">
                    AI classification, summarisation, reply drafting, voice
                    transcription
                  </td>
                  <td className="py-2">
                    Email content (subject, body, sender), voice audio
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4 font-medium">Supabase</td>
                  <td className="py-2 pr-4">
                    Database hosting, authentication, real-time updates
                  </td>
                  <td className="py-2">
                    All application data (stored with row-level security)
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4 font-medium">Vercel</td>
                  <td className="py-2 pr-4">Application hosting and CDN</td>
                  <td className="py-2">
                    Server-side request data, IP addresses
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4 font-medium">Stripe</td>
                  <td className="py-2 pr-4">Payment processing</td>
                  <td className="py-2">
                    Name, email, billing address, payment method tokens
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4 font-medium">ElevenLabs</td>
                  <td className="py-2 pr-4">
                    Text-to-speech (Voice Aiva, Pro plan)
                  </td>
                  <td className="py-2">AI-generated response text</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4 font-medium">PostHog</td>
                  <td className="py-2 pr-4">Product analytics</td>
                  <td className="py-2">
                    Anonymised usage events, feature interactions
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4 font-medium">Sentry</td>
                  <td className="py-2 pr-4">Error tracking and monitoring</td>
                  <td className="py-2">
                    Error reports, stack traces, device info
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Resend</td>
                  <td className="py-2 pr-4">Transactional email delivery</td>
                  <td className="py-2">
                    Recipient email addresses, notification content
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <T.P className="mt-4">
            We may also disclose your information:
          </T.P>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Legal Requirements:</strong> When required by law, court
              order, subpoena, or government request, or to protect our legal
              rights.
            </li>
            <li>
              <strong>Safety:</strong> To protect the safety, rights, or
              property of Aiva, our users, or the public.
            </li>
            <li>
              <strong>Business Transfers:</strong> In connection with a merger,
              acquisition, or sale of all or a portion of our assets. You will
              be notified via email and/or a prominent notice on our Website of
              any change in ownership or uses of your personal information.
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Section 8: Data Storage and Security */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            8. Data Storage and Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>
            We implement industry-standard technical and organisational measures
            to protect your data:
          </T.P>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Encryption in Transit:</strong> All data transmitted
              between your browser and our servers is encrypted using TLS 1.3.
            </li>
            <li>
              <strong>Encryption at Rest:</strong> All data stored in our
              database is encrypted using AES-256 encryption.
            </li>
            <li>
              <strong>OAuth Token Security:</strong> We never store your email
              passwords. We use secure OAuth 2.0 tokens to access your connected
              accounts. Tokens are stored in our encrypted database and are
              refreshed automatically.
            </li>
            <li>
              <strong>Row-Level Security (RLS):</strong> Our database enforces
              workspace-level data isolation, ensuring that your data is only
              accessible within your workspace and cannot be accessed by other
              tenants.
            </li>
            <li>
              <strong>Access Controls:</strong> Workspace-based role permissions
              (owner, admin, member, read-only) control who can access data
              within a workspace.
            </li>
            <li>
              <strong>SOC 2 Compliant Infrastructure:</strong> Our hosting
              providers (Vercel, Supabase) maintain SOC 2 Type II compliance.
            </li>
            <li>
              <strong>Regular Security Reviews:</strong> We conduct regular
              security reviews, vulnerability assessments, and dependency
              audits.
            </li>
            <li>
              <strong>AI Audit Logging:</strong> All AI operations (message
              classification, reply generation, auto-sends) are logged with full
              audit trails including model used, confidence scores, and
              processing timestamps.
            </li>
          </ul>
          <T.P className="mt-3">
            While we strive to protect your personal information, no method of
            electronic transmission or storage is 100% secure. We cannot
            guarantee absolute security but are committed to maintaining
            industry best practices.
          </T.P>
        </CardContent>
      </Card>

      {/* Section 9: Data Retention and Deletion */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            9. Data Retention and Deletion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>
            We retain your data for only as long as necessary to provide the
            Service and fulfil the purposes described in this Privacy Policy:
          </T.P>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-semibold">
                    Data Type
                  </th>
                  <th className="text-left py-2 font-semibold">
                    Retention Period
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 pr-4">Account information</td>
                  <td className="py-2">
                    Duration of account existence + 30 days after deletion
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">
                    Email and calendar data (Gmail, Outlook)
                  </td>
                  <td className="py-2">
                    Duration of active channel connection + 30 days after
                    disconnection
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">
                    AI classifications and drafts
                  </td>
                  <td className="py-2">
                    Duration of active subscription + 30 days after account
                    deletion
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">AI audit logs</td>
                  <td className="py-2">
                    12 months (for compliance and quality assurance)
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">Voice conversation data</td>
                  <td className="py-2">
                    Duration of active subscription + 30 days after account
                    deletion
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">Billing records</td>
                  <td className="py-2">
                    7 years (as required by tax and financial regulations)
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Anonymised analytics data</td>
                  <td className="py-2">
                    Indefinite (cannot be linked back to individuals)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <T.P className="mt-3 font-semibold">Deleting Your Data:</T.P>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Disconnect a Channel:</strong> Go to your workspace
              settings and disconnect any channel (Gmail, Outlook, Calendar).
              Associated data will be deleted within 30 days.
            </li>
            <li>
              <strong>Delete Your Account:</strong> You can request account
              deletion through your account settings or by contacting{" "}
              <a
                href="mailto:privacy@tryaiva.io"
                className="text-primary hover:underline"
              >
                privacy@tryaiva.io
              </a>
              . All personal data will be permanently removed within 30 days.
            </li>
            <li>
              <strong>Backup Purge:</strong> Data in backups is purged within 90
              days of deletion.
            </li>
            <li>
              <strong>Exceptions:</strong> Certain data may be retained longer
              where required by law (e.g., billing records for tax compliance)
              or to resolve disputes.
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Section 10: International Data Transfers */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            10. International Data Transfers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>
            Aiva is operated from Australia. Your data may be transferred to,
            stored in, and processed in countries other than your country of
            residence, including the United States and countries within the
            European Economic Area (EEA), where our service providers operate.
          </T.P>
          <T.P>
            When transferring data internationally, we ensure appropriate
            safeguards are in place:
          </T.P>
          <ul className="list-disc list-inside space-y-2">
            <li>
              Our service providers maintain industry-standard data protection
              certifications (SOC 2, ISO 27001).
            </li>
            <li>
              For transfers from the EU/EEA, we rely on Standard Contractual
              Clauses (SCCs) approved by the European Commission or adequacy
              decisions where applicable.
            </li>
            <li>
              For transfers from Australia, we comply with Australian Privacy
              Principle 8 (APP 8), ensuring overseas recipients are bound by
              obligations substantially similar to the APPs.
            </li>
            <li>
              We maintain data processing agreements with all service providers
              that handle personal information.
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Section 11: Your Rights */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            11. Your Rights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <T.P>
            Depending on your location, you have certain rights regarding your
            personal information. We are committed to honouring these rights
            regardless of where you reside.
          </T.P>

          {/* Australian Rights */}
          <div className="border rounded-lg p-4 space-y-3">
            <T.H4 className="font-semibold">
              11.1 Australian Privacy Act (APPs)
            </T.H4>
            <T.P>
              Under the Australian Privacy Act 1988, you have the right to:
            </T.P>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Access the personal information we hold about you (APP 12)
              </li>
              <li>
                Request correction of inaccurate or outdated personal
                information (APP 13)
              </li>
              <li>
                Complain to the Office of the Australian Information
                Commissioner (OAIC) if you believe your privacy has been
                breached
              </li>
              <li>
                Opt out of direct marketing communications
              </li>
              <li>
                Request information about how we handle your personal
                information
              </li>
            </ul>
          </div>

          {/* GDPR Rights */}
          <div className="border rounded-lg p-4 space-y-3">
            <T.H4 className="font-semibold">
              11.2 European Economic Area (GDPR)
            </T.H4>
            <T.P>
              If you are in the EU/EEA, you have the right to:
            </T.P>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Access:</strong> Obtain a copy of your personal data
              </li>
              <li>
                <strong>Rectification:</strong> Correct inaccurate personal data
              </li>
              <li>
                <strong>Erasure:</strong> Request deletion of your personal data
                (&quot;right to be forgotten&quot;)
              </li>
              <li>
                <strong>Restriction:</strong> Restrict processing of your
                personal data
              </li>
              <li>
                <strong>Portability:</strong> Receive your personal data in a
                structured, machine-readable format
              </li>
              <li>
                <strong>Object:</strong> Object to processing based on
                legitimate interests
              </li>
              <li>
                <strong>Withdraw Consent:</strong> Withdraw consent at any time
                where processing is based on consent
              </li>
              <li>
                <strong>Lodge a Complaint:</strong> File a complaint with your
                local data protection authority
              </li>
            </ul>
          </div>

          {/* CCPA Rights */}
          <div className="border rounded-lg p-4 space-y-3">
            <T.H4 className="font-semibold">
              11.3 California (CCPA/CPRA)
            </T.H4>
            <T.P>
              If you are a California resident, you have the right to:
            </T.P>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Right to Know:</strong> Request information about what
                personal information we have collected, used, disclosed, and sold
                in the preceding 12 months
              </li>
              <li>
                <strong>Right to Delete:</strong> Request deletion of your
                personal information
              </li>
              <li>
                <strong>Right to Opt-Out of Sale:</strong> We do not sell
                personal information, so this right is satisfied by default
              </li>
              <li>
                <strong>Right to Non-Discrimination:</strong> We will not
                discriminate against you for exercising your privacy rights
              </li>
              <li>
                <strong>Right to Correct:</strong> Request correction of
                inaccurate personal information
              </li>
              <li>
                <strong>Right to Limit Use of Sensitive Personal
                Information:</strong> Direct us to limit use of sensitive
                personal information to what is necessary
              </li>
            </ul>
            <T.P className="mt-2">
              <strong>Do Not Sell or Share My Personal Information:</strong> Aiva
              does not sell or share (as defined by the CCPA/CPRA) your personal
              information for cross-context behavioural advertising.
            </T.P>
          </div>

          {/* General Rights */}
          <div className="border rounded-lg p-4 space-y-3">
            <T.H4 className="font-semibold">
              11.4 All Users — Universal Rights
            </T.H4>
            <T.P>Regardless of your location, you can:</T.P>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Disconnect any connected channel (Gmail, Outlook, Calendar) at
                any time through workspace settings
              </li>
              <li>
                Revoke OAuth access to Google via your{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google Account permissions
                </a>
              </li>
              <li>
                Disable auto-send and AI features at any time
              </li>
              <li>
                Export your data in a machine-readable format by contacting
                support
              </li>
              <li>
                Delete your account and all associated data
              </li>
            </ul>
          </div>

          <T.P className="mt-3">
            To exercise any of these rights, visit your account settings or
            contact us at{" "}
            <a
              href="mailto:privacy@tryaiva.io"
              className="text-primary hover:underline"
            >
              privacy@tryaiva.io
            </a>
            . We will respond to your request within 30 days (or sooner where
            required by applicable law).
          </T.P>
        </CardContent>
      </Card>

      {/* Section 12: Cookies and Tracking Technologies */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cookie className="w-5 h-5 text-primary" />
            12. Cookies and Tracking Technologies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>We use the following types of cookies and similar technologies:</T.P>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Essential Cookies:</strong> Required for authentication,
              session management, and security. These cannot be disabled as the
              Service will not function without them.
            </li>
            <li>
              <strong>Analytics Cookies:</strong> We use PostHog (a
              privacy-respecting analytics tool) to understand usage patterns
              and improve the Service. These collect anonymised interaction data.
            </li>
            <li>
              <strong>Performance Cookies:</strong> We use Google Analytics for
              web performance monitoring. You can opt out of Google Analytics by
              installing the{" "}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google Analytics Opt-out Browser Add-on
              </a>
              .
            </li>
          </ul>
          <T.P className="mt-3">
            You can control cookie preferences through your browser settings.
            Disabling non-essential cookies will not affect the core
            functionality of the Service.
          </T.P>
        </CardContent>
      </Card>

      {/* Section 13: Children's Privacy */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary" />
            13. Children&apos;s Privacy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <T.P>
            The Service is not intended for use by children under the age of 16
            (or 13 in jurisdictions where a lower age of consent applies). We
            do not knowingly collect personal information from children. If you
            are a parent or guardian and believe your child has provided us with
            personal information, please contact us at{" "}
            <a
              href="mailto:privacy@tryaiva.io"
              className="text-primary hover:underline"
            >
              privacy@tryaiva.io
            </a>{" "}
            and we will promptly delete the information.
          </T.P>
        </CardContent>
      </Card>

      {/* Section 14: Changes to This Policy */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            14. Changes to This Privacy Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>
            We may update this Privacy Policy from time to time to reflect
            changes to our practices, technologies, legal requirements, or
            other factors. When we make material changes:
          </T.P>
          <ul className="list-disc list-inside space-y-2">
            <li>
              We will update the &quot;Last Updated&quot; date at the top of this
              page.
            </li>
            <li>
              We will notify you via email or through a prominent notice on the
              Service at least 30 days before the changes take effect (for
              material changes).
            </li>
            <li>
              Your continued use of the Service after the effective date of the
              updated Privacy Policy constitutes your acceptance of the changes.
            </li>
          </ul>
          <T.P>
            We encourage you to review this Privacy Policy periodically.
          </T.P>
        </CardContent>
      </Card>

      {/* Section 15: Contact Us */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            15. Contact Us
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>
            If you have questions, concerns, or requests regarding this Privacy
            Policy or our data practices, please contact us:
          </T.P>
          <div className="space-y-2 mt-3">
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
              <strong>General Support:</strong>{" "}
              <a
                href="mailto:support@tryaiva.io"
                className="text-primary hover:underline"
              >
                support@tryaiva.io
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
          <T.P className="mt-3">
            We aim to respond to all privacy-related inquiries within 30 days.
            For urgent matters involving data breaches, please include
            &quot;URGENT&quot; in your email subject line.
          </T.P>
        </CardContent>
      </Card>

      {/* Section 16: Regulatory Bodies and Complaints */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5 text-primary" />
            16. Regulatory Bodies and Complaints
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>
            If you are not satisfied with our response to a privacy concern, you
            have the right to lodge a complaint with the relevant data
            protection authority:
          </T.P>
          <div className="space-y-4 mt-3">
            <div className="border rounded-lg p-3">
              <T.P className="font-semibold">Australia</T.P>
              <T.P>
                Office of the Australian Information Commissioner (OAIC)
              </T.P>
              <T.P>
                Website:{" "}
                <a
                  href="https://www.oaic.gov.au"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  www.oaic.gov.au
                </a>
              </T.P>
              <T.P>Phone: 1300 363 992</T.P>
            </div>
            <div className="border rounded-lg p-3">
              <T.P className="font-semibold">European Union</T.P>
              <T.P>
                Contact your local Data Protection Authority (DPA). A list of
                EU DPAs is available at:{" "}
                <a
                  href="https://edpb.europa.eu/about-edpb/about-edpb/members_en"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  European Data Protection Board
                </a>
              </T.P>
            </div>
            <div className="border rounded-lg p-3">
              <T.P className="font-semibold">United States (California)</T.P>
              <T.P>
                California Attorney General&apos;s Office
              </T.P>
              <T.P>
                Website:{" "}
                <a
                  href="https://oag.ca.gov/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  oag.ca.gov/privacy
                </a>
              </T.P>
            </div>
            <div className="border rounded-lg p-3">
              <T.P className="font-semibold">United Kingdom</T.P>
              <T.P>
                Information Commissioner&apos;s Office (ICO)
              </T.P>
              <T.P>
                Website:{" "}
                <a
                  href="https://ico.org.uk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  ico.org.uk
                </a>
              </T.P>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
