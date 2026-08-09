import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { MobileProofError } from '../errors.js';
import type { MobileProofAdapterV1 } from '../types.js';

export async function loadAdapter(adapterPath: string | undefined, baseDirectory: string): Promise<MobileProofAdapterV1> {
  if (!adapterPath) return { apiVersion: 1 };
  const absolute = path.resolve(baseDirectory, adapterPath);
  const module = await import(pathToFileURL(absolute).href) as { default?: MobileProofAdapterV1 };
  if (!module.default || module.default.apiVersion !== 1) {
    throw new MobileProofError(`Adapter must export MobileProofAdapterV1: ${absolute}`, 'configuration');
  }
  return module.default;
}

export function defineAdapter(adapter: MobileProofAdapterV1): MobileProofAdapterV1 {
  return adapter;
}
