import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as os from 'os'
import { Unity, UnityCommandBuilder } from 'unity-command'

async function Run()
{
	try {
		const projectDirectory = core.getInput('project-directory')
		const unityVersion = await Unity.GetVersion(projectDirectory)
		const buildTarget = core.getInput('build-target')
		const outputDirectory = core.getInput('output-directory')

		const builder = new UnityCommandBuilder()
		builder.AddCommand('-buildTarget', buildTarget)
		builder.AddCommand('-projectPath', projectDirectory)
		builder.AddCommand('-outputPath', outputDirectory)
		builder.AddCommand('-logFile', core.getInput('log-file'))

		if (!!core.getBooleanInput('disable-upm')) {
			builder.AddCommand('-noUpm')
		}

		if (core.getInput('execute-method') !== '') {
			builder.AddCommand('-executeMethod', core.getInput('execute-method'))
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
