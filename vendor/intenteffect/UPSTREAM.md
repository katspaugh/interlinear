# Vendored: intenteffect

Upstream: https://github.com/katspaugh/intenteffect
Commit: `67df8042308c7f23e1b3bbe96fd4358d00061c19`

The `packages/` directory is a verbatim copy of the upstream `packages/`
directory. The upstream packages are not published to npm (they export
TypeScript source directly and use `workspace:*` dependencies), so they are
vendored here and wired into this repo's pnpm workspace.

To update:

```sh
git clone --depth 1 https://github.com/katspaugh/intenteffect /tmp/intenteffect
rm -rf vendor/intenteffect/packages
cp -r /tmp/intenteffect/packages vendor/intenteffect/packages
# then record the new commit hash in this file
git -C /tmp/intenteffect rev-parse HEAD
```
