# ============================================================
# 血清 CSS (S-磺基-L-半胱氨酸, ug/mL) 与临床指标的线性相关分析
# 分组: CTRCD (n=20) / Non-CTRCD (n=24)
# 输出: 1) console 相关系数表  2) 两张散点相关图 (CTRCD / Non-CTRCD)
# R 4.5
# ============================================================

## ---------- 0. 路径与参数 (只改这里) ----------
DATA_FILE <- "E:/20260908_人血清及细胞上清液测试.xlsx"   # 改成本机 xlsx 路径
OUT_DIR   <- "E:/CSS_result"                              # 图片输出目录

COL_CTRCD     <- "#8F53AA"   # RGB(143,83,170) 你的配色
COL_NONCTRCD  <- "#8F53AA"   # 想区分两组时改成别的色
LOG10_CSS     <- FALSE       # TRUE = 对 CSS 取 log10 后再做 Pearson 与作图
BASE_SIZE     <- 10.5        # 五号字

## ---------- 1. 依赖 ----------
pkgs <- c("readxl", "dplyr", "tidyr", "ggplot2", "ggpubr", "patchwork", "showtext")
miss <- pkgs[!pkgs %in% rownames(installed.packages())]
if (length(miss)) install.packages(miss)
invisible(lapply(pkgs, library, character.only = TRUE))

font_add("song", regular = "C:/Windows/Fonts/simsun.ttc")
font_add("TNR",  regular = "C:/Windows/Fonts/times.ttf",
         bold = "C:/Windows/Fonts/timesbd.ttf",
         italic = "C:/Windows/Fonts/timesi.ttf")
showtext_auto()
showtext_opts(dpi = 300)

dir.create(OUT_DIR, showWarnings = FALSE, recursive = TRUE)

## ---------- 2. 读入数据 ----------
sheets <- excel_sheets(DATA_FILE)
sh_c  <- grep("^CT",     sheets, value = TRUE)[1]   # CTCR
sh_n  <- grep("^Non",    sheets, value = TRUE)[1]   # Non-CTCR

read_one <- function(sh, grp) {
  read_excel(DATA_FILE, sheet = sh) %>%
    rename(CSS = `终浓度ug/mL`, EF_C1 = `心功能1`, EF_C4 = `心功能4`) %>%
    mutate(Group = grp)
}
dat <- bind_rows(read_one(sh_c, "CTRCD"), read_one(sh_n, "Non-CTRCD")) %>%
  mutate(Group = factor(Group, levels = c("CTRCD", "Non-CTRCD")),
         across(c(EF_C1, EF_C4, Chance, ALT, AST, TBA, TG, TC, HDL, LDL,
                  blood.sugar, TYG, UA, PLT, BMI, FIB4, CSS), as.numeric))

cat("\n========== 数据结构 ==========\n")
print(as.data.frame(head(dat, 5)))
cat("\n分组样本量:\n"); print(table(dat$Group))
cat("\n各变量缺失数:\n"); print(colSums(is.na(dat[sapply(dat, is.numeric)])))

## ---------- 3. 待分析指标 ----------
VARS <- c("EF_C1", "EF_C4", "Chance", "ALT", "AST", "TBA", "TG", "TC",
          "HDL", "LDL", "blood.sugar", "TYG", "UA", "PLT", "BMI", "FIB4")
LAB  <- c(EF_C1 = "LVEF cycle 1 (%)", EF_C4 = "LVEF cycle 4 (%)",
          Chance = "LVEF decline (%)", ALT = "ALT (U/L)", AST = "AST (U/L)",
          TBA = "TBA (umol/L)", TG = "TG (mmol/L)", TC = "TC (mmol/L)",
          HDL = "HDL-C (mmol/L)", LDL = "LDL-C (mmol/L)",
          blood.sugar = "Blood glucose (mmol/L)", TYG = "TyG index",
          UA = "UA (umol/L)", PLT = "PLT (10^9/L)", BMI = "BMI (kg/m2)",
          FIB4 = "FIB-4")

dat$CSS_use <- if (LOG10_CSS) log10(dat$CSS) else dat$CSS
Y_LAB <- if (LOG10_CSS) "log10 serum CSS (ug/mL)" else "Serum CSS (ug/mL)"

## ---------- 4. CSS 分布检验 ----------
cat("\n========== CSS 正态性检验 (Shapiro-Wilk) ==========\n")
for (g in levels(dat$Group)) {
  x <- dat$CSS_use[dat$Group == g]
  cat(sprintf("%-10s n=%2d  W=%.3f  P=%.4g\n", g, sum(!is.na(x)),
              shapiro.test(x)$statistic, shapiro.test(x)$p.value))
}

## ---------- 5. 相关分析 ----------
cor_tab <- function(d, grp) {
  do.call(rbind, lapply(VARS, function(v) {
    x <- d[[v]]; y <- d$CSS_use
    ok <- complete.cases(x, y); x <- x[ok]; y <- y[ok]
    if (length(x) < 4 || sd(x) == 0) return(NULL)
    p1 <- cor.test(x, y, method = "pearson")
    p2 <- suppressWarnings(cor.test(x, y, method = "spearman"))
    data.frame(Group = grp, Variable = v, n = length(x),
               Pearson_r = unname(p1$estimate),
               CI_low = p1$conf.int[1], CI_high = p1$conf.int[2],
               P_pearson = p1$p.value,
               Spearman_rho = unname(p2$estimate),
               P_spearman = p2$p.value,
               R2 = unname(p1$estimate)^2)
  }))
}

res <- do.call(rbind, lapply(levels(dat$Group), function(g)
  cor_tab(dat[dat$Group == g, ], g)))
res <- rbind(res, cor_tab(dat, "All"))
res <- res %>% group_by(Group) %>%
  mutate(FDR_pearson  = p.adjust(P_pearson,  "BH"),
         FDR_spearman = p.adjust(P_spearman, "BH")) %>% ungroup()

fmt <- res %>%
  mutate(`Pearson r (95%CI)` = sprintf("%.3f (%.3f, %.3f)", Pearson_r, CI_low, CI_high),
         P_pearson    = signif(P_pearson, 3),
         Spearman_rho = round(Spearman_rho, 3),
         P_spearman   = signif(P_spearman, 3),
         R2           = round(R2, 3),
         FDR_pearson  = signif(FDR_pearson, 3),
         FDR_spearman = signif(FDR_spearman, 3)) %>%
  select(Group, Variable, n, `Pearson r (95%CI)`, R2, P_pearson, FDR_pearson,
         Spearman_rho, P_spearman, FDR_spearman)

cat("\n========== 相关分析结果 (CSS vs 临床指标) ==========\n")
for (g in unique(fmt$Group)) {
  cat("\n---------- ", g, " ----------\n", sep = "")
  print(as.data.frame(fmt[fmt$Group == g, -1]), row.names = FALSE)
}

cat("\n========== P<0.05 的结果汇总 ==========\n")
sig <- fmt[res$P_pearson < 0.05 | res$P_spearman < 0.05, ]
if (nrow(sig)) print(as.data.frame(sig), row.names = FALSE) else cat("无\n")

write.csv(res, file.path(OUT_DIR, "CSS_correlation_table.csv"), row.names = FALSE)

## ---------- 6. 作图 ----------
theme_sci <- theme_classic(base_size = BASE_SIZE, base_family = "TNR") +
  theme(axis.text    = element_text(colour = "black", size = BASE_SIZE),
        axis.title   = element_text(colour = "black", size = BASE_SIZE),
        axis.line    = element_line(colour = "black", linewidth = 0.4),
        axis.ticks   = element_line(colour = "black", linewidth = 0.4),
        strip.background = element_blank(),
        strip.text   = element_text(size = BASE_SIZE, face = "plain"),
        plot.title   = element_text(size = BASE_SIZE, hjust = 0.5),
        panel.spacing = unit(6, "pt"))

one_panel <- function(d, v, col) {
  sub <- d[complete.cases(d[[v]], d$CSS_use), ]
  ct  <- cor.test(sub[[v]], sub$CSS_use, method = "pearson")
  lab <- sprintf("r = %.3f\nP = %s", unname(ct$estimate),
                 ifelse(ct$p.value < 0.001, "< 0.001", sprintf("%.3f", ct$p.value)))
  ggplot(sub, aes(x = .data[[v]], y = CSS_use)) +
    geom_smooth(method = "lm", formula = y ~ x, se = TRUE,
                colour = col, fill = col, alpha = 0.15, linewidth = 0.6) +
    geom_point(shape = 16, size = 1.8, colour = col, alpha = 0.85) +
    annotate("text", x = Inf, y = Inf, label = lab, hjust = 1.05, vjust = 1.2,
             size = BASE_SIZE / .pt, family = "TNR") +
    scale_y_continuous(expand = expansion(mult = c(0.05, 0.18))) +
    labs(x = LAB[[v]], y = Y_LAB) +
    theme_sci
}

make_fig <- function(grp, col) {
  d <- dat[dat$Group == grp, ]
  pl <- lapply(VARS, function(v) one_panel(d, v, col))
  wrap_plots(pl, ncol = 4) +
    plot_annotation(title = sprintf("%s group (n = %d)", grp, nrow(d)),
                    theme = theme(plot.title = element_text(family = "TNR",
                                  size = BASE_SIZE + 1, hjust = 0.5)))
}

fig1 <- make_fig("CTRCD",     COL_CTRCD)
fig2 <- make_fig("Non-CTRCD", COL_NONCTRCD)

ggsave(file.path(OUT_DIR, "Fig_CTRCD_correlation.pdf"),     fig1, width = 10, height = 10.5)
ggsave(file.path(OUT_DIR, "Fig_CTRCD_correlation.png"),     fig1, width = 10, height = 10.5, dpi = 300)
ggsave(file.path(OUT_DIR, "Fig_NonCTRCD_correlation.pdf"),  fig2, width = 10, height = 10.5)
ggsave(file.path(OUT_DIR, "Fig_NonCTRCD_correlation.png"),  fig2, width = 10, height = 10.5, dpi = 300)

print(fig1)
print(fig2)

cat("\n图与表已输出到: ", OUT_DIR, "\n", sep = "")
