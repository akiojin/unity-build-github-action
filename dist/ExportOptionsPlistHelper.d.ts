export default class ExportOptionsPlistHelper {
    /**
     * Output ExportOptions.plist.
     *
     * @param outputDirctory Output directory.
     * @param teamID Export Team ID
     * @param compileBitcode Output Bitcode?
     * @param stripSwiftSymbols Output Symbols?
     * @returns Path of ExportOptions.plist
     */
    static Export(outputDirctory: string, compileBitcode: boolean, uploadSymbols: boolean, stripSwiftSymbols: boolean): Promise<string>;
    static Generate(compileBitcode: boolean, uploadSymbols: boolean, stripSwiftSymbols: boolean): string;
}
