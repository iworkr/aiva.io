Aiva.io – Unified Fix & Development Brief

Scope:
• Authenticated app (Home, Inbox, Calendar, Contacts, Settings) with connected channels
• Marketing site (tryaiva.io – home, nav, docs, blog, changelog, roadmap)
• UX, functional gaps, branding consistency, and production-readiness

⸻

0. High-Level Priorities

P1 – Fix Soonest (Functional / Clarity) 1. Inbox & Assistant
• Assistant panel X doesn’t close (in some builds) – ensure consistent dismissal behaviour.
• AI reply generation sometimes fails silently (quick reply + full reply) – add loaders + error states. 2. Inbox Reading Experience
• Raw HTML in message previews & full message view – needs cleaned, readable rendering. 3. Calendar & Events
• No date/time picker for events + no visible feedback on event creation or search results. 4. Contacts
• Favorites filter does nothing; clicking a contact doesn’t show details. 5. Branding
• Docs, Blog, and Roadmap still reference Nextbase Ultimate / Fumadoc and not clearly Aiva.

P2 – Important UX Polish 1. Unread vs read states in Inbox too subtle in dark mode. 2. Inconsistent feedback for archive, quick reply send, etc. 3. Marketing site CTAs and headers sometimes feel generic/template-ish. 4. Some “coming soon” features are live but non-functional (filters, calendars, FAQ item behaviour).

P3 – Longer-Term Improvements 1. Better infinite scroll / pagination on inbox. 2. More granular notification and AI settings. 3. Deeper a11y: contrast, focus states, alt text, screen reader labels.

⸻

1. Dashboard / Home (App)

What Works
• Personalised greeting and KPI counters reflect real data when channels are connected (e.g., 46 new messages, 58 active conversations).
• “What Needs Your Attention” shows a scrollable list of messages; clicking a card opens its thread.
• AI bar accepts prompts like “Summarise my inbox”, and assistant can summarise inbox and tasks effectively.

Issues & Fixes

Area Issue Required Change
Greeting & KPIs Cards look empty when values are zero. Dim state or placeholder text (“No upcoming events”, “No new messages yet”).
“What Needs Your Attention” Some message cards show raw HTML snippets. Strip HTML, show short plain-text snippet; truncate very noisy OTP/marketing content behind “View details”.
Today’s Briefing button In some builds it does nothing; in production it appears ok but still light on feedback. Ensure it always either: (a) scrolls to briefing panel, or (b) clearly marked “Coming soon” until fully implemented.
Assistant panel X sometimes doesn’t close; panel can feel “stuck” in front of content; no visible loading state. Make close behaviour consistent; add “Thinking…” spinner; allow ESC key to dismiss; ensure panel can be reopened easily.
Assistant reply when no data When no channels are connected message is generic. Include a clear “Connect channels” link / button inside the reply.

⸻

2. Inbox (App)

What Works
• With Gmail connected, inbox populates with real emails, showing sender, subject, date and channel icons.
• Three-dot menu actions include Mark as read and Archive.
• Quick-reply lightning icon opens AI draft with confidence score and “Send / Cancel”.
• Message viewer shows Message and Reply tabs with tone selection for AI replies.

Issues & Fixes

Area Issue Required Change
Read/Unread states Hard to distinguish in dark mode. Increase contrast: bold subject, coloured unread dot or bar; dim read messages more clearly.
Archive action Works, but no user feedback. Add toast: “Conversation archived. [Undo]”.
Search bar Accepts text but doesn’t show clear behaviour / zero-results messaging. Implement instant (or debounced) search; show result count; on zero results display “No messages found for ‘X’”.
Quick Reply Draft generation can take 10–15 seconds; failures are silent. Show spinner or skeleton while generating; explicit “Something went wrong, try again” if API errors; small “AI is still working…” notification if slow.
Message Viewer: HTML Raw HTML output is hard to read and visually noisy. Render HTML with safe sanitisation or convert to simplified formatted text; hide unnecessary boilerplate (footers, tracking pixels).
AI Reply (full view) Generate button sometimes fails with no feedback; send behaviour unclear. Add loading state / errors; confirm send with toast or highlight; if sending isn’t wired, disable button with tooltip “Coming soon” to avoid confusion.
Pagination / performance All messages appear in one scroll; potential performance concerns for large mailboxes. Implement infinite scroll or page-based loading; optional “Jump to date” or “Load older messages” control for large inboxes.

⸻

3. Calendar (App)

What Works
• Day/Week/Month toggles work; header updates correctly.
• Overdue tasks panel works with Resolve and Refresh toasts.
• Manage Calendars / Frequent Contacts modals present and visually consistent.

Issues & Fixes

Area Issue Required Change
Grid & Contrast In dark mode, grid lines and time slots are faint. Increase grid contrast and slot outlines; ensure events visually stand out from background.
Add Event Modal Input works, but no date/time picker; no success confirmation. Add date + time pickers tied to the currently selected day; validate End > Start; toast “Event created” and insert event in view immediately.
Search Events Modal opens but results handling unclear; no empty-state message. Implement display of matching events or explicit “No events found”; either inline results or highlight them in calendar.
Filter Filter modal says it’s “ready for calendar selection” but isn’t functional. Either: implement basic filters (My events/Shared calendars) or hide/disable button with “Coming soon” tooltip until real filters exist.
Manage Calendars Buttons appear active even if full backend integration not ready. If integrations not complete, show disabled state / “Not yet available” tooltip; once ready, ensure flows are fully tested with test accounts.
Manage Frequent Contacts Modal opens, but no obvious pre-population or linkage with Contacts module. Pre-populate from existing contacts; saving frequent contacts should reflect in calendar suggestions (when adding events, etc.).

⸻

4. Contacts (App)

What Works
• With connected channels, contacts grid populates with contacts derived from communication (e.g., Microsoft Security, Slack).
• “Add Contact” button launches a comprehensive contact form (name, email, phone, company, etc.).

Issues & Fixes

Area Issue Required Change
Favorites filter Toggling Favorites has no visible effect. Implement favourites: allow “star” on cards; filter list when Favorites is active; show empty state “No favourite contacts yet” if none.
Contact click Clicking a contact does not reveal detailed information or email history. Implement Contact Detail view: show full profile, notes, and related messages/tasks; allow editing and favouriting directly from this view.
Search Search bar doesn’t visibly filter contacts. Implement live filtering by name/email/company; show “No contacts found” on zero results.
Add Contact form Many fields with no required/optional distinction; no clear success confirm after creation. Mark required fields (e.g., Full Name, Email); hide extras behind “Advanced details”; validate email; toast “Contact created” and immediately show new contact.

⸻

5. Settings (App)

AI Features
• Works: Toggles for Auto-classify messages, Auto-extract events, Deep history search & linking; reply tone selector (Formal, Professional, Friendly, Casual); save button present.
• Fixes:
• Ensure toggles are large enough and accessible, with clear On/Off labels.
• Add explanatory subtext for each feature (what it does, any performance implications).
• Toast on save: “AI settings saved successfully.”

Notifications
• Works: Email & push toggles with explanatory text; save button.
• Fixes:
• Consider granular notifications (new message, daily digest, event reminders).
• Keep save button styling & placement consistent with AI Features tab.

Account
• Works: Editable display name; read-only email; timezone & sync frequency dropdowns; Change Password button.
• Fixes:
• Ensure timezone & sync selectors show current values and helper text (“We’ll sync every X minutes”).
• Wire up Change Password flow (modal or redirect) or hide button until ready.
• Allow avatar customisation later as an enhancement.

Billing
• Current state (across builds):
• Historically showed “Something went wrong!”; in latest QA, appears more stable, but content still minimal/placeholder.
• Fixes:
• If billing isn’t fully integrated, either hide the tab or show a clear “Billing is coming soon” page with safe, non-error state.
• Once live, ensure plan details match marketing pricing, and update from Nextbase defaults to Aiva’s real plans.

⸻

6. Auth Flows (Login / Sign Up)

Login (/en/login)
• Works:
• Tabbed forms for Password vs Magic Link.
• OAuth: Google (Gmail), Outlook, plus GitHub/Twitter.
• Links to Forgot Password and Sign Up work correctly.
• Fixes / Polish:
• Some internal accessible names show as “Pa word / Forgot pa word”; run an a11y pass to fix ARIA labels and visually hidden text.

Sign Up (/en/sign-up)
• Works:
• Aiva-branded copy; Password vs Magic Link tabs; OAuth consistent with login.
• Fixes / Polish:
• Remove duplicate “Already have an account? Log in” link or adjust placement for cleaner layout.

⸻

7. Marketing Site & Docs (tryaiva.io)

7.1 Home / Main Marketing (/en)

Works:
• Hero, trust badges, Start Free Trial, See How It Works, Pricing, CTA sections all render correctly.
• All primary CTAs (Start Free Trial) use a consistent primary blue and route to sign-up.

Issues & Fixes:

Area Issue Required Change
Header “Dashboard” Label reads like template wording and goes straight to app (auth). Consider renaming to “Open App” or “Login” on marketing pages for clarity.
Hero announcement bar “🚀 New: AI-Powered Communication Assistant” links to #pricing rather than features, which can feel slightly mismatched. Consider linking to features section or a dedicated “How it works” section.
Copy specificity Text is SaaS-generic in some spots. Iteration: emphasise multi-channel AI inbox (Gmail, Outlook, Slack, WhatsApp, etc.) and “Unified AI Communication Hub” language.

7.2 Header Nav Pages

Page Current State Fix / Recommendation
Docs (/en/docs) Fully functional but obviously Nextbase/Fumadoc-branded; explains the framework, not Aiva. Short term: add a top banner “Aiva is built on Nextbase Ultimate — docs currently reference the underlying framework.” Long term: replace with Aiva-specific docs.
Blog (/en/blog) Shows “Blog List | Nextbase” title; empty-state “No blog posts yet.” Update page <title> and headings to “Aiva.io Blog”. Replace empty-state with Aiva copy or hide route until content exists.
Changelog (/en/changelog) Works, but content leans toward framework-level changes; not clearly Aiva-specific. Start curating Aiva-specific release notes, or clearly mark current items as “platform-level updates” until Aiva releases are added.
Roadmap (/en/roadmap) Title and copy reference “Nextbase Ultimate”; roadmap items are generic. Rename to “Aiva.io Roadmap” and swap in Aiva-oriented items, or temporarily hide from navigation until your product roadmap is defined.

7.3 Other Marketing Sections
• Features & Integrations:
• Structure is solid but visually minimal; add icons, screenshots, and logos of key integrations (Gmail, Outlook, Slack, etc.).
• Testimonials:
• Currently feels like placeholder text and repeated personas.
• Replace with real quotes or drastically simplify until real testimonials are ready.
• Pricing:
• Good tabbed interface (Monthly/Annual) and clear tier layout.
• Ensure annual plan reflects a realistic discount (and show effective per-month rate), not just simple ×10/×12 math.
• FAQ:
• Structure is there, but in earlier builds some items mis-linked to sign-up.
• Confirm all accordions expand in-place and don’t trigger navigation.

⸻

8. Global UX, A11y & Behaviour Improvements
   1. Consistent Button Styles
      • Define a button system: Primary (blue), Secondary (outline), Tertiary (text).
      • Make sure “Start Free Trial” and other primary actions look identical across app and marketing.
   2. Loading & Feedback Everywhere
      • Any async action (AI draft, archive, search, connect, save settings) should show:
      • Loading (spinner or skeleton)
      • Success toast
      • Error message on failure
   3. Dark-Mode Contrast & Typography
      • Increase contrast for secondary text, grid lines, and subtle UIs across Inbox and Calendar.
      • Ensure WCAG AA at minimum.
   4. Accessibility
      • Fix truncated accessible names (“Pa word”, “Today’ briefing”).
      • Add alt text on icons; ensure tab order and focus outlines are clean.
      • Confirm modals are focus-trapped and escape key closes them.
   5. Handling Sensitive Email Content
      • For OTPs or very sensitive content, avoid showing full code in previews; show truncated snippet with “View full message” instead.

⸻

9. Suggested Implementation Roadmap

Phase 1 – Core UX & Functional Fixes (App)
• Inbox: read/unread styling, archive toast, search results, HTML rendering.
• Dashboard: Assistant close behaviour + placeholders.
• Calendar: event date/time picker + event creation feedback.
• Contacts: favorites filter + contact detail view + search.

Phase 2 – Branding & Marketing Consistency
• Update Docs/Blog/Roadmap titles and key headings to Aiva.io.
• Decide whether to expose Nextbase foundation explicitly or hide framework references for now.
• Improve hero and features copy to be more “AI Inbox” specific.

Phase 3 – A11y & Polish
• Contrast, ARIA labels, alt text, keyboard navigation.
• Refine FAQ, testimonials, and CTA flows.

Phase 4 – Performance & Scale
• Inbox pagination/infinite scroll.
• More advanced filters (Unread, Starred, Channel).
• Event & contact enrichment (frequent contacts, intelligent suggestions).
