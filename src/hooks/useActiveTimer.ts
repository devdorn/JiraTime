import { useState, useEffect } from "react";

export interface ActiveTimer {
    ticketId: string;
    startTime: number; // Date.now()
}

export const useActiveTimer = () => {
    const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTimer();
        // Listen for changes from other contexts (background/other popup instances? unlikely but good practice)
        const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
            if (changes.activeTimer) {
                setActiveTimer(changes.activeTimer.newValue as ActiveTimer);
            }
        };
        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, []);

    const fetchTimer = async () => {
        const result = await chrome.storage.local.get("activeTimer");
        setActiveTimer((result.activeTimer as ActiveTimer) || null);
        setLoading(false);
    };

    const startTimer = async (ticketId: string) => {
        const newTimer: ActiveTimer = {
            ticketId,
            startTime: Date.now(),
        };
        await chrome.storage.local.set({ activeTimer: newTimer });
        // Optional: Set badge
        chrome.action.setBadgeText({ text: "ON" });
        chrome.action.setBadgeBackgroundColor({ color: "#22c55e" }); // green
    };

    const stopTimer = async () => {
        await chrome.storage.local.remove("activeTimer");
        chrome.action.setBadgeText({ text: "" });
    };

    return { activeTimer, startTimer, stopTimer, loading };
};
