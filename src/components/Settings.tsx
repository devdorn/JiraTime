import { useState, useEffect } from "react";
import type { AppSettings } from "../lib/types";
import { getSettings, saveSettings } from "../lib/storage";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { Settings as SettingsIcon, Save } from "lucide-react";

interface SettingsProps {
    onSave: () => void;
    onCancel?: () => void;
    showCancel?: boolean;
    onThemeChange?: (theme: 'light' | 'dark' | 'system') => void;
}

export const Settings = ({ onSave, onCancel, showCancel, onThemeChange }: SettingsProps) => {
    // Initialize formData with default values. The useEffect hook will load actual settings.
    const [formData, setFormData] = useState<Partial<AppSettings>>({
        jiraHost: "",
        jiraPat: "",
        theme: "system", // Default theme
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        getSettings().then((settings) => {
            if (settings) {
                setFormData(settings);
            }
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // Basic validation
            if (!formData.jiraHost || !formData.jiraPat) {
                throw new Error("All fields are required");
            }

            let host = formData.jiraHost.trim();
            // Ensure host has protocol
            if (!host.startsWith("http")) {
                host = `https://${host}`;
            }
            // Remove trailing slash
            host = host.replace(/\/$/, "");

            const cleanSettings: AppSettings = {
                jiraHost: host,
                jiraPat: formData.jiraPat.trim(),
                theme: (formData.theme as 'light' | 'dark' | 'system') || 'system',
                pinnedTicketKeys: formData.pinnedTicketKeys || [],
            };

            await saveSettings(cleanSettings);
            onSave();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save settings");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 space-y-6">
            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                    <SettingsIcon size={20} />
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Jira Host URL"
                    placeholder="https://your-domain.atlassian.net"
                    value={formData.jiraHost}
                    onChange={(e) => setFormData({ ...formData, jiraHost: e.target.value })}
                    helperText="The base URL of your Jira instance"
                />



                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Theme
                    </label>
                    <select
                        value={formData.theme || 'system'}
                        onChange={(e) => {
                            const newTheme = e.target.value as 'light' | 'dark' | 'system';
                            setFormData({ ...formData, theme: newTheme });
                            onThemeChange?.(newTheme);
                        }}
                        className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm placeholder-gray-400
                        focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                        disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-200
                        dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                    >
                        <option value="system">System Default</option>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                    </select>
                </div>

                <Input
                    label="Personal Access Token / API Token"
                    type="password"
                    placeholder="Make sure to keep this secure"
                    value={formData.jiraPat}
                    onChange={(e) => setFormData({ ...formData, jiraPat: e.target.value })}
                />

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <div className="pt-4 flex gap-2">
                    <Button type="submit" className="flex-1" isLoading={loading}>
                        <Save className="mr-2 h-4 w-4" />
                        Save Configuration
                    </Button>
                    {showCancel && (
                        <Button type="button" variant="ghost" onClick={onCancel}>
                            Cancel
                        </Button>
                    )}
                </div>
            </form>
        </div>
    );
};
