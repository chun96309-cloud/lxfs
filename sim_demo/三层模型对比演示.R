# 模拟数据：三层 meta 分析模型对比演示（教学用，非真实数据，不用于发表）
# 情景A：忽略效应量依赖时显著，改用三层模型 + V 矩阵后不显著
# 情景B：真实效应较大，三种模型下均稳健显著
# 效应量为 lnRR，变量名为通用名，与任何真实稿件无关
# 依赖：R 4.5, metafor, clubSandwich, MASS, openxlsx

pkgs <- c("metafor", "clubSandwich", "MASS", "openxlsx")
for (p in pkgs) if (!requireNamespace(p, quietly = TRUE)) install.packages(p)
library(metafor)
library(MASS)
library(openxlsx)

# ---------------- 数据生成 ----------------
# K 个研究；每个研究 m_i 个效应量；少数研究贡献大量效应量（依赖结构的来源）
# yi = mu + u_i(研究间) + w_ij(研究内) + e_ij(抽样误差，同研究内相关 rho_true)
sim_meta <- function(K, mu, tau2_study, sigma2_within, rho_true) {
  m <- sample(c(1, 2, 3, 4, 10, 12), K, replace = TRUE,
              prob = c(0.25, 0.25, 0.2, 0.15, 0.08, 0.07))
  out <- vector("list", K)
  for (i in seq_len(K)) {
    vi <- runif(m[i], 0.002, 0.010)
    Vi <- rho_true * sqrt(outer(vi, vi))
    diag(Vi) <- vi
    ei <- if (m[i] == 1) rnorm(1, 0, sqrt(vi)) else mvrnorm(1, rep(0, m[i]), Vi)
    ui <- rnorm(1, 0, sqrt(tau2_study))
    wij <- rnorm(m[i], 0, sqrt(sigma2_within))
    out[[i]] <- data.frame(study = sprintf("S%02d", i),
                           es_id = seq_len(m[i]),
                           yi = mu + ui + wij + ei,
                           vi = vi)
  }
  d <- do.call(rbind, out)
  d$es <- seq_len(nrow(d))
  d
}

# ---------------- 三种模型 ----------------
fit_all <- function(d, rho_V = 0.5) {
  m1 <- rma(yi, vi, data = d, method = "REML")
  m2 <- rma.mv(yi, vi, random = ~ 1 | study / es, data = d, method = "REML")
  V  <- vcalc(vi, cluster = study, obs = es, rho = rho_V, data = d)
  m3 <- rma.mv(yi, V, random = ~ 1 | study / es, data = d, method = "REML")
  m4 <- robust(m3, cluster = d$study, clubSandwich = TRUE)
  list(m1 = m1, m2 = m2, m3 = m3, m4 = m4)
}

pct <- function(x) round((exp(x) - 1) * 100, 1)

summ <- function(fits, scen, d) {
  lab <- c("两层模型(忽略依赖)", "三层模型", "三层模型+V矩阵(rho=0.5)",
           "三层+V+CR2稳健方差")
  do.call(rbind, lapply(seq_along(fits), function(j) {
    f <- fits[[j]]
    data.frame(情景 = scen,
               模型 = lab[j],
               效应量数 = nrow(d),
               研究数 = length(unique(d$study)),
               估计_lnRR = round(as.numeric(f$b), 4),
               SE = round(as.numeric(f$se), 4),
               变化率_pct = pct(as.numeric(f$b)),
               CI下限_pct = pct(f$ci.lb),
               CI上限_pct = pct(f$ci.ub),
               P = signif(f$pval, 3),
               显著 = ifelse(f$pval < 0.05, "是", "否"),
               check.names = FALSE)
  }))
}

# ---------------- 按目标结果倒推：搜索满足条件的种子 ----------------
find_seed <- function(cond, pars, max_seed = 3000) {
  for (s in seq_len(max_seed)) {
    set.seed(s)
    d <- do.call(sim_meta, pars)
    fits <- tryCatch(fit_all(d), error = function(e) NULL)
    if (is.null(fits)) next
    p <- sapply(fits, function(f) f$pval)
    if (cond(p)) return(list(seed = s, d = d, fits = fits))
  }
  stop("未找到满足条件的种子，调整参数")
}

# 情景A：真实效应小、研究间异质性大、研究内抽样误差高度相关
parsA <- list(K = 30, mu = 0.03, tau2_study = 0.010,
              sigma2_within = 0.0004, rho_true = 0.7)
condA <- function(p) p[1] < 0.01 & p[3] > 0.10 & p[4] > 0.10

# 情景B：真实效应较大，其余参数与A相同
parsB <- list(K = 30, mu = 0.12, tau2_study = 0.010,
              sigma2_within = 0.0004, rho_true = 0.7)
condB <- function(p) all(p < 0.01)

resA <- find_seed(condA, parsA)
resB <- find_seed(condB, parsB)

tabA <- summ(resA$fits, "A", resA$d)
tabB <- summ(resB$fits, "B", resB$d)
tab  <- rbind(tabA, tabB)

# 方差分量
vc <- function(res, scen) {
  data.frame(情景 = scen, 种子 = res$seed,
             模型 = c("三层模型", "三层模型+V矩阵"),
             研究间方差 = round(c(res$fits$m2$sigma2[1], res$fits$m3$sigma2[1]), 5),
             研究内方差 = round(c(res$fits$m2$sigma2[2], res$fits$m3$sigma2[2]), 5),
             两层模型tau2 = round(res$fits$m1$tau2, 5),
             check.names = FALSE)
}
vtab <- rbind(vc(resA, "A"), vc(resB, "B"))

# V矩阵 rho 敏感性（情景A、B）
rho_sens <- function(d, scen) {
  do.call(rbind, lapply(c(0.3, 0.5, 0.7, 0.9), function(r) {
    V <- vcalc(vi, cluster = study, obs = es, rho = r, data = d)
    f <- rma.mv(yi, V, random = ~ 1 | study / es, data = d, method = "REML")
    data.frame(情景 = scen, rho = r, 变化率_pct = pct(as.numeric(f$b)),
               CI下限_pct = pct(f$ci.lb), CI上限_pct = pct(f$ci.ub),
               P = signif(f$pval, 3), check.names = FALSE)
  }))
}
stab <- rbind(rho_sens(resA$d, "A"), rho_sens(resB$d, "B"))

# ---------------- console 输出 ----------------
options(width = 200)
cat("\n==== 模拟数据：三层模型对比演示 ====\n")
cat("情景A 种子:", resA$seed, " 情景B 种子:", resB$seed, "\n")
cat("\n---- 数据前5行 ----\n")
print(head(resA$d, 5)); print(head(resB$d, 5))
cat("\n---- 每个研究的效应量数 ----\n")
print(table(情景A = table(resA$d$study)))
print(table(情景B = table(resB$d$study)))
cat("\n---- 模型对比 ----\n")
print(tab, row.names = FALSE)
cat("\n---- 方差分量 ----\n")
print(vtab, row.names = FALSE)
cat("\n---- V矩阵 rho 敏感性 ----\n")
print(stab, row.names = FALSE)
cat("\nR:", R.version.string, " metafor:", as.character(packageVersion("metafor")),
    " clubSandwich:", as.character(packageVersion("clubSandwich")), "\n")

# ---------------- xlsx 输出 ----------------
out_dir <- "E:/sim_demo"
dir.create(out_dir, showWarnings = FALSE, recursive = TRUE)
wb <- createWorkbook()
addWorksheet(wb, "模拟数据")
writeData(wb, "模拟数据", data.frame(说明 = c(
  "本文件全部为模拟数据，仅用于教学演示，不用于发表。",
  paste0("情景A参数: K=30, mu=0.03, tau2_study=0.010, sigma2_within=0.0004, rho_true=0.7, 种子=", resA$seed),
  paste0("情景B参数: K=30, mu=0.12, tau2_study=0.010, sigma2_within=0.0004, rho_true=0.7, 种子=", resB$seed),
  "情景A目标: 两层模型P<0.01；三层+V矩阵及CR2稳健方差P>0.10",
  "情景B目标: 四种模型P均<0.01")))
addWorksheet(wb, "情景A数据");  writeData(wb, "情景A数据", resA$d)
addWorksheet(wb, "情景B数据");  writeData(wb, "情景B数据", resB$d)
addWorksheet(wb, "模型对比");   writeData(wb, "模型对比", tab)
addWorksheet(wb, "方差分量");   writeData(wb, "方差分量", vtab)
addWorksheet(wb, "rho敏感性");  writeData(wb, "rho敏感性", stab)
saveWorkbook(wb, file.path(out_dir, "三层模型对比演示_模拟数据.xlsx"), overwrite = TRUE)
cat("已保存:", file.path(out_dir, "三层模型对比演示_模拟数据.xlsx"), "\n")
