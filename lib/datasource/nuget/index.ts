import { logger } from '../../logger';
import { parseUrl } from '../../util/url';
import * as nugetVersioning from '../../versioning/nuget';
import type { GetReleasesConfig, ReleaseResult } from '../types';
import * as v2 from './v2';
import * as v3 from './v3';

export { id } from './common';

export const customRegistrySupport = true;
export const defaultRegistryUrls = [v3.getDefaultFeed()];
export const defaultVersioning = nugetVersioning.id;
export const registryStrategy = 'merge';

export function parseRegistryUrl(
  registryUrl: string
): { feedUrl: string; protocolVersion: number } {
  const parsedUrl = parseUrl(registryUrl);
  if (!parsedUrl) {
    logger.debug(
      { urL: registryUrl },
      `nuget registry failure: can't parse ${registryUrl}`
    );
    return { feedUrl: registryUrl, protocolVersion: null };
  }
  let protocolVersion = 2;
  const protocolVersionRegExp = /#protocolVersion=(2|3)/;
  const protocolVersionMatch = protocolVersionRegExp.exec(parsedUrl.hash);
  if (protocolVersionMatch) {
    parsedUrl.hash = '';
    protocolVersion = Number.parseInt(protocolVersionMatch[1], 10);
  } else if (parsedUrl.pathname.endsWith('.json')) {
    protocolVersion = 3;
  }
  return {
    feedUrl: parsedUrl.href,
    protocolVersion,
  };
}

export async function getReleases({
  lookupName,
  registryUrl,
}: GetReleasesConfig): Promise<ReleaseResult> {
  logger.trace(`nuget.getReleases(${lookupName})`);
  const { feedUrl, protocolVersion } = parseRegistryUrl(registryUrl);
  if (protocolVersion === 2) {
    return v2.getReleases(feedUrl, lookupName);
  }
  if (protocolVersion === 3) {
    const queryUrl = await v3.getResourceUrl(feedUrl);
    if (queryUrl) {
      return v3.getReleases(feedUrl, queryUrl, lookupName);
    }
  }
  return null;
}
