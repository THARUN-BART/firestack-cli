import * as p from '@clack/prompts';
import pc from 'picocolors';
import path from 'node:path';
import fs from 'node:fs';
import { detectProject } from '../detection/project';
import { getInstallCommand } from '../detection/package-manager';
import { runExpoPrebuild } from '../expo/prebuild';
import { checkFirebaseCliInstalled } from '../firebase/cli';
import { checkFirebaseAuth } from '../firebase/auth';
import { listFirebaseProjects, createFirebaseProject } from '../firebase/projects';
import {
  listFirebaseApps,
  createAndroidApp,
  createIosApp,
  createWebApp,
  downloadSdkConfig,
} from '../firebase/apps';
import { configureAndroid } from '../config/android';
import { configureIos } from '../config/ios';
import { configureWeb, parseWebSdkConfig } from '../config/web';
import { writeFrameworkEnvFile } from '../config/env';
import { runCommandStringSync } from '../utils/exec';
import { fileExists, readTextFile } from '../utils/fs';
import type { PlatformType, FirebaseService } from '../types';

export async function runSetupCommand(options: { cwd?: string } = {}) {
  const projectDir = options.cwd || process.cwd();

  p.intro(pc.bgCyan(pc.black(' 🔥 Firebase Setup CLI for Web, React Native & Expo ')));

  // 1. Project Detection
  const spinner = p.spinner();
  spinner.start('Detecting project configuration...');
  const project = detectProject(projectDir);
  spinner.stop('Project analyzed');

  p.log.info(`Framework: ${pc.cyan(pc.bold(project.frameworkDisplayName))}`);
  p.log.info(`Package manager: ${pc.green(project.packageManager)}`);
  p.log.info(`TypeScript: ${project.isTypeScript ? pc.green('yes') : pc.yellow('no')}`);

  if (!project.isWebFramework) {
    p.log.info(
      `Native projects:\n  Android: ${project.hasAndroid ? pc.green('found') : pc.yellow('missing')}\n  iOS: ${
        project.hasIos ? pc.green('found') : pc.yellow('missing')
      }`
    );
  }

  // 2. Expo Prebuild Detection (for Expo projects only)
  if (project.isExpo && (!project.hasAndroid || !project.hasIos)) {
    const shouldPrebuild = await p.confirm({
      message: 'Android/iOS native projects are missing. Run Expo prebuild now?',
      initialValue: true,
    });

    if (p.isCancel(shouldPrebuild)) {
      p.cancel('Setup cancelled.');
      process.exit(0);
    }

    if (shouldPrebuild) {
      spinner.start('Running expo prebuild...');
      const prebuildRes = runExpoPrebuild(projectDir, project.packageManager);
      if (prebuildRes.success) {
        spinner.stop(pc.green('Expo prebuild completed successfully'));
        project.hasAndroid = fileExists(path.join(projectDir, 'android'));
        project.hasIos = fileExists(path.join(projectDir, 'ios'));
      } else {
        spinner.stop(pc.red('Expo prebuild failed: ' + prebuildRes.message));
      }
    } else {
      p.log.message('Skipping Expo prebuild.');
    }
  }

  // 3. Firebase CLI & Auth Detection
  spinner.start('Checking Firebase CLI...');
  const cliCheck = checkFirebaseCliInstalled();
  if (!cliCheck.installed) {
    spinner.stop(pc.red('Firebase CLI is not installed'));
    p.log.error(
      `Please install Firebase CLI first:\n  ${pc.cyan('npm install -g firebase-tools')}`
    );
    p.cancel('Setup aborted.');
    process.exit(1);
  }
  spinner.stop(`Firebase CLI v${cliCheck.version} found`);

  spinner.start('Checking Firebase authentication...');
  const authCheck = checkFirebaseAuth();
  if (!authCheck.authenticated) {
    spinner.stop(pc.red('Firebase authentication missing'));
    p.log.error(
      `You are not logged into Firebase.\nPlease run:\n  ${pc.cyan('firebase login')}\nand run setup again.`
    );
    p.cancel('Setup aborted.');
    process.exit(1);
  }
  spinner.stop(`Authenticated as ${pc.green(authCheck.email || 'user')}`);

  // 4. Firebase Project Selection
  spinner.start('Fetching Firebase projects...');
  const projRes = listFirebaseProjects();
  spinner.stop('Firebase projects loaded');

  if (!projRes.success || projRes.projects.length === 0) {
    p.log.warn('No active Firebase projects found or failed to fetch projects.');
  }

  const projectChoices = [
    ...projRes.projects.map((proj) => ({
      value: proj.projectId,
      label: `${proj.displayName} (${proj.projectId})`,
    })),
    { value: '__create_new__', label: pc.yellow('+ Create new Firebase project') },
  ];

  const selectedProjectId = await p.select({
    message: 'Select a Firebase project to connect:',
    options: projectChoices,
  });

  if (p.isCancel(selectedProjectId)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  let finalProjectId = selectedProjectId as string;

  if (selectedProjectId === '__create_new__') {
    const newProjectId = await p.text({
      message: 'Enter Project ID (e.g. my-awesome-app):',
      validate: (value) => {
        if (!value || value.trim().length === 0) return 'Project ID is required';
        if (!/^[a-z0-9-]+$/.test(value)) return 'Use only lowercase letters, numbers, and hyphens';
        if (value.length > 30) return 'Project ID must be 30 characters or fewer';
      },
    });

    if (p.isCancel(newProjectId)) {
      p.cancel('Setup cancelled.');
      process.exit(0);
    }

    const newProjectName = await p.text({
      message: 'Enter Project Display Name:',
      initialValue: newProjectId as string,
    });

    if (p.isCancel(newProjectName)) {
      p.cancel('Setup cancelled.');
      process.exit(0);
    }

    spinner.start(`Creating Firebase project "${newProjectId}"...`);
    const createRes = createFirebaseProject(newProjectId as string, newProjectName as string);
    if (!createRes.success) {
      spinner.stop(pc.red(`Failed to create project: ${createRes.error}`));
      p.cancel('Setup aborted.');
      process.exit(1);
    }
    spinner.stop(pc.green(`Firebase project "${newProjectId}" created successfully`));
    finalProjectId = newProjectId as string;
  }

  // 5. Firebase Services Selection
  const servicesSelected = await p.multiselect<FirebaseService>({
    message: 'Which Firebase services do you want to initialize in code?',
    options: [
      { value: 'auth', label: 'Authentication (auth)' },
      { value: 'firestore', label: 'Cloud Firestore (db)' },
      { value: 'storage', label: 'Cloud Storage (storage)' },
      { value: 'database', label: 'Realtime Database (database)' },
      { value: 'analytics', label: 'Analytics (analytics)' },
    ],
    initialValues: ['auth', 'firestore', 'storage'],
    required: false,
  });

  if (p.isCancel(servicesSelected)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  const selectedServices = servicesSelected as FirebaseService[];

  // Fetch registered apps in selected project
  spinner.start('Fetching registered apps for project...');
  const appsRes = listFirebaseApps(finalProjectId);
  spinner.stop('Apps loaded');
  const existingApps = appsRes.success ? appsRes.apps : [];

  // 6. Platform Selection (for Mobile / Universal frameworks like Expo & RN)
  let platforms: PlatformType[] = ['web'];

  if (!project.isWebFramework) {
    const platformsSelected = await p.multiselect<PlatformType>({
      message: 'Which platforms do you want to configure?',
      options: [
        { value: 'android', label: 'Android' },
        { value: 'ios', label: 'iOS' },
        { value: 'web', label: 'Web' },
      ],
      initialValues: ['android', 'ios'],
      required: true,
    });

    if (p.isCancel(platformsSelected)) {
      p.cancel('Setup cancelled.');
      process.exit(0);
    }

    platforms = platformsSelected as PlatformType[];
  }

  // 7. Android Configuration (Mobile / Universal)
  if (platforms.includes('android')) {
    p.log.step(pc.bold('Configuring Android'));

    let packageName = project.androidPackageName;
    if (!packageName) {
      const inputPkg = await p.text({
        message: 'Enter Android package name (e.g. com.example.myapp):',
        initialValue: 'com.example.myapp',
        validate: (val) => {
          if (!val || !val.includes('.')) return 'Must be a valid reverse-domain package name';
          if (!/^[a-zA-Z][a-zA-Z0-9._]*$/.test(val)) return 'Invalid characters in package name';
        },
      });
      if (p.isCancel(inputPkg)) {
        p.cancel('Setup cancelled.');
        process.exit(0);
      }
      packageName = inputPkg as string;
    }

    let androidApp = existingApps.find(
      (a) => a.platform === 'ANDROID' && a.packageName === packageName
    );

    if (!androidApp) {
      const parts = packageName.split('.');
      const displayName = parts[parts.length - 1] || packageName;
      spinner.start(`Registering Android app (${packageName})...`);
      const createRes = createAndroidApp(finalProjectId, packageName, displayName);
      if (!createRes.success || !createRes.app) {
        spinner.stop(pc.red(`Failed to create Android app: ${createRes.error}`));
      } else {
        spinner.stop(pc.green('Android app registered with Firebase'));
        androidApp = createRes.app;
      }
    } else {
      p.log.success(`Found existing Android app (${androidApp.appId})`);
    }

    if (androidApp?.appId) {
      spinner.start('Downloading google-services.json...');
      const tempJson = path.join(projectDir, '.tmp-google-services.json');
      try {
        const dlRes = downloadSdkConfig('ANDROID', androidApp.appId, finalProjectId, tempJson);

        let configContent = dlRes.content;
        if (!configContent && fileExists(tempJson)) {
          configContent = readTextFile(tempJson) || '';
        }

        if (configContent) {
          const configResult = configureAndroid(projectDir, configContent, project.isExpo, packageName);
          spinner.stop(pc.green('Android configuration files installed'));
          if (configResult.gradleModified) {
            p.log.success('Gradle configuration updated with Google Services plugin');
          }
          if (configResult.expoConfigUpdated) {
            p.log.success('Expo app.json updated with googleServicesFile & plugins');
          }
          for (const w of configResult.warnings) p.log.warn(w);
        } else {
          spinner.stop(pc.red('Failed to download google-services.json: ' + (dlRes.error || '')));
        }
      } finally {
        try { if (fs.existsSync(tempJson)) fs.unlinkSync(tempJson); } catch {}
      }
    }
  }

  // 8. iOS Configuration (Mobile / Universal)
  if (platforms.includes('ios')) {
    p.log.step(pc.bold('Configuring iOS'));

    let bundleId = project.iosBundleId;
    if (!bundleId) {
      const inputBundle = await p.text({
        message: 'Enter iOS Bundle Identifier (e.g. com.example.myapp):',
        initialValue: project.androidPackageName || 'com.example.myapp',
        validate: (val) => {
          if (!val || !val.includes('.')) return 'Must be a valid reverse-domain bundle identifier';
          if (!/^[a-zA-Z][a-zA-Z0-9._-]*$/.test(val)) return 'Invalid characters in bundle identifier';
        },
      });
      if (p.isCancel(inputBundle)) {
        p.cancel('Setup cancelled.');
        process.exit(0);
      }
      bundleId = inputBundle as string;
    }

    let iosApp = existingApps.find(
      (a) => a.platform === 'IOS' && a.bundleId === bundleId
    );

    if (!iosApp) {
      const parts = bundleId.split('.');
      const displayName = parts[parts.length - 1] || bundleId;
      spinner.start(`Registering iOS app (${bundleId})...`);
      const createRes = createIosApp(finalProjectId, bundleId, displayName);
      if (!createRes.success || !createRes.app) {
        spinner.stop(pc.red(`Failed to create iOS app: ${createRes.error}`));
      } else {
        spinner.stop(pc.green('iOS app registered with Firebase'));
        iosApp = createRes.app;
      }
    } else {
      p.log.success(`Found existing iOS app (${iosApp.appId})`);
    }

    if (iosApp?.appId) {
      spinner.start('Downloading GoogleService-Info.plist...');
      const tempPlist = path.join(projectDir, '.tmp-GoogleService-Info.plist');
      try {
        const dlRes = downloadSdkConfig('IOS', iosApp.appId, finalProjectId, tempPlist);

        let configContent = dlRes.content;
        if (!configContent && fileExists(tempPlist)) {
          configContent = readTextFile(tempPlist) || '';
        }

        if (configContent) {
          const configResult = configureIos(projectDir, configContent, project.isExpo, bundleId);
          spinner.stop(pc.green('iOS configuration files installed'));
          if (configResult.expoConfigUpdated) {
            p.log.success('Expo app.json updated with GoogleService-Info.plist & plugins');
          }
          for (const w of configResult.warnings) p.log.warn(w);
        } else {
          spinner.stop(pc.red('Failed to download GoogleService-Info.plist: ' + (dlRes.error || '')));
        }
      } finally {
        try { if (fs.existsSync(tempPlist)) fs.unlinkSync(tempPlist); } catch {}
      }
    }
  }

  // 9. Web / Framework Configuration (Next.js, Vite, React, Expo Web, etc.)
  if (platforms.includes('web') || project.isWebFramework) {
    p.log.step(pc.bold(`Configuring Firebase for ${project.frameworkDisplayName}`));

    let webApp = existingApps.find((a) => a.platform === 'WEB');

    if (!webApp) {
      spinner.start('Registering Web app...');
      const rawName = path.basename(path.resolve(projectDir));
      const appName = rawName || 'firebase-app';
      const createRes = createWebApp(finalProjectId, appName);
      if (!createRes.success || !createRes.app) {
        spinner.stop(pc.red(`Failed to create Web app: ${createRes.error}`));
      } else {
        spinner.stop(pc.green('Web app registered with Firebase'));
        webApp = createRes.app;
      }
    } else {
      p.log.success(`Found existing Web app (${webApp.appId})`);
    }

    if (webApp?.appId) {
      spinner.start('Downloading Web SDK configuration...');
      const dlRes = downloadSdkConfig('WEB', webApp.appId, finalProjectId);
      if (dlRes.success && dlRes.content) {
        const parsed = parseWebSdkConfig(dlRes.content);
        if (parsed) {
          // 9a. Write environment variables (.env.local / .env)
          const useEnv = project.isWebFramework || project.framework === 'expo';
          if (useEnv) {
            const envRes = writeFrameworkEnvFile(
              projectDir,
              parsed,
              project.envPrefix,
              project.envFileName
            );
            if (envRes.created) {
              p.log.success(`Created ${project.envFileName} with ${project.envPrefix}FIREBASE_* variables`);
            } else if (envRes.updated) {
              p.log.success(`Updated ${project.envFileName} with Firebase environment variables`);
            }
          }

          // 9b. Write framework-tailored client module (e.g. lib/firebase.ts)
          const webRes = configureWeb(projectDir, parsed, {
            framework: project.framework,
            envPrefix: project.envPrefix,
            useEnvVariables: useEnv,
            services: selectedServices,
            isTypeScript: project.isTypeScript,
          });

          spinner.stop(pc.green(`Firebase client initialized at ${path.relative(projectDir, webRes.filePath)}`));
          for (const w of webRes.warnings) p.log.warn(w);
        } else {
          spinner.stop(pc.yellow('Could not automatically parse Web SDK snippet'));
        }
      } else {
        spinner.stop(pc.red('Failed to download Web SDK config: ' + (dlRes.error || '')));
      }
    }
  }

  // 10. Dependency Management
  p.log.step(pc.bold('Dependency Management'));
  const missingDeps: string[] = [];

  if (project.isWebFramework || platforms.includes('web')) {
    if (!project.installedDependencies['firebase']) {
      missingDeps.push('firebase');
    }
  }

  if (platforms.includes('android') || platforms.includes('ios')) {
    if (!project.installedDependencies['@react-native-firebase/app']) {
      missingDeps.push('@react-native-firebase/app');
    }
  }

  if (missingDeps.length > 0) {
    p.log.warn(`Missing dependencies: ${missingDeps.map((d) => pc.cyan(d)).join(', ')}`);
    const shouldInstall = await p.confirm({
      message: `Install missing dependencies using ${project.packageManager}?`,
      initialValue: true,
    });

    if (!p.isCancel(shouldInstall) && shouldInstall) {
      const installCmd = getInstallCommand(project.packageManager, missingDeps);
      spinner.start(`Running ${installCmd}...`);
      const installRes = runCommandStringSync(installCmd, { cwd: projectDir });
      if (installRes.exitCode === 0) {
        spinner.stop(pc.green('Dependencies installed successfully'));
      } else {
        spinner.stop(pc.red('Failed to install dependencies: ' + installRes.stderr));
      }
    }
  } else {
    p.log.success('All required Firebase dependencies are already installed');
  }

  // 11. Summary & Validation
  p.log.step(pc.bold('Configuration Validation'));
  const refreshed = detectProject(projectDir);

  p.log.message(pc.bold('Project:'));
  p.log.message(`  ${pc.green('✔')} Framework: ${refreshed.frameworkDisplayName}`);
  p.log.message(`  ${pc.green('✔')} Connected Firebase Project: ${finalProjectId}`);

  if (refreshed.isWebFramework || refreshed.hasEnvFile) {
    p.log.message(pc.bold('Environment:'));
    p.log.message(`  ${refreshed.hasEnvFile ? pc.green('✔') : pc.red('✗')} ${refreshed.envFileName}`);
  }

  if (platforms.includes('android')) {
    p.log.message(pc.bold('Android:'));
    p.log.message(
      `  ${refreshed.hasGoogleServicesJson ? pc.green('✔') : pc.red('✗')} google-services.json`
    );
    if (refreshed.androidPackageName) {
      p.log.message(`  ${pc.green('✔')} Package ID: ${refreshed.androidPackageName}`);
    }
  }

  if (platforms.includes('ios')) {
    p.log.message(pc.bold('iOS:'));
    p.log.message(
      `  ${refreshed.hasGoogleServiceInfoPlist ? pc.green('✔') : pc.red('✗')} GoogleService-Info.plist`
    );
    if (refreshed.iosBundleId) {
      p.log.message(`  ${pc.green('✔')} Bundle ID: ${refreshed.iosBundleId}`);
    }
  }

  if (platforms.includes('web') || refreshed.isWebFramework) {
    p.log.message(pc.bold('Web / JS SDK:'));
    p.log.message(
      `  ${refreshed.hasFirebaseWebConfig ? pc.green('✔') : pc.red('✗')} Firebase client module`
    );
  }

  p.outro(pc.bgGreen(pc.black(' 🎉 Firebase configuration complete! ')));
}
