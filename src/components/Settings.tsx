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
}

export const Settings = ({ onSave, onCancel, showCancel }: SettingsProps) => {
    const [formData, setFormData] = useState<AppSettings>({
        jiraHost: "",
        jiraPat: "",
        jiraEmail: "",
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

            const cleanSettings = {
                jiraHost: host,
                jiraPat: formData.jiraPat.trim(),
                jiraEmail: formData.jiraEmail?.trim(),
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
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <SettingsIcon size={20} />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Settings</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Jira Host URL"
                    placeholder="https://your-domain.atlassian.net"
                    value={formData.jiraHost}
                    onChange={(e) => setFormData({ ...formData, jiraHost: e.target.value })}
                    helperText="The base URL of your Jira instance"
                />

                <Input
                    label="Jira Email (Optional)"
                    type="email"
                    placeholder="user@example.com (Required for Jira Cloud)"
                    value={formData.jiraEmail || ""}
                    onChange={(e) => setFormData({ ...formData, jiraEmail: e.target.value })}
                    helperText="Leave empty if using a PAT on Jira Data Center"
                />

                <Input
                    label="Personal Access Token / API Token"
                    type="password"
                    placeholder="Make sure to keep this secure"
                    value={formData.jiraPat}
                    onChange={(e) => setFormData({ ...formData, jiraPat: e.target.value })}
                />

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
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
