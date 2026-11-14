# payfor工大 · 小米手环快应用

用于在支持 Vela 快应用的小米手环上出示校园付款码。打开手环应用即可展示二维码，上下滑动切换条形码，并支持在手机端配置是否同步显示校园卡余额。

> [!NOTE]
> 手机端的「小米手环连接（Beta）」已内置于 Android 主应用。手环上安装本仓库提供的 `.rpk` 快应用即可。

## 兼容性与适配

* **运行环境**：需设备支持小米 Vela 快应用，并具备与「小米运动健康」App 的互联通信能力。
* **屏幕适配**：界面布局已适配胶囊形、矩形和圆形屏幕。
* **实测机型**：小米手环 11 已完成实机验证。其他机型的可用性取决于具体固件版本与运动健康互联支持情况。

## 安装与连接步骤

1. **获取 RPK 安装包**：可在手机主应用的「设置 → 小米手环」中直接导出安装包，或在正式发布后前往本仓库 [Releases](../../releases) 下载 `HFUT-Campus-Band-版本.rpk`。
2. **安装快应用至手环**：使用 [AstroBox](https://github.com/AstralSightStudios/AstroBox) 连接手环，点击「安装快应用」并选择已保存的 RPK 文件。若手环已安装旧版本，需使用相同证书签名的安装包进行覆盖安装。
3. **恢复小米运动健康连接**：安装完成后断开 AstroBox，打开手机上的「小米运动健康」，等待手环连接状态恢复为「已连接」。
4. **启用手机端同步**：打开 `payfor工大` 手机主应用，进入「设置 → 小米手环」，开启手环连接并按系统提示授予所需权限，随后即可在手环端打开校园卡应用。

**常见排查**：若手环端持续显示「请连接手机」，请依次确认：小米运动健康是否处于「已连接」状态、手机主应用内的手环连接开关是否开启、应用是否已获得蓝牙相关权限。

## 源码打包与发版

本地构建需安装 Node.js 22。在仓库根目录执行以下命令生成调试包：

```sh
npm ci --ignore-scripts
node scripts/package-rpk.cjs debug dist/artifacts
```

构建产物输出至 `dist/artifacts/`。调试签名与发布签名不同，无法覆盖安装正式版。若需使用自定义证书签名，可先运行 `node scripts/create-signing-key.cjs` 生成密钥对，再通过环境变量 `CAMPUS_BETA_SIGN_DIR` 指定包含 `private.pem` 与 `certificate.pem` 的目录并执行 `npm run release`（自定义签名包同样无法覆盖本仓库发布的版本）。

此外，[Actions](../../actions/workflows/build-rpk.yml) 会在日常提交时自动构建调试版 RPK，可在对应运行记录的「Artifacts」中下载。

1. 更新 `src/manifest.json` 中的 `versionName` 与 `versionCode` 并提交改动。
2. 正式发布前，可在 Actions 中手动触发 `signed_candidate` 生成候选包，测试对旧版本的覆盖安装。
3. 验证通过后，在本地 `main` 分支对审核通过的提交打标签并推送（以 `v2.0.7` 为例）：

```sh
git tag -a v2.0.7 -m "Release v2.0.7"
git push --atomic origin main refs/tags/v2.0.7
```

仓库公开后，版本标签将触发正式构建流程，使用原发布证书签名并校验通过后，将 RPK 发布至 [Releases](../../releases)。

二维码生成组件及字体等第三方许可文件位于 `src/common` 目录。
