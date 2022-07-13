import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as os from 'os'
import * as fs from 'fs/promises'
import * as tmp from 'tmp'
import path from 'path'
import { Unity, UnityCommandBuilder } from '@akiojin/unity-command'
import { ArgumentBuilder } from '@akiojin/argument-builder'
import UnityBuildScriptHelper from './UnityBuildScriptHelper'
import ExportOptionsPlistHelper from './ExportOptionsPlistHelper'

async function ExportIPA(
    projectDirectory: string,
    outputDirectory: string): Promise<void>
{
    const includeBitcode = core.getBooleanInput('include-bitcode')
    const includeSymbols = core.getBooleanInput('include-symbols');

    const plist = await ExportOptionsPlistHelper.Export(
        core.getInput('temporary-directory'),
        includeBitcode,
        !includeSymbols)

    const builder = new ArgumentBuilder()
        .Append('gym')
        .Append('--output_directory', outputDirectory)
        .Append('--scheme', 'Unity-iPhone')
        .Append('--sdk', 'iphoneos')
        .Append('--configuration', core.getInput('configuration'))
        .Append('--include_bitcode', includeBitcode.toString())
        .Append('--include_symbols', includeSymbols.toString())
        .Append('--export_method', core.getInput('export-method'))
        .Append('--export_team_id', core.getInput('team-id'))
        .Append('--export_options', plist)
        .Append('--skip_build_archive', `false`)
        .Append('--silent')

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

async function BuildUnityProject(outputDirectory: string)
{
    const builder = new UnityCommandBuilder()
        .SetBuildTarget(core.getInput('build-target'))
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
            core.getInput('build-target'),
            core.getInput('configuration').toLowerCase() === 'debug',
            core.getBooleanInput('enable-app-bundle'),
            core.getInput('team-id'),
            core.getInput('provisioning-profile-uuid'),
            keystore,
            core.getInput('keystore-password'),
            core.getInput('keystore-alias'),
            core.getInput('keystore-alias-password'))

        const cs = path.join(core.getInput('project-directory'), 'Assets', 'Editor', 'UnityBuildScript.cs')
        await fs.mkdir(path.dirname(cs), {recursive: true})
        await fs.writeFile(cs, script)

        core.startGroup('Generate "UnityBuildScript.cs"')
        core.info(`UnityBuildScript.cs:\n${script}`)
        core.endGroup()
    }

    if (!!core.getInput('additional-arguments')) {
        builder.Append(core.getInput('additional-arguments').split(' '))
    }

    var version = core.getInput('unity-version')

    if (version === 'project') {
        version = await Unity.GetVersion(core.getInput('project-directory'))
    }

    core.startGroup('Run Unity')
    await exec.exec(Unity.GetExecutePath(os.platform(), version), builder.Build())
    core.endGroup()
}

async function Run()
{
    try {
        const isiOS = core.getInput('build-target').toLowerCase() === 'ios'
        const outputDirectory = core.getInput(!!isiOS ? 'temporary-directory' : 'output-directory')

        await BuildUnityProject(outputDirectory)

        if (!!isiOS && (!!core.getInput('team-id') && !!core.getInput('provisioning-profile-uuid'))) {
            await ExportIPA(
                core.getInput('temporary-directory'),
                core.getInput('output-directory'))
        }
    } catch (ex: any) {
        core.setFailed(ex.message)
    }
}

Run()
