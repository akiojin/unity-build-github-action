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

function IsDevelopment(): boolean
{
  return core.getInput('configuration').toLowerCase() === 'debug'
}

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
    return `${outputPath}.pkg`
  case 'Switch':
    return IsDevelopment() ? `${outputPath}.nspd` : `${outputPath}.nsp`
  }
}

function GetAppID(): string
{
  if (UnityUtils.GetBuildTarget() === 'Android') {
    return core.getInput('app-id').replace('-', '')
  } else {
    return core.getInput('app-id')
  }
}

async function BuildUnityProject(outputDirectory: string)
{
  const builder = new UnityCommandBuilder()
    .SetBuildTarget(UnityUtils.GetBuildTarget())
    .SetProjectPath(core.getInput('project-directory'))
    .SetLogFile(core.getInput('log-file'))
    .EnablePackageManagerTraces()

  if (core.getInput('execute-method')) {
    builder.SetExecuteMethod(core.getInput('execute-method'))
  } else {
    builder.SetExecuteMethod('unity_build_github_action.UnityBuildScript.PerformBuild')

    var keystore = core.getInput('keystore')

    if (core.getInput('keystore-base64')) {
      keystore = tmp.tmpNameSync() + '.keystore'
      await fs.writeFile(keystore, Buffer.from(core.getInput('keystore-base64'), 'base64'))
    }

    const script = UnityBuildScriptHelper.GenerateUnityBuildScript(
      GetAppID(),
      outputDirectory,
      core.getInput('output-name'),
      UnityUtils.GetBuildTarget(),
      Number(core.getInput('revision')),
      IsDevelopment(),
      core.getInput('bundle-version'),
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
    await io.mkdirP(path.dirname(cs))
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

async function PostprocessIOS(): Promise<void>
{
  if (!core.getInput('team-id') || !core.getInput('provisioning-profile-name')) {
    return
  }

  const plist = await XcodeHelper.GenerateExportOptions(
    core.getInput('temporary-directory'),
    GetAppID(),
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
}

async function PostprocessWindows(): Promise<void>
{
  core.startGroup('Run compress-archive')

  await exec.exec(
    'powershell',
    [
      'compress-archive',
      '-Force',
      `${core.getInput('temporary-directory')}/*`,
      `${core.getInput('output-directory')}/${core.getInput('output-name')}`
    ])

  core.endGroup()
}

async function PostprocessMacOS(): Promise<void>
{
  if (!GetAppID()) {
    return
  }

  const outputName = `${core.getInput('output-name')}.app`
  const plist = await MacOSHelper.GeneratePackagePlist(outputName)

  await MacOSHelper.ExportPKG(
    GetAppID(),
    core.getInput('temporary-directory'),
    core.getInput('install-location'),
    Number(core.getInput('revision')),
    GetOutputPath(),
    plist)
}

function IsPostprocess(): boolean
{
  switch (UnityUtils.GetBuildTarget()) {
  default:
    return false
  case 'iOS':
  case 'Win64':
  case 'OSXUniversal':
    return true
  }
}

async function Preprocess(): Promise<void>
{
  await io.mkdirP(core.getInput('temporary-directory'))
  await io.mkdirP(core.getInput('output-directory'))

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
}

async function Postprocess(): Promise<void>
{
  switch (UnityUtils.GetBuildTarget()) {
  case 'iOS':
    await PostprocessIOS()
    break
  case 'Win64':
    await PostprocessWindows()
    break
  case 'OSXUniversal':
    await PostprocessMacOS()
    break
  }
}

async function Run()
{
  try {
    await Preprocess()
    await BuildUnityProject(core.getInput(IsPostprocess() ? 'temporary-directory' : 'output-directory'))
    await Postprocess()

    const outputPath = GetOutputPath()
    core.setOutput('output-path', outputPath)
    core.exportVariable('UNITY_BUILD_OUTPUT_PATH', outputPath)
    core.info(`Output Path: ${outputPath}`)
  } catch (ex: any) {
    core.setFailed(ex.message)
  }
}

Run()
