import { redirect } from 'next/navigation';

import { SETTING_MENUS, buildPreviewHref, extractPreviewQuery, type SettingTabKey } from '@/previews/settings/settings-model';
import type { PreviewSearchParams } from '@/workbench/PreviewEntry';

type SettingsSearchParams = Promise<Awaited<PreviewSearchParams> & { tab?: string }>;

const VALID_TABS = new Set<SettingTabKey>(SETTING_MENUS.map((menu) => menu.value));

export default async function SettingsRedirectPage({ searchParams }: { searchParams: SettingsSearchParams }) {
  const resolved = await searchParams;
  const targetTab: SettingTabKey = resolved.tab && VALID_TABS.has(resolved.tab as SettingTabKey) ? (resolved.tab as SettingTabKey) : 'assets';
  const previewQuery = extractPreviewQuery(resolved);
  redirect(buildPreviewHref(`/preview/settings/${targetTab}`, previewQuery));
}
