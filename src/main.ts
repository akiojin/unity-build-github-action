import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as os from 'os'
import { promises as fs } from 'fs'
import { Unity } from 'unity-command'

async function Run()
{
	try {
		const projectDirectory = core.getInput('project-directory')
		const unityVersion = await Unity.GetVersion(projectDirectory)
		const buildTarget = core.getInput('build-target')
		const outputDirectory = core.getInput('output-directory')

		var args = [
			'-quit',
			'-batchmode',
			'-nographics',
			'-silent-crashes',
			'-buildTarget', buildTarget,
			'-projectPath', projectDirectory,
			'-outputPath', outputDirectory,
			'-logFile', core.getInput('log-file')
		]

		if (!!core.getBooleanInput('disable-upm')) {
			args.push('-noUpm')
		}

		if (core.getInput('execute-method') !== '') {
			args.push('-executeMethod')
			args.push(core.getInput('execute-method'))
		}

		if (core.getInput('additional-arguments') !== '') {
			args = args.concat(core.getInput('additional-arguments').split(" "))
		}

		await exec.exec(Unity.GetExecutePath(os.platform(), unityVersion), args)
	} catch (ex: any) {
		core.setFailed(ex.message)
	}
}

Run()
