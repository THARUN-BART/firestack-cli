import { runFirebaseCommand } from './cli';
import type { FirebaseProject } from '../types';

export function listFirebaseProjects(): { success: boolean; projects: FirebaseProject[]; error?: string } {
  const res = runFirebaseCommand<{ status: string; result: any[] }>(['projects:list', '--json']);

  if (!res.success) {
    return {
      success: false,
      projects: [],
      error: res.error || 'Failed to list Firebase projects',
    };
  }

  const list = res.data?.result || [];
  const projects: FirebaseProject[] = list.map((item: any) => ({
    projectId: item.projectId,
    displayName: item.displayName || item.projectId,
    projectNumber: item.projectNumber,
    state: item.state,
  }));

  return {
    success: true,
    projects,
  };
}

export function createFirebaseProject(
  projectId: string,
  displayName: string
): { success: boolean; project?: FirebaseProject; error?: string } {
  const res = runFirebaseCommand<{ status: string; result: any }>([
    'projects:create',
    projectId,
    '--display-name',
    displayName,
    '--json',
  ]);

  if (!res.success) {
    return {
      success: false,
      error: res.error || `Failed to create Firebase project "${projectId}"`,
    };
  }

  const project: FirebaseProject = {
    projectId,
    displayName,
    projectNumber: res.data?.result?.projectNumber,
    state: res.data?.result?.state || 'ACTIVE',
  };

  return {
    success: true,
    project,
  };
}
