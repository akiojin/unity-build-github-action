import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
import * as fs from 'fs/promises'
import * as tmp from 'tmp'
import path from 'path'
import { UnityUtils, UnityCommandBuilder } from '@akiojin/unity-command'
import UnityBuildScriptHelper from './UnityBuildScriptHelper'
import XcodeHelper from './XcodeHelper'
import MacOSHelper from './MacOSHelper'

function GetOutputPath(): string
{
  const outputPath = path.join(core.getInput('output-directory'), core.getInput('output-name'))

  switch (UnityUtils.GetBuildTarget()) {
  default:
    throw Error(`Not supported platform. Target=${UnityUtils.GetBuildTarget()}`)
  case 'iOS':
    return `${outputPath}.ipa`
  case 'Android':
    return `${outputPath}.aab`
  case 'Win64':
    return `${outputPath}.zip`
  case 'OSXUniversal':
    return `${outputPath}.app`
  }
}

async function BuildUnityProject(outputDirectory: string)
{
  const builder = new UnityCommandBuilder()
    .SetBuildTarget(UnityUtils.GetBuildTarget())
    .SetProjectPath(core.getInput('project-directory'))
    .SetLogFile(core.getInput('log-file'))
    .EnablePackageManagerTraces()

  if (!!core.getInput('execute-method')) {
    builder.SetExecuteMethod(core.getInput('execute-method'))
  } else {
    builder.SetExecuteMethod('unity_build_github_action.UnityBuildScript.PerformBuild')

    var keystore = core.getInput('keystore')

    if (core.getInput('keystore-base64')) {
      keystore = tmp.tmpNameSync() + '.keystore'
      await fs.writeFile(keystore, Buffer.from(core.getInput('keystore-base64'), 'base64'))
    }

    const script = UnityBuildScriptHelper.GenerateUnityBuildScript(
      outputDirectory,
      core.getInput('output-name'),
      UnityUtils.GetBuildTarget(),
      Number(core.getInput('revision')),
      core.getInput('configuration').toLowerCase() === 'debug',
      core.getInput('team-id'),
      core.getInput('provisioning-profile-uuid'),
      core.getInput('provisioning-profile-type'),
      core.getBooleanInput('include-bitcode'),
      keystore,
      core.getInput('keystore-password'),
      core.getInput('keystore-alias'),
      core.getInput('keystore-alias-password'))

    const buildScriptName = 'UnityBuildScript.cs'
    const cs = path.join(core.getInput('project-directory'), 'Assets', 'Editor', buildScriptName)
    await fs.mkdir(path.dirname(cs), {recursive: true})
    await fs.writeFile(cs, script)

    core.startGroup(`Generate "${buildScriptName}"`)
    core.info(`${buildScriptName}:\n${script}`)
    core.endGroup()
  }

  if (core.getInput('additional-arguments')) {
    builder.Append(core.getInput('additional-arguments'))
  }

  const version = core.getInput('unity-version') ||
    await UnityUtils.GetCurrentUnityVersion(core.getInput('project-directory'))

  core.startGroup('Run Unity')
  await exec.exec(UnityUtils.GetUnityPath(version, core.getInput('install-directory')), builder.Build())
  core.endGroup()
}

async function Run()
{
  try {
    const isiOS = UnityUtils.GetBuildTarget() === 'iOS'
    const isWindows = UnityUtils.GetBuildTarget() === 'Win64'
    const ismacOS = UnityUtils.GetBuildTarget() === 'OSXUniversal'
    const unityOutputDirectory = core.getInput(isiOS || isWindows || ismacOS ? 'temporary-directory' : 'output-directory')

    await io.mkdirP(unityOutputDirectory)
    await BuildUnityProject(unityOutputDirectory)

    if (core.getInput('symbols')) {
      const projectSettings = await UnityUtils.AddDefineSymbols(
        core.getInput('build-target'),
        core.getInput('symbols'),
        core.getInput('project-directory')
      )

      core.startGroup('Update ProjectSettings.asset')
      core.info(`ProjectSettings.asset:\n${projectSettings}`)
      core.endGroup()
    }

    if (isiOS && (core.getInput('team-id') && core.getInput('provisioning-profile-name'))) {
      const plist = await XcodeHelper.GenerateExportOptions(
        core.getInput('temporary-directory'),
        core.getInput('app-id'),
        core.getInput("provisioning-profile-name"),
        core.getInput('team-id'),
        core.getInput('export-method'),
        core.getBooleanInput('include-bitcode'),
        core.getBooleanInput('include-symbols'),
        core.getBooleanInput('strip-swift-symbols'))

      await XcodeHelper.ExportIPA(
        core.getInput('configuration'),
        core.getInput('output-directory'),
        core.getInput('output-name'),
        plist,
        core.getInput('temporary-directory'))
    } else if (isWindows) {
      await fs.mkdir(core.getInput('output-directory'), {recursive: true})
      await exec.exec(
        'powershell',
        [
          'compress-archive',
          '-Force',
          `${core.getInput('temporary-directory')}/*`,
          `${core.getInput('output-directory')}/${core.getInput('output-name')}`
        ])
    } else if (ismacOS) {
      const plist = await MacOSHelper.GeneratePackagePlist(path.basename(core.getInput('output-name'), '.app'))

      await fs.mkdir(core.getInput('output-directory'), {recursive: true})
      await MacOSHelper.ExportPKG(
        core.getInput('app-id'),
        core.getInput('temporary-directory'),
        '/Applications',
        Number(core.getInput('revision')),
        core.getInput('output-directory'),
        plist)
    }

    const outputPath = GetOutputPath()
    core.setOutput('output-path', outputPath)
    core.exportVariable('UNITY_BUILD_OUTPUT_PATH', outputPath)
    core.info(`Output Path: ${outputPath}`)
  } catch (ex: any) {
    core.setFailed(ex.message)
  }
}

Run()
