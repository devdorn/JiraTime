export interface AppSettings {
    jiraHost: string;
    jiraPat: string;
    theme: 'light' | 'dark' | 'system';
    pinnedTicketKeys: string[];
}

export interface JiraTicket {
    id: string; // The internal ID (e.g. 10001)
    key: string; // The key (e.g. PROJ-123)
    summary: string;
    timeSpentSeconds: number; // Aggregate time spent
}

export interface WorklogEntry {
    ticketId: string;
    timeSpentSeconds: number;
    started: string; // ISO string
    comment?: string;
}
