export const formatWon = (amount: number): string => {
  const absFormatted = Math.abs(Math.trunc(amount)).toLocaleString('ko-KR');
  return amount < 0 ? `−${absFormatted}원` : `${absFormatted}원`;
};

export const formatSignedWon = (amount: number): string => {
  const absFormatted = Math.abs(Math.trunc(amount)).toLocaleString('ko-KR');
  if (amount > 0) {
    return `+${absFormatted}원`;
  }
  if (amount < 0) {
    return `−${absFormatted}원`;
  }
  return '0원';
};
