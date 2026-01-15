import type { AppSettings, JiraTicket } from "./types";

const createHeaders = (settings: AppSettings) => {
    // Jira Cloud requires Basic Auth with email:token
    // Jira Server/DC uses Bearer token (PAT)
    const auth = settings.jiraEmail
        ? `Basic ${btoa(`${settings.jiraEmail}:${settings.jiraPat}`)}`
        : `Bearer ${settings.jiraPat}`;

    const headers: HeadersInit = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": auth
    };
    return headers;
};

export const validateConnection = async (settings: AppSettings): Promise<boolean> => {
    try {
        const response = await fetch(`${settings.jiraHost}/rest/api/3/myself`, {
            headers: createHeaders(settings),
        });
        return response.ok;
    } catch (error) {
        console.error("Connection validation failed:", error);
        return false;
    }
};

interface JiraSearchResponse {
    issues: Array<{
        id: string;
        key: string;
        fields: {
            summary: string;
            timespent: number; // Seconds
            issuetype: {
                name: string;
                iconUrl: string;
            };
            status: {
                name: string;
                statusCategory: {
                    key: string; // "new", "indeterminate", "done"
                    colorName: string;
                };
            };
        };
    }>;
}

export const fetchInProgressTickets = async (settings: AppSettings): Promise<JiraTicket[]> => {
    let jql = "assignee = currentUser()";

    // Status Filter
    if (settings.filterStatuses && settings.filterStatuses.trim().length > 0) {
        // Custom statuses
        const statuses = settings.filterStatuses.split(",").map(s => `"${s.trim()}"`).join(", ");
        jql += ` AND status in (${statuses})`;
    } else {
        // Default: Hide Done, Cancelled, and To Do (Show only active work)
        jql += " AND status not in ('Done', 'Canceled', 'Cancelled', 'Closed', 'To Do', 'New', 'Open')";
    }

    // Issue Type Filter
    if (settings.filterIssueTypes && settings.filterIssueTypes.trim().length > 0) {
        const types = settings.filterIssueTypes.split(",").map(t => `"${t.trim()}"`).join(", ");
        jql += ` AND issuetype in (${types})`;
    }

    jql += " ORDER BY updated DESC";
    return searchTickets(settings, jql);
};

export const fetchDoneTickets = async (settings: AppSettings): Promise<JiraTicket[]> => {
    // Configurable duration? For now last 7 days to avoid fetching 1000s
    const jql = "status = 'Done' AND assignee = currentUser() AND updated >= -7d ORDER BY updated DESC";
    return searchTickets(settings, jql);
};

export const fetchTicketsByKeys = async (settings: AppSettings, keys: string[]): Promise<JiraTicket[]> => {
    if (keys.length === 0) return [];
    // Join keys for JQL: key in (A, B, C)
    const jql = `key in (${keys.join(",")})`;
    return searchTickets(settings, jql);
};

// Helper to map Jira Status Category to Tailwind friendly colors
// Jira categories: "new" (gray), "indeterminate" (blue/amber), "done" (green)
const getStatusColor = (categoryKey: string): string => {
    switch (categoryKey) {
        case "new": return "bg-slate-400"; // To Do (Slate for subtle)
        case "indeterminate": return "bg-amber-500"; // In Progress (Amber for activity)
        case "done": return "bg-green-500"; // Done
        default: return "bg-slate-400";
    }
};

const searchTickets = async (settings: AppSettings, jql: string): Promise<JiraTicket[]> => {
    // API v3 Search JQL Endpoint (POST required)
    const response = await fetch(`${settings.jiraHost}/rest/api/3/search/jql`, {
        method: "POST",
        headers: createHeaders(settings),
        body: JSON.stringify({
            jql: jql,
            fields: ["summary", "timespent", "issuetype", "status"],
            maxResults: 50 // Semantic limit
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jira API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: JiraSearchResponse = await response.json();

    return data.issues.map((issue) => ({
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        timeSpentSeconds: issue.fields.timespent || 0,
        issueType: {
            name: issue.fields.issuetype?.name || "Unknown",
            iconUrl: issue.fields.issuetype?.iconUrl || ""
        },
        status: {
            name: issue.fields.status?.name || "Unknown",
            categoryColor: getStatusColor(issue.fields.status?.statusCategory?.key || "")
        }
    }));
};

export const addWorklog = async (
    settings: AppSettings,
    ticketId: string,
    timeSpent: string | number,
    comment?: string
): Promise<void> => {
    // timeSpent can be "2h" (string) or 120 (seconds)
    // The API allows "timeSpent" or "timeSpentSeconds" in the body.

    const body: any = {};

    if (comment) {
        body.comment = {
            type: "doc",
            version: 1,
            content: [
                {
                    type: "paragraph",
                    content: [
                        {
                            type: "text",
                            text: comment
                        }
                    ]
                }
            ]
        };
    }

    if (typeof timeSpent === 'number') {
        body.timeSpentSeconds = timeSpent;
    } else {
        body.timeSpent = timeSpent;
    }

    const response = await fetch(`${settings.jiraHost}/rest/api/3/issue/${ticketId}/worklog`, {
        method: "POST",
        headers: createHeaders(settings),
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to log time: ${response.status} ${response.statusText} - ${errorText}`);
    }
};

export const fetchTodaysTime = async (settings: AppSettings): Promise<number> => {
    try {
        console.log('[fetchTodaysTime] Starting...');
        // 1. Get current user's account ID
        const myselfResponse = await fetch(`${settings.jiraHost}/rest/api/3/myself`, {
            headers: createHeaders(settings),
        });
        if (!myselfResponse.ok) {
            console.warn('[fetchTodaysTime] Failed to get user info');
            return 0;
        }
        const myself = await myselfResponse.json();
        const accountId = myself.accountId;
        console.log('[fetchTodaysTime] Account ID:', accountId);

        // 2. Find recently updated issues
        // worklogDate/worklogAuthor JQL fields return HTTP 410 (deprecated/removed)
        // Search broadly (30 days, no assignee filter) and filter worklogs client-side
        // This catches all tickets user worked on, regardless of assignment/status
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD in UTC
        console.log('[fetchTodaysTime] Today (UTC):', today);

        const searchResponse = await fetch(`${settings.jiraHost}/rest/api/3/search/jql`, {
            method: "POST",
            headers: createHeaders(settings),
            body: JSON.stringify({
                jql: `updated >= -30d ORDER BY updated DESC`,
                fields: ["key"],
                maxResults: 300
            })
        });

        if (!searchResponse.ok) {
            console.warn('[fetchTodaysTime] Search failed');
            return 0;
        }
        const searchData = await searchResponse.json();
        const issueKeys = searchData.issues.map((i: any) => i.key);
        console.log('[fetchTodaysTime] Issues with worklogs today:', issueKeys);

        if (issueKeys.length === 0) {
            console.log('[fetchTodaysTime] No issues found');
            return 0;
        }

        // 3. Fetch worklogs for each issue and sum up today's entries
        // today is already declared above
        let totalSeconds = 0;

        // Fetch worklogs in parallel
        const worklogPromises = issueKeys.map(async (key: string) => {
            const wlResponse = await fetch(`${settings.jiraHost}/rest/api/3/issue/${key}/worklog`, {
                headers: createHeaders(settings),
            });
            if (!wlResponse.ok) return [];
            const wlData = await wlResponse.json();
            return wlData.worklogs || [];
        });

        const allWorklogsResults = await Promise.all(worklogPromises);

        // Get today's date in local timezone (not UTC) for accurate date matching
        const now = new Date();
        const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        console.log('[fetchTodaysTime] Comparing with local date:', todayLocal, '(UTC was:', today, ')');

        for (const worklogs of allWorklogsResults) {
            for (const wl of worklogs) {
                const isMine = wl.author.accountId === accountId;
                // Extract just the date part from "2026-01-14T08:00.000+0100" -> "2026-01-14"
                const worklogDate = wl.started.split('T')[0];
                const isToday = worklogDate === todayLocal;
                console.log('[fetchTodaysTime] Worklog:', {
                    started: wl.started,
                    worklogDate,
                    isMine,
                    isToday,
                    seconds: wl.timeSpentSeconds
                });
                if (isMine && isToday) {
                    totalSeconds += wl.timeSpentSeconds;
                }
            }
        }

        console.log('[fetchTodaysTime] Total seconds:', totalSeconds);
        return totalSeconds;
    } catch (error) {
        console.error("Failed to fetch today's time:", error);
        return 0;
    }
};

export const checkWorklogPermission = async (settings: AppSettings, ticketKey: string): Promise<boolean> => {
    try {
        const response = await fetch(`${settings.jiraHost}/rest/api/3/mypermissions?issueKey=${ticketKey}&permissions=WORK_ON_ISSUES`, {
            headers: createHeaders(settings),
        });

        if (!response.ok) {
            console.error(`Permission check failed for ${ticketKey}:`, response.status, response.statusText);
            return false;
        }

        const data = await response.json();
        const hasPermission = data.permissions?.WORK_ON_ISSUES?.havePermission === true;
        console.log(`Permission check for ${ticketKey}:`, hasPermission);
        return hasPermission;
    } catch (error) {
        console.error("Permission check error:", error);
        return false;
    }
};
