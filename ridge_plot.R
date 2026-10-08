# 山脊图：8 个基因在 N 组与 P 组的 FPKM 分布
# R 4.5，依赖包：readxl, dplyr, tidyr, ggplot2, ggridges, showtext
# 字体：Times New Roman 五号（10.5 pt）

library(readxl)
library(dplyr)
library(tidyr)
library(ggplot2)
library(ggridges)
library(showtext)

# ---------- 1. 路径（按本机修改） ----------
xlsx_path <- "E:/data/4b6f28b2-_______.xlsx"
out_png   <- "E:/data/ridge_plot.png"
out_pdf   <- "E:/data/ridge_plot.pdf"

# ---------- 2. 字体 ----------
font_add("TNR", regular = "C:/Windows/Fonts/times.ttf",
         bold = "C:/Windows/Fonts/timesbd.ttf")
showtext_auto()
showtext_opts(dpi = 300)
fs <- 10.5   # 五号字

# ---------- 3. 读数据 ----------
raw <- read_excel(xlsx_path, sheet = 1)
names(raw)[1] <- "ID"
pcol <- grep("DESeq2_Pvalue$", names(raw), value = TRUE)

dat <- raw %>%
  select(ID, ends_with("_FPKM"), all_of(pcol)) %>%
  rename(Pvalue = all_of(pcol)) %>%
  pivot_longer(ends_with("_FPKM"), names_to = "sample", values_to = "FPKM") %>%
  mutate(Type = ifelse(grepl("^N", sample), "N", "P"),
         Type = factor(Type, levels = c("N", "P")),
         expr = log2(FPKM + 1),
         ID   = factor(ID, levels = rev(unique(raw$ID))))

# ---------- 4. P 值标签位置：该基因两条密度曲线尾部截止处 ----------
xr <- range(dat$expr) + c(-1.5, 1.5)
lab <- dat %>%
  group_by(ID) %>%
  group_modify(function(d, k) {
    dN <- density(d$expr[d$Type == "N"], from = xr[1], to = xr[2], n = 800)
    dP <- density(d$expr[d$Type == "P"], from = xr[1], to = xr[2], n = 800)
    dm <- pmax(dN$y, dP$y) / max(dN$y, dP$y)
    tibble(x = max(dN$x[dm > 0.01]), Pvalue = d$Pvalue[1])
  }) %>%
  ungroup() %>%
  mutate(label = paste0("P = ", signif(Pvalue, 3)))

# ---------- 5. 作图 ----------
p <- ggplot(dat, aes(x = expr, y = ID, fill = Type)) +
  geom_density_ridges(aes(height = after_stat(density)),
                      stat = "density", trim = FALSE,
                      scale = 0.95, alpha = 0.8, colour = "white", linewidth = 0.4) +
  geom_text(data = lab, aes(x = x + 0.15, y = ID, label = label),
            inherit.aes = FALSE, hjust = 0, vjust = -0.4,
            family = "TNR", size = fs / .pt) +
  scale_fill_manual(values = c(N = "#A8DADC", P = "#E76F51"), name = "Type") +
  coord_cartesian(xlim = c(min(dat$expr) - 1, max(dat$expr) + 2.6)) +
  scale_y_discrete(expand = expansion(add = c(0.2, 1.0))) +
  labs(x = expression(log[2](FPKM + 1)), y = NULL) +
  theme_ridges(grid = TRUE, center_axis_labels = TRUE) +
  theme(text = element_text(family = "TNR", size = fs),
        axis.text  = element_text(family = "TNR", size = fs),
        axis.title = element_text(family = "TNR", size = fs),
        legend.title = element_text(family = "TNR", size = fs),
        legend.text  = element_text(family = "TNR", size = fs),
        panel.grid.major.y = element_line(colour = "grey85"),
        panel.grid.major.x = element_line(colour = "grey85"),
        legend.position = "right")

ggsave(out_png, p, width = 7, height = 5, dpi = 300, bg = "white")
ggsave(out_pdf, p, width = 7, height = 5, bg = "white")

print(lab)
