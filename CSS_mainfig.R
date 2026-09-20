# ============================================================
# 主图: 血清 CSS 与关键临床指标 (四 panel)
#   A  两组 CSS 水平比较 (Mann-Whitney)
#   B  CSS vs 心功能下降值      C  CSS vs BMI      D  CSS vs TG
#   B/C/D 合并两组作图并按组着色, y 轴 log10 刻度
#   标注: 合并 Spearman rho 与组内 Spearman rho
# R 4.5
# ============================================================

## ---------- 0. 路径与参数 ----------
DATA_FILE <- "E:/20260908_人血清及细胞上清液测试.xlsx"
OUT_DIR   <- "E:/CSS_result"
.args <- commandArgs(trailingOnly = TRUE)
if (length(.args) >= 1) DATA_FILE <- .args[1]
if (length(.args) >= 2) OUT_DIR   <- .args[2]

COL <- c(CTRCD = "#8F53AA", `Non-CTRCD` = "#9E9E9E")   # 想换 Non-CTRCD 的色改这里
BASE_SIZE <- 10.5                                       # 五号字

## ---------- 1. 依赖与字体 ----------
pkgs <- c("readxl", "dplyr", "tidyr", "ggplot2", "patchwork", "scales")
miss <- pkgs[!pkgs %in% rownames(installed.packages())]
if (length(miss)) install.packages(miss)
invisible(lapply(pkgs, library, character.only = TRUE))

FAM <- "serif"
if (file.exists("C:/Windows/Fonts/times.ttf") &&
    requireNamespace("showtext", quietly = TRUE)) {
  library(showtext)
  font_add("song", regular = "C:/Windows/Fonts/simsun.ttc")
  font_add("TNR",  regular = "C:/Windows/Fonts/times.ttf",
           bold   = "C:/Windows/Fonts/timesbd.ttf",
           italic = "C:/Windows/Fonts/timesi.ttf")
  showtext_auto(); showtext_opts(dpi = 300)
  FAM <- "TNR"
}
dir.create(OUT_DIR, showWarnings = FALSE, recursive = TRUE)

## ---------- 2. 读入数据 ----------
sheets <- excel_sheets(DATA_FILE)
read_one <- function(sh, grp) {
  raw <- read_excel(DATA_FILE, sheet = sh)
  i <- grep("ug/mL", names(raw), fixed = TRUE); stopifnot(length(i) == 1)
  names(raw)[i] <- "CSS"; names(raw)[2] <- "EF_C1"; names(raw)[3] <- "EF_C4"
  raw$Group <- grp; raw
}
dat <- bind_rows(read_one(grep("^CT",  sheets, value = TRUE)[1], "CTRCD"),
                 read_one(grep("^Non", sheets, value = TRUE)[1], "Non-CTRCD")) %>%
  mutate(Group = factor(Group, levels = c("CTRCD", "Non-CTRCD")),
         across(c(Chance, BMI, TG, CSS), as.numeric))

## ---------- 3. 主题 ----------
theme_sci <- theme_classic(base_size = BASE_SIZE, base_family = FAM) +
  theme(axis.text   = element_text(colour = "black", size = BASE_SIZE),
        axis.title  = element_text(colour = "black", size = BASE_SIZE),
        axis.line   = element_line(colour = "black", linewidth = 0.4),
        axis.ticks  = element_line(colour = "black", linewidth = 0.4),
        legend.title = element_blank(),
        legend.text  = element_text(size = BASE_SIZE),
        legend.key.size = unit(10, "pt"),
        plot.tag    = element_text(size = BASE_SIZE + 1.5, face = "bold", family = FAM))

Y_BRK <- c(1, 3, 10, 30, 100, 300)
y_logA <- scale_y_log10(limits = c(3, 1500), breaks = Y_BRK, labels = Y_BRK,
                        expand = expansion(mult = c(0.02, 0)))
y_logS <- scale_y_log10(limits = c(3, 900),  breaks = Y_BRK, labels = Y_BRK,
                        expand = expansion(mult = c(0.02, 0)))

## ---------- 4. Panel A: 两组比较 ----------
w  <- suppressWarnings(wilcox.test(CSS ~ Group, data = dat))
pA <- ifelse(w$p.value < 0.001, "P < 0.001", sprintf("P = %.3f", w$p.value))
med <- dat %>% group_by(Group) %>% summarise(m = median(CSS), .groups = "drop")

set.seed(1)
A <- ggplot(dat, aes(Group, CSS, colour = Group)) +
  geom_jitter(width = 0.16, height = 0, shape = 16, size = 1.9, alpha = 0.85) +
  geom_errorbar(data = med, inherit.aes = FALSE,
                aes(x = Group, ymin = m, ymax = m), width = 0.36,
                colour = "black", linewidth = 0.5) +
  annotate("segment", x = 1, xend = 2, y = 700, yend = 700, linewidth = 0.4) +
  annotate("text", x = 1.5, y = 900, label = pA, size = BASE_SIZE / .pt, family = FAM) +
  scale_colour_manual(values = COL) + y_logA +
  labs(x = NULL, y = "Serum CSS (ug/mL)") +
  theme_sci

## ---------- 5. Panel B/C/D: 散点 ----------
scat <- function(v, xlab) {
  s <- dat[complete.cases(dat[[v]], dat$CSS), ]
  rho_all <- suppressWarnings(cor.test(s[[v]], s$CSS, method = "spearman"))
  rin <- sapply(levels(s$Group), function(g) {
    z <- s[s$Group == g, ]
    suppressWarnings(cor(z[[v]], z$CSS, method = "spearman"))
  })
  l1 <- sprintf("All: rho = %.2f, %s", rho_all$estimate,
                ifelse(rho_all$p.value < 0.001, "P < 0.001",
                       sprintf("P = %.3f", rho_all$p.value)))
  l2 <- sprintf("Within group: %.2f / %.2f", rin[1], rin[2])
  ggplot(s, aes(.data[[v]], CSS)) +
    geom_smooth(method = "lm", formula = y ~ x, se = TRUE, colour = "black",
                fill = "grey70", alpha = 0.2, linewidth = 0.5) +
    geom_point(aes(colour = Group), shape = 16, size = 1.9, alpha = 0.85) +
    annotate("text", x = -Inf, y = Inf, label = paste(l1, l2, sep = "\n"),
             hjust = -0.05, vjust = 1.15, size = BASE_SIZE / .pt, family = FAM) +
    scale_colour_manual(values = COL) + y_logS +
    labs(x = xlab, y = "Serum CSS (ug/mL)") +
    theme_sci
}

B <- scat("Chance", "LVEF decline (%)")
C <- scat("BMI",    "BMI (kg/m2)")
D <- scat("TG",     "TG (mmol/L)")

## ---------- 6. 拼图 ----------
fig <- (A | B) / (C | D) +
  plot_annotation(tag_levels = "A") +
  plot_layout(guides = "collect") &
  theme(legend.position = "bottom")

## ---------- 7. 输出 ----------
ggsave(file.path(OUT_DIR, "Fig_main_4panel.pdf"), fig, width = 7.1, height = 6.8)
ggsave(file.path(OUT_DIR, "Fig_main_4panel.png"), fig, width = 7.1, height = 6.8, dpi = 300)
print(fig)

cat("\n主图已输出到: ", OUT_DIR, "\n", sep = "")
cat("\n---------- 标注所用统计量 ----------\n")
cat(sprintf("A  Mann-Whitney: W = %.1f, %s\n", w$statistic, pA))
for (v in c("Chance", "BMI", "TG")) {
  s <- dat[complete.cases(dat[[v]], dat$CSS), ]
  ra <- suppressWarnings(cor.test(s[[v]], s$CSS, method = "spearman"))
  rc <- suppressWarnings(cor(s$CSS[s$Group == "CTRCD"], s[[v]][s$Group == "CTRCD"], method = "spearman"))
  rn <- suppressWarnings(cor(s$CSS[s$Group == "Non-CTRCD"], s[[v]][s$Group == "Non-CTRCD"], method = "spearman"))
  cat(sprintf("%-8s n=%d  合并 rho=%.3f P=%.4g  CTRCD rho=%.3f  Non-CTRCD rho=%.3f\n",
              v, nrow(s), ra$estimate, ra$p.value, rc, rn))
}
