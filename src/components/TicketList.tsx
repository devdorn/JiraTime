import { useState, useEffect } from "react";
import type { AppSettings, JiraTicket } from "../lib/types";
import { fetchInProgressTickets, fetchDoneTickets } from "../lib/jira";
import { useActiveTimer } from "../hooks/useActiveTimer";
import { TicketItem } from "./TicketItem";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./ui/Button";

interface TicketListProps {
    settings: AppSettings;
}

export const TicketList = ({ settings }: TicketListProps) => {
    const [tickets, setTickets] = useState<JiraTicket[]>([]);
    const [doneTickets, setDoneTickets] = useState<JiraTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showDone, setShowDone] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const { activeTimer, startTimer, stopTimer } = useActiveTimer();

    useEffect(() => {
        loadTickets();
    }, [settings]); // If settings change, reload

    const loadTickets = async () => {
        try {
            setLoading(true);
            setError("");
            const inProgress = await fetchInProgressTickets(settings);
            setTickets(inProgress);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Failed to load tickets. Check your settings and connection.");
        } finally {
            setLoading(false);
        }
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
        <div className="p-4 space-y-4 pb-20">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">In Progress</h2>
                <button onClick={handleRefresh} className="text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 transition-colors p-1" title="Refresh">
                    <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                </button>
            </div>

            <div className="space-y-3">
                {tickets.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-slate-800 border border-dashed rounded-lg border-gray-300 dark:border-slate-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400">No tickets in progress found.</p>
                    </div>
                ) : (
                    tickets.map((ticket) => (
                        <TicketItem
                            key={ticket.id}
                            ticket={ticket}
                            settings={settings}
                            activeTimer={activeTimer}
                            onStartTimer={startTimer}
                            onStopTimer={stopTimer}
                            onRefresh={handleRefresh}
                        />
                    ))
                )}
            </div>

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
                        Show Completed Tickets
                    </label>
                </div>

                {showDone && (
                    <div className="space-y-3">
                        {doneTickets.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">No completed tickets in the last 7 days.</p>
                        ) : (
                            doneTickets.map((ticket) => (
                                <TicketItem
                                    key={ticket.id}
                                    ticket={ticket}
                                    settings={settings}
                                    activeTimer={activeTimer}
                                    onStartTimer={startTimer}
                                    onStopTimer={stopTimer}
                                    onRefresh={handleRefresh}
                                />
                            ))
                        )}
                    </div>
                )}
            </div>

            {activeTimer && !tickets.find(t => t.id === activeTimer.ticketId) && !doneTickets.find(t => t.id === activeTimer.ticketId) && (
                // Edge case: Timer running on a ticket that is not in the list anymore?
                // Should probably fetch it or show a sticky footer.
                // For now, let's assume it's rare or user will see it update in background.
                // A sticky footer "Active Timer: KEY-123 (2m 3s)" would be nice.
                <div className="fixed bottom-0 left-0 right-0 p-3 bg-blue-600 text-white shadow-lg flex items-center justify-between">
                    <div className="text-sm font-medium">
                        Timer running on hidden ticket
                    </div>
                    <Button variant="secondary" className="h-8 text-xs" onClick={stopTimer}>Stop</Button>
                </div>
            )}
        </div>
    );
};
