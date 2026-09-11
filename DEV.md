# Development quick start

## 1. Open the project

Open `LivingFog.code-workspace` in VS Code.

## 2. Connect it to GitHub once

Run:

**Terminal -> Run Task -> Living Fog: Connect GitHub repository**

The task fetches the real `main` branch from:

`https://github.com/Finkedinkedude/LivingFog.git`

and makes these local files normal working-tree changes on top of that history. It does not overwrite the local module files.

After that, use the normal VS Code Source Control panel to commit and push.

## 3. Local Foundry testing

Either copy the project into Foundry's user-data module directory as `Data/modules/living-fog`, or symlink/junction that folder to this project so edits are immediately available after a Foundry reload/restart.

Test fog from the player/table client, not only from the GM client.

## 4. Release

Update version references in `module.json`, `scripts/living-fog.mjs`, and `CHANGELOG.md`, commit the changes, then run:

**Terminal -> Run Task -> Living Fog: Build release ZIP from HEAD**

The output is:

`dist/living-fog.zip`

Create the matching GitHub tag/release and upload that file as the release asset.
