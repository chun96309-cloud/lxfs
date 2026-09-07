// 跃动·栖园 开题答辩PPT 生成脚本
// 运行：node gen_pptx.js  （需要 pptxgenjs；图片位于 ./figs，全部来自开题报告 docx）
const pptxgen = require("pptxgenjs");
const path = require("path");
const fs = require("fs");
const FIG = (n) => { const png = path.join(__dirname, "figs", n + ".png"); return fs.existsSync(png) ? png : path.join(__dirname, "figs", n + ".jpg"); };

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10 x 5.625 in
pres.author = "开题报告";
pres.title = "跃动·栖园——全民健康视角下的眉山市仁寿县体育公园景观设计";

const NAVY = "1F3F7A", BLUE = "1D4F91", ORANGE = "E07B2A", GRAY = "444444", MUTED = "777777";
const LIGHT = "EEF2F8", LINE = "A9B4CC", GREEN = "4E8A3E", PALE = "F6F7FA", WHITE = "FFFFFF";
const F = "Microsoft YaHei", FE = "Arial";
let page = 0;

// ---------- helpers ----------
function header(s, sec, en, sub) {
  page++;
  s.background = { color: WHITE };
  s.addText(sec, { x: 0.35, y: 0.15, w: 5, h: 0.4, fontFace: F, fontSize: 16, bold: true, color: BLUE, margin: 0, isTextBox: true });
  s.addText(en, { x: 5.0, y: 0.2, w: 4.65, h: 0.35, fontFace: FE, fontSize: 11, bold: true, color: ORANGE, align: "right", margin: 0, isTextBox: true });
  s.addShape(pres.shapes.LINE, { x: 0.35, y: 0.58, w: 9.3, h: 0, line: { color: LINE, width: 0.75 } });
  if (sub) s.addText(sub, { x: 0.5, y: 0.63, w: 8.5, h: 0.32, fontFace: F, fontSize: 12, bold: true, color: BLUE, margin: 0, isTextBox: true });
  s.addText(String(page).padStart(2, "0"), { x: 9.0, y: 5.28, w: 0.65, h: 0.25, fontFace: FE, fontSize: 9, color: "999999", align: "right", margin: 0, isTextBox: true });
}
const DIMS = require(path.join(__dirname, "figs", "dims.json"));
// 按原图宽高比等比缩放放入 (x,y,w,h) 框内，不裁切不拉伸；水平居中，默认顶部对齐
function img(s, name, x, y, w, h, cap, o = {}) {
  const [iw, ih] = DIMS[name];
  const sc = Math.min(w / iw, h / ih);
  const dw = iw * sc, dh = ih * sc;
  const dx = x + (w - dw) / 2, dy = o.vcenter ? y + (h - dh) / 2 : y;
  s.addImage({ path: FIG(name), x: dx, y: dy, w: dw, h: dh });
  if (cap) s.addText(cap, { x, y: dy + dh + 0.02, w, h: 0.22, fontFace: F, fontSize: 8, color: MUTED, align: "center", margin: 0, isTextBox: true });
  return { x: dx, y: dy, w: dw, h: dh };
}
function txt(s, t, x, y, w, h, o = {}) {
  s.addText(t, Object.assign({ x, y, w, h, fontFace: F, fontSize: 10, color: GRAY, valign: "top", margin: 2, isTextBox: true, lineSpacingMultiple: 1.15 }, o));
}
function rect(s, x, y, w, h, fill, o = {}) {
  s.addShape(pres.shapes.RECTANGLE, Object.assign({ x, y, w, h, fill: { color: fill }, line: { color: fill, width: 0 } }, o));
}
function tag(s, t, x, y, w, h, fill = NAVY, size = 10) {
  rect(s, x, y, w, h, fill);
  s.addText(t, { x, y, w, h, fontFace: F, fontSize: size, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0, isTextBox: true });
}
function circleNum(s, n, x, y, d = 0.42, fill = ORANGE) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill, width: 0 } });
  s.addText(String(n), { x, y, w: d, h: d, fontFace: FE, fontSize: 12, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0, isTextBox: true });
}
function bullets(s, items, x, y, w, h, size = 9.5, o = {}) {
  const arr = items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1, paraSpaceAfter: 3 } }));
  s.addText(arr, Object.assign({ x, y, w, h, fontFace: F, fontSize: size, color: GRAY, valign: "top", margin: 2, isTextBox: true }, o));
}
function label(s, t, x, y, w, h = 0.28, size = 11) {
  s.addText(t, { x, y, w, h, fontFace: F, fontSize: size, bold: true, color: NAVY, margin: 0, isTextBox: true, valign: "middle" });
}
// 照片卡片：等比放图，图上叠半透明色带写字，下方标签
function photoCard(s, name, x, y, w, h, over, label, col = NAVY, o = {}) {
  const r = img(s, name, x, y, w, h);
  const bh = o.bandH || Math.min(0.9, r.h * 0.42), by = r.y + (o.bandPos === "bottom" ? r.h - bh : r.h * 0.36);
  rect(s, r.x, by, r.w, bh, col, { fill: { color: col, transparency: o.alpha || 30 } });
  s.addText(over, { x: r.x + 0.06, y: by, w: r.w - 0.12, h: bh, fontFace: F, fontSize: o.fontSize || 7.5, color: WHITE, bold: !!o.bold, margin: 0, isTextBox: true, valign: "middle", align: o.align || "left" });
  if (label) s.addText(label, { x, y: y + h + 0.03, w, h: 0.3, fontFace: F, fontSize: o.labelSize || 11, bold: true, color: GRAY, align: "center", margin: 0, isTextBox: true });
  return r;
}
// 照片角标：等比放图，左上角小色块标签
function photoTag(s, name, x, y, w, h, tag, col = NAVY) {
  const r = img(s, name, x, y, w, h);
  const tw = Math.min(r.w, 0.22 + tag.length * 0.16);
  rect(s, r.x, r.y, tw, 0.26, col, { fill: { color: col, transparency: 10 } });
  s.addText(tag, { x: r.x, y: r.y, w: tw, h: 0.26, fontFace: F, fontSize: 8, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0, isTextBox: true });
  return r;
}
const SEC1 = ["01 课题研究背景", "Background of the Research Topic"];
const SEC2 = ["02 项目研究概述", "Overview of Project Research"];
const SEC3 = ["03 场地规划分析", "Site Planning Analysis"];

// ---------- 1 封面 ----------
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  rect(s, 0, 0, 5.4, 5.625, NAVY);
  rect(s, 5.4, 0, 4.6, 5.625, LIGHT);
  img(s, "x_aerial_city", 5.6, 0.35, 4.2, 2.6);
  img(s, "x_kites", 5.6, 3.05, 2.05, 2.25);
  img(s, "x_bench2", 7.75, 3.05, 2.05, 2.25);
  s.addText("风景园林专业毕业设计  开题报告", { x: 0.5, y: 0.6, w: 4.6, h: 0.3, fontFace: F, fontSize: 11, color: "C9D6F0", margin: 0, isTextBox: true });
  s.addText("跃动·栖园", { x: 0.5, y: 1.15, w: 4.7, h: 0.9, fontFace: F, fontSize: 40, bold: true, color: WHITE, margin: 0, isTextBox: true });
  s.addText("全民健康视角下的眉山市仁寿县体育公园景观设计", { x: 0.5, y: 2.1, w: 4.7, h: 0.75, fontFace: F, fontSize: 15, bold: true, color: WHITE, margin: 0, isTextBox: true, valign: "top" });
  s.addText("Landscape Design of Renshou Sports Park, Meishan from the Perspective of Health for All", { x: 0.5, y: 2.85, w: 4.7, h: 0.55, fontFace: FE, fontSize: 9, color: "C9D6F0", margin: 0, isTextBox: true, valign: "top" });
  s.addText("学院：建筑学院        专业：风景园林\n学生姓名：                学号：\n指导教师：\n二〇二六年九月", { x: 0.5, y: 3.75, w: 4.7, h: 1.3, fontFace: F, fontSize: 10.5, color: WHITE, margin: 0, isTextBox: true, valign: "top", lineSpacingMultiple: 1.4 });
  s.addText("SPORTS PARK", { x: 0.5, y: 5.15, w: 3, h: 0.3, fontFace: FE, fontSize: 9, color: "8FA6D6", charSpacing: 4, margin: 0, isTextBox: true });
}

// ---------- 2 目录 ----------
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  s.addText("目 录", { x: 0.5, y: 0.35, w: 2, h: 0.4, fontFace: F, fontSize: 16, bold: true, color: BLUE, margin: 0, isTextBox: true, valign: "bottom" });
  s.addText("CONTENT", { x: 7.5, y: 0.35, w: 2.15, h: 0.4, fontFace: FE, fontSize: 12, color: BLUE, align: "right", margin: 0, isTextBox: true, valign: "bottom" });
  s.addShape(pres.shapes.LINE, { x: 0.5, y: 0.8, w: 9.15, h: 0, line: { color: BLUE, width: 1.25 } });
  const cols = [
    ["01", "课题研究背景", ["1.1 选题背景", "1.2 研究目的", "1.3 研究意义", "1.4 技术路线与研究方法", "1.5 相关概念", "1.6 国内外研究现状", "1.7 案例参考"]],
    ["02", "项目研究概述", ["2.1 上位规划", "2.2 区位分析", "2.3 气候分析", "2.4 植物分析", "2.5 历史文化分析", "2.6 周边道路分析", "2.7 周边交通分析", "2.8 周边人行流线分析", "2.9 周边用地分析", "2.10 地形地貌分析", "2.11 场地现状分析", "2.12 人群结构分析", "2.13 主要人群需求分析", "2.14 光照分析", "2.15 SWOT分析", "2.16 问题梳理"]],
    ["03", "场地规划分析", ["3.1 设计目标", "3.2 设计原则", "3.3 设计构思", "3.4 设计策略", "3.5 设计成果", "3.6 进度安排", "3.7 参考文献"]],
  ];
  cols.forEach((c, i) => {
    const x = 0.8 + i * 3.1;
    s.addText([{ text: c[0], options: { color: "7FA6D9", fontFace: FE, fontSize: 20, bold: true } }, { text: c[1], options: { color: GRAY, fontFace: F, fontSize: 18, bold: true } }], { x, y: 1.15, w: 3.0, h: 0.5, margin: 0, isTextBox: true, valign: "middle" });
    s.addText(c[2].map((t, j) => ({ text: t, options: { bullet: { code: "25A0" }, breakLine: j < c[2].length - 1, paraSpaceAfter: 4 } })), { x, y: 1.75, w: 3.0, h: 3.5, fontFace: F, fontSize: 10, color: GRAY, margin: 0, isTextBox: true, valign: "top" });
  });
}

// ---------- 章节页 ----------
function sectionSlide(num, title, en, items, photos) {
  const s = pres.addSlide();
  header(s, `${num} ${title}`, en, null);
  img(s, photos[0], 5.3, 0.9, 4.35, 2.3);
  img(s, photos[1], 5.3, 3.3, 2.1, 1.85);
  img(s, photos[2], 7.55, 3.3, 2.1, 1.85);
  s.addText(num, { x: 0.6, y: 1.0, w: 3, h: 1.0, fontFace: FE, fontSize: 60, bold: true, color: NAVY, margin: 0, isTextBox: true });
  s.addText(title, { x: 0.6, y: 2.0, w: 4.5, h: 0.5, fontFace: F, fontSize: 22, bold: true, color: GRAY, margin: 0, isTextBox: true });
  const half = Math.ceil(items.length / 2);
  if (items.length > 8) {
    s.addText(items.slice(0, half).join("\n"), { x: 0.6, y: 2.65, w: 2.3, h: 2.4, fontFace: F, fontSize: 8.5, color: GRAY, margin: 0, isTextBox: true, valign: "top", lineSpacingMultiple: 1.3 });
    s.addText(items.slice(half).join("\n"), { x: 2.95, y: 2.65, w: 2.3, h: 2.4, fontFace: F, fontSize: 8.5, color: GRAY, margin: 0, isTextBox: true, valign: "top", lineSpacingMultiple: 1.3 });
  } else {
    s.addText(items.join("\n"), { x: 0.6, y: 2.65, w: 4.5, h: 2.4, fontFace: F, fontSize: 10, color: GRAY, margin: 0, isTextBox: true, valign: "top", lineSpacingMultiple: 1.4 });
  }
}
sectionSlide("01", "课题研究背景", SEC1[1], ["1.1 选题背景", "1.2 研究目的", "1.3 研究意义", "1.4 技术路线与研究方法", "1.5 相关概念", "1.6 国内外研究现状", "1.7 案例参考"], ["x_kites", "x_bar", "x_skatepark"]);

// ---------- 1.1 前言 ----------
{
  const s = pres.addSlide();
  header(s, SEC1[0], "Preface", "1.1 前言");
  const r = img(s, "x_cyclists", 0.5, 1.0, 5.2, 3.5);
  rect(s, r.x, r.y + r.h - 0.95, r.w, 0.95, "000000", { fill: { color: "000000", transparency: 45 } });
  s.addText("城镇化持续推进，高密度居住区不断涌现，可供居民开展户外运动的场地供给不足，社区运动配套设施缺口较大。如何为全龄居民提供一处能健身、游憩、社交的体育公园，非常值得探究。", { x: r.x + 0.1, y: r.y + r.h - 0.9, w: r.w - 0.2, h: 0.85, fontFace: F, fontSize: 8.5, color: WHITE, margin: 0, isTextBox: true, valign: "middle" });
  s.addText("动起来！体育公园！", { x: r.x + 0.3, y: r.y + 0.9, w: 3.6, h: 0.6, fontFace: F, fontSize: 24, bold: true, color: WHITE, rotate: 340, margin: 0, isTextBox: true, shadow: { type: "outer", color: "000000", blur: 3, offset: 1, angle: 45, opacity: 0.6 } });
  s.addText("全民健身状态", { x: 5.9, y: 1.0, w: 3.75, h: 0.7, fontFace: F, fontSize: 30, bold: true, color: GRAY, margin: 0, isTextBox: true, align: "right" });
  for (let i = 0; i < 6; i++) rect(s, 5.95 + i * 0.62, 1.8, 0.55, 0.28, ["D9DEE8", "C5CDDC", "AEB9CE", "97A5C0", "7E90B2", "5B6F9C"][i]);
  s.addText("被忽略的日常运动需求", { x: 5.9, y: 2.15, w: 3.75, h: 0.45, fontFace: F, fontSize: 16, bold: true, color: GRAY, margin: 0, isTextBox: true, align: "right" });
  rect(s, 5.9, 2.65, 1.85, 1.85, "3E5A3A");
  const kw = [["久坐少动", 13, 0.08, 0.1], ["场地不足", 11, 1.0, 0.14], ["老龄化", 12, 0.12, 0.55], ["慢性病风险", 10, 0.7, 0.72], ["亲子游憩", 9, 0.08, 1.15], ["邻里社交", 13, 0.55, 1.3]];
  kw.forEach((k) => s.addText(k[0], { x: 5.9 + k[2], y: 2.65 + k[3], w: 1.3, h: 0.4, fontFace: F, fontSize: k[1], bold: true, color: WHITE, margin: 0, isTextBox: true }));
  rect(s, 7.9, 2.65, 1.75, 1.85, "E4E6EA");
  txt(s, "仁寿城北新城集中型公共休闲绿地供给严重不足，现有绿地多为小区内部零散附属绿化，仅配简易健身器械，缺少服务全龄居民的城市综合体育公园。", 7.95, 2.7, 1.65, 1.75, { fontSize: 8, valign: "middle" });
  s.addText("跃动！栖园！全民健身！", { x: 0.5, y: 4.6, w: 4.2, h: 0.5, fontFace: F, fontSize: 20, bold: true, color: "3E5A3A", margin: 0, isTextBox: true });
  txt(s, "全民健身 · 全龄游憩 · 生态栖居", 4.8, 4.65, 4.85, 0.4, { fontSize: 10, color: GRAY, valign: "middle", align: "right" });
}

// ---------- 1.1 时代需求 ----------
{
  const s = pres.addSlide();
  header(s, SEC1[0], "Topic Background", "1.1 选题背景——时代需求");
  s.addText("高密度新城：集中公共绿地与户外运动场地供给不足", { x: 0.5, y: 0.98, w: 9.15, h: 0.3, fontFace: F, fontSize: 12, color: GRAY, align: "center", margin: 0, isTextBox: true });
  s.addText("仁寿县60岁及以上人口占26.56%，已进入深度老龄化；0-14岁占15.31%，全龄运动与游憩需求突出", { x: 0.5, y: 1.28, w: 9.15, h: 0.28, fontFace: F, fontSize: 10, color: GRAY, align: "center", margin: 0, isTextBox: true });
  const cards = [["x_aerial_city", "城镇化提速，城市建成区人口密度增大，高密度居住区涌现，公共绿地资源分配不均，户外运动场地供给不足。", "时代背景需求"],
    ["x_basketball", "国民身体素质与日常运动需求矛盾日益凸显，居民就近健身、球类跑步、亲子运动的场地缺口大。", "全民健身需求"],
    ["x_elders_bench", "仁寿县60岁及以上占26.56%，家庭亲子与学校师生集中，老年康养、儿童游乐、青少年运动需求突出。", "市场机遇人群"],
    ["x_cyclists", "《“健康中国2030”规划纲要》、七部委体育公园指导意见、仁寿县国土空间规划“公园城市”目标共同支持。", "政策导向优势"]];
  cards.forEach((c, i) => {
    const x = 0.55 + i * 2.3, bw = 2.15, bh = 2.75;
    const r = img(s, c[0], x, 1.62, bw, bh);
    rect(s, r.x, r.y + r.h * 0.4, r.w, 0.95, NAVY, { fill: { color: NAVY, transparency: 30 } });
    s.addText(c[1], { x: r.x + 0.06, y: r.y + r.h * 0.4, w: r.w - 0.12, h: 0.95, fontFace: F, fontSize: 7.5, color: WHITE, margin: 0, isTextBox: true, valign: "middle" });
    s.addText(c[2], { x, y: 4.42, w: bw, h: 0.32, fontFace: F, fontSize: 12, bold: true, color: GRAY, align: "center", margin: 0, isTextBox: true });
  });
  txt(s, "城市面临雨洪调蓄压力、人居环境品质参差不齐、不同年龄群体休闲游憩需求难以被充分满足等现实矛盾。在全民健康、公园城市政策背景下，集运动健康、全龄游憩于一体的体育型综合公园，成为化解高密度社区绿地不足、居民运动空间匮乏、道路环境干扰等多重问题的核心空间载体。", 0.5, 4.78, 9.15, 0.5, { fontSize: 8.5 });
}

// ---------- 1.1 政策导向 ----------
{
  const s = pres.addSlide();
  header(s, SEC1[0], "Topic Background", "1.1 选题背景——政策导向");
  const rows = [
    ["国家战略", "《“健康中国2030”规划纲要》", "健全城乡全民健身公共服务体系，完善社区体育配套设施"],
    ["规划标准", "《城市居住区规划设计标准》GB 50180-2018", "构建15分钟生活圈绿地系统，保障片区级综合公园落地"],
    ["生态导向", "《海绵城市建设技术指南》", "低影响开发，城市绿地兼顾生态缓冲、雨水调蓄、休闲游憩复合功能"],
    ["专项指导", "七部委《关于推进体育公园建设的指导意见》", "以体育健身为核心、与自然生态融合，绿化用地占比不低于65%"],
    ["地方规划", "《仁寿县国土空间总体规划(2021-2035)》", "城北新城“三生融合、公园城市”目标，完善居住区集中绿地布局"],
  ];
  rows.forEach((r, i) => {
    const y = 1.05 + i * 0.8;
    tag(s, r[0], 0.5, y + 0.12, 0.95, 0.42, i === 4 ? ORANGE : NAVY, 9.5);
    s.addText(r[1], { x: 1.6, y, w: 4.7, h: 0.32, fontFace: F, fontSize: 10.5, bold: true, color: GRAY, margin: 0, isTextBox: true, valign: "middle" });
    s.addText(r[2], { x: 1.6, y: y + 0.32, w: 4.7, h: 0.4, fontFace: F, fontSize: 9, color: MUTED, margin: 0, isTextBox: true, valign: "top" });
  });
  img(s, "x_bar", 6.6, 1.02, 1.45, 1.85);
  img(s, "x_tennis", 8.2, 1.02, 1.45, 1.85);
  img(s, "x_kites", 6.6, 3.05, 3.05, 1.75, "户外健身与社区绿地（示意照片）");
}

// ---------- 1.1 人口结构 ----------
{
  const s = pres.addSlide();
  header(s, SEC1[0], "Topic Background", "1.1 选题背景——人口结构与地方需求");
  s.addChart(pres.charts.BAR, [
    { name: "0-14岁", labels: ["全国", "四川省", "仁寿县"], values: [17.95, 16.1, 15.31] },
    { name: "15-59岁", labels: ["全国", "四川省", "仁寿县"], values: [63.35, 62.19, 58.13] },
    { name: "60岁及以上", labels: ["全国", "四川省", "仁寿县"], values: [18.7, 21.71, 26.56] },
  ], { x: 0.45, y: 1.0, w: 5.4, h: 3.5, barDir: "col", barGrouping: "clustered", chartColors: [GREEN, NAVY, ORANGE], showTitle: true, title: "第七次全国人口普查年龄构成对比（%）", titleFontFace: F, titleFontSize: 10, titleColor: GRAY, showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.0", dataLabelFontSize: 8, dataLabelFontFace: FE, catAxisLabelFontFace: F, catAxisLabelFontSize: 9, valAxisLabelFontSize: 8, valAxisLabelFontFace: FE, valGridLine: { color: "DDDDDD", size: 0.5 }, catGridLine: { style: "none" }, showLegend: true, legendPos: "b", legendFontFace: F, legendFontSize: 8, valAxisMaxVal: 70 });
  rect(s, 6.1, 1.0, 3.55, 1.25, LIGHT);
  label(s, "仁寿县人口特征（2020年七普）", 6.25, 1.03, 3.3, 0.26, 10);
  txt(s, "常住人口111.0万人。60岁及以上占26.56%，65岁及以上占21.94%，分别高于全国7.86和8.44个百分点，已进入深度老龄化；0-14岁占15.31%。老年康养与亲子游憩需求突出。", 6.2, 1.28, 3.4, 0.95, { fontSize: 8 });
  rect(s, 6.1, 2.35, 3.55, 1.25, LIGHT);
  label(s, "城北新城现状问题", 6.25, 2.38, 3.3, 0.26, 10);
  txt(s, "成德眉资同城化片区，仁寿向北拓展核心宜居板块；大量商品住宅集中落地，居住密度持续提升。配套逐步完善，但集中型公共休闲绿地供给严重不足，缺少服务全龄、兼具生态运动休闲社交功能的综合公园。", 6.2, 2.63, 3.4, 0.95, { fontSize: 8 });
  img(s, "site_1", 6.1, 3.7, 1.72, 1.1);
  img(s, "site_3", 7.93, 3.7, 1.72, 1.1, "");
  txt(s, "城北新城场地周边现状", 6.1, 4.72, 3.55, 0.2, { fontSize: 7.5, color: MUTED, align: "center" });
  txt(s, "数据来源：国家统计局《第七次全国人口普查公报（第五号）》；四川省统计局《四川省第七次全国人口普查公报（第四号）》；仁寿县人民政府《仁寿县第七次全国人口普查公报（第三号）》。", 0.5, 4.6, 5.4, 0.55, { fontSize: 7, color: MUTED });
}

// ---------- 1.2 研究目的 ----------
{
  const s = pres.addSlide();
  header(s, SEC1[0], "Research Purpose", "1.2 研究目的");
  const items = [
    ["x_kites", "营造适配全龄人群的多元运动游憩空间", "全龄游憩", "立足全民健康发展背景，针对仁寿城北新城居住区户外健身场地不足的现实问题，结合场地现状条件，打造融合生态缓冲、运动健身、亲子游乐、邻里社交、乡土科普功能的公园空间，满足周边不同年龄居民日常健身休闲与社交活动需求。"],
    ["x_lake", "形成多目标统筹的可落地综合规划方案", "综合规划", "统筹城市主干道噪声防护、全龄活动场地布置、海绵雨水调蓄、乡土植物群落营造四大核心功能，形成兼顾生态效益、民生需求、建设成本的可落地方案；以城北新城8.6公顷闲置绿地为实践载体，为川南同类新建居住区集中绿地、体育公园建设提供参考案例。"],
    ["x_alp", "探索适用于西南城市的体育公园景观营造方法", "地域营造", "结合西南地区丘陵地貌、亚热带气候特征以及山地城市建设特点，充分运用乡土植物、海绵设施与低维护景观材料，构建适应性强、易管理、生态效益显著的运动景观环境，探索适合西南山地城市体育公园建设的景观营造思路。"],
  ];
  items.forEach((it, i) => {
    const x = 0.5 + i * 3.1;
    photoCard(s, it[0], x, 1.02, 2.95, 2.0, it[1], null, [NAVY, ORANGE, GREEN][i], { bold: true, fontSize: 9, bandPos: "bottom", bandH: 0.6, alpha: 25 });
    circleNum(s, i + 1, x + 0.1, 3.15, 0.36);
    s.addText(it[2], { x: x + 0.55, y: 3.15, w: 2.3, h: 0.36, fontFace: F, fontSize: 11, bold: true, color: NAVY, margin: 0, isTextBox: true, valign: "middle" });
    rect(s, x, 3.6, 2.95, 1.6, LIGHT);
    txt(s, it[3], x + 0.08, 3.65, 2.8, 1.5, { fontSize: 8.5 });
  });
}

// ---------- 1.3 研究意义 ----------
{
  const s = pres.addSlide();
  header(s, SEC1[0], "Research Significance", "1.3 研究意义");
  const box = (t, en, x, y) => {
    rect(s, x, y, 2.35, 0.55, "E6E8DF");
    s.addText([{ text: t, options: { fontSize: 12, bold: true, color: GRAY, breakLine: true } }, { text: en, options: { fontSize: 7, color: MUTED, fontFace: FE } }], { x, y, w: 2.35, h: 0.55, fontFace: F, align: "center", valign: "middle", margin: 0, isTextBox: true });
  };
  [["“全民健身”", "Fitness for all"], ["“全龄友好”", "All-age friendly"], ["“生态缓冲”", "Ecological buffer"]].forEach((b, i) => box(b[0], b[1], 0.5, 1.0 + i * 0.68));
  [["“老年康养”", "Health care for the aged"], ["“亲子游憩”", "Family recreation"], ["“邻里社交”", "Neighborhood interaction"]].forEach((b, i) => box(b[0], b[1], 7.3, 1.0 + i * 0.68));
  s.addText("第一阶段：补齐城北新城运动绿地缺口", { x: 3.0, y: 1.05, w: 4.15, h: 0.6, fontFace: F, fontSize: 14, bold: true, color: GRAY, align: "center", valign: "middle", margin: 0, isTextBox: true });
  s.addText("第二阶段：全龄健身·康养·社交融合", { x: 3.0, y: 2.35, w: 4.15, h: 0.6, fontFace: F, fontSize: 14, bold: true, color: GRAY, align: "center", valign: "middle", margin: 0, isTextBox: true });
  s.addShape(pres.shapes.LINE, { x: 3.4, y: 2.0, w: 3.35, h: 0, line: { color: LINE, width: 0.75, dashType: "dash" } });
  img(s, "x_people_band", 0.5, 3.05, 9.15, 1.7);
  txt(s, "随着国家发展和社会进步，健康观念已深入人心，要让居民认识到体育公园的重要性并积极走入公园运动。理论上，本研究丰富川南县域新城高密度居住区体育公园设计研究；实践上，城市层面盘活闲置绿地、补齐城北新城体育设施短板，民生层面满足全龄康养、游乐、运动、社交需求，生态层面削弱主干道噪声粉尘、缓解热岛效应，实现全民健康是本次设计的主要意义。", 0.5, 4.78, 9.15, 0.5, { fontSize: 8.5 });
}

// ---------- 1.4 技术路线 ----------
{
  const s = pres.addSlide();
  header(s, SEC1[0], "Technical Route and Methods", "1.4 技术路线与研究方法");
  s.addImage({ path: FIG("route"), x: 0.45, y: 0.98, w: 4.05, h: 4.28 });
  label(s, "研究方法", 4.85, 1.0, 3, 0.3, 12);
  const m = [["文献查阅法", "检索知网、万方等，研读《公园设计规范》《居住区规划设计标准》及全龄景观专著"],
    ["实地调研法", "现场踏勘地形、道路、住宅分布、植被；走访小区观察居民户外行为"],
    ["问卷调查法", "面向老人、家长、青少年发放问卷，统计场地、设施、风格需求偏好"],
    ["案例分析法", "收集西南地区居住区综合公园案例，对比布局、分区、植物配置"],
    ["图解分析法", "CAD、GIS完成区位、交通、人流、日照、用地分析，推导总平面"]];
  m.forEach((r, i) => {
    const y = 1.4 + i * 0.76;
    rect(s, 4.85, y, 4.8, 0.66, i % 2 ? PALE : LIGHT);
    tag(s, r[0], 4.95, y + 0.14, 1.05, 0.38, NAVY, 9.5);
    txt(s, r[1], 6.1, y + 0.05, 3.5, 0.6, { fontSize: 8.5, valign: "middle" });
  });
  txt(s, "技术路线：提出问题—理论支撑—分析方案—解决问题—总结问题", 4.85, 5.2, 4.8, 0.25, { fontSize: 8, color: MUTED });
}

// ---------- 1.5 相关概念 ----------
{
  const s = pres.addSlide();
  header(s, SEC1[0], "Key Concepts", "1.5 相关概念");
  const c = [["x_basketball", "体育公园", "Sports Park", ["体育健身为核心", "与自然生态融合", "绿化占比不低于65%"], "依据七部委《关于推进体育公园建设的指导意见》：以体育健身为核心要素、与自然生态融合的城市绿色公共空间，兼具生态美化、全民健身、休闲游憩、防灾避险等功能。社区型综合体育公园依托城市集中绿地建设，面向周边成片居住区开放。", NAVY],
    ["x_exercise", "全民健康视角", "Health for All", ["人人可运动", "处处能休憩", "动静分区"], "以全民健康为核心导向，将全民健身理念融入公园整体空间设计，兼顾婴幼儿、学龄儿童、中青年、老年人、残障群体的生理运动需求；在场地尺度、运动设施、无障碍通行、休憩配套上分层适配。", ORANGE],
    ["x_swing", "全龄友好型景观", "All-age Friendly", ["分区适配", "无障碍通行", "安全防护"], "在公园空间布局、设施配置、尺度设计上兼顾不同人群生理与行为需求，分区设置适配活动场地，完善无障碍通行、休憩、安全防护配套，实现一座公园满足全年龄段居民日常户外需求。", GREEN]];
  c.forEach((it, i) => {
    const x = 0.5 + i * 3.1, w = 2.95;
    const r = img(s, it[0], x, 1.02, w, 1.7);
    rect(s, r.x, r.y + r.h - 0.62, r.w, 0.62, it[5], { fill: { color: it[5], transparency: 20 } });
    s.addText([{ text: it[1], options: { fontSize: 12, bold: true, breakLine: true } }, { text: it[2], options: { fontSize: 7.5, fontFace: FE } }], { x: r.x + 0.1, y: r.y + r.h - 0.62, w: r.w - 0.2, h: 0.62, fontFace: F, color: WHITE, margin: 0, isTextBox: true, valign: "middle" });
    it[3].forEach((k, j) => { const kx = x + j * (w / 3); rect(s, kx + 0.03, 2.82, w / 3 - 0.06, 0.4, "E6E8DF"); s.addText(k, { x: kx + 0.03, y: 2.82, w: w / 3 - 0.06, h: 0.4, fontFace: F, fontSize: 7.5, bold: true, color: GRAY, align: "center", valign: "middle", margin: 0, isTextBox: true }); });
    rect(s, x, 3.32, w, 1.85, LIGHT);
    txt(s, it[4], x + 0.08, 3.38, w - 0.16, 1.75, { fontSize: 8.5 });
  });
}

// ---------- 1.6 研究现状 ----------
{
  const s = pres.addSlide();
  header(s, SEC1[0], "Research Status", "1.6 国内外研究现状");
  tag(s, "国外", 0.5, 1.02, 0.8, 0.3, NAVY, 10);
  bullets(s, ["奥姆斯特德城市公园体系提出“绿地+运动”融合模式；简·雅各布斯强调高密度社区分散布局中小型运动场地",
    "德国分级体育绿地规划；法国社区体育公园24小时开放与智能预约；丹麦、温哥华连续健身绿道网络",
    "日本居住区体育公园分龄分区、全域无障碍、低维护乡土绿化与简易雨水调蓄；新加坡Active SG社区体育公园：模块化球类场地、全天候遮阳健身区、多层次林下空间",
    "研究热点：体育公园可达性与配套对全年龄段日常运动量、慢性病与焦虑发生率的正向影响（Kaczynski et al., 2008；Warburton et al., 2006；WHO, 2022）"], 0.5, 1.38, 4.45, 2.2, 8.5);
  tag(s, "国内", 5.2, 1.02, 0.8, 0.3, ORANGE, 10);
  bullets(s, ["全民健身与15分钟社区生活圈推进下，体育公园成为风景园林热点方向",
    "规范出台：《公园设计规范》GB 51192-2016、《社区体育公园规划建设指南》T/CSUS 18-2021",
    "成渝西南片区实践：浅丘地貌土方优化、乡土植物应用、海绵设施整合、动静分区",
    "现有研究多聚焦大中型城市综合体育公园，面向县域新城尺度、服务高密度居住区的中小型体育公园研究薄弱，缺乏适配县域人群结构、建设投资条件的成熟设计范式——本研究的探索空间"], 5.2, 1.38, 4.45, 2.2, 8.5);
  img(s, "x_volleyball", 0.5, 3.45, 2.2, 1.5, "全天候室内运动空间");
  img(s, "x_skatepark", 2.82, 3.45, 2.2, 1.5, "青少年极限运动");
  img(s, "x_cyclists", 5.14, 3.45, 2.2, 1.5, "连续健身绿道与骑行");
  img(s, "x_bench", 7.46, 3.45, 2.2, 1.5, "林下休憩与滨水空间");
}

// ---------- 1.6 发展脉络 ----------
{
  const s = pres.addSlide();
  header(s, SEC1[0], "Historical Development", "1.6 国内外研究现状——发展脉络");
  const P0 = [0.6, 4.0], P1 = [9.4, 2.3];
  const dx = P1[0] - P0[0], dy = P1[1] - P0[1];
  const len = Math.sqrt(dx * dx + dy * dy), ang = Math.atan2(dy, dx) * 180 / Math.PI;
  const cx = (P0[0] + P1[0]) / 2, cy = (P0[1] + P1[1]) / 2;
  rect(s, cx - len / 2, cy - 0.11, len, 0.22, "C9D6C1", { rotate: 360 + ang });
  rect(s, cx - len / 2, cy - 0.03, len, 0.06, "4E6B3A", { rotate: 360 + ang });
  const pt = (t) => [P0[0] + dx * t, P0[1] + dy * t];
  [["萌芽期", 0.11], ["发展期", 0.5], ["创新成熟期", 0.88]].forEach((pl) => { const [x, y] = pt(pl[1]); s.addText(pl[0], { x: x - 0.7, y: y - 0.48, w: 1.4, h: 0.3, fontFace: F, fontSize: 9, bold: true, color: "4E6B3A", align: "center", rotate: 360 + ang, margin: 0, isTextBox: true }); });
  const nodes = [
    { t: 0.04, yr: "1858", place: "美国", txt: "奥姆斯特德中央公园，提出“绿地+运动”融合模式", up: true, ph: "x_bench" },
    { t: 0.17, yr: "1961", place: "美国", txt: "简·雅各布斯：高密度社区分散布局中小型运动场地", up: false, ph: "x_plaza" },
    { t: 0.30, yr: "1995", place: "中国", txt: "《全民健身计划纲要》颁布，全民健身上升为国家计划", up: true, ph: "x_bar" },
    { t: 0.43, yr: "2014", place: "新加坡", txt: "ActiveSG计划：模块化球场、全天候遮阳健身区", up: false, ph: "x_basketball" },
    { t: 0.56, yr: "2016", place: "中国", txt: "《“健康中国2030”规划纲要》；《公园设计规范》GB 51192-2016", up: true, ph: "x_tennis" },
    { t: 0.69, yr: "2018", place: "中国", txt: "《城市居住区规划设计标准》GB 50180-2018：15分钟生活圈", up: false, ph: "x_kites" },
    { t: 0.82, yr: "2021", place: "中国", txt: "七部委《关于推进体育公园建设的指导意见》；T/CSUS 18-2021", up: true, ph: "wh_2" },
    { t: 0.95, yr: "2021", place: "仁寿", txt: "《仁寿县国土空间总体规划(2021-2035)》：城北新城公园城市", up: false, ph: "satellite" },
  ];
  nodes.forEach((n) => {
    const [x, y] = pt(n.t);
    const foreign = n.place === "美国" || n.place === "新加坡", col = foreign ? NAVY : ORANGE;
    s.addShape(pres.shapes.OVAL, { x: x - 0.08, y: y - 0.08, w: 0.16, h: 0.16, fill: { color: col }, line: { color: WHITE, width: 1 } });
    s.addText(n.yr, { x: x - 0.5, y: n.up ? y + 0.1 : y - 0.36, w: 1.0, h: 0.26, fontFace: FE, fontSize: 9, bold: true, color: col, align: "center", margin: 0, isTextBox: true });
    const cw = n.t > 0.9 ? 1.5 : 1.78, ch = 1.2, x0 = Math.min(Math.max(x - cw / 2, 0.45), 9.65 - cw);
    const y0 = n.up ? y - 0.28 - ch : y + 0.28;
    s.addShape(pres.shapes.LINE, { x, y: n.up ? y0 + ch : y, w: 0, h: 0.28, line: { color: col, width: 1, dashType: "dash" } });
    rect(s, x0, y0, cw, ch, LIGHT);
    img(s, n.ph, x0 + 0.05, y0 + 0.05, cw - 0.1, 0.62);
    s.addText([{ text: n.place + " ", options: { bold: true, color: col } }, { text: n.txt, options: { color: GRAY } }], { x: x0 + 0.05, y: y0 + 0.69, w: cw - 0.1, h: 0.5, fontFace: F, fontSize: 6.5, margin: 0, isTextBox: true, valign: "top", lineSpacingMultiple: 1.05 });
  });
  txt(s, "蓝色：国外；橙色：国内与地方。配图为公开图库示意照片、本文案例照片及场地卫星影像。", 0.5, 5.3, 7, 0.25, { fontSize: 7, color: MUTED });
}

// ---------- 1.7 案例参考（4页） ----------
function caseSlide(no, name, big, smalls, intro, lessons) {
  const s = pres.addSlide();
  header(s, SEC1[0], "Case Study", `1.7 案例参考（${no}）${name}`);
  img(s, big[0], 0.5, 1.02, 4.5, 2.7, big[1]);
  const n = smalls.length, gap = 0.1, w = (4.5 - gap * (n - 1)) / n;
  smalls.forEach((sm, i) => img(s, sm[0], 0.5 + i * (w + gap), 4.02, w, 0.95, sm[1]));
  label(s, "项目简介", 5.25, 1.02, 3, 0.3, 11);
  txt(s, intro, 5.2, 1.32, 4.45, 1.9, { fontSize: 9 });
  tag(s, "可借鉴", 5.25, 3.3, 0.9, 0.3, ORANGE, 9.5);
  bullets(s, lessons, 5.2, 3.65, 4.45, 1.5, 9);
}
caseSlide("一", "成都天府公园西区", ["tf_5", "建筑鸟瞰图"], [["tf_1", "公园河流"], ["tf_2", "河流植物"], ["tf_3", "道路小品"], ["tf_4", "公园周围交通状况"]],
  "项目位于天府新区高密度住宅组团之间，用地7.2公顷，服务周边20余个居住小区。设计采用“一轴多组团”布局，沿城市主干道设置宽幅生态林带降噪；内部划分老年康养区、儿童分龄游乐区、青少年运动区、自然科普区；大量采用香樟、桢楠、细叶桢楠等四川乡土树种，搭配下凹式雨水花园实现海绵功能。",
  ["主干道连续多层生态缓冲林带布局", "全龄分段运动场地划分模式", "多层乡土植物复层群落配置手法"]);
caseSlide("二", "成都天府牧山活力体育公园", ["ms_2", "公园总平面鸟瞰图"], [["ms_1", "球类集中区效果图"], ["ms_3", "室内运动场地"], ["ms_4", "阳光草坪区"]],
  "位于成都市新津区花源街道，地处新城成片居住组团核心腹地，占地6.39公顷，为城市规划留白绿地全新营建，区位、平缓场地基底与本课题仁寿8.6公顷地块高度匹配。采用“一轴一环五组团”结构，外围彩色环形健康步道串联轻量化户外运动场地，内部划分青少年潮流运动区、分龄儿童游乐区、老年康养林荫区、共享阳光草坪、乡土海绵花境；北侧紧邻主干道设置多层乡土乔木降噪防护林，四面分设人行出入口，造价适配川南县域建设标准。",
  ["县域留白绿地体育公园整体规划模式，“跃动健身+生态栖居”一体化", "依托日照条件分区布局全龄活动场地", "主干道多层乡土植物降噪隔离林带", "轻量化设施适配县城低成本落地"]);
caseSlide("三", "苏州相城活力体育公园", ["sz_2", "公园周围交通情况"], [["sz_1", "极限运动区"], ["sz_3", "儿童娱乐区域"], ["sz_4", "植物小品"]],
  "城市新区规划绿地全新建设，总面积13.6公顷，面积接近本设计地块，场地有平缓台地与低洼地块。依托地势打造海绵水景，步道串联运动场地与林下休憩空间，主干道沿线设置连续绿化隔离带，形成“动可健身，静可栖林”的格局。每一处球类、游乐运动组团就近配套林下廊架、休闲平台；海绵调蓄空间与林下栖居景观一体化设计，四季分层乡土乔灌搭配，高度契合“跃动·栖园”设计主题。",
  ["海绵雨水景观与林下休憩空间融合", "每个运动组团就近配套便民栖居节点", "连续式主干道降噪隔离林带", "多点分散休憩构筑物，多层次林下栖居场景"]);
caseSlide("四", "芜湖长江三桥桥下体育公园", ["wh_2", "周围交通情况"], [["wh_1", "公园跑道（桥下全天候运动空间）"]],
  "总用地15.5公顷，利用高架桥下闲置灰色空间改造而成，场地天然形成大面积遮阳区域，配套4片篮球场、2片五人制足球场、羽毛球场、门球、轮滑场地与多处老年健身路径、分龄儿童乐园，贯穿彩色透水健身环线，搭配沿线雨水花园，服务周边7个大型社区居民。依托桥体天然遮阴打造全天候运动空间，全场采用彩色透水塑胶铺装，搭配线性生态植草沟构建简易海绵体系；运动场地模块化划分，人群互不干扰。",
  ["全天候遮阳运动场地设计思路，适配仁寿夏季高温", "模块化球类场地集约布局", "透水铺装+植草沟一体化海绵做法", "全年龄段运动设施均衡配置"]);

// ---------- 02 章节 ----------
sectionSlide("02", "项目研究概述", SEC2[1], ["2.1 上位规划", "2.2 区位分析", "2.3 气候分析", "2.4 植物分析", "2.5 历史文化分析", "2.6 周边道路分析", "2.7 周边交通分析", "2.8 周边人行流线分析", "2.9 周边用地分析", "2.10 地形地貌分析", "2.11 场地现状分析", "2.12 人群结构分析", "2.13 主要人群需求分析", "2.14 光照分析", "2.15 SWOT分析", "2.16 问题梳理"], ["satellite", "site_2", "site_4"]);

// ---------- 2.1 上位规划 ----------
{
  const s = pres.addSlide();
  header(s, SEC2[0], "Upper-level Planning", "2.1 上位规划");
  img(s, "map", 0.5, 1.02, 2.3, 4.0, "场地及周边现状地图");
  label(s, "规划要点", 3.1, 1.02, 3, 0.3, 11);
  const pts = [["城北新城定位", "仁寿向北拓展核心宜居板块，衔接成德眉资同城化片区"], ["建设目标", "三生融合辐射周边、公园城市"], ["绿地要求", "完善居住区集中绿地布局，补齐城市绿色公共空间短板"], ["本地块", "规划预留集中绿地，承担片区级综合公园功能，服务周边高密度居住区"]];
  pts.forEach((p, i) => {
    const y = 1.4 + i * 0.9;
    circleNum(s, i + 1, 3.1, y + 0.05, 0.36, i === 3 ? ORANGE : NAVY);
    s.addText(p[0], { x: 3.55, y, w: 2.6, h: 0.28, fontFace: F, fontSize: 10, bold: true, color: GRAY, margin: 0, isTextBox: true, valign: "middle" });
    txt(s, p[1], 3.5, y + 0.28, 2.75, 0.6, { fontSize: 8.5 });
  });
  img(s, "satellite", 6.4, 1.02, 3.25, 2.4, "场地卫星影像（规划预留集中绿地）");
  rect(s, 6.4, 3.75, 3.25, 1.45, LIGHT);
  txt(s, "《仁寿县国土空间总体规划(2021-2035)》明确城北新城“三生融合辐射周边、公园城市”建设目标，要求完善居住区集中绿地布局，补齐城市绿色公共空间短板。本地块为规划预留的集中绿地，承担片区级综合公园功能。", 6.45, 3.8, 3.15, 1.38, { fontSize: 8 });
}

// ---------- 2.2 区位 ----------
{
  const s = pres.addSlide();
  header(s, SEC2[0], "Location Analysis", "2.2 区位分析");
  img(s, "location", 0.5, 1.02, 2.95, 4.0, "区位分析图（中国—四川—眉山—仁寿）");
  label(s, "场地概括", 3.75, 1.02, 3, 0.3, 11);
  const rows = [["场地位置", "眉山市仁寿县城北新城核心居住区"], ["场地面积", "约8.6公顷"], ["北侧", "普宁大道（城市主干道，车流量大）"], ["南侧", "里仁路（城市支路）"], ["东侧", "黑龙滩路（次干道）"], ["西侧", "青冈路 / 陵州大道"], ["用地性质", "政府规划预留集中绿地"]];
  s.addTable(rows.map((r, i) => [
    { text: r[0], options: { bold: true, color: WHITE, fill: { color: NAVY }, fontFace: F, fontSize: 9, align: "center", valign: "middle" } },
    { text: r[1], options: { color: GRAY, fill: { color: i % 2 ? PALE : LIGHT }, fontFace: F, fontSize: 9, valign: "middle" } }]),
    { x: 3.75, y: 1.4, w: 5.9, colW: [1.3, 4.6], rowH: 0.42, border: { type: "solid", color: WHITE, pt: 1 } });
  txt(s, "场地四至边界清晰：北侧为城市主干道普宁大道，车流量大，存在噪声、粉尘干扰；南侧里仁路、东侧黑龙滩路、西侧道路均为城市次级道路，人行通达性良好。", 3.75, 4.45, 5.9, 0.5, { fontSize: 8.5 });
  txt(s, "注：开题报告中西侧道路名称出现“青冈路”与“陵州大道”两种表述，需统一。", 3.75, 4.98, 5.9, 0.22, { fontSize: 7, color: MUTED });
}

// ---------- 2.3 气候（两页） ----------
const MON = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
{
  const s = pres.addSlide();
  header(s, SEC2[0], "Climate Analysis", "2.3 气候分析——气温与降水");
  img(s, "clim_temp", 0.5, 1.02, 4.55, 2.5, "仁寿县气温分析（开题报告）");
  img(s, "clim_rain", 5.1, 1.02, 4.55, 2.5, "仁寿县降水率分析（开题报告）");
  s.addText([{ text: "年均温 17.8℃", options: { bold: true, color: ORANGE, fontSize: 12, breakLine: true } }, { text: "1月 7.0℃ / 7月 26.8℃", options: { fontSize: 8.5 } }], { x: 0.5, y: 3.62, w: 2.2, h: 0.55, fontFace: F, color: GRAY, margin: 0, isTextBox: true, valign: "middle", align: "center" });
  s.addText([{ text: "年降水 881.8mm", options: { bold: true, color: NAVY, fontSize: 12, breakLine: true } }, { text: "6—9月占70%以上，8月最多", options: { fontSize: 8.5 } }], { x: 2.8, y: 3.62, w: 2.3, h: 0.55, fontFace: F, color: GRAY, margin: 0, isTextBox: true, valign: "middle", align: "center" });
  s.addText([{ text: "雨热同季", options: { bold: true, color: GREEN, fontSize: 12, breakLine: true } }, { text: "夏季高温多雨，冬季温和少霜", options: { fontSize: 8.5 } }], { x: 5.2, y: 3.62, w: 2.2, h: 0.55, fontFace: F, color: GRAY, margin: 0, isTextBox: true, valign: "middle", align: "center" });
  s.addText([{ text: "亚热带湿润季风", options: { bold: true, color: ORANGE, fontSize: 12, breakLine: true } }, { text: "四季分明，雨量充沛", options: { fontSize: 8.5 } }], { x: 7.45, y: 3.62, w: 2.2, h: 0.55, fontFace: F, color: GRAY, margin: 0, isTextBox: true, valign: "middle", align: "center" });
  rect(s, 0.5, 4.2, 9.15, 0.85, LIGHT);
  txt(s, "亚热带湿润季风气候，四季分明，雨热同季。年均温17.8℃，1月最冷（7.0℃），7月最热（26.8℃）；年降水881.8mm，集中于6—9月（占70%以上），8月最多。设计需重点应对夏季高温暴晒（乔木林荫、遮阳构筑）与夏季集中降雨（海绵调蓄、场地排水）。", 0.6, 4.25, 8.95, 0.8, { fontSize: 9 });
  txt(s, "数据来源：中国气象局1991—2020年气候标准值（仁寿站）。开题报告写为年均温17.2℃，与此处17.8℃口径不同，建议统一。", 0.5, 5.08, 8.5, 0.22, { fontSize: 7, color: MUTED });
}
{
  const s = pres.addSlide();
  header(s, SEC2[0], "Climate Analysis", "2.3 气候分析——日照、湿度与雨日");
  s.addChart(pres.charts.BAR, [{ name: "日照时数", labels: MON, values: [42.4, 53.8, 92.3, 126.5, 126.1, 109.4, 133.6, 142.6, 74.6, 51.0, 55.0, 40.3] }],
    { x: 0.45, y: 1.0, w: 4.55, h: 3.1, barDir: "col", chartColors: [ORANGE], showTitle: true, title: "各月日照时数（h）", titleFontFace: F, titleFontSize: 10, titleColor: GRAY, showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 7, catAxisTitle: "月份", showCatAxisTitle: true, catAxisTitleFontFace: F, catAxisTitleFontSize: 8, catAxisLabelFontSize: 8, valAxisLabelFontSize: 8, valGridLine: { color: "DDDDDD", size: 0.5 }, catGridLine: { style: "none" }, showLegend: false });
  s.addChart(pres.charts.LINE, [
    { name: "相对湿度（%）", labels: MON, values: [77, 74, 70, 69, 67, 75, 78, 77, 80, 81, 78, 78] },
    { name: "降水日数（d）", labels: MON, values: [7.8, 7.8, 10.0, 12.1, 13.2, 14.5, 14.6, 13.8, 14.7, 14.1, 7.4, 7.0] },
  ], { x: 5.1, y: 1.0, w: 4.55, h: 3.1, chartColors: [NAVY, GREEN], lineSize: 2, lineDataSymbolSize: 5, showTitle: true, title: "各月相对湿度与降水日数", titleFontFace: F, titleFontSize: 10, titleColor: GRAY, showValue: true, dataLabelFontSize: 7, dataLabelPosition: "t", catAxisTitle: "月份", showCatAxisTitle: true, catAxisTitleFontFace: F, catAxisTitleFontSize: 8, catAxisLabelFontSize: 8, valAxisLabelFontSize: 8, valGridLine: { color: "DDDDDD", size: 0.5 }, catGridLine: { style: "none" }, showLegend: true, legendPos: "b", legendFontFace: F, legendFontSize: 8 });
  rect(s, 0.5, 4.2, 9.15, 0.85, LIGHT);
  txt(s, "年日照仅1047.6小时（日照百分率23%），冬季多雾寡照；全年湿度70%—81%，秋季最高。全年降水日137天，4—10月每月13天以上。启示：夏季需遮阳，但全年整体阴湿，场地应以开敞向阳草坪和运动场地为主体，配合可透光的疏林，避免过度郁闭；铺装选用透水、防滑材料。", 0.6, 4.25, 8.95, 0.8, { fontSize: 9 });
  txt(s, "数据来源：中国气象局1991—2020年气候标准值（仁寿站）。", 0.5, 5.08, 8.5, 0.22, { fontSize: 7, color: MUTED });
}

// ---------- 2.4 植物 ----------
{
  const s = pres.addSlide();
  header(s, SEC2[0], "Plant Analysis", "2.4 植物分析");
  img(s, "plants", 0.5, 1.02, 6.05, 3.32, "仁寿县植物配置分析图");
  const groups = [["优势乔木", "桢楠、香樟、黄葛树、二球悬铃木、桂花、小叶榕", GREEN], ["花灌木", "紫薇、木芙蓉、蜡梅、红花檵木", ORANGE], ["地被", "麦冬、沿阶草、野花组合", NAVY]];
  groups.forEach((g, i) => {
    const y = 1.02 + i * 0.95;
    tag(s, g[0], 6.8, y, 0.95, 0.32, g[2], 9.5);
    txt(s, g[1], 6.75, y + 0.34, 2.9, 0.55, { fontSize: 9 });
  });
  rect(s, 6.8, 3.85, 2.85, 1.3, LIGHT);
  label(s, "气候适生性", 6.9, 3.88, 2.7, 0.26, 9.5);
  txt(s, "亚热带湿润季风气候，冬季温和少霜，适宜桢楠、香樟、小叶榕、紫薇、木芙蓉等川南乡土常绿与观花植物生长，均耐粗放养护，为本项目植物配置核心选材。", 6.85, 4.14, 2.75, 1.0, { fontSize: 8 });
  rect(s, 0.5, 4.62, 6.05, 0.58, LIGHT);
  txt(s, "配置策略：北侧沿普宁大道以桢楠、香樟、黄葛树构建多层降噪防护林带；运动场地周边以高大乔木形成连片林荫休憩；低洼区结合雨水花园配置耐湿地被；四季分层乡土乔灌搭配，实现全年可游。", 0.58, 4.64, 5.9, 0.55, { fontSize: 8.5 });
}

// ---------- 2.5 历史文化 ----------
{
  const s = pres.addSlide();
  header(s, SEC2[0], "Historical and Cultural Analysis", "2.5 历史文化分析");
  img(s, "culture", 0.5, 1.02, 4.6, 3.45, "仁寿历史文化分析图");
  const c = [["陵州人文历史文化", "自隋代置陵州，唐宋文风兴盛，留存古陵城街巷、文庙、书院历史脉络，崇文重教是本土精神内核。", NAVY],
    ["黑龙滩水利建设文化", "20世纪70年代十万群众开山筑库建成西南大型人工湖黑龙滩，孕育艰苦奋斗、治水兴农的时代记忆。", ORANGE],
    ["川南浅丘农耕民俗文化", "水田农耕、果林种植、民俗节庆构成居民生活底色，田园乡土气息浓厚。", GREEN]];
  c.forEach((it, i) => {
    const y = 1.02 + i * 1.18;
    rect(s, 5.35, y, 4.3, 1.08, LIGHT);
    rect(s, 5.35, y, 0.08, 1.08, it[2]);
    s.addText(it[0], { x: 5.55, y: y + 0.05, w: 4.0, h: 0.28, fontFace: F, fontSize: 10, bold: true, color: it[2], margin: 0, isTextBox: true, valign: "middle" });
    txt(s, it[1], 5.5, y + 0.33, 4.1, 0.72, { fontSize: 8.5 });
  });
  txt(s, "场地片区文化基底：城北新城以新建商品房为主，缺少历史建筑与文化景观载体；周边居民多为老城搬迁居民和本地农村进城住户，对黑龙滩水利记忆、陵州文脉、农耕田园有深厚情感共鸣。场地作为片区唯一大型集中绿地，通过轻量化景观载体植入文化符号，弥补新城文化空间缺失。", 0.5, 4.72, 9.15, 0.55, { fontSize: 8.5 });
}

// ---------- 2.6 道路 ----------
{
  const s = pres.addSlide();
  header(s, SEC2[0], "Peripheral Road Analysis", "2.6 周边道路分析");
  img(s, "roads", 0.5, 1.02, 4.2, 1.95, "场地周边道路分析图");
  img(s, "roadcond", 0.5, 3.25, 4.2, 1.95, "场地周边路况分析图");
  const rows = [["方位", "道路", "等级", "影响"], ["北", "普宁大道", "城市主干道", "车流大，噪声粉尘干扰，需防护林带"], ["西", "陵州大道 / 青冈路", "次干道", "车行出入优先"], ["东", "黑龙滩路", "次干道", "人行通达性好"], ["南", "里仁路", "城市支路", "慢行辅助出入口"]];
  s.addTable(rows.map((r, i) => r.map((c) => ({ text: c, options: { fontFace: F, fontSize: 8.5, color: i === 0 ? WHITE : GRAY, bold: i === 0, fill: { color: i === 0 ? NAVY : (i % 2 ? LIGHT : PALE) }, valign: "middle", align: "center" } }))),
    { x: 4.95, y: 1.02, w: 4.7, colW: [0.55, 1.35, 1.0, 1.8], rowH: 0.42, border: { type: "solid", color: WHITE, pt: 1 } });
  rect(s, 4.95, 3.35, 4.7, 1.85, LIGHT);
  txt(s, "路网层级完善，涵盖主干道、次干道、支路，四面临路。临近天府仁寿大道，属城区发展重点板块，道路路面宽敞，沿线绿化配套完善。平峰时段通行顺畅，节假日休闲客流上升，依托方格路网可有效疏解。", 5.05, 3.42, 4.5, 1.7, { fontSize: 9, lineSpacingMultiple: 1.3 });
}

// ---------- 2.7 交通 ----------
{
  const s = pres.addSlide();
  header(s, SEC2[0], "Peripheral Traffic Analysis", "2.7 周边交通分析");
  img(s, "traffic", 0.5, 1.02, 5.7, 2.85, "场地周边交通分析图");
  const c = [["公共交通", "场地周围分布多处公交停靠点，覆盖多条城区公交线路，具备基础公共交通条件，但近距离公交接驳仍有提升空间。", NAVY], ["机动车交通", "地块被主次干道合围，车行条件良好。车行出入优先考虑西侧、北侧道路开口。", ORANGE], ["慢行交通", "南侧里仁路为城市支路，作为慢行辅助出入口；四面设人行入口，居民下楼直达。", GREEN]];
  c.forEach((it, i) => {
    const y = 1.02 + i * 1.4;
    rect(s, 6.45, y, 3.2, 1.28, LIGHT);
    tag(s, it[0], 6.55, y + 0.1, 1.0, 0.3, it[2], 9);
    txt(s, it[1], 6.5, y + 0.42, 3.1, 0.85, { fontSize: 8.5 });
  });
  img(s, "site_2", 0.5, 4.12, 2.8, 1.05);
  img(s, "site_3", 3.4, 4.12, 2.8, 1.05);
  txt(s, "场地周边道路现状照片", 0.5, 5.18, 5.7, 0.2, { fontSize: 7.5, color: MUTED, align: "center" });
}

// ---------- 2.8 人行流线 ----------
{
  const s = pres.addSlide();
  header(s, SEC2[0], "Pedestrian Flow Analysis", "2.8 周边人行流线分析");
  img(s, "flow", 0.5, 1.02, 5.7, 2.82, "周边人行流线分析图（蓝：居民聚集点；红：进入聚集点）");
  bullets(s, ["场地被居住区环绕，紧邻星光幼儿园、文镇小学、文镇幼儿园、仁寿实验中学，人流量大", "主要人流来源：东西两侧小区（最强）、南北两侧小区、四所学校（上下学潮汐）、北侧商务配套", "上学时段学生穿越场地形成通道型流线；晨晚居民从四向就近进入", "设计启示：四向人行入口与小区、学校出入口对应；主流线连续无障碍；通道流线与活动场地分离", "人群构成与行为特征见2.12、2.13"], 6.45, 1.02, 3.2, 2.35, 8.5);
  img(s, "x_ped1", 6.45, 3.4, 3.2, 1.6, "居民步行流线示意（公开视频帧）");
  rect(s, 0.5, 4.2, 5.7, 0.95, LIGHT);
  txt(s, "周边居住区常住居民中老年群体占比较高，包含家庭亲子群体、文镇小学师生群体；本地居民以周边小区家庭住户为主。青少年主要开展户外游玩、体育运动；中老年人偏向散步、休闲社交；外来游客多短途停留，偏好生态休闲活动。", 0.58, 4.23, 5.55, 0.9, { fontSize: 8.5 });
}

// ---------- 2.9 用地 ----------
{
  const s = pres.addSlide();
  header(s, SEC2[0], "Peripheral Land Use Analysis", "2.9 周边用地分析");
  img(s, "landuse", 0.5, 1.02, 5.3, 3.15, "场地周边用地性质分析图");
  const legend = [["住宅用地", "F2D24B"], ["教育用地", "E58EC0"], ["商业用地", "E8542E"], ["公园用地", "5DBA4A"], ["医疗/服务", "8EC6F0"]];
  legend.forEach((l, i) => {
    const y = 1.05 + i * 0.4;
    rect(s, 6.1, y + 0.05, 0.3, 0.22, l[1]);
    s.addText(l[0], { x: 6.5, y, w: 1.4, h: 0.32, fontFace: F, fontSize: 9.5, color: GRAY, margin: 0, isTextBox: true, valign: "middle" });
  });
  img(s, "map", 8.0, 1.05, 1.65, 2.9, "现状地图");
  rect(s, 6.1, 4.25, 3.55, 0.95, LIGHT);
  txt(s, "场地四周以二类居住用地为主，周边配套社区幼儿园、小学、沿街商业、小型社区卫生服务站；北侧普宁大道对面为城市商务配套用地。整体人居环境纯粹，公园服务人群以常住居民为主。", 6.15, 4.27, 3.45, 0.9, { fontSize: 8 });
  txt(s, "周边学校：星光幼儿园、文镇小学、文镇幼儿园、仁寿实验中学", 0.5, 4.5, 5.3, 0.3, { fontSize: 8.5, bold: true, color: NAVY });
  txt(s, "图例颜色为示意，以分析图中标注为准。", 6.1, 3.15, 1.9, 0.5, { fontSize: 7, color: MUTED });
}

// ---------- 2.10 地形地貌 ----------
{
  const s = pres.addSlide();
  header(s, SEC2[0], "Landscape and Landform Analysis", "2.10 地形地貌分析");
  img(s, "satellite", 0.5, 1.02, 4.4, 3.47, "场地卫星影像（红线范围内为设计地块）");
  img(s, "site_4", 5.15, 1.02, 2.2, 1.3);
  img(s, "site_1", 7.45, 1.02, 2.2, 1.3);
  txt(s, "场地现状地形照片（局部小土坡、裸土空地）", 5.15, 2.3, 4.5, 0.22, { fontSize: 8, color: MUTED, align: "center" });
  rect(s, 5.15, 2.65, 2.2, 2.5, LIGHT);
  label(s, "区域地貌", 5.25, 2.68, 2.0, 0.28, 10);
  txt(s, "仁寿地处四川盆地中部，以浅丘、丘陵为主，地势总体平坦。地质稳定，土壤以紫色土为主。", 5.2, 2.97, 2.1, 2.1, { fontSize: 8.5 });
  rect(s, 7.45, 2.65, 2.2, 2.5, LIGHT);
  label(s, "场地地形", 7.55, 2.68, 2.0, 0.28, 10);
  txt(s, "整体平缓，无高差突变；局部有小土坡起伏，无废弃构筑物、无土壤污染。适合土方场内平衡，利用微高差布置线性雨水花园。", 7.5, 2.97, 2.1, 2.1, { fontSize: 8.5 });
}

// ---------- 2.11 场地现状 ----------
{
  const s = pres.addSlide();
  header(s, SEC2[0], "Site Current Condition Analysis", "2.11 场地现状分析");
  img(s, "siteplan", 0.5, 1.02, 2.25, 3.95, "场地现状平面图");
  photoTag(s, "site_1", 2.95, 1.02, 2.0, 1.15, "裸土空地", ORANGE);
  photoTag(s, "site_2", 5.05, 1.02, 2.0, 1.15, "周边住宅", NAVY);
  photoTag(s, "site_3", 2.95, 2.25, 2.0, 1.15, "原生林地", GREEN);
  photoTag(s, "site_4", 5.05, 2.25, 2.0, 1.15, "局部土坡", ORANGE);
  txt(s, "场地现状照片（裸土空地、原生林地与周边住宅）", 2.95, 3.42, 4.1, 0.2, { fontSize: 7.5, color: MUTED, align: "center" });
  img(s, "satellite", 2.95, 3.68, 4.1, 1.35, "场地卫星影像", { vcenter: false });
  const c = [["原生林地", "东北部、中部成片原生乡土乔木群落，长势较好，是核心自然资源，可作为公园生态基底保留利用，减少绿化造价。", GREEN], ["裸土空地", "其余大片区域为裸露待开发土地，平整程度一般，局部小土坡，杂草零散；土壤条件一般，需改良后再营造植物景观。", ORANGE], ["水体与构筑", "场地无水体，属旱地型地块，需人工营造海绵水景；无大型建筑遗存，拆迁工程量小，适合公园开发建设。", NAVY]];
  c.forEach((it, i) => {
    const y = 1.02 + i * 1.38;
    rect(s, 7.25, y, 2.4, 1.3, LIGHT);
    tag(s, it[0], 7.33, y + 0.08, 1.0, 0.28, it[2], 9);
    txt(s, it[1], 7.28, y + 0.38, 2.34, 0.9, { fontSize: 7.5 });
  });
}

// ---------- 2.12 人群结构 ----------
{
  const s = pres.addSlide();
  header(s, SEC2[0], "Population Structure Analysis", "2.12 人群结构分析");
  const groups = [["x_cn_street", "老年人", "散步、晨练、休憩闲谈、社交 / 康养步道、器械、林荫座椅", NAVY], ["x_family", "家庭亲子", "儿童攀爬游乐、家长陪护 / 分龄儿童游乐区、看护休憩", ORANGE], ["x_skatepark", "青少年/学生", "跑步、球类、骑行 / 球类场地、环形跑道", GREEN], ["x_exercise", "中青年", "跑步、健身 / 健身器械区、夜间照明", "5B7DB1"], ["x_beachkites", "外来游客", "短途停留、生态休闲 / 阳光草坪、景观节点", "8A8F9C"]];
  groups.forEach((g, i) => {
    const x = 0.5 + i * 1.85, w = 1.75;
    photoCard(s, g[0], x, 1.02, w, 1.55, g[2], g[1], g[3], { fontSize: 6.5, bandPos: "bottom", bandH: 0.62, alpha: 25, labelSize: 10 });
  });
  img(s, "pie_src", 0.5, 3.0, 1.9, 1.9, "使用人群来源构成");
  img(s, "pie_age", 2.5, 3.0, 1.9, 1.9, "使用人群年龄构成");
  img(s, "pie_sex", 4.5, 3.0, 1.9, 1.9, "使用人群性别构成");
  rect(s, 6.6, 3.0, 3.05, 2.15, LIGHT);
  label(s, "人群结构特征", 6.7, 3.03, 2.8, 0.3, 10);
  txt(s, "仁寿县60岁及以上人口占26.56%，明显高于全国（18.70%）与四川（21.71%）。片区周边居民中老年占比高，并含家庭亲子群体与文镇小学等学校师生。年龄结构呈中老年、青少年占比偏高、青壮年通勤人群为辅的特征；性别构成男50.62%、女49.38%。", 6.65, 3.33, 2.95, 1.5, { fontSize: 8 });
  txt(s, "数据来源：《仁寿县第七次全国人口普查公报（第三号）》；饼图为开题报告调研预测数据。", 6.65, 4.8, 2.95, 0.35, { fontSize: 6.5, color: MUTED });
}

// ---------- 2.13 需求分析（分析图） ----------
{
  const s = pres.addSlide();
  header(s, SEC2[0], "Main Audience Needs Analysis", "2.13 主要人群需求分析");
  txt(s, "现有小区附属绿地仅配置简易健身器械，缺乏规模化、分龄化的专业运动场地，居民多元化体育锻炼、亲子运动、康养休闲需求难以满足。\n\n周边居民以中老年、家庭亲子与学生为主：出行、日晒、休憩、体锻是基本需求；情感、兴趣、社交、康养是进阶需求。体育公园需在空间中逐层回应这些需求。", 0.5, 1.15, 2.2, 3.0, { fontSize: 8.5, color: MUTED, lineSpacingMultiple: 1.3 });
  s.addText("基本需求", { x: 2.6, y: 1.05, w: 0.9, h: 0.3, fontFace: F, fontSize: 9, bold: true, color: GRAY, align: "right", margin: 0, isTextBox: true });
  s.addText("进阶需求", { x: 2.6, y: 3.85, w: 0.9, h: 0.3, fontFace: F, fontSize: 9, bold: true, color: GRAY, align: "right", margin: 0, isTextBox: true });
  const shades = ["E07B2A", "E58A45", "EA9A60", "EEA97A", "F2B995", "F6C9B0", "F9D9CA", "FCE9E3"];
  shades.forEach((c, i) => rect(s, 3.57, 1.15 + i * 0.37, 0.07, 0.37, c));
  ["出行", "日晒", "休憩", "体锻", "情感", "兴趣", "社交", "康养"].forEach((l, i) => s.addText(l, { x: 3.7, y: 1.12 + i * 0.37, w: 0.5, h: 0.37, fontFace: F, fontSize: 8.5, color: GRAY, margin: 0, isTextBox: true, valign: "middle" }));
  const rows = [["x_cyclists", "x_kites", "x_bench2", "x_bar"], ["x_basketball", "x_tennis2", "x_skatepark", "x_wheelchair"], ["x_elders_cake", "x_family", "x_cn_street", "x_baseball_kids"]];
  rows.forEach((r, ri) => {
    const y = 1.05 + ri * 1.05, h = 0.98;
    const ws = r.map((n) => Math.min(DIMS[n][0] / DIMS[n][1] * h, 1.7));
    const total = ws.reduce((a, b) => a + b, 0), gap = (5.35 - total) / (r.length - 1);
    let x = 4.3;
    r.forEach((n, i) => { img(s, n, x, y, ws[i], h); x += ws[i] + gap; });
  });
  rect(s, 0.5, 4.25, 9.15, 0.98, "3A3A3A");
  s.addText("居民日常户外活动的时段分布", { x: 0.6, y: 4.28, w: 3.0, h: 0.3, fontFace: F, fontSize: 10.5, bold: true, color: WHITE, margin: 0, isTextBox: true, valign: "middle" });
  const slots = ["6:00—9:00", "9:00—12:00", "14:00—17:00", "17:00—20:00"];
  slots.forEach((t, i) => { const x = 3.75 + i * 1.47; s.addShape(pres.shapes.LINE, { x: x + 0.7, y: 4.25, w: 0, h: 0.12, line: { color: WHITE, width: 1 } }); s.addText(t, { x, y: 4.36, w: 1.4, h: 0.22, fontFace: FE, fontSize: 9, bold: true, color: WHITE, align: "center", margin: 0, isTextBox: true }); });
  const lines = [["动态活动场所：", ["晨练、散步、太极", "", "跑步、球类、骑行", "健身、亲子游乐"]], ["静态活动场所：", ["", "休憩闲谈、晾晒", "", "饭后休闲、聚会下棋"]], ["步行活动场所：", ["上学途经、四向穿越，需连续无障碍步道与岔路口标识系统", "", "", ""]]];
  lines.forEach((l, li) => {
    const y = 4.6 + li * 0.2;
    s.addText(l[0], { x: 0.6, y, w: 1.4, h: 0.2, fontFace: F, fontSize: 7.5, color: WHITE, margin: 0, isTextBox: true, valign: "middle" });
    if (li === 2) s.addText(l[1][0], { x: 3.75, y, w: 5.8, h: 0.2, fontFace: F, fontSize: 7.5, color: "DDDDDD", margin: 0, isTextBox: true, valign: "middle" });
    else l[1].forEach((t, i) => t && s.addText(t, { x: 3.75 + i * 1.47, y, w: 1.4, h: 0.2, fontFace: F, fontSize: 7.5, color: "DDDDDD", align: "center", margin: 0, isTextBox: true, valign: "middle" }));
  });
}

// ---------- 2.13 需求分析（调研数据） ----------
{
  const s = pres.addSlide();
  header(s, SEC2[0], "Main Audience Needs Analysis", "2.13 主要人群需求分析——调研数据");
  img(s, "pie_act", 0.5, 1.0, 2.45, 2.45, "居民主要活动类型偏好");
  img(s, "pie_time", 3.55, 1.0, 2.45, 2.45, "居民户外活动时段分布");
  rect(s, 6.8, 1.0, 2.85, 1.55, LIGHT);
  tag(s, "基本需求", 6.9, 1.1, 0.95, 0.3, NAVY, 9);
  txt(s, "出行、日晒、休憩、体锻——全域无障碍步道、遮阳林荫、充足座椅、分龄健身场地。", 6.85, 1.45, 2.75, 1.05, { fontSize: 8.5 });
  rect(s, 6.8, 2.7, 2.85, 1.55, LIGHT);
  tag(s, "进阶需求", 6.9, 2.8, 0.95, 0.3, ORANGE, 9);
  txt(s, "情感、兴趣、社交、理疗——邻里聚会草坪、种植科普、康养步道、文化记忆节点。", 6.85, 3.15, 2.75, 1.05, { fontSize: 8.5 });
  const rows = [["人群", "主要活动时段", "主要活动类型"], ["中老年人", "6:00—9:00", "晨练散步、日间休憩闲谈、饭后休闲"], ["中年群体", "14:00—20:00", "跑步、健身等体育运动"], ["青少年", "14:00—19:00", "跑步、球类、骑行；上学途经"], ["儿童（亲子）", "全天分散", "攀爬游乐、亲子游乐"]];
  s.addTable(rows.map((r, i) => r.map((c) => ({ text: c, options: { fontFace: F, fontSize: 8, color: i === 0 ? WHITE : GRAY, bold: i === 0, fill: { color: i === 0 ? NAVY : (i % 2 ? LIGHT : PALE) }, valign: "middle", align: "center" } }))),
    { x: 0.5, y: 3.8, w: 6.05, colW: [1.3, 1.5, 3.25], rowH: 0.27, border: { type: "solid", color: WHITE, pt: 1 } });
  txt(s, "注：饼图数据为开题报告调研预测，待问卷统计后校正。", 6.85, 4.4, 2.8, 0.5, { fontSize: 7, color: MUTED });
}

// ---------- 2.14 光照 ----------
{
  const s = pres.addSlide();
  header(s, SEC2[0], "Sunlight Analysis", "2.14 光照分析");
  s.addImage({ path: FIG("sun1"), x: 0.5, y: 1.02, w: 4.55, h: 2.55 });
  s.addImage({ path: FIG("sun2"), x: 5.45, y: 1.02, w: 3.8, h: 2.55 });
  txt(s, "夏季太阳轨迹与场地日照", 0.5, 3.58, 4.55, 0.22, { fontSize: 8, color: MUTED, align: "center" });
  txt(s, "光照分析图（冬季太阳高度角较低）", 5.45, 3.58, 3.8, 0.22, { fontSize: 8, color: MUTED, align: "center" });
  const c = [["全日照区（≥6h）", "场地开阔区域，适合布置阳光草坪、运动场地和露天活动空间。", ORANGE], ["半日照区（3—6h）", "场地两侧，适宜疏林草地、慢行步道和林下休憩空间。", GREEN], ["阴影区（<3h）", "受建筑阴影影响，可布置阴生植物景观和静谧休闲空间。", NAVY]];
  c.forEach((it, i) => {
    const x = 0.5 + i * 3.1;
    rect(s, x, 3.9, 2.95, 1.3, LIGHT);
    tag(s, it[0], x + 0.1, 4.0, 1.5, 0.3, it[2], 8.5);
    txt(s, it[1], x + 0.05, 4.35, 2.85, 0.8, { fontSize: 8.5 });
  });
  txt(s, "夏季太阳高度角高，场地大部分区域日照强烈，需通过乔木遮阴提升舒适度；冬季太阳高度角较低，南侧和中部向阳空间更适合人群活动。", 0.5, 5.2, 9.15, 0.22, { fontSize: 7.5, color: MUTED });
}

// ---------- 2.15 SWOT ----------
{
  const s = pres.addSlide();
  header(s, SEC2[0], "SWOT Analysis", "2.15 SWOT分析");
  const q = [["S", "优势", NAVY, "satellite", ["规模8.6公顷，满足15分钟生活圈综合公园标准", "四面临路，四面可设入口，可达性极强", "场地平整无拆迁，建设成本低", "周边居住人口密集，使用需求充足"]],
    ["W", "劣势", ORANGE, "site_1", ["北侧主干道车流大，噪声粉尘干扰严重", "现状成型乔木有限，初期需大量苗木栽植", "场地缺少天然水系，需人工营造海绵水景"]],
    ["O", "机遇", GREEN, "map", ["仁寿城北新城公园城市规划政策支持", "片区缺少综合绿地，项目民生价值高", "海绵城市、15分钟生活圈政策提供设计导向", "周边小区入住率持续提升，远期人流增长"]],
    ["T", "威胁", "8A8F9C", "site_4", ["县城建设预算有限，不宜采用高端硬质景观", "夏季多雨，需重点做好场地排水防涝设计", "周边小区内部小型绿地分流部分休闲人群"]]];
  q.forEach((it, i) => {
    const x = 0.5 + (i % 2) * 4.65, y = 1.02 + Math.floor(i / 2) * 2.1, w = 4.5, h = 2.0;
    rect(s, x, y, w, h, LIGHT);
    const r = img(s, it[3], x + 0.08, y + 0.08, 1.75, h - 0.16, null, { vcenter: true });
    rect(s, r.x, r.y, 0.5, 0.5, it[2]);
    s.addText(it[0], { x: r.x, y: r.y, w: 0.5, h: 0.5, fontFace: FE, fontSize: 20, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0, isTextBox: true });
    s.addText(it[1], { x: x + 1.95, y: y + 0.08, w: 2.4, h: 0.32, fontFace: F, fontSize: 11, bold: true, color: it[2], margin: 0, isTextBox: true, valign: "middle" });
    bullets(s, it[4], x + 1.9, y + 0.42, w - 1.95, h - 0.48, 8);
  });
  txt(s, "注：开题报告SWOT中“现状无成型乔木”与2.11“保留原生乔木群落”矛盾，此处按现状分析口径修正为“成型乔木有限”，请确认。", 0.5, 5.22, 9.1, 0.22, { fontSize: 6.5, color: MUTED });
}

// ---------- 2.16 问题梳理 ----------
{
  const s = pres.addSlide();
  header(s, SEC2[0], "Problem Summary", "2.16 问题梳理");
  const c = [["场地现状问题", ORANGE, ["北侧普宁大道车流大，噪声、粉尘干扰严重", "裸土地块土壤条件一般，需改良", "无天然水体，旱地型地块", "局部小土坡，场地平整度一般"], "site_3"],
    ["片区供给问题", NAVY, ["集中型公共休闲绿地供给严重不足", "现有绿地为小区零散附属绿化，仅简易健身器械", "缺乏规模化、分龄化专业运动场地", "新城缺少文化景观载体与场所记忆"], "site_2"],
    ["人群需求问题", GREEN, ["中老年占比高，康养、社交空间缺失", "亲子群体缺少安全分龄游乐场地", "青少年、学生缺少球类、跑步场地", "夏季高温多雨，缺少遮阳与全天候活动条件"], "site_4"]];
  c.forEach((it, i) => {
    const x = 0.5 + i * 3.1;
    photoCard(s, it[3], x, 1.02, 2.95, 1.5, it[0], null, it[1], { bold: true, fontSize: 11, bandPos: "bottom", bandH: 0.42, alpha: 15, align: "center" });
    rect(s, x, 2.6, 2.95, 2.0, LIGHT);
    bullets(s, it[2], x + 0.05, 2.67, 2.85, 1.9, 8.5);
  });
  s.addText("以上问题对应第三部分设计目标（3.1）与设计策略（3.4）逐项回应", { x: 0.5, y: 4.75, w: 9.15, h: 0.4, fontFace: F, fontSize: 10, bold: true, color: ORANGE, align: "center", valign: "middle", margin: 0, isTextBox: true });
}

// ---------- 03 章节 ----------
sectionSlide("03", "场地规划分析", SEC3[1], ["3.1 设计目标", "3.2 设计原则", "3.3 设计构思", "3.4 设计策略", "3.5 设计成果", "3.6 进度安排", "3.7 参考文献"], ["x_tennis", "x_sign", "x_greenhouse"]);

// ---------- 3.1 设计目标 ----------
{
  const s = pres.addSlide();
  header(s, SEC3[0], "Design Objectives", "3.1 设计目标");
  const g = [["x_lake", "生态目标", "多层次乡土植物群落 + 主干道生态缓冲带 + 海绵雨水系统，降低径流，削弱噪声粉尘，修复片区微型生态。", GREEN],
    ["x_basketball", "功能目标", "婴幼儿游乐、青少年运动、老年康养、邻里大草坪、自然科普五大核心分区，满足日常游憩、健身、社交需求。", ORANGE],
    ["x_aerial_city", "空间目标", "优化主次入口与人车流线，打通四向人行通道，公园与居住区步行无缝衔接，形成连贯游览轴线。", NAVY],
    ["satellite", "落地目标", "低成本、低维护：眉山本土苗木，减少土方开挖，构筑物简约轻量化，适配县城建设标准。", "5B7DB1"]];
  g.forEach((it, i) => {
    const x = 0.5 + i * 2.3, w = 2.2;
    photoCard(s, it[0], x, 1.02, w, 2.2, it[1], null, it[3], { bold: true, fontSize: 12, bandPos: "bottom", bandH: 0.45, alpha: 15, align: "center" });
    circleNum(s, i + 1, x, 3.35, 0.34, it[3]);
    s.addText(it[1], { x: x + 0.42, y: 3.35, w: w - 0.42, h: 0.34, fontFace: F, fontSize: 10.5, bold: true, color: it[3], margin: 0, isTextBox: true, valign: "middle" });
    rect(s, x, 3.78, w, 1.4, LIGHT);
    txt(s, it[2], x + 0.06, 3.83, w - 0.12, 1.3, { fontSize: 8.5 });
  });
}

// ---------- 3.2 设计原则 ----------
{
  const s = pres.addSlide();
  header(s, SEC3[0], "Design Principles", "3.2 设计原则");
  const p = [["x_swing", "以人为本·全龄友好", "依老人、儿童、中青年行为特征分区，全域无障碍步道、休憩座椅、遮阳乔木，兼顾安全、舒适、可达。", NAVY],
    ["x_plaza", "交通便捷·开放共享", "四面设主次人行入口，绿篱、微地形软边界代替围墙，24小时开放，绿地资源全民共享。", ORANGE],
    ["x_stonewall", "乡土风貌·简约宜居", "川南浅丘自然简约风格，小品铺装提取仁寿田园、黑龙滩水系元素，质朴舒适。", GREEN],
    ["x_lake", "生态节约·海绵低碳", "保留平整原始地形，土方场内平衡；桢楠、香樟、桂花、紫薇等乡土树种；雨水花园、植草沟就地净化利用。", "5B7DB1"]];
  p.forEach((it, i) => {
    const x = 0.5 + i * 2.3, w = 2.2;
    photoCard(s, it[0], x, 1.02, w, 2.2, it[1], null, it[3], { bold: true, fontSize: 10.5, bandPos: "bottom", bandH: 0.45, alpha: 15, align: "center" });
    rect(s, x, 3.35, w, 1.8, LIGHT);
    txt(s, it[2], x + 0.08, 3.42, w - 0.16, 1.7, { fontSize: 9.5, lineSpacingMultiple: 1.3 });
  });
}

// ---------- 3.3 设计构思 ----------
{
  const s = pres.addSlide();
  header(s, SEC3[0], "Design Concept", "3.3 设计构思");
  const r = img(s, "satellite", 0.5, 1.0, 4.6, 3.65);
  rect(s, r.x, r.y, r.w, 0.75, "000000", { fill: { color: "000000", transparency: 45 } });
  s.addText("跃动·栖园", { x: r.x + 0.15, y: r.y + 0.05, w: 2.5, h: 0.65, fontFace: F, fontSize: 26, bold: true, color: WHITE, margin: 0, isTextBox: true, valign: "middle" });
  s.addText("一环 · 一带 · 三组团", { x: r.x + r.w - 2.2, y: r.y + 0.2, w: 2.05, h: 0.4, fontFace: F, fontSize: 11, bold: true, color: WHITE, align: "right", margin: 0, isTextBox: true, valign: "middle" });
  rect(s, r.x, r.y + r.h - 0.85, r.w, 0.85, NAVY, { fill: { color: NAVY, transparency: 25 } });
  s.addText("“跃动”对应全民健康——全龄运动、活力健身；“栖园”对应生态栖居——林下休憩、海绵生态、乡土记忆。以“一环”健康步道串联“动”“静”两类组团，主干道一侧以“一带”防护林承担生态缓冲。", { x: r.x + 0.1, y: r.y + r.h - 0.83, w: r.w - 0.2, h: 0.8, fontFace: F, fontSize: 8, color: WHITE, margin: 0, isTextBox: true, valign: "middle" });
  const g = [["x_bar", "跃动组团（动）", "青少年球类运动区、中青年健身器械区、环形健康步道", ORANGE], ["x_bench", "栖居组团（静）", "老年康养林荫区、邻里阳光草坪、海绵雨水花园、文化记忆节点", NAVY], ["x_swing", "亲子组团（动静结合）", "分龄儿童游乐区、家长看护休憩、自然科普种植", GREEN]];
  g.forEach((it, i) => {
    const y = 1.0 + i * 1.25;
    rect(s, 5.35, y, 4.3, 1.15, LIGHT);
    const pr = img(s, it[0], 5.42, y + 0.07, 1.45, 1.01, null, { vcenter: true });
    rect(s, 6.95, y + 0.1, 0.07, 0.95, it[3]);
    s.addText(it[1], { x: 7.1, y: y + 0.1, w: 2.5, h: 0.3, fontFace: F, fontSize: 10.5, bold: true, color: it[3], margin: 0, isTextBox: true, valign: "middle" });
    txt(s, it[2], 7.05, y + 0.42, 2.55, 0.7, { fontSize: 8.5 });
  });
  rect(s, 5.35, 4.75, 4.3, 0.45, "3E5A3A");
  ["全龄运动", "林下栖居", "海绵生态", "乡土记忆"].forEach((k, i) => s.addText(k, { x: 5.35 + i * 1.075, y: 4.75, w: 1.075, h: 0.45, fontFace: F, fontSize: 10, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0, isTextBox: true }));
  txt(s, "注：本页构思为依据开题报告目标与案例借鉴整理的初步框架，需确认或替换。", 0.5, 4.85, 4.6, 0.3, { fontSize: 7, color: MUTED });
}

// ---------- 3.4 设计策略框架图 ----------
{
  const s = pres.addSlide();
  header(s, SEC3[0], "Design Strategy", "3.4 设计策略——策略框架");
  img(s, "strategy", 0.5, 1.02, 6.3, 4.15, "设计策略框架图（开题报告）");
  img(s, "x_tennis", 7.05, 1.02, 2.6, 1.3, "运动专项场地");
  img(s, "x_sign", 7.05, 2.55, 2.6, 1.3, "标识导览与配套设施");
  img(s, "x_greenhouse", 7.05, 4.08, 2.6, 1.05, "生态基底与植物景观");
}

// ---------- 3.4 设计策略 ----------
{
  const s = pres.addSlide();
  header(s, SEC3[0], "Design Strategy", "3.4 设计策略——回应2.16问题");
  const st = [["宏观", "整体空间统筹规划", NAVY, [["结合周边人群需求划分功能板块", "运动健身区 / 生态休闲区 / 亲子活动区"], ["统筹布置公园主次出入口", "四向人行入口对应小区与学校"], ["组织场地交通流线", "人车分流 / 慢行运动步道 / 优化游览运动路线"]]],
    ["中观", "全龄友好分区活力营造", ORANGE, [["匹配各年龄段活动诉求", "老年康养 / 儿童亲子 / 青年运动 / 大众休闲社交空间"], ["打造多元全民健身场景", "分龄场地与动静分区"], ["激活各片区场地活力", "环形健康步道串联组团"]]],
    ["微观·核心", "运动专项景观设施提升", GREEN, [["体育运动场地配置", "球类运动场地 / 健身器械点位 / 健身慢跑步道"], ["运动配套休憩设施", "运动休息节点 / 标识导览系统 / 基础便民服务设施"], ["文化植入", "黑龙滩水利记忆铺装 / 陵州文脉标识小品"]]],
    ["次要后置", "场地生态基底优化", "5B7DB1", [["保留场地原生林地植被", "北侧多层乔灌降噪防护林带"], ["修复场地裸土地块环境", "乡土植物构建复层群落"], ["海绵雨水场地处理", "透水铺装 + 植草沟 + 线性雨水花园"]]]];
  st.forEach((it, i) => {
    const y = 1.02 + i * 1.05;
    rect(s, 0.5, y, 9.15, 0.95, i % 2 ? PALE : LIGHT);
    img(s, ["x_aerial_round", "x_kites", "x_basketball", "x_daisy"][i], 8.3, y + 0.05, 1.3, 0.85, null, { vcenter: true });
    rect(s, 0.5, y, 1.75, 0.95, it[2]);
    s.addText([{ text: it[0], options: { fontSize: 8.5, breakLine: true } }, { text: it[1], options: { fontSize: 10.5, bold: true } }], { x: 0.55, y, w: 1.65, h: 0.95, fontFace: F, color: WHITE, align: "center", valign: "middle", margin: 0, isTextBox: true });
    it[3].forEach((sub, j) => {
      const x = 2.35 + j * 1.98;
      s.addText(sub[0], { x, y: y + 0.1, w: 1.92, h: 0.3, fontFace: F, fontSize: 9, bold: true, color: it[2], margin: 0, isTextBox: true, valign: "middle" });
      txt(s, sub[1], x - 0.02, y + 0.38, 1.95, 0.55, { fontSize: 7.5 });
    });
  });
  txt(s, "策略框架来源：开题报告4.9设计策略图（宏观—中观—微观—后置四层级）。", 0.5, 5.25, 8, 0.22, { fontSize: 7, color: MUTED });
}

// ---------- 3.5 设计成果 ----------
{
  const s = pres.addSlide();
  header(s, SEC3[0], "Design Deliverables", "3.5 设计成果");
  const rows = [["类别", "主要内容"], ["现状分析", "区位、自然条件（地形、气候）、社会条件（风貌、文化、道路、交通、用地、人群行为）"], ["设计分析", "场地道路、视线、建筑、入口、人流分析、景观序列"], ["设计图纸", "总平面图（图名图例比例风玫瑰）、节点详图（平面、立面、细节）、植物配置图"], ["效果图", "场地鸟瞰图、节点效果图"], ["专项设计", "建筑外立面、照明设计、平面图、立面图、效果图"], ["文本", "设计目的、依据与政策、思想与原则、现状分析、设计分析、设计说明"]];
  s.addTable(rows.map((r, i) => r.map((c, j) => ({ text: c, options: { fontFace: F, fontSize: 8, color: i === 0 ? WHITE : GRAY, bold: i === 0 || j === 0, fill: { color: i === 0 ? NAVY : (i % 2 ? LIGHT : PALE) }, valign: "middle", align: j === 0 ? "center" : "left" } }))),
    { x: 0.5, y: 1.02, w: 4.6, colW: [0.9, 3.7], rowH: 0.42, border: { type: "solid", color: WHITE, pt: 1 } });
  const tiles = [["x_aerial_round", "场地鸟瞰图"], ["x_basketball", "节点效果图"], ["plants", "植物配置图"], ["siteplan", "总平面图"], ["x_church", "建筑专项"], ["x_light", "照明与小品"]];
  tiles.forEach((t, i) => {
    const x = 5.35 + (i % 2) * 2.2, y = 1.02 + Math.floor(i / 2) * 1.4;
    photoCard(s, t[0], x, y, 2.1, 1.3, t[1], null, NAVY, { bold: true, fontSize: 8.5, bandPos: "bottom", bandH: 0.3, alpha: 15, align: "center" });
  });
  txt(s, "成果类型示意（案例图片）", 5.35, 5.22, 4.3, 0.2, { fontSize: 7, color: MUTED, align: "center" });
}

// ---------- 3.6 进度安排 ----------
{
  const s = pres.addSlide();
  header(s, SEC3[0], "Schedule", "3.6 进度安排");
  const months = ["9月", "10月", "11月", "12月", "1月", "2月", "3月", "4月"];
  const gx = 4.3, gw = 5.35, cw = gw / 8;
  months.forEach((m, i) => { rect(s, gx + i * cw, 1.02, cw - 0.03, 0.3, i % 2 ? LIGHT : PALE); s.addText(m, { x: gx + i * cw, y: 1.02, w: cw, h: 0.3, fontFace: F, fontSize: 8, color: GRAY, align: "center", valign: "middle", margin: 0, isTextBox: true }); });
  const tasks = [["2026.09.01—09.25", "收集资料，完成选题", 0, 0.83], ["2026.09.26—10.26", "完成开题报告", 0.85, 1.87], ["2026.10.27—10.28", "开题答辩", 1.87, 1.93], ["2026.10.29—11.09", "搜集资料、实地研究", 1.95, 2.3], ["2026.11.10—12.25", "完成初稿", 2.33, 3.83], ["2026.12.26—2027.02.25", "完成修改稿", 3.85, 5.85], ["2027.02.26—03.25", "完成定稿", 5.87, 6.83], ["2027.04.07—04.08", "毕业答辩", 7.2, 7.27]];
  tasks.forEach((t, i) => {
    const y = 1.45 + i * 0.47;
    circleNum(s, i + 1, 0.5, y + 0.03, 0.3, i === 7 ? ORANGE : NAVY);
    s.addText(t[0], { x: 0.9, y, w: 1.75, h: 0.36, fontFace: FE, fontSize: 8.5, color: GRAY, margin: 0, isTextBox: true, valign: "middle" });
    s.addText(t[1], { x: 2.65, y, w: 1.6, h: 0.36, fontFace: F, fontSize: 9, bold: true, color: NAVY, margin: 0, isTextBox: true, valign: "middle" });
    s.addShape(pres.shapes.LINE, { x: gx, y: y + 0.36, w: gw, h: 0, line: { color: "E3E6EC", width: 0.5 } });
    const bw = Math.max((t[3] - t[2]) * cw, 0.08);
    rect(s, gx + t[2] * cw, y + 0.08, bw, 0.2, i === 7 || i === 2 ? ORANGE : "8FA6D6");
  });
}

// ---------- 3.7 参考文献 ----------
const refs1 = ["[1] 孟语.城市体育公园规划设计与发展研究[D].北京：北京林业大学,2016.", "[2] 史熙文.城市体育公园景观设计研究[D].大连：大连工业大学,2021.", "[3] 吴子姮.基于环境行为学的城市体育公园规划设计研究[D].北京：北京林业大学,2022.", "[4] 李雨桐.全龄友好视角下县城体育公园景观设计研究[D].成都：四川农业大学,2023.", "[5] 由文华,吉云波.体育景观环境[M].北京：北京体育大学出版社,2018.", "[6] 王晓俊.风景园林设计[M].南京：江苏科学技术出版社,2018.", "[7] 扬·盖尔.交往与空间[M].何人可,译.4版.北京：中国建筑工业出版社,2002.", "[8] 胡鞍钢,方旭东.全民健身国家战略：内涵与发展思路[J].体育科学,2016,36(03):3-9.", "[9] 蒋荣,熊瑶.全民健身战略下的社区体育公园景观设计研究[J].设计艺术研究,2022,12(04):77-82.", "[10] 金依然.全民健身背景下县级体育公园建设研究[J].广西城镇建设,2024(07):68-72.", "[11] 陈芃序,王天扬,张德顺.全民健身背景下城市社区公园环境设计研究[J].华中建筑,2023,41(02):68-72."];
const refs2 = ["[12] 周聪惠,陶成蹊,刘婧方,等.基于弹性共享的户外健身设施群体需求响应评测研究[J].风景园林,2024,31(02):48-55.", "[13] 张俊涛,杨洪.县域体育公园治理路径研究——以晋江智慧体育公园为例[J].运动精品,2023(07):66-68.", "[14] 住房和城乡建设部.公园设计规范：GB 51192-2016[S].北京：中国建筑工业出版社,2017.", "[15] 住房和城乡建设部.城市居住区规划设计标准：GB 50180-2018[S].北京：中国建筑工业出版社,2018.", "[16] 中国城市科学研究会.社区体育公园规划建设指南：T/CSUS 18-2021[S].北京：中国建筑工业出版社,2021.", "[17] 国务院办公厅.关于推进体育公园建设的指导意见[EB/OL].(2021-10-29)[2026-08-15].", "[18] 王益鹏.基于生态恢复理念的景观设计研究[D].清华大学,2015.", "[19] KACZYNSKI A T,POTWARKA L R,SAELENS B E.Association of park size,distance,and features with physical activity in neighborhood parks[J].American Journal of Public Health,2008,98(08):1451-1456.", "[20] WARBURTON D E R,NICOL C W,BREDIN S S D.Health benefits of physical activity:The evidence[J].Canadian Medical Association Journal,2006,174(06):801-809.", "[21] World Health Organization.Global status report on physical activity 2022[R].Geneva:WHO,2022."];
[refs1, refs2].forEach((r, i) => {
  const s = pres.addSlide();
  header(s, SEC3[0], "References", `3.7 参考文献（${i + 1}/2）`);
  s.addText(r.join("\n"), { x: 0.5, y: 1.02, w: 9.15, h: 4.1, fontFace: F, fontSize: 9, color: GRAY, margin: 0, isTextBox: true, valign: "top", lineSpacingMultiple: 1.45 });
});

// ---------- 结束页 ----------
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  rect(s, 0, 0, 4.6, 5.625, LIGHT);
  img(s, "x_lake", 0.3, 0.35, 4.0, 2.55);
  img(s, "x_bench", 0.3, 3.05, 1.95, 2.25);
  img(s, "x_swing", 2.35, 3.05, 1.95, 2.25);
  s.addText("示意照片来源：ImageNet 样例图库、COCO/Flickr CC 照片（Mask R-CNN、OpenPose、Detectron、PaddleDetection、MMPose 示例）、OpenCV 示例素材，均已转为黑白", { x: 5.0, y: 5.3, w: 4.8, h: 0.25, fontFace: F, fontSize: 7, color: "8FA6D6", margin: 0, isTextBox: true });
  rect(s, 4.6, 0, 5.4, 5.625, NAVY);
  s.addText("请各位老师批评指正", { x: 5.0, y: 1.9, w: 4.6, h: 0.8, fontFace: F, fontSize: 28, bold: true, color: WHITE, margin: 0, isTextBox: true });
  s.addText("跃动·栖园——全民健康视角下的眉山市仁寿县体育公园景观设计", { x: 5.0, y: 2.8, w: 4.6, h: 0.7, fontFace: F, fontSize: 11, color: "C9D6F0", margin: 0, isTextBox: true, valign: "top" });
  s.addText("SPORTS PARK", { x: 5.0, y: 4.9, w: 3, h: 0.3, fontFace: FE, fontSize: 9, color: "8FA6D6", charSpacing: 4, margin: 0, isTextBox: true });
}

const out = path.join(__dirname, "..", "跃动栖园_开题答辩PPT.pptx");
pres.writeFile({ fileName: out }).then((f) => console.log("written:", f, "pages:", page));
