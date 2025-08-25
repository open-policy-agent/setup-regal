import * as path from 'path';
import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import * as io from '@actions/io';
import * as os from 'os';
import * as semver from 'semver';
import * as github from '@actions/github';
import * as fs from 'fs';

// arch in [arm, x32, x64...] (https://nodejs.org/api/os.html#os_os_arch)
// return value in [amd64, 386, arm]
function mapArch(arch: string): string {
  const mappings: { [s: string]: string } = {
    x64: 'x86_64',
  };
  return mappings[arch] || arch;
}

// os in [darwin, linux, win32...] (https://nodejs.org/api/os.html#os_os_platform)
// return value in [darwin, linux, windows]
function mapOS(os: string): string {
  const mappings: { [s: string]: string } = {
    win32: 'Windows',
    linux: 'Linux',
    darwin: 'Darwin',
  };
  return mappings[os] || os;
}

function getDownloadObject(version: string): {
  url: string;
  binaryName: string;
} {

  const platform = os.platform();
  core.info(`Determining release asset for Regal ${version} on ${platform} ${os.arch()}`);

  const filename = `regal_${mapOS(platform)}_${mapArch(os.arch())}`;
  const binaryName = platform === 'win32' ? `${filename}.exe` : filename;

  const url = `https://github.com/open-policy-agent/regal/releases/download/v${version}/${binaryName}`;

  core.info(`Release asset url: ${url}`);
  core.info(`Target binary name: ${binaryName}`);

  return {
    url,
    binaryName,
  };
}

// Rename regal-<platform>-<arch> to regal
async function renameBinary(
  pathToCLI: string,
  binaryName: string
): Promise<void> {
  const source = path.join(pathToCLI, binaryName);
  const target = path.join(
    pathToCLI,
    binaryName.endsWith('.exe') ? 'regal.exe' : 'regal'
  );

  core.debug(`Moving ${source} to ${target}.`);
  try {
    await io.mv(source, target);
  } catch (e) {
    core.error(`Unable to move ${source} to ${target}.`);
    throw e;
  }
}

async function getVersion(): Promise<string> {
  const version = core.getInput('version');
  if (version === 'latest') {
    core.info(`Determining latest version of Regal...`);
    const versions = await getAllVersions()
    return semver.clean(versions[0]) || versions[0];
  }

  if (semver.valid(version)) {
    return semver.clean(version) || version;
  }

  if (semver.validRange(version)) {
    const max = semver.maxSatisfying(await getAllVersions(), version);
    if (max) {
      return semver.clean(max) || version;
    }
    core.warning(`${version} did not match any release version.`);
  } else {
    core.warning(`${version} is not a valid version or range.`);
  }
  return version;
}

async function getAllVersions(): Promise<string[]> {
  const githubToken = core.getInput('github-token', { required: true });
  const octokit = github.getOctokit(githubToken);

  const allVersions: string[] = [];
  for await (const response of octokit.paginate.iterator(
    octokit.rest.repos.listReleases,
    { owner: 'open-policy-agent', repo: 'regal' }
  )) {
    for (const release of response.data) {
      if (release.name) {
        allVersions.push(release.name);
      }
    }
  }

  return allVersions;
}

async function setup(): Promise<void> {
  try {
    // Get version of tool to be installed
    const version = await getVersion();
    core.info(`Installing Regal ${version}`)
    // Download the specific version of the tool, e.g. as a tarball/zipball
    const download = getDownloadObject(version);
    const pathToCLI = fs.mkdtempSync(path.join(os.tmpdir(), 'tmp'));

    await tc.downloadTool(
      download.url,
      path.join(pathToCLI, download.binaryName)
    );

    // Make the downloaded file executable
    fs.chmodSync(path.join(pathToCLI, download.binaryName), '755');

    await renameBinary(pathToCLI, download.binaryName);

    // Expose the tool by adding it to the PATH
    core.addPath(pathToCLI);

    core.info(`Setup Regal ${version}`);
  } catch (e) {
    core.setFailed(e as string | Error);
  }
}

if (require.main === module) {
  // eslint-disable-next-line no-void
  void setup();
}
