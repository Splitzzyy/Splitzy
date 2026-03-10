import {
  format,
  isToday,
  isYesterday,
  parseISO,
} from "date-fns";

/**
 * Format a date string as a readable time.
 * Today → "2:30 PM", Yesterday → "Yesterday 2:30 PM", Older → "Mar 5, 2:30 PM"
 */
export function formatRelativeTime(dateString: string): string {
  const date = parseISO(dateString);
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return "Yesterday " + format(date, "h:mm a");
  return format(date, "MMM d, h:mm a");
}

/**
 * Format a date for grouping (e.g., "Today", "Yesterday", "March 5")
 */
export function formatDateGroup(dateString: string): string {
  const date = parseISO(dateString);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d");
}

/**
 * Format a date for display (e.g., "Mar 5, 2026")
 */
export function formatDisplayDate(dateString: string): string {
  return format(parseISO(dateString), "MMM d, yyyy");
}
