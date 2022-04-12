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
        compileBitcode: boolean): Promise<string>
    {
        const script = ExportOptionsPlistHelper.Generate(compileBitcode)
        const plist = path.join(outputDirctory, 'ExportOptions.plist')
        await fs.writeFile(plist, script)
    
        core.startGroup('Generate "ExportOptions.plist"')
        core.info(`ExportOptions.plist:\n${script}`)
        core.endGroup()
    
        return plist;
    }
    
    static Generate(compileBitcode: boolean): string
    {
        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>compileBitcode</key>
    <bool>${compileBitcode}</bool>
  </dic>
</plist>`;
    }
}