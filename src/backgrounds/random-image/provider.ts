import { ImageBackgroundProviderBase } from '$backgrounds/common-image/provider-base';
import type { Storage } from 'webextension-polyfill';
import { getStorage } from '$stores/storage';
import type { Settings } from './settings';

const LocalSettingsKey = 'RandomImageBackgroundProvider_LocalSettings';

interface LocalSettings {
  lastChangedTime: number;
  lastUrl: string;
  lastSearchTerm: string;
}

export class RandomImageBackgroundProvider extends ImageBackgroundProviderBase {
  #interval: any;
  #lastSettings: Settings | undefined;
  #localSettings: LocalSettings | undefined;
  constructor(node: HTMLElement) {
    super(node);
    this.#interval = setInterval(() => {
      if (this.#lastSettings) {
        this.update(this.#lastSettings);
      }
    }, 60000);
  }

  async update(settings: Settings, forceUpdate?: boolean) {
    this.#lastSettings = settings;
    if (!this.#localSettings) {
      const storage = await getStorage();
      this.#localSettings = (await storage.local.get(LocalSettingsKey))[LocalSettingsKey] || {
        lastChangedTime: 0,
        lastUrl: '',
      };
    }
    const timeSinceLastChange = (new Date().valueOf() - this.#localSettings!.lastChangedTime) / 1000;
    if (
      timeSinceLastChange >= settings.updateInterval ||
      this.#localSettings!.lastSearchTerm !== settings.searchTerms ||
      forceUpdate === true
    ) {
      try {
        const response = await fetch(
          `https://source.unsplash.com/random/${window.innerWidth}×${window.innerHeight}/?${settings.searchTerms}`,
          { method: 'head' },
        );
        this.#localSettings!.lastUrl = response.url;
        this.#localSettings!.lastChangedTime = new Date().valueOf();
        this.#localSettings!.lastSearchTerm = settings.searchTerms;
        const storage = await getStorage();
        await storage.local.set({ [LocalSettingsKey]: this.#localSettings });
      } catch (e) {
        console.warn(this, '->', e);
      }
    }
    this.setImage({ url: this.#localSettings!.lastUrl, blur: settings.blur });
  }

  destroy() {
    super.destroy();
    clearInterval(this.#interval);
  }
}