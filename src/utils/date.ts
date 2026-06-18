// ============================================
// 日期工具函数
// ============================================

import dayjs from 'dayjs';

export const formatDate = (date: string | Date, format = 'YYYY-MM-DD'): string => {
  return dayjs(date).format(format);
};

export const formatDateTime = (date: string | Date, format = 'YYYY-MM-DD HH:mm'): string => {
  return dayjs(date).format(format);
};

export const formatDisplayDate = (date: string): string => {
  const d = dayjs(date);
  const today = dayjs();
  if (d.isSame(today, 'day')) return '今天';
  if (d.isSame(today.add(1, 'day'), 'day')) return '明天';
  if (d.isSame(today.subtract(1, 'day'), 'day')) return '昨天';
  return d.format('MM月DD日');
};

export const getMonthDays = (year: number, month: number): Date[] => {
  const start = dayjs(`${year}-${month + 1}-01`);
  const daysInMonth = start.daysInMonth();
  const days: Date[] = [];
  for (let i = 0; i < daysInMonth; i++) {
    days.push(start.add(i, 'day').toDate());
  }
  return days;
};

export const getCalendarMatrix = (year: number, month: number): (Date | null)[] => {
  const start = dayjs(`${year}-${month + 1}-01`);
  const startDay = start.day();
  const daysInMonth = start.daysInMonth();
  const result: (Date | null)[] = [];

  for (let i = 0; i < startDay; i++) {
    result.push(null);
  }

  for (let i = 0; i < daysInMonth; i++) {
    result.push(start.add(i, 'day').toDate());
  }

  while (result.length % 7 !== 0) {
    result.push(null);
  }

  return result;
};

export const isSameDay = (d1: Date | string, d2: Date | string): boolean => {
  return dayjs(d1).isSame(dayjs(d2), 'day');
};

export const isToday = (date: Date | string): boolean => {
  return dayjs(date).isSame(dayjs(), 'day');
};

export const isFuture = (date: Date | string): boolean => {
  return dayjs(date).isAfter(dayjs(), 'day');
};

export const isPast = (date: Date | string): boolean => {
  return dayjs(date).isBefore(dayjs(), 'day');
};

export const addDays = (date: Date | string, n: number): string => {
  return dayjs(date).add(n, 'day').format('YYYY-MM-DD');
};

export const diffDays = (start: string | Date, end: string | Date): number => {
  return dayjs(end).diff(dayjs(start), 'day');
};

export const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export const TIME_SLOTS = [
  { id: 'morning', label: '上午 (09:00-12:00)', startTime: '09:00', endTime: '12:00' },
  { id: 'afternoon', label: '下午 (13:00-18:00)', startTime: '13:00', endTime: '18:00' },
  { id: 'evening', label: '晚间 (18:00-21:00)', startTime: '18:00', endTime: '21:00' },
  { id: 'fullday', label: '全天', startTime: '09:00', endTime: '21:00' },
];
