import { ImageBackgroundProviderBase } from '$backgrounds/common-image/provider-base';
import { logger } from '$lib/logger';
import { storage } from '$stores/storage';
import pDebounce from 'p-debounce';
import { AnimeTopics, type Settings } from './settings';
import { minutesToMilliseconds, secondsToMilliseconds, millisecondsToSeconds } from 'date-fns';
import { getImageCdnUrl, updateImageCdnUrl } from '$lib/cdn';
import { observeScreenResolution } from '$lib/screen-resolution-observer';

const LocalSettingsKey = 'AnimeImageBackgroundProvider_LocalSettings';
const log = logger.getSubLogger({ prefix: ['Backgrounds', 'Anime Image', 'Provider'] });
const availableTopics = Object.values(AnimeTopics).filter(f => f !== AnimeTopics.Any);

interface LocalSettings {
  lastChangedTime: number;
  lastUrl: string | null | undefined;
  lastTopic: AnimeTopics;
}

export class AnimeImageBackgroundProvider extends ImageBackgroundProviderBase<Settings> {
  #localSettings: LocalSettings | undefined;
  #unsubscribe!: () => void;

  get canGoNext() {
    return true;
  }

  async apply(abortSignal: AbortSignal) {
    super.apply(abortSignal);
    if (!this.#localSettings) {
      this.#localSettings = (await storage.local.get(LocalSettingsKey))[LocalSettingsKey] || {
        lastChangedTime: 0,
        lastUrl: '',
      };
    }

    const interval = setInterval(() => {
      this.#update(abortSignal);
    }, minutesToMilliseconds(1));

    const updateDeb = pDebounce(() => this.#update(abortSignal), secondsToMilliseconds(1));
    const topicUnsubsribe = this.settings.topic.subscribe(() => updateDeb());

    const screenResolutionUnsubscribe = observeScreenResolution(updateDeb);

    this.#unsubscribe = () => {
      clearInterval(interval);
      topicUnsubsribe();
      screenResolutionUnsubscribe();
    };
    this.#update(abortSignal);
  }

  forceUpdate(abortSignal: AbortSignal): void {
    this.#localSettings!.lastChangedTime = 0;
    this.#update(abortSignal);
  }

  async #update(abortSignal: AbortSignal) {
    if (abortSignal.aborted) {
      return;
    }

    this.setImage(updateImageCdnUrl(this.#localSettings!.lastUrl, 'screen', 'screen'));
    const timeSinceLastChange = millisecondsToSeconds(Date.now() - this.#localSettings!.lastChangedTime);
    if (
      timeSinceLastChange >= this.settings.updateInterval.value ||
      this.#localSettings!.lastTopic !== this.settings.topic.value
    ) {
      try {
        const topic =
          this.settings.topic.value === AnimeTopics.Any
            ? availableTopics[Math.floor(Math.random() * availableTopics.length)]
            : this.settings.topic.value;
        const response = await fetch(`https://t.mwm.moe/${topic}/?json`, { signal: abortSignal }).then(r => r.json());
        if (!response?.url) {
          throw new Error('Unexpected response');
        }
        this.#localSettings!.lastUrl = await getImageCdnUrl(response.url, 'screen', 'screen');
        this.#localSettings!.lastChangedTime = Date.now();
        this.#localSettings!.lastTopic = this.settings.topic.value;
        await storage.local.set({ [LocalSettingsKey]: this.#localSettings });

        if (abortSignal.aborted) {
          return;
        }
        this.setImage(updateImageCdnUrl(this.#localSettings!.lastUrl, 'screen', 'screen'));
      } catch (e) {
        log.warn(e);
      }
    }
  }

  destroy() {
    super.destroy();
    this.#unsubscribe();
  }
}
