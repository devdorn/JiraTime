import { useState, useEffect } from "react";
import type { AppSettings, JiraTicket } from "../lib/types";
import { fetchInProgressTickets, fetchDoneTickets, fetchTicketsByKeys } from "../lib/jira";
import { useActiveTimer } from "../hooks/useActiveTimer";
import { saveSettings } from "../lib/storage";
import { TicketItem } from "./TicketItem";
import { Loader2, AlertCircle, RefreshCw, Pin, Plus, Clock, ChevronDown } from "lucide-react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { formatDurationFromStart } from "../lib/utils";

interface TicketListProps {
    settings: AppSettings;
    onSettingsChange?: () => void;
}

export const TicketList = ({ settings, onSettingsChange }: TicketListProps) => {
    const [tickets, setTickets] = useState<JiraTicket[]>([]);
    const [pinnedTickets, setPinnedTickets] = useState<JiraTicket[]>([]);
    const [doneTickets, setDoneTickets] = useState<JiraTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showDone, setShowDone] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [elapsedTime, setElapsedTime] = useState("");

    // Collapsible section states
    const [isPinnedCollapsed, setIsPinnedCollapsed] = useState(() => {
        const stored = localStorage.getItem('jiratime_pinned_collapsed');
        return stored ? JSON.parse(stored) : false;
    });
    const [isMyWorkCollapsed, setIsMyWorkCollapsed] = useState(() => {
        const stored = localStorage.getItem('jiratime_mywork_collapsed');
        return stored ? JSON.parse(stored) : false;
    });

    // Manual Pin Binding
    const [pinInput, setPinInput] = useState("");
    const [isPinning, setIsPinning] = useState(false);

    const { activeTimer, startTimer, stopTimer } = useActiveTimer();

    useEffect(() => {
        loadTickets();
    }, [settings]); // If settings change, reload

    // Auto-scroll to active ticket on load
    useEffect(() => {
        if (activeTimer && !loading) {
            // Wait a bit for the DOM to render
            const timer = setTimeout(() => {
                const el = document.getElementById(`ticket-${activeTimer.ticketId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [activeTimer?.ticketId, loading]);

    // Update elapsed time display
    useEffect(() => {
        let interval: number;
        if (activeTimer) {
            const update = () => {
                setElapsedTime(formatDurationFromStart(activeTimer.startTime));
            };
            update(); // Initial update
            interval = window.setInterval(update, 1000);
        } else {
            setElapsedTime("");
        }
        return () => clearInterval(interval);
    }, [activeTimer?.ticketId, activeTimer?.startTime]);

    // Toggle functions with localStorage persistence
    const togglePinnedCollapse = () => {
        const newValue = !isPinnedCollapsed;
        setIsPinnedCollapsed(newValue);
        localStorage.setItem('jiratime_pinned_collapsed', JSON.stringify(newValue));
    };

    const toggleMyWorkCollapse = () => {
        const newValue = !isMyWorkCollapsed;
        setIsMyWorkCollapsed(newValue);
        localStorage.setItem('jiratime_mywork_collapsed', JSON.stringify(newValue));
    };

    const loadTickets = async () => {
        try {
            setLoading(true);
            setError("");
            const inProgress = await fetchInProgressTickets(settings);

            // Filter duplicates: Tickets in progress might also be in pinned list.
            // Requirement: "visual distinction between my tickets and the tickets i dded manuallly"
            // We'll keep them in separate lists. If a ticket is in both, maybe duplicate is okay?
            // Or remove from pinned if it's in progress?
            // Let's keep them separate for now as requested.

            setTickets(inProgress);

            // Fetch Pinned
            if (settings.pinnedTicketKeys.length > 0) {
                const pinned = await fetchTicketsByKeys(settings, settings.pinnedTicketKeys);
                setPinnedTickets(pinned);
            } else {
                setPinnedTickets([]);
            }

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Failed to load tickets. Check your settings and connection.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddPin = async (e: React.FormEvent) => {
        e.preventDefault();
        const key = pinInput.trim().toUpperCase();
        if (!key) return;

        // Optimistic check: prevent dupes
        if (settings.pinnedTicketKeys.includes(key)) {
            setPinInput("");
            return;
        }

        setIsPinning(true);
        try {
            // Verify it exists? Or just add it?
            // "i want to be able to add tickets... all based on the ticket id"
            // Let's verify it exists by fetching it.
            const [ticket] = await fetchTicketsByKeys(settings, [key]);

            if (ticket) {
                const newKeys = [...settings.pinnedTicketKeys, key];
                await saveSettings({ ...settings, pinnedTicketKeys: newKeys });
                setPinInput("");
                if (onSettingsChange) onSettingsChange(); // Reload settings (which triggers refresh)
            } else {
                alert(`Ticket ${key} not found.`);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to pin ticket.");
        } finally {
            setIsPinning(false);
        }
    };

    const handleRemovePin = async (key: string) => {
        const newKeys = settings.pinnedTicketKeys.filter(k => k !== key);
        await saveSettings({ ...settings, pinnedTicketKeys: newKeys });
        if (onSettingsChange) onSettingsChange();
    };

    const loadDoneTickets = async () => {
        if (doneTickets.length > 0) return; // Already loaded
        try {
            const done = await fetchDoneTickets(settings);
            setDoneTickets(done);
        } catch (err) {
            console.error(err);
            // Don't error blocking the main UI, just log
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadTickets();
        if (showDone) {
            try {
                const done = await fetchDoneTickets(settings);
                setDoneTickets(done);
            } catch (e) {
                console.error(e);
            }
        }
        setRefreshing(false);
    };

    const toggleDone = () => {
        const newState = !showDone;
        setShowDone(newState);
        if (newState) {
            loadDoneTickets();
        }
    };

    if (loading && !refreshing) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p className="text-sm">Loading tickets...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 flex flex-col items-center justify-center text-center">
                <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full text-red-600 dark:text-red-400 mb-3">
                    <AlertCircle size={24} />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Connection Error</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">{error}</p>
                <Button onClick={loadTickets} variant="secondary">Retry</Button>
            </div>
        );
    }


    return (
        <>
            <div className="fixed top-[57px] left-0 right-0 z-20 px-4 py-2.5 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    {pinnedTickets.length > 0 && (
                        <button
                            onClick={() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap border border-gray-200 dark:border-slate-700 shadow-sm"
                        >
                            <Pin size={12} />
                            Pinned
                        </button>
                    )}
                    {tickets.length > 0 && (
                        <button
                            onClick={() => {
                                const el = document.getElementById('section-inprogress');
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap border border-gray-200 dark:border-slate-700 shadow-sm"
                        >
                            <RefreshCw size={12} />
                            My Work
                        </button>
                    )}
                </div>
                <div>
                    {activeTimer && (
                        <button
                            onClick={() => {
                                const el = document.getElementById(`ticket-${activeTimer.ticketId}`);
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors whitespace-nowrap shadow-sm border border-blue-200 dark:border-blue-800"
                        >
                            <Clock size={12} className="animate-pulse" />
                            Active {elapsedTime && `(${elapsedTime})`}
                        </button>
                    )}
                </div>
            </div>

            <div className="p-4 pt-16 space-y-4 pb-20">
                {/* Pinned Tickets Section */}
                <div className="space-y-3">
                    <div
                        className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 -mx-2 px-2 py-1 rounded transition-colors"
                        onClick={togglePinnedCollapse}
                    >
                        <h2 id="section-pinned" className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1 scroll-mt-28">
                            <Pin size={14} /> Pinned Tickets
                        </h2>
                        <ChevronDown
                            size={16}
                            className={`text-gray-400 transition-transform ${isPinnedCollapsed ? '-rotate-90' : ''}`}
                        />
                    </div>

                    {!isPinnedCollapsed && (
                        <>

                            <form onSubmit={handleAddPin} className="flex gap-2">
                                <Input
                                    placeholder="Add ticket (e.g. PROJ-123)"
                                    value={pinInput}
                                    onChange={e => setPinInput(e.target.value)}
                                    className="h-8 text-sm"
                                    disabled={isPinning}
                                />
                                <Button type="submit" variant="secondary" className="h-8" disabled={!pinInput || isPinning} isLoading={isPinning}>
                                    <Plus size={16} />
                                </Button>
                            </form>

                            {pinnedTickets.map((ticket) => (
                                <div id={`ticket-${ticket.id}`} key={ticket.id}>
                                    <TicketItem
                                        ticket={ticket}
                                        settings={settings}
                                        activeTimer={activeTimer}
                                        onStartTimer={startTimer}
                                        onStopTimer={stopTimer}
                                        onRefresh={handleRefresh}
                                        onRemove={() => handleRemovePin(ticket.key)}
                                    />
                                </div>
                            ))}
                        </>
                    )}
                </div>

                <div className="border-t border-gray-100 dark:border-slate-800 my-4"></div>

                <div
                    className="flex items-center justify-between mb-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 -mx-2 px-2 py-1 rounded transition-colors"
                    onClick={toggleMyWorkCollapse}
                >
                    <h2 id="section-inprogress" className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider scroll-mt-28">My Work</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleRefresh(); }} className="text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 transition-colors p-1" title="Refresh">
                            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                        </button>
                        <ChevronDown
                            size={16}
                            className={`text-gray-400 transition-transform ${isMyWorkCollapsed ? '-rotate-90' : ''}`}
                        />
                    </div>
                </div>

                {!isMyWorkCollapsed && (
                    <div className="space-y-3">
                        {tickets.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 dark:bg-slate-800 border border-dashed rounded-lg border-gray-300 dark:border-slate-700">
                                <p className="text-sm text-gray-500 dark:text-gray-400">No tickets in progress found.</p>
                            </div>
                        ) : (
                            tickets.map((ticket) => (
                                <div id={`ticket-${ticket.id}`} key={ticket.id}>
                                    <TicketItem
                                        ticket={ticket}
                                        settings={settings}
                                        activeTimer={activeTimer}
                                        onStartTimer={startTimer}
                                        onStopTimer={stopTimer}
                                        onRefresh={handleRefresh}
                                    />
                                </div>
                            ))
                        )}
                    </div>
                )}

                <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-4">
                        <input
                            id="show-done"
                            type="checkbox"
                            checked={showDone}
                            onChange={toggleDone}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 dark:border-slate-600 dark:bg-slate-800 dark:checked:bg-blue-500"
                        />
                        <label htmlFor="show-done" className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none">
                            Show My Completed Work
                        </label>
                    </div>

                    {showDone && (
                        <div className="space-y-3">
                            {doneTickets.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-4">No completed tickets in the last 7 days.</p>
                            ) : (
                                doneTickets.map((ticket) => (
                                    <div id={`ticket-${ticket.id}`} key={ticket.id}>
                                        <TicketItem
                                            ticket={ticket}
                                            settings={settings}
                                            activeTimer={activeTimer}
                                            onStartTimer={startTimer}
                                            onStopTimer={stopTimer}
                                            onRefresh={handleRefresh}
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {activeTimer && !tickets.find(t => t.id === activeTimer.ticketId) && !pinnedTickets.find(t => t.id === activeTimer.ticketId) && !doneTickets.find(t => t.id === activeTimer.ticketId) && (
                    <div className="fixed bottom-0 left-0 right-0 p-3 bg-blue-600 text-white shadow-lg flex items-center justify-between">
                        <div className="text-sm font-medium">
                            Timer running on hidden ticket
                        </div>
                        <Button variant="secondary" className="h-8 text-xs" onClick={stopTimer}>Stop</Button>
                    </div>
                )}
            </div >
        </>
    );
};
