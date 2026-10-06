"""
真实数据获取与解析：SNDlib 静态网络（拓扑、容量、需求）、SNDlib 动态流量矩阵、Topology Zoo 拓扑。
只做下载、解析、打印结构与前五行，不做任何建模。

用法：
  python load_real_data.py --out ./real_data
下载失败时按脚本末尾打印的地址手动下载到 --out 目录后重跑。
"""
import argparse
import io
import os
import re
import tarfile
import urllib.request
import zipfile

import networkx as nx
import pandas as pd

SNDLIB_BASE = "https://sndlib.put.poznan.pl/download/"
FILES = {
    "static": "sndlib-networks-native.zip",
    "abilene_dyn": "directed-abilene-zhang-5min-over-6months-ALL-native.tgz",
    "geant_dyn": "directed-geant-uhlig-15min-over-4months-ALL-native.tgz",
}
TOPOZOO = "http://www.topology-zoo.org/files/archive.zip"
TARGET_NETS = ["abilene", "geant", "germany50", "nobel-germany", "nobel-us", "polska", "atlanta"]


def download(url, dst):
    if os.path.exists(dst):
        print(f"已存在 {dst}")
        return True
    try:
        print(f"下载 {url}")
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=120) as r, open(dst, "wb") as f:
            f.write(r.read())
        return True
    except Exception as e:
        print(f"下载失败 {url}: {e}")
        return False


def parse_sndlib_native(text):
    """解析 SNDlib native 格式，返回 nodes, links, demands 三个 DataFrame。"""
    def section(name):
        m = re.search(name + r"\s*\(\s*\n(.*?)\n\)", text, re.S)
        return m.group(1).splitlines() if m else []

    nodes = []
    for ln in section("NODES"):
        m = re.match(r"\s*(\S+)\s*\(\s*([-\d.eE+]+)\s+([-\d.eE+]+)\s*\)", ln)
        if m:
            nodes.append(dict(node=m.group(1), x=float(m.group(2)), y=float(m.group(3))))
    links = []
    for ln in section("LINKS"):
        m = re.match(r"\s*(\S+)\s*\(\s*(\S+)\s+(\S+)\s*\)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s*\((.*)\)", ln)
        if m:
            mods = re.findall(r"([-\d.eE+]+)\s+([-\d.eE+]+)", m.group(8))
            links.append(dict(link=m.group(1), src=m.group(2), dst=m.group(3),
                              pre_cap=float(m.group(4)), pre_cost=float(m.group(5)),
                              routing_cost=float(m.group(6)), setup_cost=float(m.group(7)),
                              n_modules=len(mods),
                              module_cap=float(mods[0][0]) if mods else None,
                              module_cost=float(mods[0][1]) if mods else None))
    demands = []
    for ln in section("DEMANDS"):
        m = re.match(r"\s*(\S+)\s*\(\s*(\S+)\s+(\S+)\s*\)\s+(\S+)\s+([-\d.eE+]+)\s+(\S+)", ln)
        if m:
            demands.append(dict(demand=m.group(1), src=m.group(2), dst=m.group(3),
                                routing_unit=m.group(4), value=float(m.group(5)),
                                max_path_len=m.group(6)))
    return pd.DataFrame(nodes), pd.DataFrame(links), pd.DataFrame(demands)


def show(df, title, n=5):
    print(f"\n--- {title}: 形状 {df.shape} ---")
    if len(df):
        print(df.head(n).to_string())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="./real_data")
    ap.add_argument("--skip_dynamic", action="store_true", help="跳过动态流量矩阵（文件较大）")
    ap.add_argument("--skip_zoo", action="store_true")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    # 1. SNDlib 静态网络
    zpath = os.path.join(args.out, FILES["static"])
    if download(SNDLIB_BASE + FILES["static"], zpath):
        with zipfile.ZipFile(zpath) as z:
            names = z.namelist()
            print(f"\nSNDlib 静态压缩包内文件数 {len(names)}，前 10 个：{names[:10]}")
            for net in TARGET_NETS:
                cand = [n for n in names if re.search(rf"(^|/){net}\.txt$", n)]
                if not cand:
                    print(f"\n未找到 {net}")
                    continue
                text = z.read(cand[0]).decode("utf-8", errors="ignore")
                nodes, links, demands = parse_sndlib_native(text)
                print(f"\n==== {net}: 节点 {len(nodes)} 链路 {len(links)} 需求 {len(demands)} ====")
                show(links, f"{net} links")
                show(demands, f"{net} demands")
                if len(links):
                    print(f"pre_cap 统计: 非零比例 {(links.pre_cap > 0).mean():.2f}，module_cap 取值 {sorted(links.module_cap.dropna().unique())[:5]}")
                if len(demands):
                    print(f"需求 value 分位数: {demands.value.quantile([0, .25, .5, .75, 1]).round(2).tolist()}")

    # 2. SNDlib 动态流量矩阵（Abilene 5 分钟，GEANT 15 分钟）
    if not args.skip_dynamic:
        for key in ["abilene_dyn", "geant_dyn"]:
            tpath = os.path.join(args.out, FILES[key])
            if not download(SNDLIB_BASE + FILES[key], tpath):
                continue
            with tarfile.open(tpath) as t:
                members = [m for m in t.getmembers() if m.isfile() and m.name.endswith(".txt")]
                members.sort(key=lambda m: m.name)
                print(f"\n==== {key}: 流量矩阵文件数 {len(members)}，首个 {members[0].name}，末个 {members[-1].name} ====")
                for m in members[:2]:
                    text = t.extractfile(m).read().decode("utf-8", errors="ignore")
                    nodes, links, demands = parse_sndlib_native(text)
                    print(f"\n文件 {m.name}: 节点 {len(nodes)} 链路 {len(links)} 需求 {len(demands)}")
                    show(demands, "demands")
                    if len(demands):
                        print(f"需求总量 {demands.value.sum():.2f}，最大 {demands.value.max():.2f}，零需求比例 {(demands.value == 0).mean():.2f}")

    # 3. Topology Zoo
    if not args.skip_zoo:
        zz = os.path.join(args.out, "topology-zoo-archive.zip")
        if download(TOPOZOO, zz):
            with zipfile.ZipFile(zz) as z:
                gml = [n for n in z.namelist() if n.endswith(".graphml")]
                print(f"\nTopology Zoo graphml 文件数 {len(gml)}")
                rows = []
                for n in gml:
                    try:
                        G = nx.read_graphml(io.BytesIO(z.read(n)))
                    except Exception:
                        continue
                    speeds = [d.get("LinkSpeedRaw") for _, _, d in G.edges(data=True) if d.get("LinkSpeedRaw")]
                    rows.append(dict(name=os.path.basename(n), nodes=G.number_of_nodes(), edges=G.number_of_edges(),
                                     has_speed=len(speeds) / max(G.number_of_edges(), 1),
                                     connected=nx.is_connected(nx.Graph(G))))
                df = pd.DataFrame(rows).sort_values("nodes")
                show(df, "Topology Zoo 概览", 10)
                mid = df[(df.nodes >= 15) & (df.nodes <= 60) & (df.has_speed > 0.8) & df.connected]
                print(f"\n节点 15 到 60、带链路速率、连通的拓扑数 {len(mid)}")
                print(mid.head(15).to_string())

    print("\n手动下载地址（自动下载失败时用）：")
    for k, v in FILES.items():
        print(f"  {SNDLIB_BASE}{v}")
    print(f"  {TOPOZOO}")
    print("SNDlib 主页 https://sndlib.put.poznan.pl（原 sndlib.zib.de 已迁移），Topology Zoo 主页 http://www.topology-zoo.org")


if __name__ == "__main__":
    main()
