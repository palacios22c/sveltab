import { ImageBackgroundProviderBase } from '$backgrounds/common-image/provider-base';
import debounce from 'debounce';
import type { Settings } from './settings';
import { secondsToMilliseconds } from 'date-fns';
import { skipFirstRun } from '$lib/function-utils';

export class StaticImageBackgroundProvider extends ImageBackgroundProviderBase<Settings> {
  #unsubscribe!: () => void;
  constructor(node: HTMLElement, settings: Settings) {
    super(node, settings, 'static-image');
  }
  get canGoNext() {
    return false;
  }
  async apply(abortSignal: AbortSignal) {
    await super.apply(abortSignal);
    const updateDeb = debounce(() => this.forceUpdate(), secondsToMilliseconds(1));
    this.#unsubscribe = this.settings.url.subscribe(skipFirstRun(updateDeb));
    this.forceUpdate();
  }
  forceUpdate(): void {
    this.setImage(this.settings.url.value);
  }
  async destroy() {
    await super.destroy();
    this.#unsubscribe();
  }
}
