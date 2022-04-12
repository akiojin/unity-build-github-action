export default class ExportOptionsPlistHelper {
    /**
     * Output ExportOptions.plist.
     *
     * @param outputDirctory Output directory.
     * @param compileBitcode Output Bitcode?
     * @returns Path of ExportOptions.plist
     */
    static Export(outputDirctory: string, compileBitcode: boolean): Promise<string>;
    static Generate(compileBitcode: boolean): string;
}
