"""
预消融：松弛状态特征对图编码的作用（模仿 QP diving，固定业务顺序，只学路径选择）。
变体：
  bpl        BPL 图，原有特征
  bpl+relax  BPL 图，原有特征 + 词典序凸松弛特征（u_bp、容量对偶 λ_e、业务分数程度等）
  bpl+noise  同维度但松弛特征置随机，排除"多几维输入"本身的作用
推理：每个业务按 argmax 选路（含拒绝），allocator 求带宽，evaluate 评价。
对照：qp_round、qp_diving（不学习）。
用法：python pre_ablation_relax.py --train_seeds 40 --dev_seeds 20 --seeds 3
"""
import argparse
import sys
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from scipy.optimize import linprog, minimize

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from diving_baseline import make_instance, relax_qp, allocate, qp_round, qp_diving  # noqa: E402

torch.set_num_threads(8)


# ---------------- 松弛状态（含对偶） ----------------
def relax_state(inst):
    K, E = inst.n, len(inst.capacity)
    u, star = relax_qp(inst, {})
    # 阶段一 LP 对偶：重解一次 LP 取容量约束乘子
    cols = [(b, p) for b in range(K) for p in range(len(inst.path_links[b]))]
    A = np.zeros((E, len(cols)))
    S = np.zeros((K, len(cols)))
    for i, (b, p) in enumerate(cols):
        S[b, i] = 1.0
        for e in inst.path_links[b][p]:
            A[e, i] += inst.demand[b] / inst.capacity[e]
    lp = linprog(-np.ones(len(cols)) / K, A_ub=np.vstack([A, S]), b_ub=np.r_[np.ones(E), np.ones(K)],
                 bounds=[(0, 1)] * len(cols), method="highs")
    lam = np.abs(lp.ineqlin.marginals[:E]) if lp.success else np.zeros(E)
    lam = lam / (lam.max() + 1e-9)
    util = np.zeros(E)
    for i, (b, p) in enumerate(cols):
        for e in inst.path_links[b][p]:
            util[e] += u[b][p] * inst.demand[b] / inst.capacity[e]
    return u, lam, util, star


# ---------------- 图构造 ----------------
def build(inst, variant, rng):
    K, E = inst.n, len(inst.capacity)
    cap = np.asarray(inst.capacity, float)
    dem = np.asarray(inst.demand, float)
    scale = max(cap.max(), dem.max(), 1.0)
    link = np.stack([cap / scale, np.zeros(E), cap / scale, np.zeros(E)], 1)
    bus = np.stack([dem / scale, np.full(K, 1.0)], 1)
    path, owner, pl_p, pl_l = [], [], [], []
    for b in range(K):
        for p, links in enumerate(inst.path_links[b]):
            path.append([len(links) / 9, inst.path_costs[b][p] / max(1, sum(inst.path_costs[b])), cap[links].min() / scale])
            owner.append(b)
            pl_p.extend([len(path) - 1] * len(links))
            pl_l.extend(links)
    path = np.array(path)
    if variant != "bpl":
        if variant == "bpl+relax":
            u, lam, util, star = relax_state(inst)
        else:
            u = [rng.random(len(inst.path_links[b])) for b in range(K)]
            lam, util, star = rng.random(E), rng.random(E), rng.random()
        link = np.concatenate([link, np.stack([lam, util, (util > 0.999).astype(float)], 1)], 1)
        sat = np.array([u[b].sum() for b in range(K)])
        frac = np.array([1 - u[b].max() / (u[b].sum() + 1e-9) for b in range(K)])
        bus = np.concatenate([bus, np.stack([sat, frac, np.full(K, star)], 1)], 1)
        pf = []
        for b in range(K):
            for p, links in enumerate(inst.path_links[b]):
                pf.append([u[b][p], lam[links].sum() / max(1, len(links)), float(p == int(np.argmax(u[b])))])
        path = np.concatenate([path, np.array(pf)], 1)
    return dict(bus=bus, path=path, link=link, owner=np.array(owner), pl_p=np.array(pl_p), pl_l=np.array(pl_l))


def batch(graphs, labels):
    feats = {"bus": [], "path": [], "link": []}
    rels = {("bus", "path"): [[], []], ("path", "link"): [[], []]}
    off = {"bus": 0, "path": 0, "link": 0}
    path_bus, y, seg = [], [], []
    for gi, (g, lab) in enumerate(zip(graphs, labels)):
        for t in feats:
            feats[t].append(g[t])
        rels[("bus", "path")][0].append(g["owner"] + off["bus"])
        rels[("bus", "path")][1].append(np.arange(len(g["path"])) + off["path"])
        rels[("path", "link")][0].append(g["pl_p"] + off["path"])
        rels[("path", "link")][1].append(g["pl_l"] + off["link"])
        path_bus.append(g["owner"] + off["bus"])
        # 标签：每个业务一个（路径槽位或拒绝=K_b），按路径打分，拒绝由业务节点打分
        y.append(lab + off["bus"] * 0)
        seg.append(np.full(len(g["path"]), gi))
        for t in feats:
            off[t] += len(g[t])
    out = {t: torch.tensor(np.concatenate(v), dtype=torch.float32) for t, v in feats.items()}
    r = [(s, d, torch.tensor(np.concatenate(v[0])), torch.tensor(np.concatenate(v[1]))) for (s, d), v in rels.items()]
    r += [(d, s, di, si) for s, d, si, di in r]
    return dict(feats=out, rels=r, path_bus=torch.tensor(np.concatenate(path_bus)), n_bus=off["bus"])


class HeteroMP(nn.Module):
    def __init__(self, in_dims, rel_keys, hid=48, layers=2):
        super().__init__()
        self.enc = nn.ModuleDict({t: nn.Linear(d, hid) for t, d in in_dims.items()})
        self.layers = layers
        self.msg = nn.ModuleList([nn.ModuleDict({f"{s}__{d}": nn.Linear(hid, hid) for s, d in rel_keys}) for _ in range(layers)])
        self.upd = nn.ModuleList([nn.ModuleDict({t: nn.GRUCell(hid, hid) for t in in_dims}) for _ in range(layers)])
        self.path_head = nn.Sequential(nn.Linear(2 * hid, hid), nn.ReLU(), nn.Linear(hid, 1))
        self.rej_head = nn.Sequential(nn.Linear(hid, hid), nn.ReLU(), nn.Linear(hid, 1))

    def forward(self, g):
        h = {t: F.relu(self.enc[t](x)) for t, x in g["feats"].items()}
        for l in range(self.layers):
            agg = {t: torch.zeros_like(x) for t, x in h.items()}
            cnt = {t: torch.zeros(x.shape[0], 1) for t, x in h.items()}
            for s, d, si, di in g["rels"]:
                agg[d].index_add_(0, di, self.msg[l][f"{s}__{d}"](h[s])[si])
                cnt[d].index_add_(0, di, torch.ones(len(di), 1))
            h = {t: self.upd[l][t](F.relu(agg[t] / cnt[t].clamp(min=1)), h[t]) for t in h}
        hp, hb = h["path"], h["bus"]
        ps = self.path_head(torch.cat([hp, hb[g["path_bus"]]], 1)).squeeze(1)
        rs = self.rej_head(hb).squeeze(1)
        return ps, rs


def loss_and_pred(model, g, insts, labels):
    ps, rs = model(g)
    loss, preds, i = 0.0, [], 0
    b0 = 0
    for inst, lab in zip(insts, labels):
        pr = []
        for b in range(inst.n):
            k = len(inst.path_links[b])
            logits = torch.cat([ps[i:i + k], rs[b0 + b:b0 + b + 1]])
            loss = loss + F.cross_entropy(logits[None], torch.tensor([int(lab[b]) if lab[b] >= 0 else k]))
            pr.append(int(logits.argmax()))
            i += k
        b0 += inst.n
        preds.append(np.array([p if p < len(inst.path_links[b]) else -1 for b, p in enumerate(pr)]))
    return loss / b0, preds


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--train_seeds", type=int, default=40)
    ap.add_argument("--dev_seeds", type=int, default=20)
    ap.add_argument("--seeds", type=int, default=3)
    ap.add_argument("--epochs", type=int, default=150)
    ap.add_argument("--nbus", type=str, default="10,20")
    args = ap.parse_args()
    nb_list = [int(v) for v in args.nbus.split(",")]
    lf_list = [1.0, 1.2, 1.5]
    t0 = time.time()

    def gen(seed0, n):
        out = []
        for nb in nb_list:
            for lf in lf_list:
                for s in range(n):
                    inst = make_instance(seed0 + s, nb, lf)
                    # 标签：QP diving 的最终选择
                    fixed = {}
                    while len(fixed) < inst.n:
                        u, _ = relax_qp(inst, fixed)
                        v, b = max((u[b].max(), b) for b in range(inst.n) if b not in fixed)
                        fixed[b] = int(np.argmax(u[b])) if v > 1e-9 else -1
                    out.append((inst, np.array([fixed[b] for b in range(inst.n)]), nb, lf))
        return out

    train = gen(500000, args.train_seeds)
    dev = gen(600000, args.dev_seeds)
    print(f"实例生成完成 训练 {len(train)} 开发 {len(dev)}，耗时 {time.time() - t0:.0f}s", flush=True)

    # 不学习对照
    ref = {}
    for name, fn in [("qp_round", qp_round), ("qp_diving", qp_diving)]:
        ms = [fn(inst) for inst, _, _, _ in dev]
        ref[name] = (np.array([m["S"] for m in ms]), np.array([m["J"] for m in ms]))
    print(f"不学习对照 耗时 {time.time() - t0:.0f}s", flush=True)

    results = {}
    for variant in ["bpl", "bpl+relax", "bpl+noise"]:
        rs = []
        for seed in range(args.seeds):
            rng = np.random.default_rng(seed)
            torch.manual_seed(seed)
            gtr = [build(inst, variant, rng) for inst, _, _, _ in train]
            gdv = [build(inst, variant, rng) for inst, _, _, _ in dev]
            Gtr = batch(gtr, [l for _, l, _, _ in train])
            Gdv = batch(gdv, [l for _, l, _, _ in dev])
            in_dims = {t: x.shape[1] for t, x in Gtr["feats"].items()}
            rel_keys = sorted({(s, d) for s, d, _, _ in Gtr["rels"]})
            model = HeteroMP(in_dims, rel_keys)
            opt = torch.optim.Adam(model.parameters(), lr=2e-3)
            tr_insts, tr_labs = [x[0] for x in train], [x[1] for x in train]
            for ep in range(args.epochs):
                opt.zero_grad()
                loss, _ = loss_and_pred(model, Gtr, tr_insts, tr_labs)
                loss.backward()
                opt.step()
            model.eval()
            with torch.no_grad():
                _, preds = loss_and_pred(model, Gdv, [x[0] for x in dev], [x[1] for x in dev])
            S, J, acc = [], [], []
            for (inst, lab, _, _), pr in zip(dev, preds):
                m = allocate(inst, pr)
                S.append(m["S"]); J.append(m["J"]); acc.append((pr == lab).mean())
            rs.append((np.array(S), np.array(J), float(np.mean(acc))))
            print(f"{variant} seed {seed} S {np.mean(S):.4f} J {np.mean(J):.4f} 准确率 {np.mean(acc):.3f} 耗时 {time.time() - t0:.0f}s", flush=True)
        results[variant] = rs

    from scipy.stats import wilcoxon
    print("\n==== 开发集汇总（跨种子均值 ± 标准差；S 高好，J 低好）====")
    print(f"{'变体':12s}{'S':>16s}{'J':>16s}{'准确率':>8s}")
    for name, (S, J) in ref.items():
        print(f"{name:12s}{S.mean():>16.4f}{J.mean():>16.4f}{'':>8s}")
    for v, rs in results.items():
        S = np.array([r[0].mean() for r in rs]); J = np.array([r[1].mean() for r in rs]); a = np.mean([r[2] for r in rs])
        print(f"{v:12s}{S.mean():>9.4f}±{S.std():.4f}{J.mean():>9.4f}±{J.std():.4f}{a:>8.3f}")
    print("\n==== 配对检验（按开发集实例配对，种子平均后）====")
    base_S = np.mean([r[0] for r in results["bpl"]], 0); base_J = np.mean([r[1] for r in results["bpl"]], 0)
    for v in ["bpl+relax", "bpl+noise"]:
        S = np.mean([r[0] for r in results[v]], 0); J = np.mean([r[1] for r in results[v]], 0)
        pS = wilcoxon(S, base_S).pvalue if np.any(S != base_S) else 1.0
        pJ = wilcoxon(J, base_J).pvalue if np.any(J != base_J) else 1.0
        print(f"{v:12s} 相对 bpl：ΔS {np.mean(S - base_S):+.4f} p={pS:.4f}；ΔJ {np.mean(J - base_J):+.4f} p={pJ:.4f}")
    S = np.mean([r[0] for r in results["bpl+relax"]], 0); J = np.mean([r[1] for r in results["bpl+relax"]], 0)
    for name, (rS, rJ) in ref.items():
        pS = wilcoxon(S, rS).pvalue if np.any(S != rS) else 1.0
        pJ = wilcoxon(J, rJ).pvalue if np.any(J != rJ) else 1.0
        print(f"bpl+relax 相对 {name}：ΔS {np.mean(S - rS):+.4f} p={pS:.4f}；ΔJ {np.mean(J - rJ):+.4f} p={pJ:.4f}")
    print("\n==== 分组（bpl 对 bpl+relax 的 ΔS、ΔJ）====")
    for nb in nb_list:
        for lf in lf_list:
            idx = np.array([i for i, (_, _, n, l) in enumerate(dev) if n == nb and l == lf])
            print(f"业务数 {nb} LF {lf}: ΔS {np.mean((S - base_S)[idx]):+.4f} ΔJ {np.mean((J - base_J)[idx]):+.4f}  "
                  f"qp_diving S {ref['qp_diving'][0][idx].mean():.4f} bpl+relax S {S[idx].mean():.4f}")
    print(f"\n总耗时 {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
