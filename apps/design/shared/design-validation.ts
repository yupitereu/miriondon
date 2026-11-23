import { dialog } from '@repo/ui-composition';

/** 유효성 검증 또는 저장 실패 에러 목록을 공통 알림 다이얼로그로 표시함. */
export const showValidationAlert = (errors: string[], title = '저장할 수 없어요') =>
  dialog.alert({
    title,
    description: errors.length === 1 ? (errors[0] ?? '') : errors.map((err) => `• ${err}`).join('\n')
  });
