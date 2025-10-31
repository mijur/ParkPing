export const getToday = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

export const getTomorrow = (): Date => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
};

export const toYYYYMMDD = (date: Date): string => {
  // Use local date parts to avoid UTC conversion from toISOString()
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() is zero-based
  const day = date.getDate();

  const monthStr = month < 10 ? '0' + month : String(month);
  const dayStr = day < 10 ? '0' + day : String(day);

  return `${year}-${monthStr}-${dayStr}`;
};

export const parseYYYYMMDD = (dateString: string): Date => {
  // Handles 'YYYY-MM-DD' and creates a Date object at midnight in the local timezone,
  // avoiding UTC conversion issues with new Date('YYYY-MM-DD').
  const parts = dateString.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day);
};