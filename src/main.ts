import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as os from 'os'
import * as fs from 'fs/promises'
import * as tmp from 'tmp'
import path from 'path'
import { Unity, UnityCommandBuilder } from '@akiojin/unity-command'
import { ArgumentBuilder } from '@akiojin/argument-builder'
import UnityBuildScriptHelper from './UnityBuildScriptHelper'

async function ExportIPA(
	workspace: string,
	project: string,
	outputDirectory: string,
	outputName: string,
	schema: string,
	sdk: string,
	configuration: string,
	includeBitcode: boolean,
	includeSymbols: boolean,
	exportMethod: string,
	exportTeamID: string
)
{
	const builder = new ArgumentBuilder()
		.Append('gym')
		.Append('--output_directory', outputDirectory)
		.Append('--scheme', schema)
		.Append('--sdk', sdk)
		.Append('--configuration', configuration)
		.Append('--include_bitcode', includeBitcode.toString())
		.Append('--include_symbols', includeSymbols.toString())
		.Append('--export_method', exportMethod)
		.Append('--export_team_id', exportTeamID)

	if (workspace !== '') {
		builder.Append('--workspace', workspace)
	} else {
		builder.Append('--project', project)
	}

	if (outputName !== '') {
		builder.Append('--output_name', outputName)
	}

	core.startGroup('Run fastlane "gym"')
	await exec.exec('fastlane', builder.Build())
	core.endGroup()
}

async function BuildUnityProject(
	projectDirectory: string,
	outputDirectory: string,
	outputName: string,
	unityVersion: string,
	buildTarget: string,
	configuration: string,
	logFile: string,
	executeMethod: string,
	teamID: string,
	provisioningProfileUUID: string,
	keystore: string,
	keystoreBase64: string,
	keystorePassword: string,
	keystoreAlias: string,
	keystoreAliasPassword: string,
	additionalArguments: string
)
{
	unityVersion = unityVersion || await Unity.GetVersion(projectDirectory)

	const builder = new UnityCommandBuilder()
		.SetBuildTarget(buildTarget)
		.SetProjectPath(projectDirectory)
		.SetLogFile(logFile)

	if (executeMethod !== '') {
		builder.SetExecuteMethod(executeMethod)
	} else {
		builder.SetExecuteMethod('UnityBuildScript.PerformBuild')

		if (keystoreBase64 !== '') {
			keystore = tmp.tmpNameSync() + '.keystore'
			await fs.writeFile(keystore, Buffer.from(keystoreBase64, 'base64'))
		}

		const script = UnityBuildScriptHelper.GenerateUnityBuildScript(
			outputDirectory,
			outputName,
			configuration.toLowerCase() === 'debug',
			teamID,
			provisioningProfileUUID,
			keystore,
			keystorePassword,
			keystoreAlias,
			keystoreAliasPassword
		)

		const cs = path.join(projectDirectory, 'Assets', 'Editor', 'UnityBuildScript.cs')
		await fs.mkdir(path.dirname(cs), {recursive: true})
		await fs.writeFile(cs, script)

		core.startGroup('Generate "UnityBuildScript.cs"')
		core.info(`UnityBuildScript.cs:\n${script}`)
		core.endGroup()
	}

	if (additionalArguments !== '') {
		builder.Append(additionalArguments.split(' '))
	}

	core.startGroup('Run Unity build')
	await exec.exec(Unity.GetExecutePath(os.platform(), unityVersion), builder.Build())
	core.endGroup()
}

async function Run()
{
	try {
		const buildTarget = core.getInput('build-target')
		const outputDirectory = buildTarget.toLowerCase() === 'ios'
			? core.getInput('temporary-directory') : core.getInput('output-directory')
		const outputName = core.getInput('output-name')
		const configuration = core.getInput('configuration')
		const teamID = core.getInput('team-id')

		await BuildUnityProject(
			core.getInput('project-directory'),
			outputDirectory,
			outputName,
			core.getInput('unity-version'),
			buildTarget,
			configuration,
			core.getInput('log-file'),
			core.getInput('execute-method'),
			teamID,
			core.getInput('provisioning-profile-uuid'),
			core.getInput('keystore'),
			core.getInput('keystore-base64'),
			core.getInput('keystore-password'),
			core.getInput('keystore-alias'),
			core.getInput('keystore-alias-password'),
			core.getInput('additional-arguments')
		)

		if (buildTarget.toLowerCase() === 'ios') {
			let workspace = ''
			let project = ''
			try {
				await fs.access(path.join(outputDirectory, 'Unity-iPhone.xcworkspace'))
				workspace = path.join(outputDirectory, 'Unity-iPhone.xcworkspace')
			} catch (ex: any) {
				project = path.join(outputDirectory, 'Unity-iPhone.xcodeproj')
			}

			await ExportIPA(
				workspace,
				project,
				core.getInput('output-directory'),
				outputName,
				core.getInput('scheme'),
				core.getInput('sdk'),
				configuration,
				core.getBooleanInput('include-bitcode'),
				core.getBooleanInput('include-symbols'),
				core.getInput('export-method'),
				teamID
			)
		}
	} catch (ex: any) {
		core.setFailed(ex.message)
	}
}

Run()
