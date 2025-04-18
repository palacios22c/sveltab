import { ImageBackgroundProviderBase } from '$backgrounds/common-image/provider-base';
import { logger } from '$lib/logger';
import { storage } from '$stores/storage';
import type { Settings } from './settings';
import { isToday, secondsToMilliseconds } from 'date-fns';
import { getImageCdnUrl, updateImageCdnUrl } from '$lib/cdn';
import pDebounce from 'p-debounce';
import { observeScreenResolution } from '$lib/screen-resolution-observer';
import { skipFirstRun } from '$lib/function-utils';

const LocalSettingsKey = 'WikimediaCommonsPodBackgroundProvider_LocalSettings';
const log = logger.getSubLogger({ prefix: ['Backgrounds', 'Wikimedia Commons POD', 'Provider'] });

interface LocalSettings {
  lastChangedTime: number;
}

export class WikimediaCommonsPodBackgroundProvider extends ImageBackgroundProviderBase<Settings> {
  #localSettings: LocalSettings | undefined;
  #unsubscribe!: () => void;

  constructor(node: HTMLElement, settings: Settings) {
    super(node, settings, 'wikimedia-commons-pod');
  }

  get canGoNext() {
    return false;
  }

  async apply(abortSignal: AbortSignal) {
    await super.apply(abortSignal);
    this.#localSettings = <LocalSettings>(await storage.local.get(LocalSettingsKey))[LocalSettingsKey] || {
      lastChangedTime: 0,
    };

    const updateDeb = pDebounce(() => this.#update(abortSignal), secondsToMilliseconds(1));
    const screenResolutionUnsubscribe = observeScreenResolution(updateDeb);
    const resizeTypeUnsubscribe = this.settings.resizeType.subscribe(skipFirstRun(updateDeb));

    this.#unsubscribe = () => {
      screenResolutionUnsubscribe();
      resizeTypeUnsubscribe();
    };

    await this.#update(abortSignal);
  }

  forceUpdate(abortSignal: AbortSignal): void {
    this.#localSettings!.lastChangedTime = 0;
    this.#update(abortSignal);
  }

  readonly #update = pDebounce.promise(async (abortSignal: AbortSignal) => {
    if (abortSignal.aborted) {
      return;
    }
    this.setImage(updateImageCdnUrl(this.history.current, 'screen', 'screen', this.settings.resizeType.value));
    if (navigator.onLine && (!isToday(this.#localSettings!.lastChangedTime) || !this.history.current)) {
      try {
        const now = new Date();
        const year = String(now.getFullYear());
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        const response = await fetch(
          `https://api.wikimedia.org/feed/v1/wikipedia/en/featured/${year}/${month}/${day}`,
          { signal: abortSignal },
        ).then(r => r.json());
        if (!response?.image?.image?.source) {
          throw new Error('Unexpected response');
        }
        this.#localSettings!.lastChangedTime = now.valueOf();
        const newSrc = await getImageCdnUrl(
          response.image.image.source,
          'screen',
          'screen',
          this.settings.resizeType.value,
        );
        await storage.local.set({ [LocalSettingsKey]: this.#localSettings });
        if (abortSignal.aborted) {
          return;
        }

        this.setImage(updateImageCdnUrl(newSrc, 'screen', 'screen', this.settings.resizeType.value), true);
      } catch (e) {
        log.warn(e);
      }
    }
  });

  async destroy() {
    await super.destroy();
    this.#unsubscribe();
  }
}
