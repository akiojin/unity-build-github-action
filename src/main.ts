import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as os from 'os'
import { Unity, UnityCommandBuilder } from 'unity-command'

async function Run()
{
	try {
		const projectDirectory = core.getInput('project-directory')
		const unityVersion = await Unity.GetVersion(projectDirectory)

		const builder = new UnityCommandBuilder()
		builder.SetBuildTarget(core.getInput('build-target'))
		builder.SetProjectPath(projectDirectory)
		builder.SetOutputPath(core.getInput('output-directory'))
		builder.SetLogFile(core.getInput('log-file'))

		if (!!core.getBooleanInput('disable-upm')) {
			builder.DisableUPM()
		}

		if (core.getInput('execute-method') !== '') {
			builder.SetExecuteMethod(core.getInput('execute-method'))
		}

		if (core.getInput('additional-arguments') !== '') {
			builder.AddCommand(core.getInput('additional-arguments').split(' '))
		}

		await exec.exec(Unity.GetExecutePath(os.platform(), unityVersion), builder.Build())
	} catch (ex: any) {
		core.setFailed(ex.message)
	}
}

Run()
