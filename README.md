# payfor工大 · 手环付款码

把校园付款码放到手环上。打开手环应用即可出示二维码，上下滑动可以切换到条形码，也可在手机端选择是否显示余额。

需要支持 Vela 快应用和小米运动健康互联的设备。小米手环 11 已实测，其他机型能否使用取决于固件和互联能力。界面适配胶囊形、矩形和圆形屏幕。

## 安装到手环

1. 在手机应用的「设置 → 小米手环」导出安装包，也可以从本仓库的 [Releases](../../releases) 下载 `HFUT-Campus-Band-版本.rpk`。
2. 用 [AstroBox](https://github.com/AstralSightStudios/AstroBox) 连接手环，点「安装快应用」，选刚保存的 RPK。已有旧版时，请使用同签名的包覆盖安装。
3. 安装完成后断开 AstroBox，打开小米运动健康，等手环重新显示「已连接」。
4. 回到支持手环互联的手机应用，在「设置 → 小米手环」开启连接并按提示授权。然后打开手环上的校园卡应用。

手机端已经内置连接和设置。若手环显示「请连接手机」，先确认小米运动健康已连接，再检查手机应用的手环连接开关和蓝牙权限。

## 从源码构建（可选）

安装 Node.js 22，然后在仓库根目录运行：

~~~sh
npm ci --ignore-scripts
node scripts/package-rpk.cjs debug dist/artifacts
~~~

安装包在 `dist/artifacts/`。调试签名与发布签名不同，不能覆盖正式版。有自己的签名时，可先运行 `node scripts/create-signing-key.cjs`，再用 `CAMPUS_BETA_SIGN_DIR` 指定存放 `private.pem` 和 `certificate.pem` 的目录并运行 `npm run release`。自行签名的包也不能覆盖官方发布在本仓库的版本。

[GitHub Actions](../../actions/workflows/build-rpk.yml) 会直接从源码生成 RPK，可在对应运行的「Artifacts」中下载。日常提交生成调试包；发布标签使用原发布证书生成并验签。

## 发布新版本

更新 `src/manifest.json` 中的 `versionName` 和 `versionCode`，提交改动。正式发行前，可在 Actions 手动运行 `signed_candidate`，用候选 RPK 覆盖安装旧版。以当前候选为例，在组织仓库的本地 `main` 分支上给审核通过的提交打标签：

~~~sh
git tag -a v2.0.7 -m "Release v2.0.7"
git push --atomic origin main refs/tags/v2.0.7
~~~

公开仓库的版本标签会触发构建，验签通过后 RPK 出现在 [Releases](../../releases)。

二维码及字体等第三方许可在 `src/common` 目录。
