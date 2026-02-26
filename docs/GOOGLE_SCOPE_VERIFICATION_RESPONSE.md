# Google OAuth scope verification – how to respond

Google asked you to either confirm narrower scopes or justify keeping `gmail.modify`. If you kept `gmail.modify`, Google then required a **CASA Tier 2 security assessment** (by May 24, 2026, annually) — typically ~\$600/year. To avoid that cost, we switched to **Option 1** (narrower scopes) in code.

## CASA requirement (why we chose Option 1)

- **Option 2 (keep gmail.modify):** Google required CASA Tier 2 by May 24, 2026, and annually after that (~\$600/year with an authorized lab).
- **Option 1 (narrower scopes):** Use only `gmail.readonly` + `gmail.send` (no `gmail.modify`). This usually allows verification **without** CASA Tier 2. The app has been updated to use Option 1.

## What’s changing in the app (Option 1)

- **You now request:** `gmail.readonly`, `gmail.send`, `userinfo.email`, `userinfo.profile` (no `gmail.modify`).
- **Still works:** Read mail, send/reply, all Aiva features, “Mark as handled” and “Archive” **inside Aiva** (DB + UI; items leave “Needs your attention”).
- **No longer synced to Gmail:** Mark as read, archive in Gmail, “Handled by Aiva” label, restore to Inbox. So the user’s Gmail Inbox is unchanged; only Aiva’s view is “zero inbox.”

**Selling/messaging:** You can still say “Get to Inbox Zero in Aiva” — handled items are cleared from Aiva’s queue and marked handled in Aiva. Be clear that we don’t change Gmail’s Inbox (e.g. “We organize and act inside Aiva; your Gmail Inbox stays as-is unless you move messages yourself”).

---

## What’s changing (scope comparison)

- **Previously requested:** `gmail.modify`, `gmail.readonly`, `gmail.send`, `calendar.readonly`, `calendar.events`
- **Now (Option 1):** `gmail.readonly`, `gmail.send`, `calendar.readonly`, `calendar.events` (no `gmail.modify`)

If you drop `gmail.modify`, the app can still **read** mail and **send** replies. It will **no longer** be able to:

- Mark messages as read in Gmail
- Archive messages in Gmail (remove from Inbox)
- Apply the “Aiva” label in Gmail
- Restore messages to Inbox in Gmail

In Aiva we still “mark as handled” and “archive” **inside Aiva** (DB + UI). Those actions just won’t sync back to Gmail (messages stay unread/in Inbox in Gmail).

---

## Option 1: Accept narrower scopes (implemented in code)

Use this to avoid CASA Tier 2 cost. **Code is already updated** to request only the narrower scopes and to handle missing `gmail.modify` (403) gracefully.

### Your next steps

1. **In Google Cloud Console (project aiva-io, 385305030522)**  
   - Open **APIs & Services → OAuth consent screen**.  
   - Under **Scopes**, ensure these are present (add if missing):  
     - `https://www.googleapis.com/auth/gmail.readonly`  
     - `https://www.googleapis.com/auth/gmail.send`  
     - `https://www.googleapis.com/auth/calendar.readonly`  
     - `https://www.googleapis.com/auth/calendar.events`  
   - Do **not** remove existing scopes.  
   - **Save**, then **Save and submit** for verification (or re-submit).

2. **Reply to Google’s email** (the one that mentioned CASA) with:
   ```
   We are switching to the recommended narrower scopes. We have updated our app to request only gmail.readonly, gmail.send, calendar.readonly, and calendar.events. We no longer request gmail.modify. Please proceed with verification using these scopes. Confirming narrower scopes.
   ```

3. **Deploy** the app (the code in this repo already uses the narrower scopes). Existing Gmail users may need to re-authorize Gmail so their token matches the new scopes.

---

## Option 2: Justify keeping `gmail.modify`

Use this only if you need “Inbox Zero” behaviour where marking as handled in Aiva also marks as read and archives in Gmail.

### Reply to Google’s email

```
Unable to use narrower scopes

Our app provides Inbox Zero–style handling: when a user marks an email as handled or archives it in Aiva, we mirror that state in the user’s Gmail by:
- Marking the message as read
- Archiving the message (removing it from the Inbox)
- Optionally applying an “Aiva” label so the user can filter handled mail

These actions require the Gmail API messages.modify endpoint, which is only available with the https://www.googleapis.com/auth/gmail.modify scope. Without it, handled messages would remain unread and in the user’s Gmail Inbox, which conflicts with the product experience and our Inbox Zero feature.

We use the minimum scope necessary: we do not use mail.google.com (full mailbox access). We only request gmail.readonly (read messages), gmail.send (send replies), and gmail.modify (mark read, archive, and label after handling).

We request that gmail.modify be retained for this use case.
```

Note: Google may still insist on the narrower set. If they do, you can then follow Option 1 (add recommended scopes, reply “Confirming narrower scopes”, and after approval apply the code changes so the app works without `gmail.modify`).

---

## Code changes (Option 1) — already done

1. **Removed `gmail.modify`** from `src/app/api/auth/gmail/route.ts`. OAuth now requests only `gmail.readonly`, `gmail.send`, `userinfo.email`, `userinfo.profile`.

2. **Gmail modify operations** in `src/lib/gmail/actions.ts` now treat **403** (missing scope) as a soft failure: they log “missing gmail.modify scope” and return false. The app still marks messages as handled in the DB and removes them from “Needs your attention”; only the sync to Gmail (read/archive/label/restore) is skipped.

3. **Redeploy** so production uses the new scope set. Existing users may need to re-authorize Gmail to get a token without `gmail.modify`.

---

## Summary

- **We chose Option 1** to avoid CASA Tier 2 (~\$600/year). The app now requests only `gmail.readonly` and `gmail.send` for Gmail; mark-as-read and archive in Gmail are no longer used.
- **Your steps:** Add the recommended scopes in Console (if needed), reply to Google that you’re switching to narrower scopes, deploy the app, and have users re-authorize Gmail if necessary.
- **If you later want Gmail Inbox sync again:** You would need to request `gmail.modify` again and complete CASA Tier 2 (and pay the annual assessment cost).
