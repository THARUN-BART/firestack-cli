export * from './src/index';

import { createCli } from './src/cli';

if (import.meta.main) {
  createCli().parse(process.argv);
}