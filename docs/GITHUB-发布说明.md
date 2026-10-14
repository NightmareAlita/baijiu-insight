# 在浏览器中生成 Mac 和 Windows 安装包

将源码上传到你自己的 GitHub 仓库后，点击 Actions 的 **Run workflow**，GitHub 会在对应系统上生成安装包。你的电脑无需安装 Node.js，也无需输入命令。

这份源码已附带构建流程；GitHub 上的首次构建仍需你上传后运行并确认结果。流程仅生成可下载的安装包，不会自动创建 GitHub Release。

## 1. 上传源码

1. 解压收到的源码 ZIP，打开包含 `package.json` 的目录。
2. 登录 GitHub，点击右上角 **+ → New repository**，填写仓库名，例如 `baijiu-insight`。可选择 **Private** 保持源码私有；许可证保持 **None**，然后点击 **Create repository**。
3. 在新仓库页面点击 **uploading an existing file**；已有仓库则点击 **Add file → Upload files**。
4. 将解压目录里的文件和子目录拖入上传区域。项目顶层应直接包含 `package.json`、`package-lock.json`、`src/`、`server/`、`electron/`、`scripts/`、`tests/`、`docs/` 和 `.github/`。
5. 确认文件保留了目录结构，填写提交说明，点击 **Commit changes**，提交到默认分支，通常是 `main`。
6. 在仓库文件列表确认 `package.json` 位于顶层，且能打开 `.github/workflows/release.yml`。

macOS 的 Finder 默认隐藏 `.github` 和 `.gitignore`；按 **Command + Shift + .** 显示隐藏文件后再选择文件。源码包中的 `.github` 必须一起上传，否则 Actions 中不会出现构建按钮。

若上传时遗漏 `.github`，可在仓库点击 **Add file → Create new file**，文件名填 `.github/workflows/release.yml`，用文本编辑器打开源码包内同名文件，复制其全部内容到网页，再点击 **Commit changes**。

GitHub 浏览器每次最多上传 100 个文件，单个文件上限 25 MiB；超过数量时可分批上传。源码包已排除依赖和旧构建产物，保留 `package-lock.json` 供云端安装固定依赖。[GitHub 文件上传说明](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)

## 2. 点击生成安装包

1. 点击仓库顶部 **Actions**。
2. 若页面要求启用 Actions，按页面提示启用。
3. 在左侧选择 **Build desktop installers**。
4. 点击右侧 **Run workflow**，分支选择默认分支，例如 `main`。
5. 通常保持 **Also build a native Windows ARM64 installer** 未勾选。需要用于 Snapdragon 等 ARM 处理器的 Windows 电脑时，再勾选此项。
6. 点击绿色 **Run workflow**。打开新出现的运行记录，查看各个任务的进度。

默认启动三个独立任务：Apple Silicon Mac、Intel Mac、Windows x64。勾选 Windows ARM64 后增加第四个任务。每个任务依次安装依赖、检查代码、构建网页和服务端、运行离线回归测试、生成安装包和验证打包后的应用能够启动。首次执行需要下载依赖和打包工具，耗时取决于 GitHub 排队及网络。

手动运行需要仓库写入权限，而且工作流文件必须位于默认分支。如果没有 **Run workflow** 按钮，先检查 `.github/workflows/release.yml` 的路径、分支和 Actions 是否启用。[GitHub 手动运行说明](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)

## 3. 下载并安装

构建完成后，打开该次运行记录，在页面底部 **Artifacts** 点击适合电脑的下载项：

| 下载项 | 适用电脑 | 解压后的安装文件 |
| --- | --- | --- |
| `Baijiu-Insight-macos-arm64` | macOS 13 或更新版本、M 系列芯片的 Mac | `.dmg` |
| `Baijiu-Insight-macos-x64` | macOS 13 或更新版本、Intel 芯片的 Mac | `.dmg` |
| `Baijiu-Insight-windows-x64` | Windows 10 / 11、Intel / AMD 64 位电脑 | `.exe` |
| `Baijiu-Insight-windows-arm64` | ARM 处理器的 Windows 11 电脑；仅勾选选项时生成 | `.exe` |

下载后先解压 ZIP。Mac 打开 `.dmg`，将 `BaijiuInsight.app` 拖入 **Applications / 应用程序**；Windows 双击 `.exe`，按安装向导完成安装。应用名称为“白酒品牌洞察”，Mac 文件名为 `BaijiuInsight.app`。安装后直接打开应用，应用会启动自带的本地服务。

在 Mac 的 **苹果菜单 → 关于本机** 查看芯片；在 Windows 的 **设置 → 系统 → 系统信息** 查看系统类型，选择对应安装包。

下载 Artifacts 需要登录 GitHub 并拥有该仓库的读取权限。本流程将安装包保存 7 天；请及时下载，过期后重新点击 **Run workflow** 生成。[GitHub 下载构建产物说明](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts)

## 4. 出现失败时

- 某项任务变红：点开任务，再展开失败的步骤。依赖下载或工具下载临时失败时，可以点击 **Re-run jobs → Re-run failed jobs**；代码检查或测试失败时，应根据日志修复后重新上传。
- 找不到安装包：确认对应任务的 **Upload DMG** 或 **Upload Windows installer** 已成功。流程会在应用启动验证通过后上传安装包。
- 长时间排队：GitHub 的原生系统 runner 可能需要等待。可选 Windows ARM64 的失败不会取消其他平台任务。
- Actions 被禁止或额度不足：检查仓库 **Settings → Actions** 和账户的 Actions 用量。私有仓库构建及产物存储使用账户额度；组织策略也可能限制官方 Actions 或 runner 的使用。

## 安装包与正式分发的边界

此流程生成测试和内部使用的安装包，无需配置 GitHub Secrets。Mac 使用 ad-hoc 签名，没有 Apple Developer ID 身份及 Apple 公证；Windows 没有开发者证书签名。系统可能显示发布者未知或阻止打开。正式向公众分发前，需要配置 Apple Developer ID 签名与公证，以及适用的 Windows 代码签名，再执行对应验证。[electron-builder v26 Mac 签名说明](https://www.electron.build/v26/docs/features/code-signing/code-signing-mac/)

自动启动检查验证打包后的应用能启动并提供本地服务，完整界面操作、真实平台采集及实际安装向导仍需在目标电脑上验证。

源码 ZIP 只包含源码与说明，安装包由构建任务生成。工作流只申请仓库内容读取权限，打包参数设置为 `--publish never`，不自动发布 Release，也不自动修改仓库文件。以后需要公开下载链接时，可在 GitHub **Releases → Draft a new release** 中自行填写版本和说明，上传已下载的 `.dmg` / `.exe` 后发布。公开源码或添加开源许可证应由项目所有者另行决定。

## 构建配置参考

工作流位于 `.github/workflows/release.yml`，使用 Node.js 24 LTS。Mac ARM64 使用 `macos-15`，Mac Intel 使用 `macos-15-intel`；Windows x64 使用 `windows-2025`，可选 Windows ARM64 使用 `windows-11-arm`，各架构分别原生构建。[GitHub runner 说明](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)

截至 2026-10-14 已核对 GitHub 官方最新版本，并固定到完整提交 SHA：

- [actions/checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1)
- [actions/setup-node v7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0)
- [actions/upload-artifact v7.0.2](https://github.com/actions/upload-artifact/releases/tag/v7.0.2)

工作流仅支持手动运行，上传源码不会自动开始构建。每个任务最多运行 45 分钟；重新运行成功的任务会替换该次运行中同名的安装包下载项。
