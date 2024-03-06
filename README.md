# unity-build-github-action

This action will build in Unity.
Output is available on iOS/Android/Windows/macOS platforms.
Supported version is Unity 2021.3 or later.

## Supported Platforms

| Platform | Output |
| -------- | ------ |
| iOS      | ipa    |
| Android  | aab    |
| Windows  | zip    |
| macOS    | pkg    |

## Requirement

You will need to install [fastlane][1]

### Installation

```sh
brew install fastlane
```

## Usage

### Simple usage

#### iOS build

```yml
- uses: akiojin/unity-build-github-action@v3
  with:
    build-target: 'iOS'
```

#### Team ID & Provisioning Profile UUID

```yml
- uses: akiojin/setup-xcode-environment-github-action@v2
  id: setup-xcode-environment
  with:
    type: ${{ env.DISTRIBUTION }}
    app-identifier: <App ID>
    team-id: <Team ID>
    git-url: ${{ secrets.APPLE_CERTIFICATE_GIT_URL }}
    git-passphrase: ${{ secrets.APPLE_CERTIFICATE_GIT_PASSPHRASE }}
    git-branch: "develop"
    keychain: ${{ steps.setup-temporary-keychain.outputs.keychain }}
    keychain-password: ${{ steps.setup-temporary-keychain.outputs.keychain-password }}

- uses: akiojin/unity-build-github-action@v3
  with:
    build-target: 'iOS'
    project-directory: ${{ github.workspace }}
    output-directory: ${{ runner.temp }}/Unity
    export-method: ${{ env.DISTRIBUTION }}
    team-id: <Team ID>
    provisioning-profile-uuid: ${{ steps.setup-xcode-environment.outputs.provisioning-profile-uuid }}
```

#### Android builds

```yml
- uses: akiojin/unity-build-github-action@v3
  with:
    build-target: 'Android'
    project-directory: ${{ github.workspace }}
    output-directory: ${{ runner.temp }}/Unity
```

#### Keystore

```yml
- uses: akiojin/unity-build-github-action@v3
  with:
    build-target: 'Android'
    project-directory: ${{ github.workspace }}
    output-directory: ${{ runner.temp }}/Unity
    keystore-base64: ${{ secrets.GOOGLE_KEYSTORE_BASE64 }}
    keystore-password: ${{ secrets.GOOGLE_KEYSTORE_PASSWORD }}
    keystore-alias: 'development'
    keystore-alias-password: ${{ secrets.GOOGLE_KEYSTORE_ALIAS_DEVELOPMENT_PASSWORD }}
```

## Arguments

### Common

|          Name          | Required |   Type   |          Default           |                                                                                                                                Description                                                                                                                                |
| ---------------------- | -------- | -------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `additional-arguments` | `false`  | `string` | ""                         | Specify additional required arguments.                                                                                                                                                                                                                                    |
| `build-target`         | `true`   | `string` |                            | Allows the selection of an active build target before loading a project.<br><br>Possible options are:<br>Standalone, Win, Win64, OSXUniversal, Linux, Linux64, LinuxUniversal, iOS, Android, Web, WebStreamed, WebGL, XboxOne, PS4, WindowsStoreApps, Switch, N3DS, tvOS. |
| `configuration`        | `false`  | `string` | Debug                      | The configuration to use when building the app.<br><br>Possible options are:<br>Debug, Release.                                                                                                                                                                           |
| `execute-method`       | `false`  | `string` | ""                         | Execute the static method as soon as Unity opens the project, and after the optional Asset server update is complete.                                                                                                                                                     |
| `install-directory`    | `false`  | `string` | ""                         | If the Unity installation location is not the default, specify the path in this parameter.<br>or in the environment variable `UNITY_HUB_INSTALL_DIRECTORY`.<br>The path must exclude the version number.                                                                  |
| `log-file`             | `false`  | `string` | `"-"`                      | Specify where Unity writes the Editor or Windows/Linux/OSX standalone log file.<br>To output to the console, specify - for the path name.<br>On Windows, specify - option to make the output go to stdout, which is not the console by default.                           |
| `output-directory`     | `false`  | `string` | `${{ runner.temp }}`       | The directory in which the ipa/apk file should be stored in.                                                                                                                                                                                                              |
| `output-name`          | `false`  | `string` | "Build"                    | Specifies the output file name.                                                                                                                                                                                                                                           |
| `project-directory`    | `true`   | `string` | `${{ github.workspace }}`  | Open the project at the given path. If the pathname contains spaces, enclose it in quotes.                                                                                                                                                                                |
| `revision`             | `false`  | `number` | `${{ github.run_number }}` | Specify the revision.<br>This value is set to PlayerSettings.iOS.<br>buildNumber or PlayerSettings.Android.bundleVersionCode. If omitted, github.run_number is set.                                                                                                       |
| `unity-version`        | `false`  | `string` | ""                         | Specify the Unity version to be used.<br>If omitted, the project version is used.                                                                                                                                                                                         |

### iOS

|             Name              | Required |   Type    |          Default          |                                                                        Description                                                                         |
| ----------------------------- | -------- | --------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `export-method`               | `false`  | `string`  | development               | Method used to export the archive.<br>Valid values are: app-store, validation, ad-hoc, package, enterprise, development, developer-id and mac-application. |
| `include-bitcode`             | `false`  | `boolean` | `false`                   | Should the ipa file include bitcode?                                                                                                                       |
| `include-symbols`             | `false`  | `boolean` | `false`                   | Should the ipa file include symbols?                                                                                                                       |
| `provisioning-profile-base64` | `false`  | `string`  | ""                        |                                                                                                                                                            |
| `provisioning-profile-uuid`   | `false`  | `string`  | ""                        | Specify the UUID of the provisioning profile.                                                                                                              |
| `provisioning-profile-name`   | `false`  | `string`  | ""                        | Specify the Name of the provisioning profile.                                                                                                              |
| `provisioning-profile-type`   | `false`  | `string`  | `Automatic`               | Specify the type of provisioning profile.<br>If omitted, Automatic is set.                                                                                 |
| `strip-swift-symbols`         | `false`  | `boolean` | `true`                    | If set to true, it will truncate symbols from the Swift library in the IPA file,<br>reducing the size of the IPA file.                                     |
| `team-id`                     | `false`  | `string`  | ""                        | The ID of your Developer Portal team if you're in multiple teams.                                                                                          |
| `temporary-directory`         | `false`  | `string`  | `${{ runner.temp }}/temp` |                                                                                                                                                            |

### Android

|           Name            | Required |   Type   | Default |                                                                                                  Description                                                                                                  |
| ------------------------- | -------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `keystore`                | `false`  | `string` | ""      | Specify the path to the keystore file.<br>For Android, if `keystore` or `keystore-base64`, `keystore-password`, `keystore-alias`,`keystore-alias-password` is not specified, will be signed with a debug key. |
| `keystore-base64`         | `false`  | `string` | ""      | Specifies Base64 data for the keystore.<br>If you do not specify a file path in `keystore`, you must specify this parameter.<br>Also, if this value is specified, the value of `keystore` is ignored.         |
| `keystore-password`       | `false`  | `string` | ""      | Specify the password for the keystore.                                                                                                                                                                        |
| `keystore-alias`          | `false`  | `string` | ""      | Specifies the name of the keystore alias.                                                                                                                                                                     |
| `keystore-alias-password` | `false`  | `string` | ""      | Specify the password for the keystore alias.                                                                                                                                                                  |

### Windows

|           Name            | Required |   Type   | Default |                                                                                                  Description                                                                                                  |
| ------------------------- | -------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

### macOS

| Name                      | Required | Type     | Default         | Description                                                                                                                                                                                           |
| ------------------------- | -------- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `install-location`        | `false`  | `string` | "/Applications" | Specify the directory in which to install. By default, /Applications is specified.                                                                                                                    |

## iOS build

The following parameters are set at iOS build time.

- `ENABLE_BITCODE`
- `ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES`

`ENABLE_BITOCODE` is set for UnityMainTarget and UnityFrameworkTarget.
`ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES` is set to UnityFrameworkTarget.

See also the following URL for `ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES`.

https://forum.unity.com/threads/2019-3-validation-on-upload-to-store-gives-unityframework-framework-contains-disallowed-file.751112/

## License

Any contributions made under this project will be governed by the [MIT License][3].

[0]: https://github.com/akiojin/unity-build-github-action/actions/workflows/Test.yml/badge.svg
[1]: https://docs.fastlane.tools/
[2]: https://github.com/akiojin/unity-build-github-action/blob/main/action.yml
[3]: https://github.com/akiojin/unity-build-github-action/blob/main/LICENSE