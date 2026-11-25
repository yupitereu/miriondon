'use client';

import { Button, cn, Icon, MoonIcon, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SunIcon } from '@repo/ui-core';
import { Columns4, ExternalLink, Maximize2, Minimize2, Monitor, RotateCw, Smartphone, Square, Tablet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { MiriondonSymbol, MiriondonWordmark } from '@/shared/BrandLogo';
import { COMPARE_VIEWPORT_IDS, DEFAULT_PREVIEW_ROUTE, PREVIEW_ROUTES, VIEWPORT_PRESETS, type ViewportPreset } from '@/workbench/preview-routes';

type Theme = 'light' | 'dark';
type ViewMode = 'compare' | 'single';

type DesignWorkbenchProps = {
  initialTheme: Theme;
  initialRouteId?: string;
  initialViewportMode?: string;
};

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const COMPARE_GAP = 16;

const applyThemeToDocument = (doc: Document, theme: Theme) => {
  doc.documentElement.classList.toggle('dark', theme === 'dark');
  doc.documentElement.style.colorScheme = theme;
};

const VIEWPORT_ICON: Record<ViewportPreset['id'], typeof Smartphone> = {
  '320': Smartphone,
  '375': Smartphone,
  '768': Tablet,
  '1280': Monitor
};

const parseInitialViewport = (value: string | undefined): { viewMode: ViewMode; fixedWidth: number | null } => {
  if (!value || value === 'compare') {
    return { viewMode: 'compare', fixedWidth: null };
  }
  if (value === 'single' || value === 'full') {
    return { viewMode: 'single', fixedWidth: null };
  }
  const preset = VIEWPORT_PRESETS.find((item) => item.id === value);
  if (preset) {
    return { viewMode: 'single', fixedWidth: preset.width };
  }
  return { viewMode: 'compare', fixedWidth: null };
};

export const DesignWorkbench = ({ initialTheme, initialRouteId, initialViewportMode }: DesignWorkbenchProps) => {
  const router = useRouter();
  const resolvedInitialRouteId = PREVIEW_ROUTES.some((route) => route.id === initialRouteId) ? (initialRouteId as string) : DEFAULT_PREVIEW_ROUTE.id;
  const initialVp = parseInitialViewport(initialViewportMode);

  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [routeId, setRouteId] = useState<string>(resolvedInitialRouteId);
  const [viewMode, setViewMode] = useState<ViewMode>(initialVp.viewMode);
  const [fixedWidth, setFixedWidth] = useState<number | null>(initialVp.fixedWidth);
  const [compareFit, setCompareFit] = useState<boolean>(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [mainSize, setMainSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const mainRef = useRef<HTMLElement | null>(null);
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});

  const activeRoute = PREVIEW_ROUTES.find((route) => route.id === routeId) ?? DEFAULT_PREVIEW_ROUTE;

  useEffect(() => {
    const element = mainRef.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      setMainSize({
        width: element.clientWidth,
        height: element.clientHeight
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const vpParam = viewMode === 'compare' ? 'compare' : fixedWidth === null ? 'single' : String(fixedWidth);
    if (url.searchParams.get('vp') === vpParam) {
      return;
    }
    url.searchParams.set('vp', vpParam);
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
  }, [fixedWidth, viewMode]);

  const syncIframeTheme = useCallback((targetTheme: Theme) => {
    Object.values(iframeRefs.current).forEach((frame) => {
      try {
        if (frame?.contentDocument) {
          applyThemeToDocument(frame.contentDocument, targetTheme);
        }
      } catch {
        // Ignore cross-origin frame access if an external URL is ever loaded.
      }
    });
  }, []);

  const handleToggleTheme = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyThemeToDocument(document, nextTheme);
    document.cookie = `theme=${nextTheme}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    syncIframeTheme(nextTheme);
  };

  const handleIframeLoad = (key: string) => {
    const frame = iframeRefs.current[key];
    try {
      if (frame?.contentDocument) {
        applyThemeToDocument(frame.contentDocument, theme);
      }
    } catch {
      // Ignore cross-origin frame access.
    }
  };

  const handleSelectRoute = (nextRouteId: string) => {
    const target = PREVIEW_ROUTES.find((route) => route.id === nextRouteId);
    if (!target) {
      return;
    }
    setRouteId(target.id);
    const url = new URL(window.location.href);
    const vpParam = viewMode === 'compare' ? 'compare' : fixedWidth === null ? 'single' : String(fixedWidth);
    url.searchParams.delete('route');
    url.searchParams.set('vp', vpParam);
    router.push(`${target.path}?${url.searchParams.toString()}`);
  };

  const handleSelectSingleBrowser = () => {
    setViewMode('single');
    setFixedWidth(null);
  };

  const handleSelectPresetWidth = (width: number) => {
    setViewMode('single');
    setFixedWidth(width);
  };

  const compareViewports = VIEWPORT_PRESETS.filter((preset) => COMPARE_VIEWPORT_IDS.includes(preset.id));
  const compareGapWidth = Math.max(0, compareViewports.length - 1) * COMPARE_GAP;
  const compareFramesWidth = compareViewports.reduce((acc, vp) => acc + vp.width, 0);
  const availableWidth = Math.max(320, mainSize.width - 40);
  const availableHeight = Math.max(540, mainSize.height - 68);
  const compareScale = viewMode === 'compare' && compareFit && mainSize.width > 0 && compareFramesWidth > 0 ? Math.min(1, Math.max(0.25, (availableWidth - compareGapWidth) / compareFramesWidth)) : 1;
  const compareLogicalHeight = compareScale < 1 ? Math.round(availableHeight / compareScale) : availableHeight;

  const isBrowserSizedSingle = viewMode === 'single' && fixedWidth === null;
  const embedSrc = `${activeRoute.path}?embed=1`;
  const standaloneHref = `${activeRoute.path}?standalone=1`;

  return (
    <div className="flex h-dvh flex-col bg-muted/40">
      <header className="sticky top-0 z-40 shrink-0 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <MiriondonSymbol className="size-7 shrink-0" />
              <MiriondonWordmark size="sm" />
              <span className="text-xs font-semibold text-muted-foreground">Design</span>
            </div>

            <div className="w-48">
              <Select value={routeId} onValueChange={handleSelectRoute}>
                <SelectTrigger aria-label="시안 페이지 선택" className="min-h-control-sm h-8 py-1 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PREVIEW_ROUTES.filter((route) => !route.hiddenFromSwitcher).map((route) => (
                    <SelectItem key={route.id} value={route.id}>
                      {route.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <span className="hidden text-xs text-muted-foreground xl:inline">{activeRoute.description}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1 rounded-md border border-border bg-background p-0.5">
              <Button type="button" size="sm" variant={viewMode === 'compare' ? 'primary' : 'ghost'} onClick={() => setViewMode('compare')} className="min-h-7 gap-1 px-2.5 py-1 text-xs">
                <Icon icon={Columns4} size="xs" />
                <span>4단 비교</span>
              </Button>
              <Button type="button" size="sm" variant={isBrowserSizedSingle ? 'primary' : 'ghost'} onClick={handleSelectSingleBrowser} className="min-h-7 gap-1 px-2.5 py-1 text-xs">
                <Icon icon={Square} size="xs" />
                <span>단독 보기</span>
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-background p-0.5">
              {VIEWPORT_PRESETS.map((preset) => {
                const PresetIcon = VIEWPORT_ICON[preset.id];
                const active = viewMode === 'single' && fixedWidth === preset.width;
                return (
                  <Button
                    key={preset.id}
                    type="button"
                    size="sm"
                    variant={active ? 'primary' : 'ghost'}
                    onClick={() => handleSelectPresetWidth(preset.width)}
                    className="min-h-7 gap-1 px-2.5 py-1 text-xs tabular-nums"
                  >
                    <Icon icon={PresetIcon} size="xs" />
                    <span>{preset.id}</span>
                  </Button>
                );
              })}
            </div>

            {viewMode === 'compare' && (
              <Button type="button" size="sm" variant="outline" onClick={() => setCompareFit((prev) => !prev)} className="min-h-8 gap-1 px-2.5 text-xs tabular-nums" aria-label="비교 배율 전환">
                <Icon icon={compareFit ? Minimize2 : Maximize2} size="xs" />
                <span>{compareFit ? `한눈에 ${Math.round(compareScale * 100)}%` : '1:1 원본'}</span>
              </Button>
            )}

            <Button type="button" size="sm" variant="outline" onClick={handleToggleTheme} className="min-h-8 gap-1.5 px-2.5 text-xs" aria-label="테마 전환" aria-pressed={theme === 'dark'}>
              {theme === 'dark' ? <SunIcon size="sm" /> : <MoonIcon size="sm" />}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </Button>

            <Button type="button" size="sm" variant="outline" onClick={() => setReloadKey((prev) => prev + 1)} aria-label="프리뷰 새로고침" className="min-h-8 px-2.5">
              <Icon icon={RotateCw} size="sm" />
            </Button>

            <Button asChild size="sm" variant="outline" className="min-h-8 gap-1 px-2.5 text-xs">
              <a href={standaloneHref} target="_blank" rel="noopener noreferrer">
                <span>새 탭</span>
                <Icon icon={ExternalLink} size="xs" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main ref={mainRef} className={cn('min-h-0 flex-1 overflow-auto', isBrowserSizedSingle ? 'p-0' : 'p-4')}>
        {viewMode === 'compare' ? (
          <div className="mx-auto flex w-max items-start justify-center gap-4">
            {compareViewports.map((vp) => {
              const frameKey = `${activeRoute.id}-${vp.id}-${reloadKey}`;
              const isScaledCompare = compareScale < 1;
              const boxWidth = Math.round(vp.width * compareScale);
              const boxHeight = isScaledCompare ? Math.round(compareLogicalHeight * compareScale) : availableHeight;

              return (
                <section key={vp.id} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2 px-1 text-xs font-medium text-muted-foreground tabular-nums">
                    <button
                      type="button"
                      onClick={() => handleSelectPresetWidth(vp.width)}
                      className="font-semibold text-foreground transition-colors hover:text-primary"
                      title={`${vp.label} 고정 폭으로 보기`}
                    >
                      {vp.label}
                    </button>
                    <span className="truncate">{activeRoute.path}</span>
                  </div>
                  <div
                    className="shrink-0 overflow-hidden rounded-xl bg-background shadow-sm ring-1 ring-border-strong"
                    style={{
                      width: `${boxWidth}px`,
                      height: `${boxHeight}px`
                    }}
                  >
                    <iframe
                      key={frameKey}
                      ref={(el) => {
                        iframeRefs.current[vp.id] = el;
                      }}
                      title={`${activeRoute.label} (${vp.label})`}
                      src={embedSrc}
                      onLoad={() => handleIframeLoad(vp.id)}
                      className="border-0 bg-background"
                      style={
                        isScaledCompare
                          ? {
                              width: `${vp.width}px`,
                              height: `${compareLogicalHeight}px`,
                              transform: `scale(${compareScale})`,
                              transformOrigin: 'top left'
                            }
                          : {
                              width: '100%',
                              height: '100%'
                            }
                      }
                    />
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className={cn('flex h-full flex-col items-center', isBrowserSizedSingle ? 'w-full' : 'mx-auto w-max min-w-full')}>
            <div
              className={cn('h-full overflow-hidden bg-background transition-[width] duration-300 ease-out', isBrowserSizedSingle ? 'w-full' : 'rounded-xl shadow-sm ring-1 ring-border-strong')}
              style={fixedWidth !== null ? { width: `${fixedWidth}px` } : undefined}
            >
              <iframe
                key={`${activeRoute.id}-single-${reloadKey}`}
                ref={(el) => {
                  iframeRefs.current.single = el;
                }}
                title={`${activeRoute.label} (단독 보기)`}
                src={embedSrc}
                onLoad={() => handleIframeLoad('single')}
                className="size-full border-0 bg-background"
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
