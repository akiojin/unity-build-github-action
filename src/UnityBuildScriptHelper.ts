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

        static string GetBuildTargetOutputFileName()
            => GetBuildTarget() switch {
                BuildTarget.Android => $"{OutputFileName}.aab",
                BuildTarget.StandaloneWindows => $"{OutputFileName}.exe",
                BuildTarget.StandaloneWindows64 => $"{OutputFileName}.exe",
                BuildTarget.StandaloneOSX => $"{OutputFileName}.app",
                _ => string.Empty
            };

        static BuildTarget GetBuildTarget()
            => Target switch {
                "iOS" => BuildTarget.iOS,
                "Android" => BuildTarget.Android,
                "Win" => BuildTarget.StandaloneWindows,
                "Win64" => BuildTarget.StandaloneWindows64,
                "OSXUniversal" => BuildTarget.StandaloneOSX,
                _ => throw new System.NotSupportedException(),
            };

        static BuildTargetGroup GetBuildTargetGroup()
            => GetBuildTarget() switch {
                BuildTarget.StandaloneOSX => BuildTargetGroup.Standalone,
                BuildTarget.StandaloneWindows => BuildTargetGroup.Standalone,
                BuildTarget.StandaloneWindows64 => BuildTargetGroup.Standalone,
                BuildTarget.StandaloneLinux64 => BuildTargetGroup.Standalone,
                BuildTarget.iOS => BuildTargetGroup.iOS,
                BuildTarget.Android => BuildTargetGroup.Android,
                BuildTarget.WebGL => BuildTargetGroup.WebGL,
                BuildTarget.WSAPlayer => BuildTargetGroup.WSA,
                BuildTarget.PS4 => BuildTargetGroup.PS4,
                BuildTarget.PS5 => BuildTargetGroup.PS5,
                BuildTarget.XboxOne => BuildTargetGroup.XboxOne,
                BuildTarget.tvOS => BuildTargetGroup.tvOS,
                BuildTarget.Switch => BuildTargetGroup.Switch,
                BuildTarget.Lumin => BuildTargetGroup.Lumin,
                BuildTarget.Stadia => BuildTargetGroup.Stadia,
                _ => throw new System.NotSupportedException(),
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
            PlayerSettings.iOS.buildNumber = Revision.ToString();

            EditorUserBuildSettings.iOSXcodeBuildConfig = !!Development ?
                XcodeBuildConfig.Debug : XcodeBuildConfig.Release;

            if (!string.IsNullOrWhiteSpace(TeamID)) {
                PlayerSettings.iOS.appleDeveloperTeamID = TeamID;
            }

            if (!string.IsNullOrWhiteSpace(ProvisioningProfileUUID)) {
                PlayerSettings.iOS.iOSManualProvisioningProfileID = ProvisioningProfileUUID;
            }

            PlayerSettings.iOS.iOSManualProvisioningProfileType = Type;
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
            PlayerSettings.SetScriptingBackend(GetBuildTargetGroup(), ScriptingImplementation.IL2CPP);
            PlayerSettings.SetArchitecture(GetBuildTargetGroup(), 1);

            EditorUserBuildSettings.development = Development;
            EditorUserBuildSettings.allowDebugging = Development;
            EditorUserBuildSettings.connectProfiler = Development;
            EditorUserBuildSettings.symlinkSources = Development;
            EditorUserBuildSettings.buildWithDeepProfilingSupport = Development;

            switch (GetBuildTarget()) {
            case BuildTarget.iOS:
                ConfigureForiOS();
                break;
            case BuildTarget.Android:
                ConfigureForAndroid();
                break;
            default:
                throw new NotSupportedException($"Target={GetBuildTarget()}");
            }

            Debug.Log($"Settings {{\n" +
                $"  PlayerSettings.ApiCompatibilityLevel: {PlayerSettings.GetApiCompatibilityLevel(EditorUserBuildSettings.selectedBuildTargetGroup)}\n" +
                $"  PlayerSettings.applicationIdentifier: {PlayerSettings.applicationIdentifier}\n" +
                $"  PlayerSettings.bundleVersion: {PlayerSettings.bundleVersion}\n" +
                $"  PlayerSettings.companyName: {PlayerSettings.companyName}\n" +
                $"  PlayerSettings.ManagedStrippingLevel: {PlayerSettings.GetManagedStrippingLevel(EditorUserBuildSettings.selectedBuildTargetGroup)}\n" +
                $"  PlayerSettings.productName: {PlayerSettings.productName}\n" +
                $"  PlayerSettings.stripEngineCode: {PlayerSettings.stripEngineCode}\n" +
                $"  PlayerSettings.stripUnusedMeshComponents: {PlayerSettings.stripUnusedMeshComponents}\n" +
                $"  iOS {{\n" +
                $"    PlayerSettings.iOS.applicationDisplayName: {PlayerSettings.iOS.applicationDisplayName}\n" +
                $"    PlayerSettings.iOS.appleEnableAutomaticSigning: {PlayerSettings.iOS.appleEnableAutomaticSigning}\n" +
                $"    PlayerSettings.iOS.appleDeveloperTeamID: {PlayerSettings.iOS.appleDeveloperTeamID}\n" +
                $"    PlayerSettings.iOS.buildNumber: {PlayerSettings.iOS.buildNumber}\n" +
                $"    PlayerSettings.iOS.iOSManualProvisioningProfileType: {PlayerSettings.iOS.iOSManualProvisioningProfileType}\n" +
                $"    PlayerSettings.iOS.iOSManualProvisioningProfileID: {PlayerSettings.iOS.iOSManualProvisioningProfileID}\n" +
                $"    PlayerSettings.iOS.scriptCallOptimization: {PlayerSettings.iOS.scriptCallOptimization}\n" +
                $"  }}\n" +
                $"  Android {{\n" +
                $"    PlayerSettings.Android.androidIsGame: {PlayerSettings.Android.androidIsGame}\n" +
                $"    PlayerSettings.Android.bundleVersionCode: {PlayerSettings.Android.bundleVersionCode}\n" +
                $"    PlayerSettings.Android.keystoreName: {PlayerSettings.Android.keystoreName}\n" +
                $"    PlayerSettings.Android.keyaliasName: {PlayerSettings.Android.keyaliasName}\n" +
                $"    PlayerSettings.Android.keystorePass: {keystorePassword}\n" +
                $"    PlayerSettings.Android.keyaliasPass: {keystoreAliasPassword}\n" +
                $"    PlayerSettings.Android.Minify {{\n" +
                $"        R8: {PlayerSettings.Android.minifyWithR8}\n" +
                $"        Release: {PlayerSettings.Android.minifyRelease}\n" +
                $"        Debug: {PlayerSettings.Android.minifyDebug}\n" +
                $"    }}\n" +
                $"    PlayerSettings.Android.minSdkVersion: {PlayerSettings.Android.minSdkVersion}\n" +
                $"    PlayerSettings.Android.targetSdkVersion: {PlayerSettings.Android.targetSdkVersion}\n" +
                $"    PlayerSettings.Android.targetArchitectures: {PlayerSettings.Android.targetArchitectures}\n" +
                $"    PlayerSettings.Android.useCustomKeystore: {PlayerSettings.Android.useCustomKeystore}\n" +
                $"  }}\n" +
                $"  Editor {{\n" +
                $"    CacheServerEnabled: {EditorPrefs.GetBool("CacheServerEnabled")}\n" +
                $"    CacheServerIPAddress: {EditorPrefs.GetString("CacheServerIPAddress")}\n" +
                $"    EditorUserBuildSettings.allowDebugging: {EditorUserBuildSettings.allowDebugging}\n" +
                $"    EditorUserBuildSettings.androidBuildType: {EditorUserBuildSettings.androidBuildType}\n" +
                $"    EditorUserBuildSettings.androidBuildSystem: {EditorUserBuildSettings.androidBuildSystem}\n" +
                $"    EditorUserBuildSettings.buildWithDeepProfilingSupport: {EditorUserBuildSettings.buildWithDeepProfilingSupport}\n" +
                $"    EditorUserBuildSettings.development: {EditorUserBuildSettings.development}\n" +
#if UNITY_2022_1_OR_NEWER
                $"    EditorUserBuildSettings.il2CppCodeGeneration: {PlayerSettings.GetIl2CppCodeGeneration(BuildTargetSettings.CurrentTarget)}\n" +
#else
                $"    EditorUserBuildSettings.il2CppCodeGeneration: {EditorUserBuildSettings.il2CppCodeGeneration}\n" +
#endif
                $"    EditorUserBuildSettings.iOSXcodeBuildConfig: {EditorUserBuildSettings.iOSXcodeBuildConfig}\n" +
                $"    EditorUserBuildSettings.symlinkSources: {EditorUserBuildSettings.symlinkSources}\n" +
                $"  }}\n" +
                $"}}");
        }

        static void PerformBuild()
        {
            try {
                Configure();

                var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions {
                    scenes = EditorBuildSettings.scenes.Select(x => x.path).ToArray(),
                    locationPathName = Path.Combine(OutputDirectory, GetBuildTargetOutputFileName()),
                    target = GetBuildTarget(),
                    targetGroup = GetBuildTargetGroup(),
                    options = GetBuildOptions(),
                });

                if (report.summary.result == BuildResult.Succeeded) {
                    EditorApplication.Exit(0);
                } else {
                    throw new Exception();
                }
            } catch (Exception ex) {
                Debug.LogException(ex);
                EditorApplication.Exit(1);
            }
        }
    }
}`;
    }
}