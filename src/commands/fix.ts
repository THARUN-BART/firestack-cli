import * as p from '@clack/prompts';
import pc from 'picocolors';
import path from 'node:path';
import { detectProject } from '../detection/project';
import { runDoctorChecks } from './doctor';
import { checkFirebaseCliInstalled } from '../firebase/cli';
import { checkFirebaseAuth } from '../firebase/auth';
import { listFirebaseProjects } from '../firebase/projects';
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
import { getInstallCommand } from '../detection/package-manager';
import { runCommandSync } from '../utils/exec';
import { fileExists, readTextFile } from '../utils/fs';

export async function runFixCommand(
  targetPlatform?: string,
  options: { cwd?: string } = {}
) {
  const projectDir = options.cwd || process.cwd();

  p.intro(pc.bgMagenta(pc.black(' 🔥 Firebase Auto-Fix ')));

  const project = detectProject(projectDir);
  const report = runDoctorChecks(projectDir);

  const normalizedTarget = targetPlatform?.toLowerCase().trim();
  const validTargets = ['android', 'ios', 'web', 'deps', 'all'];

  if (normalizedTarget && !validTargets.includes(normalizedTarget)) {
    p.log.error(`Unknown fix target: "${targetPlatform}". Valid targets: ${validTargets.join(', ')}`);
    process.exit(1);
  }

  const itemsToFix = report.items.filter((item) => {
    if (item.status === 'pass') return false;
    if (!normalizedTarget || normalizedTarget === 'all') return true;
    return item.fixPlatform === normalizedTarget;
  });

  if (itemsToFix.length === 0) {
    p.log.success('No issues found that need fixing for the selected target.');
    p.outro('Everything is up to date.');
    return;
  }

  // Preview proposed changes
  p.log.info(pc.bold('The following issues were detected:'));
  for (const item of itemsToFix) {
    p.log.message(`  ${pc.red('•')} [${item.category}] ${item.name}: ${item.message}`);
  }

  const confirmed = await p.confirm({
    message: 'Proceed with applying fixes?',
    initialValue: true,
  });

  if (!confirmed || p.isCancel(confirmed)) {
    p.cancel('Fix cancelled.');
    process.exit(0);
  }

  // Verify CLI and auth before making remote calls
  const cliCheck = checkFirebaseCliInstalled();
  if (!cliCheck.installed) {
    p.log.error('Firebase CLI must be installed to fix configuration: npm install -g firebase-tools');
    process.exit(1);
  }

  const authCheck = checkFirebaseAuth();
  if (!authCheck.authenticated) {
    p.log.error('Firebase authentication required. Please run: firebase login');
    process.exit(1);
  }

  // Need a project
  const spinner = p.spinner();
  spinner.start('Fetching Firebase projects...');
  const projRes = listFirebaseProjects();
  spinner.stop('Projects loaded');

  if (!projRes.success || projRes.projects.length === 0) {
    p.log.error('No Firebase projects accessible. Please create one in Firebase console or run setup.');
    process.exit(1);
  }

  const selectedProjectId = (await p.select({
    message: 'Select the Firebase project to associate fixes with:',
    options: projRes.projects.map((pr) => ({
      value: pr.projectId,
      label: `${pr.displayName} (${pr.projectId})`,
    })),
  })) as string;

  if (p.isCancel(selectedProjectId)) {
    p.cancel('Cancelled.');
    process.exit(0);
  }

  spinner.start('Fetching apps in project...');
  const appsRes = listFirebaseApps(selectedProjectId);
  spinner.stop('Apps loaded');
  const existingApps = appsRes.success ? appsRes.apps : [];

  const shouldFixAndroid =
    (!normalizedTarget || normalizedTarget === 'all' || normalizedTarget === 'android') &&
    itemsToFix.some((i) => i.fixPlatform === 'android');

  const shouldFixIos =
    (!normalizedTarget || normalizedTarget === 'all' || normalizedTarget === 'ios') &&
    itemsToFix.some((i) => i.fixPlatform === 'ios');

  const shouldFixWeb =
    (!normalizedTarget || normalizedTarget === 'all' || normalizedTarget === 'web') &&
    itemsToFix.some((i) => i.fixPlatform === 'web');

  const shouldFixDeps =
    (!normalizedTarget || normalizedTarget === 'all' || normalizedTarget === 'deps') &&
    itemsToFix.some((i) => i.fixPlatform === 'deps');

  // Fix Android
  if (shouldFixAndroid) {
    p.log.step(pc.bold('Fixing Android...'));
    let packageName = project.androidPackageName;
    if (!packageName) {
      const input = await p.text({
        message: 'Enter Android package name:',
        initialValue: 'com.example.myapp',
      });
      if (!p.isCancel(input) && input) packageName = input as string;
    }

    if (packageName) {
      let app = existingApps.find((a) => a.platform === 'ANDROID' && a.packageName === packageName);
      if (!app) {
        spinner.start(`Registering Android app (${packageName})...`);
        const created = createAndroidApp(selectedProjectId, packageName, packageName);
        if (created.success && created.app) {
          app = created.app;
          spinner.stop(pc.green('Android app registered in Firebase'));
        } else {
          spinner.stop(pc.red('Failed to register Android app'));
        }
      }

      if (app?.appId) {
        spinner.start('Downloading and placing google-services.json...');
        const tempPath = path.join(projectDir, '.tmp-gs.json');
        const dl = downloadSdkConfig('ANDROID', app.appId, selectedProjectId, tempPath);
        const content = dl.content || (fileExists(tempPath) ? readTextFile(tempPath) : '');
        if (content) {
          configureAndroid(projectDir, content, project.isExpo, packageName);
          spinner.stop(pc.green('google-services.json installed & Gradle/Expo updated'));
        } else {
          spinner.stop(pc.red('Failed to retrieve google-services.json'));
        }
        try {
          const fs = await import('node:fs');
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        } catch {}
      }
    }
  }

  // Fix iOS
  if (shouldFixIos) {
    p.log.step(pc.bold('Fixing iOS...'));
    let bundleId = project.iosBundleId;
    if (!bundleId) {
      const input = await p.text({
        message: 'Enter iOS bundle identifier:',
        initialValue: 'com.example.myapp',
      });
      if (!p.isCancel(input) && input) bundleId = input as string;
    }

    if (bundleId) {
      let app = existingApps.find((a) => a.platform === 'IOS' && a.bundleId === bundleId);
      if (!app) {
        spinner.start(`Registering iOS app (${bundleId})...`);
        const created = createIosApp(selectedProjectId, bundleId, bundleId);
        if (created.success && created.app) {
          app = created.app;
          spinner.stop(pc.green('iOS app registered in Firebase'));
        } else {
          spinner.stop(pc.red('Failed to register iOS app'));
        }
      }

      if (app?.appId) {
        spinner.start('Downloading and placing GoogleService-Info.plist...');
        const tempPath = path.join(projectDir, '.tmp-gs.plist');
        const dl = downloadSdkConfig('IOS', app.appId, selectedProjectId, tempPath);
        const content = dl.content || (fileExists(tempPath) ? readTextFile(tempPath) : '');
        if (content) {
          configureIos(projectDir, content, project.isExpo, bundleId);
          spinner.stop(pc.green('GoogleService-Info.plist installed & Expo updated'));
        } else {
          spinner.stop(pc.red('Failed to retrieve GoogleService-Info.plist'));
        }
        try {
          const fs = await import('node:fs');
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        } catch {}
      }
    }
  }

  // Fix Web
  if (shouldFixWeb) {
    p.log.step(pc.bold('Fixing Web...'));
    let app = existingApps.find((a) => a.platform === 'WEB');
    if (!app) {
      spinner.start('Registering Web app in Firebase...');
      const appName = path.basename(projectDir);
      const created = createWebApp(selectedProjectId, appName);
      if (created.success && created.app) {
        app = created.app;
        spinner.stop(pc.green('Web app registered'));
      } else {
        spinner.stop(pc.red('Failed to register Web app'));
      }
    }

    if (app?.appId) {
      spinner.start('Downloading Web config...');
      const dl = downloadSdkConfig('WEB', app.appId, selectedProjectId);
      if (dl.success && dl.content) {
        const parsed = parseWebSdkConfig(dl.content);
        if (parsed) {
          const webRes = configureWeb(projectDir, parsed);
          spinner.stop(pc.green(`Web configuration generated at ${webRes.filePath}`));
        } else {
          spinner.stop(pc.red('Failed to parse Web SDK configuration'));
        }
      }
    }
  }

  // Fix Dependencies
  if (shouldFixDeps) {
    p.log.step(pc.bold('Fixing Dependencies...'));
    const toInstall: string[] = [];
    if (!project.installedDependencies['@react-native-firebase/app']) {
      toInstall.push('@react-native-firebase/app');
    }
    if (toInstall.length > 0) {
      const installCmd = getInstallCommand(project.packageManager, toInstall);
      spinner.start(`Installing ${toInstall.join(', ')}...`);
      const res = runCommandSync(installCmd, [], { cwd: projectDir });
      if (res.exitCode === 0) {
        spinner.stop(pc.green('Dependencies installed'));
      } else {
        spinner.stop(pc.red('Failed to install: ' + res.stderr));
      }
    }
  }

  p.outro(pc.bgGreen(pc.black(' Fixes completed! ')));
}
