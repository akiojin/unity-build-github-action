export default class UnityBuildScriptHelper {
    static ToTitleCase(str?: string): string;
    static GenerateUnityBuildScript(outputDirectory: string, outputFileName: string, buildTarget: string, revision: number, development?: boolean, teamID?: string, provisioningProfileUUID?: string, provisioningProfileType?: string, keystore?: string, keystorePassword?: string, keystoreAlias?: string, keystoreAliasPassword?: string): string;
}
