import { cookies } from 'next/headers';

import { DesignWorkbench } from '@/workbench/DesignWorkbench';

export type PreviewSearchParams = Promise<{
  embed?: string;
  standalone?: string;
  vp?: string;
  preset?: string;
}>;

type PreviewEntryProps = {
  routeId: string;
  searchParams: PreviewSearchParams;
  children: React.ReactNode;
};

export const PreviewEntry = async ({ routeId, searchParams, children }: PreviewEntryProps) => {
  const resolved = await searchParams;
  if (resolved.embed === '1' || resolved.standalone === '1') {
    return <>{children}</>;
  }

  const theme = (await cookies()).get('theme')?.value === 'dark' ? 'dark' : 'light';

  return <DesignWorkbench initialTheme={theme} initialRouteId={routeId} initialViewportMode={resolved.vp} />;
};
