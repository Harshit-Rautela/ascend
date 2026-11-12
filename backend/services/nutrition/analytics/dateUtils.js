
/*
 * ASCEND — NUTRITION DATE UTILITIES
 *
 * Centralizes date validation, date-range resolution,
 * and calendar-date calculations for nutrition analytics.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_PERIOD_DAYS = 30;
export const MAX_HISTORY_DAYS = 60;

export function getTodayDateString() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

export function isValidDate(value) {
    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return false;
    }

    const parsed = new Date(`${value}T00:00:00.000Z`);

    return (
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === value
    );
}

export function parseDate(value) {
    if (!isValidDate(value)) {
        throw new Error(`Invalid date: ${value}`);
    }

    return new Date(`${value}T00:00:00.000Z`);
}

export function formatDate(date) {
    return date.toISOString().slice(0, 10);
}

export function addDays(date, days) {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
}

export function getDayDifference(start, end) {
    return Math.floor((end - start) / DAY_MS) + 1;
}

/*
 * Resolves an inclusive date range.
 * Defaults to the latest 30 calendar days, including today.
 */
export function resolveDateRange({
    startDate,
    endDate,
} = {}) {
    const today = getTodayDateString();

    const resolvedEndDate = endDate || today;

    const resolvedStartDate =
        startDate ||
        formatDate(
            addDays(
                parseDate(resolvedEndDate),
                -(DEFAULT_PERIOD_DAYS - 1)
            )
        );

    if (
        !isValidDate(resolvedStartDate) ||
        !isValidDate(resolvedEndDate)
    ) {
        throw new Error(
            "Valid startDate and endDate are required (YYYY-MM-DD)."
        );
    }

    const start = parseDate(resolvedStartDate);
    const end = parseDate(resolvedEndDate);

    if (start > end) {
        throw new Error(
            "startDate must be before or equal to endDate."
        );
    }

    if (end > parseDate(today)) {
        throw new Error("Future dates are not supported.");
    }

    const expectedDays = getDayDifference(start, end);

    if (expectedDays > MAX_HISTORY_DAYS) {
        throw new Error(
            `Nutrition history requests are limited to ${MAX_HISTORY_DAYS} days.`
        );
    }

    return {
        startDate: resolvedStartDate,
        endDate: resolvedEndDate,
        start,
        end,
        endExclusive: addDays(end, 1),
        expectedDays,
    };
}

/*
 * Builds a preceding period of equal duration.
 * Used for comparisons, not direct user-requested ranges.
 */
export function getPreviousDateRange(range) {
    const previousEnd = addDays(range.start, -1);

    const previousStart = addDays(
        previousEnd,
        -(range.expectedDays - 1)
    );

    return {
        startDate: formatDate(previousStart),
        endDate: formatDate(previousEnd),
        start: previousStart,
        end: previousEnd,
        endExclusive: addDays(previousEnd, 1),
        expectedDays: range.expectedDays,
    };
}
