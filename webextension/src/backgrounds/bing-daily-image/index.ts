import { Lazy } from '$lib/lazy';
import type { BackgroundCatalogItem } from '$stores/background-catalog';
import * as m from '$i18n/messages';

export const Background: BackgroundCatalogItem = {
  name: m.Backgrounds_BingDaily_Name,
  components: {
    provider: new Lazy(() => import('./provider').then(r => r.BingDailyImageBackgroundProvider)),
    settings: {
      component: new Lazy(() => import('./settings.svelte').then(r => r.default)),
      model: new Lazy(() => import('./settings').then(r => r.Settings)),
    },
  },
  settings: {
    type: 'bing-daily-image',
  },
};