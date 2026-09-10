# ==============================================================================
# 01_数据整合与差异分析.R      运行环境: R 4.5 (Windows), 在 RStudio 中直接 source 或逐段运行
# ------------------------------------------------------------------------------
# 功能:
#   (1) 读取 文章数据.xlsx 的 "汇总" 和 "微生物" 两个 sheet, 以及 index.xls (真菌 alpha 多样性,
#       该文件实际是制表符分隔的文本, 用 read.delim 读取)
#   (2) 合并成一张 16 行 (4 林型 x 4 重复) 的分析表, 计算派生指标, 保存为 merged_data.csv / analysis_objects.rds
#   (3) 对全部指标按林型做单因素方差分析 + 事后多重比较字母标记 (Tukey HSD, 可切换 LSD)
#   (4) 归纳各指标随林型的变化模式, 找出变化趋势一致的指标 (老师要求的第一步)
# 所有结果 print 到 console, 直接复制 console 输出即可
# ==============================================================================
rm(list = ls())
# install.packages(c("readxl", "dplyr", "car", "multcompView"))
suppressPackageStartupMessages({
  library(readxl); library(dplyr); library(car); library(multcompView)
})
options(width = 250, scipen = 6)

## ---- 0. 路径与参数: 只需改这里 ----------------------------------------------
data_dir <- "E:/lxfs"                              # 数据所在文件夹
f_main   <- file.path(data_dir, "文章数据.xlsx")     # 含 注释 / 汇总 / 微生物 三个 sheet
f_index  <- file.path(data_dir, "index.xls")        # 真菌 alpha 多样性 (B1-B16 顺序 = S1-S16)
posthoc  <- "HSD"                                   # "HSD" = Tukey HSD ; "LSD" = Fisher LSD
out_dir  <- file.path(data_dir, "output"); dir.create(out_dir, showWarnings = FALSE)

# 林型代码 -> 英文缩写 (按 注释 sheet 推断: ZY=针叶马尾松, KY=阔叶樟树, HJ=混交; 如有误在此修改)
group_levels <- c("CK", "ZY", "KY", "HJ")
group_labels <- c(CK = "Control", ZY = "PM", KY = "CC", HJ = "PM-CC")

## ---- 1. 读取 汇总 sheet ------------------------------------------------------
hz <- as.data.frame(read_excel(f_main, sheet = "汇总", .name_repair = "minimal"))
hz <- hz[!is.na(hz[[1]]) & grepl("^S\\d+$", hz[[1]]), ]
stopifnot(ncol(hz) == 42, nrow(hz) == 16)
names(hz) <- c("ID", "Group", "pH", "SOC", "TN", "TP", "EOC", "AN", "AP",
               "POC", "MAOC", "MAOC_SOC", "C_N", "C_P",
               "BG", "NAG", "LAP", "ACP", "Vector_length", "Vector_angle",
               "BRC", "FRC", "MRC", "MRC_SOC",
               "pHB", "VA", "PHBA", "SA", "pCA", "SAL", "AV", "FA", "AS", "Lignin_N",
               "Mt", "Agg_gt2", "Agg_0.25_2", "Agg_lt0.25", "fenzi", "GMD", "MWD", "R0.25")
hz[, -(1:2)] <- lapply(hz[, -(1:2)], function(x) as.numeric(as.character(x)))

## ---- 2. 读取 微生物 sheet (同名列按出现顺序取: 第1个 Others/MDS = 细菌, 第2个 = 真菌) ----
mic <- as.data.frame(read_excel(f_main, sheet = "微生物", .name_repair = "minimal"))
mic <- mic[!is.na(mic[[3]]) & grepl("^B\\d+$", mic[[3]]), ]
stopifnot(nrow(mic) == 16)
nm   <- names(mic)
pick <- function(name, k = 1) { idx <- which(nm == name); as.numeric(mic[[idx[k]]]) }
bac_phyla <- c("Proteobacteria", "Acidobacteriota", "Actinobacteriota", "Chloroflexi", "Methylomirabilota",
               "Myxococcota", "Gemmatimonadota", "Bacteroidota", "Verrucomicrobiota", "Planctomycetota")
fun_phyla <- c("Ascomycota", "Basidiomycota", "Rozellomycota", "Mortierellomycota", "Kickxellomycota", "Glomeromycota")
mb <- data.frame(Site = mic[[which(nm == "Site")]],
                 sapply(bac_phyla, pick), Bac_Others = pick("Others", 1),
                 B_Chao1 = pick("Chao1"), B_Shannon = pick("Shannon"), B_Pielou = pick("Pielou_e"),
                 B_Simpson = pick("Simpson"), B_Faith_pd = pick("Faith_pd"), B_Observed = pick("Observed_species"),
                 B_MDS1 = pick("MDS1", 1), B_MDS2 = pick("MDS2", 1),
                 sapply(fun_phyla, pick), Fun_Others = pick("Others", 2),
                 F_MDS1 = pick("MDS1", 2), F_MDS2 = pick("MDS2", 2),
                 check.names = FALSE)

## ---- 3. 读取 index.xls (真菌 alpha 多样性) -----------------------------------
fa <- tryCatch(read.delim(f_index, check.names = FALSE, stringsAsFactors = FALSE),
               error = function(e) NULL)
if (is.null(fa) || !"Chao1" %in% names(fa)) fa <- as.data.frame(read_excel(f_index))
fa <- fa[grepl("^B\\d+$", fa$Sample), ]
stopifnot(nrow(fa) == 16)
fa <- data.frame(F_Chao1 = as.numeric(fa$Chao1), F_Shannon = as.numeric(fa$Shannon),
                 F_Pielou = as.numeric(fa$Pielou_e), F_Simpson = as.numeric(fa$Simpson),
                 F_Observed = as.numeric(fa$Observed_species))

## ---- 4. 合并 + 一致性检查 -----------------------------------------------------
dat <- cbind(hz, mb, fa)
cat("\n== 样本-林型对应检查 (汇总.Group 与 微生物.Site 前缀应一致) ==\n")
print(data.frame(ID = dat$ID, Group = dat$Group, Site = dat$Site,
                 ok = dat$Group == sub("-.*", "", dat$Site)))
stopifnot(all(dat$Group == sub("-.*", "", dat$Site)))
dat$Group <- factor(dat$Group, levels = group_levels)

## ---- 5. 派生指标 --------------------------------------------------------------
dat <- dat %>% mutate(
  POC_SOC    = POC / SOC,                 # 与 MAOC_SOC 同为比例 (0-1); MRC_SOC 原表为 %
  MAOC_POC   = MAOC / POC,
  BRC_SOC    = BRC / SOC * 100,           # %
  FRC_SOC    = FRC / SOC * 100,           # %
  FRC_BRC    = FRC / BRC,
  GM_MAOC_MRC = sqrt(MAOC * MRC),         # 老师提的: MAOC 与 MRC 的几何平均, 作稳定性碳组分综合指标
  GM_ratio   = sqrt(MAOC_SOC * MRC_SOC / 100),
  # 酶化学计量 (Sinsabaugh et al. 2008; Moorhead et al. 2016)
  EEA_CN     = log(BG) / log(NAG + LAP),
  EEA_CP     = log(BG) / log(ACP),
  EEA_NP     = log(NAG + LAP) / log(ACP),
  # 木质素酚分族 (Hedges & Mann 1979; Otto & Simpson 2006): 无香草醛, V 族只含香草酸+香草酮
  V          = VA + AV,
  S          = SA + SAL + AS,
  C          = pCA + FA,
  P          = pHB + PHBA,
  VSC        = V + S + C,                 # mg/kg 土
  VSC_SOC    = VSC / SOC,                 # mg/g SOC, 植物源碳相对贡献
  S_V        = S / V,
  C_V        = C / V,
  AdAl_S     = SA / SAL                   # 丁香基酸/醛比, 木质素氧化(降解)程度
)

## ---- 6. 指标分组 (老师说的几大类) ------------------------------------------------
blocks <- list(
  "1_土壤养分与理化"     = c("pH", "SOC", "TN", "TP", "EOC", "AN", "AP", "C_N", "C_P"),
  "2_碳组分与稳定性"     = c("POC", "MAOC", "POC_SOC", "MAOC_SOC", "MAOC_POC", "GM_MAOC_MRC", "GM_ratio"),
  "3_微生物残体_微生物源碳" = c("BRC", "FRC", "MRC", "BRC_SOC", "FRC_SOC", "MRC_SOC", "FRC_BRC"),
  "4_木质素酚_植物源碳"   = c("pHB", "VA", "PHBA", "SA", "pCA", "SAL", "AV", "FA", "AS",
                            "V", "S", "C", "P", "VSC", "VSC_SOC", "S_V", "C_V", "AdAl_S", "Lignin_N"),
  "5_酶活性与养分限制"   = c("BG", "NAG", "LAP", "ACP", "EEA_CN", "EEA_CP", "EEA_NP", "Vector_length", "Vector_angle"),
  "6_团聚体稳定性"       = c("Agg_gt2", "Agg_0.25_2", "Agg_lt0.25", "GMD", "MWD", "R0.25"),
  "7_细菌群落"           = c(bac_phyla, "Bac_Others", "B_Chao1", "B_Shannon", "B_Pielou", "B_Simpson", "B_Faith_pd", "B_Observed"),
  "8_真菌群落"           = c(fun_phyla, "Fun_Others", "F_Chao1", "F_Shannon", "F_Pielou", "F_Simpson", "F_Observed")
)
all_vars <- unlist(blocks, use.names = FALSE)
stopifnot(all(all_vars %in% names(dat)))

write.csv(dat, file.path(out_dir, "merged_data.csv"), row.names = FALSE)
saveRDS(list(dat = dat, blocks = blocks, group_labels = group_labels,
             bac_phyla = bac_phyla, fun_phyla = fun_phyla),
        file.path(out_dir, "analysis_objects.rds"))

cat("\n== 合并后数据: 前 5 行 (前 14 列) ==\n"); print(head(dat[, 1:14], 5))
cat("\n== 每组样本数 ==\n"); print(table(dat$Group))

## ---- 7. 差异分析函数 ------------------------------------------------------------
diff_one <- function(df, v) {
  d <- data.frame(g = df$Group, y = df[[v]]); d <- d[is.finite(d$y), ]
  res <- data.frame(Var = v, stringsAsFactors = FALSE)
  ms  <- tapply(d$y, d$g, mean); se <- tapply(d$y, d$g, function(x) sd(x) / sqrt(length(x)))
  if (length(unique(d$y)) < 3 || any(table(d$g) < 2)) {   # 常数或缺失过多
    for (g in group_levels) res[[g]] <- fmt_ms(ms[g], se[g])
    res$F_value <- NA; res$P_anova <- NA; res$P_KW <- NA; res$P_shapiro <- NA; res$P_levene <- NA
    res$Letters <- NA; res$Order <- NA; return(res)
  }
  fit <- aov(y ~ g, data = d); a <- summary(fit)[[1]]
  let <- posthoc_letters(fit, d, ms)
  for (g in group_levels) res[[g]] <- fmt_ms(ms[g], se[g], let[g])
  res$F_value   <- round(a[["F value"]][1], 2)
  res$P_anova   <- signif(a[["Pr(>F)"]][1], 3)
  res$P_KW      <- signif(kruskal.test(y ~ g, data = d)$p.value, 3)
  res$P_shapiro <- signif(tryCatch(shapiro.test(residuals(fit))$p.value, error = function(e) NA), 3)
  res$P_levene  <- signif(leveneTest(y ~ g, data = d)[["Pr(>F)"]][1], 3)
  res$Letters   <- paste(let, collapse = " ")                              # 顺序 CK ZY KY HJ
  res$Order     <- paste(names(sort(ms, decreasing = TRUE)), collapse = ">")
  res
}

# 事后多重比较字母: 均值最大的组为 a; HSD 用 TukeyHSD, LSD 用合并方差的两两 t 检验 (不校正)
posthoc_letters <- function(fit, d, ms) {
  if (posthoc == "LSD") {
    pt <- pairwise.t.test(d$y, d$g, p.adjust.method = "none", pool.sd = TRUE)$p.value
    pv <- c(); for (i in rownames(pt)) for (j in colnames(pt)) if (!is.na(pt[i, j])) pv[paste(i, j, sep = "-")] <- pt[i, j]
  } else {
    tk <- TukeyHSD(fit)$g; pv <- setNames(tk[, "p adj"], rownames(tk))
  }
  lt <- multcompLetters(pv, threshold = 0.05)$Letters
  # multcompLetters 按名称顺序给字母, 这里重新映射为: 均值最大 = a
  ord <- names(sort(ms, decreasing = TRUE)); lt <- lt[ord]
  map <- setNames(letters[seq_along(unique(unlist(strsplit(paste(lt, collapse = ""), ""))))],
                  unique(unlist(strsplit(paste(lt, collapse = ""), ""))))
  lt <- sapply(lt, function(z) paste(sort(map[strsplit(z, "")[[1]]]), collapse = ""))
  lt[group_levels]
}

fmt_ms <- function(m, s, l = "") {   # 均值3位有效数字, SE 2位, 不用科学计数
  trimws(paste(format(signif(m, 3), scientific = FALSE, big.mark = ""), "±",
               format(signif(s, 2), scientific = FALSE, big.mark = ""), l))
}

sig_mark <- function(p) ifelse(is.na(p), "", ifelse(p < 0.001, "***", ifelse(p < 0.01, "**", ifelse(p < 0.05, "*", "ns"))))

## ---- 8. 逐类打印差异分析结果 (均值 ± SE, 字母为事后检验分组) --------------------------
res_all <- list()
for (b in names(blocks)) {
  r <- do.call(rbind, lapply(blocks[[b]], function(v) diff_one(dat, v)))
  r$Sig <- sig_mark(r$P_anova); r$Block <- b
  res_all[[b]] <- r
  cat("\n\n############", b, "  (n = 4/组; 事后检验 =", posthoc, "; 字母顺序 CK ZY KY HJ) ############\n")
  print(r[, c("Var", group_levels, "F_value", "P_anova", "Sig", "P_KW", "P_shapiro", "P_levene", "Order")], row.names = FALSE)
}
res_all <- do.call(rbind, res_all); rownames(res_all) <- NULL
write.csv(res_all, file.path(out_dir, "difference_analysis_all.csv"), row.names = FALSE)

## ---- 9. 变化模式归纳: 找变化趋势一致的指标 ---------------------------------------------
cat("\n\n############ 9.1 显著 (P<0.05) 指标按均值排序模式归类 ############\n")
sig <- res_all[!is.na(res_all$P_anova) & res_all$P_anova < 0.05, ]
sp  <- split(sig$Var, sig$Order)
for (k in names(sp)) cat(sprintf("%-14s (%2d 个): %s\n", k, length(sp[[k]]), paste(sp[[k]], collapse = ", ")))

cat("\n############ 9.2 显著指标按字母模式归类 (CK ZY KY HJ) ############\n")
sp2 <- split(sig$Var, sig$Letters)
for (k in names(sp2)) cat(sprintf("%-12s (%2d 个): %s\n", k, length(sp2[[k]]), paste(sp2[[k]], collapse = ", ")))

cat("\n############ 9.3 不显著指标 (P>=0.05) 及其均值排序 ############\n")
ns <- res_all[is.na(res_all$P_anova) | res_all$P_anova >= 0.05, c("Block", "Var", "P_anova", "Order")]
print(ns, row.names = FALSE)

cat("\n############ 9.4 全部指标组均值标准化后的层次聚类 (找同趋势指标; 每行 z-score, Ward.D2) ############\n")
prof <- t(sapply(all_vars, function(v) tapply(dat[[v]], dat$Group, mean, na.rm = TRUE)))
prof <- prof[apply(prof, 1, function(x) all(is.finite(x)) && sd(x) > 0), ]
profz <- t(scale(t(prof)))
hc <- hclust(dist(profz), method = "ward.D2")
k  <- 6
cl <- cutree(hc, k = k)
for (i in seq_len(k)) {
  vs <- names(cl)[cl == i]
  cen <- colMeans(profz[vs, , drop = FALSE])
  cat(sprintf("\n聚类 %d  中心轮廓 (z): CK=%.2f ZY=%.2f KY=%.2f HJ=%.2f   [%d 个指标]\n",
              i, cen["CK"], cen["ZY"], cen["KY"], cen["HJ"], length(vs)))
  cat("   显著: ", paste(intersect(vs, sig$Var), collapse = ", "), "\n")
  cat("   不显著: ", paste(setdiff(vs, sig$Var), collapse = ", "), "\n")
}

cat("\n############ 9.5 混交林 HJ 相对其他林型的位置 (显著指标) ############\n")
pos <- sapply(strsplit(sig$Order, ">"), function(o) which(o == "HJ"))
cat("HJ 最高: ", paste(sig$Var[pos == 1], collapse = ", "), "\n")
cat("HJ 第二: ", paste(sig$Var[pos == 2], collapse = ", "), "\n")
cat("HJ 第三: ", paste(sig$Var[pos == 3], collapse = ", "), "\n")
cat("HJ 最低: ", paste(sig$Var[pos == 4], collapse = ", "), "\n")

cat("\n完成. 结果文件: ", out_dir, "\n  merged_data.csv / analysis_objects.rds / difference_analysis_all.csv\n")
