# Setup Regal

GitHub action to configure [Regal](https://github.com/open-policy-agent/regal), the Rego linter.

## Basic Usage

The following example shows how to use the action to install the latest version of Regal and lint some files
in `policy`:

```yml
name: Run Regal Lint Check
on: [push]
jobs:
  lint-rego:
    runs-on: ubuntu-latest
    steps:
    - name: Check out repository code
      uses: actions/checkout@v4

    - name: Setup Regal
      uses: open-policy-agent/setup-regal@v1
      with:
        version: latest

    - name: Lint
      run: regal lint --format github ./policy
```

## Choose Regal Version

### Using Latest

Using the latest version of Regal allows you to keep up-to-date with the latest Rules and best practices. However,
it might mean that policies that once passed, will need to be updated to pass with the latest version of Regal's rules.

> [!NOTE]
> You can always disable rules using [Regal config](https://www.openpolicyagent.org/projects/regal/configuration/ignore-rules).

```yml
steps:
  - name: Setup Regal
    uses: open-policy-agent/setup-regal@v1
    with:
      version: latest
```

It's also possible to use a pinned version of Regal. This is recommended for pipelines that deploy to production
environments.

```yml
steps:
  - name: Setup Regal
    uses: open-policy-agent/setup-regal@v1
    with:
      version: x.y.z
```

You can also use a SemVer or [SemVer range](https://www.npmjs.com/package/semver#ranges).

```yml
steps:
  - name: Setup Regal
    uses: open-policy-agent/setup-regal@v1
    with:
      version: 0.10
```

```yml
steps:
  - name: Setup Regal
    uses: open-policy-agent/setup-regal@v1
    with:
      version: <0.10
```

## Inputs

The action supports the following inputs:

- `version`: Optional, defaults to `latest`. [SemVer ranges](https://www.npmjs.com/package/semver#ranges) are supported too.
- `github-token`: Optional, defaults to `${{ github.token }}`.

## Credits

This repo is based on the [Setup OPA Action](https://github.com/open-policy-agent/setup-opa).
