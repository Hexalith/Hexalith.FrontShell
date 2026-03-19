export interface ModuleRoute {
  path: string;
}

export interface ModuleNavigation {
  label: string;
  path: string;
  icon?: string;
  category?: string;
}

export interface ModuleManifestV1 {
  manifestVersion: 1;
  name: string;
  displayName: string;
  version: string;
  routes: ModuleRoute[];
  navigation: ModuleNavigation[];
}

export type ModuleManifest = ModuleManifestV1;
