import type { PeriodMonthValue } from '@repo/ui-composition';

import { DEFAULT_VIEWED_MONTH, addMonthsToPeriod } from '@/shared/expense-form/expense-form-model';

export type DateRangeValue = {
  start: Date | null;
  end: Date | null;
};

export const EMPTY_DATE_RANGE: DateRangeValue = { start: null, end: null };

export const toLocalDayStart = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const parseYearMonthToRange = (yearMonth?: string): DateRangeValue => {
  if (!yearMonth || !/^\d{4}\.\d{2}$/.test(yearMonth)) {
    return { start: null, end: null };
  }
  const [yearText, monthText] = yearMonth.split('.');
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return { start: null, end: null };
  }
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0)
  };
};

export const getRecentMonthsDateRange = (referencePeriod: PeriodMonthValue = DEFAULT_VIEWED_MONTH, monthsWindow = 3): DateRangeValue => {
  const startMonth = addMonthsToPeriod(referencePeriod, -(monthsWindow - 1));
  return {
    start: new Date(startMonth.year, startMonth.month - 1, 1),
    end: new Date(referencePeriod.year, referencePeriod.month, 0)
  };
};

export const isDateWithinRange = (date: Date, range: DateRangeValue): boolean => {
  const startTs = range.start ? toLocalDayStart(range.start).getTime() : null;
  const endTs = range.end ? toLocalDayStart(range.end).getTime() : null;
  if (startTs === null && endTs === null) {
    return true;
  }
  const targetTs = toLocalDayStart(date).getTime();
  if (startTs !== null && targetTs < startTs) {
    return false;
  }
  if (endTs !== null && targetTs > endTs) {
    return false;
  }
  return true;
};

export const isSameDateRange = (a: DateRangeValue, b: DateRangeValue): boolean => {
  const aStart = a.start ? toLocalDayStart(a.start).getTime() : null;
  const bStart = b.start ? toLocalDayStart(b.start).getTime() : null;
  const aEnd = a.end ? toLocalDayStart(a.end).getTime() : null;
  const bEnd = b.end ? toLocalDayStart(b.end).getTime() : null;
  return aStart === bStart && aEnd === bEnd;
};

const formatYmdDot = (date: Date): string => `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;

export const formatDateRangeLabel = (range: DateRangeValue): string => {
  if (range.start && range.end) {
    return `${formatYmdDot(range.start)} ~ ${formatYmdDot(range.end)}`;
  }
  if (range.start) {
    return `${formatYmdDot(range.start)} 이후`;
  }
  if (range.end) {
    return `${formatYmdDot(range.end)} 이전`;
  }
  return '전체 기간';
};
