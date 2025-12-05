Aiva v2 – Kinso-Level Experience Upgrade

Product Development Brief & Feature Spec

Goal: Bring Aiva’s UI, intelligence visualization, cross-context awareness, and auto-drafted replies up to (and beyond) Kinso’s polished presentation, while preserving Aiva’s deeper capabilities such as tasks, calendar intelligence and auto-send safety.

⸻

📌 Product Vision

Turn Aiva from a “smart unified inbox” into a visible, communicative AI assistant that:

✔ Shows what it’s doing

✔ Explains how it helps

✔ Surfaces relevant information proactively

✔ Looks and feels human-like in tone and response

✔ Adds UI delight + confidence boosting cues

The user must FEEL assisted, not just see results.

⸻

🧠 CORE UI & AI EXPERIENCE UPGRADES

⸻

1️⃣ Message List Summaries (Replace Email Preview)

Kinso does not show the first line of the message. It shows AI summaries inline.

🔧 Required Changes:
• Replace existing preview text under each subject with a 1–2 sentence AI summary.
• Summarize entire email/social message history snippet if applicable (thread-aware).

🧠 AI Requirements:
• Fast lightweight model summary (store or cache on message ingestion).
• Re-summarize on message updates.

🎨 UI Requirements:
• Fade trailing text with clean ellipsis.
• Priority icon stays, summary is next to it.
• Channel icon stays on the right.

Goal: User can skim their inbox without opening messages.

⸻

2️⃣ “AI is Working” Visual Narration

✨ The assistant should “think out loud.”

🏗️ Required UI Components:

Action Visual
Searching “Searching across 6 apps…” + animated dots + app logos pulsing
Summarizing “Summarizing this conversation…” + typewriter animation
Drafting “Auto-drafting reply…” + typing animation
Finding Attachments/Data “Looking for documents…” + scan animation
Found Something “Found info about ‘Susan’s Contract’” highlight card

🎨 Motion Requirements:
• Smooth fade-in/out transition
• Typewriter text animation for drafts (non-blocking)
• Pulsing app icons when querying specific channels

🧠 Backend Trigger Requirements:
• Expose AI task status events via WebSockets

Status Event
search_started ai.search.start
search_completed ai.search.done
summary_started ai.summary.start
reply_started ai.reply.start
document_found ai.search.found_resource

⸻

3️⃣ Smart Reference Surfacing

Kinso automatically surfaces past relevant emails. Aiva should do the same — but smarter by linking directly to message + extracted attachments.

🧠 AI Logic:
When a new message asks for:
• price guide
• proposal
• invoice
• contract
• report
• file with name referenced

Aiva will:
✔ Search previous communications
✔ Identify most relevant item
✔ Display the result in-inbox as “Found this for you” card

🎨 UI Spec:
Card example:

📎 Looks like Sarah needs the price guide.
Aiva found one you shared last month.
➡ View Email | 📄 View File

Clicking opens modal preview + option to attach automatically to reply.

⸻

4️⃣ Auto-Draft UI Upgrade

Kinso shows a bubble stating “Auto drafting response…” — Aiva must show:
• Typing animation
• Confidence score growing in real time
• Why certain tone/phrasing chosen (expandable)

✉️ Final UI Layout:

🪄 Auto-drafting your response…
[•••••• Typing Animation ••••••]

Confidence: 82% ↑
Tone: Professional, friendly (based on last 3 replies with Natasha)

Draft:

> Thanks for the update, I’ll review and get back…

Actions:

Action Icon
Approve/send ➤
Edit ✏️
Regenerate 🔄
Copy 📋

⸻

5️⃣ Microcopy + Narrative Enhancements

Aiva must speak like a human assistant, not a system.

Replace:
❌ “Done”
✔ “Here’s what I found for you.”

❌ “Task extracted.”
✔ “Looks like this needs follow up — I’ll remind you on Friday.”

⸻

6️⃣ Morning Briefing Upgrade

Kinso’s morning briefing = static.
Aiva’s must be interactive + actionable:

📌 Sections:

Section Interaction
Top Priorities Respond inline
Meetings Today Approve/decline/reschedule
Tasks Mark done or reschedule
Opportunities surfaced One-tap follow-up

⸻

🎨 UI DESIGN SYSTEM UPDATES

Core Principles
• Soft gradients like Kinso
• Light glow on avatars/chip backgrounds
• Floating cards & shadows
• Pill-style indicators

📌 New Component List:
• 🟣 Floating cards
• 🟢 AI narration bubbles
• 🔵 Info surfacing pills
• 🟠 Document reference recommendation banners
• ⚪ Pulsing app icons

⸻

⚙️ ENGINEERING REQUIREMENTS

🔁 Caching Layer for Summaries
• Cache ALL message summaries per thread.
• Invalidate only when:
• New message generated
• User manually edits summary (future feature)

⏱ Real-Time AI Status
• WebSockets must broadcast step events
• Frontend subscribes and animates accordingly

🧾 Document Surface Engine (New Service)

Service: ai.ref.contextual_lookup
• NLP classify user request
• Query embeddings + message metadata
• Return nearest matching email/message/file
• Store response with explanation field

⸻

🧪 QA Testing Requirements

✔ UI must animate smoothly under slow internet
✔ Confidence threshold must never auto-send low-risk incorrectly
✔ Always show WHY draft was chosen (expandable)
✔ Fallback gracefully when no document is found
✔ Summaries MUST NOT hallucinate dates/commitments
✔ Ensure GDPR rules apply to displayed context retrieval

⸻

🚀 ROLL-OUT PHASES

Phase 1 (2–3 weeks): UX + Summaries
• Message list AI summaries
• New assistant narrative texts
• Typing + search animations (basic)

Phase 2 (3–5 weeks): Smart Surfacing
• Reference cards + document linking
• Attachment lookup + insert suggestion

Phase 3 (5–7 weeks): Full AI Narration
• Confidence score narration
• Tone explanation
• Real-time reasoning “why this reply”

⸻

🔥 Competitive Differentiators vs Kinso

Feature Aiva Kinso
Auto-Send with Safety ✔ Audit + rollback + whitelist + scoring ❌ (No safety model)
Calendar Intelligence ✔ + Reschedule + conflict mgmt ❌
Task Extraction ✔ Auto tasks ❌
Document Surfacing + Attach ⭐️ Proposed ✔
Live AI Narration ⭐️ Proposed advanced ⚪ Basic

Our upgrade makes Aiva appear more intelligent AND more reliable, not just flashy.
