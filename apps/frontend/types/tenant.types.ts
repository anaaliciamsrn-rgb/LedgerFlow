export interface TenantTheme {
  readonly primaryColor: string;
  readonly accentColor: string;
}

export interface Tenant {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly logoUrl: string | null;
  readonly theme: TenantTheme;
}