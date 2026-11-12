# payfor工大 · 手环付款码

在支持 Vela 快应用和小米运动健康互联的设备上显示付款二维码、条形码和可选余额。屏幕布局支持胶囊形、矩形和圆形。已经实测小米手环 11；其他机型取决于固件和互联能力。

## 安装到手环

1. 在手机应用的「设置 → 小米手环」导出安装包，也可以从本仓库的 [Releases](../../releases) 下载 `HFUT-Campus-Band-版本.rpk`。
2. 在 [AstroBox](https://github.com/AstralSightStudios/AstroBox) 连接手环，打开「安装快应用」，选择刚保存的 RPK。覆盖安装需要同签名版本。
3. 安装完成后断开 AstroBox，回到小米运动健康，确认手环重新连接。
4. 在提供手环互联能力的 Android 宿主内打开「设置 → 小米手环」，启用手环连接并按提示授权。然后打开手环上的校园卡应用。
5. 在二维码页上下滑动可切换条形码。手机端可设置是否在二维码页显示余额。

如果一直显示「请连接手机」，先确认运动健康已连接，再检查手机的互联开关和蓝牙权限。安装文件和付款码分别由手环快应用与手机互联服务处理。

手机端已内置手环连接和设置，手环只需安装这个 RPK。

## 从源码构建（可选）

安装 Node.js 22，然后在仓库根目录运行：

~~~sh
npm ci --ignore-scripts
node scripts/package-rpk.cjs debug dist/artifacts
~~~

安装包在 `dist/artifacts/`。调试签名与发布签名不同，不能覆盖正式版。有自己的签名时，可先运行 `node scripts/create-signing-key.cjs`，再用 `CAMPUS_BETA_SIGN_DIR` 指定存放 `private.pem` 和 `certificate.pem` 的目录并运行 `npm run release`。自行签名的包也不能覆盖官方发布在本仓库的版本。

[GitHub Actions](../../actions/workflows/build-rpk.yml) 会直接从源码生成 RPK，可在对应运行的「Artifacts」中下载。日常提交生成调试包；发布标签使用原发布证书生成并验签。

由 [dustbin1415](https://github.com/dustbin1415) 维护，[OpenAI Codex](https://github.com/apps/chatgpt-codex-connector) 协助。许可证见 [AGPL-3.0](LICENSE)。二维码及字体等第三方许可在 src/common 目录。
