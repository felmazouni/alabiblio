export interface AssetBinding {
  fetch(request: Request): Promise<Response>;
}

export interface EdgeEnv {
  APP_BASE_URL: string;
  APP_ENV: string;
  EMT_CLIENT_ID?: string;
  EMT_PASSKEY?: string;
  ASSETS?: AssetBinding;
  DB?: unknown;
}
