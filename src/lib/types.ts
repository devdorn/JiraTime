export interface AppSettings {
    jiraHost: string;
    jiraEmail: string;
    jiraPat: string;
    theme: 'light' | 'dark' | 'system';
    pinnedTicketKeys: string[];
    filterStatuses?: string; // Comma separated
    filterIssueTypes?: string; // Comma separated
}

export interface JiraTicket {
    id: string; // The internal ID (e.g. 10001)
    key: string; // The key (e.g. PROJ-123)
    summary: string;
    timeSpentSeconds: number; // Aggregate time spent
    issueType: {
        name: string;
        iconUrl: string;
    };
    status: {
        name: string;
        categoryColor: string; // e.g. "blue-gray", "yellow", "green" mapped from category
        categoryKey: string; // "new", "indeterminate", "done"
    };
}

export interface WorklogEntry {
    ticketId: string;
    timeSpentSeconds: number;
    started: string; // ISO string
    comment?: string;
}
