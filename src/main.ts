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

async function ExportOptionsPlist(includeBitcode: boolean): Promise<string>
{
	const script = ExportOptionsPlistHelper.Generate(includeBitcode)
	const plist = path.join(core.getInput('temporary-directory'), 'ExportOptions.plist')
	await fs.writeFile(plist, script)

	core.startGroup('Generate "ExportOptions.plist"')
	core.info(`ExportOptions.plist:\n${script}`)
	core.endGroup()

	return plist;
}

async function ExportIPA(outputDirectory: string): Promise<void>
{
	let workspace = ''
	let project = ''

	try {
		workspace = path.join(outputDirectory, 'Unity-iPhone.xcworkspace')
		await fs.access(workspace)
	} catch (ex: any) {
		workspace = ''
		project = path.join(outputDirectory, 'Unity-iPhone.xcodeproj')
	}

	const includeBitcode = core.getBooleanInput('include-bitcode')

	const plist = await ExportOptionsPlistHelper.Export(
		core.getInput('temporary-directory'),
		includeBitcode)

	const builder = new ArgumentBuilder()
		.Append('gym')
		.Append('--output_directory', core.getInput('output-directory'))
		.Append('--scheme', 'Unity-iPhone')
		.Append('--sdk', 'iphoneos')
		.Append('--configuration', core.getInput('configuration'))
		.Append('--include_bitcode', includeBitcode.toString())
		.Append('--include_symbols', core.getBooleanInput('include-symbols').toString())
		.Append('--export_method', core.getInput('export-method'))
		.Append('--export_team_id', core.getInput('team-id'))
		.Append('--export_options', plist)
		.Append('--silent')

	if (!!workspace) {
		builder.Append('--workspace', workspace)
	} else {
		builder.Append('--project', project || path.join(__dirname, 'Unity-iPhone.xcodeproj'))
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
			await ExportIPA(core.getInput('output-directory'))
		}
	} catch (ex: any) {
		core.setFailed(ex.message)
	}
}

Run()
