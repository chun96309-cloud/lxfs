# -*- coding: utf-8 -*-
# s04_figures.R   读取 results/ 里的 CSV 与原始训练文件, 输出论文与课件用图到 figures/。
#
# 字体: 中文 宋体 五号 (10.5 pt), 西文与数字 Times New Roman 五号 (10.5 pt)。
# 每张图同时输出 PNG (300 dpi) 与 PDF。只出下面列出的图, 不多画。
#
# 运行: Rscript s04_figures.R              (先跑完 s02, s03)
#       Rscript s04_figures.R E:/cmapss    (命令行给数据目录, 覆盖下面的 DATA_DIR)
# 只改下面的 DATA_DIR。R 4.5。缺包会自动安装。

pkgs <- c("ggplot2", "dplyr", "tidyr", "showtext")
for (p in pkgs) if (!requireNamespace(p, quietly = TRUE)) install.packages(p, repos = "https://cloud.r-project.org")
suppressPackageStartupMessages({
  library(ggplot2); library(dplyr); library(tidyr); library(showtext)
})

# ============ 参数 ============
DATA_DIR   <- "E:/cmapss"          # 原始数据目录 (与 s01-s03 一致)
FOCUS_RATE <- 0.40                 # 重点展示的删失率
FOCUS_C0   <- 30                   # 重点展示的观测视野
# =============================

cli <- commandArgs(trailingOnly = TRUE)
if (length(cli) >= 1 && nchar(cli[1]) > 0) DATA_DIR <- gsub("\\\\", "/", cli[1])

args <- commandArgs(trailingOnly = FALSE)
file_arg <- sub("^--file=", "", args[grepl("^--file=", args)])
CODE_DIR <- if (length(file_arg) > 0) dirname(normalizePath(file_arg)) else getwd()
RESULTS_DIR <- file.path(CODE_DIR, "results")
FIG_DIR <- file.path(CODE_DIR, "figures")
dir.create(FIG_DIR, showWarnings = FALSE)

# ---------- 字体 ----------
font_ok <- TRUE
f_simsun <- "C:/Windows/Fonts/simsun.ttc"
f_times <- "C:/Windows/Fonts/times.ttf"
f_timesbd <- "C:/Windows/Fonts/timesbd.ttf"
if (file.exists(f_simsun)) font_add("SimSun", regular = f_simsun) else font_ok <- FALSE
if (file.exists(f_times)) font_add("Times New Roman", regular = f_times, bold = if (file.exists(f_timesbd)) f_timesbd else f_times) else font_ok <- FALSE
showtext_auto()
CN <- if (font_ok) "SimSun" else "sans"
EN <- if (font_ok) "Times New Roman" else "serif"
if (!font_ok) cat("警告: 未找到宋体或 Times New Roman 字体文件, 已回退到系统字体。请在 Windows 上运行。\n")
cat(sprintf("R %s   ggplot2 %s   dplyr %s   tidyr %s   showtext %s   字体: %s\n",
            paste(R.version$major, R.version$minor, sep = "."),
            as.character(packageVersion("ggplot2")), as.character(packageVersion("dplyr")),
            as.character(packageVersion("tidyr")), as.character(packageVersion("showtext")),
            if (font_ok) "宋体 + Times New Roman 已加载" else "回退"))
cat("数据目录:", DATA_DIR, "  结果目录:", RESULTS_DIR, "\n")

PT <- 10.5   # 五号

theme_paper <- function() {
  theme_bw(base_size = PT, base_family = CN) +
    theme(
      text = element_text(family = CN, size = PT, colour = "black"),
      axis.text = element_text(family = EN, size = PT, colour = "black"),
      axis.title = element_text(family = CN, size = PT),
      legend.text = element_text(family = CN, size = PT),
      legend.title = element_text(family = CN, size = PT),
      strip.text = element_text(family = CN, size = PT),
      strip.background = element_rect(fill = "grey95", colour = NA),
      panel.grid.minor = element_blank(),
      panel.grid.major = element_line(colour = "grey90", linewidth = 0.3),
      legend.position = "bottom",
      legend.key.size = grid::unit(0.4, "cm"),
      plot.margin = margin(4, 6, 4, 4)
    )
}

save_fig <- function(p, name, w = 8.5, h = 6.5) {
  showtext_opts(dpi = 300)
  ggsave(file.path(FIG_DIR, paste0(name, ".png")), p, width = w, height = h, units = "cm", dpi = 300, bg = "white")
  showtext_opts(dpi = 72)
  ggsave(file.path(FIG_DIR, paste0(name, ".pdf")), p, width = w, height = h, units = "cm", device = cairo_pdf, bg = "white")
  cat("已保存", name, "\n")
}

rd <- function(name) {
  path <- file.path(RESULTS_DIR, name)
  if (!file.exists(path)) stop("缺文件: ", path, "  请先跑 s02 / s03")
  read.csv(path, fileEncoding = "UTF-8-BOM", check.names = FALSE, stringsAsFactors = FALSE)
}

RATE_COLS <- c("#3D7A5A", "#2E4A6B", "#B23A48", "#E39B26", "#6E7A8A", "#000000")
RATE_SHAPES <- c(16, 17, 15, 18, 8, 3)
METHOD_LEVELS <- c("E", "A", "B", "Cu", "Cw", "Cw1")
METHOD_LABELS <- c("E 无删失参照", "A 丢弃删失机", "B 把下线当失效", "Cu 选样本不加权", "Cw 选样本加权", "Cw1 加权一机一点")
METHOD_COLORS <- c(E = "#000000", A = "#B23A48", B = "#E39B26", Cu = "#6E7A8A", Cw = "#2E4A6B", Cw1 = "#3D7A5A")
method_factor <- function(x) factor(x, levels = METHOD_LEVELS, labels = METHOD_LABELS)
scale_method_colour <- function() scale_colour_manual(values = setNames(METHOD_COLORS, METHOD_LABELS), name = NULL)
scale_method_fill <- function() scale_fill_manual(values = setNames(METHOD_COLORS, METHOD_LABELS), name = NULL)

rate_tag <- sprintf("r%03d", round(FOCUS_RATE * 100))
c0_tag <- sprintf("c%02d", FOCUS_C0)
nominal <- rd("s02_twosided.csv")$nominal[1]

# ================= 数据本身 =================
# F01 失效循环数分布
raw_path <- file.path(DATA_DIR, "train_FD001.txt")
if (file.exists(raw_path)) {
  raw <- read.table(raw_path, header = FALSE)
  raw <- raw[, 1:26]
  names(raw) <- c("unit", "cycle", "op1", "op2", "op3", paste0("s", 1:21))
  life <- raw %>% group_by(unit) %>% summarise(F = max(cycle), .groups = "drop")
  p01 <- ggplot(life, aes(F)) +
    geom_histogram(binwidth = 20, boundary = 0, fill = "#2E4A6B", colour = "white", linewidth = 0.3) +
    labs(x = "失效循环数 F", y = "发动机台数") + theme_paper()
  save_fig(p01, "F01_lifetime_hist")

  # F02 传感器退化轨迹
  sel_units <- c(1, 20, 50)
  sel_sensors <- c("s2", "s4", "s11", "s15")
  traj <- raw %>% filter(unit %in% sel_units) %>% select(unit, cycle, all_of(sel_sensors)) %>%
    pivot_longer(all_of(sel_sensors), names_to = "sensor", values_to = "value") %>%
    mutate(sensor = factor(sensor, levels = sel_sensors))
  p02 <- ggplot(traj, aes(cycle, value, colour = factor(unit))) +
    geom_line(linewidth = 0.35) +
    facet_wrap(~sensor, scales = "free_y", ncol = 2) +
    scale_colour_manual(values = c("#2E4A6B", "#E39B26", "#3D7A5A"), name = "发动机编号") +
    labs(x = "循环 t", y = "传感器读数") + theme_paper()
  save_fig(p02, "F02_sensor_trajectories", w = 16, h = 9)
} else {
  cat("未找到", raw_path, ", 跳过 F01 F02\n")
}

# ================= 删失构造 =================
# F03 校准折发动机的观测时间线 (删失示意)
u <- rd(sprintf("s03_units_%s.csv", rate_tag)) %>% filter(cal == 1) %>% arrange(O) %>%
  mutate(rank = row_number(),
         kept_end = pmax(0, pmin(O, C - FOCUS_C0)),
         status = factor(delta, levels = c(0, 1), labels = c("删失", "失效")))
p03 <- ggplot(u) +
  geom_segment(aes(x = 0, xend = kept_end, y = rank, yend = rank), colour = "#3D7A5A", linewidth = 1.1) +
  geom_segment(aes(x = kept_end, xend = O, y = rank, yend = rank), colour = "#E39B26", linewidth = 1.1) +
  geom_point(aes(x = O, y = rank, shape = status), size = 1.6, fill = "white", colour = "black") +
  scale_shape_manual(values = c("删失" = 21, "失效" = 16), name = NULL) +
  labs(x = "循环 t", y = "校准折发动机 (按观测长度排序)",
       subtitle = sprintf("删失率 %.0f%%, c0 = %d; 绿色为保留样本, 橙色为最后 c0 个循环 (丢弃)", FOCUS_RATE * 100, FOCUS_C0)) +
  theme_paper() + theme(plot.subtitle = element_text(family = CN, size = PT))
save_fig(p03, "F03_censoring_timeline", w = 16, h = 9)

# F04 样本量核算
acc <- rd("s03_accounting.csv")
a2 <- acc %>% select(rate, c0, kept_rows_pct, kept_eng_cal) %>%
  pivot_longer(c(kept_rows_pct, kept_eng_cal), names_to = "metric", values_to = "value") %>%
  mutate(metric = factor(metric, levels = c("kept_rows_pct", "kept_eng_cal"),
                         labels = c("保留样本占观测样本比例 (%)", "校准折保留发动机 (台)")),
         rate = factor(sprintf("%.0f%%", rate * 100)))
p04 <- ggplot(a2, aes(c0, value, colour = rate, group = rate)) +
  geom_line(linewidth = 0.5) + geom_point(size = 1.8) +
  facet_wrap(~metric, scales = "free_y") +
  scale_colour_manual(values = RATE_COLS[seq_along(levels(a2$rate))], name = "删失率") +
  labs(x = "观测视野 c0", y = NULL) + theme_paper()
save_fig(p04, "F04_sample_accounting", w = 16, h = 7)

# F05 权重随循环数变化
w <- rd("s03_weights.csv") %>% filter(abs(rate - FOCUS_RATE) < 1e-9) %>% mutate(c0 = factor(c0))
p05 <- ggplot(w, aes(t, w, colour = c0)) +
  geom_line(linewidth = 0.5) +
  scale_colour_manual(values = RATE_COLS[seq_along(levels(w$c0))], name = "c0") +
  labs(x = "循环 t", y = "权重 w(t) = 1 / S_C(t + c0)",
       subtitle = sprintf("删失率 %.0f%%, 下线时刻与寿命独立", FOCUS_RATE * 100)) +
  theme_paper() + theme(plot.subtitle = element_text(family = CN, size = PT))
save_fig(p05, "F05_weights_vs_t")

# ================= 无删失基线 =================
# F06 分段覆盖率: 全部循环校准 vs 一机一点
b <- rd("s02_lpb_summary.csv") %>% filter(method_code %in% c("all", "one_mean")) %>%
  select(method_code, starts_with("cov[")) %>%
  pivot_longer(-method_code, names_to = "bin", values_to = "cov") %>%
  mutate(bin = sub("^cov", "", bin), bin = factor(bin, levels = unique(bin)),
         method = factor(method_code, levels = c("all", "one_mean"), labels = c("全部循环校准", "一机一点校准 (均值)")))
p06 <- ggplot(b, aes(bin, cov, fill = method)) +
  geom_col(position = position_dodge(0.7), width = 0.62) +
  geom_hline(yintercept = nominal, linetype = 2, linewidth = 0.4) +
  scale_fill_manual(values = c("#2E4A6B", "#3D7A5A"), name = NULL) +
  coord_cartesian(ylim = c(0.5, 1)) +
  labs(x = "真实 RUL 区段", y = "覆盖率") + theme_paper()
save_fig(p06, "F06_baseline_stratified_coverage")

# F11 测试机最后一循环: 按真实 RUL 排序, 点预测与两侧区间 (论文二式)
pr <- rd("s02_test_predictions.csv") %>% filter(is_last == 1) %>% arrange(rul) %>%
  mutate(rank = row_number(), lo = pmax(lo, 0))
p11 <- ggplot(pr, aes(rank)) +
  geom_ribbon(aes(ymin = lo, ymax = hi), fill = "#DCE7F2") +
  geom_line(aes(y = yhat), colour = "#6E7A8A", linewidth = 0.35, linetype = 3) +
  geom_point(aes(y = rul), size = 0.9, colour = "black") +
  labs(x = "测试发动机 (按真实 RUL 排序)", y = "RUL (循环)",
       subtitle = sprintf("点为真实 RUL, 虚线为点预测, 带为 %.0f%% 两侧共形区间", nominal * 100)) +
  theme_paper() + theme(plot.subtitle = element_text(family = CN, size = PT))
save_fig(p11, "F11_twosided_intervals_sorted", w = 12, h = 7)

# ================= 删失结果 =================
m <- rd("s03_methods.csv")

# F07 覆盖率随删失率 (c0 固定): 总体 与 决策区
m7 <- m %>% filter(c0 == FOCUS_C0) %>% select(rate, method_code, coverage, cov_dec) %>%
  pivot_longer(c(coverage, cov_dec), names_to = "metric", values_to = "value") %>%
  mutate(metric = factor(metric, levels = c("coverage", "cov_dec"),
                         labels = c("总体覆盖率", sprintf("决策区覆盖率 (真实 RUL < %d)", FOCUS_C0))),
         method = method_factor(method_code))
p07 <- ggplot(m7, aes(rate, value, colour = method, group = method)) +
  geom_hline(yintercept = nominal, linetype = 2, linewidth = 0.4) +
  geom_line(linewidth = 0.5) + geom_point(size = 1.8) +
  facet_wrap(~metric) +
  scale_x_continuous(breaks = unique(m7$rate), labels = function(x) sprintf("%.0f%%", x * 100)) +
  scale_method_colour() +
  labs(x = "删失率", y = "覆盖率", subtitle = sprintf("c0 = %d", FOCUS_C0)) +
  theme_paper() + theme(plot.subtitle = element_text(family = CN, size = PT)) +
  guides(colour = guide_legend(nrow = 2))
save_fig(p07, "F07_coverage_vs_censoring_rate", w = 16, h = 8)

# F08 分段覆盖率柱状图 (rate, c0 固定)
m8 <- m %>% filter(c0 == FOCUS_C0, abs(rate - FOCUS_RATE) < 1e-9) %>%
  select(method_code, starts_with("cov[")) %>%
  pivot_longer(-method_code, names_to = "bin", values_to = "cov") %>%
  mutate(bin = sub("^cov", "", bin), bin = factor(bin, levels = unique(bin)), method = method_factor(method_code))
p08 <- ggplot(m8, aes(bin, cov, fill = method)) +
  geom_col(position = position_dodge(0.8), width = 0.72) +
  geom_hline(yintercept = nominal, linetype = 2, linewidth = 0.4) +
  scale_method_fill() +
  coord_cartesian(ylim = c(0, 1)) +
  labs(x = "真实 RUL 区段", y = "覆盖率", subtitle = sprintf("删失率 %.0f%%, c0 = %d", FOCUS_RATE * 100, FOCUS_C0)) +
  theme_paper() + theme(plot.subtitle = element_text(family = CN, size = PT)) +
  guides(fill = guide_legend(nrow = 2))
save_fig(p08, "F08_stratified_coverage_by_method", w = 16, h = 8)

# F09 覆盖率与紧度的取舍 (c0 固定)
m9 <- m %>% filter(c0 == FOCUS_C0) %>%
  mutate(method = method_factor(method_code), rate = factor(sprintf("%.0f%%", rate * 100)))
p09 <- ggplot(m9, aes(mean_L, cov_dec, colour = method, shape = rate)) +
  geom_hline(yintercept = nominal, linetype = 2, linewidth = 0.4) +
  geom_point(size = 2.2) +
  scale_method_colour() +
  scale_shape_manual(values = RATE_SHAPES[seq_along(levels(m9$rate))], name = "删失率") +
  labs(x = "平均下界 (循环)", y = sprintf("决策区覆盖率 (真实 RUL < %d)", FOCUS_C0),
       subtitle = sprintf("c0 = %d; 右上为好", FOCUS_C0)) +
  theme_paper() + theme(plot.subtitle = element_text(family = CN, size = PT)) +
  guides(colour = guide_legend(nrow = 2), shape = guide_legend(nrow = 1))
save_fig(p09, "F09_coverage_vs_tightness", w = 12, h = 9)

# F10 一台测试发动机的下界轨迹
pred <- rd(sprintf("s03_test_predictions_%s_%s.csv", rate_tag, c0_tag))
cand <- pred %>% group_by(unit) %>% summarise(mn = min(rul), mx = max(rul), n = n(), .groups = "drop") %>%
  filter(mn <= 5, mx >= 60) %>% arrange(desc(n))
pick_unit <- if (nrow(cand) > 0) cand$unit[1] else (pred %>% group_by(unit) %>% summarise(mn = min(rul), .groups = "drop") %>% arrange(mn) %>% pull(unit))[1]
one <- pred %>% filter(unit == pick_unit) %>%
  select(t, rul, starts_with("L_")) %>%
  pivot_longer(starts_with("L_"), names_to = "method_code", values_to = "L") %>%
  mutate(method_code = sub("^L_", "", method_code), method = method_factor(method_code)) %>%
  filter(!is.na(L))
p10 <- ggplot() +
  geom_hline(yintercept = FOCUS_C0, linetype = 3, linewidth = 0.4, colour = "grey40") +
  geom_line(data = one %>% distinct(t, rul), aes(t, rul), colour = "black", linewidth = 0.7) +
  geom_line(data = one, aes(t, L, colour = method), linewidth = 0.45) +
  scale_method_colour() +
  labs(x = "循环 t", y = "RUL (循环)",
       subtitle = sprintf("测试发动机 %d; 黑线为真实 RUL, 彩线为各方法下界; 删失率 %.0f%%, c0 = %d", pick_unit, FOCUS_RATE * 100, FOCUS_C0)) +
  theme_paper() + theme(plot.subtitle = element_text(family = CN, size = PT)) +
  guides(colour = guide_legend(nrow = 2))
save_fig(p10, "F10_single_engine_trajectory", w = 16, h = 8)

cat("\n全部完成。图在:", FIG_DIR, "\n")
cat("F01 失效循环数分布  F02 传感器退化轨迹  F03 删失时间线  F04 样本量核算  F05 权重曲线\n")
cat("F06 基线分段覆盖  F07 覆盖率随删失率  F08 分段覆盖柱状  F09 覆盖率与紧度  F10 单机轨迹  F11 两侧区间排序图\n")
