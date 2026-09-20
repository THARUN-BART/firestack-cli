export type PackageManager = 'bun' | 'npm' | 'pnpm' | 'yarn';

export type PlatformType = 'android' | 'ios' | 'web';

export interface ProjectInfo {
  rootPath: string;
  isExpo: boolean;
  isBareReactNative: boolean;
  packageManager: PackageManager;
  hasAndroid: boolean;
  hasIos: boolean;
  androidPackageName?: string;
  iosBundleId?: string;
  appJsonPath?: string;
  packageJsonPath: string;
  installedDependencies: Record<string, string>;
  hasGoogleServicesJson: boolean;
  hasGoogleServiceInfoPlist: boolean;
  hasFirebaseWebConfig: boolean;
}

export interface FirebaseProject {
  projectId: string;
  displayName: string;
  projectNumber?: string;
  state?: string;
}

export interface FirebaseApp {
  appId: string;
  displayName: string;
  platform: 'ANDROID' | 'IOS' | 'WEB';
  packageName?: string;
  bundleId?: string;
  namespace?: string;
}

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface DoctorCheckItem {
  category: 'Project' | 'Android' | 'iOS' | 'Web' | 'Dependencies';
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  fixAction?: string;
  fixPlatform?: PlatformType | 'all' | 'deps';
}

export interface DoctorReport {
  items: DoctorCheckItem[];
  hasFailures: boolean;
  hasWarnings: boolean;
}
