const fs = require('fs');
const path = '/tmp/claude-0/-home-user-lxfs/1ff6149c-7b71-520d-ab43-bc57a4ddd335/scratchpad';
const D = require(path + '/node_modules/docx');
const {Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow,
       TableCell, WidthType, ShadingType, BorderStyle, ImageRun, PageBreak, convertMillimetersToTwip} = D;

// ---------- 读取相关分析结果 ----------
const rows = fs.readFileSync(path + '/out/CSS_correlation_table.csv', 'utf8')
  .trim().split('\n').slice(1).map(l => {
    const c = l.split(',').map(s => s.replace(/^"|"$/g, ''));
    return {group: c[0], v: c[1], n: +c[2], r: +c[3], lo: +c[4], hi: +c[5],
            p: +c[6], rho: +c[7], ps: +c[8], r2: +c[9], fdr: +c[10], fdrs: +c[11]};
  });

const CN = {EF_C1: '心功能1（治疗前LVEF）', EF_C4: '心功能4（治疗后LVEF）', Chance: '心功能下降值',
  ALT: '丙氨酸转氨酶 ALT', AST: '天冬氨酸转氨酶 AST', TBA: '总胆汁酸 TBA',
  TG: '甘油三酯 TG', TC: '总胆固醇 TC', HDL: '高密度脂蛋白 HDL-C',
  LDL: '低密度脂蛋白 LDL-C', 'blood.sugar': '血糖', TYG: 'TyG 指数', UA: '尿酸 UA',
  PLT: '血小板 PLT', BMI: '体质指数 BMI', FIB4: 'FIB-4 指数'};

const f3 = x => x.toFixed(3);
const fp = x => x < 0.001 ? '<0.001' : x.toFixed(3);

// ---------- 排版常量 ----------
const SZ = 21;          // 五号 = 10.5pt = 21 半点
const SZ_S = 19;        // 表格/图注 小五 ≈ 9.5pt
const FONT = {ascii: 'Times New Roman', hAnsi: 'Times New Roman', eastAsia: '宋体'};
const FONT_H = {ascii: 'Times New Roman', hAnsi: 'Times New Roman', eastAsia: '黑体'};

const P = (text, o = {}) => new Paragraph({
  alignment: o.align || AlignmentType.JUSTIFIED,
  spacing: {line: 360, lineRule: 'auto', before: o.before || 0, after: o.after || 60},
  indent: o.indent === false ? undefined : {firstLine: o.firstLine === false ? 0 : 420},
  children: [new TextRun({text, font: FONT, size: o.size || SZ, bold: !!o.bold, italics: !!o.italics})]
});

const H = (text, lvl, brk) => new Paragraph({
  heading: lvl === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
  spacing: {before: lvl === 1 ? 240 : 180, after: 120, line: 360, lineRule: 'auto'},
  pageBreakBefore: !!brk, keepNext: true,
  children: [new TextRun({text, font: FONT_H, size: lvl === 1 ? 24 : 21, bold: true, color: '000000'})]
});

const CAP = (text, o = {}) => new Paragraph({
  alignment: AlignmentType.CENTER, pageBreakBefore: !!o.brk, keepNext: !o.note,
  spacing: {before: o.before || 80, after: o.after || 80, line: 300, lineRule: 'auto'},
  children: [new TextRun({text, font: FONT, size: SZ_S, bold: false})]
});

// ---------- 表格 ----------
const TW = 9000;                                   // 表格总宽 DXA
const COLW = [2370, 560, 2180, 870, 870, 1200, 950];
const cell = (text, o = {}) => new TableCell({
  width: {size: o.w, type: WidthType.DXA},
  shading: o.head ? {type: ShadingType.CLEAR, fill: 'F2F2F2', color: 'auto'} : undefined,
  margins: {top: 40, bottom: 40, left: 80, right: 80},
  children: [new Paragraph({
    alignment: o.left ? AlignmentType.LEFT : AlignmentType.CENTER,
    spacing: {line: 260, lineRule: 'auto', after: 0},
    children: [new TextRun({text, font: FONT, size: SZ_S, bold: !!o.head})]
  })]
});

const HDR = ['指标', 'n', 'Pearson r（95%CI）', 'P 值', 'P(FDR)', 'Spearman ρ', 'P 值'];
const mkTable = grp => {
  const d = rows.filter(x => x.group === grp);
  const head = new TableRow({tableHeader: true,
    children: HDR.map((t, i) => cell(t, {w: COLW[i], head: true}))});
  const body = d.map(x => new TableRow({children: [
    cell(CN[x.v], {w: COLW[0], left: true}),
    cell(String(x.n), {w: COLW[1]}),
    cell(`${f3(x.r)}（${f3(x.lo)}, ${f3(x.hi)}）`, {w: COLW[2]}),
    cell(fp(x.p), {w: COLW[3]}),
    cell(fp(x.fdr), {w: COLW[4]}),
    cell(f3(x.rho), {w: COLW[5]}),
    cell(fp(x.ps), {w: COLW[6]})
  ]}));
  return new Table({
    columnWidths: COLW, width: {size: TW, type: WidthType.DXA},
    borders: {
      top: {style: BorderStyle.SINGLE, size: 8, color: '000000'},
      bottom: {style: BorderStyle.SINGLE, size: 8, color: '000000'},
      left: {style: BorderStyle.NONE, size: 0, color: 'FFFFFF'},
      right: {style: BorderStyle.NONE, size: 0, color: 'FFFFFF'},
      insideHorizontal: {style: BorderStyle.SINGLE, size: 2, color: 'BFBFBF'},
      insideVertical: {style: BorderStyle.NONE, size: 0, color: 'FFFFFF'}
    },
    rows: [head, ...body]
  });
};

const PX = 37.7953;   // 1 cm = 37.8 px @96dpi
const img = (file, wCm, hCm, brk) => new Paragraph({
  alignment: AlignmentType.CENTER, spacing: {before: 120, after: 60}, pageBreakBefore: !!brk,
  children: [new ImageRun({type: 'png', data: fs.readFileSync(file),
    transformation: {width: Math.round(wCm * PX), height: Math.round(hCm * PX)}})]
});

// ---------- 正文 ----------
const doc = new Document({
  styles: {default: {document: {run: {font: FONT, size: SZ}}}},
  sections: [{
    properties: {page: {margin: {top: convertMillimetersToTwip(25), bottom: convertMillimetersToTwip(25),
      left: convertMillimetersToTwip(28), right: convertMillimetersToTwip(26)}}},
    children: [
      new Paragraph({alignment: AlignmentType.CENTER, spacing: {after: 120},
        children: [new TextRun({text: '血清 S-磺基-L-半胱氨酸（CSS）水平与临床指标的线性相关分析报告',
          font: FONT_H, size: 32, bold: true})]}),
      new Paragraph({alignment: AlignmentType.CENTER, spacing: {after: 240},
        children: [new TextRun({text: '数据文件：20260908_人血清及细胞上清液测试.xlsx　　分析日期：2026-09-19',
          font: FONT, size: SZ_S})]}),

      H('1 资料与方法', 1),
      H('1.1 数据来源与分组', 2),
      P('本次分析所用数据来自 20260908_人血清及细胞上清液测试.xlsx，共纳入 44 例患者。按是否发生蒽环类药物相关心脏毒性分为两组：CTRCD 组 20 例（工作表 CTCR），Non-CTRCD 组 24 例（工作表 Non-CTCR）。'),
      P('因变量为液相色谱-串联质谱法测得的血清代谢物 S-磺基-L-半胱氨酸终浓度（以下简称 CSS，单位 μg/mL）。待分析的临床指标共 16 项：心功能1（治疗前 LVEF）、心功能4（治疗后 LVEF）、心功能下降值（Chance，即心功能1 减心功能4）、ALT、AST、总胆汁酸 TBA、甘油三酯 TG、总胆固醇 TC、HDL-C、LDL-C、血糖、TyG 指数、尿酸 UA、血小板 PLT、体质指数 BMI、FIB-4 指数。'),
      P('数据中存在少量缺失：P116 缺 TC、HDL、LDL 三项，P209 缺 PLT 与 FIB-4，P212 缺 UA，P219 缺 FIB-4。缺失值按变量对逐对剔除（pairwise deletion），因此各指标的实际分析例数略有差异，已在结果表 n 列中逐一列出。'),

      H('1.2 统计方法', 2),
      P('CSS 的分布采用 Shapiro-Wilk 检验评价正态性。两组 CSS 水平的差异采用 Mann-Whitney U 检验（因 Non-CTRCD 组不服从正态分布）。'),
      P('CSS 与各临床指标的线性相关采用 Pearson 积矩相关系数（给出 r 及其 95% 置信区间、决定系数 R²），同时给出 Spearman 秩相关系数 ρ 作为对异常值和非正态分布更稳健的参照。由于每组内同时检验 16 个指标，存在多重比较问题，对各组内的 P 值另行采用 Benjamini-Hochberg 法进行错误发现率（FDR）校正，表中以 P(FDR) 列给出。'),
      P('相关分析分别在 CTRCD 组内、Non-CTRCD 组内独立进行；同时给出全样本合并的结果，但该结果的解释须格外谨慎（详见 3.4）。检验水准 α = 0.05，双侧。'),
      P('全部分析在 R 4.5 环境下完成，使用 readxl、dplyr、ggplot2、ggpubr、patchwork 包，分析脚本见第 5 节附录。'),

      H('2 CSS 的分布与组间差异', 1),
      P('CTRCD 组 CSS 为 159.33 ± 121.18 μg/mL，中位数 144.76（四分位间距 70.12～236.97），范围 4.99～405.46 μg/mL；Non-CTRCD 组 CSS 为 6.20 ± 1.50 μg/mL，中位数 6.27（四分位间距 4.75～6.91），范围 4.41～9.68 μg/mL。两组差异有统计学意义（Mann-Whitney U 检验，W = 437.0，P < 0.001）。'),
      P('Shapiro-Wilk 检验结果：CTRCD 组 W = 0.938，P = 0.215；Non-CTRCD 组 W = 0.908，P = 0.032。需要特别说明的是，CTRCD 组 CSS 虽未被正态性检验拒绝，但从散点图可见其实际呈双峰分布：20 例中有 5 例（P106、P107、P108、P113、P120）的 CSS 仅为 4.99～21.96 μg/mL，与 Non-CTRCD 组处于同一水平，其余 15 例则在 86.18～405.46 μg/mL 之间。这一结构会削弱组内线性相关的检出能力。'),

      H('3 相关分析结果', 1),
      H('3.1 CTRCD 组（n = 20）', 2),
      P('CTRCD 组内 16 项指标的相关分析结果见表 1，散点图见图 1。'),
      P('未校正的 P 值下，仅 BMI 与 CSS 呈正相关，r = 0.482（95%CI 0.050～0.762），R² = 0.232，P = 0.031；Spearman ρ = 0.496，P = 0.026。另有两项接近但未达到检验水准：TG（r = 0.435，P = 0.055）与尿酸 UA（r = −0.397，P = 0.083）。经 BH 法 FDR 校正后，包括 BMI 在内的全部 16 项指标均无统计学意义（最小 P(FDR) = 0.441）。'),
      P('与心功能相关的三项指标与 CSS 均无线性相关：心功能1（r = −0.143，P = 0.549）、心功能4（r = −0.162，P = 0.494）、心功能下降值（r = −0.024，P = 0.922）。即在已发生心脏毒性的患者内部，CSS 的高低并不能反映心功能下降的幅度。'),

      H('3.2 Non-CTRCD 组（n = 24）', 2),
      P('Non-CTRCD 组内 16 项指标的相关分析结果见表 2，散点图见图 2。'),
      P('该组 16 项指标与 CSS 的相关系数全部无统计学意义，绝对值最大的是 BMI（r = −0.340，P = 0.104）与尿酸 UA（r = 0.304，P = 0.159），FDR 校正后 P 值均在 0.8 以上。该组 CSS 全部集中在 4.41～9.68 μg/mL 的狭窄区间内，标准差仅 1.50 μg/mL，取值范围受限（restriction of range）本身就会使相关系数向 0 收缩，因此这一阴性结果更可能反映该组内 CSS 缺乏有效变异，而非可以据此断定两者确无关联。'),

      H('3.3 全样本合并分析（n = 44）', 2),
      P('全样本合并后，有 4 项指标与 CSS 的相关在 FDR 校正后仍有统计学意义：BMI（r = 0.608，P < 0.001，P(FDR) < 0.001）、心功能下降值（r = 0.547，P < 0.001，P(FDR) < 0.001）、TG（r = 0.494，P < 0.001，P(FDR) = 0.004）、心功能4（r = −0.460，P = 0.002，P(FDR) = 0.007）。详见表 3。'),

      H('3.4 关于合并分析结果的解释', 2),
      P('合并分析的这些相关系数不宜直接解读为“CSS 与该指标存在线性相关”。原因是两组 CSS 的取值几乎完全不重叠（CTRCD 组中位数 144.76 μg/mL，Non-CTRCD 组中位数 6.27 μg/mL），而心功能下降值等指标在两组间本身也存在显著差异（CTRCD 组中位数 11.0，Non-CTRCD 组中位数 5.0，Mann-Whitney U 检验 P < 0.001）。将两组混合后，散点实际上形成了分处坐标系两端的两团点，回归直线主要由“组与组之间的均值差”所决定，而非组内的连续剂量-反应关系。这在统计上属于典型的分组效应（生态学谬误的一种表现形式）。'),
      P('证据是：同样的指标在任一组内单独分析时相关均消失（心功能下降值在 CTRCD 组内 r = −0.024，在 Non-CTRCD 组内 r = −0.144）。因此严谨的表述应为“CSS 水平在 CTRCD 组显著高于 Non-CTRCD 组”，用分组比较图（点图加组间检验）呈现；而“线性相关”的结论只能在组内下，组内的结论是阴性的。'),

      H('4 结论', 1),
      P('第一，血清 CSS 水平在 CTRCD 组显著高于 Non-CTRCD 组（P < 0.001），提示其具有区分两组的潜力，这一点应通过组间比较而非线性相关来呈现。'),
      P('第二，在 CTRCD 组内，CSS 与 16 项临床指标均无经多重比较校正后的线性相关；未校正时 BMI 呈中等正相关（r = 0.482，P = 0.031），TG（P = 0.055）与 UA（P = 0.083）呈边缘趋势，可作为后续扩大样本量验证的方向。'),
      P('第三，在 Non-CTRCD 组内，CSS 与全部 16 项指标均无线性相关，但该组 CSS 变异极小，属于取值范围受限条件下的阴性结果，证据力有限。'),
      P('第四，全样本合并得到的显著相关主要由组间差异驱动，不应作为 CSS 与临床指标存在线性关系的证据。'),
      P('第五，本分析的主要局限为样本量偏小（组内 n = 20 与 24，在 α = 0.05、双侧的条件下仅能稳定检出 r ≈ 0.55 以上的相关）、CTRCD 组 CSS 呈双峰分布、以及部分指标存在少量缺失。若后续扩大样本，建议对 CSS 作对数转换后再行分析，并考虑将 BMI 等潜在混杂因素纳入偏相关或多元回归模型。'),

      H('5 附录：分析环境与脚本', 1),
      P('分析环境：R 4.5，扩展包 readxl（读取 xlsx）、dplyr、ggplot2、ggpubr、patchwork（绘图与拼图）。相关检验使用 stats 包的 cor.test，FDR 校正使用 p.adjust（method = "BH"）。'),
      P('完整分析脚本为 CSS_correlation.R，随本报告一并提供。脚本开头 DATA_FILE 与 OUT_DIR 两个变量分别指定数据文件路径与输出目录，运行后在 console 打印全部统计结果，并输出本报告中的图 1、图 2（PDF 与 300 dpi PNG 两种格式）及相关系数表 CSS_correlation_table.csv。'),

      H('附表与附图', 1, true),
      CAP('表 1　CTRCD 组血清 CSS 与临床指标的相关分析（n = 20）'),
      mkTable('CTRCD'),
      CAP('注：P(FDR) 为组内 16 项检验经 Benjamini-Hochberg 法校正后的 P 值。', {before: 60, note: true}),

      CAP('表 2　Non-CTRCD 组血清 CSS 与临床指标的相关分析（n = 24）', {brk: true}),
      mkTable('Non-CTRCD'),
      CAP('注：P(FDR) 为组内 16 项检验经 Benjamini-Hochberg 法校正后的 P 值。', {before: 60, note: true}),

      CAP('表 3　全样本合并后血清 CSS 与临床指标的相关分析（n = 44）', {brk: true}),
      mkTable('All'),
      CAP('注：合并结果主要由 CTRCD 与 Non-CTRCD 两组间的均值差异驱动，解释见正文 3.4。', {before: 60, note: true}),

      img(path + '/out/Fig_CTRCD_correlation.png', 15.5, 16.3, true),
      CAP('图 1　CTRCD 组（n = 20）血清 CSS 与 16 项临床指标的散点图。实线为最小二乘回归线，阴影为 95% 置信带，r 与 P 为 Pearson 相关系数及其未校正 P 值。', {note: true}),

      img(path + '/out/Fig_NonCTRCD_correlation.png', 15.5, 16.3, true),
      CAP('图 2　Non-CTRCD 组（n = 24）血清 CSS 与 16 项临床指标的散点图。图例含义同图 1。', {note: true})
    ]
  }]
});

Packer.toBuffer(doc).then(b => {
  fs.writeFileSync(path + '/out/CSS相关分析报告.docx', b);
  console.log('written', b.length);
});
