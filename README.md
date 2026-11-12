# payfor工大 · 手环付款码

在支持 Vela 快应用和小米运动健康互联的设备上显示付款二维码、条形码和可选余额。屏幕布局支持胶囊形、矩形和圆形。已经实测小米手环 11；其他机型取决于固件和互联能力。

## 安装到手环

1. 从本仓库的 [Releases](../../releases) 下载 HFUT-Campus-Band-版本.rpk，并保存到手机。
2. 在 AstroBox 连接手环，打开「安装快应用」，选择刚下载的 RPK。覆盖安装时选原有应用的同签名版本。
3. 安装完成后断开 AstroBox，回到小米运动健康，确认手环重新连接。
4. 在提供手环互联能力的 Android 宿主内打开「设置 → 小米手环」，启用手环连接并按提示授权。然后打开手环上的校园卡应用。
5. 在二维码页上下滑动可切换条形码。手机端可设置是否在二维码页显示余额。

如果一直显示「请连接手机」，先确认运动健康已连接，再检查手机的互联开关和蓝牙权限。安装文件和付款码分别由手环快应用与手机互联服务处理。

Release 中如附带 HFP，它只适用于明确支持该设置页的旧版宿主。使用已内置手环设置的版本时，完成上面的 RPK 安装即可。

## 构建

使用 Node.js 22.2 或更新版本。每个命令均在本仓库执行。

~~~sh
npm ci
npm run build
~~~

本地签名发布可先执行 node scripts/create-signing-key.cjs。将 CAMPUS_BETA_SIGN_DIR 指向含 private.pem 和 certificate.pem 的签名目录，再运行 npm run release。原版覆盖升级须继续使用原发布签名。

如需构建旧版手机设置页，设置 HFP_SIGN_DIR 后执行 npm run build:hfp。构建产物位于 dist。

由 [dustbin1415](https://github.com/dustbin1415) 维护，[OpenAI Codex](https://github.com/apps/chatgpt-codex-connector) 协助。许可证见 [AGPL-3.0](LICENSE)。二维码及字体等第三方许可在 src/common 目录。
