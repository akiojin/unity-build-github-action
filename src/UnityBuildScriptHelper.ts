import internal from "stream";

export default class UnityBuildScriptHelper
{
    static GenerateUnityBuildScript(
        outputDirectory: string,
        outputFileName: string,
        buildTarget: string,
        revision: number,
        development: boolean = false,
        teamID?: string,
        provisioningProfileUUID?: string,
        provisioningProfileType?: string,
        keystore?: string,
        keystorePassword?: string,
        keystoreAlias?: string,
        keystoreAliasPassword?: string): string
    {
        return `namespace unity_build_github_action
{
    using System;
    using System.IO;
    using System.Linq;
    using System.Text;
    using UnityEditor;
    using UnityEditor.Build.Reporting;
    using UnityEngine;

    public class UnityBuildScript
    {
        const string OutputFileName = "${outputFileName}";
        const string OutputDirectory = @"${outputDirectory}";
        const string Target = "${buildTarget}";
        const bool Development = ${development};
        const int Revision = ${revision};

        // for iOS
        const string TeamID = "${teamID}";
        const string ProvisioningProfileUUID = "${provisioningProfileUUID}";
        const ProvisioningProfileType Type = ProvisioningProfileType.${provisioningProfileType};

        // for Android
        const string Keystore = @"${keystore}";
        const string KeystorePassword = "${keystorePassword}";
        const string KeystoreAlias = "${keystoreAlias}";
        const string KeystoreAliasPassword = "${keystoreAliasPassword}";

        static BuildTarget ActiveBuildTarget
            => EditorUserBuildSettings.activeBuildTarget;

        static BuildTargetGroup ActiveBuildTargetGroup
            => BuildPipeline.GetBuildTargetGroup(ActiveBuildTarget);

#if UNITY_2022_1_OR_NEWER
        static NamedBuildTarget CurrentTarget
            => NamedBuildTarget.FromBuildTargetGroup(ActiveBuildTargetGroup);
#else
        static BuildTargetGroup CurrentTarget
            => ActiveBuildTargetGroup;
#endif

        static string GetBuildTargetOutputFileName()
            => ActiveBuildTarget switch {
                BuildTarget.Android => $"{OutputFileName}.aab",
                BuildTarget.StandaloneWindows => $"{OutputFileName}.exe",
                BuildTarget.StandaloneWindows64 => $"{OutputFileName}.exe",
                BuildTarget.StandaloneOSX => $"{OutputFileName}.app",
                _ => string.Empty
            };

        static BuildOptions GetBuildOptions()
        {
            var options = BuildOptions.None;

            if (!!Development) {
                options |= BuildOptions.Development;
            }

            return options;
        }

        static void ConfigureForiOS()
        {
            PlayerSettings.iOS.appleEnableAutomaticSigning = false;
            PlayerSettings.iOS.buildNumber = Revision.ToString();
            PlayerSettings.iOS.iOSManualProvisioningProfileType = Type;

            EditorUserBuildSettings.iOSXcodeBuildConfig = !!Development ?
                XcodeBuildConfig.Debug : XcodeBuildConfig.Release;

            if (!string.IsNullOrWhiteSpace(TeamID)) {
                PlayerSettings.iOS.appleDeveloperTeamID = TeamID;
            }

            if (!string.IsNullOrWhiteSpace(ProvisioningProfileUUID)) {
                PlayerSettings.iOS.iOSManualProvisioningProfileID = ProvisioningProfileUUID;
            }
        }

        static void ConfigureForAndroid()
        {
            PlayerSettings.Android.bundleVersionCode = Revision;

            EditorUserBuildSettings.androidBuildType = !!Development ?
                AndroidBuildType.Debug : AndroidBuildType.Release;

            PlayerSettings.Android.keystoreName = Keystore;
            PlayerSettings.Android.useCustomKeystore = !string.IsNullOrWhiteSpace(PlayerSettings.Android.keystoreName);

            if (!!PlayerSettings.Android.useCustomKeystore) {
                if (!!string.IsNullOrWhiteSpace(KeystorePassword) ||
                    !!string.IsNullOrWhiteSpace(KeystoreAliasPassword)) {
                    throw new Exception("Keystore password or keystore alias password not specified.");
                }

                PlayerSettings.Android.keystorePass = KeystorePassword;

                if (!string.IsNullOrWhiteSpace(KeystoreAlias)) {
                    PlayerSettings.Android.keyaliasName = KeystoreAlias;
                }

                PlayerSettings.Android.keyaliasPass = KeystoreAliasPassword;
            }

            EditorUserBuildSettings.buildAppBundle = true;
        }

        static void Configure()
        {
            PlayerSettings.SetScriptingBackend(CurrentTarget, ScriptingImplementation.IL2CPP);
            PlayerSettings.SetArchitecture(CurrentTarget, 1);

            EditorUserBuildSettings.development = Development;
            EditorUserBuildSettings.allowDebugging = Development;
            EditorUserBuildSettings.connectProfiler = Development;
            EditorUserBuildSettings.symlinkSources = Development;
            EditorUserBuildSettings.buildWithDeepProfilingSupport = Development;

            switch (ActiveBuildTarget) {
            case BuildTarget.iOS:
                ConfigureForiOS();
                break;
            case BuildTarget.Android:
                ConfigureForAndroid();
                break;
            case BuildTarget.StandaloneWindows:
            case BuildTarget.StandaloneWindows64:
            case BuildTarget.StandaloneOSX:
                break;
            default:
                throw new NotSupportedException($"Target={ActiveBuildTarget}");
            }

            var keystorePassword = !string.IsNullOrWhiteSpace(PlayerSettings.Android.keystorePass) ? "****" : string.Empty;
            var keystoreAliasPassword = !string.IsNullOrWhiteSpace(PlayerSettings.Android.keyaliasPass) ? "****" : string.Empty;

            Debug.Log($"[UnityBuildScript] Output PlayerSettings {{\\n" +
                $"  PlayerSettings.ApiCompatibilityLevel: {PlayerSettings.GetApiCompatibilityLevel(CurrentTarget)}\\n" +
                $"  PlayerSettings.applicationIdentifier: {PlayerSettings.applicationIdentifier}\\n" +
                $"  PlayerSettings.bundleVersion: {PlayerSettings.bundleVersion}\\n" +
                $"  PlayerSettings.companyName: {PlayerSettings.companyName}\\n" +
                $"  PlayerSettings.ManagedStrippingLevel: {PlayerSettings.GetManagedStrippingLevel(CurrentTarget)}\\n" +
                $"  PlayerSettings.productName: {PlayerSettings.productName}\\n" +
                $"  PlayerSettings.stripEngineCode: {PlayerSettings.stripEngineCode}\\n" +
                $"  PlayerSettings.stripUnusedMeshComponents: {PlayerSettings.stripUnusedMeshComponents}\\n" +
                $"  iOS {{\\n" +
                $"    PlayerSettings.iOS.applicationDisplayName: {PlayerSettings.iOS.applicationDisplayName}\\n" +
                $"    PlayerSettings.iOS.appleEnableAutomaticSigning: {PlayerSettings.iOS.appleEnableAutomaticSigning}\\n" +
                $"    PlayerSettings.iOS.appleDeveloperTeamID: {PlayerSettings.iOS.appleDeveloperTeamID}\\n" +
                $"    PlayerSettings.iOS.buildNumber: {PlayerSettings.iOS.buildNumber}\\n" +
                $"    PlayerSettings.iOS.iOSManualProvisioningProfileType: {PlayerSettings.iOS.iOSManualProvisioningProfileType}\\n" +
                $"    PlayerSettings.iOS.iOSManualProvisioningProfileID: {PlayerSettings.iOS.iOSManualProvisioningProfileID}\\n" +
                $"    PlayerSettings.iOS.scriptCallOptimization: {PlayerSettings.iOS.scriptCallOptimization}\\n" +
                $"  }}\\n" +
                $"  Android {{\\n" +
                $"    PlayerSettings.Android.androidIsGame: {PlayerSettings.Android.androidIsGame}\\n" +
                $"    PlayerSettings.Android.bundleVersionCode: {PlayerSettings.Android.bundleVersionCode}\\n" +
                $"    PlayerSettings.Android.keystoreName: {PlayerSettings.Android.keystoreName}\\n" +
                $"    PlayerSettings.Android.keyaliasName: {PlayerSettings.Android.keyaliasName}\\n" +
                $"    PlayerSettings.Android.keystorePass: {keystorePassword}\\n" +
                $"    PlayerSettings.Android.keyaliasPass: {keystoreAliasPassword}\\n" +
                $"    PlayerSettings.Android.Minify {{\\n" +
                $"        R8: {PlayerSettings.Android.minifyWithR8}\\n" +
                $"        Release: {PlayerSettings.Android.minifyRelease}\\n" +
                $"        Debug: {PlayerSettings.Android.minifyDebug}\\n" +
                $"    }}\\n" +
                $"    PlayerSettings.Android.minSdkVersion: {PlayerSettings.Android.minSdkVersion}\\n" +
                $"    PlayerSettings.Android.targetSdkVersion: {PlayerSettings.Android.targetSdkVersion}\\n" +
                $"    PlayerSettings.Android.targetArchitectures: {PlayerSettings.Android.targetArchitectures}\\n" +
                $"    PlayerSettings.Android.useCustomKeystore: {PlayerSettings.Android.useCustomKeystore}\\n" +
                $"  }}\\n" +
                $"  Editor {{\\n" +
                $"    CacheServerEnabled: {EditorPrefs.GetBool("CacheServerEnabled")}\\n" +
                $"    CacheServerIPAddress: {EditorPrefs.GetString("CacheServerIPAddress")}\\n" +
                $"    EditorUserBuildSettings.allowDebugging: {EditorUserBuildSettings.allowDebugging}\\n" +
                $"    EditorUserBuildSettings.androidBuildType: {EditorUserBuildSettings.androidBuildType}\\n" +
                $"    EditorUserBuildSettings.androidBuildSystem: {EditorUserBuildSettings.androidBuildSystem}\\n" +
                $"    EditorUserBuildSettings.buildWithDeepProfilingSupport: {EditorUserBuildSettings.buildWithDeepProfilingSupport}\\n" +
                $"    EditorUserBuildSettings.development: {EditorUserBuildSettings.development}\\n" +
#if UNITY_2022_1_OR_NEWER
                $"    EditorUserBuildSettings.il2CppCodeGeneration: {PlayerSettings.GetIl2CppCodeGeneration(CurrentTarget)}\\n" +
#else
                $"    EditorUserBuildSettings.il2CppCodeGeneration: {EditorUserBuildSettings.il2CppCodeGeneration}\\n" +
#endif
                $"    EditorUserBuildSettings.iOSXcodeBuildConfig: {EditorUserBuildSettings.iOSXcodeBuildConfig}\\n" +
                $"    EditorUserBuildSettings.symlinkSources: {EditorUserBuildSettings.symlinkSources}\\n" +
                $"  }}\\n" +
                $"}}");
        }

        static void PerformBuild()
        {
            try {
                Configure();

                var scenes = EditorBuildSettings.scenes.Select(x => x.path).ToArray();
                var locationPathName = Path.Combine(OutputDirectory, GetBuildTargetOutputFileName());

                Debug.Log($"[UnityBuildScript] BuildPipeline.BuildPlayer: locationPathName={locationPathName}, target={ActiveBuildTarget}, targetGroup={ActiveBuildTargetGroup}");

                var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions {
                    scenes = scenes,
                    locationPathName = locationPathName,
                    target = ActiveBuildTarget,
                    targetGroup = ActiveBuildTargetGroup,
                    options = GetBuildOptions(),
                });

                if (report.summary.result == BuildResult.Succeeded) {
                    Debug.Log($"[UnityBuildScript] Build Succeede: Size={report.summary.totalSize}, Time={report.summary.totalTime}, Error={report.summary.totalErrors}, Warning={report.summary.totalWarnings}");
                    EditorApplication.Exit(0);
                } else {
                    var builder = new StringBuilder();
                    builder.AppendLine($"Time={report.summary.totalTime}, Error={report.summary.totalErrors}, Warning={report.summary.totalWarnings}, Path={report.summary.outputPath}");

                    foreach (var step in report.steps) {
                        var spaces = string.Concat(Enumerable.Repeat(" ", step.depth * 4));
                        builder.AppendLine($"{spaces}Build Step: {step.name}");

                        foreach (var message in step.messages) {
                            switch (message.type) {
                            default:
                                // LogType.Log or LogType.Warning
                                break;
                            case LogType.Error:
                                case LogType.Assert:
                                case LogType.Exception:
                                    builder.AppendLine($"{spaces}- {message.type}: {message.content.Replace("\\n", "\\\\n")}");
                                    break;
                            }
                        }
                    }

                    throw new Exception(builder.ToString());
                }
            } catch (Exception ex) {
                Debug.LogError($"[UnityBuildScript] Build Failed: Message={ex.Message}");
                EditorApplication.Exit(1);
            }
        }
    }
}`;
    }
}