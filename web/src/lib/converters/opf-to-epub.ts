// OPF (+资源 ZIP) → EPUB 3.0：按 EPUB ZIP 规范重新打包（mimetype 首位 stored）。
// 零依赖：ZIP 读/写用 lib/zip.ts，OPF XML 解析用浏览器原生 DOMParser。
// 输入两种形态：① .zip（内含 OPF + 资源，推荐）② 单个 .opf（打包为最小可开 EPUB）。
import { IConverter, ConverterInfo, ConversionOptions, ConversionResult, defaultValidate } from "./interfaces";
import { readZip, buildZip, type ZipEntry } from "../zip";

const MIMETYPE = "application/epub+zip";

function containerXml(opfPath: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="${opfPath.replace(/"/g, "&quot;")}" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
}

function navXhtml(title: string, items: { href: string; label: string }[]): string {
  const lis = items
    .map((it) => `      <li><a href="${it.href.replace(/"/g, "&quot;")}">${escapeHtml(it.label)}</a></li>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <head><title>${escapeHtml(title)}</title></head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1>${escapeHtml(title)}</h1>
      <ol>
${lis}
      </ol>
    </nav>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i < 0 ? "" : path.slice(0, i + 1);
}

function joinPath(dir: string, href: string): string {
  return href.startsWith("/") ? href.slice(1) : dir + href;
}

/** 从 OPF XML 提取：dc:title、manifest items、spine 顺序。 */
function parseOpf(xmlText: string, opfPath: string) {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("The OPF file is not well-formed XML and cannot be packaged.");
  }
  const title =
    doc.getElementsByTagName("dc:title")[0]?.textContent?.trim() ||
    "Untitled";
  const manifest = Array.from(doc.getElementsByTagName("item")).map((it) => ({
    id: it.getAttribute("id") ?? "",
    href: it.getAttribute("href") ?? "",
    mediaType: it.getAttribute("media-type") ?? "",
    properties: it.getAttribute("properties") ?? "",
  }));
  const itemRefs = Array.from(doc.getElementsByTagName("itemref"))
    .map((r) => r.getAttribute("idref") ?? "")
    .filter(Boolean);
  return { title, manifest, itemRefs, dir: dirOf(opfPath) };
}

export class OpfToEpubConverter implements IConverter {
  readonly info: ConverterInfo = {
    id: "opf-to-epub",
    name: "OPF to EPUB",
    sourceFormats: [".zip", ".opf"],
    targetFormat: ".epub",
    category: "ebook",
    maxWebFileSize: 50 * 1024 * 1024,
    classType: "A",
    description: "Package an OPF manifest (plus resources) into a valid EPUB 3 file.",
  };

  validate(file: File) {
    return defaultValidate(this.info, file);
  }

  async convert(options: ConversionOptions): Promise<ConversionResult> {
    const name = options.inputFile.name;
    let entries: ZipEntry[] = [];
    let opfPath = "";

    if (/\.zip$/i.test(name)) {
      entries = await readZip(await options.inputFile.arrayBuffer());
      const opfs = entries.filter((e) => /\.opf$/i.test(e.name));
      if (!opfs.length) {
        throw new Error("No .opf file found inside the ZIP. Include the OPF alongside its resources.");
      }
      // 优先 content.opf，其次路径最短的
      opfPath = (opfs.find((e) => /content\.opf$/i.test(e.name)) ??
        opfs.sort((a, b) => a.name.length - b.name.length)[0]).name;
    } else {
      // 单个 OPF：以其原路径打包（资源缺失由阅读器按缺失处理）
      opfPath = name;
      entries = [{ name, data: new Uint8Array(await options.inputFile.arrayBuffer()) }];
    }

    const opfEntry = entries.find((e) => e.name === opfPath)!;
    const opf = parseOpf(new TextDecoder().decode(opfEntry.data), opfPath);

    // manifest 与 ZIP 实际内容对账（区分大小写）
    const zipNames = new Set(entries.map((e) => e.name));
    const missing = opf.manifest
      .filter((m) => m.href && !/^[a-z]+:\/\//i.test(m.href))
      .filter((m) => !zipNames.has(joinPath(opf.dir, m.href)))
      .map((m) => m.href);
    if (missing.length) {
      throw new Error(
        `The OPF references ${missing.length} file(s) missing from the upload: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? " …" : ""}. Include them in the ZIP.`,
      );
    }

    // 生成 EPUB 3 导航（若 OPF 未自带 nav）
    const hasNav = opf.manifest.some((m) => m.properties.includes("nav"));
    const navEntries: ZipEntry[] = [];
    let opfXml = new TextDecoder().decode(opfEntry.data);
    if (!hasNav) {
      const navName = joinPath(opf.dir, "nav.xhtml");
      const byId = new Map(opf.manifest.map((m) => [m.id, m]));
      const navItems = opf.itemRefs
        .map((id) => byId.get(id))
        .filter((m): m is NonNullable<typeof m> => Boolean(m))
        .map((m) => ({
          href: relativeTo(navName, joinPath(opf.dir, m.href)),
          label: prettyName(m.href),
        }));
      navEntries.push({ name: navName, data: new TextEncoder().encode(navXhtml(opf.title, navItems)) });
      // 注入 manifest/spine，保证 EPUB 3 一致性（幂等：仅当无 nav 时）
      const inject =
        `<item id="generated-nav" href="${relativeTo(opfPath, navName)}" media-type="application/xhtml+xml" properties="nav"/>`;
      opfXml = opfXml.replace(/<\/manifest>/i, `  ${inject}\n</manifest>`);
      const spineInject = `<itemref idref="generated-nav"/>`;
      const m = opfXml.match(/<spine[^>]*>/i);
      if (m) opfXml = opfXml.replace(m[0], `${m[0]}\n    ${spineInject}`);
    }

    const outEntries: ZipEntry[] = [
      { name: "mimetype", data: new TextEncoder().encode(MIMETYPE) }, // 必须首位且 stored
      { name: "META-INF/container.xml", data: new TextEncoder().encode(containerXml(opfPath)) },
      ...(hasNav
        ? [{ name: opfPath, data: new Uint8Array(await options.inputFile.arrayBuffer()) }]
        : [{ name: opfPath, data: new TextEncoder().encode(opfXml) }]),
      ...navEntries,
      ...entries.filter((e) => e.name !== opfPath),
    ];

    const blob = buildZip(outEntries);
    return {
      data: blob,
      filename: name.replace(/\.(zip|opf)$/i, ".epub"),
      size: blob.size,
      mimeType: MIMETYPE,
    };
  }
}

function prettyName(href: string): string {
  const base = href.split("/").pop() ?? href;
  return base.replace(/\.[a-z]+$/i, "").replace(/[_-]+/g, " ");
}

/** nav 与内容文件同目录时的相对 href。 */
function relativeTo(fromPath: string, toPath: string): string {
  const fromDir = dirOf(fromPath);
  if (toPath.startsWith(fromDir)) return toPath.slice(fromDir.length);
  return toPath;
}
