# Implementation Plan - JiraTime Extension

## Goal Description
Create a Chrome/Browser Extension to track time on Jira tickets directly from the browser popup. The extension will fetch "In Progress" tickets, allow manual or timer-based time entry, and sync data directly to Jira.

## User Review Required
> [!IMPORTANT]
> **Authentication Method**: We will use **Personal Access Tokens (PAT)** for Jira authentication.

## Proposed Tech Stack
- **Framework**: React (via Vite) - efficiently handles the state for timers and lists.
- **Styling**: Tailwind CSS - for lightweight, modern, "premium" UI.
- **Build Tool**: Vite + @crxjs/vite-plugin (for seamless extension dev).
- **Icons**: Lucide React (clean, modern icons).

## Proposed Changes

### Structure
- `manifest.json`: Manifest V3 configuration.
- `src/manifest.ts`: For generating manifest.
- `src/background`: Service worker to handle running timers when the popup is closed.
- `src/popup`: Main UI (Ticket list, active timer).
- `src/options`: Configuration page (Jira Host, PAT).
- `src/lib/jira.ts`: JIRA API client.
- `src/components`: Reusable UI components (Accordion, Timer, Inputs).

### [Feature] Dark Mode
#### [MODIFY] [types.ts](file:///Users/bdorn/Projects/Playground/Antigravity/JiraTime/src/lib/types.ts)
- Add `theme: 'light' | 'dark' | 'system'` to `AppSettings`

#### [MODIFY] [tailwind.config.js](file:///Users/bdorn/Projects/Playground/Antigravity/JiraTime/tailwind.config.js)
- Enable `darkMode: 'class'`

#### [MODIFY] [App.tsx](file:///Users/bdorn/Projects/Playground/Antigravity/JiraTime/src/App.tsx)
- Add theme application logic (useEffect to toggle `dark` class on html)

#### [MODIFY] [Settings.tsx](file:///Users/bdorn/Projects/Playground/Antigravity/JiraTime/src/components/Settings.tsx)
- Add UI controls for Theme selection

#### [MODIFY] [UI Components]
- Add `dark:` prefix classes to all components (`TicketList`, `TicketItem`, `Input`, `Button`, `App`) for background, text, and border colors.

### [Feature] Easter Eggs
#### [NEW] [utils.ts](file:///Users/bdorn/Projects/Playground/Antigravity/JiraTime/src/lib/utils.ts)
- Add `parseDuration(text: string): number` helper to convert "1h 30m" to seconds.

#### [MODIFY] [TicketItem.tsx](file:///Users/bdorn/Projects/Playground/Antigravity/JiraTime/src/components/TicketItem.tsx)
- Re-implement "Touch Grass" check.
- **Criteria**: > 8 hours (28800 seconds).
- **Scope**: Both Timer Stop and Manual Submit.
- **Behavior**: `alert("Touch Grass")` then proceed to save immediately (non-blocking validation).

#### [MODIFY] [App.tsx](file:///Users/bdorn/Projects/Playground/Antigravity/JiraTime/src/App.tsx)
- No changes (Ludicrous Mode stays).

### [Feature] Manual Ticket Management (Pinned Tickets)
#### [MODIFY] [types.ts](file:///Users/bdorn/Projects/Playground/Antigravity/JiraTime/src/lib/types.ts)
- Add `pinnedTicketKeys: string[]` to `AppSettings`.

#### [MODIFY] [storage.ts](file:///Users/bdorn/Projects/Playground/Antigravity/JiraTime/src/lib/storage.ts)
- Update `getSettings` and `saveSettings` to include `pinnedTicketKeys`.
- Default to `[]`.

#### [MODIFY] [jira.ts](file:///Users/bdorn/Projects/Playground/Antigravity/JiraTime/src/lib/jira.ts)
- Add `fetchTicketsByKeys(settings, keys[])` helper using JQL `key in (A, B, ...)`.

#### [MODIFY] [TicketList.tsx](file:///Users/bdorn/Projects/Playground/Antigravity/JiraTime/src/components/TicketList.tsx)
- Add "Manually Tracked" Section.
- Add Input + Button to add ticket by Key.
- Fetch pinned tickets using `fetchTicketsByKeys`.
- Add "Delete/Unpin" button to `TicketItem` (only if it's a pinned ticket).
- Visually distinguish (maybe a "Pinned" badge or different border).

### [Feature] Issue Type Icons
#### [MODIFY] [types.ts](file:///Users/bdorn/Projects/Playground/Antigravity/JiraTime/src/lib/types.ts)
- Add `issueType: { name: string; iconUrl: string }` to `JiraTicket`.

#### [MODIFY] [jira.ts](file:///Users/bdorn/Projects/Playground/Antigravity/JiraTime/src/lib/jira.ts)
- Request `issuetype` field in `searchTickets`.
- Map response to `JiraTicket.issueType`.
- **Note**: We will use the `name` to map to local Lucide icons for better theming/performance, falling back to a generic icon.

#### [MODIFY] [TicketItem.tsx](file:///Users/bdorn/Projects/Playground/Antigravity/JiraTime/src/components/TicketItem.tsx)
- Create a helper `IssueIcon({ type })` component.
- Map:
    -   `Bug` -> `Bug` (Red)
    -   `Task` -> `CheckSquare` (Blue)
    -   `Story` -> `Bookmark` (Green)
    -   `Epic` -> `Zap` (Purple)
    -   `Sub-task` -> `GitCommit` (Gray)
- Display icon next to the ticket key.

- Display icon next to the ticket key.

### [Feature] Customizable JQL Filters
#### [MODIFY] [types.ts](file:///Users/bdorn/Projects/Playground/Antigravity/JiraTime/src/lib/types.ts)
- Add `filterStatuses: string[]` (or string csv) to `AppSettings`.
- Add `filterIssueTypes: string[]` (or string csv) to `AppSettings`.

#### [MODIFY] [jira.ts](file:///Users/bdorn/Projects/Playground/Antigravity/JiraTime/src/lib/jira.ts)
- Update `fetchInProgressTickets` (rename to `fetchMyTickets`?).
- **Logic**:
    -   Base: `assignee = currentUser()`
    -   **Types**: If `filterIssueTypes` is set, add `AND issuetype in (...)`.
    -   **Status**: If `filterStatuses` is set, add `AND status in (...)`.
    -   **Default**: If `filterStatuses` is empty, use `AND status not in (Done, Cancelled, Closed)`.

#### [MODIFY] [Settings.tsx](file:///Users/bdorn/Projects/Playground/Antigravity/JiraTime/src/components/Settings.tsx)
- Add TextInputs for "Statuses to Include (comma separated)" and "Issue Types to Include".
- Explain the "Default behavior" if left empty.

### [Feature] About Page
#### [MODIFY] [App.tsx](file:///Users/bdorn/Projects/Playground/Antigravity/JiraTime/src/App.tsx)
- Add `About` view state.
- Add "About" button in the header (maybe a `HelpCircle` icon?).
- Render a simple styled section with:
    -   Logo
    -   Version (import from package.json if possible, or manual const).
    -   "Created by Bernhard Dorn"
    -   "© 2025"

    -   "Created by Bernhard Dorn"
    -   "© 2025"

### [Refinement] Manifest
#### [MODIFY] [manifest.json](file:///Users/bdorn/Projects/Playground/Antigravity/JiraTime/public/manifest.json)
- Add `"description": "Simple Jira Time Tracking for Developers"`
- Add `"author": "Bernhard Dorn"`

- Add `"description": "Simple Jira Time Tracking for Developers"`
- Add `"author": "Bernhard Dorn"`

### [Documentation] License & Readme
#### [NEW] [LICENSE](file:///Users/bdorn/Projects/Playground/Antigravity/JiraTime/LICENSE)
- MIT License (Standard open source).

#### [MODIFY] [README.md](file:///Users/bdorn/Projects/Playground/Antigravity/JiraTime/README.md)
- Replace content with:
    -   **Project Description**: The "Serious" adapted text.
    -   **Features**: Bullet points.
    -   **Development**: `npm install`, `npm run dev`, `npm run build`.
    -   **Installation**: `chrome://extensions` -> Load Unpacked -> `dist`.

## Verification Plan

### Automated Tests
- Unit tests for the time format parser (e.g. `2w 4d` -> seconds).

### Manual Verification
- **Setup**: Configure with a real Jira URL and PAT.
- **Ticket List**: Verify "In Progress" tickets appear.
- **Timer**: Start a timer, close popup, reopen popup -> Timer should still be running (persisted in storage/background).
- **Submission**: Stop timer -> Save -> Verify worklog appears in Jira.
