# Google OAuth scope verification – how to respond

Google asked you to either confirm narrower scopes or justify keeping `gmail.modify`.

## What’s changing

- **You requested:** `gmail.modify`, `gmail.readonly`, `gmail.send`, `calendar.readonly`, `calendar.events`
- **Google recommends:** `gmail.readonly`, `gmail.send`, `calendar.readonly`, `calendar.events` (i.e. **drop `gmail.modify`**)

If you drop `gmail.modify`, the app can still **read** mail and **send** replies. It will **no longer** be able to:

- Mark messages as read in Gmail
- Archive messages in Gmail (remove from Inbox)
- Apply the “Aiva” label in Gmail
- Restore messages to Inbox in Gmail

In Aiva we will still “mark as handled” and “archive” **inside Aiva** (DB + UI). Those actions just won’t be synced back to Gmail (messages stay unread/in Inbox in Gmail).

---

## Option 1: Accept narrower scopes (recommended for faster approval)

Use this if you’re okay with Gmail read/send only and no syncing of read/archive/labels back to Gmail.

### Steps

1. **In Google Cloud Console (project aiva-io, 385305030522)**  
   - Open **APIs & Services → OAuth consent screen**.  
   - Under **Scopes**, add **only** these if not already present:  
     - `https://www.googleapis.com/auth/gmail.readonly`  
     - `https://www.googleapis.com/auth/gmail.send`  
     - `https://www.googleapis.com/auth/calendar.readonly`  
     - `https://www.googleapis.com/auth/calendar.events`  
   - Do **not** remove any existing scopes.  
   - **Save and submit** for verification (or re-submit if already in review).

2. **Reply to Google’s email** with exactly:
   ```
   Confirming narrower scopes
   ```

3. **Do not** change your app code or stop requesting `gmail.modify` in your app **until** Google has **approved** the verification. After approval, update the app to request only the four scopes above and deploy (see “Code changes after verification” below).

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

## Code changes after verification (Option 1 only)

**Only after Google has approved the app with the narrower scopes**, do the following:

1. **Remove `gmail.modify` from the OAuth request**  
   - File: `src/app/api/auth/gmail/route.ts`  
   - Remove the line:  
     `'https://www.googleapis.com/auth/gmail.modify',`

2. **Make Gmail “modify” operations safe without the scope**  
   - When calling Gmail `messages.modify` (mark read, archive, label, restore), catch 403/insufficient permissions and treat as “success” for our flow (we still mark as handled in our DB; we just don’t sync to Gmail).  
   - Optionally show a short in-app note that “Gmail sync (mark read/archive) is not available” if you want to set user expectations.

3. **Redeploy** so the app only requests the four approved scopes. Existing users may need to re-authorize Gmail to get a token without `gmail.modify`.

---

## Summary

- **Fastest path:** Option 1 — add recommended scopes in Console, reply “Confirming narrower scopes”, then after approval update the app and deploy.  
- **If you need Inbox Zero in Gmail:** Option 2 — send the justification; if Google still requires narrower scopes, fall back to Option 1 and the code changes above.
