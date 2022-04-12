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

/**
 * interface for ExportIPA
 */
interface ExportOptions
{
	/** Xcode workspace path */
	workspace?: string
	/** Xcode project path */
	project?: string
	/** Output directory path of ipa file */
	outputDirectory: string
	/** ipa file name */
	outputName: string
	/** Configuratin ('Debug' or 'Release') */
	configuration: string
	/** ipa file include bitcode? */
	includeBitcode: boolean
	/** ipa file include symbols? */
	includeSymbols: boolean
	/** Export method (appstore, adhoc, development, enterprise, developer_id, mac_installer_distribution) */
	exportMethod: string
	/** Team ID */
	exportTeamID: string
}

async function ExportIPA(options: ExportOptions): Promise<void>
{
	const script = ExportOptionsPlistHelper.Generate(options.includeBitcode)
	const plist = path.join(core.getInput('temporary-directory'), 'ExportOptions.plist')
	await fs.writeFile(plist, script)

	const builder = new ArgumentBuilder()
		.Append('gym')
		.Append('--output_directory', options.outputDirectory)
		.Append('--scheme', 'Unity-iPhone')
		.Append('--sdk', 'iphoneos')
		.Append('--configuration', options.configuration)
		.Append('--include_bitcode', options.includeBitcode.toString())
		.Append('--include_symbols', options.includeSymbols.toString())
		.Append('--export_method', options.exportMethod)
		.Append('--export_team_id', options.exportTeamID)
		.Append('--export_options', plist)
		.Append('--silent')

	if (!!options.workspace) {
		builder.Append('--workspace', options.workspace)
	} else {
		builder.Append('--project', options.project || path.join(__dirname, 'Unity-iPhone.xcodeproj'))
	}

	if (!!options.outputName) {
		builder.Append('--output_name', options.outputName)
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

	if (!!core.getInput('execute-method')) {
		builder.SetExecuteMethod(core.getInput('execute-method'))
	} else {
		builder.SetExecuteMethod('UnityBuildScript.PerformBuild')

		var keystore = core.getInput('keystore')

		if (!!core.getInput('keystore-base64')) {
			keystore = tmp.tmpNameSync() + '.keystore'
			await fs.writeFile(keystore, Buffer.from(core.getInput('keystore-base64'), 'base64'))
		}

		const script = UnityBuildScriptHelper.GenerateUnityBuildScript(
			outputDirectory,
			core.getInput('output-name'),
			core.getInput('configuration').toLowerCase() === 'debug',
			core.getInput('team-id'),
			core.getInput('provisioning-profile-uuid'),
			keystore,
			core.getInput('keystore-password'),
			core.getInput('keystore-alias'),
			core.getInput('keystore-alias-password')
		)

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
		const outputDirectory = core.getInput('build-target').toLowerCase() === 'ios'
			? core.getInput('temporary-directory') : core.getInput('output-directory')
		const outputName = core.getInput('output-name')

		await BuildUnityProject(outputDirectory)

		if (core.getInput('build-target').toLowerCase() === 'ios') {
			const options: ExportOptions = {
				outputDirectory: core.getInput('output-directory'),
				outputName: outputName,
				configuration: core.getInput('configuration'),
				includeBitcode: core.getBooleanInput('include-bitcode'),
				includeSymbols: core.getBooleanInput('include-symbols'),
				exportMethod: core.getInput('export-method'),
				exportTeamID: core.getInput('team-id')
			}

			try {
				options.workspace = path.join(outputDirectory, 'Unity-iPhone.xcworkspace')
				await fs.access(options.workspace)
			} catch (ex: any) {
				options.workspace = undefined
				options.project = path.join(outputDirectory, 'Unity-iPhone.xcodeproj')
			}

			await ExportIPA(options)
		}
	} catch (ex: any) {
		core.setFailed(ex.message)
	}
}

Run()
