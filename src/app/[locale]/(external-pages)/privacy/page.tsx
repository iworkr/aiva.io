import { T } from "@/components/ui/Typography";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Metadata } from "next";
import { Shield, Lock, Eye, Database, Mail, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy - Aiva",
  description: "Learn how Aiva protects your data and respects your privacy",
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
          Last updated: January 2, 2026
        </T.P>
      </div>

      {/* Introduction */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <T.P className="text-lg">
            At Aiva, we take your privacy seriously. This Privacy Policy explains how we collect, 
            use, disclose, and safeguard your information when you use our AI-powered inbox assistant service.
          </T.P>
        </CardContent>
      </Card>

      {/* Section 1 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            1. Information We Collect
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <T.H4 className="mb-2">Account Information</T.H4>
            <T.P>
              When you create an account, we collect your email address, name, and authentication credentials. 
              For Shopify merchants, we also receive your store information through Shopify's OAuth system.
            </T.P>
          </div>
          <div>
            <T.H4 className="mb-2">Communication Data</T.H4>
            <T.P>
              To provide our services, we access messages from connected channels (Gmail, Outlook, Slack) 
              with your explicit permission. This data is used solely to power AI features like classification, 
              drafting, and scheduling.
            </T.P>
          </div>
          <div>
            <T.H4 className="mb-2">Usage Data</T.H4>
            <T.P>
              We collect information about how you interact with our service, including features used, 
              messages processed, and preferences set. This helps us improve our AI and user experience.
            </T.P>
          </div>
        </CardContent>
      </Card>

      {/* Section 2 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            2. How We Use Your Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2">
            <li>Provide and maintain our AI inbox assistant services</li>
            <li>Process and classify your messages using AI</li>
            <li>Generate draft replies and automate responses</li>
            <li>Sync with your calendar for scheduling features</li>
            <li>Personalize your experience based on your preferences</li>
            <li>Send you service-related notifications</li>
            <li>Improve our AI models and service quality</li>
            <li>Ensure security and prevent fraud</li>
          </ul>
        </CardContent>
      </Card>

      {/* Section 3 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            3. Data Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>
            We implement industry-standard security measures to protect your data:
          </T.P>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Encryption:</strong> All data is encrypted in transit (TLS 1.3) and at rest (AES-256)</li>
            <li><strong>OAuth Authentication:</strong> We never store your email passwords—only secure OAuth tokens</li>
            <li><strong>Row-Level Security:</strong> Database isolation ensures your data is only accessible to you</li>
            <li><strong>Regular Audits:</strong> We conduct security reviews and vulnerability assessments</li>
            <li><strong>SOC 2 Infrastructure:</strong> Our hosting providers maintain SOC 2 compliance</li>
          </ul>
        </CardContent>
      </Card>

      {/* Section 4 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            4. Data Sharing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>
            We do not sell your personal information. We may share data only in these limited circumstances:
          </T.P>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Service Providers:</strong> Third parties that help us operate (hosting, analytics) under strict confidentiality</li>
            <li><strong>AI Processing:</strong> OpenAI processes message content for AI features under their enterprise privacy terms</li>
            <li><strong>Legal Requirements:</strong> When required by law, subpoena, or to protect our rights</li>
            <li><strong>Business Transfers:</strong> In connection with a merger or acquisition (with notice)</li>
          </ul>
        </CardContent>
      </Card>

      {/* Section 5 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>5. Your Rights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <T.P>You have the right to:</T.P>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Update or correct inaccurate information</li>
            <li><strong>Deletion:</strong> Request deletion of your account and data</li>
            <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
            <li><strong>Opt-out:</strong> Disconnect channels or disable specific features at any time</li>
            <li><strong>Withdraw Consent:</strong> Revoke OAuth access to connected services</li>
          </ul>
          <T.P className="mt-4">
            To exercise these rights, visit your account settings or contact us at{" "}
            <a href="mailto:privacy@tryaiva.io" className="text-primary hover:underline">
              privacy@tryaiva.io
            </a>
          </T.P>
        </CardContent>
      </Card>

      {/* Section 6 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>6. Data Retention</CardTitle>
        </CardHeader>
        <CardContent>
          <T.P>
            We retain your data for as long as your account is active. Message data is stored for the duration 
            of your subscription. When you delete your account, we remove your personal data within 30 days, 
            except where retention is required by law or for legitimate business purposes.
          </T.P>
        </CardContent>
      </Card>

      {/* Section 7 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>7. Cookies & Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <T.P>
            We use essential cookies for authentication and session management. We also use analytics 
            (privacy-respecting) to understand usage patterns and improve our service. You can control 
            cookie preferences in your browser settings.
          </T.P>
        </CardContent>
      </Card>

      {/* Section 8 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>8. Children's Privacy</CardTitle>
        </CardHeader>
        <CardContent>
          <T.P>
            Aiva is not intended for use by children under 16. We do not knowingly collect personal 
            information from children. If you believe a child has provided us with personal data, 
            please contact us immediately.
          </T.P>
        </CardContent>
      </Card>

      {/* Section 9 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>9. Changes to This Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <T.P>
            We may update this Privacy Policy from time to time. We will notify you of significant changes 
            via email or through our service. Your continued use after changes constitutes acceptance of 
            the updated policy.
          </T.P>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            10. Contact Us
          </CardTitle>
        </CardHeader>
        <CardContent>
          <T.P>
            If you have questions about this Privacy Policy or our data practices, please contact us:
          </T.P>
          <div className="mt-4 space-y-1">
            <T.P><strong>Email:</strong> <a href="mailto:privacy@tryaiva.io" className="text-primary hover:underline">privacy@tryaiva.io</a></T.P>
            <T.P><strong>Support:</strong> <a href="mailto:support@tryaiva.io" className="text-primary hover:underline">support@tryaiva.io</a></T.P>
            <T.P><strong>Website:</strong> <a href="https://www.tryaiva.io" className="text-primary hover:underline">www.tryaiva.io</a></T.P>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
