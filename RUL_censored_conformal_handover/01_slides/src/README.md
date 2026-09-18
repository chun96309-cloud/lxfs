# 第二次课 PPT 生成脚本

`build_lesson2.js` 用 pptxgenjs 生成 `../第二次课_从想法到能跑的东西.pptx`，22 页，每页带演讲者备注。

```
cd 01_slides/src
npm install
node build_lesson2.js
```

第 17 到 20 页的图从 `../../03_code/figures/` 读，所以先跑完 `03_code` 的五个脚本。要改页面文字，改本文件后重新生成，不要手改 pptx。
