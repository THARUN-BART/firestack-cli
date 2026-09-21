export type PackageManager = 'bun' | 'npm' | 'pnpm' | 'yarn';

export type PlatformType = 'android' | 'ios' | 'web';

export type FrameworkType =
  | 'expo'
  | 'react-native'
  | 'nextjs'
  | 'vite'
  | 'cra'
  | 'remix'
  | 'astro'
  | 'sveltekit'
  | 'nuxt'
  | 'node'
  | 'generic';

export type RouterType = 'app' | 'pages' | 'expo-router' | 'none';

export type EnvPrefix =
  | 'NEXT_PUBLIC_'
  | 'VITE_'
  | 'REACT_APP_'
  | 'EXPO_PUBLIC_'
  | '';

export type FirebaseService =
  | 'auth'
  | 'firestore'
  | 'storage'
  | 'database'
  | 'analytics'
  | 'functions';

export interface ProjectInfo {
  rootPath: string;
  framework: FrameworkType;
  frameworkDisplayName: string;
  isExpo: boolean;
  isBareReactNative: boolean;
  isWebFramework: boolean;
  isTypeScript: boolean;
  sourceDir: string;
  routerType: RouterType;
  envPrefix: EnvPrefix;
  envFileName: string;
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
  firebaseWebConfigPath?: string;
  hasEnvFile: boolean;
  envFilePath?: string;
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
  category: 'Project' | 'Android' | 'iOS' | 'Web' | 'Environment' | 'Dependencies';
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  fixAction?: string;
  fixPlatform?: PlatformType | 'all' | 'deps' | 'env';
}

export interface DoctorReport {
  items: DoctorCheckItem[];
  hasFailures: boolean;
  hasWarnings: boolean;
}
