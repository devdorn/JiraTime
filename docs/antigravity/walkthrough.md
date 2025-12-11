# JiraTime Extension - Walkthrough (v1.2.2)

## Overview
JiraTime is a browser extension that allows you to track time on Jira tickets directly from your browser toolbar. It supports both manual time entry and a live timer, with customizable filters and a beautiful theme-aware UI.

## Installation
1.  Navigate to `chrome://extensions/` in your browser.
2.  Enable **Developer mode** (top right).
3.  Click **Load unpacked**.
4.  Select the `dist` folder in the project directory:
    `/Users/bdorn/Projects/Playground/Antigravity/JiraTime/dist`

## Configuration
1.  Click the **JiraTime** icon in the toolbar.
2.  Click the **Settings** (Gear) icon.
3.  **Jira Host URL**: Your instance URL (e.g. `https://your-company.atlassian.net`).
4.  **Token**: Your Personal Access Token (PAT) or Cloud API Token.
5.  **Theme**: Choose Light, Dark, or System Sync.
6.  **Filters**:
    -   **Status**: Comma-separated list (e.g. `In Progress, Review`). Default: Hides "To Do", "Done", "Cancelled".
    -   **Issue Type**: Comma-separated list (e.g. `Bug, Task`). Default: Shows all.

## User Guide

### 1. The Ticket List
-   **My Tickets**: Automatically fetches tickets assigned to you based on your filters.
-   **Pinned Tickets**: Manually add any ticket by ID (e.g. `PROJ-123`) using the input at the top. Pinned tickets stay at the top until you unpin them (Trash icon).
-   **Visuals**:
    -   **Icons**: Mouse over the issue type icon (🐞, ⚡, ✅) to see the type name.
    -   **Status**: Colored dots indicate status (Gray=New, Amber=Active, Green=Done). Hover for details.

### 2. Tracking Time
Click on any ticket card to expand the actions:
-   **Timer**:
    -   Click **Play** (▶️) to start.
    -   A badge "ON" appears on the extension icon.
    -   Click **Stop** (⏹️) to save time to Jira.
    -   *Ludicrous Mode*: Click the logo 5 times if you're feeling adventurous! 🌀
-   **Manual**:
    -   Enter `1h 30m` and click **Log**.

### 3. About
-   Click the **?** icon in the header to view version info and credits.

## Verification
-   **Filters**: Verify that changing "Status Filters" in settings updates the list immediately.
-   **Pins**: Verify specific tickets can be pinned and unpinned.
-   **Tooltips**: Verify hovering over icons and status dots shows the correct labels.
