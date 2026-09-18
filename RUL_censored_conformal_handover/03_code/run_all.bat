@echo off
rem 一键顺序运行。日志写到 logs\，出错请先看对应日志。
rem 用法:  run_all.bat            (用各脚本顶部的 DATA_DIR)
rem        run_all.bat E:\cmapss  (把数据目录传给五个脚本)
cd /d %~dp0
if not exist logs mkdir logs
set DATA=%1
echo [0/5] s00_env.py
python s00_env.py %DATA% > logs\s00.txt 2>&1
type logs\s00.txt
echo [1/5] s01_inspect.py
python s01_inspect.py %DATA% > logs\s01.txt 2>&1
if errorlevel 1 (echo s01 失败, 看 logs\s01.txt & exit /b 1)
echo [2/5] s02_baseline.py
python s02_baseline.py %DATA% > logs\s02.txt 2>&1
if errorlevel 1 (echo s02 失败, 看 logs\s02.txt & exit /b 1)
echo [3/5] s03_censoring.py  (几分钟)
python s03_censoring.py %DATA% > logs\s03.txt 2>&1
if errorlevel 1 (echo s03 失败, 看 logs\s03.txt & exit /b 1)
echo [4/5] s04_figures.R
Rscript s04_figures.R %DATA% > logs\s04.txt 2>&1
if errorlevel 1 (echo s04 失败, 看 logs\s04.txt & exit /b 1)
echo 全部完成。结果在 results\, 图在 figures\, 日志在 logs\
