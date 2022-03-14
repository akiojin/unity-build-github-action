import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as os from 'os'

function GetUnityVersionPath(os: string, unityVersion: string)
{
	switch (os) {
	default:
	case 'darwin':
		return `/Applications/Unity/Hub/Editor/${unityVersion}/Unity.app/Contents/MacOS/Unity`
	case 'win32':
		return `C:\\Program Files\\Unity\\Hub\\Editor\\${unityVersion}\\Editor\\Unity.exe`
	}
}

async function Run()
{
	try {
		const unityVersion = core.getInput('unity-version')
		const buildTarget = core.getInput('build-target')
		const projectDirectory = core.getInput('project-directory')
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
			args.concat(core.getInput('additional-arguments').split(" "))
		}

		await exec.exec(GetUnityVersionPath(os.platform(), unityVersion), args)
	} catch (ex: any) {
		core.setFailed(ex.message)
	}
}

Run()
