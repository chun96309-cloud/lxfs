# 喀斯特人工林 SOC 稳定性数据分析 (MAOC / MRC 作为目标变量)

## 文件放置
把两个数据文件放在同一个文件夹, 每个脚本顶部 `data_dir` 改成该路径:

| 文件 | 内容 |
|---|---|
| 文章数据.xlsx | 注释 / 汇总 / 微生物 三个 sheet |
| index.xls | 真菌 alpha 多样性 (B1-B16 顺序 = S1-S16), 实为制表符文本 |

## 安装包 (只需一次)
```r
install.packages(c("readxl", "dplyr", "tidyr", "car", "multcompView", "Hmisc", "corrplot", "ggplot2",
                   "vegan", "showtext", "patchwork", "randomForest", "lme4"))
```

## 脚本与运行顺序 (或直接 source 00_一键运行.R)
| 脚本 | 功能 | 输出 |
|---|---|---|
| 01_数据整合与差异分析.R | 合并三张表, 派生指标, 单因素方差分析 + Tukey 字母, 变化模式归类 | merged_data.csv, analysis_objects.rds, difference_analysis_all.csv |
| 02_相关性分析_MAOC_MRC.R | 六个目标变量与全指标 Pearson/Spearman, 核心矩阵, 分块 Mantel, 三张图 | correlation_targets_vs_all.csv, core_cor_*.csv, mantel_*.csv, Fig_heatmap / Fig_scatter / Fig_cor_matrix_core |
| 03_柱状图与群落图.R | 八类指标柱状图, 酶计量散点, 团聚体与群落组成堆叠图, alpha 多样性, NMDS | Fig_bar_*, Fig_5b, Fig_6b, Fig_7a, Fig_8a, Fig_7d_8d_NMDS |
| 04_相关性分析图.R | MAOC / MRC 为目标的 r 条形图, 总相关矩阵, 八类指标两两相关热图 (28 张), Mantel 热图 | Fig_cor_target_*, Fig_cor_total, cor_block_pairs/, Fig_mantel_blocks_vs_targets |
| 05_目标变量驱动因子组合图.R | 仿模板组合图: 相关热图列 + 随机森林 + 混合模型 + 散点 | Fig_driver_MAOC, Fig_driver_MRC, driver_rf_*.csv, driver_lmm_*.csv |

所有结果 print 在 console, 图输出 PDF + 300 dpi PNG, 字体英文 Times New Roman 五号, 中文宋体五号 (showtext 读取 C:/Windows/Fonts)。

## 林型代码
CK = Control (荒草地), ZY = PM (马尾松), KY = CC (樟树), HJ = PM-CC (混交林), 为推断; 不对则改 01 脚本的 `group_labels`。

## 派生指标
- 碳组分: POC/SOC, MAOC/POC, GM_MAOC_MRC = sqrt(MAOC*MRC)
- 微生物残体: BRC/SOC, FRC/SOC (%), FRC/BRC
- 酶计量: EEA_CN = ln(BG)/ln(NAG+LAP), EEA_CP = ln(BG)/ln(ACP), EEA_NP = ln(NAG+LAP)/ln(ACP)
- 木质素酚: V = VA+AV, S = SA+SAL+AS, C = pCA+FA, P = pHB+PHBA, VSC = V+S+C, VSC/SOC, S/V, C/V, (Ad/Al)s = SA/SAL

## 可调参数
- 01: `posthoc` ("HSD" 或 "LSD"), 聚类数 `k`
- 05: `cfg` 里每个目标变量的预测变量 (三类) 、混合模型变量 (n = 16, 建议不超过 5 个)、散点变量; 置换次数 `n_perm`
