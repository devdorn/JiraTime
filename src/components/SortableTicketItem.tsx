import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TicketItem } from "./TicketItem";
import type { JiraTicket, AppSettings } from "../lib/types";
import type { ActiveTimer } from "../hooks/useActiveTimer";

interface SortableTicketItemProps {
    id: string; // Unique ID for dnd-kit
    ticket: JiraTicket;
    settings: AppSettings;
    activeTimer: ActiveTimer | null;
    onStartTimer: (id: string) => void;
    onStopTimer: () => void;
    onRefresh: () => void;
    onRemove?: () => void;
}

export const SortableTicketItem = (props: SortableTicketItemProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: props.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative' as const,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} id={`ticket-${props.ticket.id}`}>
            <TicketItem {...props} />
        </div>
    );
};
