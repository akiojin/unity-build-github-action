import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as os from 'os'
import { Unity, UnityCommandBuilder } from '@akiojin/unity-command'
import * as fs from 'fs/promises'
import UnityBuildScriptHelper from './UnityBuildScriptHelper'
import path from 'path'

async function Run()
{
	try {
		const projectDirectory = core.getInput('project-directory')
		const unityVersion = await Unity.GetVersion(projectDirectory)

		const builder = new UnityCommandBuilder()
		builder.SetBuildTarget(core.getInput('build-target'))
		builder.SetProjectPath(projectDirectory)
		builder.SetLogFile(core.getInput('log-file'))

		if (core.getInput('execute-method') !== '') {
			builder.SetExecuteMethod(core.getInput('execute-method'))
		} else {
			builder.SetExecuteMethod('UnityBuildScript.PerformBuild')

			const script = UnityBuildScriptHelper.GenerateUnityBuildScript(
				core.getInput('output-directory'),
				core.getInput('output-file-name'),
				core.getBooleanInput('development'),
				core.getInput('team-id'),
				core.getInput('provisioning-profile-uuid'),
				core.getInput('keystore'),
				core.getInput('keystore-alias'),
				core.getInput('keystore-password'),
				core.getInput('keystore-alias-password')				
			)

			const cs = path.join(projectDirectory, 'Assets', 'Editor', 'UnityBuildScript.cs')
			await fs.mkdir(path.dirname(cs), {recursive: true})
			await fs.writeFile(cs, script)

			core.startGroup('Generate "UnityBuildScript.cs"')
			core.info(`UnityBuildScript.cs:\n${script}`)
			core.endGroup()
		}

		if (core.getInput('additional-arguments') !== '') {
			builder.Append(core.getInput('additional-arguments').split(' '))
		}

		core.startGroup('Run Unity')
		await exec.exec(Unity.GetExecutePath(os.platform(), unityVersion), builder.Build())
		core.endGroup()
	} catch (ex: any) {
		core.setFailed(ex.message)
	}
}

Run()
