import { format, parseISO, differenceInDays, addMonths, subMonths, startOfMonth, endOfMonth, isAfter, isBefore, isSameMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export const formatDate = (date: string | Date, formatStr: string = 'yyyy-MM-dd'): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr, { locale: zhCN });
};

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
};

export const formatMonth = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy年MM月', { locale: zhCN });
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatCurrencyShort = (amount: number): string => {
  if (amount >= 10000) {
    return `¥${(amount / 10000).toFixed(1)}万`;
  }
  return `¥${amount.toFixed(0)}`;
};

export const daysBetween = (date1: string | Date, date2: string | Date): number => {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  return differenceInDays(d2, d1);
};

export const isOverdue = (dueDate: string | Date): boolean => {
  const due = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
  return isAfter(new Date(), due);
};

export const getDaysOverdue = (dueDate: string | Date): number => {
  const due = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
  const today = new Date();
  if (isBefore(today, due)) return 0;
  return differenceInDays(today, due);
};

export const getCurrentPeriod = (): string => {
  return format(new Date(), 'yyyy-MM');
};

export const getMonthPeriod = (date: Date): string => {
  return format(date, 'yyyy-MM');
};

export const getPreviousMonths = (count: number): string[] => {
  const months: string[] = [];
  const today = new Date();
  for (let i = count - 1; i >= 0; i--) {
    months.push(getMonthPeriod(subMonths(today, i)));
  }
  return months;
};

export const getNextMonth = (period: string): string => {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return getMonthPeriod(addMonths(date, 1));
};

export const getMonthStartEnd = (period: string): { start: Date; end: Date } => {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
};

export const isDateInPeriod = (date: string | Date, period: string): boolean => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const { start, end } = getMonthStartEnd(period);
  return !isBefore(d, start) && !isAfter(d, end);
};

export const isSameMonthPeriod = (date: string | Date, period: string): boolean => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const [year, month] = period.split('-').map(Number);
  return isSameMonth(d, new Date(year, month - 1, 1));
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const getDaysUntilDue = (dueDate: string | Date): number => {
  const due = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
  const today = new Date();
  return differenceInDays(due, today);
};
