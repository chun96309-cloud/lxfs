# 喀斯特人工林 SOC 稳定性数据分析 (MAOC / MRC 作为目标变量)

## 文件放置
把下面三个文件放在同一个文件夹 (脚本顶部 `data_dir` 改成该路径):

| 文件 | 内容 |
|---|---|
| 文章数据.xlsx | 注释 / 汇总 / 微生物 三个 sheet |
| index.xls | 真菌 alpha 多样性 (B1-B16 顺序 = S1-S16), 实为制表符文本 |

## 运行顺序
1. `01_数据整合与差异分析.R`: 合并三张表, 计算派生指标, 全指标单因素方差分析 + Tukey HSD 字母, 变化模式归类。生成 `output/analysis_objects.rds`。
2. `02_相关性分析_MAOC_MRC.R`: 以 MAOC、MAOC/SOC、MRC、MRC/SOC、FRC、sqrt(MAOC*MRC) 为目标变量, 与全部指标做 Pearson/Spearman 相关; 核心指标相关矩阵; 各指标块 Mantel 检验; 三张图。

结果全部 print 在 console, 同时保存 CSV 与图到 `output/`。

## 林型代码
数据中的组代码与注释 sheet 的对应为推断: CK = Control (荒草地), ZY = PM (马尾松针叶林), KY = CC (樟树阔叶林), HJ = PM-CC (马尾松-樟树混交林)。如不对, 改 01 脚本的 `group_labels`。

## 派生指标
- 碳组分: POC/SOC, MAOC/POC, GM_MAOC_MRC = sqrt(MAOC*MRC)
- 微生物残体: BRC/SOC, FRC/SOC (%), FRC/BRC
- 酶计量: EEA_CN = ln(BG)/ln(NAG+LAP), EEA_CP = ln(BG)/ln(ACP), EEA_NP = ln(NAG+LAP)/ln(ACP)
- 木质素酚: V = VA+AV, S = SA+SAL+AS, C = pCA+FA, P = pHB+PHBA, VSC = V+S+C, VSC/SOC, S/V, C/V, (Ad/Al)s = SA/SAL
