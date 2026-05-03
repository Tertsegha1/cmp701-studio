# CMP701 Digital Transformation Studio

Automated studio management system for the CMP701 Digital Transformation module at Ulster University QAHE (London, Birmingham, Manchester campuses).

**Live app:** https://tertsegha1.github.io/cmp701-studio/

---

## What This Does

A single-page web app that automates the full lifecycle of the Digital Transformation Studio — from guild setup and weekly quest publishing through to submission tracking, peer review, and AI-powered assessment feedback. All data syncs live via Firebase.

---

## Features

| Feature | Description |
|---|---|
| **Guild Manager** | Create guilds per campus, assign students, auto-rotate weekly roles (Facilitator, Analyst, Strategist, Innovator, Reporter) |
| **Quest Manager** | Publish weekly studio quest briefs; 12 default quests pre-built from the actual seminar topics; AI-generate custom quests |
| **Submission Tracker** | Students submit weekly artefact links and reflections; leader sees all submissions by guild, week, or status |
| **Peer Review** | Auto-assign cross-guild review pairs each week with rotation logic; students submit structured feedback |
| **AI Assessment** | Claude-powered assessment tool aligned to the official CW1 and CW2 rubrics; also supports weekly artefact feedback |
| **Announcements** | Module leader posts notices (info / important / urgent / good news); pinned announcements appear on the student quest page |
| **Timeline** | Visual semester schedule with countdown to CW1 and CW2 deadlines; week-by-week topic grid |
| **Blackboard Setup** | Step-by-step embed guide with copy-ready iframe code and direct student URL |
| **CSV Import / Export** | Upload a student roster CSV; export submissions or student lists at any time |

---

## For Students

1. Open the [Studio link](https://tertsegha1.github.io/cmp701-studio/?role=student) (share this or embed in Blackboard)
2. Select your name from the yellow bar at the top
3. Use the tabs to:
   - **This Week's Quest** — read the brief and deliverables
   - **My Guild** — see your team members and your role this week
   - **Submit Artefact** — submit your weekly artefact link and reflection
   - **Peer Review** — review another guild's work
   - **AI Feedback** — get formative AI feedback on your draft CW1 or CW2
   - **My Progress** — track your submission history
   - **Timeline** — see all key deadlines and announcements

---

## For the Module Leader

### First-Time Setup

1. Open the app (defaults to Leader View)
2. Go to **Blackboard Setup → Module Configuration** and set the current week and semester start date
3. Go to **Students → Import Students CSV** and upload your student roster
   - Required columns: `Name, Campus, Guild, Business`
4. Go to **Guilds** — guilds are auto-created from the CSV import; use **Auto-assign Roles** if needed
5. Go to **Quest Manager → Seed 12 Default Quests** to load all 12 pre-built quest briefs
6. Publish the current week's quest (click **Publish** on the quest card)
7. Post a welcome announcement in the **Announcements** tab

### Weekly Workflow

| Step | Where |
|---|---|
| Advance the week number | Blackboard Setup → Module Configuration |
| Publish next week's quest | Quest Manager → click Publish |
| Create peer review pairs | Peer Review → New Review Round |
| Monitor submissions | Submissions tab |
| Post announcements | Announcements tab |
| Run AI assessment | AI Assessment tab |

### Key Dates — 2025–26 Cohort

| | CW1 — Video Presentation (25%) | CW2 — Written Report (75%) |
|---|---|---|
| Submission deadline | 13 March 2026 | 6 May 2026 |
| Marking deadline | 27 March 2026 | 20 May 2026 |

---

## Blackboard Integration

### Option 1 — Web Link (recommended)
In Blackboard: **Build Content → Web Link**
- URL: `https://tertsegha1.github.io/cmp701-studio/?role=student`
- Check "Open in New Window"

### Option 2 — Embedded iFrame
In a Blackboard Item, switch to HTML source and paste:

```html
<iframe
  src="https://tertsegha1.github.io/cmp701-studio/?role=student"
  width="100%" height="800" frameborder="0"
  style="border-radius:8px;border:none">
</iframe>
```

The `?role=student` parameter automatically opens the student view. Without it, the app defaults to Leader View.

---

## AI Assessment

The AI Assessment tab uses the Anthropic Claude API to generate structured feedback aligned to the official rubrics:

- **CW1 (25%)** — scored against 5 criteria (Content Understanding 25pt, Clarity 20pt, Structure 20pt, Visual Aids 20pt, Delivery 15pt)
- **CW2 (75%)** — scored against 6 criteria (Introduction 15pt, Critical Analysis 20pt, DT Strategy 20pt, Documentation 15pt, Evidence 15pt, Artefacts 15pt)
- **Weekly Artefact** — formative feedback on studio work

Enter your Anthropic API key in the AI Assessment tab. It is stored locally in your browser only.

---

## Technical Notes

- **Stack:** Vanilla HTML/CSS/JS — no build step, no dependencies beyond Firebase
- **Sync:** Firebase Realtime Database (`cmp701markingtracker` project), path prefix `studio/`
- **Hosting:** GitHub Pages, auto-deployed from the `master` branch
- **Offline:** Data cached in `localStorage`; changes made offline will not sync until reconnected

### Updating the App

```powershell
cd C:\Users\terts\cmp701-studio
git add index.html README.md
git commit -m "your change description"
git push
```

GitHub Pages redeploys within ~1 minute.

---

*Module Leader: Dr. Tertsegha Anande · Ulster University QAHE*
