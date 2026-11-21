'use client';

import { useLayoutEffect, useRef } from 'react';

export const useAnnualChartTooltip = (activeIndex: number | null, pointCount: number, enabled = true) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const viewport = viewportRef.current;
    const chart = chartRef.current;
    const tooltip = tooltipRef.current;
    const view = wrapper?.ownerDocument.defaultView;
    if (!enabled || activeIndex === null || !pointCount || !wrapper || !viewport || !chart || !tooltip || !view) return;

    const updatePosition = () => {
      const wrapperBounds = wrapper.getBoundingClientRect();
      const viewportBounds = viewport.getBoundingClientRect();
      const chartBounds = chart.getBoundingClientRect();
      const anchor = chartBounds.left + ((activeIndex + 0.5) / pointCount) * chartBounds.width;
      const visibleLeft = Math.max(viewportBounds.left, 0);
      const visibleRight = Math.min(viewportBounds.right, view.innerWidth);

      if (anchor < visibleLeft || anchor > visibleRight) {
        tooltip.style.visibility = 'hidden';
        return;
      }

      const gap = 8;
      const margin = 4;
      const width = tooltip.offsetWidth;
      const preferredLeft = anchor + gap + width <= visibleRight - margin ? anchor + gap : anchor - gap - width;
      const left = Math.max(visibleLeft + margin, Math.min(preferredLeft, visibleRight - margin - width));
      tooltip.style.left = `${left - wrapperBounds.left}px`;
      tooltip.style.visibility = 'visible';
    };

    updatePosition();
    viewport.addEventListener('scroll', updatePosition, { passive: true });
    view.addEventListener('resize', updatePosition);
    const observer = new ResizeObserver(updatePosition);
    observer.observe(viewport);
    observer.observe(chart);
    observer.observe(tooltip);
    return () => {
      viewport.removeEventListener('scroll', updatePosition);
      view.removeEventListener('resize', updatePosition);
      observer.disconnect();
    };
  }, [activeIndex, pointCount, enabled]);

  return { wrapperRef, viewportRef, chartRef, tooltipRef };
};
