"""
小规模预实验：比较 BPL 图编码与 MINLP 结构图编码在监督代理任务上的表现。
任务：给定实例，预测每个业务在最优解中选择的候选路径。标签由穷举得到。
运行：python pilot_graph_encoding.py --train 240 --test 80 --seeds 3
"""
import argparse
import itertools
import time

import networkx as nx
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from scipy.optimize import minimize, Bounds, LinearConstraint

torch.set_num_threads(8)
BETA = 2.0  # 拥塞代价权重
NODE_N, EDGE_M, N_BUS, K_PATH = 10, 18, 5, 3
LOAD_LO, LOAD_HI = 0.0, 0.4


# ---------------- 实例生成 ----------------
def gen_instance(rng):
    while True:
        G = nx.gnm_random_graph(NODE_N, EDGE_M, seed=int(rng.integers(1 << 30)))
        if nx.is_connected(G):
            break
    edges = list(G.edges())
    eid = {}
    for i, (u, v) in enumerate(edges):
        eid[(u, v)] = i
        eid[(v, u)] = i
    E = len(edges)
    cap = rng.uniform(8, 16, E)
    load = rng.uniform(LOAD_LO, LOAD_HI, E) * cap
    pairs = [(s, t) for s in range(NODE_N) for t in range(NODE_N) if s < t]
    rng.shuffle(pairs)
    paths, dem = [], []
    for s, t in pairs:
        cand = []
        for pth in nx.shortest_simple_paths(G, s, t):
            if len(pth) - 1 > 6:
                break
            cand.append([eid[(pth[i], pth[i + 1])] for i in range(len(pth) - 1)])
            if len(cand) == K_PATH:
                break
        if len(cand) == K_PATH:
            paths.append(cand)
            dem.append(rng.uniform(3, 8))
        if len(paths) == N_BUS:
            break
    if len(paths) < N_BUS:
        return gen_instance(rng)
    a = np.zeros((N_BUS, K_PATH, E))
    for b in range(N_BUS):
        for q in range(K_PATH):
            a[b, q, paths[b][q]] = 1
    return dict(E=E, cap=cap, load=load, a=a, dem=np.array(dem), paths=paths)


def solve_cont(inst, sel):
    """路径固定后求连续带宽，返回目标值（最大化）。"""
    a = inst["a"][np.arange(N_BUS), sel]  # B x E
    cap, load, dem = inst["cap"], inst["load"], inst["dem"]

    def negobj(x):
        ld = load + a.T @ x
        return -(np.sum(np.log1p(x)) - BETA * np.sum((ld / cap) ** 2))

    def grad(x):
        ld = load + a.T @ x
        return -(1.0 / (1.0 + x) - a @ (2 * BETA * ld / cap ** 2))

    lc = LinearConstraint(a.T, -np.inf, cap - load)
    res = minimize(negobj, np.zeros(N_BUS), jac=grad, method="SLSQP",
                   bounds=Bounds(0, dem), constraints=[lc], options={"maxiter": 200})
    return -res.fun


def label_instance(inst):
    combos = list(itertools.product(range(K_PATH), repeat=N_BUS))
    objs = np.array([solve_cont(inst, np.array(c)) for c in combos])
    best = int(np.argmax(objs))
    inst["combos"] = combos
    inst["objs"] = objs
    inst["opt_sel"] = np.array(combos[best])
    inst["opt_obj"] = objs[best]


def relax_features(inst):
    """凸松弛：允许分流，取各路径流量与容量约束乘子作为特征。"""
    a = inst["a"].reshape(N_BUS * K_PATH, -1)  # BK x E
    cap, load, dem = inst["cap"], inst["load"], inst["dem"]
    S = np.kron(np.eye(N_BUS), np.ones((1, K_PATH)))  # B x BK

    def negobj(f):
        x = S @ f
        ld = load + a.T @ f
        return -(np.sum(np.log1p(x)) - BETA * np.sum((ld / cap) ** 2))

    def grad(f):
        x = S @ f
        ld = load + a.T @ f
        return -(S.T @ (1.0 / (1.0 + x)) - a @ (2 * BETA * ld / cap ** 2))

    c_cap = LinearConstraint(a.T, -np.inf, cap - load)
    c_dem = LinearConstraint(S, -np.inf, dem)
    try:
        res = minimize(negobj, np.zeros(N_BUS * K_PATH), jac=grad, method="trust-constr",
                       bounds=Bounds(0, np.inf), constraints=[c_cap, c_dem],
                       options={"maxiter": 500, "verbose": 0})
        f = np.clip(res.x, 0, None)
        lam = np.abs(np.asarray(res.v[0])).reshape(-1)
    except Exception:
        f = np.zeros(N_BUS * K_PATH)
        lam = np.zeros(inst["E"])
    f = f.reshape(N_BUS, K_PATH)
    inst["relax_f"] = f / inst["dem"][:, None]
    ld = load + inst["a"].reshape(-1, inst["E"]).T @ f.reshape(-1)
    inst["relax_util"] = ld / cap
    inst["relax_lam"] = lam / (lam.max() + 1e-6)


def conflict_measures(inst):
    a = inst["a"]
    intra, cross = [], []
    for b in range(N_BUS):
        for q1, q2 in itertools.combinations(range(K_PATH), 2):
            s1, s2 = a[b, q1] > 0, a[b, q2] > 0
            intra.append((s1 & s2).sum() / max((s1 | s2).sum(), 1))
    L = [a[b].sum(0) > 0 for b in range(N_BUS)]
    for b1, b2 in itertools.combinations(range(N_BUS), 2):
        cross.append((L[b1] & L[b2]).sum() / max((L[b1] | L[b2]).sum(), 1))
    inst["intra"] = float(np.mean(intra))
    inst["cross"] = float(np.mean(cross))


# ---------------- 图构造 ----------------
def base_feats(inst, use_relax):
    cap, load, a = inst["cap"], inst["load"], inst["a"]
    resid = cap - load
    link = np.stack([cap / 20, load / cap, resid / 20], 1)
    bus = np.stack([inst["dem"] / 10, np.full(N_BUS, K_PATH / 5)], 1)
    path = []
    for b in range(N_BUS):
        for q in range(K_PATH):
            es = np.where(a[b, q] > 0)[0]
            path.append([len(es) / 6, resid[es].min() / 20, (load[es] / cap[es]).sum() / 6, inst["dem"][b] / 10])
    path = np.array(path)
    if use_relax:
        link = np.concatenate([link, np.stack([inst["relax_lam"], inst["relax_util"]], 1)], 1)
        bus = np.concatenate([bus, inst["relax_f"].sum(1, keepdims=True)], 1)
        path = np.concatenate([path, inst["relax_f"].reshape(-1, 1)], 1)
    return link, bus, path


def build_graph(inst, variant, use_relax):
    """返回 node feature dict 与 relation 列表 [(src_type, dst_type, src_idx, dst_idx)]。"""
    link, bus, path = base_feats(inst, use_relax)
    a = inst["a"]
    E = inst["E"]
    p_of = np.repeat(np.arange(N_BUS), K_PATH)  # path -> business
    nodes, rels = {}, []
    if variant == "bpl":
        nodes = {"bus": bus, "path": path, "link": link}
        rels.append(("bus", "path", p_of, np.arange(N_BUS * K_PATH)))
        ps, ls = np.where(a.reshape(-1, E) > 0)
        rels.append(("path", "link", ps, ls))
    else:
        # MINLP 结构图：Vy=path, Vx=bus(连续变量), Casg=分配约束, Ccap=link, Tbil=双线性项, O=目标项
        nodes = {"vy": path, "vx": bus, "casg": np.full((N_BUS, 1), K_PATH / 5), "ccap": link}
        rels.append(("vy", "casg", np.arange(N_BUS * K_PATH), p_of))
        ps, ls = np.where(a.reshape(-1, E) > 0)
        nT = len(ps)
        nodes["tbil"] = np.ones((nT, 1))
        rels.append(("vy", "tbil", ps, np.arange(nT)))
        rels.append(("vx", "tbil", p_of[ps], np.arange(nT)))
        rels.append(("tbil", "ccap", np.arange(nT), ls))
        if variant == "minlp":
            nodes["ou"] = inst["dem"][:, None] / 10
            nodes["ophi"] = inst["cap"][:, None] / 20
            rels.append(("vx", "ou", np.arange(N_BUS), np.arange(N_BUS)))
            rels.append(("ccap", "ophi", np.arange(E), np.arange(E)))
    path_type = "path" if variant == "bpl" else "vy"
    bus_type = "bus" if variant == "bpl" else "vx"
    return nodes, rels, path_type, bus_type


def batch_graphs(insts, variant, use_relax):
    feats, counts, rel_acc = {}, {}, {}
    path_bus, labels, inst_of_path = [], [], []
    for gi, inst in enumerate(insts):
        nodes, rels, pt, bt = build_graph(inst, variant, use_relax)
        off = {t: counts.get(t, 0) for t in nodes}
        for t, x in nodes.items():
            feats.setdefault(t, []).append(x)
            counts[t] = off[t] + len(x)
        for s, d, si, di in rels:
            rel_acc.setdefault((s, d), [[], []])
            rel_acc[(s, d)][0].append(si + off[s])
            rel_acc[(s, d)][1].append(di + off[d])
        path_bus.append(np.repeat(np.arange(N_BUS), K_PATH) + off[bt])
        labels.append(inst["opt_sel"])
        inst_of_path.append(np.full(N_BUS * K_PATH, gi))
    feats = {t: torch.tensor(np.concatenate(v), dtype=torch.float32) for t, v in feats.items()}
    rels = [(s, d, torch.tensor(np.concatenate(v[0])), torch.tensor(np.concatenate(v[1]))) for (s, d), v in rel_acc.items()]
    rels += [(d, s, di, si) for s, d, si, di in rels]  # 反向边
    return dict(feats=feats, rels=rels, counts=counts,
                path_bus=torch.tensor(np.concatenate(path_bus)),
                labels=torch.tensor(np.stack(labels)), path_type=pt, bus_type=bt,
                n_inst=len(insts))


# ---------------- 模型 ----------------
class HeteroMP(nn.Module):
    def __init__(self, in_dims, rel_keys, hid=64, layers=3):
        super().__init__()
        self.enc = nn.ModuleDict({t: nn.Linear(d, hid) for t, d in in_dims.items()})
        self.layers = layers
        self.msg = nn.ModuleList([nn.ModuleDict({f"{s}__{d}": nn.Linear(hid, hid) for s, d in rel_keys}) for _ in range(layers)])
        self.upd = nn.ModuleList([nn.ModuleDict({t: nn.GRUCell(hid, hid) for t in in_dims}) for _ in range(layers)])
        self.out = nn.Sequential(nn.Linear(2 * hid, hid), nn.ReLU(), nn.Linear(hid, 1))

    def forward(self, g):
        h = {t: F.relu(self.enc[t](x)) for t, x in g["feats"].items()}
        for l in range(self.layers):
            agg = {t: torch.zeros_like(x) for t, x in h.items()}
            cnt = {t: torch.zeros(x.shape[0], 1) for t, x in h.items()}
            for s, d, si, di in g["rels"]:
                m = self.msg[l][f"{s}__{d}"](h[s])[si]
                agg[d].index_add_(0, di, m)
                cnt[d].index_add_(0, di, torch.ones(len(di), 1))
            h = {t: self.upd[l][t](F.relu(agg[t] / cnt[t].clamp(min=1)), h[t]) for t in h}
        hp = h[g["path_type"]]
        hb = h[g["bus_type"]][g["path_bus"]]
        return self.out(torch.cat([hp, hb], 1)).view(-1, K_PATH)  # (n_inst*B) x K


def make_model(sample, variant, use_relax, hid, layers):
    g = batch_graphs(sample, variant, use_relax)
    in_dims = {t: x.shape[1] for t, x in g["feats"].items()}
    rel_keys = sorted({(s, d) for s, d, _, _ in g["rels"]})
    return HeteroMP(in_dims, rel_keys, hid, layers)


def match_hid(sample, variant, use_relax, layers, target):
    """为 BPL 找一个隐层维度，使参数量不低于 target（参数量对齐对照）。"""
    hid = 8
    while sum(p.numel() for p in make_model(sample, variant, use_relax, hid, layers).parameters()) < target:
        hid += 8
    return hid


def run_variant(name, variant, use_relax, train, test, seed, epochs, hid, layers):
    torch.manual_seed(seed)
    gtr = batch_graphs(train, variant, use_relax)
    gte = batch_graphs(test, variant, use_relax)
    model = make_model(train[:1], variant, use_relax, hid, layers)
    nparam = sum(p.numel() for p in model.parameters())
    opt = torch.optim.Adam(model.parameters(), lr=2e-3, weight_decay=1e-5)
    ytr = gtr["labels"].view(-1)
    for ep in range(epochs):
        model.train()
        opt.zero_grad()
        loss = F.cross_entropy(model(gtr), ytr)
        loss.backward()
        opt.step()
    model.eval()
    with torch.no_grad():
        pred = model(gte).argmax(1).view(-1, N_BUS).numpy()
    acc = (pred == gte["labels"].numpy()).mean()
    regrets, exact = [], []
    for gi, inst in enumerate(test):
        idx = inst["combos"].index(tuple(int(v) for v in pred[gi]))
        regrets.append((inst["opt_obj"] - inst["objs"][idx]) / (abs(inst["opt_obj"]) + 1e-9))
        exact.append(float(idx == int(np.argmax(inst["objs"]))))
    return dict(name=name, params=nparam, acc=acc, regret=np.array(regrets), exact=np.array(exact), loss=loss.item())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--train", type=int, default=240)
    ap.add_argument("--test", type=int, default=80)
    ap.add_argument("--seeds", type=int, default=3)
    ap.add_argument("--epochs", type=int, default=400)
    ap.add_argument("--hid", type=int, default=64)
    ap.add_argument("--layers", type=int, default=3)
    ap.add_argument("--nbus", type=int, default=5)
    ap.add_argument("--k", type=int, default=3)
    ap.add_argument("--load_lo", type=float, default=0.0)
    ap.add_argument("--load_hi", type=float, default=0.4)
    args = ap.parse_args()
    global N_BUS, K_PATH, LOAD_LO, LOAD_HI
    N_BUS, K_PATH, LOAD_LO, LOAD_HI = args.nbus, args.k, args.load_lo, args.load_hi
    print(f"配置 业务数 {N_BUS} 候选数 {K_PATH} 负载区间 [{LOAD_LO},{LOAD_HI}]")

    t0 = time.time()
    rng = np.random.default_rng(0)
    insts = []
    for i in range(args.train + args.test):
        inst = gen_instance(rng)
        label_instance(inst)
        relax_features(inst)
        conflict_measures(inst)
        insts.append(inst)
        if (i + 1) % 40 == 0:
            print(f"实例生成 {i + 1}/{args.train + args.test}，耗时 {time.time() - t0:.0f}s", flush=True)
    train, test = insts[:args.train], insts[args.train:]
    intra = np.array([x["intra"] for x in test])
    cross = np.array([x["cross"] for x in test])
    hi_intra = intra > np.median(intra)
    hi_cross = cross > np.median(cross)
    print(f"测试集 业务内重叠 中位数 {np.median(intra):.3f}，跨业务重叠 中位数 {np.median(cross):.3f}")
    print(f"最优目标值均值 {np.mean([x['opt_obj'] for x in test]):.3f}，随机选路 regret 均值 "
          f"{np.mean([(x['opt_obj'] - x['objs'].mean()) / abs(x['opt_obj']) for x in test]):.4f}")

    rr = []
    for inst in test:
        sel = tuple(int(v) for v in inst["relax_f"].argmax(1))
        idx = inst["combos"].index(sel)
        rr.append((inst["opt_obj"] - inst["objs"][idx]) / (abs(inst["opt_obj"]) + 1e-9))
    rr = np.array(rr)
    print(f"不学习基线（松弛解取整）regret 均值 {rr.mean():.4f}，最优率 {np.mean(rr < 1e-9):.3f}，"
          f"低内 {rr[~hi_intra].mean():.4f} 高内 {rr[hi_intra].mean():.4f} 低跨 {rr[~hi_cross].mean():.4f} 高跨 {rr[hi_cross].mean():.4f}")

    target = sum(p.numel() for p in make_model(train[:1], "minlp", True, args.hid, args.layers).parameters())
    hid_match = match_hid(train[:1], "bpl", True, args.layers, target)
    print(f"MINLP-graph 参数量 {target}，参数对齐 BPL 的隐层维度取 {hid_match}")
    variants = [
        ("BPL", "bpl", False, args.hid, args.layers),
        ("BPL+relax", "bpl", True, args.hid, args.layers),
        ("BPL+relax(param-match)", "bpl", True, hid_match, args.layers),
        ("BPL+relax(deep L=6)", "bpl", True, args.hid, 6),
        ("MINLP-graph", "minlp", False, args.hid, args.layers),
        ("MINLP-graph+relax", "minlp", True, args.hid, args.layers),
        ("MINLP-graph+relax-noO", "minlp_noO", True, args.hid, args.layers),
    ]
    results = {}
    for name, var, rel, hd, ly in variants:
        rs = [run_variant(name, var, rel, train, test, s, args.epochs, hd, ly) for s in range(args.seeds)]
        results[name] = rs
        print(f"完成 {name}，耗时 {time.time() - t0:.0f}s", flush=True)

    print("\n==== 汇总（均值 ± 标准差，跨种子）====")
    hdr = f"{'变体':26s}{'参数量':>9s}{'准确率':>9s}{'regret':>10s}{'最优率':>9s}{'regret低内':>11s}{'regret高内':>11s}{'regret低跨':>11s}{'regret高跨':>11s}"
    print(hdr)
    for name, rs in results.items():
        acc = np.array([r["acc"] for r in rs])
        reg = np.stack([r["regret"] for r in rs])  # seeds x test
        ex = np.array([r["exact"].mean() for r in rs])
        def ms(x):
            return f"{x.mean():.4f}±{x.std():.4f}"
        print(f"{name:26s}{rs[0]['params']:>9d}{acc.mean():>8.3f} {ms(reg.mean(1)):>16s}{ex.mean():>8.3f} "
              f"{reg[:, ~hi_intra].mean():>10.4f} {reg[:, hi_intra].mean():>10.4f} "
              f"{reg[:, ~hi_cross].mean():>10.4f} {reg[:, hi_cross].mean():>10.4f}")

    print("\n==== 配对比较（按测试实例配对，regret，种子平均后）====")
    from scipy.stats import wilcoxon
    base = np.stack([r["regret"] for r in results["BPL"]]).mean(0)
    for name, rs in results.items():
        if name == "BPL":
            continue
        cur = np.stack([r["regret"] for r in rs]).mean(0)
        diff = base - cur
        try:
            pval = wilcoxon(base, cur).pvalue if np.any(diff != 0) else 1.0
        except ValueError:
            pval = 1.0
        print(f"{name:26s} 相对 BPL 的 regret 降低均值 {diff.mean():+.4f}，p = {pval:.4f}")
    print("\n==== 配对比较（相对 BPL+relax 与松弛取整基线）====")
    ref = np.stack([r["regret"] for r in results["BPL+relax"]]).mean(0)
    for name, rs in results.items():
        cur = np.stack([r["regret"] for r in rs]).mean(0)
        def pv(x, y):
            try:
                return wilcoxon(x, y).pvalue if np.any(x != y) else 1.0
            except ValueError:
                return 1.0
        print(f"{name:26s} 相对 BPL+relax {(ref - cur).mean():+.4f} p={pv(ref, cur):.4f}；相对松弛取整 {(rr - cur).mean():+.4f} p={pv(rr, cur):.4f}")
    print(f"\n总耗时 {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
