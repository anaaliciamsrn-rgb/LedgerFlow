import type { Tenant } from '@/types/tenant.types';

export type ThemeCssVariables = Readonly<Record<`--${string}`, string>>;

export function buildTenantCssVariables(tenant: Tenant): ThemeCssVariables {
  return {
    '--primary': tenant.theme.primaryColor,
    '--accent': tenant.theme.accentColor,
    '--ring': tenant.theme.primaryColor,
  };
}

export function cssVariablesToStyle(
  variables: ThemeCssVariables,
): React.CSSProperties {
  return variables as React.CSSProperties;
}