import { Button, Tooltip, TooltipContent, TooltipTrigger, type ButtonProps } from '@repo/ui-core';
import { RotateCcw } from 'lucide-react';

type FilterResetButtonProps = {
  onClick: ButtonProps['onClick'];
};

export const FilterResetButton = ({ onClick }: FilterResetButtonProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button type="button" variant="ghost" size="icon" aria-label="필터 초기화" onClick={onClick} className="shrink-0 text-muted-foreground hover:text-foreground">
        <RotateCcw aria-hidden="true" />
      </Button>
    </TooltipTrigger>
    <TooltipContent side="top">필터 초기화</TooltipContent>
  </Tooltip>
);
