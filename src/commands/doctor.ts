import pc from 'picocolors';
import { detectProject } from '../detection/project';
import { checkFirebaseCliInstalled } from '../firebase/cli';
import { checkFirebaseAuth } from '../firebase/auth';
import type { DoctorCheckItem, DoctorReport } from '../types';

export function runDoctorChecks(projectDir: string = process.cwd()): DoctorReport {
  const items: DoctorCheckItem[] = [];
  const project = detectProject(projectDir);

  // 1. Project Framework Check
  items.push({
    category: 'Project',
    name: 'Framework',
    status: 'pass',
    message: `${project.frameworkDisplayName} (${project.packageManager})`,
  });

  // 2. Firebase CLI Check
  const cliCheck = checkFirebaseCliInstalled();
  if (cliCheck.installed) {
    items.push({
      category: 'Project',
      name: 'Firebase CLI',
      status: 'pass',
      message: `Installed (${cliCheck.version})`,
    });
  } else {
    items.push({
      category: 'Project',
      name: 'Firebase CLI',
      status: 'fail',
      message: 'Firebase CLI is not installed (run: npm install -g firebase-tools)',
    });
  }

  // 3. Firebase Auth Check
  if (cliCheck.installed) {
    const authCheck = checkFirebaseAuth();
    if (authCheck.authenticated) {
      items.push({
        category: 'Project',
        name: 'Firebase authentication',
        status: 'pass',
        message: `Authenticated as ${authCheck.email}`,
      });
    } else {
      items.push({
        category: 'Project',
        name: 'Firebase authentication',
        status: 'fail',
        message: 'Not logged in (run: firebase login)',
      });
    }
  }

  // 4. Environment & Web Config Checks for Web Frameworks
  if (project.isWebFramework) {
    if (project.hasEnvFile) {
      items.push({
        category: 'Environment',
        name: project.envFileName,
        status: 'pass',
        message: `Environment configuration file found (${project.envFileName})`,
      });
    } else {
      items.push({
        category: 'Environment',
        name: project.envFileName,
        status: 'warn',
        message: `Missing ${project.envFileName} for ${project.frameworkDisplayName}`,
        fixAction: 'rn-firebase fix env',
        fixPlatform: 'env',
      });
    }

    if (project.hasFirebaseWebConfig) {
      items.push({
        category: 'Web',
        name: 'Firebase configuration',
        status: 'pass',
        message: `Configuration module found (${project.firebaseWebConfigPath || 'src/lib/firebase.ts'})`,
      });
    } else {
      items.push({
        category: 'Web',
        name: 'Firebase configuration',
        status: 'fail',
        message: 'Missing Firebase configuration module',
        fixAction: 'rn-firebase fix web',
        fixPlatform: 'web',
      });
    }

    const hasFirebaseSdk = !!project.installedDependencies['firebase'];
    items.push({
      category: 'Dependencies',
      name: 'firebase (JS SDK)',
      status: hasFirebaseSdk ? 'pass' : 'fail',
      message: hasFirebaseSdk ? 'Installed' : 'Missing firebase package',
      fixAction: 'rn-firebase fix deps',
      fixPlatform: 'deps',
    });
  }

  // 5. Native Checks for Mobile / Universal Frameworks (Expo, Bare React Native)
  if (!project.isWebFramework || project.hasAndroid || project.hasIos) {
    // Android checks
    if (project.hasGoogleServicesJson) {
      items.push({
        category: 'Android',
        name: 'google-services.json',
        status: 'pass',
        message: 'Configuration file found',
      });
    } else {
      items.push({
        category: 'Android',
        name: 'google-services.json',
        status: 'fail',
        message: 'Missing google-services.json',
        fixAction: 'rn-firebase fix android',
        fixPlatform: 'android',
      });
    }

    if (project.androidPackageName) {
      items.push({
        category: 'Android',
        name: 'Package ID',
        status: 'pass',
        message: project.androidPackageName,
      });
    } else if (project.hasAndroid || project.isExpo) {
      items.push({
        category: 'Android',
        name: 'Package ID',
        status: 'warn',
        message: 'Could not detect Android package name',
        fixAction: 'rn-firebase fix android',
        fixPlatform: 'android',
      });
    }

    // iOS checks
    if (project.hasGoogleServiceInfoPlist) {
      items.push({
        category: 'iOS',
        name: 'GoogleService-Info.plist',
        status: 'pass',
        message: 'Configuration file found',
      });
    } else {
      items.push({
        category: 'iOS',
        name: 'GoogleService-Info.plist',
        status: 'fail',
        message: 'Missing GoogleService-Info.plist',
        fixAction: 'rn-firebase fix ios',
        fixPlatform: 'ios',
      });
    }

    if (project.iosBundleId) {
      items.push({
        category: 'iOS',
        name: 'Bundle ID',
        status: 'pass',
        message: project.iosBundleId,
      });
    } else if (project.hasIos || project.isExpo) {
      items.push({
        category: 'iOS',
        name: 'Bundle ID',
        status: 'warn',
        message: 'Could not detect iOS bundle identifier',
        fixAction: 'rn-firebase fix ios',
        fixPlatform: 'ios',
      });
    }

    // React Native Firebase dependencies checks
    const hasRnfApp = !!project.installedDependencies['@react-native-firebase/app'];
    const hasFirebaseJs = !!project.installedDependencies['firebase'];
    const hasAnyDep = hasRnfApp || hasFirebaseJs;

    items.push({
      category: 'Dependencies',
      name: project.isExpo ? 'Firebase SDK' : '@react-native-firebase/app',
      status: hasAnyDep ? 'pass' : 'warn',
      message: hasAnyDep
        ? `Installed (${hasRnfApp ? '@react-native-firebase/app' : 'firebase'})`
        : 'Missing Firebase dependency',
      fixAction: 'rn-firebase fix deps',
      fixPlatform: 'deps',
    });
  }

  const hasFailures = items.some((i) => i.status === 'fail');
  const hasWarnings = items.some((i) => i.status === 'warn');

  return { items, hasFailures, hasWarnings };
}

export function runDoctorCommand(options: { cwd?: string } = {}) {
  const projectDir = options.cwd || process.cwd();
  console.log('\n' + pc.bold(pc.cyan('🔥 Firebase Doctor')) + '\n');

  const report = runDoctorChecks(projectDir);

  const categories = ['Project', 'Environment', 'Android', 'iOS', 'Web', 'Dependencies'] as const;

  for (const cat of categories) {
    const catItems = report.items.filter((i) => i.category === cat);
    if (catItems.length === 0) continue;

    console.log(pc.bold(cat));
    for (const item of catItems) {
      let icon = pc.green('✔');
      if (item.status === 'fail') icon = pc.red('✗');
      if (item.status === 'warn') icon = pc.yellow('⚠');

      console.log(`  ${icon} ${item.name}: ${item.message}`);
    }
    console.log('');
  }

  const failures = report.items.filter((i) => i.status === 'fail');
  const warnings = report.items.filter((i) => i.status === 'warn');

  if (failures.length === 0 && warnings.length === 0) {
    console.log(pc.green(pc.bold('No problems detected! Your Firebase setup is healthy.')) + '\n');
    return;
  }

  const problemCount = failures.length + warnings.length;
  console.log(pc.bold(`${problemCount} issue${problemCount === 1 ? '' : 's'} detected.\n`));

  const fixes = new Set<string>();
  for (const item of [...failures, ...warnings]) {
    if (item.fixAction) {
      fixes.add(item.fixAction);
    }
  }

  if (fixes.size > 0) {
    console.log(pc.bold('Suggested fix:'));
    for (const fix of fixes) {
      console.log(`  ${pc.cyan(fix)}`);
    }
    console.log('');
  }
}
