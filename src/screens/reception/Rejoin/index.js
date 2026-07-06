// Rejoin / In Duration Feature (Staff App)
// Shared utility for computing and checking "In Duration" status.

/**
 * Parse a prescriptionDuration string into milliseconds.
 */
export function parseDurationToMs(durationStr) {
  if (!durationStr) return 0;
  const str = durationStr.trim().toLowerCase();
  const num = parseInt(str, 10);
  if (isNaN(num)) return 0;
  if (str.includes('day')) return num * 24 * 60 * 60 * 1000;
  if (str.includes('month')) return num * 30 * 24 * 60 * 60 * 1000;
  return 0;
}

/**
 * Compute the duration end ISO string from a start date and duration string.
 */
export function computeDurationEnd(startDate, durationStr) {
  const ms = parseDurationToMs(durationStr);
  if (!ms) return null;
  const start = startDate ? new Date(startDate) : new Date();
  return new Date(start.getTime() + ms).toISOString();
}

/**
 * Check if a patient is currently "In Duration".
 */
export function checkIsInDuration(medicationDurationEnd) {
  if (!medicationDurationEnd) return false;
  return new Date(medicationDurationEnd) > new Date();
}

export const DURATION_OPTIONS = [
  '7 Days',
  '15 Days',
  '1 Month',
  '2 Months',
  '3 Months',
  '6 Months',
];
