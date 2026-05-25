/**
 * Shared utilities for calendar views.
 */

// Staff Day View constants
export const START_HOUR = 0;
export const END_HOUR = 24;
export const TOTAL_HOURS = END_HOUR - START_HOUR;

export function getTimePosition(dateStr, hourHeight) {
  const d = new Date(String(dateStr).replace(" ", "T"));
  return (d.getHours() + d.getMinutes() / 60) * hourHeight;
}

export function getEventHeight(startStr, endStr, hourHeight) {
  const start = new Date(String(startStr).replace(" ", "T"));
  const end = new Date(String(endStr).replace(" ", "T"));
  const diffHours = (end - start) / (1000 * 60 * 60);
  return Math.max(diffHours * hourHeight, 20);
}

export function layoutOverlappingEvents(events) {
  if (!events || events.length === 0) return [];
  const sorted = events.slice().sort(function (a, b) {
    const aStart = new Date(String(a.start || a.startDatetime || "").replace(" ", "T"));
    const bStart = new Date(String(b.start || b.startDatetime || "").replace(" ", "T"));
    return aStart - bStart;
  });
  const positioned = [];
  const columns = [];
  sorted.forEach(function (event) {
    const eventStart = new Date(String(event.start || event.startDatetime || "").replace(" ", "T"));
    let placed = false;
    for (let i = 0; i < columns.length; i++) {
      const lastInCol = columns[i][columns[i].length - 1];
      const lastEnd = new Date(String(lastInCol.end || lastInCol.endDatetime || "").replace(" ", "T"));
      if (eventStart >= lastEnd) {
        columns[i].push(event);
        positioned.push({ event, column: i });
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([event]);
      positioned.push({ event, column: columns.length - 1 });
    }
  });
  const totalColumns = columns.length || 1;
  return positioned.map(function (item) {
    return { event: item.event, column: item.column, totalColumns };
  });
}
