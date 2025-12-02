🔧 Aiva.io — Development Update & Fixes Brief

Prepared for: Aiva Engineering & Product Teams
Environment Reviewed: Development Build
Scope: UI/UX, front-end functionality, navigation, modal behaviours, empty-state UX, settings pages, assistant panel, and module-level feature readiness

⸻

🚀 Summary of Key Priorities (TL;DR)

Priority Fix / Improvement
🔴 High Broken Billing tab, assistant panel cannot be closed, KPI empty state, search/ask bar non-functional
🔴 High Several live buttons open incomplete / placeholder functionality (Connect → does nothing, Filter, etc.)
🟠 Medium Inconsistent CTA styling/placement, low text contrast on dark backgrounds, small toggles
🟢 Low Missing empty-state guidance text across multiple modules, tooltip + microcopy enhancements

⸻

1️⃣ Dashboard / Home

What Works
• Polished greeting and KPI layout
• Global search / Ask Aiva bar triggers the AI assistant panel
• Navigation rail fixed and consistent across modules

Issues & Required Fixes

Issue Required Action
KPI cards look empty when counts = 0 Grey-out styling OR placeholder label (“No new messages yet”)
“Today’s briefing” link does nothing Implement or hide until briefing is ready
Search/Ask input doesn’t submit Integrate AI query or temporarily disable input
Assistant panel X button doesn’t close Make Close functional immediately
Excess white space around KPIs Reduce padding above/below cards

Enhancement Suggestions
• Add example placeholders: “Summarise my inbox”, “Find emails from John”, “Schedule a meeting with Dan tomorrow.”
• Improve colour contrast on dark mode to meet WCAG AA

⸻

2️⃣ Inbox

What Works
• Clean modal for channel integrations (Email / Messaging / Social / Calendar)
• Integration icons immediately communicate supported platforms
• CTA buttons correctly open the Connect modal

Issues & Required Fixes

Issue Required Action
Integration “Connect” buttons do nothing Add tooltip “Coming soon” OR disable until OAuth ready
“All inboxes” button has no dropdown Hide until >1 inbox connected OR show disabled tooltip
Search input provides no feedback If no channels connected → display guidance message
Empty state text too subtle Increase prominence + microcopy explaining value of connecting a channel

Enhancement Suggestions
• Highlight Connect Channel CTA with stronger accent colour
• Add small explainer: “Channels let Aiva unify your email, social DMs and messaging into one inbox.”

⸻

3️⃣ Calendar

What Works
• Month navigation & Day/Week/Month toggles work correctly
• Add event modal behaves correctly (cancel & close)
• Overdue task → Resolve & refresh toasts working

Issues & Required Fixes

Issue Required Action
Search results offer no feedback Show “No matching events found” when zero
Filter modal incomplete Hide until implemented OR finish filters
Add calendar / Manage frequent contacts buttons dead Disable, hide or connect to settings temporarily
Grid lines too faint Increase contrast for time slot readability
Calendar looks empty with zero events Add helpful blank-state guidance

⸻

4️⃣ Contacts

What Works
• Add Contact modal fully functional (form loads and closes correctly)
• Top banner + empty state both open modal

Issues & Required Fixes

Issue Required Action
Create Contact button inactive Implement create + validation + duplicate handling
Favorites toggle does nothing Hide, disable or implement filtering
Search bar offers no feedback If no contacts → message “No contact found”

Enhancement Suggestions
• Reduce friction: only require Full Name + Email
• Mark optional fields & add field-level validation

⸻

5️⃣ Settings

🔹 AI Features Tab
• Works visually but missing feedback on Save
• Toggles too small for accessibility

Actions
• Add toast: “AI settings saved successfully”
• Add “On / Off” labels
• Provide preview text for reply tone styles (Professional, Casual, Friendly etc.)

🔹 Notifications Tab
• Good structure & text
• Save button position inconsistent with AI tab

Actions
• Align Save button placement across all setting tabs
• Future improvement: granular notifications (new message / meetings / task reminders)

🔹 Account Tab
• Solid structure but lacks UX clarity

Actions

Issue Required Fix
Timezone + sync dropdown don’t show selected value Display current setting
Email read-only w/out explanation Add text “Contact support to update email”
Change Password button does nothing Implement or hide until ready

🔹 Billing Tab — ❗Critical
• Clicking shows: “Something went wrong!”
• Retry immediately fails

Temporary Fix (ASAP)
• Hide tab OR show “Billing coming soon” page until backend ready

⸻

🌍 General UI/UX Improvements (Global)

Area Action
Accessibility Improve contrast & enlarge small fonts/toggles
Button Consistency Standardise primary CTA colour + placement (top right or bottom right, but consistent)
Empty States Replace blank screens with short instructive messages
Error Handling Avoid raw errors—use “Under construction / Coming soon”
Discoverability Add tooltips, microcopy, and example placeholders across modules

⸻

🧩 Development Roadmap (Recommended Order)

Phase Deliverable
Phase 1 (Stability) Close button on assistant panel, Billing tab fix/hide, disable non-functional buttons/menus
Phase 2 (UX polish) KPI placeholders, improved empty states, consistent Save buttons, CTA visibility improvements
Phase 3 (Functionality) Implement Create Contact + Event validation + Inbox search feedback + calendar filters
Phase 4 (AI readiness) Enable message sending from assistant, expand reply tone previews
Phase 5 (Delighters) Onboarding walkthrough, smart suggestions, animated feedback, light mode toggle

⸻

🌟 The Overall Outlook

Aiva.io already feels modern, intuitive and polished, but the current build gives the impression of incomplete functionality because several UI elements look finished but don’t work yet.
The biggest immediate wins will come from:
• Fixing interaction blockers (assistant panel X, Billing tab)
• Preventing users from clicking incomplete features
• Adding helpful guidance when data = 0

These updates will bring Aiva closer to the premium, thoughtful UX its visual style already promises.
