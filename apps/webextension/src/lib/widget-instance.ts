import {
  WidgetSettings,
  WidgetSettingsExtra,
  type WidgetSettingsExtraInitial,
  type WidgetSettingsInitial,
} from './widget-settings';
import type { WidgetCatalogItem, WidgetCatalogItemComponents } from '$widgets/types';
import { Widgets } from '$widgets/index';
import { logger } from './logger';

const WidgetsIndex = new Map<string, WidgetCatalogItem>(Widgets.map(c => [c.settings.type, c]));

const log = logger.getSubLogger({ prefix: ['Widget Instance:'] });

export class WidgetInstance {
  private constructor(
    catalogItem: WidgetCatalogItem,
    settings: WidgetSettingsInitial,
    extraConstructor: new (initial: WidgetSettingsExtraInitial<any>) => WidgetSettingsExtra,
  ) {
    this.settings = new WidgetSettings(settings, extraConstructor);
    this.components = catalogItem.components;
  }

  static async create(settings: WidgetSettingsInitial) {
    const catalogItem = WidgetsIndex.get(settings.type);
    if (!catalogItem) {
      log.warn('Unknown widget type', settings.type);
      return null;
    }
    const extra = await catalogItem.components.settings.model.value;
    return new WidgetInstance(catalogItem, settings, extra);
  }

  get id() {
    return this.settings.id;
  }
  get htmlElementId() {
    return `widget_${this.id}`;
  }
  readonly components: WidgetCatalogItemComponents;
  readonly settings: WidgetSettings;
}
