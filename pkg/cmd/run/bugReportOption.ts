/* eslint-disable no-console */
import fs from 'node:fs';
import os from 'node:os';

import docker, { Docker } from '@/pkg/docker';

export async function bugReportOption(version?: string) {
  const reports: string[] = [];

  reports.push(`Actions version: ${version}`);
  reports.push(`Platform: ${os.platform()}`);
  reports.push(`Arch: ${os.arch()}`);
  reports.push(`NCPU: ${os.cpus().length}`);

  let dockerHost = process.env.DOCKER_HOST;
  if (dockerHost === undefined) {
    dockerHost = 'DOCKER_HOST environment variable is not set';
  } else if (dockerHost === '') {
    dockerHost = 'DOCKER_HOST environment variable is empty.';
  }

  reports.push(`Docker host: ${dockerHost}`);
  reports.push('Sockets found:');

  Docker.SocketLocations.forEach((p) => {
    if (fs.existsSync(p)) {
      reports.push(`\t${p}`);
    }
  });

  reports.push('Node versions:');

  Object.entries(process.versions).forEach(([key, value]) => {
    reports.push(`\t${key}: ${value}`);
  });

  reports.push('Docker Engine:');

  try {
    const dockerInfo = await docker.info();

    reports.push(`\tEngine version: ${dockerInfo.ServerVersion}`);
    reports.push(`\tEngine runtime: ${dockerInfo.DefaultRuntime}`);
    reports.push(`\tCgroupDriver: ${dockerInfo.CgroupDriver}`);
    reports.push(`\tCgroupVersion: ${dockerInfo.CgroupVersion}`);
    reports.push(`\tIndexServerAddress: ${dockerInfo.IndexServerAddress}`);

    reports.push(`\tOperatingSystem: ${dockerInfo.OperatingSystem}`);
    reports.push(`\tOSType: ${dockerInfo.OSType}`);
    reports.push(`\tOSVersion: ${dockerInfo.OSVersion}`);
    reports.push(`\tArchitecture: ${dockerInfo.OperatingSystem}`);
    reports.push(`\tKernelVersion: ${dockerInfo.KernelVersion}`);
    reports.push(`\tNCPU: ${dockerInfo.NCPU}`);
    reports.push(`\tMemTotal: ${dockerInfo.MemTotal / 1024 / 1024} MB`);
    reports.push('\tSecurity options:');
    dockerInfo.SecurityOptions?.forEach((item: string) => {
      reports.push(`\t\t${item}`);
    });
  } catch (error) {
    reports.push(`\tError: ${(error as Error).message}`);
  }

  console.log(reports.join('\n'));
}
