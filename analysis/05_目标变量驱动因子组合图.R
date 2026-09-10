# ==============================================================================
# 05_目标变量驱动因子组合图.R      运行环境: R 4.5 (Windows); 先运行 01 脚本
# ------------------------------------------------------------------------------
# 仿老师文章的组合图, 分别以 MAOC 和 MRC 为目标变量:
#   (a) 各预测变量与目标变量的 Pearson 相关热图列 (星号为显著性)
#   (b) 随机森林: 各变量重要性 (%IncMSE), 显著性用置换检验 (499 次打乱响应变量), 标题给模型 R2 与 P
#   (c) 线性混合模型 (随机截距 = 林型; n = 16 只放 5 个变量, P 值用 t 分布 df = n-k-1): 三类变量 (Microbes / Soil / Plant) 的相对效应 (标准化系数绝对值占比)
#       和各变量参数估计 ± 95% CI; 标题给边际 R2 与条件 R2 (Nakagawa)
#   (d) 散点回归
# ==============================================================================
rm(list = ls())
# install.packages(c("ggplot2", "dplyr", "tidyr", "patchwork", "randomForest", "lme4", "showtext"))
suppressPackageStartupMessages({
  library(ggplot2); library(dplyr); library(tidyr); library(patchwork); library(randomForest); library(lme4); library(showtext)
})
data_dir <- "E:/lxfs"
out_dir  <- file.path(data_dir, "output")
obj <- readRDS(file.path(out_dir, "analysis_objects.rds")); dat <- obj$dat; group_labels <- obj$group_labels
font_add("SimSun", regular = "C:/Windows/Fonts/simsun.ttc")
font_add("Times New Roman", regular = "C:/Windows/Fonts/times.ttf",
         bold = "C:/Windows/Fonts/timesbd.ttf", italic = "C:/Windows/Fonts/timesi.ttf")
showtext_auto(); showtext_opts(dpi = 300)
fs <- 10.5; set.seed(2025)
dat$GroupL <- factor(group_labels[as.character(dat$Group)], levels = group_labels)
grp_col <- c("#0077BB", "#EE7733", "#009988", "#CC3311"); names(grp_col) <- group_labels
cat_col <- c(Microbes = "#08519C", Soil = "#4292C6", Plant = "#9ECAE1")

lab <- c(MAOC_SOC = "MAOC/SOC", MRC_SOC = "MRC/SOC", C_N = "C/N", C_P = "C/P", S_V = "S/V", Lignin_N = "Lignin/N",
         Vector_angle = "Vector angle", F_Shannon = "Fungal Shannon", B_Shannon = "Bacterial Shannon", P = "P-phenols",
         VSC = "VSC", BG = "βG")
L <- function(v) unname(ifelse(v %in% names(lab), lab[v], v))
stars <- function(p) ifelse(is.na(p), "", ifelse(p < 0.001, "***", ifelse(p < 0.01, "**", ifelse(p < 0.05, "*", ""))))
theme_p <- function() theme_bw(base_size = fs, base_family = "Times New Roman") +
  theme(panel.grid = element_blank(), plot.title = element_text(size = fs, hjust = 0), plot.tag = element_text(size = fs, face = "bold"),
        legend.text = element_text(size = fs - 1), legend.title = element_blank())

## ---- 设置: 目标变量 / 预测变量 (按 Microbes, Soil, Plant 三类) / 混合模型变量 / 散点 -------------------
cfg <- list(
  MAOC = list(
    target = "MAOC",
    preds = c(Microbes = "FRC", Microbes = "BRC", Microbes = "F_Shannon", Microbes = "B_Shannon", Microbes = "Vector_angle",
              Soil = "pH", Soil = "SOC", Soil = "TN", Soil = "TP", Soil = "C_N", Soil = "AN", Soil = "AP", Soil = "EOC", Soil = "POC",
              Plant = "VSC", Plant = "Lignin_N", Plant = "S_V", Plant = "P"),
    lmm   = c(Microbes = "FRC", Microbes = "BRC", Soil = "TN", Soil = "pH", Plant = "VSC"),   # n = 16, 变量不能多
    scat  = list(list(x = "MRC", ys = "MAOC"), list(x = "VSC", ys = "MAOC"))),
  MRC = list(
    target = "MRC",
    preds = c(Microbes = "F_Shannon", Microbes = "B_Shannon", Microbes = "Basidiomycota", Microbes = "Vector_angle",
              Soil = "pH", Soil = "SOC", Soil = "TN", Soil = "TP", Soil = "C_N", Soil = "AN", Soil = "AP", Soil = "EOC", Soil = "MAOC", Soil = "POC",
              Plant = "VSC", Plant = "Lignin_N", Plant = "S_V", Plant = "P"),
    lmm   = c(Microbes = "F_Shannon", Soil = "TN", Soil = "TP", Soil = "MAOC", Plant = "VSC"),
    scat  = list(list(x = "MAOC", ys = c("FRC", "BRC")), list(x = "TN", ys = c("FRC", "BRC"))))
)

build_fig <- function(cf, n_perm = 499) {
  tg <- cf$target; pv <- unname(cf$preds); pcat <- names(cf$preds)
  ## (a) 相关热图列
  ca <- t(sapply(pv, function(v) { ct <- cor.test(dat[[v]], dat[[tg]]); c(r = unname(ct$estimate), p = ct$p.value) }))
  da <- data.frame(Var = pv, Cat = pcat, r = ca[, "r"], p = ca[, "p"], star = stars(ca[, "p"]))
  ## (b) 随机森林 + 置换检验
  X <- dat[, pv]; y <- dat[[tg]]
  rf <- randomForest(X, y, ntree = 1000, importance = TRUE)
  imp_obs <- importance(rf, type = 1, scale = TRUE)[, 1]; r2_obs <- 1 - tail(rf$mse, 1) / var(y)
  null_imp <- matrix(NA, n_perm, length(pv), dimnames = list(NULL, pv)); null_r2 <- numeric(n_perm)
  for (i in seq_len(n_perm)) {
    yp <- sample(y); rfp <- randomForest(X, yp, ntree = 300, importance = TRUE)
    null_imp[i, ] <- importance(rfp, type = 1, scale = TRUE)[, 1]; null_r2[i] <- 1 - tail(rfp$mse, 1) / var(yp)
  }
  imp_p <- sapply(pv, function(v) (sum(null_imp[, v] >= imp_obs[v]) + 1) / (n_perm + 1))
  r2_p  <- (sum(null_r2 >= r2_obs) + 1) / (n_perm + 1)
  db <- data.frame(Var = pv, Cat = pcat, inc = pmax(imp_obs, 0), p = imp_p, star = stars(imp_p))
  ord <- pv[order(db$inc)]                     # 重要性从大到小自上而下
  da$Var <- factor(da$Var, levels = ord); db$Var <- factor(db$Var, levels = ord)
  pa <- ggplot(da, aes(x = 1, y = Var, fill = r)) + geom_tile(colour = "white") +
    geom_text(aes(label = star, colour = abs(r) > 0.5), size = fs / .pt, family = "Times New Roman", vjust = 0.75, show.legend = FALSE) +
    scale_colour_manual(values = c(`TRUE` = "white", `FALSE` = "black")) +
    scale_fill_gradient2(low = "#B2182B", mid = "#F7F7F7", high = "#08519C", limits = c(-1, 1), breaks = c(-1, 0, 1), name = "r") +
    scale_y_discrete(labels = L) + scale_x_continuous(expand = c(0, 0), breaks = NULL) +
    labs(x = NULL, y = NULL, tag = "(a)", title = tg) + theme_p() +
    theme(legend.position = "bottom", legend.key.height = grid::unit(0.25, "cm"), legend.key.width = grid::unit(0.6, "cm"),
          legend.text = element_text(size = fs - 2), legend.title = element_text(size = fs - 1),
          panel.border = element_blank(), axis.ticks = element_blank())
  pb <- ggplot(db, aes(inc, Var, fill = Cat)) + geom_col(width = 0.7, colour = "grey30", linewidth = 0.3) +
    geom_text(aes(label = star, x = inc + max(inc) * 0.03), hjust = 0, size = fs / .pt, family = "Times New Roman") +
    scale_fill_manual(values = cat_col) + scale_x_continuous(expand = expansion(mult = c(0, 0.22))) +
    labs(x = "Increase in MSE (%)", y = NULL, tag = "(b)",
         title = sprintf("%s; R\u00b2 = %.2f; P = %.3f", tg, r2_obs, r2_p)) +
    theme_p() + theme(axis.text.y = element_blank(), axis.ticks.y = element_blank(), legend.position = "none")
  ## (c) 线性混合模型
  lv <- unname(cf$lmm); lcat <- names(cf$lmm)
  dz <- dat[, c(lv, tg)]; dz[] <- lapply(dz, function(x) as.numeric(scale(x))); dz$Group <- dat$Group
  fml <- as.formula(paste(tg, "~", paste(lv, collapse = " + "), "+ (1 | Group)"))
  m <- lmer(fml, data = dz, REML = TRUE)
  fe <- fixef(m)[lv]; se <- sqrt(diag(as.matrix(vcov(m))))[lv]
  df_t <- nrow(dz) - length(lv) - 1; pz <- 2 * pt(-abs(fe / se), df_t)        # 小样本用 t 分布
  vf <- var(as.vector(model.matrix(m)[, lv] %*% fe)); vr <- as.numeric(VarCorr(m)$Group[1]); ve <- sigma(m)^2
  r2m <- vf / (vf + vr + ve); r2c <- (vf + vr) / (vf + vr + ve)
  dc <- data.frame(Var = lv, Cat = lcat, est = fe, lo = fe - qt(0.975, df_t) * se, hi = fe + qt(0.975, df_t) * se, p = pz, star = stars(pz))
  dc$Var <- factor(dc$Var, levels = lv[order(abs(fe))])
  rel <- dc %>% group_by(Cat) %>% summarise(s = sum(abs(est)), .groups = "drop") %>% mutate(pct = 100 * s / sum(s), Cat = factor(Cat, levels = c("Plant", "Soil", "Microbes")))
  # 各类整体显著性: 似然比检验 (去掉该类全部变量)
  rel$p <- sapply(as.character(rel$Cat), function(k) {
    keep <- lv[lcat != k]; f0 <- as.formula(paste(tg, "~", if (length(keep)) paste(keep, collapse = " + ") else "1", "+ (1 | Group)"))
    anova(lmer(f0, data = dz, REML = FALSE), lmer(fml, data = dz, REML = FALSE))[["Pr(>Chisq)"]][2]
  }); rel$star <- stars(rel$p)
  pc1 <- ggplot(rel, aes(x = 1, y = pct, fill = Cat)) + geom_col(width = 0.6, colour = "grey30", linewidth = 0.3) +
    geom_text(aes(label = star), position = position_stack(vjust = 0.5), size = fs / .pt, family = "Times New Roman", colour = "white") +
    scale_fill_manual(values = cat_col, breaks = c("Microbes", "Soil", "Plant")) + scale_y_continuous(expand = c(0, 0), limits = c(0, 100.01)) +
    scale_x_continuous(breaks = NULL) + labs(x = NULL, y = "Relative effect of estimates (%)", tag = "(c)") +
    theme_p() + theme(legend.position = "bottom", legend.direction = "vertical", legend.key.size = grid::unit(0.3, "cm"),
                      legend.margin = ggplot2::margin(0, 0, 0, 0))
  pc2 <- ggplot(dc, aes(est, Var, colour = Cat)) + geom_vline(xintercept = 0, linetype = 2, colour = "grey50") +
    geom_errorbarh(aes(xmin = lo, xmax = hi), height = 0.25, linewidth = 0.4) + geom_point(size = 2.2) +
    geom_text(aes(label = star, x = hi + 0.1), hjust = 0, size = fs / .pt, family = "Times New Roman", colour = "black") +
    scale_colour_manual(values = cat_col) + scale_y_discrete(labels = L, position = "right") +
    scale_x_continuous(expand = expansion(mult = c(0.05, 0.25))) +
    labs(x = "Parameter estimates", y = NULL, title = sprintf("%s; marginal R\u00b2 = %.2f; conditional R\u00b2 = %.2f", tg, r2m, r2c)) +
    theme_p() + theme(legend.position = "none")
  ## (d) 散点
  sc_plot <- function(s) {
    d <- do.call(rbind, lapply(s$ys, function(yv) data.frame(x = dat[[s$x]], y = dat[[yv]], Series = yv, GroupL = dat$GroupL)))
    fits <- sapply(s$ys, function(yv) { f <- summary(lm(dat[[yv]] ~ dat[[s$x]])); sprintf("%s  R\u00b2 = %.2f%s", yv, f$r.squared, stars(f$coefficients[2, 4])) })
    d$Series <- factor(d$Series, levels = s$ys, labels = fits)
    multi <- length(s$ys) > 1
    g <- ggplot(d, aes(x, y)) + geom_smooth(aes(group = Series, linetype = Series), method = "lm", formula = y ~ x, colour = "grey30", fill = "grey85", linewidth = 0.6, se = TRUE)
    if (multi) g <- g + geom_point(aes(shape = Series, colour = GroupL), size = 2) + scale_colour_manual(values = grp_col, guide = "none") +
      theme_p() + theme(legend.position = c(0.02, 0.98), legend.justification = c(0, 1), legend.background = element_blank(), legend.key.size = grid::unit(0.35, "cm"))
    else g <- g + geom_point(aes(colour = GroupL, shape = GroupL), size = 2) + scale_colour_manual(values = grp_col) + guides(linetype = "none") +
      labs(subtitle = fits[1]) + theme_p() + theme(legend.position = "bottom", plot.subtitle = element_text(size = fs))
    g + labs(x = paste0(L(s$x), " (", ifelse(s$x %in% c("VSC", "P"), "mg kg\u207b\u00b9", ifelse(s$x == "pH", "", "g kg\u207b\u00b9")), ")"),
             y = if (multi) "Residue C (g kg\u207b\u00b9)" else paste0(L(s$ys), " (g kg\u207b\u00b9)"))
  }
  pd <- sc_plot(cf$scat[[1]]) + labs(tag = "(d)") | sc_plot(cf$scat[[2]])
  top <- (pa + pb + pc1 + pc2) + plot_layout(widths = c(0.5, 2.2, 0.9, 2.6))
  fig <- top / pd + plot_layout(heights = c(2, 1.15))
  list(fig = fig, rf = data.frame(db, r2 = r2_obs, r2_p = r2_p), cor = da, lmm = dc, rel = rel, r2m = r2m, r2c = r2c)
}

for (k in names(cfg)) {
  res <- build_fig(cfg[[k]])
  ggsave(file.path(out_dir, paste0("Fig_driver_", k, ".pdf")), res$fig, width = 26, height = 17, units = "cm")
  ggsave(file.path(out_dir, paste0("Fig_driver_", k, ".png")), res$fig, width = 26, height = 17, units = "cm", dpi = 300)
  cat("\n==========", k, "==========\n随机森林 (R2 =", round(res$rf$r2[1], 3), ", P =", res$rf$r2_p[1], ")\n"); print(res$rf[order(-res$rf$inc), c("Var", "Cat", "inc", "p", "star")], row.names = FALSE)
  cat("\n混合模型 (marginal R2 =", round(res$r2m, 3), ", conditional R2 =", round(res$r2c, 3), ")\n"); print(res$lmm, row.names = FALSE)
  cat("\n分类相对效应 (%)\n"); print(res$rel, row.names = FALSE)
  write.csv(res$rf, file.path(out_dir, paste0("driver_rf_", k, ".csv")), row.names = FALSE)
  write.csv(res$lmm, file.path(out_dir, paste0("driver_lmm_", k, ".csv")), row.names = FALSE)
}
cat("\n完成.\n")
