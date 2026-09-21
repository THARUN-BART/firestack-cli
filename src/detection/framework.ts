import path from 'node:path';
import { fileExists, isDirectory, readJsonFile } from '../utils/fs';
import type { FrameworkType, RouterType, EnvPrefix } from '../types';

export interface FrameworkDetectionResult {
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
}

export function detectFramework(
  projectDir: string = process.cwd(),
  dependencies: Record<string, string> = {}
): FrameworkDetectionResult {
  const isTypeScript =
    fileExists(path.join(projectDir, 'tsconfig.json')) ||
    fileExists(path.join(projectDir, 'src', 'index.ts')) ||
    fileExists(path.join(projectDir, 'src', 'App.tsx')) ||
    fileExists(path.join(projectDir, 'app', 'layout.tsx')) ||
    fileExists(path.join(projectDir, 'src', 'app', 'layout.tsx'));

  // Determine source folder (src/ or root or app/)
  let sourceDir = projectDir;
  if (isDirectory(path.join(projectDir, 'src'))) {
    sourceDir = path.join(projectDir, 'src');
  }

  // 1. Next.js
  if (dependencies['next'] || fileExists(path.join(projectDir, 'next.config.js')) || fileExists(path.join(projectDir, 'next.config.mjs')) || fileExists(path.join(projectDir, 'next.config.ts'))) {
    const hasAppRouter =
      isDirectory(path.join(projectDir, 'app')) ||
      isDirectory(path.join(projectDir, 'src', 'app'));

    const hasPagesRouter =
      isDirectory(path.join(projectDir, 'pages')) ||
      isDirectory(path.join(projectDir, 'src', 'pages'));

    const routerType: RouterType = hasAppRouter ? 'app' : hasPagesRouter ? 'pages' : 'app';

    return {
      framework: 'nextjs',
      frameworkDisplayName: `Next.js (${routerType === 'app' ? 'App Router' : 'Pages Router'})`,
      isExpo: false,
      isBareReactNative: false,
      isWebFramework: true,
      isTypeScript,
      sourceDir,
      routerType,
      envPrefix: 'NEXT_PUBLIC_',
      envFileName: '.env.local',
    };
  }

  // 2. Expo
  if (
    dependencies['expo'] ||
    fileExists(path.join(projectDir, 'app.json')) ||
    fileExists(path.join(projectDir, 'app.config.js')) ||
    fileExists(path.join(projectDir, 'app.config.ts'))
  ) {
    const hasExpoRouter =
      !!dependencies['expo-router'] ||
      isDirectory(path.join(projectDir, 'app')) ||
      isDirectory(path.join(projectDir, 'src', 'app'));

    return {
      framework: 'expo',
      frameworkDisplayName: hasExpoRouter ? 'Expo (Expo Router)' : 'Expo',
      isExpo: true,
      isBareReactNative: false,
      isWebFramework: false,
      isTypeScript,
      sourceDir,
      routerType: hasExpoRouter ? 'expo-router' : 'none',
      envPrefix: 'EXPO_PUBLIC_',
      envFileName: '.env',
    };
  }

  // 3. Bare React Native
  if (
    dependencies['react-native'] &&
    !dependencies['expo'] &&
    !dependencies['next']
  ) {
    return {
      framework: 'react-native',
      frameworkDisplayName: 'React Native (Bare)',
      isExpo: false,
      isBareReactNative: true,
      isWebFramework: false,
      isTypeScript,
      sourceDir,
      routerType: 'none',
      envPrefix: '',
      envFileName: '.env',
    };
  }

  // 4. Vite (React, Vue, Svelte, etc.)
  if (
    dependencies['vite'] ||
    fileExists(path.join(projectDir, 'vite.config.js')) ||
    fileExists(path.join(projectDir, 'vite.config.ts')) ||
    fileExists(path.join(projectDir, 'vite.config.mjs'))
  ) {
    const isReact = !!dependencies['react'];
    const isVue = !!dependencies['vue'];
    const isSvelte = !!dependencies['svelte'];
    const label = isReact
      ? 'React (Vite)'
      : isVue
      ? 'Vue (Vite)'
      : isSvelte
      ? 'Svelte (Vite)'
      : 'Vite';

    return {
      framework: 'vite',
      frameworkDisplayName: label,
      isExpo: false,
      isBareReactNative: false,
      isWebFramework: true,
      isTypeScript,
      sourceDir,
      routerType: 'none',
      envPrefix: 'VITE_',
      envFileName: '.env',
    };
  }

  // 5. Remix
  if (dependencies['@remix-run/react'] || dependencies['@remix-run/node']) {
    return {
      framework: 'remix',
      frameworkDisplayName: 'Remix',
      isExpo: false,
      isBareReactNative: false,
      isWebFramework: true,
      isTypeScript,
      sourceDir: isDirectory(path.join(projectDir, 'app')) ? path.join(projectDir, 'app') : sourceDir,
      routerType: 'app',
      envPrefix: '',
      envFileName: '.env',
    };
  }

  // 6. Astro
  if (dependencies['astro']) {
    return {
      framework: 'astro',
      frameworkDisplayName: 'Astro',
      isExpo: false,
      isBareReactNative: false,
      isWebFramework: true,
      isTypeScript,
      sourceDir,
      routerType: 'none',
      envPrefix: 'PUBLIC_',
      envFileName: '.env',
    };
  }

  // 7. SvelteKit
  if (dependencies['@sveltejs/kit']) {
    return {
      framework: 'sveltekit',
      frameworkDisplayName: 'SvelteKit',
      isExpo: false,
      isBareReactNative: false,
      isWebFramework: true,
      isTypeScript,
      sourceDir: isDirectory(path.join(projectDir, 'src')) ? path.join(projectDir, 'src') : projectDir,
      routerType: 'app',
      envPrefix: 'PUBLIC_',
      envFileName: '.env',
    };
  }

  // 8. Nuxt
  if (dependencies['nuxt']) {
    return {
      framework: 'nuxt',
      frameworkDisplayName: 'Nuxt',
      isExpo: false,
      isBareReactNative: false,
      isWebFramework: true,
      isTypeScript,
      sourceDir,
      routerType: 'pages',
      envPrefix: 'NUXT_PUBLIC_',
      envFileName: '.env',
    };
  }

  // 9. Create React App
  if (dependencies['react-scripts']) {
    return {
      framework: 'cra',
      frameworkDisplayName: 'React (Create React App)',
      isExpo: false,
      isBareReactNative: false,
      isWebFramework: true,
      isTypeScript,
      sourceDir,
      routerType: 'none',
      envPrefix: 'REACT_APP_',
      envFileName: '.env',
    };
  }

  // 10. Node.js backend
  if (dependencies['express'] || dependencies['fastify'] || dependencies['@nestjs/core'] || dependencies['koa']) {
    return {
      framework: 'node',
      frameworkDisplayName: 'Node.js Backend',
      isExpo: false,
      isBareReactNative: false,
      isWebFramework: true,
      isTypeScript,
      sourceDir,
      routerType: 'none',
      envPrefix: '',
      envFileName: '.env',
    };
  }

  // 11. Generic Web
  return {
    framework: 'generic',
    frameworkDisplayName: dependencies['react'] ? 'React (Generic)' : 'Web Application',
    isExpo: false,
    isBareReactNative: false,
    isWebFramework: true,
    isTypeScript,
    sourceDir,
    routerType: 'none',
    envPrefix: '',
    envFileName: '.env',
  };
}
