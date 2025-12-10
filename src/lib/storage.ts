import type { AppSettings } from "./types";

export const saveSettings = async (settings: AppSettings): Promise<void> => {
    await chrome.storage.sync.set(settings);
};

export const getSettings = async (): Promise<AppSettings | null> => {
    const result = await chrome.storage.sync.get(["jiraHost", "jiraPat", "theme"]);
    if (result.jiraHost && result.jiraPat) {
        return {
            jiraHost: result.jiraHost as string,
            jiraPat: result.jiraPat as string,
            theme: (result.theme as 'light' | 'dark' | 'system') || 'system',
        };
    }
    return null;
};

export const hasSettings = async (): Promise<boolean> => {
    const settings = await getSettings();
    return !!(settings?.jiraHost && settings?.jiraPat);
};
