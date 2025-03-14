<script lang="ts">
  import { ProgressRadial, type PopupSettings, popup, RangeSlider } from '@skeletonlabs/skeleton';
  import VirtualScroll from 'svelte-virtual-scroll-list';
  import { debounce, type DebounceOptions } from 'svelte-use-debounce';
  import ColorPicker, { ColorPickerLayout } from './color-picker.svelte';
  import * as m from '$i18n/messages';
  import { nanoid } from 'nanoid/non-secure';
  import type { FontSettings } from '$lib/widget-settings';
  import { fontsource } from '$actions/fontsource';
  import { FontWeight, type FontList } from '$lib/fontsource';
  import { onMount } from 'svelte';

  type FontInfo = { label: string; id: string; searchIndex: string; weights: number[]; styles: string[] };

  let { color = $bindable(), font }: { color?: string | null; font: FontSettings } = $props();

  const { id: fontId, weight, size } = font;

  let selectedFontInfo: FontInfo | undefined = $state();
  $effect(() => {
    if (selectedFontInfo && (!weight || !selectedFontInfo.weights.includes(weight.value))) {
      weight.value = selectedFontInfo.weights[0];
    }
  });

  const fonts: Promise<FontInfo[]> = fetch('https://api.fontsource.org/v1/fonts')
    .then<FontList>(r => r.json())
    .then(r =>
      r
        .filter(f => f.type !== 'icons')
        .map(
          f =>
            <FontInfo>{
              label: f.family,
              id: f.id,
              searchIndex: f.family.toLowerCase(),
              weights: f.weights,
              styles: f.styles,
            },
        ),
    );

  const fontWeightsMap = new Map<FontWeight, () => string>([
    [FontWeight.Thin, m.FontSelector_Weight_Thin],
    [FontWeight.ExtraLight, m.FontSelector_Weight_ExtraLight],
    [FontWeight.Light, m.FontSelector_Weight_Light],
    [FontWeight.Normal, m.FontSelector_Weight_Normal],
    [FontWeight.Medium, m.FontSelector_Weight_Medium],
    [FontWeight.SemiBold, m.FontSelector_Weight_SemiBold],
    [FontWeight.Bold, m.FontSelector_Weight_Bold],
    [FontWeight.ExtraBold, m.FontSelector_Weight_ExtraBold],
    [FontWeight.Heavy, m.FontSelector_Weight_Heavy],
  ]);

  let searchValue = $state('');
  let fontList: VirtualScroll | undefined = $state();
  let fontSelectVisible: boolean = $state(false);

  let debounceOpts: DebounceOptions = {
    ms: 500,
    callback: async str => {
      if (str && fontList) {
        const loadedFonts = await fonts;
        const normalizedStr = str.toLowerCase();
        const index = loadedFonts.findIndex(f => f.searchIndex.startsWith(normalizedStr));
        if (index >= 0) {
          fontList.scrollToIndex(index);
        }
      }
    },
  };

  let popupSettings: PopupSettings = {
    event: 'focus-click',
    target: `FontSelect_PopupAutocomplete_${nanoid()}`,
    placement: 'bottom',
    middleware: {
      flip: {
        fallbackAxisSideDirection: 'start',
      },
    },
    state: v => {
      const needToScroll = v.state && !fontSelectVisible;
      fontSelectVisible = v.state;
      if (needToScroll) {
        scrollToCurrent();
      }
    },
  };

  function onSelected(e: FontInfo) {
    selectedFontInfo = e;
    searchValue = e.label;
    fontId.value = e.id;
    if (weight && !e.weights.includes(weight.value)) {
      weight.value = e.weights[0];
    }
  }

  async function scrollToCurrent() {
    if (font) {
      const loadedFonts = await fonts;
      const index = loadedFonts.findIndex(f => f.id == fontId.value);
      if (index >= 0 && fontList) {
        fontList.scrollToIndex(index);
      }
    }
  }

  onMount(async () => {
    if (font) {
      const loadedFonts = await fonts;
      const index = loadedFonts.findIndex(f => f.id == fontId.value);
      if (index >= 0) {
        selectedFontInfo = loadedFonts[index];
        searchValue = selectedFontInfo.label;
      }
    }
  });
</script>

{#await fonts}
  <ProgressRadial width="w-12 ml-[auto] mr-[auto]" />
{:then fontsResult}
  <div class="relative">
    <div class="contents">
      <div
        class="input-group input-group-divider"
        class:grid-cols-[auto_1fr_auto]={!!color}
        class:grid-cols-[1fr_auto]={!color}>
        {#if color}
          <div class="input-group-shim !p-[0_20px]"></div>
        {/if}
        <input
          type="search"
          bind:value={searchValue}
          placeholder={m.FontSelector_Search_Placeholder()}
          use:popup={popupSettings}
          use:debounce={debounceOpts} />
        {#if selectedFontInfo}
          <select bind:value={weight.value}>
            {#each selectedFontInfo.weights as w}
              {@const optionTextFn = fontWeightsMap.get(w) || (() => String(w))}
              <option value={w}>{optionTextFn()}</option>
            {/each}
          </select>
        {/if}
      </div>
    </div>
    {#if color}
      <div class="absolute w-6 h-6 !mt-[-32px] !ml-[9px]">
        <ColorPicker bind:color layout={ColorPickerLayout.ButtonPopup} />
      </div>
    {/if}
  </div>
  <div
    class="card w-fit max-w-[100cqw] max-h-[calc(100cqh-16px)] h-fit overflow-y-auto flex"
    tabindex="-1"
    style:visibility={fontSelectVisible ? 'visible' : 'hidden'}
    data-popup={popupSettings.target}>
    <div class="flex p-4 max-h-[inherit]">
      {#if fontSelectVisible}
        <VirtualScroll bind:this={fontList} data={fontsResult} let:data>
          <button
            class="btn {fontId.value === data.id
              ? 'variant-filled'
              : 'variant-soft'} w-full mb-1 rounded-sm fontloading"
            use:fontsource={{
              font: data.id,
              subsets: ['latin'],
              styles: ['normal'],
              weights: [FontWeight.Normal],
              noPreload: true,
            }}
            onclick={() => onSelected(data)}>
            {data.label}
          </button>
        </VirtualScroll>
      {/if}
    </div>
  </div>
  {#if size.value}
    <!-- svelte-ignore -->
    <label class="label mt-2">
      <span>{m.FontSelector_Size()}</span>
      <RangeSlider name="fontSizeSlider" bind:value={size.value} min={5} max={20} step={0.1} />
    </label>
  {/if}
{/await}
