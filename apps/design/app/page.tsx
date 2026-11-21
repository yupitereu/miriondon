import { cookies } from 'next/headers';

import { DesignWorkbench } from '@/workbench/DesignWorkbench';

type HomeSearchParams = Promise<{
  route?: string;
  vp?: string;
}>;

export default async function DesignHomePage({ searchParams }: { searchParams: HomeSearchParams }) {
  const resolved = await searchParams;
  const theme = (await cookies()).get('theme')?.value === 'dark' ? 'dark' : 'light';

  return <DesignWorkbench initialTheme={theme} initialRouteId={resolved.route} initialViewportMode={resolved.vp} />;
}
