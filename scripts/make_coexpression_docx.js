// 生成共表达热图的分析说明文档 (Word, 适配 WPS)
// 用法: node make_coexpression_docx.js [输出目录] [插图目录]
// 不带参数时输出到 <WORK_ROOT>\\当天日期 文件夹
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, ImageRun,
} = require("docx");

// 工作根目录: 直接把工作目录切到这里, 输出与插图都在 <WORK_ROOT>/YYYY-MM-DD 下
const WORK_ROOT = "C:\\Users\\23027\\Desktop\\11\\画各种图";
fs.mkdirSync(WORK_ROOT, { recursive: true });
process.chdir(WORK_ROOT);
const today = new Date();
const DATE_DIR = [today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, "0"),
  String(today.getDate()).padStart(2, "0")].join("-");
const DEFAULT_DIR = path.join(WORK_ROOT, DATE_DIR);
fs.mkdirSync(DEFAULT_DIR, { recursive: true });

const OUT_DIR = process.argv[2] || DEFAULT_DIR;
const FIG_DIR = process.argv[3] || DEFAULT_DIR;
const CN = "宋体", EN = "Times New Roman", HEI = "黑体";
const BODY = 21;          // 五号 = 10.5 pt = 21 half-points
const TABLE_W = 8300;

const font = { ascii: EN, hAnsi: EN, eastAsia: CN, cs: EN };
const fontHei = { ascii: EN, hAnsi: EN, eastAsia: HEI, cs: EN };

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { line: 360, lineRule: "auto", before: 40, after: 40 },
    indent: opts.noIndent ? undefined : { firstLine: 420 },
    alignment: opts.align,
    children: [new TextRun({ text, font, size: BODY, bold: true })],
  });
}

function h(text, level) {
  const sizes = { 1: 28, 2: 24, 3: 21 };
  return new Paragraph({
    heading: level === 1 ? HeadingLevel.HEADING_1
      : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100, line: 360, lineRule: "auto" },
    children: [new TextRun({ text, font: fontHei, size: sizes[level], bold: true })],
  });
}

function caption(text) {
  return new Paragraph({
    spacing: { before: 60, after: 160, line: 300, lineRule: "auto" },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text, font, size: 18, bold: true })],
  });
}

function cell(text, { head = false, widths, align } = {}) {
  return new TableCell({
    width: { size: widths, type: WidthType.DXA },
    shading: head ? { type: ShadingType.CLEAR, fill: "EDF1F7" } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: align || (head ? AlignmentType.CENTER : AlignmentType.LEFT),
      spacing: { line: 280, lineRule: "auto" },
      children: [new TextRun({ text, font, size: 19, bold: true })],
    })],
  });
}

function table(rows, colWidths) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "808080" };
  return new Table({
    columnWidths: colWidths,
    width: { size: TABLE_W, type: WidthType.DXA },
    borders: {
      top: border, bottom: border, left: border, right: border,
      insideHorizontal: border, insideVertical: border,
    },
    rows: rows.map((r, i) => new TableRow({
      tableHeader: i === 0,
      children: r.map((t, j) => cell(String(t), {
        head: i === 0, widths: colWidths[j],
        align: j === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
      })),
    })),
  });
}

function image(file, w, hgt) {
  const p = path.join(FIG_DIR, file);
  if (!fs.existsSync(p)) return body("[缺少图片文件: " + file + "]", { noIndent: true });
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 40 },
    children: [new ImageRun({
      type: "png", data: fs.readFileSync(p),
      transformation: { width: w, height: hgt },
    })],
  });
}

const children = [];

children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 240, line: 360, lineRule: "auto" },
  children: [new TextRun({
    text: "6 个 marker 基因共表达热图：数据处理、分析原理与结果说明",
    font: fontHei, size: 32, bold: true,
  })],
}));

children.push(h("一、数据来源与样本构成", 1));
children.push(body("分析使用两个输入文件。表达矩阵 expression_matrix.xlsx 包含 436 个基因在 6 个样本中的原始计数（raw count），marker 文件 marker_genes.xlsx 包含 6 个 marker 基因。经核对，这 6 个 marker 基因全部包含在表达矩阵中，因此在计算共表达时将其从背景基因中剔除，剩余 430 个基因作为候选共表达对象。"));
children.push(body("6 个样本分为两组：N2、N1、N4 为 N 组，P1、P2、P5 为 P 组，每组 3 个生物学重复。各样本的原始计数总量（文库大小）见表 1。"));
children.push(caption("表 1  各样本原始计数总量"));
children.push(table([
  ["样本", "N2", "N1", "N4", "P1", "P2", "P5"],
  ["原始计数总量", "33 767", "36 560", "42 433", "148 028", "154 817", "152 183"],
  ["分组", "N", "N", "N", "P", "P", "P"],
], [1700, 1100, 1100, 1100, 1100, 1100, 1100]));
children.push(body("N 组文库大小为 3.4 万至 4.2 万，P 组为 14.8 万至 15.5 万，两组相差约 4 倍。这一差异必须在计算相关性之前消除，否则所有基因都会因为文库深度的共同变化而呈现虚高的相关性。", { noIndent: false }));

children.push(h("二、分析原理", 1));

children.push(h("2.1 文库标准化：CPM", 2));
children.push(body("采用 CPM（counts per million）将每个样本的计数缩放到相同的测序深度："));
children.push(body("CPM(i, j) = c(i, j) / Σ_i c(i, j) × 10^6", { noIndent: true, align: AlignmentType.CENTER }));
children.push(body("其中 c(i, j) 为基因 i 在样本 j 中的原始计数，分母为样本 j 的文库大小。标准化后各样本的计数总量统一为 10^6，样本间可直接比较。"));

children.push(h("2.2 对数转换：log2(CPM + 1)", 2));
children.push(body("RNA-seq 计数数据的方差随均值增大而增大，高表达基因的绝对波动远大于低表达基因。直接用原始 CPM 计算 Pearson 相关系数，结果会被少数高表达基因主导。取 log2 可以压缩这一异方差性，使数据更接近 Pearson 相关系数所假定的线性关系。加 1 是为了避免计数为 0 时取对数无定义。"));

children.push(h("2.3 共表达度量：Pearson 相关系数", 2));
children.push(body("对每个 marker 基因 m 与每个候选基因 g，在 6 个样本的 log2(CPM+1) 值上计算 Pearson 相关系数："));
children.push(body("r = Σ(x - x̄)(y - ȳ) / √[Σ(x - x̄)² × Σ(y - ȳ)²]", { noIndent: true, align: AlignmentType.CENTER }));
children.push(body("r 的取值范围为 -1 到 1。r 接近 1 表示两个基因在 6 个样本中的表达变化方向一致（同向共表达），接近 -1 表示变化方向相反（反向共表达），接近 0 表示无线性关联。共 6 × 430 = 2 580 对基因组合。"));

children.push(h("2.4 显著性判断", 2));
children.push(body("相关系数的显著性用 t 检验："));
children.push(body("t = r × √(n - 2) / √(1 - r²)，自由度 df = n - 2", { noIndent: true, align: AlignmentType.CENTER }));
children.push(body("本研究 n = 6，df = 4。在这个自由度下，双侧 P < 0.05 对应 |r| > 0.811。由于同时做了 2 580 次检验，还需用 Benjamini-Hochberg 方法做多重检验校正，校正后的 q 值已一并写入输出的 CSV 表格。"));

children.push(h("2.5 基因筛选：每个 marker 取 top 20 后求并集", 2));
children.push(body("430 个候选基因全部画进热图会导致无法标注基因名，因此对每个 marker 分别按 |r| 从大到小排序，取前 20 个基因，再对 6 份名单求并集。取 |r| 而非 r，意味着同向和反向共表达的基因都会被纳入。"));

children.push(h("2.6 列的排序：层次聚类", 2));
children.push(body("将筛选后的基因按其相关系数谱（每个基因对 6 个 marker 的 6 个 r 值）做层次聚类，距离定义为 1 减去 Pearson 相关系数，连接方式为平均连接（average linkage）。聚类只用于决定基因在热图中的先后顺序，不改变任何数值，目的是让模式相似的基因相邻，形成可辨认的色块。6 个 marker 保持输入文件中的原始顺序，不聚类。"));

children.push(h("2.7 配色与色标范围", 2));
children.push(body("采用 NPG 配色的蓝白红双向渐变：#3C5488（蓝）对应负相关，白色对应 r = 0，#E64B35（红）对应正相关。单色渐变无法区分正负方向，红绿配色对约 8% 的男性不友好，彩虹配色不满足感知均匀性，均不适用于这类双向数据。色标固定为 -1 到 1，不随数据范围自动缩放，这样不同图之间的颜色深浅可以直接比较。"));

children.push(h("三、结果", 1));

children.push(h("3.1 相关系数的总体分布", 2));
children.push(body("2 580 对基因组合的相关系数范围为 -0.985 到 0.998。各 marker 达到 |r| > 0.811（未校正 P < 0.05）的基因数量差异较大，见表 2。"));
children.push(caption("表 2  各 marker 基因的强相关基因数量与相关性最高的前 3 个基因"));
children.push(table([
  ["Marker 基因", "|r| > 0.811 的基因数", "相关性最高的前 3 个基因（r 值）"],
  ["Chr02Bg000869", "85", "Chr02Ag000975 (-0.974)、Chr05Bg001311 (0.972)、Chr07Ag004194 (0.964)"],
  ["Chr02Bg005918", "60", "Chr03Ag001180 (0.998)、Chr06Ag003494 (0.994)、Chr04Ag004139 (0.968)"],
  ["Chr02Bg006322", "113", "Chr03Bg003816 (0.989)、Chr03Bg006189 (-0.985)、Chr03Ag002975 (-0.984)"],
  ["Chr03Ag002790", "151", "Chr03Ag002789 (0.997)、Chr04Bg007640 (0.988)、Chr05Bg004421 (0.986)"],
  ["Chr06Ag003232", "26", "Chr04Ag001378 (0.994)、Chr04Bg005154 (0.992)、Chr07Ag003870 (0.983)"],
  ["Chr06Ag004777", "9", "Chr07Ag002855 (0.943)、Chr04Ag005866 (0.924)、Chr06Ag002916 (-0.923)"],
], [2000, 1700, 4600]));
children.push(body("Chr03Ag002790 和 Chr02Bg006322 的强相关基因最多（151 个和 113 个），Chr06Ag004777 最少（9 个），说明 6 个 marker 与背景基因的关联程度差别明显。值得注意的是 Chr03Ag002790 与 Chr03Ag002789 的 r = 0.997，两者基因编号相邻，可能是串联重复基因或同一基因家族成员。"));

children.push(h("3.2 筛选结果：为什么是 99 个基因", 2));
children.push(body("6 个 marker 各取 20 个基因，共 120 个名额，去重后得到 99 个基因。也就是说 6 份名单之间几乎不重叠，具体重叠情况见表 3。"));
children.push(caption("表 3  入选基因被多少个 marker 同时选中"));
children.push(table([
  ["被几个 marker 同时选中", "基因数", "占比"],
  ["仅 1 个", "80", "80.8%"],
  ["2 个", "17", "17.2%"],
  ["3 个", "2", "2.0%"],
  ["合计", "99", "100%"],
], [3000, 2650, 2650]));
children.push(body("120 个名额中有 30 个来自负相关基因。名单高度不重叠说明 6 个 marker 并不共享同一个共表达模块，各自有相对独立的关联基因群，这一点在热图上也能直接看出来。"));

// ---- 表 3 对应的基因名单 (由 coexpression_heatmap.py 输出的 JSON 读取) ----
const listPath = path.join(FIG_DIR, "Fig_coexpression_heatmap_gene_lists.json");
if (fs.existsSync(listPath)) {
  const gl = JSON.parse(fs.readFileSync(listPath, "utf8"));
  const fmt = (e) => e.markers.map((m) => m.marker + " (r = " + m.r.toFixed(3) + ")").join("；");
  children.push(body("表 3 各组对应的具体基因如下，括号内为该基因与对应 marker 的 Pearson r。"));

  for (const k of ["3", "2"]) {
    const arr = gl.by_count[k] || [];
    if (!arr.length) continue;
    children.push(caption("表 3-" + (k === "3" ? "1" : "2") + "  被 " + k + " 个 marker 同时选中的基因（" + arr.length + " 个）"));
    children.push(table(
      [["基因", "选中该基因的 marker 及相关系数"]].concat(arr.map((e) => [e.gene, fmt(e)])),
      [2200, 6100]));
  }

  const one = gl.by_count["1"] || [];
  if (one.length) {
    const byMarker = {};
    for (const e of one) {
      const m = e.markers[0];
      (byMarker[m.marker] = byMarker[m.marker] || []).push(e.gene + " (" + m.r.toFixed(3) + ")");
    }
    const rows = [["Marker 基因", "基因数", "仅被该 marker 选中的基因（r）"]];
    for (const m of gl.marker_order) {
      const lst = byMarker[m] || [];
      rows.push([m, String(lst.length), lst.join("、")]);
    }
    children.push(caption("表 3-3  仅被 1 个 marker 选中的基因（" + one.length + " 个），按 marker 分组"));
    children.push(table(rows, [1900, 900, 5500]));
  }
}

children.push(h("3.3 热图的解读", 2));
children.push(image("Fig_coexpression_heatmap_horizontal.png", 554, 156));
children.push(caption("图 1  共表达热图（横版）。行为 6 个 marker 基因，列为 99 个入选基因，颜色表示 Pearson 相关系数。基因名在此缩放比例下不可读，细节请查看矢量 PDF 文件。"));
children.push(body("热图从左到右大致可分为三个区段。最左侧一段（约 15 个基因）对 5 个 marker 均呈明显的负相关，是一组与 marker 表达方向相反的基因。中间一大段对 Chr02Bg000869、Chr02Bg005918、Chr02Bg006322、Chr06Ag003232 呈强正相关，但对 Chr03Ag002790 接近 0，构成第一个共表达模块。右侧一段对 Chr03Ag002790 呈强正相关而对 Chr06Ag003232 接近 0，构成第二个模块。"));
children.push(body("由此可以判断：Chr02Bg000869、Chr02Bg005918、Chr02Bg006322 三者的共表达谱高度相似，很可能参与同一通路；Chr03Ag002790 自成一类；Chr06Ag003232 和 Chr06Ag004777 与前面几个 marker 的重叠程度最低。"));
children.push(image("Fig_coexpression_heatmap_vertical.png", 250, 749));
children.push(caption("图 2  共表达热图（竖版）。内容与图 1 完全相同，仅做转置，基因名横排便于阅读。"));

children.push(h("四、方法的局限与结果表述建议", 1));
children.push(body("以下四点在撰写论文时需要注意，直接影响结论能写到什么程度。"));
children.push(body("第一，样本量只有 6 个，自由度仅为 4，相关系数的统计功效很低。2 580 对组合中未校正 P < 0.05 的有 441 对（17.1%），但经 Benjamini-Hochberg 校正后 q < 0.05 的仅剩 4 对。因此热图呈现的是表达模式的趋势，单个基因对的显著性不足以单独下结论。"));
children.push(body("第二，本研究是 3 对 3 的两组设计，任何在两组间差异表达的基因之间都会自动产生高相关。换言之，此处的相关性在很大程度上反映的是 N 组与 P 组的组间差异，而不是样本内部的动态共变。建议在正文中表述为“表达模式一致”或“共表达趋势”，避免直接写成“共调控”。"));
children.push(body("第三，相关性不区分直接调控与间接关联，也无法判断方向。要进一步区分，需要结合启动子顺式元件分析、蛋白互作或实验验证。"));
children.push(body("第四，若要构建真正意义上的共表达网络（如 WGCNA），一般建议样本数不少于 15 个。当前数据量只适合做探索性的可视化展示。"));

children.push(h("五、可选的基因筛选方案", 1));
children.push(body("若认为 99 个基因过多，可改用下列任一方案，脚本中只需修改 TOPN 或筛选条件。"));
children.push(caption("表 4  不同筛选方案得到的基因数量"));
children.push(table([
  ["筛选方案", "入选基因数", "说明"],
  ["每 marker 取 |r| 前 20（当前）", "99", "同向与反向共表达均纳入"],
  ["每 marker 取 |r| 前 10", "56", "保留各 marker 的核心邻居"],
  ["每 marker 仅取正相关前 20", "91", "负相关不是名单变大的主因"],
  ["被 2 个及以上 marker 同时选中", "19", "marker 之间共享的共表达基因"],
  ["|r| > 0.95", "90", "阈值法，各 marker 贡献不均衡"],
  ["|r| > 0.90", "154", "阈值放宽后反而更多"],
], [3200, 1500, 3600]));

children.push(h("六、输出文件", 1));
children.push(caption("表 5  分析产生的文件"));
children.push(table([
  ["文件名", "内容"],
  ["Fig_coexpression_heatmap_horizontal.pdf / .svg", "横版热图，marker 作行、基因作列"],
  ["Fig_coexpression_heatmap_vertical.pdf / .svg", "竖版热图，基因作行、marker 作列"],
  ["Fig_coexpression_heatmap_correlation_full.csv", "6 × 430 全部组合的 r 值、P 值与 BH 校正 q 值，并标注是否入选热图"],
  ["coexpression_heatmap.py", "Python 版分析与绘图脚本"],
  ["coexpression_heatmap.R", "R 版脚本（ComplexHeatmap + circlize）"],
], [3600, 4700]));

children.push(h("七、方法学描述示例", 1));
children.push(body("以下段落可直接用于论文的 Methods 部分，数字与本文档一致。"));
children.push(body("Raw read counts of 436 genes across six samples (three biological replicates per group) were normalized to counts per million (CPM) and log2-transformed as log2(CPM + 1). For each of the six marker genes, Pearson correlation coefficients with the remaining 430 genes were calculated across the six samples. Statistical significance was assessed with a t-test (df = n - 2 = 4) and P values were adjusted for multiple testing using the Benjamini-Hochberg procedure. The 20 genes with the highest absolute correlation coefficient for each marker gene were retained, yielding a union of 99 genes. These genes were ordered by hierarchical clustering (correlation distance, average linkage) on their correlation profiles. The resulting matrix was visualized as a heat map with a diverging blue-white-red color scale fixed to the range -1 to 1.", { noIndent: true }));

const doc = new Document({
  styles: {
    default: {
      document: { run: { font, size: BODY }, paragraph: { spacing: { line: 360, lineRule: "auto" } } },
    },
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, bottom: 1440, left: 1800, right: 1800 },
      },
    },
    children,
  }],
});

const out = path.join(OUT_DIR, "共表达热图分析说明.docx");
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(out, buf);
  console.log("saved:", out);
});
