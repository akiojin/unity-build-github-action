import * as core from '@actions/core'
import * as fs from 'fs/promises'
import path from 'path'

export default class ExportOptionsPlistHelper
{
    /**
     * Output ExportOptions.plist.
     * 
     * @param outputDirctory Output directory.
     * @param compileBitcode Output Bitcode?
     * @returns Path of ExportOptions.plist
     */
    static async Export(
        outputDirctory: string,
        teamID: string,
        compileBitcode: boolean,
        stripSwiftSymbols: boolean): Promise<string>
    {
        const script = ExportOptionsPlistHelper.Generate(teamID, compileBitcode, stripSwiftSymbols)
        const plist = path.join(outputDirctory, 'ExportOptions.plist')
        await fs.writeFile(plist, script)
    
        core.startGroup('Generate "ExportOptions.plist"')
        core.info(`ExportOptions.plist:\n${script}`)
        core.endGroup()
    
        return plist;
    }
    
    static Generate(
        teamID: string,
        compileBitcode: boolean,
        stripSwiftSymbols: boolean): string
    {
        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>compileBitcode</key>
    <${compileBitcode}/>
    <key>stripSwiftSymbols</key>
    <${stripSwiftSymbols}/>
    <key>teamID</key>
    <string>${teamID}</string>
    <key>thinning</key>
    <string>&lt;none&gt;</string>
  </dic>
</plist>`;
    }
}