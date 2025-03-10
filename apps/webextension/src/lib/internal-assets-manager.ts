import { SvelteSet } from 'svelte/reactivity';
import { Opfs, OpfsSchema } from './opfs';

export class InternalAssetsManager {
  #internalAssets: SvelteSet<string>;

  constructor(internalAssets: string[]) {
    this.#internalAssets = new SvelteSet(internalAssets);
  }

  get internalAssets(): ReadonlySet<string> {
    return this.#internalAssets;
  }

  async addAsset(opfsPath: string, data: Exclude<ArrayBufferLike, SharedArrayBuffer> | Blob) {
    if (!opfsPath.startsWith(`${OpfsSchema}://`)) {
      opfsPath = `${OpfsSchema}://${opfsPath}`;
    }
    await Opfs.save(opfsPath, data);
    this.#internalAssets.add(opfsPath);
    return opfsPath;
  }

  async removeAsset(opfsUrl: string) {
    if (await Opfs.isAvailable()) {
      Opfs.remove(opfsUrl);
    }
    this.#internalAssets.delete(opfsUrl);
  }
}
