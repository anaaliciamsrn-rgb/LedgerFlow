export type FontScale = 'sm' | 'base' | 'lg';
export type Density = 'compact' | 'normal' | 'comfortable';

export interface A11yPreferences {
  readonly highContrast: boolean;
  readonly reducedMotion: boolean;
  readonly fontScale: FontScale;
  readonly density: Density;
}

export const DEFAULT_A11Y_PREFERENCES: A11yPreferences = {
  highContrast: false,
  reducedMotion: false,
  fontScale: 'base',
  density: 'normal',
};

export const A11Y_COOKIE_NAME = 'lf_a11y';
