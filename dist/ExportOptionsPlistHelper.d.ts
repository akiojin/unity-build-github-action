export default class ExportOptionsPlistHelper {
    /**
     * Output ExportOptions.plist.
     *
     * @param outputDirctory Output directory.
     * @param compileBitcode Output Bitcode?
     * @returns Path of ExportOptions.plist
     */
    static Export(outputDirctory: string, teamID: string, compileBitcode: boolean, stripSwiftSymbols: boolean): Promise<string>;
    static Generate(teamID: string, compileBitcode: boolean, stripSwiftSymbols: boolean): string;
}
