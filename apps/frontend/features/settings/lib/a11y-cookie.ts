import {
  DEFAULT_A11Y_PREFERENCES,
  type A11yPreferences,
  type Density,
  type FontScale,
} from '@/features/settings/types/a11y.types';

const FONT_SCALES: readonly FontScale[] = ['sm', 'base', 'lg'];
const DENSITIES: readonly Density[] = ['compact', 'normal', 'comfortable'];

function isFontScale(value: unknown): value is FontScale {
  return typeof value === 'string' && FONT_SCALES.includes(value as FontScale);
}

function isDensity(value: unknown): value is Density {
  return typeof value === 'string' && DENSITIES.includes(value as Density);
}

export function parseA11yCookie(raw: string | undefined): A11yPreferences {
  if (!raw) {
    return DEFAULT_A11Y_PREFERENCES;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return DEFAULT_A11Y_PREFERENCES;
    }
    const record = parsed as Record<string, unknown>;
    return {
      highContrast: typeof record.highContrast === 'boolean' ? record.highContrast : DEFAULT_A11Y_PREFERENCES.highContrast,
      reducedMotion: typeof record.reducedMotion === 'boolean' ? record.reducedMotion : DEFAULT_A11Y_PREFERENCES.reducedMotion,
      fontScale: isFontScale(record.fontScale) ? record.fontScale : DEFAULT_A11Y_PREFERENCES.fontScale,
      density: isDensity(record.density) ? record.density : DEFAULT_A11Y_PREFERENCES.density,
    };
  } catch {
    return DEFAULT_A11Y_PREFERENCES;
  }
}

export function a11yClassNames(preferences: A11yPreferences): string {
  return [
    preferences.highContrast ? 'a11y-high-contrast' : '',
    preferences.reducedMotion ? 'a11y-reduced-motion' : '',
    `a11y-font-${preferences.fontScale}`,
    `a11y-density-${preferences.density}`,
  ]
    .filter(Boolean)
    .join(' ');
}
