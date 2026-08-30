# 手动测试素材清单 · manual-test-fixtures

nicheFileTools **15 个转换器**的手动测试输入样本。全部为**从公开网络获取的真实文件**（不再使用脚本合成样本）。

本目录**不进 git**（见 `.gitignore`），仅用于你本机手动测试。

## 来源分类

- **真实（项目自带）**：直接复制自 `../test-fixtures/`，官方手动测试素材库。
- **真实（全网获取）**：从公开仓库/样本站下载的真实样例，见下表「来源」。
- **需自备/能力边界**：`kfx-to-epub`（DRM）、`raw-to-iso`（无公开小样本）需自备真实文件；`pvr-to-png` 已有真实成功样本但转换器有格式边界，见下。

## 工具总览（15 个）

| 工具 | 类别 | 输入文件 | 来源 | 可用度 |
| --- | --- | --- | --- | --- |
| `exr-to-png` | A | `*.exr`（11 个） | 真实（项目自带） | 高 |
| `gsm-to-wav` | A | `tone-440hz.gsm` / `voice-test.gsm` | 真实（项目自带） | 高 |
| `mts-to-mp4` | B | `sample_960x400_ocean_with_audio.mts` | 真实（项目自带） | 高 |
| `wad-extractor` | C | `freedoom1.wad` / `freedoom2.wad` | 真实（项目自带） | 高 |
| `pfm-to-ttf` | A | `cmXX10.pfb`+`.pfm`（5 组） | 真实（项目自带） | 高 |
| `glb-to-gltf` | A | `Box.glb` | 真实（KhronosGroup/glTF-Sample-Assets） | 高 |
| `blend-to-glb` | B | `rock.blend` | 真实（gazebosim/gz-sim） | 高 |
| `step-to-stl` | B | `ESP32-C3-MINI-1.STEP` / `M2-ZED-F9T-20B-00.STEP` | 真实（GeorgeIoak / fcmadwar） | 高 |
| `eot-to-ttf` | A | `font.eot` | 真实（samplefile.com） | 高 |
| `opf-to-epub` | A | `input.opf` + `chapter01.xhtml` + `book.ncx` | 真实（rbrito/epub-example） | 高 |
| `raw-to-wav` | A | `sine.raw`（16-bit/44.1k/mono PCM） | 真实（shashank7652907/Audio_Generation_Project） | 高 |
| `sav-to-csv` | A | `Kappa.sav`（SPSS `$FL2`） | 真实（aditya-ksh/SPSS） | 高 |
| `pvr-to-png` | A | `B8G8R8A8_UNORM_sRGB_RGBA_T.pvr`（成功）+ `disturb_4bpp_rgb.pvr`（拒绝） | 真实（bluescan/tacentview + mrdoob/three.js） | 高 |
| `kfx-to-epub` | A | — | 需自备（DRM） | 缺 |
| `raw-to-iso` | C | — | 需自备（无公开小样本） | 缺 |

> 类别：**A**＝浏览器/原生可实现；**B**＝依赖外部引擎（ffmpeg/blender/occt/calibre）；**C**＝仅桌面端可实现。

## 真实样本说明

- **glb-to-gltf** · `Box.glb`：Khronos 官方 glTF 2 示例（CC0/CC-BY），含 `glTF` 魔数。转换器应拆出 `.gltf` + `.bin`。
- **blend-to-glb** · `rock.blend`：Gazebo 示例 Blender 工程（Apache-2.0），含 `BLENDER` 魔数。需本机装 Blender。
- **step-to-stl** · STEP 文件（`ISO-10303-21` 文本）：ESP32 模组 + u-blox 模组，均真实。需本机装 OCCT/FreeCAD。
- **eot-to-ttf** · `font.eot`：真实 EOT，offset 34 为 `LP`，内嵌 TrueType（字节 196 起）。转换器提取内嵌字体。
- **opf-to-epub** · `input.opf` 引用 `chapter01.xhtml`、`book.ncx`，二者已同目录就位。转换器把 OPF + 引用资源打包成 EPUB。
- **raw-to-wav** · `sine.raw`：176400 字节 16-bit 有符号 PCM、单声道、44.1kHz（2s 440Hz）。**转换器无文件头，默认 44100/16/mono 正好匹配**，直接传即可出 WAV。
- **sav-to-csv** · `Kappa.sav`：真实 SPSS 数据文件（魔数 `$FL2`）。需本机 Python + `pandas`。
- **pvr-to-png** · `B8G8R8A8_UNORM_sRGB_RGBA_T.pvr`：真实 PVR **v3**、未压缩 32 位、无 mipmap（1280×720，来自 bluescan/tacentview）。满足转换器成功条件（魔数 v3 + 数据长 = 宽×高×4），**可成功转 PNG**（注意 B8G8R8A8 字节序致 R/B 互换，属转换器限制，非样本问题）。另含 `disturb_4bpp_rgb.pvr`（v2 压缩）作拒绝路径验证。详见子目录 `README.md`。

## 需自备与能力边界说明

- `kfx-to-epub`：KFX 是 Amazon 专有且加密的格式，无公开合法样本。须用你自己 Kindle 书库导出的 `.kfx`（含 DRM 密钥）+ Calibre（KFX Input 插件）转换。详见子目录 `NEED_REAL_FILE.md`。
- `raw-to-iso`：转换器要求 **2352 字节/扇区**的 raw CD 镜像（文件大小为 2352 整数倍）。公开网络没有小体积的真实样本（真实 raw CD 抓轨动辄数百 MB 且多涉版权）。须用你自己的光盘经 DiscImageCreator / IsoBuster 抓轨得到 `.bin`，或用 bchunk 从自有 `.bin/.cue` 转换。详见子目录 `README.md`。
- `pvr-to-png`（已补齐成功样本）：现已从公开网络找到真实成功样本 `B8G8R8A8_UNORM_sRGB_RGBA_T.pvr`（bluescan/tacentview，PVR v3 未压缩 32 位无 mipmap），可成功转 PNG。转换器仍会拒绝 v2/压缩 v3/带 mipmap/非 32 位布局（`disturb_4bpp_rgb.pvr` 即拒绝路径样本）。另注：该成功样本为 B8G8R8A8 字节序，转换器按 RGBA 读字节会致 R/B 互换——属转换器字节序假设限制，非样本问题。详见子目录 `README.md`。

## 备注

- class C（`raw-to-iso`、`wad-extractor`）网页端显示 "desktop only"，请用 `cd desktop && npm run tauri dev` 跑真实转换。
- class B（`mts-to-mp4`、`blend-to-glb`、`step-to-stl`）依赖外部引擎，需本机已装 ffmpeg / Blender / OCCT。
- 之前脚本合成的样本已移入 `_obsolete_synthetic/`（仅归档，未删除），不再用于测试。
