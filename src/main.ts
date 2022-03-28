import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as os from 'os'
import * as fs from 'fs/promises'
import * as tmp from 'tmp'
import path from 'path'
import { Unity, UnityCommandBuilder } from '@akiojin/unity-command'
import { ArgumentBuilder } from '@akiojin/argument-builder'
import UnityBuildScriptHelper from './UnityBuildScriptHelper'

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
		.Append('--skip_package_pkg', 'true')
		.Append('--skip_package_dependencies_resolution', 'true')
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

interface UnityBuildOptions
{
	projectDirectory: string
	outputDirectory: string
	outputName: string
	unityVersion: string
	buildTarget: string
	configuration: string
	logFile: string
	executeMethod: string
	teamID?: string
	provisioningProfileUUID?: string
	keystore?: string
	keystoreBase64?: string
	keystorePassword?: string
	keystoreAlias?: string
	keystoreAliasPassword?: string
	additionalArguments?: string
}

async function BuildUnityProject(optioins: UnityBuildOptions)
{
	optioins.unityVersion = optioins.unityVersion || await Unity.GetVersion(optioins.projectDirectory)

	const builder = new UnityCommandBuilder()
		.SetBuildTarget(optioins.buildTarget)
		.SetProjectPath(optioins.projectDirectory)
		.SetLogFile(optioins.logFile)

	if (!!optioins.executeMethod) {
		builder.SetExecuteMethod(optioins.executeMethod)
	} else {
		builder.SetExecuteMethod('UnityBuildScript.PerformBuild')

		if (!!optioins.keystoreBase64) {
			optioins.keystore = tmp.tmpNameSync() + '.keystore'
			await fs.writeFile(optioins.keystore, Buffer.from(optioins.keystoreBase64, 'base64'))
		}

		const script = UnityBuildScriptHelper.GenerateUnityBuildScript(
			optioins.outputDirectory,
			optioins.outputName,
			optioins.configuration.toLowerCase() === 'debug',
			optioins.teamID,
			optioins.provisioningProfileUUID,
			optioins.keystore,
			optioins.keystorePassword,
			optioins.keystoreAlias,
			optioins.keystoreAliasPassword
		)

		const cs = path.join(optioins.projectDirectory, 'Assets', 'Editor', 'UnityBuildScript.cs')
		await fs.mkdir(path.dirname(cs), {recursive: true})
		await fs.writeFile(cs, script)

		core.startGroup('Generate "UnityBuildScript.cs"')
		core.info(`UnityBuildScript.cs:\n${script}`)
		core.endGroup()
	}

	if (!!optioins.additionalArguments) {
		builder.Append(optioins.additionalArguments.split(' '))
	}

	core.startGroup('Run Unity')
	await exec.exec(Unity.GetExecutePath(os.platform(), optioins.unityVersion), builder.Build())
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

		const options: UnityBuildOptions = {
			projectDirectory: core.getInput('project-directory'),
			outputDirectory: outputDirectory,
			outputName: outputName,
			unityVersion: core.getInput('unity-version'),
			buildTarget: buildTarget,
			configuration: configuration,
			logFile: core.getInput('log-file'),
			executeMethod: core.getInput('execute-method'),
			additionalArguments: core.getInput('additional-arguments'),

			teamID: core.getInput('team-id'),
			provisioningProfileUUID: core.getInput('provisioning-profile-uuid'),

			keystore: core.getInput('keystore'),
			keystoreBase64: core.getInput('keystore-base64'),
			keystorePassword: core.getInput('keystore-password'),
			keystoreAlias: core.getInput('keystore-alias'),
			keystoreAliasPassword: core.getInput('keystore-alias-password')
		}

		await BuildUnityProject(options)

		if (buildTarget.toLowerCase() === 'ios') {
			const options: ExportOptions = {
				outputDirectory: core.getInput('output-directory'),
				outputName: outputName,
				configuration: configuration,
				includeBitcode: core.getBooleanInput('include-bitcode'),
				includeSymbols: core.getBooleanInput('include-symbols'),
				exportMethod: core.getInput('export-method'),
				exportTeamID: teamID
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
