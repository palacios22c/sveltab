import type { BackgroundCornerColorChangedEventArgs } from '$actions/dynamic-background';
import { BackgroundProvider } from '$stores/background-catalog';
import type { Settings } from './settings';
import Color from 'color';

export class StaticColorBackgroundProvider extends BackgroundProvider<Settings> {
  #unsubscribe!: () => void;
  get canGoNext() {
    return false;
  }
  apply(): void {
    this.#unsubscribe = this.settings.color.subscribe(() => this.forceUpdate());
  }
  forceUpdate(): void {
    this.node.style.backgroundColor = this.settings.color.value;
    const color = new Color(this.settings.color.value);
    this.node.dispatchEvent(
      new CustomEvent<BackgroundCornerColorChangedEventArgs>('cornerColorChanged', {
        detail: { color: this.settings.color.value, isDark: color.isDark() },
      }),
    );
  }
  destroy(): void {
    this.node.style.backgroundColor = '';
    this.#unsubscribe();
  }
}
