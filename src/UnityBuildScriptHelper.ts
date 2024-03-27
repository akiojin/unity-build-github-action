export default class UnityBuildScriptHelper
{
    static ToTitleCase(str?: string): string
    {
        str = str || ''
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
    }

    static GenerateUnityBuildScript(
        appID: string,
        outputDirectory: string,
        outputFileName: string,
        buildTarget: string,
        revision: number,
        development: boolean = false,
        bundleVersion: string = '',
        teamID?: string,
        provisioningProfileUUID?: string,
        provisioningProfileType?: string,
        enableBitcode?: boolean,
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
    using UnityEditor.Build;
    using UnityEditor.Build.Reporting;
#if UNITY_IOS
    using UnityEditor.iOS.Xcode;
#endif
    using UnityEngine;

    public class UnityBuildScript : IPostprocessBuildWithReport
    {
        public int callbackOrder => -100;

        const string AppID = "${appID}";
        const string OutputFileName = "${outputFileName}";
        const string OutputDirectory = @"${outputDirectory}";
        const string Target = "${buildTarget}";
        const bool Development = ${development};
        const int Revision = ${revision};
        const string BundleVersion = "${bundleVersion}";

#if UNITY_IOS || UNITY_STANDALONE_OSX
        const string TeamID = "${teamID}";
        const string ProvisioningProfileUUID = "${provisioningProfileUUID}";
        const ProvisioningProfileType Type = ProvisioningProfileType.${this.ToTitleCase(provisioningProfileType)};
#elif UNITY_ANDROID
        const string Keystore = @"${keystore}";
        const string KeystorePassword = "${keystorePassword}";
        const string KeystoreAlias = "${keystoreAlias}";
        const string KeystoreAliasPassword = "${keystoreAliasPassword}";
#endif

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
#if UNITY_ANDROID
            => $"{OutputFileName}.aab";
#elif UNITY_STANDALONE_WIN
            => $"{OutputFileName}.exe";
#elif UNITY_STANDALONE_OSX
            => $"{OutputFileName}.app";
#elif UNITY_SWITCH
            => Development ? $"{OutputFileName}.nspd" : $"{OutputFileName}.nsp";
#else
            => string.Empty;
#endif

        public void OnPostprocessBuild(BuildReport report)
        {
#if UNITY_IOS
            var pbxPath = PBXProject.GetPBXProjectPath(report.summary.outputPath);
            var project = new PBXProject();
            project.ReadFromString(File.ReadAllText(pbxPath));

            project.SetBuildProperty(project.GetUnityMainTargetGuid(), "ENABLE_BITCODE", "${enableBitcode ? 'YES' : 'NO'}");
            project.SetBuildProperty(project.GetUnityFrameworkTargetGuid(), "ENABLE_BITCODE", "${enableBitcode ? 'YES' : 'NO'}");
            // Invalid Bundle. The bundle at 'UnityFramework.framework' contains disallowd file 'Frameworks'.
            // https://forum.unity.com/threads/2019-3-validation-on-upload-to-store-gives-unityframework-framework-contains-disallowed-file.751112/
            project.SetBuildProperty(project.GetUnityFrameworkTargetGuid(), "ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES", "NO");

            File.WriteAllText(pbxPath, project.WriteToString());

            Debug.Log($"PBX Project: {pbxPath}");
            Debug.Log($"ENABLE_BITCODE: ${enableBitcode}");
            Debug.Log($"ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES: NO");
#endif
        }

        static BuildOptions GetBuildOptions()
        {
            var options = BuildOptions.None;

            if (Development) {
                options |= BuildOptions.Development;
            }

            return options;
        }

        static void Configure()
        {
            EditorUserBuildSettings.development = Development;
            EditorUserBuildSettings.allowDebugging = Development;
            EditorUserBuildSettings.connectProfiler = Development;
            EditorUserBuildSettings.symlinkSources = Development;
            EditorUserBuildSettings.buildWithDeepProfilingSupport = Development;

            if (!string.IsNullOrWhiteSpace(AppID)) {
                PlayerSettings.applicationIdentifier = AppID;
            }

            if (!string.IsNullOrWhiteSpace(BundleVersion)) {
                PlayerSettings.bundleVersion = BundleVersion;
            }

#if UNITY_IOS
            PlayerSettings.iOS.appleEnableAutomaticSigning = false;
            PlayerSettings.iOS.buildNumber = Revision.ToString();

            EditorUserBuildSettings.iOSXcodeBuildConfig = Development ? XcodeBuildConfig.Debug : XcodeBuildConfig.Release;

            if (!string.IsNullOrWhiteSpace(TeamID)) {
                PlayerSettings.iOS.appleDeveloperTeamID = TeamID;
            }

            if (!string.IsNullOrWhiteSpace(ProvisioningProfileUUID)) {
                if (Type == ProvisioningProfileType.Automatic) {
                    throw new Exception("Provisioning profile type is automatic, but provisioning profile UUID is specified.");
                }

                PlayerSettings.iOS.iOSManualProvisioningProfileID = ProvisioningProfileUUID;
                PlayerSettings.iOS.iOSManualProvisioningProfileType = Type;
            } else {
                // The provisioning profile type will be determined automatically when building the Xcode project.
                PlayerSettings.iOS.iOSManualProvisioningProfileType = ProvisioningProfileType.Automatic;
            }
#elif UNITY_STANDALONE_OSX
            PlayerSettings.macOS.buildNumber = Revision.ToString();
            PlayerSettings.useMacAppStoreValidation = true;

            EditorUserBuildSettings.macOSXcodeBuildConfig = Development ? XcodeBuildConfig.Debug : XcodeBuildConfig.Release;

            UnityEditor.OSXStandalone.UserBuildSettings.createXcodeProject = true;
#elif UNITY_ANDROID
            PlayerSettings.Android.bundleVersionCode = Revision;

            EditorUserBuildSettings.androidBuildSystem = AndroidBuildSystem.Gradle;
            EditorUserBuildSettings.androidBuildType = Development ? AndroidBuildType.Debug : AndroidBuildType.Release;

            PlayerSettings.Android.keystoreName = Keystore;
            PlayerSettings.Android.useCustomKeystore = !string.IsNullOrWhiteSpace(PlayerSettings.Android.keystoreName);

            if (PlayerSettings.Android.useCustomKeystore) {
                if (string.IsNullOrWhiteSpace(KeystorePassword) ||
                    string.IsNullOrWhiteSpace(KeystoreAliasPassword)) {
                    throw new Exception("Keystore password or keystore alias password not specified.");
                }

                PlayerSettings.Android.keystorePass = KeystorePassword;

                if (!string.IsNullOrWhiteSpace(KeystoreAlias)) {
                    PlayerSettings.Android.keyaliasName = KeystoreAlias;
                }

                PlayerSettings.Android.keyaliasPass = KeystoreAliasPassword;
            }

            EditorUserBuildSettings.buildAppBundle = true;
#endif

#if UNITY_ANDROID
            var keystorePass = !string.IsNullOrWhiteSpace(PlayerSettings.Android.keystorePass) ? "****" : string.Empty;
            var keyaliasPass = !string.IsNullOrWhiteSpace(PlayerSettings.Android.keyaliasPass) ? "****" : string.Empty;
#endif

            Debug.Log($"[UnityBuildScript] Output PlayerSettings {{\\n" +
                $"  PlayerSettings.ApiCompatibilityLevel: {PlayerSettings.GetApiCompatibilityLevel(CurrentTarget)}\\n" +
                $"  PlayerSettings.applicationIdentifier: {PlayerSettings.applicationIdentifier}\\n" +
                $"  PlayerSettings.bundleVersion: {PlayerSettings.bundleVersion}\\n" +
                $"  PlayerSettings.companyName: {PlayerSettings.companyName}\\n" +
                $"  PlayerSettings.ManagedStrippingLevel: {PlayerSettings.GetManagedStrippingLevel(CurrentTarget)}\\n" +
                $"  PlayerSettings.productName: {PlayerSettings.productName}\\n" +
                $"  PlayerSettings.stripEngineCode: {PlayerSettings.stripEngineCode}\\n" +
                $"  PlayerSettings.stripUnusedMeshComponents: {PlayerSettings.stripUnusedMeshComponents}\\n" +
#if UNITY_IOS
                $"  iOS {{\\n" +
                $"    PlayerSettings.iOS.applicationDisplayName: {PlayerSettings.iOS.applicationDisplayName}\\n" +
                $"    PlayerSettings.iOS.appleEnableAutomaticSigning: {PlayerSettings.iOS.appleEnableAutomaticSigning}\\n" +
                $"    PlayerSettings.iOS.appleDeveloperTeamID: {PlayerSettings.iOS.appleDeveloperTeamID}\\n" +
                $"    PlayerSettings.iOS.buildNumber: {PlayerSettings.iOS.buildNumber}\\n" +
                $"    PlayerSettings.iOS.iOSManualProvisioningProfileType: {PlayerSettings.iOS.iOSManualProvisioningProfileType}\\n" +
                $"    PlayerSettings.iOS.iOSManualProvisioningProfileID: {PlayerSettings.iOS.iOSManualProvisioningProfileID}\\n" +
                $"    PlayerSettings.iOS.scriptCallOptimization: {PlayerSettings.iOS.scriptCallOptimization}\\n" +
                $"  }}\\n" +
#elif UNITY_ANDROID
                $"  Android {{\\n" +
                $"    PlayerSettings.Android.androidIsGame: {PlayerSettings.Android.androidIsGame}\\n" +
                $"    PlayerSettings.Android.bundleVersionCode: {PlayerSettings.Android.bundleVersionCode}\\n" +
                $"    PlayerSettings.Android.keystoreName: {PlayerSettings.Android.keystoreName}\\n" +
                $"    PlayerSettings.Android.keyaliasName: {PlayerSettings.Android.keyaliasName}\\n" +
                $"    PlayerSettings.Android.keystorePass: {keystorePass}\\n" +
                $"    PlayerSettings.Android.keyaliasPass: {keyaliasPass}\\n" +
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
#elif UNITY_STANDALONE_OSX
                $"  macOS {{\\n" +
                $"    PlayerSettings.macOS.buildNumber: {PlayerSettings.macOS.buildNumber}\\n" +
                $"    PlayerSettings.useMacAppStoreValidation: {PlayerSettings.useMacAppStoreValidation}\\n" +
                $"  }}\\n" +
#endif
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
                $"    EditorUserBuildSettings.macOSXcodeBuildConfig: {EditorUserBuildSettings.macOSXcodeBuildConfig}\\n" +
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