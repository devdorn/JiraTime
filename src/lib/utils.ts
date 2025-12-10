import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
    if (!seconds) return "0m";

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (parts.length === 0 && seconds > 0) return "<1m";

    return parts.join(" ");
}

export function formatDurationFromStart(startTime: number): string {
    const diff = Math.floor((Date.now() - startTime) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;

    // Show seconds for live timer
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    parts.push(`${m}m`);
    parts.push(`${s}s`);

    return parts.join(" ");
}

export function parseDuration(input: string): number {
    // Simple parser for "1h 30m", "1.5h", "90m"
    // Jira API accepts these, but we need seconds for our Easter Egg check.

    // Normalize: lowercase
    let text = input.toLowerCase().trim();

    let totalSeconds = 0;

    // Regex for basic patterns: 1h, 1.5h, 30m, 2h 30m
    // Note: This is a lightweight parser for the client-side check. 
    // Jira's backend parser is more robust, but this covers 99% of "touch grass" cases.

    const weeks = text.match(/(\d+(\.\d+)?)\s*w/);
    const days = text.match(/(\d+(\.\d+)?)\s*d/);
    const hours = text.match(/(\d+(\.\d+)?)\s*h/);
    const minutes = text.match(/(\d+(\.\d+)?)\s*m/);

    if (weeks) totalSeconds += parseFloat(weeks[1]) * 5 * 8 * 3600; // Jira standard: 5d weeks, 8h days
    if (days) totalSeconds += parseFloat(days[1]) * 8 * 3600;      // Jira standard: 8h days
    if (hours) totalSeconds += parseFloat(hours[1]) * 3600;
    if (minutes) totalSeconds += parseFloat(minutes[1]) * 60;

    // Fallback: if just a number, assume minutes (Jira default)
    if (!weeks && !days && !hours && !minutes && /^\d+(\.\d+)?$/.test(text)) {
        totalSeconds = parseFloat(text) * 60;
    }

    return totalSeconds;
}
