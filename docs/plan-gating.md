# Plan-Based Feature Gating in Aiva.io

## Overview

Aiva.io implements comprehensive plan-based feature gating to differentiate between Basic and Professional plans. This document outlines the feature permissions, implementation patterns, and usage.

## Plan Tiers

### Free (No Active Subscription)
- **Auto-classify messages**: ✅
- **Basic AI**: ✅ (Deep history, linking, calendar)
- **AI Drafts**: ❌
- **Auto-responses**: ❌
- **Max Channels**: 1
- **Max Messages/Month**: 100

### Basic ($29/month)
- **Auto-classify messages**: ✅
- **Basic AI**: ✅ (Deep history, linking, calendar functions)
- **AI Drafts**: ❌ (NOT available)
- **Auto-responses**: ❌ (NOT available)
- **Advanced Search**: ❌
- **Custom Prompts**: ❌
- **Max Channels**: 3
- **Max Messages/Month**: 1,000

### Professional ($79/month)
- **Auto-classify messages**: ✅
- **Basic AI**: ✅
- **AI Drafts**: ✅ (Available)
- **Auto-responses**: ✅ (Available)
- **Advanced Search**: ✅
- **Custom Prompts**: ✅
- **Unlimited Channels**: ✅
- **Team Workspaces**: ✅
- **Unlimited Messages**: ✅

### Enterprise ($199/month)
- **All Pro Features**: ✅
- **Custom Integrations**: ✅
- **SSO**: ✅
- **White-label**: ✅
- **API Access**: ✅

## Implementation

### 1. Subscription Utilities (`src/utils/subscriptions.ts`)

Core utilities for checking plan types and feature permissions:

```typescript
import { getPlanType, hasFeature, PLAN_FEATURES } from "@/utils/subscriptions";

// Get plan type
const planType = getPlanType(subscriptions);

// Check specific feature
const hasAIDrafts = hasFeature(subscriptions, "aiDrafts");
```

### 2. Server-Side Checks (`src/rsc-data/user/subscriptions.ts`)

For use in Server Components and Server Actions:

```typescript
import { getHasFeature, getWorkspacePlanType } from "@/rsc-data/user/subscriptions";

// In Server Components/Actions
const hasAIDrafts = await getHasFeature(workspaceId, "aiDrafts");
const planType = await getWorkspacePlanType(workspaceId);
```

### 2b. Server Actions for Client Components (`src/data/user/subscriptions.ts`)

Server actions that can be safely called from client components:

```typescript
import { 
  checkProSubscriptionAction,
  checkFeatureAccessAction,
  getWorkspacePlanAction 
} from "@/data/user/subscriptions";

// In client components (via useAction or direct call)
const result = await checkProSubscriptionAction({ workspaceId });
const hasPro = result?.data?.hasPro;

const featureResult = await checkFeatureAccessAction({ 
  workspaceId, 
  feature: "aiDrafts" 
});
const hasAccess = featureResult?.data?.hasAccess;
```

### 3. Client-Side Hooks (`src/components/ProFeatureGate.tsx`)

For use in Client Components (uses server actions internally):

```typescript
import { useFeatureAccess, useProSubscription } from "@/components/ProFeatureGate";

// Check Pro subscription
const { hasPro, loading } = useProSubscription(workspaceId);

// Check specific feature
const { hasAccess, loading } = useFeatureAccess(workspaceId, "aiDrafts");
```

**Note**: These hooks call server actions (`checkProSubscriptionAction`, `checkFeatureAccessAction`) to safely check subscriptions without exposing service role keys to the client.

### 4. Feature Gating in Server Actions

Example from `src/lib/ai/reply-generator.ts`:

```typescript
export async function generateReplyDraft(
  messageId: string,
  workspaceId: string,
  options: ReplyOptions = {}
): Promise<ReplyDraftResult> {
  // Check feature access
  const { getHasFeature } = await import('@/rsc-data/user/subscriptions');
  const hasAIDrafts = await getHasFeature(workspaceId, 'aiDrafts');
  
  if (!hasAIDrafts) {
    throw new Error(
      'AI reply drafts are a Pro feature. Upgrade your plan to access AI-powered reply generation.'
    );
  }
  
  // ... rest of implementation
}
```

### 5. UI Feature Gating

Example from `src/components/inbox/AIReplyComposer.tsx`:

```typescript
const { hasAccess: hasAIDrafts, loading } = useFeatureAccess(workspaceId, 'aiDrafts');

// Disable button if no access
<Button
  disabled={!hasAIDrafts || loading}
  onClick={handleGenerateReply}
>
  {!hasAIDrafts && <Lock className="mr-2 h-4 w-4" />}
  Generate AI Reply
</Button>
```

## Features by Plan

### Basic Plan Features (Available to All)

1. **Auto-classify messages**
   - Priority detection
   - Category classification
   - Sentiment analysis

2. **Deep history search**
   - AI-powered semantic search
   - Conversation linking
   - Message threading

3. **Calendar functions**
   - Event extraction from messages
   - Auto-create calendar events
   - Scheduling intent detection

### Pro-Only Features (Gated)

1. **AI Reply Drafts**
   - Location: `src/lib/ai/reply-generator.ts`
   - Gated: `generateReplyDraft()`, `generateReplyVariations()`
   - UI: `src/components/inbox/AIReplyComposer.tsx`

2. **Auto-responses**
   - Confidence-based auto-send
   - Multiple tone variations
   - Custom AI prompts

3. **Advanced Search**
   - Complex filters
   - Saved searches
   - Advanced analytics

## Settings UI

The Settings page (`src/components/settings/SettingsView.tsx`) now displays:

1. **Current Plan Badge**
   - Shows "Basic Plan" or "Professional Plan"
   - Upgrade button for Basic users

2. **Feature Gating**
   - Basic features: Fully accessible
   - Pro features: Disabled with "Pro Feature" badge
   - Upgrade prompts for locked features

## Development Mode

When `STRIPE_SECRET_KEY` is not configured:
- All features are enabled
- Plan type returns "pro"
- Allows testing without Stripe setup

## Error Handling

### Server-Side
```typescript
try {
  const hasFeature = await getHasFeature(workspaceId, 'aiDrafts');
  if (!hasFeature) {
    throw new Error('Feature requires Pro plan');
  }
} catch (error) {
  // Handle gracefully
}
```

### Client-Side
```typescript
const handleAction = async () => {
  if (!hasAIDrafts) {
    toast.error('AI reply drafts require a Pro plan. Please upgrade to continue.');
    return;
  }
  // Proceed with action
};
```

## Testing

### Test Different Plan Tiers

1. **Free Tier**: No active subscription
2. **Basic Tier**: Subscription with "Starter" or "Basic" in name
3. **Pro Tier**: Subscription with "Professional" or "Pro" in name
4. **Enterprise Tier**: Subscription with "Enterprise" in name

### Verify Feature Access

```typescript
// In tests
import { getPlanType, hasFeature, PLAN_FEATURES } from "@/utils/subscriptions";

const mockBasicSubscriptions = [
  { billing_products: { name: "Basic Plan", active: true } }
];

const planType = getPlanType(mockBasicSubscriptions); // "basic"
const hasAIDrafts = hasFeature(mockBasicSubscriptions, "aiDrafts"); // false
```

## Future Enhancements

1. **Usage Tracking**
   - Track messages per month
   - Enforce channel limits
   - Show usage in settings

2. **Soft Limits**
   - Warning when approaching limits
   - Grace period before hard cutoff

3. **Feature Announcements**
   - In-app notifications for new features
   - Targeted upgrade prompts

4. **A/B Testing**
   - Test different pricing tiers
   - Measure conversion rates

## Summary

The plan gating system ensures:
- ✅ Basic users get essential AI features (classification, search, calendar)
- ❌ Basic users cannot access AI drafts and auto-responses
- ✅ Pro users get full access to all features
- ✅ Clear upgrade paths in UI
- ✅ Graceful error handling
- ✅ Development mode for testing

