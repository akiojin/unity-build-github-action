export default class UnityBuildScriptHelper
{
	static GenerateUnityBuildScript(
		outputDirectory: string,
		outputFileName: string,
        development: boolean = false,
		teamID?: string,
		provisioningProfileUUID?: string,
		keystore?: string,
		keystoreAlias?: string,
		keystorePassword?: string,
		keystoreAliasPassword?: string): string
	{
		return `
using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

public class UnityBuildScript
{
	public static string OutputFileName = @"${outputFileName}";
	public static string OutputDirectory = @"${outputDirectory}";

	public static string TeamID = "${teamID}";
	public static string ProvisioningProfileUUID = "${provisioningProfileUUID}";

	public static string Keystore = @"${keystore}";
	public static string KeystorePassword = "${keystorePassword}";
	public static string KeystoreAlias = "${keystoreAlias}";
	public static string KeystoreAliasPassword = "${keystoreAliasPassword}";

	public static bool Development = ${development};

	static string GetBuildTargetOutputFileName()
		=> EditorUserBuildSettings.activeBuildTarget switch {
			BuildTarget.Android => $"{OutputFileName}.apk",
			BuildTarget.StandaloneWindows => $"{OutputFileName}.exe",
			BuildTarget.StandaloneWindows64 => $"{OutputFileName}.exe",
			BuildTarget.StandaloneOSX => $"{OutputFileName}.app",
			_ => ""
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
		
	public static void PerformBuild()
	{
		try {
			Configure();

			var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions {
				scenes = EditorBuildSettings.scenes.Select(x => x.path).ToArray(),
				locationPathName = Path.Combine(OutputDirectory, GetBuildTargetOutputFileName()),
				target = EditorUserBuildSettings.activeBuildTarget,
				options = GetBuildOptions()
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