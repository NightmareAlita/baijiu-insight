# 安装与验证说明

版本：1.0.1 测试版。普通使用不需要终端、命令行、Node.js 或另行运行服务器。

## 选择文件

| 电脑 | 文件 |
|---|---|
| Apple Silicon 或 Intel Mac，macOS 13 及以上 | `Baijiu-Insight-1.0.1-mac-universal.dmg` |
| Intel / AMD 64 位 Windows 10 或 11 | `Baijiu-Insight-1.0.1-win-x64.exe` |
| ARM64 Windows 11，例如部分 Snapdragon 电脑 | `Baijiu-Insight-1.0.1-win-arm64.exe` |

Mac 在“苹果菜单 → 关于本机”查看系统版本和芯片。Windows 在“设置 → 系统 → 系统信息”查看系统类型。

GitHub Actions 单独生成的 Mac 文件会分别标记 `arm64` 或 `x64`，请选择与芯片匹配的版本；本次直接交付的是通用 Mac 文件。

## Mac 安装

1. 双击 `.dmg` 文件。
2. 将其中的 `BaijiuInsight.app` 拖到 **Applications / 应用程序**。
3. 在“应用程序”中双击 `BaijiuInsight`，窗口名称为“白酒品牌洞察”。
4. 输入品牌并查询。退出时从应用菜单选择退出。

## Windows 安装

1. 双击 `.exe` 安装文件。
2. 按安装向导选择目录并完成安装。
3. 双击桌面“白酒品牌洞察”快捷方式；也可从开始菜单打开。
4. 如需卸载，使用 Windows“设置 → 应用 → 已安装的应用”。

安装器采用当前用户安装方式。组织管理的电脑可能另外要求管理员批准。

## 测试包的签名状态

Mac 包经过 ad-hoc 签名和签名完整性检查，但没有 Apple Developer ID 发布身份及 Apple 公证。Windows 包没有开发者证书签名。由 GitHub 下载后，macOS Gatekeeper 或 Windows SmartScreen 可能显示提示或阻止打开，因此这批文件不能承诺所有电脑都无提示运行。

本项目没有关闭系统安全设置或绕过检测。正式分发应准备 Apple Developer ID 证书与公证条件，以及适用的 Windows 代码签名，再验证真实下载和安装流程。Windows 签名也不保证新应用立即获得信誉。[Apple 官方说明](https://support.apple.com/en-us/102445)、[Microsoft 签名说明](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options)

## 已验证与待验证

- Mac 通用包：包含 ARM64 和 x86_64；当前 Apple Silicon Mac 上已成功启动打包后的应用并检查其内置健康接口；签名完整性检查通过。
- Windows x64、ARM64：已生成 NSIS 安装器并核对应用二进制架构。由于当前没有 Windows 测试机，安装向导及界面实际操作尚未验证。
- Intel Mac：已包含原生 Intel 运行时；未在 Intel 真机上进行桌面操作测试。
- 40 项回归测试和生产构建通过。GitHub 工作流已附带目标系统原生的打包与启动检查，需上传仓库后执行。

## 遇到问题

- 程序打不开：确认文件对应系统和处理器，确认系统版本满足要求。若是安全验证提示，请先核对来源及签名状态，保留提示内容供后续处理。
- 提示暂无数据：程序已启动，但平台可能要求登录、验证码、动态渲染或拒绝访问；查看各平台的状态说明，再稍后重试。
- 报告没有排名或历史趋势：尚未取得可靠的对应数据权限或历史记录；不会用随机数字补齐。
- 查询失败：点击页面的“重试”；需要时记录品牌、发生时间与页面提示。

源码 ZIP 是用于上传 GitHub 和维护项目的材料，不是给普通用户双击启动的软件。安装请使用上表中的 DMG 或 EXE。
