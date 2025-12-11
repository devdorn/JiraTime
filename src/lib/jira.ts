import type { AppSettings, JiraTicket } from "./types";

const createHeaders = (settings: AppSettings) => {
    const headers: HeadersInit = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${settings.jiraPat}`
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
