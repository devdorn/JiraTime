import type { AppSettings, JiraTicket } from "./types";

const createHeaders = (settings: AppSettings) => {
    const headers: HeadersInit = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    };

    if (settings.jiraEmail) {
        // Cloud: Basic Auth
        const auth = btoa(`${settings.jiraEmail}:${settings.jiraPat}`);
        headers["Authorization"] = `Basic ${auth}`;
    } else {
        // DC: Bearer Token
        headers["Authorization"] = `Bearer ${settings.jiraPat}`;
    }

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
        };
    }>;
}

export const fetchInProgressTickets = async (settings: AppSettings): Promise<JiraTicket[]> => {
    const jql = "status = 'In Progress' AND assignee = currentUser() ORDER BY updated DESC";
    return searchTickets(settings, jql);
};

export const fetchDoneTickets = async (settings: AppSettings): Promise<JiraTicket[]> => {
    // Configurable duration? For now last 7 days to avoid fetching 1000s
    const jql = "status = 'Done' AND assignee = currentUser() AND updated >= -7d ORDER BY updated DESC";
    return searchTickets(settings, jql);
};

const searchTickets = async (settings: AppSettings, jql: string): Promise<JiraTicket[]> => {
    // API v3 Search JQL Endpoint (POST required)
    const response = await fetch(`${settings.jiraHost}/rest/api/3/search/jql`, {
        method: "POST",
        headers: createHeaders(settings),
        body: JSON.stringify({
            jql: jql,
            fields: ["summary", "timespent"],
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
