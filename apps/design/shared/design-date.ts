const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const todayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export const isFutureTransactionDate = (date: Date): boolean => dateKey(date) > todayKey();
export const isPastTransactionDate = (date: Date): boolean => dateKey(date) < todayKey();
