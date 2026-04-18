export interface AssetBinding {
  fetch(request: Request): Promise<Response>;
}

export interface EdgeEnv {
  APP_BASE_URL: string;
  APP_ENV: string;
  ASSETS?: AssetBinding;
  DB?: unknown;
}
