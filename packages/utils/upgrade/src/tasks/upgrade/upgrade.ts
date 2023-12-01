import path from 'node:path';

import * as requirements from './requirements';
import { timerFactory } from '../../modules/timer';
import { upgraderFactory } from '../../modules/upgrader';
import { npmPackageFactory } from '../../modules/npm';
import { projectFactory } from '../../modules/project';
import { Version } from '../../modules/version';
import { constants as upgraderConstants } from '../../modules/upgrader';
import { constants as npmConstants } from '../../modules/npm';
import * as f from '../../modules/format';

import type { UpgradeOptions } from './types';

const fStrapiPackageName = f.highlight(upgraderConstants.STRAPI_PACKAGE_NAME);

export const upgrade = async (options: UpgradeOptions) => {
  const timer = timerFactory();
  const { logger } = options;

  // Make sure we're resolving the correct working directory based on the given input
  const cwd = path.resolve(options.cwd ?? process.cwd());

  const project = projectFactory(cwd);
  const npmPackage = npmPackageFactory(upgraderConstants.STRAPI_PACKAGE_NAME);
  // Load all versions from the registry
  await npmPackage.refresh();

  const upgrader = upgraderFactory(project, options.target, npmPackage)
    .dry(options.dry ?? false)
    .onConfirm(options.confirm ?? null)
    .setLogger(logger);

  if (options.target === Version.ReleaseType.Major) {
    upgrader
      .addRequirement(requirements.major.REQUIRE_AVAILABLE_NEXT_MAJOR.optional())
      .addRequirement(requirements.major.REQUIRE_LATEST_FOR_CURRENT_MAJOR.optional());
  }

  upgrader.addRequirement(requirements.common.REQUIRE_GIT.optional());

  const upgradeReport = await upgrader.upgrade();

  if (!upgradeReport.success) {
    throw upgradeReport.error;
  }

  timer.stop();

  logger.info(`Completed in ${timer.elapsedMs}`);
};