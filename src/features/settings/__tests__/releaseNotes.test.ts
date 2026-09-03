import { describe, expect, it } from '@jest/globals';

import appConfig from '../../../../app.json';
import packageConfig from '../../../../package.json';
import { RELEASE_NOTES } from '@/features/settings/releaseNotes';

describe('releaseNotes', () => {
  it('keeps the latest release note and app versions synchronized', () => {
    expect(RELEASE_NOTES[0].version).toBe(appConfig.expo.version);
    expect(RELEASE_NOTES[0].version).toBe(packageConfig.version);
  });
});
