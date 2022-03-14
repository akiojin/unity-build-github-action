# setup-xcode-environment-github-action

This action installs the provisioning profile and certificate required to build Xcode.
Provisioning profiles and certificates are installed automatically using [fastlane][1], so there is no need to set a Base64-ized file for the secret.
Automatically installed provisioning profiles are uninstalled in post-processing.
Certificates are stored in the keychain configured by default, but a temporary keychain can also be used.
See [Usage temporary keychain](#usage-temporary-keychain) for instructions on using the temporary keychain.

## Requirement

### fastlane
You will need to install [fastlane][1].
Only Git repositories are supported for storing provisioning profiles and certificates.

#### Installation
```sh
brew install fastlane
```

#### Configuration
- Git repository for storing provisioning profiles and certificates
- Provisioning profiles and certificates must have been previously stored in the above repositories by `fastlane match`.

## Usage

### Simple usage
```yml
- uses: akiojin/setup-xcode-environment-github-action@v2
  with:
    type: 'development'
    app-identifier: com.exmple.App
    team-id: ABC0123456
    git-url: 'https://github.com/certificates'
    git-passphase: ${{ secrets.APPLE_CERTIFICATE_GIT_PASSPHASE }}
```

### Usage temporary keychain
```yml
- usas: setup-temporary-keychain-github-action@v1
  id: setup-temporary-keychain

- uses: akiojin/setup-xcode-environment-github-action@v2
  id: setup-xcode-environment
  with:
    type: 'enterprise'
    app-identifier: com.exmple.App
    team-id: ABC0123456
    git-url: 'https://github.com/certificates'
    git-passphase: ${{ secrets.APPLE_CERTIFICATE_GIT_PASSPHASE }}
    keychain: ${{ steps.setup-temporary-keychain.outputs.keychain }}
    keychain-password: ${{ steps.setup-temporary-keychain.outputs.keychain-password }}
```

## Arguments

|Name|Required|Description|
|:--|:--|:--|
|type|<c>true</c>|Define the profile type, can be appstore, adhoc, development, enterprise, developer_id, mac_installer_distribution.|
|app-identifier|<c>true</c>|The bundle identifier(s) of your app (comma-separated string or array of strings).|
|team_id|<c>true</c>|The ID of your Developer Portal team if you're in multiple teams.|
|git-url|<c>true</c>|URL to the git repo containing all the certificates.|
|git-passphrase|<c>true</c>|When running match for the first time on a new machine, it will ask you for the passphrase for the Git repository.<br>This is an additional layer of security: each of the files will be encrypted using openssl.|
|git-branch|<c>false</c>|Specific git branch to use. Default is master|
|keychain|<c>false</c>|Path of the keychain to use. If omitted, the default login keychain is used.|
|keychain-password|<c>false</c>|Password for the keychain if specified in the keychain parameter;<br>default login keychain password if the kerchain parameter is omitted.|

## License
Any contributions made under this project will be governed by the [MIT License][3].

[0]: https://github.com/akiojin/setup-xcode-environemt-github-action/actions/workflows/Test.yml/badge.svg
[1]: https://docs.fastlane.tools/
[2]: https://github.com/akiojin/setup-xcode-environemt-github-action/blob/main/action.yml
[3]: https://github.com/akiojin/setup-xcode-environemt-github-action/blob/main/LICENSE