# 文献清单：删失下的共形预测与剩余寿命预测

说明：标注"免费全文"的链接可直接打开下载 PDF，无需机构订阅。标注"DOI"的需要机构权限，但都能在 Google Scholar 上按标题搜到，通常有其他免费副本。

---

## 一、必读四篇（方向的骨架）

**1. Conformalized Survival Analysis**
Candès E J, Lei L, Ren Z. Journal of the Royal Statistical Society Series B, 2023, 85(1): 24-45.

- 免费全文：https://arxiv.org/abs/2103.09763
- PDF 直链：https://arxiv.org/pdf/2103.09763
- DOI：https://doi.org/10.1093/jrsssb/qkac004

整个方向的核心。先按删失时间截取子集，再用加权共形修正协变量偏移，得到生存时间的下预测界。重点看方法那一节的两步构造，以及 Type-I 删失下的有限样本覆盖保证和条件独立删失下的双稳健性。

**2. Conformalized survival analysis with adaptive cut-offs**
Gui Y, Hore R, Ren Z, Barber R F. Biometrika, 2024, 111(2): 459-477.

- 免费全文：https://arxiv.org/abs/2211.01227
- PDF 直链：https://arxiv.org/pdf/2211.01227
- DOI：https://doi.org/10.1093/biomet/asad076

把上一篇的固定阈值换成随协变量变化的自适应截断。机队的删失机制是异质的，这一篇的改进在航空场景比在医学场景更有必要，是论文里论证"不是简单套用"的主要依据。

**3. Conformal Prediction Intervals for Remaining Useful Lifetime Estimation**
Javanmardi A, Hüllermeier E. International Journal of Prognostics and Health Management, 2023, 14(2).

- 免费全文：https://arxiv.org/abs/2212.14612
- 期刊 PDF：https://papers.phmsociety.org/index.php/ijphm/article/download/3417/2077

这篇是必须正面处理的对手。它已经把共形预测系统地用在 C-MAPSS 上，含非交换共形和 CQR。看清它假设标签完全可观测这一点，我们的差异化就是从这里开始的。

**4. Conformal prediction under covariate shift**
Tibshirani R J, Barber R F, Candès E, Ramdas A. NeurIPS, 2019.

- 免费全文：https://arxiv.org/abs/1904.06019
- PDF 直链：https://arxiv.org/pdf/1904.06019

加权共形的原始出处。第一篇里的加权那一步就是直接调用这套机器。不看这篇，第一篇的第三步理解不了。

---

## 二、方法背景（补基础用）

**5. A Gentle Introduction to Conformal Prediction and Distribution-Free Uncertainty Quantification**
Angelopoulos A N, Bates S. arXiv:2107.07511, 2021.

- 免费全文：https://arxiv.org/abs/2107.07511

共形预测最好的入门材料，配代码。让学生先读这篇再读别的。

**6. Conformalized Quantile Regression**
Romano Y, Patterson E, Candès E. NeurIPS, 2019.

- 免费全文：https://arxiv.org/abs/1905.03222

CQR 的出处。区间宽度随输入自适应，比固定宽度的分裂共形好用。

**7. Conformal Prediction Beyond Exchangeability**
Barber R F, Candès E J, Ramdas A, Tibshirani R J. Annals of Statistics, 2023, 51(2): 816-845.

- 免费全文：https://arxiv.org/abs/2202.13415

可交换性不成立时怎么办。第 3 篇里的非交换共形就出自这里。

**8. Distribution-Free Predictive Inference for Regression**
Lei J, G'Sell M, Rinaldo A, Tibshirani R J, Wasserman L. JASA, 2018, 113(523): 1094-1111.

- 免费全文：https://arxiv.org/abs/1604.04173

分裂共形在回归上的系统处理。

---

## 三、数据集原文（写数据描述时引用）

**9. Aircraft Engine Run-to-Failure Dataset under Real Flight Conditions for Prognostics and Diagnostics**
Arias Chao M, Kulkarni C, Goebel K, Fink O. Data, 2021, 6(1): 5.

- 免费全文（开放获取）：https://doi.org/10.3390/data6010005

N-CMAPSS 的官方数据说明。八个子集的失效模式、变量定义、飞行等级划分全在这里。写数据那一节直接照它写。

**10. Damage Propagation Modeling for Aircraft Engine Run-to-Failure Simulation**
Saxena A, Goebel K, Simon D, Eklund N. PHM Conference, 2008.

- DOI：https://doi.org/10.1109/PHM.2008.4711414

原始 C-MAPSS 的出处，以及 PHM08 Score 那个评价函数的定义。引用 Score 时必须引这篇。

---

## 四、生存分析基础（讲课和写方法用）

**11. Nonparametric Estimation from Incomplete Observations**
Kaplan E L, Meier P. JASA, 1958, 53(282): 457-481.
DOI：https://doi.org/10.1080/01621459.1958.10501452

**12. Regression Models and Life-Tables**
Cox D R. JRSS-B, 1972, 34(2): 187-220.
DOI：https://doi.org/10.1111/j.2517-6161.1972.tb00899.x

**13. Random Survival Forests**
Ishwaran H, Kogalur U B, Blackstone E H, Lauer M S. Annals of Applied Statistics, 2008, 2(3): 841-860.
免费全文：https://arxiv.org/abs/0811.1645

**14. A Proportional Hazards Model for the Subdistribution of a Competing Risk**
Fine J P, Gray R J. JASA, 1999, 94(446): 496-509.
DOI：https://doi.org/10.1080/01621459.1999.10474144

竞争风险留作扩展方向，这篇先放着，暂时不用精读。

**15. Effective Ways to Build and Evaluate Individual Survival Distributions**
Haider H, Hoehn B, Davis S, Greiner R. JMLR, 2020, 21(85): 1-63.
免费全文：https://jmlr.org/papers/v21/18-772.html

D-calibration 的出处。评价生存分布是否校准，写指标那一节要用。

---

## 五、最新扩展（写相关工作，也用来确认没被抢先）

这几篇都是 2024 年之后的，方向紧挨着我们要做的东西，投稿前务必逐篇确认它们有没有已经做了航空场景。

**16. Two-sided conformalized survival analysis**
Holmes C, Marandon A. arXiv:2410.24136, 2024.
https://arxiv.org/abs/2410.24136

**17. Doubly Robust Conformalized Survival Analysis with Right-Censored Data**
arXiv:2412.09729, 2024.
https://arxiv.org/abs/2412.09729

**18. Conformal Predictive Intervals in Survival Analysis: A Re-sampling Approach**
arXiv:2408.06539, 2024.
https://arxiv.org/abs/2408.06539

**19. Doubly Robust and Efficient Calibration of Prediction Sets for Censored Time-to-Event Outcomes**
arXiv:2501.04615, 2025.
https://arxiv.org/abs/2501.04615

**20. History-Aware Conformal Prediction Sets for Censored Time-to-Event Outcomes**
arXiv:2605.06581, 2026.
https://arxiv.org/abs/2605.06581

这一篇最需要警惕。带历史信息的删失时间共形，和逐循环监测数据下的剩余寿命预测在结构上非常接近。先读它，确认差异在哪。

---

## 阅读顺序建议

第一周：5 → 4 → 1
第二周：3 → 2
第三周：9 → 20 → 16

11 到 15 按需查阅，不必按顺序读完。

## 找不到全文时

按标题在 Google Scholar 搜索，点标题右侧的"所有 N 个版本"，通常能找到作者主页或机构仓库的免费副本。
