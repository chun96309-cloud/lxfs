画各种图 —— 目录结构与使用说明

工作根目录: C:\Users\23027\Desktop\11\画各种图

目录结构
  data\                     输入数据, txt 或 xlsx 都支持
      expression_matrix.txt     表达矩阵 436 基因 x 6 样本 (制表符分隔)
      marker_genes.txt          marker 基因名, 单列, 可以没有表头
      (同名的 .xlsx 也可以, 两种都在时优先读 .txt)
  scripts\                  分析与绘图脚本
      plot_vector_figures.py        释放曲线与肿瘤体积折线图 (Python)
      coexpression_heatmap.py       共表达热图 (Python)
      coexpression_heatmap.R        共表达热图 (R, ComplexHeatmap)
      make_coexpression_docx.js     分析说明 Word 文档生成 (Node)
  YYYY-MM-DD\               每天的输出, 脚本运行时按当天日期自动新建

运行方式 (脚本会自动把工作目录切到上面这个根目录, 在哪里运行都一样)
  python plot_vector_figures.py
  python coexpression_heatmap.py
  Rscript coexpression_heatmap.R
  node make_coexpression_docx.js

  四个脚本开头都用 chdir / setwd 把工作目录直接切到工作根目录,
  不需要传参数, 输入自动从 data\ 读取,
  输出自动写入 <工作根目录>\当天日期\ 文件夹, 该文件夹不存在时自动创建。
  要换到别的目录, 只改各脚本开头的 WORK_ROOT 一行。
  也可以手动指定:
  python coexpression_heatmap.py 其他表达矩阵.txt 其他marker.txt

每次输出的文件
  Fig1_SeNPs_release.pdf / .svg / .png        释放曲线
  Fig2_Tumor_volume.pdf / .svg / .png         肿瘤体积曲线
  Fig_coexpression_heatmap_horizontal.*       共表达热图, 横版
  Fig_coexpression_heatmap_vertical.*         共表达热图, 竖版
  Fig_coexpression_heatmap_correlation_full.csv   全部 r / P / BH q 值
  Fig_coexpression_heatmap_gene_lists.json        入选基因被哪些 marker 选中 (供 Word 文档用)
  共表达热图分析说明.docx                      原理与结果说明文档

注意
  PDF 和 SVG 是矢量格式, 投稿和排版用这两个;
  PNG 是 300 dpi 位图, 插入 Word 或 PPT 时用。
  Word 文档里的插图取自同一天输出文件夹中的 PNG,
  所以先跑绘图脚本, 再跑 make_coexpression_docx.js。
  R 脚本需要先安装 readxl, circlize 和 ComplexHeatmap。
