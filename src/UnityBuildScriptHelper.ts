export default class UnityBuildScriptHelper
{
    static GenerateUnityBuildScript(
        outputDirectory: string,
        outputFileName: string,
        development: boolean = false,
        teamID?: string,
        provisioningProfileUUID?: string,
        keystore?: string,
        keystorePassword?: string,
        keystoreAlias?: string,
        keystoreAliasPassword?: string): string
    {
        return `using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

public class UnityBuildScript
{
    const string OutputFileName = "${outputFileName}";
    const string OutputDirectory = @"${outputDirectory}";
    const bool Development = ${development};

    // for iOS
    const string TeamID = "${teamID}";
    const string ProvisioningProfileUUID = "${provisioningProfileUUID}";

    // for Android
    const string Keystore = @"${keystore}";
    const string KeystorePassword = "${keystorePassword}";
    const string KeystoreAlias = "${keystoreAlias}";
    const string KeystoreAliasPassword = "${keystoreAliasPassword}";

    static string GetBuildTargetOutputFileName()
        => EditorUserBuildSettings.activeBuildTarget switch {
            BuildTarget.Android => $"{OutputFileName}.apk",
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

    static void Configure()
    {
        if (!string.IsNullOrWhiteSpace(TeamID)) {
            PlayerSettings.iOS.appleDeveloperTeamID = TeamID;
        }

        if (!string.IsNullOrWhiteSpace(ProvisioningProfileUUID)) {
            PlayerSettings.iOS.iOSManualProvisioningProfileID = ProvisioningProfileUUID;
        }

        if (!string.IsNullOrWhiteSpace(Keystore)) {
            PlayerSettings.Android.keystoreName = Keystore;
        }

        if (!string.IsNullOrWhiteSpace(KeystorePassword)) {
            PlayerSettings.Android.keystorePass = KeystorePassword;
        }

        if (!string.IsNullOrWhiteSpace(KeystoreAlias)) {
            PlayerSettings.Android.keyaliasName = KeystoreAlias;
        }

        if (!string.IsNullOrWhiteSpace(KeystoreAliasPassword)) {
            PlayerSettings.Android.keyaliasPass = KeystoreAliasPassword;
        }
    }

    private static void PerformBuild()
    {
        try {
            Configure();

            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions {
                scenes = EditorBuildSettings.scenes.Select(x => x.path).ToArray(),
                locationPathName = Path.Combine(OutputDirectory, GetBuildTargetOutputFileName()),
                target = EditorUserBuildSettings.activeBuildTarget,
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
}`;
    }
}