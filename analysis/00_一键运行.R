# ==============================================================================
# 00_一键运行.R   按顺序运行全部分析脚本 (R 4.5, Windows, 在 RStudio 中 source 本文件)
# ------------------------------------------------------------------------------
# 使用前: (1) 把 文章数据.xlsx 和 index.xls 放到 data_dir 文件夹
#         (2) 把下面 script_dir 和每个脚本顶部的 data_dir 改成你的路径
#         (3) 第一次运行先装包:
# install.packages(c("readxl", "dplyr", "tidyr", "car", "multcompView", "Hmisc", "corrplot", "ggplot2",
#                    "vegan", "showtext", "patchwork", "randomForest", "lme4"))
# ==============================================================================
script_dir <- "E:/lxfs/analysis"
for (f in c("01_数据整合与差异分析.R", "02_相关性分析_MAOC_MRC.R", "03_柱状图与群落图.R",
            "04_相关性分析图.R", "05_目标变量驱动因子组合图.R")) {
  cat("\n\n################ 运行:", f, "################\n")
  source(file.path(script_dir, f), encoding = "UTF-8", echo = FALSE)
}
cat("\n全部完成. 结果在 data_dir/output\n")
