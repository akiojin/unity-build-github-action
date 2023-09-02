import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
import * as fs from 'fs/promises'
import * as tmp from 'tmp'
import path from 'path'
import { UnityUtils, UnityCommandBuilder } from '@akiojin/unity-command'
import { ArgumentBuilder } from '@akiojin/argument-builder'
import UnityBuildScriptHelper from './UnityBuildScriptHelper'
import ExportOptionsPlistHelper from './ExportOptionsPlistHelper'

async function ExportIPA(
    projectDirectory: string,
    outputDirectory: string): Promise<void>
{
    const includeBitcode = core.getBooleanInput('include-bitcode')
    const includeSymbols = core.getBooleanInput('include-symbols')

    const plist = await ExportOptionsPlistHelper.Export(
        core.getInput('temporary-directory'),
        core.getInput('app-id'),
        core.getInput('provisioning-profile-name'),
        includeBitcode,
        !includeSymbols,
        core.getBooleanInput('strip-swift-symbols'))

    const builder = new ArgumentBuilder()
        .Append('gym')
        .Append('--scheme', 'Unity-iPhone')
        .Append('--clean')
        .Append('--output_directory', outputDirectory)
        .Append('--configuration', core.getInput('configuration'))
        .Append('--silent')
        .Append('--include_bitcode', includeBitcode.toString())
        .Append('--include_symbols', includeSymbols.toString())
        .Append('--export_method', core.getInput('export-method'))
        .Append('--export_options', plist)
        .Append('--skip_build_archive', `false`)
        .Append('--sdk', 'iphoneos')
        .Append('--export_team_id', core.getInput('team-id'))
        .Append('--skip_profile_detection')

    try {
        const workspace = path.join(projectDirectory, 'Unity-iPhone.xcworkspace')
        await fs.access(workspace)
        builder.Append('--workspace', workspace)
    } catch (ex: any) {
        builder.Append('--project', path.join(projectDirectory, 'Unity-iPhone.xcodeproj'))
    }

    if (!!core.getInput('output-name')) {
        builder.Append('--output_name', core.getInput('output-name'))
    }

    core.startGroup('Run fastlane "gym"')
    await exec.exec('fastlane', builder.Build())
    core.endGroup()
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
        return `${outputPath}.exe`
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

        if (!!core.getInput('keystore-base64')) {
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

    if (!!core.getInput('additional-arguments')) {
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
        const outputDirectory = core.getInput(!!isiOS ? 'temporary-directory' : 'output-directory')

        await io.mkdirP(outputDirectory)
        await BuildUnityProject(outputDirectory)

        if (core.getInput('symbols')) {
            UnityUtils.AddDefineSymbols(
                core.getInput('build-target'),
                core.getInput('symbols'),
                core.getInput('project-directory')
            )
        }

        if (!!isiOS && (!!core.getInput('team-id') && !!core.getInput('provisioning-profile-uuid'))) {
            await ExportIPA(
                core.getInput('temporary-directory'),
                core.getInput('output-directory'))
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
