'use client';

import { dialog } from '@repo/ui-composition';
import { Button } from '@repo/ui-core';

export const TestButton = () => {
  const handleClick = async () => {
    await dialog.alert({
      title: '알림 테스트',
      description: 'CommonDialog alert 동작을 확인합니다.',
      confirmText: '확인'
    });
  };

  return (
    <Button variant="primary" size="lg" onClick={handleClick}>
      Click me!
    </Button>
  );
};
