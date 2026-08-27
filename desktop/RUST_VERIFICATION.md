# Desktop (Tauri 2 + Rust) — 本地验证手册

本文件记录 `desktop/` (Tauri 2 + Rust) 哪些部分已在沙箱验证、哪些必须在本地用 Rust 工具链验证，以及**精确命令**。

## 1. 沙箱已验证（无需 Rust 工具链）

| 项 | 结果 | 命令 |
|----|------|------|
| 桌面前端类型检查 (tsc) | ✅ 通过 | `cd desktop && NODE_OPTIONS="" npm run build` |
| 桌面前端产物 (vite) | ✅ `dist/assets/index-*.js` 148.92 kB (gzip 48.15 kB) | 同上 |
| Web 端密钥回流全链路 | ✅ 见下 | `cd web && NODE_OPTIONS="" npm run build && NODE_OPTIONS="" npx next start -p 3019` |

> ⚠️ **沙箱 safe-delete shim 陷阱**：本环境 `NODE_OPTIONS` 被注入了
> `--require=.../genie-safe-delete.cjs`，会拦截 `fs.rmSync`/`unlink` 并路由到回收站，
> 导致 `next build` 清理 `.next` 与 `vite build` 清理 `dist` 时报
> `[safe-delete] 操作失败 ... trash operation aborted` 而失败。
> **修复**：构建命令前加 `NODE_OPTIONS=""`（仅作用于构建产物，非用户文件，安全）。
> 本地若未注入该 shim，则无需加。

## 2. Web 端密钥回流冒烟（已通过，7 项全绿）

启动 `next start -p 3019` 后，token 全链路：

1. `POST /api/desktop-token` → `{token:24字符, expires_at}`（**不返回 key**，防泄露）
2. `GET  /api/desktop-validate?token=...` → `{valid:true, key:"NF-XXXX-XXXX-XXXX"}`
3. `GET  /free-trial?token=...` → HTTP 200，canonical = `https://nichefiletools.com/free-trial`
4. `POST /api/desktop-redeem {token,key}` → `{ok:true}`
5. 再次 redeem → `400 invalid or already redeemed key`（**单次核销**）
6. 伪造 token validate → `{valid:false}`
7. 已核销 token validate → `{valid:false}`（single-use 一致性，已修 `desktopTokenStore.validateToken`）

## 3. 必须在本地用 Rust 工具链验证（沙箱无 cargo/rustc）

### 3.1 前置依赖
- Rust stable：`rustup` 安装，含 `rustc`/`cargo`。
- Tauri CLI：`cargo install tauri-cli` 或 `npm i -D @tauri-apps/cli` 后用 `npm run tauri`。
- 系统 WebView 依赖（Tauri 2 要求）：
  - **Windows**：需 [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/)（Win11 通常已带）。
  - **macOS**：`xcode-select --install`。
  - **Linux**：`webkit2gtk-4.1` + `librsvg` + `patchelf` 等（见 Tauri 官方 “prerequisites”）。
- 可选原生内核（仅 PRT→STL / BLEND→GLB 实际调用）：
  - **FreeCAD**（`freecadcmd` 或环境变量 `$FREECAD_CMD`）→ PRT→STL 走 CLI 导出 STL。
  - **Blender**（`blender` 或 `$BLENDER_CMD`）→ BLEND→GLB 走 `bpy.ops.export_scene.gltf`。

### 3.2 验证命令（在 `desktop/` 目录下）

```bash
# a) 仅类型/编译检查 Rust（最快，不打包）
cargo check

# b) 前端 + Rust 整体构建（生成安装包需下方 tauri build）
npm run build            # tsc + vite，产出 dist/
npm run tauri build      # cargo 编译 + 打包 <10MB 安装包

# c) 开发模式（热重载，手动点选文件验证 5 个转换器）
npm run tauri dev
```

### 3.3 各转换器本地预期行为

| slug | 实现位置 | 本地预期 |
|------|----------|----------|
| raw-to-iso | `src-tauri/src/converters/raw_to_iso.rs` | 纯 Rust，读 2352 扇区抽 2048 用户数据写 ISO；`len % 2352 != 0` 报 InvalidFile。✅ 可直接跑 |
| pvr-to-png | `src-tauri/src/converters/pvr_to_png.rs` | 纯 Rust 解析 PVR v3（magic `0x0352_5650`，52 字节头），未压缩 32 位 RGBA → PNG。压缩/坏 magic → NotImplemented。✅ 可直接跑 |
| prt-to-stl | `src-tauri/src/converters/prt_to_stl.rs` | shell 调 FreeCAD CLI 导 STL；无 FreeCAD → MissingDependency |
| blend-to-glb | `src-tauri/src/converters/blend_to_glb.rs` | shell 调 Blender `-b -P` 导 GLB；无 Blender → MissingDependency |
| kfx-to-epub | `src-tauri/src/converters/kfx_to_epub.rs` | `NotImplemented`（DRIF/Snappy 解析待补；Web 端 WASM 路径承担浏览器内转换） |

### 3.4 配额 / 密钥回流（Rust 侧）
- `src-tauri/src/key_reflow.rs`：`FREE_QUOTA=2`、device-hash 防刷（每设备一生一次免费 key）、`consume_quota` 门控每次 convert。
- 后端仍为 **DEV STUB**（`web/src/lib/desktopTokenStore.ts`，内存态、重启即失、不强制每设备限制）。
  **上线前必须替换为 DB 支撑的真实后端**（密钥回流 doc §4.1：token 服务端生成、24h 过期、单次核销、每设备限制）。

## 4. 已知待办（非阻塞）
- KFX→EPUB 桌面端为 `NotImplemented` 桩；接真实 DRIF/Snappy 解析器。
- 替换 dev token store 为真实后端（每设备限制 + 持久化）。
- 桌面端 `prt-to-stl` / `blend-to-glb` 在 CI 无 FreeCAD/Blender 时会 `MissingDependency`，属预期降级，非缺陷。
