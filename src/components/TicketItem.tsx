import { useState, useEffect } from "react";
import type { JiraTicket, AppSettings } from "../lib/types";
import type { ActiveTimer } from "../hooks/useActiveTimer";
import { addWorklog } from "../lib/jira";
import { formatDuration, formatDurationFromStart, parseDuration, cn } from "../lib/utils";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import {
    Play, Square, ExternalLink, ChevronDown, ChevronUp, Clock,
    Bug, CheckSquare, Bookmark, Zap, GitCommit, FileQuestion,
    HelpCircle, Microscope, PinOff
} from "lucide-react";

// Helper for Issue Type Icon
const IssueIcon = ({ type }: { type?: { name: string; iconUrl: string } }) => {
    const name = type?.name || "Unknown";
    const lowerName = name.toLowerCase();

    let IconComponent = FileQuestion;
    let colorClass = "text-gray-400";

    if (lowerName.includes("bug")) {
        IconComponent = Bug;
        colorClass = "text-red-500";
    } else if (lowerName.includes("task") && !lowerName.includes("sub")) {
        IconComponent = CheckSquare;
        colorClass = "text-blue-500";
    } else if (lowerName.includes("story")) {
        IconComponent = Bookmark;
        colorClass = "text-green-500";
    } else if (lowerName.includes("epic")) {
        IconComponent = Zap;
        colorClass = "text-purple-500";
    } else if (lowerName.includes("sub")) {
        // Sub-tasks: Distinct color to avoid looking "disabled"
        IconComponent = GitCommit;
        colorClass = "text-teal-600 dark:text-teal-400";
    } else if (lowerName.includes("anfrage")) {
        // Anfrage (Request/Inquiry)
        IconComponent = HelpCircle;
        colorClass = "text-orange-500";
    } else if (lowerName.includes("analyse")) {
        // Analyse (Analysis)
        IconComponent = Microscope;
        colorClass = "text-indigo-500";
    }

    return (
        <div className="group relative flex items-center justify-center p-1 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
            <IconComponent size={14} className={colorClass} />
            {/* Custom Tooltip */}
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-[10px] font-medium text-white bg-gray-900/90 dark:bg-black/90 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                {name}
            </span>
        </div>
    );
};

interface TicketItemProps {
    ticket: JiraTicket;
    settings: AppSettings;
    activeTimer: ActiveTimer | null;
    onStartTimer: (id: string) => void;
    onStopTimer: () => void;
    onRefresh: () => void;
    onRemove?: () => void; // Optional: For pinned tickets
}

export const TicketItem = ({
    ticket,
    settings,
    activeTimer,
    onStartTimer,
    onStopTimer,
    onRefresh,
    onRemove,
}: TicketItemProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [manualTime, setManualTime] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [liveDuration, setLiveDuration] = useState("");

    const isTimerRunning = activeTimer?.ticketId === ticket.id;

    // Live timer update
    useEffect(() => {
        let interval: number;
        if (isTimerRunning && activeTimer) {
            // Force expand if timer is running for this ticket
            setIsExpanded(true);

            const update = () => {
                setLiveDuration(formatDurationFromStart(activeTimer.startTime));
            };
            update();
            interval = window.setInterval(update, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, activeTimer]);

    // Easter Egg: Touch Grass Check
    const checkTouchGrass = (seconds: number) => {
        // >= 8 Hours (8 * 3600 = 28800)
        if (seconds >= 28800) {
            alert("Whoa, that's 8+ hours! 🌿\n\nGo touch some grass.\n(Saving your time anyway...)");
        }
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualTime) return;

        setIsSubmitting(true);
        try {
            // Check Easter Egg
            const seconds = parseDuration(manualTime);
            if (seconds > 0) { // Only check if valid
                checkTouchGrass(seconds);
            }

            await addWorklog(settings, ticket.id, manualTime);
            setManualTime("");
            onRefresh();
            // Optional: Show success feedback
        } catch (error) {
            console.error(error);
            alert("Failed to log time. Check console.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStopTimer = async () => {
        if (!activeTimer) return;

        setIsSubmitting(true);
        try {
            let seconds = Math.floor((Date.now() - activeTimer.startTime) / 1000);

            // Check Easter Egg (using computed seconds directly)
            checkTouchGrass(seconds);

            // Jira rejects worklogs with 0 time spent.
            // Enforce a minimum of 60 seconds (1 minute) to avoid "Worklog must not be null" errors.
            if (seconds < 60) {
                seconds = 60;
            }

            await addWorklog(settings, ticket.id, seconds);
            onStopTimer();
            onRefresh();
        } catch (error) {
            console.error(error);
            alert("Failed to save timer. Check console.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={cn(
            "border rounded-lg bg-white dark:bg-slate-800 transition-all shadow-sm",
            isTimerRunning ? "border-blue-500 ring-1 ring-blue-500 dark:border-blue-500 dark:ring-blue-500" : "border-gray-200 dark:border-slate-700"
        )}>

            {/* Header / Summary */}
            <div
                className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 flex items-start justify-between gap-3"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <IssueIcon type={ticket.issueType} />
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                            {ticket.key}
                        </span>
                        {/* Status Indicator */}
                        <div className="group/status relative flex items-center ml-1">
                            <div className={cn("w-2 h-2 rounded-full", ticket.status?.categoryColor || "bg-gray-400")} />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] font-medium text-white bg-gray-900/90 dark:bg-black/90 rounded shadow-sm opacity-0 group-hover/status:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                {ticket.status?.name || "Unknown"}
                            </span>
                        </div>
                        <a
                            href={`${settings.jiraHost}/browse/${ticket.key}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <ExternalLink size={14} />
                        </a>
                        {isTimerRunning && (
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 animate-pulse flex items-center gap-1">
                                <Clock size={12} />
                                <Tracking />
                            </span>
                        )}
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight line-clamp-2">
                        {ticket.summary}
                    </h3>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 flex items-center gap-1">
                        <Clock size={12} className="text-gray-400 dark:text-gray-500" />
                        <span>{formatDuration(ticket.timeSpentSeconds)} logged</span>
                        {isTimerRunning && (
                            <span className="text-blue-600 dark:text-blue-400 font-mono ml-2 inline-block timer-display">
                                + {liveDuration}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {onRemove && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Unpin ${ticket.key}?`)) onRemove();
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 dark:text-gray-500 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Unpin Ticket"
                        >
                            <PinOff size={16} />
                        </button>
                    )}
                    <div className="text-gray-400 mt-1">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                </div>
            </div>

            {/* Expanded Actions */}
            {isExpanded && (
                <div className="p-3 pt-0 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 rounded-b-lg">

                    {/* Timer Section */}
                    <div className="py-3 flex items-center justify-between gap-3">
                        {isTimerRunning ? (
                            <Button
                                variant="danger"
                                className="w-full"
                                onClick={handleStopTimer}
                                isLoading={isSubmitting}
                            >
                                <Square className="fill-current mr-2 h-4 w-4" />
                                Stop & Save ({liveDuration})
                            </Button>
                        ) : (
                            <Button
                                variant="primary"
                                className="w-full"
                                disabled={!!activeTimer} // Disable starting if another timer is running elsewhere
                                onClick={() => onStartTimer(ticket.id)}
                            >
                                <Play className="fill-current mr-2 h-4 w-4" />
                                Start Timer
                            </Button>
                        )}
                    </div>

                    <div className="relative flex py-1 items-center">
                        <div className="flex-grow border-t border-gray-200 dark:border-slate-700"></div>
                        <span className="flex-shrink-0 mx-2 text-xs text-gray-400 dark:text-gray-500 uppercase">Or</span>
                        <div className="flex-grow border-t border-gray-200 dark:border-slate-700"></div>
                    </div>

                    {/* Manual Entry Section */}
                    <form onSubmit={handleManualSubmit} className="pt-2 flex gap-2">
                        <Input
                            placeholder="e.g. 2h 30m"
                            value={manualTime}
                            onChange={(e) => setManualTime(e.target.value)}
                            className="h-9"
                            disabled={isSubmitting}
                        />
                        <Button
                            type="submit"
                            variant="secondary"
                            className="h-9 px-3"
                            isLoading={isSubmitting}
                            disabled={!manualTime}
                        >
                            Log
                        </Button>
                    </form>
                </div>
            )}
        </div>
    );
};

const Tracking = () => <span>Tracking</span>; // Helper to fix JSX error in replace

