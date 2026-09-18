// 第二次课 PPT 生成脚本。运行:
//   cd 01_slides/src && npm install pptxgenjs && node build_lesson2.js
// 图从 ../../03_code/figures 读 (先跑完 03_code 的五个脚本), 输出 ../第二次课_从想法到能跑的东西.pptx
// 改文字只改本文件, 不要手改 pptx。
const path = require("path");
const pptxgen = require("pptxgenjs");
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5

// ---- palette (same as the other three decks of this course) ----
const NAVY = "152238", INK = "1A1A1A", GREY = "6E7A8A", LIGHT = "F4F7FA", ICE = "DCE7F2", MID = "9FB2C9";
const AMBER = "9A6510", AMBER_BG = "FFF4E0", RED = "B23A48", GREEN = "3D7A5A", BLUE = "2E4A6B", WHITE = "FFFFFF";
const CN = "Microsoft YaHei", EN = "Times New Roman";
const W = 13.33, H = 7.5, M = 0.6;

function header(s, title, sub) {
  s.addText(title, { x: M, y: 0.38, w: W - 2 * M, h: 0.6, fontFace: CN, fontSize: 26, bold: true, color: NAVY, isTextBox: true, margin: 0 });
  if (sub) s.addText(sub, { x: M, y: 0.98, w: W - 2 * M, h: 0.32, fontFace: CN, fontSize: 12, color: GREY, isTextBox: true, margin: 0 });
}
function card(s, x, y, w, h, o) {
  o = o || {};
  const fill = o.fill || LIGHT;
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: fill, width: 0 } });
  let cy = y + 0.18;
  if (o.head) {
    s.addText(o.head, { x: x + 0.22, y: cy, w: w - 0.44, h: 0.34, fontFace: CN, fontSize: o.headSize || 13, bold: true, color: o.headColor || NAVY, isTextBox: true, margin: 0, valign: "top" });
    cy += 0.42;
  }
  if (o.body) {
    s.addText(o.body, { x: x + 0.22, y: cy, w: w - 0.44, h: y + h - cy - 0.15, fontFace: o.bodyFace || CN, fontSize: o.bodySize || 11, color: o.bodyColor || INK, isTextBox: true, margin: 0, valign: "top", lineSpacingMultiple: 1.25, paraSpaceAfter: 5 });
  }
}
function badge(s, x, y, n, color, d) {
  d = d || 0.4;
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: color || AMBER }, line: { color: color || AMBER, width: 0 } });
  s.addText(String(n), { x, y, w: d, h: d, fontFace: EN, fontSize: 12, bold: true, color: WHITE, align: "center", valign: "middle", isTextBox: true, margin: 0 });
}
function formula(s, x, y, w, h, txt, size, color) {
  s.addText(txt, { x, y, w, h, fontFace: EN, fontSize: size || 16, bold: true, color: color || NAVY, isTextBox: true, margin: 0, valign: "middle" });
}
function notes(s, t) { s.addNotes(t); }
function pn(s, n) { s.addText(String(n), { x: W - 1.0, y: H - 0.42, w: 0.5, h: 0.3, fontFace: EN, fontSize: 10, color: MID, align: "right", isTextBox: true, margin: 0 }); }

// ============ 1 封面 ============
{
  const s = pres.addSlide(); s.background = { color: NAVY };
  s.addText("第二次课：从想法到能跑的东西", { x: 0.9, y: 1.9, w: 11.5, h: 0.9, fontFace: CN, fontSize: 36, bold: true, color: WHITE, isTextBox: true, margin: 0 });
  s.addText("上次方案有三处经不起核算，先改掉；然后把数据读进来，跑通第一版下界", { x: 0.9, y: 2.85, w: 11.5, h: 0.5, fontFace: CN, fontSize: 17, color: ICE, isTextBox: true, margin: 0 });
  s.addText([
    { text: "数据：C-MAPSS FD001（先在最简单的子集上把流程跑通；删失是人工构造的）", options: { breakLine: true } },
    { text: "工具：Python 3.10，五个脚本；管线与出图都是 Python，结果只在控制台打印并落盘到 results/", options: { breakLine: true } },
    { text: "时长：约 60 分钟。前 25 分钟改方案，后 35 分钟讲代码", options: {} },
  ], { x: 0.9, y: 4.0, w: 11.5, h: 1.3, fontFace: CN, fontSize: 13.5, color: MID, isTextBox: true, margin: 0, lineSpacingMultiple: 1.5 });
  s.addText("删失与时序相关并存条件下的航空发动机剩余寿命共形下界 · 第二次课", { x: 0.9, y: 6.6, w: 11.5, h: 0.35, fontFace: CN, fontSize: 11, color: MID, italic: true, isTextBox: true, margin: 0 });
  notes(s, "开场直接说：上次讲完我回去核算了一遍，有三处不实际，今天先改再跑。老师先认错，学生才敢质疑。\n今天的成果物是能跑的五个脚本，不是新理论。讲完让每个人回去跑。");
}

// ============ 2 路线 ============
{
  const s = pres.addSlide(); header(s, "今天的路线", "三段：先改方案，再跑代码，最后交付作业");
  const cols = [
    { n: 1, head: "改方案（第 3 到 8 页）", color: RED, body: "上次方案三处经不起核算：样本量没算、权重相乘没有保证、成本参数是编的。\n\n三处修正各带一个副产品：样本级选择规则、权重不是常数、两层结构的两个校准方案。" },
    { n: 2, head: "跑代码（第 9 到 14 页）", color: BLUE, body: "数据长什么样，六步流程，下界的三行公式对应三行代码，删失怎么造，六条对比线，评估协议。\n\n这一段对着脚本讲，每页标出对应的函数名。" },
    { n: 3, head: "交付（第 15 到 22 页）", color: GREEN, body: "五个脚本按顺序跑，每一步的验收标准；跑完得到 11 张图。\n\n第 16 到 21 页是在真实 FD001 上跑出来的结果：验收对照、核算表、主结果三张图、怎么读。最后是三项作业。" },
  ];
  cols.forEach((c, i) => {
    const x = M + i * 4.1, y = 1.6, w = 3.9, h = 3.9;
    card(s, x, y, w, h, {});
    badge(s, x + 0.22, y + 0.25, c.n, c.color, 0.44);
    s.addText(c.head, { x: x + 0.8, y: y + 0.25, w: w - 1.0, h: 0.44, fontFace: CN, fontSize: 14, bold: true, color: NAVY, isTextBox: true, margin: 0, valign: "middle" });
    s.addText(c.body, { x: x + 0.22, y: y + 0.95, w: w - 0.44, h: h - 1.1, fontFace: CN, fontSize: 11.5, color: INK, isTextBox: true, margin: 0, valign: "top", lineSpacingMultiple: 1.3 });
  });
  s.addShape(pres.shapes.RECTANGLE, { x: M, y: 5.8, w: W - 2 * M, h: 0.85, fill: { color: NAVY }, line: { color: NAVY, width: 0 } });
  s.addText("一句话记住今天：先算再说，先跑通再谈理论。写方案之前把数字算出来，写理论之前把实验跑出来。", { x: M + 0.3, y: 5.8, w: W - 2 * M - 0.6, h: 0.85, fontFace: CN, fontSize: 13, bold: true, color: "F2C46D", isTextBox: true, margin: 0, valign: "middle" });
  pn(s, 2);
  notes(s, "一分钟过完。重点是告诉学生第二段要对着脚本听，最好把 cmapss_common.py 打开放在旁边。");
}

// ============ 3 三处经不起核算 ============
{
  const s = pres.addSlide(); header(s, "上次方案里三处经不起核算的地方", "研究方案不是定了就不动，算过之后该改就改");
  const rows = [
    { n: 1, head: "样本量没算", body: "FD001 只有 100 台发动机。上次说“按发动机整机截取”，删失 60% 再切校准集，校准折可能只剩十几台。这个数没算就往下写了。", fix: "改：选择改在样本层面做，删失机的早期循环照样能用；把样本量核算写进脚本 s03，先算再说。" },
    { n: 2, head: "权重相乘没有保证", body: "删失权重有似然比含义；时序权重是启发式的，保证形式完全不同。两个相乘之后还剩什么保证，说不清。", fix: "改：不相乘。同机相关改用两层结构处理，全部循环校准（Cw）与一机一点校准（Cw1）两版都跑，先看实验。" },
    { n: 3, head: "成本参数是编的", body: "拆检成本、非计划停场成本，一个真实数字都没有。编一组参数算曲线，等于自己定输赢。", fix: "改：不做成本曲线。报总体覆盖率、决策区覆盖率、分段覆盖率、平均下界、无信息界比例。" },
  ];
  rows.forEach((r, i) => {
    const y = 1.55 + i * 1.75, h = 1.6;
    card(s, M, y, W - 2 * M, h, {});
    badge(s, M + 0.25, y + 0.25, r.n, RED);
    s.addText(r.head, { x: M + 0.85, y: y + 0.22, w: 6.6, h: 0.4, fontFace: CN, fontSize: 14, bold: true, color: NAVY, isTextBox: true, margin: 0, valign: "middle" });
    s.addText(r.body, { x: M + 0.85, y: y + 0.66, w: 6.6, h: h - 0.75, fontFace: CN, fontSize: 11, color: INK, isTextBox: true, margin: 0, valign: "top", lineSpacingMultiple: 1.25 });
    s.addShape(pres.shapes.RECTANGLE, { x: M + 7.85, y: y + 0.2, w: W - 2 * M - 8.05, h: h - 0.4, fill: { color: AMBER_BG }, line: { color: AMBER_BG, width: 0 } });
    s.addText(r.fix, { x: M + 8.05, y: y + 0.2, w: W - 2 * M - 8.45, h: h - 0.4, fontFace: CN, fontSize: 11, color: AMBER, bold: true, isTextBox: true, margin: 0, valign: "middle", lineSpacingMultiple: 1.25 });
  });
  pn(s, 3);
  notes(s, "三条各讲一分钟。重点不是错在哪，是“核算”这个动作：写方案之前先把数字算出来。\n第二条顺带引出代码里的两个代号 Cw 与 Cw1，后面会反复出现。");
}

// ============ 4 修正一：选择规则 ============
{
  const s = pres.addSlide(); header(s, "修正一：删失在剩余寿命里的正确形态", "下线在整机层面发生，选择在样本层面进行");
  // left: rule
  card(s, M, 1.55, 5.6, 2.15, { head: "规则" });
  formula(s, M + 0.22, 2.05, 5.2, 0.5, "保留 (i, t)   当且仅当   C_i − t ≥ c0", 16);
  s.addText("C_i 是第 i 台机的下线时刻，t 是当前循环，c0 是我们定的观测视野。对保留下来的样本，min(RUL, c0) 一定看得见。代码：s03_censoring.py 里 keep = (C_row − cycle) ≥ c0。", { x: M + 0.22, y: 2.6, w: 5.2, h: 1.0, fontFace: CN, fontSize: 11, color: INK, isTextBox: true, margin: 0, valign: "top", lineSpacingMultiple: 1.25 });
  card(s, M, 3.9, 5.6, 3.0, { fill: NAVY, head: "为什么丢的是最后 c0 个循环", headColor: "F2C46D", bodyColor: ICE, body: "在下线前最后 c0 个循环上，发动机会不会在 c0 之内坏掉，我们看不到，min(RUL, c0) 算不出来。再往前的循环不受影响。\n\n所以删失机不是整台没用，是最后一段没用。规则对失效机也同样执行，这样两群样本才只差一个协变量分布。" });
  // right: timeline
  const x0 = 6.6, y0 = 1.55, w0 = W - M - x0;
  card(s, x0, y0, w0, 5.35, { head: "一台删失机：F = 200，C = 150，c0 = 30" });
  const bx = x0 + 0.35, bw = w0 - 0.7, by = 2.45, bh = 0.42, scale = bw / 200;
  s.addShape(pres.shapes.RECTANGLE, { x: bx, y: by, w: 120 * scale, h: bh, fill: { color: GREEN }, line: { color: GREEN, width: 0 } });
  s.addShape(pres.shapes.RECTANGLE, { x: bx + 120 * scale, y: by, w: 30 * scale, h: bh, fill: { color: "E39B26" }, line: { color: "E39B26", width: 0 } });
  s.addShape(pres.shapes.RECTANGLE, { x: bx + 150 * scale, y: by, w: 50 * scale, h: bh, fill: { color: "E4E8EE" }, line: { color: GREY, width: 0.75, dashType: "dash" } });
  [[0, "0"], [120, "120"], [150, "C = 150"], [200, "F = 200"]].forEach(([v, t]) => {
    s.addText(t, { x: bx + v * scale - 0.5, y: by + bh + 0.05, w: 1.0, h: 0.28, fontFace: EN, fontSize: 11, bold: true, color: NAVY, align: "center", isTextBox: true, margin: 0 });
  });
  const legend = [
    [GREEN, "保留：t ≤ 120，共 120 个样本，标签 min(RUL, 30) 可观测"],
    ["E39B26", "丢弃：121 到 150，观测到了但 30 循环内是否失效不可知"],
    [GREY, "未观测：151 到 200，下线之后的部分，本来就看不到"],
  ];
  legend.forEach(([c, t], i) => {
    const y = 3.45 + i * 0.62;
    s.addShape(pres.shapes.RECTANGLE, { x: bx, y: y + 0.06, w: 0.3, h: 0.3, fill: { color: c }, line: { color: c, width: 0 } });
    s.addText(t, { x: bx + 0.45, y, w: bw - 0.5, h: 0.42, fontFace: CN, fontSize: 11, color: INK, isTextBox: true, margin: 0, valign: "middle" });
  });
  s.addText("对照：一台失效机 F = 200，C = 210，同样规则下保留 t ≤ 180，最后 20 个循环也要丢。它的标签在 t > 170 时是 F − t < 30，在 t ≤ 170 时是 30。", { x: bx, y: 5.45, w: bw, h: 1.3, fontFace: CN, fontSize: 11, color: GREY, isTextBox: true, margin: 0, valign: "top", lineSpacingMultiple: 1.25 });
  pn(s, 4);
  notes(s, "这一页要让学生自己算一遍那三个数：120、30、50。算对了才往下走。\n对照那句很重要：规则对失效机也执行，不然分布不对。代码里断言“保留样本上的可观测标签应与真值一致”检查的就是这一页。");
}

// ============ 5 副产品：权重不是常数 ============
{
  const s = pres.addSlide(); header(s, "修正一的副产品：一个真正属于我们的发现", "即使下线完全随机，样本层面的删失也依赖协变量");
  card(s, M, 1.55, 5.6, 2.3, { head: "样本被保留的概率" });
  formula(s, M + 0.22, 2.05, 5.2, 0.5, "P( 保留 | t )  =  S_C ( t + c0 )", 16);
  s.addText("S_C 是下线时刻的生存函数，S_C(v) = P(C ≥ v)。即使下线时刻 C 与发动机自身完全无关，这个概率也随 t 单调下降：越老的循环，剩余观测窗越短，越容易被规则丢掉。", { x: M + 0.22, y: 2.6, w: 5.2, h: 1.2, fontFace: CN, fontSize: 11, color: INK, isTextBox: true, margin: 0, valign: "top", lineSpacingMultiple: 1.25 });
  card(s, M, 4.05, 5.6, 2.85, { fill: NAVY, head: "于是权重不是常数", headColor: "F2C46D" });
  formula(s, M + 0.22, 4.6, 5.2, 0.5, "w ( t )  =  1 / S_C ( t + c0 )", 16, WHITE);
  s.addText("论文一里“完全独立删失就不用加权”那句话，在剩余寿命问题里不成立。这是我们和医疗场景的第一个实质差别，写进引言。代码：weight_fn(t) = 1 / max(S(t + c0), 1/训练折台数)。", { x: M + 0.22, y: 5.15, w: 5.2, h: 1.6, fontFace: CN, fontSize: 11, color: ICE, isTextBox: true, margin: 0, valign: "top", lineSpacingMultiple: 1.25 });
  // right: table + three things
  const x0 = 6.6, w0 = W - M - x0;
  card(s, x0, 1.55, w0, 5.35, { head: "示意：权重随循环数变化（数字为示意）" });
  const hdr = { fill: { color: NAVY }, color: WHITE, bold: true, fontFace: CN, fontSize: 11, align: "center", valign: "middle" };
  const cell = { fontFace: EN, fontSize: 11, color: INK, align: "center", valign: "middle", fill: { color: WHITE } };
  const trows = [[{ text: "当前循环 t", options: hdr }, { text: "S_C(t + 30)", options: hdr }, { text: "权重 w", options: hdr }]];
  [["50", "0.95", "1.05"], ["150", "0.50", "2.0"], ["220", "0.20", "5.0"], ["260", "0.10", "10"]].forEach(r => trows.push(r.map(t => ({ text: t, options: { ...cell } }))));
  s.addTable(trows, { x: x0 + 0.3, y: 2.15, w: w0 - 0.6, colW: [(w0 - 0.6) / 3, (w0 - 0.6) / 3, (w0 - 0.6) / 3], rowH: 0.34, border: { type: "solid", color: "D5DCE5", pt: 0.75 } });
  s.addText("含义：晚期循环在校准集里被系统性少采，每一个留下来的都要顶更多人的份。真数字看 s03 打印的 t = 50 到 250 处的权重，以及图 F05。", { x: x0 + 0.3, y: 4.05, w: w0 - 0.6, h: 0.5, fontFace: CN, fontSize: 11, color: GREY, isTextBox: true, margin: 0, valign: "top" });
  s.addText([
    { text: "三件事跟着这个发现走", options: { bold: true, color: NAVY, breakLine: true } },
    { text: "循环序号 t 必须作为协变量进入模型（特征表第一列就是 t）", options: { bullet: true, breakLine: true } },
    { text: "S_C 可以从训练折发动机的下线时刻直接估计，因为 Type-I 下下线时刻是完全观测的", options: { bullet: true, breakLine: true } },
    { text: "脚本里 Cu 与 Cw 只差这一个权重，两行的差就是这个发现的直接证据", options: { bullet: true } },
  ], { x: x0 + 0.3, y: 4.6, w: w0 - 0.6, h: 2.2, fontFace: CN, fontSize: 11, color: INK, isTextBox: true, margin: 0, valign: "top", paraSpaceAfter: 4, lineSpacingMultiple: 1.2 });
  pn(s, 5);
  notes(s, "这一页是写进论文引言的东西。让学生记住那句话：完全随机的下线，在样本层面不是完全随机的删失。\n表里的数字是示意，真数字 s03 会打印 t=50/100/150/200/250 处的权重，F05 画出整条曲线。");
}

// ============ 6 修正二：两层结构 ============
{
  const s = pres.addSlide(); header(s, "修正二：同机相关不再靠权重相乘", "改用两层结构：发动机是第一层，循环是第二层");
  card(s, M, 1.55, 5.6, 2.55, { fill: NAVY, head: "上次的做法为什么不行", headColor: "F2C46D", bodyColor: ICE, body: "删失权重是似然比，来自分布偏移的精确推导。时序权重是“近的样本更像”的启发式，它对应的理论是牺牲一点覆盖率换稳健性，保证形式完全不同。两个相乘，得到的既不是似然比，也不在任何一个定理的覆盖范围内。" });
  card(s, M, 4.25, 5.6, 2.65, { head: "正确的框架", body: "发动机之间可交换，发动机内部的循环相关。这叫两层分层数据，共形预测在这类数据上已有专门结果，不需要自己发明。\n\n把两层结构与删失一起处理并给出保证，是论文方法部分要做的理论工作。文献：Dunn, Wasserman, Ramdas (JASA 2023)；Lee, Barber, Willett (arXiv 2306.06342)。引用前按标题核对。" });
  const x0 = 6.6, w0 = W - M - x0;
  card(s, x0, 1.55, w0, 5.35, { head: "两个方案，今天都跑，代码里各有一个代号" });
  const plans = [
    { tag: "Cw1 · 一机一点", color: GREEN, body: "每台校准发动机随机抽一个保留循环。校准点严格可交换，覆盖率保证是精确的。代价：校准折 40 台机分完只剩几十个点，分位数很粗，下界偏保守。脚本重复 20 次报均值。" },
    { tag: "Cw · 全部循环", color: BLUE, body: "所有保留循环都进校准集。样本多、下界紧，但同机相关让有效样本量远小于名义数。覆盖率还成不成立，靠实验看，而不是靠推。" },
  ];
  plans.forEach((p, i) => {
    const y = 2.15 + i * 2.25;
    s.addShape(pres.shapes.RECTANGLE, { x: x0 + 0.3, y, w: 2.2, h: 0.38, fill: { color: p.color }, line: { color: p.color, width: 0 } });
    s.addText(p.tag, { x: x0 + 0.3, y, w: 2.2, h: 0.38, fontFace: CN, fontSize: 11.5, bold: true, color: WHITE, align: "center", valign: "middle", isTextBox: true, margin: 0 });
    s.addText(p.body, { x: x0 + 0.3, y: y + 0.5, w: w0 - 0.6, h: 1.6, fontFace: CN, fontSize: 11, color: INK, isTextBox: true, margin: 0, valign: "top", lineSpacingMultiple: 1.25 });
  });
  s.addShape(pres.shapes.RECTANGLE, { x: x0 + 0.3, y: 6.15, w: w0 - 0.6, h: 0.6, fill: { color: AMBER_BG }, line: { color: AMBER_BG, width: 0 } });
  s.addText("Cw1 是安全的，Cw 是实用的。论文里两个都报，差距本身就是结果。", { x: x0 + 0.45, y: 6.15, w: w0 - 0.9, h: 0.6, fontFace: CN, fontSize: 11.5, bold: true, color: AMBER, isTextBox: true, margin: 0, valign: "middle" });
  pn(s, 6);
  notes(s, "方案 Cw1 是安全的，方案 Cw 是实用的。论文里两个都报，差距本身就是结果。\n提醒：s02 无删失基线里也有这两版（method_code 为 all 与 one_mean），先在无删失时看两者差多少，再看删失后。");
}

// ============ 7 修正三：不编成本 ============
{
  const s = pres.addSlide(); header(s, "修正三：不编成本参数", "没有真实数字，就不做成本曲线；改报五个指标，都在 summarize_lpb 里算");
  card(s, M, 1.55, 5.6, 2.2, { head: "去掉", headColor: RED, body: "维修触发规则加总成本曲线。拆检成本、停场成本没有真实来源，编出来审稿人一问就穿。以后拿到真实成本再做；拿不到，最多做成本比例的敏感性分析，并明说是敏感性。" });
  card(s, M, 3.9, 5.6, 3.0, { fill: NAVY, head: "下界上限是 c0，这不是缺陷", headColor: "F2C46D", bodyColor: ICE, body: "方法给出的下界永远不超过 c0。也就是说它只回答一个问题：这台机能不能安全飞过接下来 c0 个循环。维修决策问的正是这个，c0 就是决策视野，脚本里跑 20、30、50 三档。" });
  const x0 = 6.6, w0 = W - M - x0;
  card(s, x0, 1.55, w0, 5.35, { head: "改报这五个，s03 结果表每行都有" });
  const items = [
    ["coverage", "总体覆盖率", "P(真实 RUL ≥ 下界)，测试集全部循环，应不低于 90%。"],
    ["cov_dec", "决策区覆盖率", "只看真实 RUL < c0 的样本。这一段报错才出事，其余段下界天然满足。最要紧的数。"],
    ["cov[a,b)", "分段覆盖率", "按真实 RUL 分 [0,15)、[15,30)、[30,60)、[60,125] 四段各报一个。"],
    ["mean_L", "平均下界", "有限下界的均值，衡量紧不紧。永远说“至少 0 个循环”覆盖率也是 100%，所以必须一起看。"],
    ["trivial", "无信息界比例", "下界为负无穷的样本占比。校准集太小或权重太极端时会出现。"],
  ];
  items.forEach((it, i) => {
    const y = 2.1 + i * 0.93;
    badge(s, x0 + 0.3, y + 0.05, i + 1, BLUE, 0.34);
    s.addText([{ text: it[1] + "  ", options: { bold: true, color: NAVY, fontFace: CN } }, { text: it[0], options: { fontFace: EN, color: GREY, bold: true } }], { x: x0 + 0.78, y, w: w0 - 1.1, h: 0.4, fontFace: CN, fontSize: 12, isTextBox: true, margin: 0, valign: "middle" });
    s.addText(it[2], { x: x0 + 0.78, y: y + 0.4, w: w0 - 1.1, h: 0.5, fontFace: CN, fontSize: 10.5, color: INK, isTextBox: true, margin: 0, valign: "top", lineSpacingMultiple: 1.2 });
  });
  pn(s, 7);
  notes(s, "决策区覆盖率是新加的，因为下界被 c0 封顶之后，RUL 大于 c0 的样本覆盖是平凡的，总体覆盖率会被这些样本稀释。\n五个指标的列名和 s03_methods.csv 的列名一致，让学生对着表看。");
}

// ============ 8 样本量 ============
{
  const s = pres.addSlide(); header(s, "样本量：先算再说", "FD001 的真实数字，以及核算公式；核算表由 s03 打印");
  const stats = [["100", "台发动机，训练集全部跑到失效"], ["20631", "行样本，每台平均约 206 个循环"], ["128 – 362", "循环数范围，最短的机只有 128 个循环"]];
  stats.forEach((st, i) => {
    const x = M + i * 4.1;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.55, w: 3.9, h: 1.15, fill: { color: NAVY }, line: { color: NAVY, width: 0 } });
    s.addText(st[0], { x: x + 0.25, y: 1.62, w: 3.4, h: 0.55, fontFace: EN, fontSize: 26, bold: true, color: "F2C46D", isTextBox: true, margin: 0, valign: "middle" });
    s.addText(st[1], { x: x + 0.25, y: 2.17, w: 3.4, h: 0.45, fontFace: CN, fontSize: 11, color: ICE, isTextBox: true, margin: 0, valign: "top" });
  });
  card(s, M, 2.9, 6.0, 4.0, { head: "核算公式" });
  formula(s, M + 0.22, 3.4, 5.6, 0.42, "保留样本数 = Σ_i max( 0, min( O_i, C_i − c0 ) )", 14);
  formula(s, M + 0.22, 3.85, 5.6, 0.42, "保留发动机数 = #{ i : C_i − c0 ≥ 1 }", 14);
  s.addText([
    { text: "O_i = min(F_i, C_i) 是实际观测到的循环数。三台机的手算例子：", options: { breakLine: true } },
    { text: "F=200, C=150 → min(150, 120) = 120", options: { fontFace: EN, breakLine: true } },
    { text: "F=200, C=260 → min(200, 230) = 200", options: { fontFace: EN, breakLine: true } },
    { text: "F=200, C=210 → min(200, 180) = 180", options: { fontFace: EN, breakLine: true } },
    { text: "校准折按 40% 划，FD001 是 40 台。s03 对三档删失率乘四档 c0 各算一遍，写到 s03_accounting.csv，F04 画成图。", options: {} },
  ], { x: M + 0.22, y: 4.4, w: 5.6, h: 2.4, fontFace: CN, fontSize: 11, color: INK, isTextBox: true, margin: 0, valign: "top", lineSpacingMultiple: 1.3 });
  const x0 = 7.0, w0 = W - M - x0;
  card(s, x0, 2.9, w0, 4.0, { fill: AMBER_BG, head: "两条底线", headColor: AMBER, bodyColor: AMBER, body: "第一，校准折保留发动机少于 30 台，一机一点方案（Cw1）不做。90% 分位数在二十几个数上取没有意义。汇报时把低于 30 的组合标出来。\n\n第二，完整的核算表由 s03 打印：三档删失率乘四档 c0。表出来之前，不定删失率的上限。60% 那一档很可能要放弃，放弃就放弃。" });
  pn(s, 8);
  notes(s, "让学生课后填这张表。60% 删失率上次是拍脑袋定的，表出来再决定留不留。\n注意 20631 行是训练集，测试集是 13096 行、100 台，测试机在失效前被截断。");
}

// ============ 9 数据格式 ============
{
  const s = pres.addSlide(); header(s, "数据长什么样：C-MAPSS 文件格式", "26 列，空格分隔，没有表头；s01_inspect.py 把这些都打印出来");
  const hdr = { fill: { color: NAVY }, color: WHITE, bold: true, fontFace: CN, fontSize: 11, valign: "middle" };
  const c1 = { fontFace: EN, fontSize: 11, color: INK, valign: "middle", fill: { color: WHITE } };
  const c2 = { fontFace: CN, fontSize: 10.5, color: INK, valign: "middle", fill: { color: WHITE } };
  const rows = [[{ text: "列", options: hdr }, { text: "内容", options: hdr }, { text: "本次怎么用", options: hdr }]];
  [["1", "发动机编号 unit", "分组键，划分训练与校准按它来；RUL 文件第 k 行对应测试机 k"],
   ["2", "循环序号 t", "作为协变量进模型，修正一的权重也用它"],
   ["3 – 5", "三个工况设置 op1-3", "FD001 单工况，带小噪声，本次不用；FD002/FD004 有 6 种，下次课用"],
   ["6 – 26", "21 个传感器 s1-s21", "去掉 1, 5, 6, 10, 16, 18, 19 七个近零方差的，剩 14 个"]].forEach(r => rows.push([{ text: r[0], options: { ...c1 } }, { text: r[1], options: { ...c2 } }, { text: r[2], options: { ...c2 } }]));
  s.addTable(rows, { x: M, y: 1.55, w: 7.4, colW: [0.9, 2.2, 4.3], rowH: [0.38, 0.5, 0.5, 0.5, 0.5], border: { type: "solid", color: "D5DCE5", pt: 0.75 } });
  card(s, M, 4.15, 7.4, 2.75, { head: "标签与划分", body: "训练集：每台机跑到失效，RUL = F − t，封顶 125（论文二的做法）。add_labels_train。\n测试集：每台机在失效前被截断，RUL 文件给最后一刻的真实 RUL，往前推得每个循环的 RUL。add_labels_test。\n划分：按发动机 60 / 40 分训练折与校准折，种子 2026。比论文二的 90 / 10 多留校准，因为一机一点方案需要足够多的发动机。split_engines。" });
  const x0 = 8.3, w0 = W - M - x0;
  card(s, x0, 1.55, w0, 5.35, { fill: NAVY, head: "特征：build_features", headColor: "F2C46D", bodyColor: ICE, body: "14 个传感器的当前值\n14 个传感器最近 30 个循环的滚动均值\n14 个传感器最近 30 个循环的滚动标准差\n循环序号 t\n\n共 43 维。滚动量只用过去的数据，不会泄漏未来；窗口不足 30 时用已有的算。\n\n点预测器用梯度提升树（HistGradientBoostingRegressor，300 轮），CPU 几秒训完，不需要显卡。这一步不是重点，够用就行，不调参。" });
  pn(s, 9);
  notes(s, "特意说一句：点预测器只求够用。学生最容易在这一步花两周调网络，那是上一个方向的惯性。\ns01 的两个易错点：工况设置带噪声，要按标称间隔取整再数组合；传感器 6 只在两个值间跳，近零方差判据用 0.01。");
}

// ============ 10 六步流程 + 删失怎么造 ============
{
  const s = pres.addSlide(); header(s, "今天要跑通的流程", "六步，脚本 s02 对应无删失版本，s03 对应删失版本");
  const steps = [["读数据", "训练、测试、RUL 三个文件 load_subset"], ["造特征与标签", "43 维特征，RUL 封顶 125"], ["按发动机划分", "60% 训练折，40% 校准折"], ["点预测", "梯度提升树，训练折上拟合 fit_model"], ["共形校准", "校准折上算得分，取加权分位数 weighted_lpb"], ["评估", "测试集全部循环，五个指标 summarize_lpb"]];
  const sw = (W - 2 * M - 5 * 0.15) / 6;
  steps.forEach((st, i) => {
    const x = M + i * (sw + 0.15), y = 1.55, h = 1.75, hot = i === 4;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: sw, h, fill: { color: hot ? NAVY : LIGHT }, line: { color: hot ? NAVY : LIGHT, width: 0 } });
    badge(s, x + 0.18, y + 0.18, i + 1, hot ? "E39B26" : BLUE, 0.36);
    s.addText(st[0], { x: x + 0.18, y: y + 0.62, w: sw - 0.3, h: 0.34, fontFace: CN, fontSize: 12, bold: true, color: hot ? "F2C46D" : NAVY, isTextBox: true, margin: 0 });
    s.addText(st[1], { x: x + 0.18, y: y + 0.98, w: sw - 0.3, h: 0.7, fontFace: CN, fontSize: 9.5, color: hot ? ICE : INK, isTextBox: true, margin: 0, valign: "top", lineSpacingMultiple: 1.15 });
  });
  card(s, M, 3.5, W - 2 * M, 3.4, { head: "s03 在第五步前多两个动作，都在 s03_censoring.py 里" });
  s.addText([
    { text: "造删失 gen_censoring：", options: { bold: true, color: NAVY } },
    { text: "给每台训练机抽一个下线时刻 C_i ~ Uniform(60, U) 取整，与该机寿命 F_i 无关；U 用二分法调到 mean(C_i < F_i) 命中目标删失率 20% / 40% / 60%。下线时刻对每台机都记录，对应论文一的 Type-I 设定，现实含义是计划性退役日期事先知道。观测长度 O_i = min(F_i, C_i)，失效指示 δ_i = 1{F_i ≤ C_i}。种子 2026 + 删失率 × 100，结果可复现。", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "选样本加权 keep / weight_fn：", options: { bold: true, color: NAVY } },
    { text: "按修正一的规则保留 C_i − t ≥ c0 的样本；标签 y = min(RUL, c0) 在保留样本上可观测（失效机且 F − t ≤ c0 取 F − t，否则取 c0）；权重 1 / S_C(t + c0)，S_C 用训练折全部发动机的下线时刻做经验生存函数，分母下限 1 / 训练折台数。", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "两道保险：", options: { bold: true, color: NAVY } },
    { text: "脚本用 assert 核对保留样本上按可观测量算出的标签等于真值 min(RUL, c0)，不等就停；每个删失率开头打印目标与实际删失率，相差超过 0.03 也要停。所有表都写到 results/，s04 只读这些 CSV，不再碰模型。", options: {} },
  ], { x: M + 0.22, y: 4.05, w: W - 2 * M - 0.44, h: 2.75, fontFace: CN, fontSize: 11, color: INK, isTextBox: true, margin: 0, valign: "top", lineSpacingMultiple: 1.3 });
  pn(s, 10);
  notes(s, "流程图上的第五步是唯一有统计内容的一步，其余都是数据工程。\n造删失那段要强调两点：与寿命无关（这是本次的假设，下次课换成依赖工况）；每台机的 C_i 都记录（Type-I），所以 S_C 直接用经验分布，不用 Kaplan-Meier。");
}

// ============ 11 下界怎么算 ============
{
  const s = pres.addSlide(); header(s, "下界怎么算，一页够", "无删失时权重全为 1，退化成普通分裂共形；三行公式对应 weighted_lpb 里的三段代码");
  const rows = [
    ["得分", "V_j  =  m̂ ( x_j )  −  y_j ,    y_j  =  min ( RUL_j ,  c0 )", "预测值减真值。预测偏高得分为正，这正是我们要防的方向。", "V = yhat_cal − y_cal"],
    ["临界值", "η ( x )  =  Quantile_{1−α} ( Σ_j p_j δ_{V_j}  +  p_∞ δ_∞ )", "加权经验分位数。p_j 正比于 w_j，p_∞ 正比于测试点自己的权重 w(x)。", "thr = (1−α)(Σw + w_test)\nidx = searchsorted(cumw, thr)\nη = V_sorted[idx]，越界则 η = ∞"],
    ["下界", "L ( x )  =  ( m̂ ( x )  −  η ( x ) )  ∧  c0", "预测值减去安全边际，再用 c0 封顶。", "L = yhat_test − η\nL = minimum(L, cap)"],
  ];
  rows.forEach((r, i) => {
    const y = 1.55 + i * 1.5, h = 1.35;
    card(s, M, y, W - 2 * M, h, {});
    badge(s, M + 0.25, y + 0.22, i + 1, "E39B26");
    s.addText(r[0], { x: M + 0.8, y: y + 0.18, w: 1.0, h: 0.45, fontFace: CN, fontSize: 13, bold: true, color: NAVY, isTextBox: true, margin: 0, valign: "middle" });
    formula(s, M + 1.9, y + 0.15, 5.6, 0.5, r[1], 14);
    s.addText(r[2], { x: M + 1.9, y: y + 0.68, w: 5.6, h: 0.62, fontFace: CN, fontSize: 10.5, color: GREY, isTextBox: true, margin: 0, valign: "top", lineSpacingMultiple: 1.2 });
    s.addShape(pres.shapes.RECTANGLE, { x: M + 7.8, y: y + 0.15, w: W - 2 * M - 8.0, h: h - 0.3, fill: { color: NAVY }, line: { color: NAVY, width: 0 } });
    s.addText(r[3], { x: M + 8.0, y: y + 0.15, w: W - 2 * M - 8.4, h: h - 0.3, fontFace: "Courier New", fontSize: 10.5, color: "F2C46D", isTextBox: true, margin: 0, valign: "middle", lineSpacingMultiple: 1.2 });
  });
  s.addShape(pres.shapes.RECTANGLE, { x: M, y: 6.1, w: W - 2 * M, h: 0.8, fill: { color: AMBER_BG }, line: { color: AMBER_BG, width: 0 } });
  s.addText("权重极端时 p_∞ 会接近 1，η 变成无穷，下界变成负无穷。脚本对 S_C 设了下限截断，并单独统计这类无信息界的比例 trivial。两侧区间（论文二那种）另在 split_conformal_twosided 里，得分 |y − m̂|，只在 s02 里用来确认复现无误。", { x: M + 0.25, y: 6.1, w: W - 2 * M - 0.5, h: 0.8, fontFace: CN, fontSize: 11, color: AMBER, isTextBox: true, margin: 0, valign: "middle", lineSpacingMultiple: 1.2 });
  pn(s, 11);
  notes(s, "不要推导。让学生对照脚本里 weighted_lpb 那个函数看，三行公式对应三段代码。\n讲清 searchsorted 那一步：把校准得分排序、权重累加，找第一个累计权重达到阈值的位置，那里的得分就是 η。");
}

// ============ 12 六条对比线 ============
{
  const s = pres.addSlide(); header(s, "六条对比线，代号与代码一致", "s03 对每个删失率和 c0 各跑一遍，结果表 s03_methods.csv 的 method_code 列就是这六个代号");
  const hdr = { fill: { color: NAVY }, color: WHITE, bold: true, fontFace: CN, fontSize: 11, valign: "middle", align: "center" };
  const cc = { fontFace: EN, fontSize: 12, bold: true, valign: "middle", align: "center", fill: { color: WHITE } };
  const ct = { fontFace: CN, fontSize: 10.5, color: INK, valign: "middle", fill: { color: WHITE } };
  const colors = { E: INK, A: RED, B: "E39B26", Cu: GREY, Cw: BLUE, Cw1: GREEN };
  const rows = [[{ text: "代号", options: hdr }, { text: "做法", options: hdr }, { text: "训练与校准用什么", options: hdr }, { text: "作用", options: hdr }]];
  [["E", "无删失参照", "完整数据，标签 min(RUL, c0)", "上界参照：删失造成的损失有多大"],
   ["A", "丢弃删失机", "只用跑到失效的发动机", "常见错误做法一：样本变少，且分布有偏"],
   ["B", "把下线当失效", "观测到的全部行，标签 min(O_i − t, c0)", "常见错误做法二：标签系统性偏低"],
   ["Cu", "选样本，不加权", "保留 C_i − t ≥ c0 的样本，权重 1", "消融：不修正 t 引起的偏移"],
   ["Cw", "选样本，加权", "同上，权重 1 / S_C(t + c0)，全部保留循环校准", "现行方法"],
   ["Cw1", "选样本，加权，一机一点", "同上，每台校准机抽一个循环，重复 20 次取均值", "校准点严格可交换的版本"]].forEach(r => rows.push([
     { text: r[0], options: { ...cc, color: colors[r[0]] } }, { text: r[1], options: { ...ct, bold: true, color: NAVY } }, { text: r[2], options: { ...ct } }, { text: r[3], options: { ...ct } }]));
  s.addTable(rows, { x: M, y: 1.55, w: W - 2 * M, colW: [1.0, 2.6, 4.4, 4.13], rowH: [0.4, 0.55, 0.55, 0.55, 0.55, 0.55, 0.55], border: { type: "solid", color: "D5DCE5", pt: 0.75 } });
  card(s, M, 5.55, 5.9, 1.35, { head: "两组对照各说明一件事", headSize: 12, body: "Cu 对 Cw：只差权重，差就是修正一副产品的证据。\nCw 对 Cw1：只差校准点是全部循环还是一机一点，差就是修正二两个方案的代价。" });
  card(s, M + 6.1, 5.55, W - 2 * M - 6.1, 1.35, { fill: NAVY, head: "读表先看哪一列", headSize: 12, headColor: "F2C46D", bodyColor: ICE, body: "先看 cov_dec，再看 mean_L，最后看 trivial。E 是天花板，A 与 B 应该明显差，Cw 应该接近 E。不符合预期，改的是解释，不是数据。" });
  pn(s, 12);
  notes(s, "上次讲稿里说五条线，代码里是六条：多了 Cw1。A 在删失率 60% 时校准折失效机可能很少，脚本会照跑，但那一行不可信。\nE 不依赖删失率，脚本按 c0 缓存，三档删失率共用。");
}

// ============ 13 评估协议 ============
{
  const s = pres.addSlide(); header(s, "评估协议", "测试集怎么用，分段怎么分");
  card(s, M, 1.55, 5.9, 2.35, { head: "用测试集的全部循环，不只用最后一点", body: "论文二只用每台测试机的最后一个循环，FD001 一共 100 个点，分段之后每段十几个，没法看。测试机每个循环的真实 RUL 都能从 RUL 文件往前推，全部用上有 13096 个点。" });
  card(s, M, 4.05, 5.9, 2.85, { fill: NAVY, head: "但要说清楚一件事", headColor: "F2C46D", bodyColor: ICE, body: "13096 个点来自 100 台机，同机高度相关。覆盖率的点估计没问题，但它的不确定性要按 100 台机算，不能按 13096 算。论文里写清楚这一句，审稿人就不会拿它做文章。\n\n另一件事：测试机是在失效前随机截断的，靠近失效的点比训练集少，决策区的点数 n_dec 会明显少于总数，表里单独给了。" });
  const x0 = 6.9, w0 = W - M - x0;
  card(s, x0, 1.55, w0, 5.35, { head: "按真实 RUL 分四段" });
  const hdr = { fill: { color: NAVY }, color: WHITE, bold: true, fontFace: CN, fontSize: 11, valign: "middle", align: "center" };
  const c1 = { fontFace: EN, fontSize: 11, color: INK, valign: "middle", align: "center", fill: { color: WHITE } };
  const c2 = { fontFace: CN, fontSize: 10.5, color: INK, valign: "middle", align: "center", fill: { color: WHITE } };
  const rows = [[{ text: "段", options: hdr }, { text: "含义", options: hdr }, { text: "c0 = 30 时", options: hdr }]];
  [["[0, 15)", "临近失效", "决策区，最要紧"], ["[15, 30)", "短", "决策区"], ["[30, 60)", "中", "下界被封顶，覆盖趋于平凡"], ["[60, 125]", "长", "同上"]].forEach(r => rows.push([{ text: r[0], options: { ...c1 } }, { text: r[1], options: { ...c2 } }, { text: r[2], options: { ...c2 } }]));
  s.addTable(rows, { x: x0 + 0.3, y: 2.15, w: w0 - 0.6, colW: [1.3, 1.3, w0 - 0.6 - 2.6], rowH: 0.4, border: { type: "solid", color: "D5DCE5", pt: 0.75 } });
  s.addText([
    { text: "分段的边界跟着 c0 走。c0 换成 50，决策区就是前三段；c0 = 20 时决策区是第一段加第二段的前一半，表里用 cov_dec 直接给。", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "脚本同时打印总体覆盖率和决策区覆盖率，两个数一起看：总体达标而决策区不达标，就是论文二自己承认的那个问题，也是论文一 Theorem 5 条件覆盖不可能的具体形态。", options: {} },
  ], { x: x0 + 0.3, y: 4.35, w: w0 - 0.6, h: 2.4, fontFace: CN, fontSize: 11, color: INK, isTextBox: true, margin: 0, valign: "top", lineSpacingMultiple: 1.3 });
  pn(s, 13);
  notes(s, "决策区那两段是全部实验的落脚点。其余段打印出来只是为了完整。\n如果有学生问“为什么不按发动机做 bootstrap 算置信区间”，回答：下次课做，这次先把点估计跑出来。");
}

// ============ 14 五个脚本 ============
{
  const s = pres.addSlide(); header(s, "五个脚本，按顺序跑", "每一个的输出都要贴回来；只改脚本顶部的 DATA_DIR，或把数据目录作为命令行参数传入");
  const rows = [
    ["0", "s00_env.py", "环境自检", "打印 Python 与 numpy / pandas / scikit-learn / matplotlib 版本，宋体与 Times New Roman 字体文件是否存在，FD001 三个文件是否齐全。", "四个包有版本号；两个字体都“有”", GREY],
    ["1", "s01_inspect.py", "探查结构", "打印四个子集每个文件的形状、前五行、发动机台数、每台循环数、各列标准差、工况组合数。不建模。", "26 列无 NaN；训练 100 台 20631 行；近零方差传感器 1,5,6,10,16,18,19；FD001 工况组合 1", BLUE],
    ["2", "s02_baseline.py", "无删失基线", "跑通六步流程。先算论文二那种两侧区间确认复现无误；再算一侧下界，全部循环校准与一机一点校准各一版。", "两侧区间覆盖率 0.87 到 0.93；两行下界覆盖率不明显低于 0.85；results/ 出现 4 个 s02 文件", GREEN],
    ["3", "s03_censoring.py", "删失版本", "先打印样本量核算表；再对三档删失率乘三档 c0 跑六条线；断言保留样本标签与真值一致。约几分钟。", "实际删失率与目标差不超过 0.03；核算表记录校准折保留发动机数；断言不触发", "E39B26"],
    ["4", "s04_figures.py", "出图", "matplotlib 读 results/ 的 CSV 出 11 张图到 figures/，宋体五号，Times New Roman 五号，PNG 与 PDF 各一份。", "22 个文件；日志无“回退到替代字体”；F07 到 F09 目视无乱码", RED],
  ];
  rows.forEach((r, i) => {
    const y = 1.5 + i * 1.08, h = 0.98;
    card(s, M, y, W - 2 * M, h, {});
    badge(s, M + 0.22, y + 0.28, r[0], r[5], 0.4);
    s.addText(r[1], { x: M + 0.8, y: y + 0.12, w: 2.1, h: 0.4, fontFace: "Courier New", fontSize: 12, bold: true, color: NAVY, isTextBox: true, margin: 0, valign: "middle" });
    s.addText(r[2], { x: M + 0.8, y: y + 0.5, w: 2.1, h: 0.35, fontFace: CN, fontSize: 10.5, color: GREY, isTextBox: true, margin: 0, valign: "middle" });
    s.addText(r[3], { x: M + 3.0, y: y + 0.1, w: 5.0, h: h - 0.2, fontFace: CN, fontSize: 10, color: INK, isTextBox: true, margin: 0, valign: "middle", lineSpacingMultiple: 1.2 });
    s.addShape(pres.shapes.RECTANGLE, { x: M + 8.2, y: y + 0.12, w: W - 2 * M - 8.4, h: h - 0.24, fill: { color: AMBER_BG }, line: { color: AMBER_BG, width: 0 } });
    s.addText([{ text: "验收：", options: { bold: true } }, { text: r[4], options: {} }], { x: M + 8.35, y: y + 0.12, w: W - 2 * M - 8.7, h: h - 0.24, fontFace: CN, fontSize: 10, color: AMBER, isTextBox: true, margin: 0, valign: "middle", lineSpacingMultiple: 1.2 });
  });
  s.addText("或者双击 run_all.bat（可带数据目录参数），日志在 logs/。顺序不能乱：s01 的输出如果和第 9 页说的格式不一样，先停下来，不要跑 s02。跑不通贴报错，不要自己改代码。", { x: M, y: 6.95, w: W - 2 * M, h: 0.4, fontFace: CN, fontSize: 10.5, color: GREY, isTextBox: true, margin: 0, valign: "top" });
  pn(s, 14);
  notes(s, "顺序不能乱。s01 不贴回来，s02 跑出问题分不清是数据还是代码。\n验收标准照移交文档第 5 节，这里是缩写。汇报格式在移交文档第 9 节：控制台输出原样贴，不总结成“覆盖率良好”。");
}

// ============ 15 十一张图 ============
{
  const s = pres.addSlide(); header(s, "跑完会得到 11 张图", "s04_figures.py 用 matplotlib 生成，宋体五号，Times New Roman 五号，PNG 与 PDF 各一份；只出这 11 张，不自行加图");
  const figs = [
    ["F01", "失效循环数分布", "数据描述", false], ["F07", "总体与决策区覆盖率随删失率", "主结果", true],
    ["F02", "传感器退化轨迹", "数据描述", false], ["F08", "分段覆盖率柱状图，各方法", "主结果", true],
    ["F03", "删失时间线：保留、丢弃、失效、删失", "第 4 页的图，用真数据画", false], ["F09", "决策区覆盖率 对 平均下界", "覆盖率与紧度的取舍，主结果", true],
    ["F04", "样本量核算随 c0", "第 8 页的表，画成图", false], ["F10", "一台测试机的真实 RUL 与各方法下界", "最直观的一张", false],
    ["F05", "权重 w(t) 随 t", "第 5 页的表，画成图", false], ["F11", "两侧区间排序图", "复现论文二的图", false],
    ["F06", "基线分段覆盖：全部循环 vs 一机一点", "第 6 页两方案的差，无删失时", false],
  ];
  const cw = (W - 2 * M - 0.3) / 2;
  figs.forEach((f, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * (cw + 0.3), y = 1.5 + row * 0.86, h = 0.76;
    const fill = f[3] ? AMBER_BG : LIGHT;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: cw, h, fill: { color: fill }, line: { color: fill, width: 0 } });
    s.addText(f[0], { x: x + 0.2, y, w: 0.8, h, fontFace: EN, fontSize: 13, bold: true, color: f[3] ? AMBER : NAVY, isTextBox: true, margin: 0, valign: "middle" });
    s.addText(f[1], { x: x + 1.05, y: y + 0.08, w: cw - 1.2, h: 0.34, fontFace: CN, fontSize: 11.5, bold: true, color: NAVY, isTextBox: true, margin: 0, valign: "middle" });
    s.addText(f[2], { x: x + 1.05, y: y + 0.42, w: cw - 1.2, h: 0.3, fontFace: CN, fontSize: 10, color: GREY, isTextBox: true, margin: 0, valign: "middle" });
  });
  s.addText("橙色三张是论文实验节的主结果图，其余用于课件和数据描述。图的编号和文件名一致。重点删失率与 c0 在脚本顶部的 FOCUS_RATE（0.40）、FOCUS_C0（30）改。", { x: M, y: 6.75, w: W - 2 * M, h: 0.5, fontFace: CN, fontSize: 10.5, color: GREY, isTextBox: true, margin: 0, valign: "top" });
  pn(s, 15);
  notes(s, "F07 到 F09 是论文实验节的三张图。F10 给学生看最直观。\n所有图注都要写明删失是人工构造的。");
}


// ============ 16 真实数据：验收对照 ============
const FIG = process.env.FIG_DIR || path.join(__dirname, "..", "..", "03_code", "figures");
const fs = require("fs");
function fig(s, name, x, y, w, h) {
  const path = FIG + "/" + name + ".png";
  if (fs.existsSync(path)) s.addImage({ path, x, y, w, h });
  else s.addText("缺图 " + name, { x, y, w, h, fontFace: CN, fontSize: 12, color: RED, align: "center", valign: "middle", isTextBox: true, margin: 0 });
}
const PREVIEW_NOTE = "图为 Linux 预览版（替代字体 Liberation Serif 与文泉驿）。论文用图在 Windows 上重跑 s04_figures.py 即为宋体五号与 Times New Roman 五号。删失为人工构造。";
{
  const s = pres.addSlide(); header(s, "真实数据跑出来了：验收对照", "FD001，Python 3.11，numpy 2.4，pandas 3.0，scikit-learn 1.9，matplotlib 3.11；五个脚本全部退出码 0");
  const hdr = { fill: { color: NAVY }, color: WHITE, bold: true, fontFace: CN, fontSize: 11, valign: "middle" };
  const c1 = { fontFace: CN, fontSize: 10.5, color: INK, valign: "middle", fill: { color: WHITE } };
  const c2 = { fontFace: EN, fontSize: 10.5, color: INK, valign: "middle", fill: { color: WHITE } };
  const rows = [[{ text: "脚本", options: hdr }, { text: "验收项", options: hdr }, { text: "要求", options: hdr }, { text: "实际", options: hdr }]];
  [["s01", "训练集", "100 台，20631 行，循环 128 到 362", "100 台，20631 行，128 到 362"],
   ["s01", "测试集 / RUL 文件", "100 台 13096 行 / 100 行", "100 台 13096 行 / 100 行"],
   ["s01", "近零方差传感器", "1, 5, 6, 10, 16, 18, 19", "1, 5, 6, 10, 16, 18, 19（传感器 6 的 std = 0.0014）"],
   ["s01", "工况组合数", "FD001 为 1，FD002 / FD004 为 6", "1，6，6"],
   ["s02", "两侧区间覆盖率（全部循环）", "0.87 到 0.93", "0.896（q = 28.8，宽 57.7）"],
   ["s02", "一侧下界覆盖率", "不明显低于 0.85", "全部循环 0.934；一机一点 0.948"],
   ["s03", "实际删失率与目标之差", "不超过 0.03", "0.20 / 0.40 / 0.60，差为 0"],
   ["s03", "标签核对断言", "不触发", "未触发；results/ 15 个 s03 文件"]].forEach(r => rows.push([
     { text: r[0], options: { ...c2, bold: true, color: NAVY } }, { text: r[1], options: { ...c1 } }, { text: r[2], options: { ...c1 } }, { text: r[3], options: { ...c1, color: GREEN, bold: true } }]));
  s.addTable(rows, { x: M, y: 1.55, w: W - 2 * M, colW: [0.9, 2.9, 4.0, 4.33], rowH: 0.45, border: { type: "solid", color: "D5DCE5", pt: 0.75 } });
  card(s, M, 5.85, W - 2 * M, 1.05, { fill: AMBER_BG, headSize: 12, head: "点预测精度只求够用", headColor: AMBER, bodyColor: AMBER, body: "RMSE：测试机最后一循环 17.2，测试全部循环 16.6，校准折 16.3。论文二报的量级相当。没有调参，也不打算调。" });
  pn(s, 16);
  notes(s, "这一页对着移交文档第 5 节念，一条一行。全部通过。\n传感器 6 的 std 是 0.0014，所以判据必须是 0.01 而不是 0.001，这是代码里改过的一处。");
}

// ============ 17 核算表与权重 ============
{
  const s = pres.addSlide(); header(s, "结果一：样本量核算与权重曲线", "F04 与 F05，s03 的 [A] 表和权重打印画成图");
  fig(s, "F04_sample_accounting", M, 1.5, 7.6, 3.33);
  fig(s, "F05_weights_vs_t", M + 7.8, 1.5, 4.33, 3.31);
  card(s, M, 5.0, 5.9, 1.9, { headSize: 12, head: "核算表说了什么", body: "保留样本占观测样本的比例：删失 20% 时 94% 到 99%，60% 时 79% 到 96%。校准折保留发动机在全部 12 个组合里都是 40 台，因为下线时刻下限 C_MIN = 60 大于最大的 c0 = 50。作业二的答案：按这一列，60% 那档不用放弃。" });
  card(s, M + 6.1, 5.0, W - 2 * M - 6.1, 1.9, { fill: NAVY, headSize: 12, head: "权重说了什么", headColor: "F2C46D", bodyColor: ICE, body: "删失 20% 时权重最大 1.6，接近常数；40% 和 60% 时晚期循环权重到 60，也就是下限 1 / 训练折台数被触发。删失越重、t 越大，留下来的样本要顶越多人的份。这就是第 5 页那个发现的真数据版本。" });
  s.addText(PREVIEW_NOTE, { x: M, y: 6.98, w: W - 2 * M, h: 0.3, fontFace: CN, fontSize: 9, color: GREY, isTextBox: true, margin: 0 });
  pn(s, 17);
  notes(s, "F04 右图是一条水平线，40 台。让学生说出为什么：C_MIN = 60 > c0。如果把 C_MIN 调到 20，这条线就会掉下来。\nF05 权重在 t 大于 250 处顶到 60，是下限截断在起作用，不是真实似然比。");
}

// ============ 18 主结果一 ============
{
  const s = pres.addSlide(); header(s, "结果二：总体覆盖率与决策区覆盖率随删失率", "F07，c0 = 30；左总体，右决策区（真实 RUL < 30，307 个测试点）");
  fig(s, "F07_coverage_vs_censoring_rate", M, 1.5, 7.6, 3.8);
  const hdr = { fill: { color: NAVY }, color: WHITE, bold: true, fontFace: CN, fontSize: 10, valign: "middle", align: "center" };
  const cc = { fontFace: EN, fontSize: 10, color: INK, valign: "middle", align: "center", fill: { color: WHITE } };
  const rows = [[{ text: "cov_dec, c0 = 30", options: hdr }, { text: "20%", options: hdr }, { text: "40%", options: hdr }, { text: "60%", options: hdr }]];
  [["E", "0.450", "0.450", "0.450"], ["A", "0.436", "0.384", "0.570"], ["B", "0.593", "0.528", "0.941"], ["Cu", "0.427", "0.287", "0.550"], ["Cw", "0.430", "0.388", "0.567"], ["Cw1", "0.542", "0.487", "0.610"]].forEach(r => rows.push(r.map((t, i) => ({ text: t, options: { ...cc, bold: i === 0, color: i === 0 ? NAVY : INK } }))));
  s.addTable(rows, { x: M + 7.8, y: 1.5, w: W - 2 * M - 7.8, colW: [1.63, 0.9, 0.9, 0.9], rowH: 0.42, border: { type: "solid", color: "D5DCE5", pt: 0.75 } });
  s.addText("总体覆盖率六条线都在 0.98 到 0.99，名义 0.90。决策区没有一条到 0.90，连无删失参照 E 也只有 0.45。", { x: M + 7.8, y: 4.5, w: W - 2 * M - 7.8, h: 0.8, fontFace: CN, fontSize: 10.5, color: INK, isTextBox: true, margin: 0, valign: "top", lineSpacingMultiple: 1.25 });
  card(s, M, 5.5, W - 2 * M, 1.4, { fill: NAVY, headSize: 12, head: "这不是 bug，这是已知问题 1 的真数据形态", headColor: "F2C46D", bodyColor: ICE, body: "y = min(RUL, c0) 之后，13096 个测试点里 12789 个 y = 30，下界封顶后天然覆盖。90% 的保证全花在它们身上，决策区的 307 个点没有自己的保证。论文一 Theorem 5 说的条件覆盖不可能，论文二承认的分段问题，就长这样。下次课的 Mondrian 校准正是冲这个来的。" });
  s.addText(PREVIEW_NOTE, { x: M, y: 6.98, w: W - 2 * M, h: 0.3, fontFace: CN, fontSize: 9, color: GREY, isTextBox: true, margin: 0 });
  pn(s, 18);
  notes(s, "先让学生看左图，再看右图，问：哪个数该报进论文？答：右图。\n不要替结果辩护。E 都只有 0.45，说明这是方法框架的问题，不是删失处理的问题。这是本次实验最重要的发现，也是下次课的起点。");
}

// ============ 19 主结果二 ============
{
  const s = pres.addSlide(); header(s, "结果三：分段覆盖率，以及覆盖率与紧度的取舍", "F08 与 F09，删失率 40%，c0 = 30");
  fig(s, "F08_stratified_coverage_by_method", M, 1.5, 6.6, 3.3);
  fig(s, "F09_coverage_vs_tightness", M + 6.9, 1.5, 5.2, 3.9);
  card(s, M, 5.5, 5.9, 1.4, { headSize: 12, head: "Cu 对 Cw：作业三的答案", body: "40% 删失、c0 = 30：决策区覆盖率 0.287 到 0.388；c0 = 50：0.399 到 0.546。只差一个权重。20% 删失时两者几乎没差，因为权重最大才 1.6。" });
  card(s, M + 6.1, 5.5, W - 2 * M - 6.1, 1.4, { fill: NAVY, headSize: 12, head: "B 看起来最好，其实最保守", headColor: "F2C46D", bodyColor: ICE, body: "B 把下线当失效，标签系统性偏低，下界跟着偏低，所以决策区覆盖率最高、平均下界最低。60% 删失、c0 = 50 时它的平均下界 29，E 是 46。F09 里它在左上角：覆盖高，紧度差。" });
  s.addText(PREVIEW_NOTE, { x: M, y: 6.98, w: W - 2 * M, h: 0.3, fontFace: CN, fontSize: 9, color: GREY, isTextBox: true, margin: 0 });
  pn(s, 19);
  notes(s, "F08 里 [30,60) 和 [60,125] 两段全部是 1.0，这是封顶的必然结果，不是成绩。\nF09 右上为好。Cw1 比 Cw 覆盖高、下界低，是一机一点的代价；trivial 在 60% 时最多 0.9%。");
}

// ============ 20 直观 ============
{
  const s = pres.addSlide(); header(s, "结果四：一台测试机的轨迹，和校准折的删失时间线", "F10 与 F03，删失率 40%，c0 = 30");
  fig(s, "F10_single_engine_trajectory", M, 1.5, 6.6, 3.3);
  fig(s, "F03_censoring_timeline", M + 6.9, 1.5, 5.2, 2.93);
  card(s, M, 5.0, W - 2 * M, 1.9, { headSize: 12, head: "怎么看 F10", body: "黑线是真实 RUL，彩线是各方法的下界，虚线是 c0。大部分时间所有下界都贴着 c0 走，这就是“天然覆盖”。真正有信息的只有最后几十个循环：下界开始往下走，能不能走到黑线之下，就是决策区覆盖率在数的东西。B 的线最早往下掉，所以它覆盖高、下界松。F03 是第 4 页那张示意图的真数据版：绿色保留，橙色是每台机最后 30 个循环，实心失效，空心删失。" });
  s.addText(PREVIEW_NOTE, { x: M, y: 6.98, w: W - 2 * M, h: 0.3, fontFace: CN, fontSize: 9, color: GREY, isTextBox: true, margin: 0 });
  pn(s, 20);
  notes(s, "F10 给学生看最直观。让他们指出哪一段是决策区。\nF03 里空心点后面的橙色段就是修正一丢掉的样本，让学生数一下删失机和失效机各丢了多少。");
}

// ============ 21 结果怎么读 ============
{
  const s = pres.addSlide(); header(s, "结果怎么读：五句话", "不改数据，不删结果，改的是解释");
  const items = [
    ["总体覆盖率不是要看的数", "六条线总体 0.96 到 0.99，决策区 0.18 到 0.67。边际保证被远离失效的样本稀释，无删失参照 E 也只有 0.45。这是方法框架层面的问题，优先级最高。"],
    ["加权有效，但只在删失重的时候", "40% 删失时 Cw 比 Cu 决策区覆盖率高 0.10 到 0.15；20% 时权重接近 1，两者没差。第 5 页的发现在真数据上成立。"],
    ["B 的高覆盖是偏保守换来的", "把下线当失效让标签偏低，60% 删失、c0 = 50 时平均下界 29 对 46。覆盖率和紧度必须一起看，这就是修正三要报平均下界的原因。"],
    ["一机一点更稳也更松", "Cw1 决策区覆盖率比 Cw 高 0.04 到 0.24，平均下界低 0.2 到 1.7，无信息界最多 0.9%。校准点少的代价。"],
    ["A 在 60% 时不可信", "校准折只剩 16 台失效机，它的数字不进论文。校准折保留发动机 40 台这一列没有拦住它，因为拦的是 C 方法。"],
  ];
  items.forEach((it, i) => {
    const y = 1.5 + i * 1.08, h = 0.98;
    card(s, M, y, W - 2 * M, h, {});
    badge(s, M + 0.22, y + 0.28, i + 1, i === 0 ? RED : BLUE, 0.4);
    s.addText(it[0], { x: M + 0.8, y: y + 0.1, w: 3.4, h: h - 0.2, fontFace: CN, fontSize: 12, bold: true, color: NAVY, isTextBox: true, margin: 0, valign: "middle" });
    s.addText(it[1], { x: M + 4.3, y: y + 0.1, w: W - 2 * M - 4.5, h: h - 0.2, fontFace: CN, fontSize: 10.5, color: INK, isTextBox: true, margin: 0, valign: "middle", lineSpacingMultiple: 1.2 });
  });
  s.addText("以上数字都来自 results/s03_methods.csv 与 logs/s03.txt，删失为人工构造（Type-I，与寿命独立）。下一步：按 m̂(x) < c0 分组的 Mondrian 校准。", { x: M, y: 6.95, w: W - 2 * M, h: 0.35, fontFace: CN, fontSize: 10, color: GREY, isTextBox: true, margin: 0 });
  pn(s, 21);
  notes(s, "第一句最重要，其余四句是它之下的细节。学生若问“那这篇论文还能写吗”，答：能，因为现在知道了要解决什么。E 都不达标，说明决策区需要自己的校准，这正是 Mondrian 那一步存在的理由。");
}

// ============ 22 作业与下次课 ============
{
  const s = pres.addSlide(); s.background = { color: NAVY };
  s.addText("作业与下次课", { x: M, y: 0.45, w: 10, h: 0.7, fontFace: CN, fontSize: 26, bold: true, color: WHITE, isTextBox: true, margin: 0 });
  const hw = [
    ["作业一", "五个 Python 脚本跑通，控制台输出和图贴到群里，按移交文档第 9 节的顺序。跑不通的贴报错，不要自己改代码。"],
    ["作业二", "看 s03 的核算表，回答：60% 删失率那一档要不要保留。理由只能是“校准折保留发动机”那一列的数。"],
    ["作业三", "对比 s03 结果表里 Cu 和 Cw 的 cov_dec，用一句话解释差从哪来。答案在第 5 页。再对比 Cw 和 Cw1 的 mean_L，说这是谁的代价。"],
  ];
  hw.forEach((h, i) => {
    const y = 1.4 + i * 1.2;
    s.addShape(pres.shapes.RECTANGLE, { x: M, y, w: W - 2 * M, h: 1.05, fill: { color: "1F3352" }, line: { color: "1F3352", width: 0 } });
    s.addText(h[0], { x: M + 0.3, y, w: 1.4, h: 1.05, fontFace: CN, fontSize: 14, bold: true, color: "F2C46D", isTextBox: true, margin: 0, valign: "middle" });
    s.addText(h[1], { x: M + 1.9, y, w: W - 2 * M - 2.2, h: 1.05, fontFace: CN, fontSize: 12, color: ICE, isTextBox: true, margin: 0, valign: "middle", lineSpacingMultiple: 1.25 });
  });
  s.addText("下次课", { x: M, y: 5.15, w: 4, h: 0.4, fontFace: CN, fontSize: 15, bold: true, color: WHITE, isTextBox: true, margin: 0 });
  s.addText([
    { text: "先对作业二、作业三的答案。", options: { breakLine: true } },
    { text: "按预测值分组做 Mondrian 校准：校准集按 m̂(x) < c0 与否分两组各取分位数，让决策区有自己的保证。这是对“总体达标、决策区不达标”最直接的处理。", options: { breakLine: true } },
    { text: "把 FD002 与 FD004 合起来用（509 台，6 种工况），让下线时刻分布随工况变化，做依赖协变量的删失。", options: { breakLine: true } },
    { text: "把点预测换成分位数回归，做 CQR 版本的下界，看紧度提升多少。c0 怎么选：论文一的做法是在训练折里留一块试。", options: {} },
  ], { x: M, y: 5.6, w: W - 2 * M, h: 1.7, fontFace: CN, fontSize: 11.5, color: MID, isTextBox: true, margin: 0, valign: "top", lineSpacingMultiple: 1.3, paraSpaceAfter: 3 });
  notes(s, "作业二和作业三都有标准答案，下次课开头先对答案。\n作业二答案：校准折保留发动机在全部组合里都是 40 台，按这一列 60% 不放弃；但 A 在 60% 时只有 16 台失效机，A 那一行不可信。\n作业三答案：40% 删失、c0 = 30，Cu 0.287 对 Cw 0.388，差来自权重 1/S_C(t+c0)；Cw1 的 mean_L 更低是一机一点校准点少的代价。\n下次课的第一项 Mondrian 校准是移交文档里下一步的第一优先级，提前让学生读论文一第 6.2 节。");
}

pres.writeFile({ fileName: path.join(__dirname, "..", "第二次课_从想法到能跑的东西.pptx") }).then(f => console.log("written", f));
