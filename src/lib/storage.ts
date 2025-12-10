import type { AppSettings } from "./types";

export const saveSettings = async (settings: AppSettings): Promise<void> => {
    await chrome.storage.sync.set({ settings });
};

export const getSettings = async (): Promise<AppSettings | null> => {
    const result = await chrome.storage.sync.get("settings");
    return (result.settings as AppSettings) || null;
};

export const hasSettings = async (): Promise<boolean> => {
    const settings = await getSettings();
    return !!(settings?.jiraHost && settings?.jiraPat);
};
