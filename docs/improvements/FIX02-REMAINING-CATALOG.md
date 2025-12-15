# FIX02 Remaining Items Catalog

## Status: In Progress

This document catalogs remaining items from FIX02.md that need to be addressed after the initial P1/P2 fixes.

## Completed (P1 & P2)
- ✅ Inbox: read/unread styling, archive toast with undo, search results, HTML rendering
- ✅ Dashboard: Assistant close behavior, placeholders, zero states
- ✅ Calendar: event date/time picker, event creation feedback
- ✅ Contacts: favorites filter, contact detail view, search
- ✅ Branding: Docs/Blog/Roadmap titles updated to Aiva.io
- ✅ Settings: AI/Notifications toggles with feedback, account settings wired

## Remaining Items by Priority

### P2 - Important UX Polish (Must-Have Pre-Launch)

#### Auth Forms Accessibility
- [ ] Fix truncated accessible names ("Pa word", "Forgot pa word")
- [ ] Add explicit aria-labels for password fields and buttons
- [ ] Ensure all form fields have descriptive labels

#### Marketing Site Polish
- [ ] FAQ: Ensure accordions expand in-place without navigation
- [ ] Testimonials: Replace placeholder text with real quotes or "Coming soon" message
- [ ] Pricing: Implement realistic annual discount (2 months free) and show effective per-month rate
- [ ] Nav: Change "Dashboard" to "Open App" or "Login" on marketing pages
- [ ] Hero: Update announcement bar link to point to features instead of pricing

#### Calendar Enhancements
- [ ] Search: Show explicit "No events found for 'X'" message
- [ ] Filter: Improve "coming soon" messaging or implement basic calendar filter
- [ ] Manage Calendars: Add clear messaging about integration status
- [ ] Frequent Contacts: Ensure linkage with Contacts module is clear

#### Contacts Detail
- [ ] Show notes and tags prominently (already in code, verify display)
- [ ] Add "recent messages" section or clearly state when not available
- [ ] Ensure inline editing is intuitive

### P3 - Accessibility & Polish (Must-Have Pre-Launch)

#### Global A11y
- [ ] Add aria-labels to all icon-only buttons (archive, star, close, settings, add)
- [ ] Add alt text to marketing images (logos, hero illustrations, integration logos)
- [ ] Ensure all modals/dialogs are focus-trapped and ESC-closable
- [ ] Verify keyboard navigation works for all interactive elements
- [ ] Audit dark-mode contrast (WCAG AA minimum)

#### Button & Feedback Consistency
- [ ] Audit button styles across app and marketing for consistency
- [ ] Ensure all async actions show: loading → success toast → error message
- [ ] Standardize loading states (spinner vs skeleton)

### P4 - Performance & Scale (Nice-to-Have Post-Launch)

#### Inbox Performance
- [ ] Implement pagination or infinite scroll using existing `hasMore` field
- [ ] Add additional filters UI (Unread, Starred, Channel) leveraging existing server actions
- [ ] Ensure pagination works correctly with search and existing caching

#### Calendar & Contacts Enrichment
- [ ] Add "Jump to date" feature for calendar
- [ ] Consider lazy loading for distant calendar months
- [ ] Add incremental loading for large contact lists if needed

## Implementation Notes

### Files to Modify
- Auth forms: `src/app/[locale]/(dynamic-pages)/(login-pages)/**/*.tsx`
- Marketing: `src/components/LandingPage/*.tsx`, `src/components/NavigationMenu/**/*.tsx`
- Calendar: `src/components/calendar/MotionCalendarView.tsx`, `src/components/calendar/ManageAccountsDialog.tsx`
- Contacts: `src/components/contacts/ContactDetailDialog.tsx`
- Inbox: `src/components/inbox/InboxView.tsx`, `src/components/inbox/MessageItem.tsx`
- Global: All components with icon-only buttons, modals, images

### Testing Checklist
- [ ] All forms accessible via keyboard
- [ ] Screen reader announces all interactive elements
- [ ] Dark mode contrast meets WCAG AA
- [ ] All modals close with ESC
- [ ] FAQ accordions don't trigger navigation
- [ ] Pricing shows correct annual discount
- [ ] Inbox pagination works with filters/search
- [ ] Calendar search shows proper empty states

