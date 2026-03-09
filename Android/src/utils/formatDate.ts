import {
  formatDistanceToNow,
  format,
  isToday,
  isYesterday,
  parseISO,
} from "date-fns";

/**
 * Format a date string as relative time (e.g., "2m ago", "1h ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = parseISO(dateString);
  return formatDistanceToNow(date, { addSuffix: true });
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
