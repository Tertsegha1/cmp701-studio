# CMP701 Digital Transformation Studio

Automated studio management system for the CMP701 Digital Transformation module at Ulster University QAHE, delivered across London, Birmingham, and Manchester campuses.

**Live app:** https://tertsegha1.github.io/cmp701-studio/

**Creator & Module Leader:** Dr Tertsegha Anande · Ulster University QAHE

---

## Overview

A single-page web application that manages the full lifecycle of the Digital Transformation Studio — from cohort setup and guild formation through to weekly quest publishing, artefact submission, peer review, formative AI feedback, and semester-end coordination. All data syncs live via Firebase Realtime Database; no installation, no login accounts, no manual saving.

The system supports three access roles and scales across multiple semesters through its cohort management feature.

> **Scope:** This system is for studio management and formative feedback only. Formal CW1 and CW2 marking is done in the separate [CMP701 Grading System](https://github.com/Tertsegha1/cmp701-grading-system). Do not use this system to record or award formal grades.

---

## Access Roles

| Role | Who | Access |
|---|---|---|
| **Module Leader** | Dr Tertsegha Anande | Full admin access — all tabs including cohort management, teaching team, configuration, and AI key setup. Protected by an admin code - DSTcmp701. |
| **Lecturer** | Seminar leaders, visiting tutors | Operational access — dashboard, submissions, formative artefact feedback, peer review, announcements, timeline. Must select their name from the Teaching Team list before proceeding. No config or admin access. |
| **Student** | Enrolled students | Student portal — quest brief, guild info, artefact submission, peer review, formative AI feedback, progress tracker |

### URLs

| Role | URL |
|---|---|
| Module Leader | `https://tertsegha1.github.io/cmp701-studio/` |
| Lecturer | `https://tertsegha1.github.io/cmp701-studio/?role=lecturer` |
| Student | `https://tertsegha1.github.io/cmp701-studio/?role=student` |

For a specific cohort, append `&cohort=<cohort-id>` to the Lecturer or Student URL. The **Copy Lecturer Link** button on each cohort card generates the correct URL automatically.

### Module Leader Admin Code

The Module Leader view is protected by an admin code. Set it once in **Blackboard Setup → Module Configuration → Leader Admin Code**. Anyone opening the app without the code is locked to Lecturer or Student view. The code is stored in Firebase (cohort config) — not in the URL.

If no code is set, the Module Leader view is accessible without a gate (useful during initial setup before sharing the app).

### Teaching Team

The Teaching Team is the list of lecturers and seminar leaders who can access the Lecturer view each semester. It is managed globally (not per-cohort) in **Blackboard Setup → Teaching Team**.

When a lecturer opens the app at the Lecturer URL, they are shown an identity screen and must select their name before proceeding. Their selection is remembered in the browser for the session. A **⇄ switch** button in the header lets them change identity at any time.

**At the start of each new semester:** go to **Blackboard Setup → Teaching Team → 🗑 Clear All (New Semester)** and add the new team. Existing lecturer sessions will be prompted to re-identify.

---

## Features

### Cohort Management
Each semester/intake is a fully isolated **cohort** with its own students, guilds, quests, submissions, peer reviews, announcements, and deadlines. Cohorts are created in the **Cohorts** tab. Switching cohorts in the header dropdown hot-swaps all Firebase subscriptions instantly — historical data from previous semesters is preserved and browsable.

Each cohort stores:
- Name, academic year, semester
- Semester start date and current week
- CW1 submission and marking deadlines
- CW2 submission and marking deadlines
- Campus list

The **default** cohort (`studio/` in Firebase) holds the 2025–26 Semester 2 data for backward compatibility. New cohorts are stored at `studio/c_{id}/`.

### Guild Manager
- Create guilds per campus; assign students manually, via CSV import, or using **Auto-assign**
- Five rotating weekly roles: **Facilitator, Analyst, Strategist, Innovator, Reporter**
- **Rotate Roles** button advances all assignments by one position each week
- Guild working contract stored and visible to students

### Quest Manager
- Create and publish weekly studio quest briefs
- **Seed 12 Default Quests** loads the full set of pre-written quest briefs aligned to the actual CMP701 module guide:

  | Week | Quest |
  |---|---|
  | 1 | Business Snapshot — Know Your Organisation |
  | 2 | Data-Driven — Using Analytics to Justify Transformation |
  | 3 | Industry Intelligence — PESTLE & Porter's Five Forces |
  | 4 | AS-IS to TO-BE — Mapping Organisational Impact |
  | 5 | Transformation Strategy — Roadmap, Technologies & KPIs |
  | 6 | CW1 — Individual Video Presentation |
  | 7 | Business Model Redesign — How Digital Changes the Game |
  | 8 | Strategy Alignment — Linking Business & Digital Transformation |
  | 9 | Predictive Analytics — Forecasting with RapidMiner |
  | 10 | Strategy Convergence — Mind Mapping Your Transformation Plan |
  | 11 | Innovation & Knowledge Management — The Human Side of Transformation |
  | 12 | Power BI Dashboard — Final Artefact & CW2 Review |

- **AI-Generate Quest** uses Claude to write a fresh quest brief for any week
- Quests have Draft / Published status; students only see published quests

### Submission Tracker
- Students submit artefact title, link (OneDrive, Google Drive, etc.), description, and reflection
- Module leader and lecturers see all submissions filterable by week, guild, status, and student name
- Submitted rows show a **Grade** button; once feedback is saved the row shows **Graded** in teal
- AI feedback is stored on the submission record and shown to the student in their My Progress timeline
- Export all submissions to CSV at any time

> **Important:** The Grade panel is for formative feedback on weekly studio artefacts only. CW1 and CW2 formal marking is done in the [CMP701 Grading System](https://github.com/Tertsegha1/cmp701-grading-system) — do not use this panel to record formal grades.

### Inline Artefact Feedback (Submissions tab)
Lecturers can give AI-assisted formative feedback on any artefact without leaving the Submissions tab:

1. Click **Grade** on a submission row
2. A panel opens showing the student's artefact title, link, description, and reflection — pre-filled
3. Confirm or edit the student's business name
4. Click **Generate AI Feedback** — Claude returns structured developmental feedback including an AI writing estimate
5. Review the output and click **Save Feedback** — stored to Firebase on that submission record
6. Student sees the feedback in their **My Progress** tab

### Peer Review
- Module leader creates weekly review rounds with one click — guilds are auto-assigned to review each other using a rotation offset (so no guild reviews the same guild twice)
- Students submit structured peer feedback (strengths, improvements, rating out of 5) from the Peer Review tab
- Leader sees all review submissions in the Peer Review table

### Formative Feedback tab (Module Leader and Lecturer)
A standalone tool for generating AI formative feedback on weekly studio artefacts. Paste any student's artefact description and Claude returns structured feedback including strengths, areas for improvement, and an AI writing estimate.

This tab is for **weekly artefact feedback only**. CW1 and CW2 formal marking is done in the [CMP701 Grading System](https://github.com/Tertsegha1/cmp701-grading-system). The CW assessment criteria tables shown in this tab are for reference only — they guide the feedback prompt but do not produce a formal grade.

### Student AI Feedback tab
Students can paste their own draft work at any time and receive immediate formative AI feedback aligned to the module criteria:

- **Weekly artefact** — feedback on in-progress studio work before submission
- **CW1 draft** — formative feedback on a video script or presentation plan
- **CW2 draft** — formative feedback on a written report draft

Every feedback response includes an **AI Writing Estimate**:

```
Estimated AI-generated content: 38%
Signals observed: Formulaic transitions, lacks named examples specific to
  Tesco, sentence structure is uniform throughout
Advice: Add a specific statistic from your own research; rewrite the
  opening paragraph in your own voice before submitting
```

This gives students a developmental signal — how much of their work reads as AI-generated, what patterns were detected, and a concrete tip for making the writing more authentically theirs before submission.

> **On Turnitin / plagiarism:** Submitting drafts here has **zero impact** on Turnitin similarity scores. This system stores text in Firebase — a private database with no connection to Turnitin or any plagiarism detection service. Turnitin only indexes submissions made directly through its own tool on Blackboard. Students can freely use this tool to improve their drafts without any risk to their Turnitin report.

### Announcements
- Module leader or lecturer posts notices categorised as: ℹ Info · ⚠ Important · ✓ Good news · 🔴 Urgent
- Pinned announcements appear as a banner on the student quest page
- Students see the full announcement feed in their Timeline tab

### Timeline
- Countdown cards to CW1 submission, CW1 marking, CW2 submission, and CW2 marking deadlines (all per-cohort)
- 12-week topic grid with the current week highlighted
- Quest publication status shown on each week tile
- Identical view available to students in their Timeline tab

---

## For the Module Leader

### First-Time Setup (new semester)

1. Go to the **Cohorts** tab → **+ New Cohort**
2. Fill in: cohort name, academic year, semester, semester start date, all four deadlines, and campus list
3. The new cohort appears in the header dropdown — select it
4. Go to **Blackboard Setup → AI Configuration** and enter your Anthropic API key once — it is saved to your browser and used silently by all AI features
5. Go to **Blackboard Setup → Module Configuration** and set a **Leader Admin Code** to protect the Module Leader view
6. Go to **Blackboard Setup → Teaching Team** → add all lecturers and seminar leaders for this semester (name, campus, role). If returning from a previous semester, click **🗑 Clear All (New Semester)** first
7. Go to **Students** → **↑ Import Students CSV**
   - Required columns: `Name, Campus, Guild, Business`
   - Guilds are auto-created from the CSV; students are assigned automatically
8. Go to **Quest Manager** → **📚 Seed 12 Default Quests** → then publish Week 1
9. Go to **Peer Review** → **+ New Review Round** to set up Week 1 guild pairings
10. Post a welcome announcement in the **Announcements** tab
11. Share the student URL in a Blackboard announcement (see Blackboard Integration below)

### Weekly Workflow

| Step | Where | Notes |
|---|---|---|
| Advance week number | Blackboard Setup → Module Configuration | Updates the week badge and Timeline |
| Publish next quest | Quest Manager → Publish | Students see it immediately |
| Create peer review round | Peer Review → + New Review Round | Auto-assigns guilds with rotation |
| Monitor submissions | Submissions tab | Filter by guild or week |
| Give artefact feedback | Submissions tab → Grade button | AI formative feedback; saved to student record |
| Post announcements | Announcements tab | Pin for high-visibility notices |
| Share Lecturer link | Cohorts tab → Copy Lecturer Link | Per-cohort URL for seminar leaders |

### Key Dates — 2025–26 Cohort

| | CW1 — Video Presentation (25%) | CW2 — Written Report (75%) |
|---|---|---|
| Submission deadline | 13 March 2026 | 6 May 2026 |
| Marking deadline | 27 March 2026 | 20 May 2026 |

---

## For Lecturers / Tutors

Lecturers receive a per-cohort URL from the Module Leader (generated via **Cohorts → Copy Lecturer Link**). Opening it sets Lecturer View automatically.

**Lecturer URL:** `https://tertsegha1.github.io/cmp701-studio/?role=lecturer`
For a specific cohort: `https://tertsegha1.github.io/cmp701-studio/?role=lecturer&cohort=<cohort-id>`

> Lecturers do **not** mark CW1 or CW2 in this system. Formal marking is done in the [CMP701 Grading System](https://github.com/Tertsegha1/cmp701-grading-system). The Studio is used for weekly artefact feedback and studio management only.

### What Lecturers Can Do

| Tab | Capability |
|---|---|
| **Dashboard** | See KPIs: guild count, submission progress, pending artefacts |
| **Submissions** | View all submissions; filter by guild/week/status; give AI formative feedback on artefacts |
| **Peer Review** | View all peer review submissions for the cohort |
| **Formative Feedback** | Standalone AI feedback tool for weekly studio artefacts |
| **Announcements** | Post notices to all students in the cohort |
| **Timeline** | View semester schedule and all deadlines |

Lecturers cannot: manage cohorts, import/delete students, configure the module, manage guilds, or access the Blackboard Setup tab.

### Typical Lecturer Workflow (per week)

1. Open the Lecturer link for your cohort (sent by the Module Leader)
2. Go to **Submissions** — filter by your campus or assigned guilds
3. For each submission, click **Grade** → review the artefact content → click **Generate AI Feedback** → save
4. Post any relevant announcement (e.g. "Week 5 feedback returned — check My Progress")
5. Check **Peer Review** to see if all guilds have submitted their cross-reviews

---

## For Students

1. Open the student link (shared by the module leader or embedded in Blackboard)
2. Select your name from the yellow bar at the top — your submissions and guild are stored under your name
3. Use the tabs:

| Tab | What it does |
|---|---|
| **This Week's Quest** | Current quest brief and deliverables; pinned announcements shown here |
| **My Guild** | Your guild name, your role this week, all members and their submission status |
| **Submit Artefact** | Submit title, link (OneDrive/Drive/etc.), description, and reflection |
| **Peer Review** | See which guild you're reviewing; submit structured feedback |
| **AI Feedback** | Paste a CW1 draft, CW2 draft, or weekly artefact for formative AI feedback including an AI writing estimate |
| **My Progress** | Full submission timeline; saved lecturer feedback shown per week |
| **Timeline** | All key deadlines and module schedule; latest announcements |

---

## Blackboard Integration

Blackboard Learn supports external web links without requiring IT/LTI setup.

### Recommended: Web Link in Content Area

1. In your Blackboard module, go to **Build Content → Web Link**
2. Name: *Digital Transformation Studio*
3. URL: `https://tertsegha1.github.io/cmp701-studio/?role=student`
4. Tick **Open in New Window**
5. Set availability → Submit

### Embedded iFrame — NOT RECOMMENDED

Some Blackboard instances block external iframes, which causes the Studio to fail silently. Use the Web Link method above instead. If you must use an iframe:

```html
<iframe
  src="https://tertsegha1.github.io/cmp701-studio/?role=student"
  width="100%"
  height="800"
  frameborder="0"
  style="border-radius:8px;border:none">
</iframe>
```

### Guild Workspace on Blackboard

The Blackboard Guild Workspace is not required once this system is live. The **Submit Artefact** tab replaces it — students submit links to their work (OneDrive, Google Drive, SharePoint) which the system tracks with timestamps and lecturer feedback. For formal CW1/CW2 Turnitin submissions, students continue to use Blackboard's standard assignment submission tool as normal.

---

## Technical Architecture

### Stack
- **Frontend:** Vanilla HTML/CSS/JavaScript — no framework, no build step, no npm
- **Database:** Firebase Realtime Database (`cmp701markingtracker` project)
- **Hosting:** GitHub Pages, auto-deploys from `master` branch on push
- **AI:** Anthropic Claude API (`claude-sonnet-4-6`), called directly from the browser

### Firebase Data Structure

```
studio/                          ← default cohort (2025–26 S2)
  guilds/{guildId}
  students/{studentId}
  quests/week-{n}
  submissions/{studentId}/week-{n}
    title, link, description, reflection, submittedAt, status
    aiFeedback                   ← saved by lecturer; shown in student My Progress
  peerReviews/week-{n}/{guildId}
  announcements/{id}
  config

studio/__cohorts/{cohortId}      ← cohort metadata registry
  name, year, semester
  semesterStart, currentWeek
  cw1Sub, cw1Mark, cw2Sub, cw2Mark
  campuses[]

studio/c_{cohortId}/             ← per-cohort data (same structure as default)
  guilds / students / quests / submissions / peerReviews / announcements / config
```

### API Key Setup
The Module Leader enters the Anthropic API key once in **Blackboard Setup → AI Configuration**. It is stored in `localStorage` only — never written to Firebase or transmitted anywhere other than the Anthropic API. Lecturers and students do not need to enter or know the key; all AI features use it silently.

### Offline Behaviour
Data is cached in `localStorage` so the app loads instantly without a network connection. Changes made offline will not sync until reconnected — a `● Offline` badge appears in the header.

---

## Updating the App

```powershell
cd C:\Users\terts\cmp701-studio
git add index.html README.md
git commit -m "describe your change"
git push
```

GitHub Pages redeploys within ~1 minute of a push to `master`.

---

## Repository

**GitHub:** https://github.com/Tertsegha1/cmp701-studio  
**Live app:** https://tertsegha1.github.io/cmp701-studio/

*Creator & Module Leader: Dr Tertsegha Anande · Ulster University QAHE*
