"""
不学习基线：在现行 S/J 词典序模型上比较
  greedy   逐业务取瓶颈剩余容量最大的候选路径
  round    一次 LP 松弛后按最大流量取整
  diving   逐步 LP 松弛、每步固定最确定的业务、重解
  scip     两阶段 SCIP 认证最优（可关）
带宽分配一律用现行 OptimalBandwidthAllocator，评价用现行 evaluate。
实例按现行 instance_generator 的规则生成（10 节点、G(n,0.3)、容量 8–20、需求 2–6、LF 缩放、K=5）。

用法：python diving_baseline.py --seeds 20 --scip
"""
import argparse
import random
import sys
import time
from pathlib import Path

import networkx as nx
import numpy as np
from scipy.optimize import linprog

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from rl_top.allocator import OptimalBandwidthAllocator  # noqa: E402
from rl_top.canonical import CanonicalInstance  # noqa: E402
from rl_top.evaluation import evaluate  # noqa: E402


# ---------------- 实例生成（与 instance_generator.py 规则一致） ----------------
def make_instance(seed, n_bus, lf, n_nodes=10, k_paths=5):
    rng = random.Random(seed)
    while True:
        G = nx.gnp_random_graph(n=n_nodes, p=0.3, seed=rng.randint(0, 100000))
        if nx.is_connected(G):
            break
    for u, v in G.edges():
        G[u][v]["capacity"] = rng.randint(8, 20)
        G[u][v]["cost"] = 1.0
    nodes = list(G.nodes())
    dem = []
    for k in range(n_bus):
        s, t = rng.sample(nodes, 2)
        dem.append(dict(id=k, source=s, target=t, demand=float(rng.randint(2, 6))))
    load = {tuple(sorted(e)): 0.0 for e in G.edges()}
    for d in dem:
        p = nx.shortest_path(G, d["source"], d["target"], weight="cost")
        for u, v in zip(p, p[1:]):
            load[tuple(sorted((u, v)))] += d["demand"]
    mu = max(load[tuple(sorted((u, v)))] / G[u][v]["capacity"] for u, v in G.edges())
    scale = lf / mu if mu > 0 else 1.0
    for d in dem:
        d["demand"] = round(d["demand"] * scale, 2)
        paths = []
        for i, p in enumerate(nx.shortest_simple_paths(G, d["source"], d["target"], weight="cost")):
            if i >= k_paths:
                break
            paths.append(list(p))
        d["paths"] = paths
    edges = [dict(u=u, v=v, capacity=G[u][v]["capacity"], cost=1.0, id=i) for i, (u, v) in enumerate(G.edges())]
    data = dict(schema_version="rl_minlp_canonical_v1", instance_id=f"seed{seed}_lf{lf}", seed=seed,
                load_factor=lf, nodes=nodes, edges=edges, demands=dem)
    return CanonicalInstance(data)


# ---------------- LP 松弛（允许分流，最大化 S） ----------------
def relax_lp(inst, fixed):
    """fixed: dict 业务 -> 路径槽位或 -1（拒绝）。返回每业务每候选的满足率分量 u[b][p]。"""
    K, E = inst.n, len(inst.capacity)
    cols = [(b, p) for b in range(K) for p in range(len(inst.path_links[b]))]
    idx = {c: i for i, c in enumerate(cols)}
    A = np.zeros((E, len(cols)))
    for (b, p), i in idx.items():
        for e in inst.path_links[b][p]:
            A[e, i] += inst.demand[b] / inst.capacity[e]
    # 每业务 Σ_p u_bp ≤ 1
    S = np.zeros((K, len(cols)))
    for (b, p), i in idx.items():
        S[b, i] = 1.0
    bounds = []
    for (b, p) in cols:
        if b in fixed:
            bounds.append((0.0, 1.0) if fixed[b] == p else (0.0, 0.0))
        else:
            bounds.append((0.0, 1.0))
    c = -np.ones(len(cols)) / K
    res = linprog(c, A_ub=np.vstack([A, S]), b_ub=np.r_[np.ones(E), np.ones(K)], bounds=bounds,
                  method="highs")
    if not res.success:
        raise RuntimeError(res.message)
    u = [np.zeros(len(inst.path_links[b])) for b in range(K)]
    for (b, p), i in idx.items():
        u[b][p] = res.x[i]
    return u, -res.fun


RELAX_QP_RETRY = [0]
RELAX_QP_FAIL = [0]


def relax_qp(inst, fixed):
    """词典序凸松弛：先 LP 最大化 S，再在 S ≥ S* 下最小化 J（允许分流）。返回 u[b][p]。"""
    from scipy.optimize import minimize
    K, E = inst.n, len(inst.capacity)
    cols = [(b, p) for b in range(K) for p in range(len(inst.path_links[b]))]
    idx = {c: i for i, c in enumerate(cols)}
    A = np.zeros((E, len(cols)))
    for (b, p), i in idx.items():
        for e in inst.path_links[b][p]:
            A[e, i] += inst.demand[b] / inst.capacity[e]
    S = np.zeros((K, len(cols)))
    for (b, p), i in idx.items():
        S[b, i] = 1.0
    ub = np.array([0.0 if (b in fixed and fixed[b] != p) else 1.0 for (b, p) in cols])
    c = -np.ones(len(cols)) / K
    lp = linprog(c, A_ub=np.vstack([A, S]), b_ub=np.r_[np.ones(E), np.ones(K)], bounds=list(zip(np.zeros(len(cols)), ub)),
                 method="highs")
    if not lp.success:
        raise RuntimeError(lp.message)
    star = -lp.fun
    B = np.vstack([A, S, c[None, :]])
    rhs = np.r_[np.ones(E), np.ones(K), -(star - 1e-8)]
    qp = minimize(lambda u: float(np.mean((A @ u) ** 2)), lp.x, jac=lambda u: 2.0 * A.T @ (A @ u) / E,
                  method="SLSQP", bounds=list(zip(np.zeros(len(cols)), ub)),
                  constraints=[{"type": "ineq", "fun": lambda u: rhs - B @ u, "jac": lambda u: -B}],
                  options={"ftol": 1e-12, "maxiter": 500})
    if not qp.success:
        # 不回退 LP：SLSQP 失败时用 trust-constr 重解同一个阶段二 QP，并计数
        from scipy.optimize import LinearConstraint, Bounds
        RELAX_QP_RETRY[0] += 1
        qp = minimize(lambda u: float(np.mean((A @ u) ** 2)), lp.x, jac=lambda u: 2.0 * A.T @ (A @ u) / E,
                      method="trust-constr", bounds=Bounds(np.zeros(len(cols)), ub),
                      constraints=[LinearConstraint(B, -np.inf, rhs)],
                      options={"maxiter": 2000, "gtol": 1e-9, "xtol": 1e-10})
        viol = float(np.max(B @ qp.x - rhs))
        if viol > 1e-6:
            RELAX_QP_FAIL[0] += 1
            raise RuntimeError(f"relax_qp 阶段二重解仍不可行，最大违反 {viol:.2e}")
    sol = qp.x
    u = [np.zeros(len(inst.path_links[b])) for b in range(K)]
    for (b, p), i in idx.items():
        u[b][p] = max(sol[i], 0.0)
    return u, star


def qp_round(inst):
    u, _ = relax_qp(inst, {})
    choices = np.array([int(np.argmax(u[b])) if u[b].max() > 1e-9 else -1 for b in range(inst.n)])
    return allocate(inst, choices)


def qp_diving(inst):
    fixed = {}
    while len(fixed) < inst.n:
        u, _ = relax_qp(inst, fixed)
        cand = [(u[b].max(), b) for b in range(inst.n) if b not in fixed]
        v, b = max(cand)
        fixed[b] = int(np.argmax(u[b])) if v > 1e-9 else -1
    choices = np.array([fixed[b] for b in range(inst.n)])
    return allocate(inst, choices)


def allocate(inst, choices):
    alloc = OptimalBandwidthAllocator()
    x, load = alloc.allocate(inst.demand, inst.capacity, inst.path_links, np.asarray(choices))
    return evaluate(inst, choices, x, load)


def greedy(inst):
    choices = np.full(inst.n, -2)
    load = np.zeros(len(inst.capacity))
    alloc = OptimalBandwidthAllocator()
    for b in inst.order:
        best, bestv = -1, -1.0
        for p, links in enumerate(inst.path_links[b]):
            v = float(np.min(np.asarray(inst.capacity)[links] - load[links]))
            if v > bestv:
                best, bestv = p, v
        choices[b] = best
        _, load = alloc.allocate(inst.demand, inst.capacity, inst.path_links, choices)
    return allocate(inst, choices)


def round_once(inst):
    u, _ = relax_lp(inst, {})
    choices = np.array([int(np.argmax(u[b])) if u[b].max() > 1e-9 else -1 for b in range(inst.n)])
    return allocate(inst, choices)


def diving(inst):
    fixed = {}
    while len(fixed) < inst.n:
        u, _ = relax_lp(inst, fixed)
        # 最确定的未固定业务：最大分量最大
        cand = [(u[b].max(), b) for b in range(inst.n) if b not in fixed]
        v, b = max(cand)
        fixed[b] = int(np.argmax(u[b])) if v > 1e-9 else -1
    choices = np.array([fixed[b] for b in range(inst.n)])
    return allocate(inst, choices)


def scip_lex(inst, tl1=15.0, tl2=15.0):
    from pyscipopt import Model, quicksum
    K, E = inst.n, len(inst.capacity)
    m = Model()
    m.hideOutput()
    m.setParam("limits/time", tl1)
    x = [m.addVar(lb=0, ub=inst.demand[b], name=f"x{b}") for b in range(K)]
    z = [m.addVar(vtype="B", name=f"z{b}") for b in range(K)]
    y = {(b, p): m.addVar(vtype="B", name=f"y{b}_{p}") for b in range(K) for p in range(len(inst.path_links[b]))}
    w = {(b, p): m.addVar(lb=0, name=f"w{b}_{p}") for (b, p) in y}
    L = [m.addVar(lb=0, name=f"L{e}") for e in range(E)]
    for b in range(K):
        m.addCons(x[b] <= inst.demand[b] * z[b])
        m.addCons(quicksum(y[b, p] for p in range(len(inst.path_links[b]))) == z[b])
    for (b, p) in y:
        m.addCons(w[b, p] <= x[b])
        m.addCons(w[b, p] <= inst.demand[b] * y[b, p])
        m.addCons(w[b, p] >= x[b] - inst.demand[b] * (1 - y[b, p]))
    for e in range(E):
        m.addCons(L[e] == quicksum(w[b, p] for (b, p) in y if e in inst.path_links[b][p]))
        m.addCons(L[e] <= inst.capacity[e])
    Sexpr = quicksum(x[b] / inst.demand[b] for b in range(K)) / K
    m.setObjective(Sexpr, "maximize")
    m.optimize()
    s1 = m.getStatus()
    if m.getNSols() == 0:
        return None
    Sstar = m.getObjVal()
    cert1 = s1 == "optimal"
    # 阶段二
    m.freeTransform()
    m.setParam("limits/time", tl2)
    m.addCons(Sexpr >= Sstar - 1e-8)
    t = m.addVar(lb=0, name="t")
    m.addCons(t >= quicksum((L[e] / inst.capacity[e]) * (L[e] / inst.capacity[e]) for e in range(E)) / E)
    m.setObjective(t, "minimize")
    m.optimize()
    cert2 = m.getStatus() == "optimal"
    choices = np.full(K, -1)
    for (b, p), v in y.items():
        if m.getVal(v) > 0.5:
            choices[b] = p
    met = allocate(inst, choices)  # 用同一 allocator 重算，口径一致
    return dict(S=met["S"], J=met["J"], S_star=Sstar, cert1=cert1, cert2=cert2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", type=int, default=20)
    ap.add_argument("--nbus", type=str, default="10,20,40")
    ap.add_argument("--lf", type=str, default="1.0,1.2,1.5")
    ap.add_argument("--scip", action="store_true")
    ap.add_argument("--tl", type=float, default=15.0)
    args = ap.parse_args()
    nb_list = [int(v) for v in args.nbus.split(",")]
    lf_list = [float(v) for v in args.lf.split(",")]

    rows = []
    t0 = time.time()
    for nb in nb_list:
        for lf in lf_list:
            for s in range(args.seeds):
                inst = make_instance(300000 + s, nb, lf)
                r = dict(nbus=nb, lf=lf, seed=s)
                for name, fn in [("greedy", greedy), ("round", round_once), ("diving", diving), ("qpround", qp_round), ("qpdive", qp_diving)]:
                    t = time.time()
                    m = fn(inst)
                    r[f"{name}_S"], r[f"{name}_J"], r[f"{name}_t"] = m["S"], m["J"], time.time() - t
                if args.scip:
                    t = time.time()
                    sc = scip_lex(inst, args.tl, args.tl)
                    if sc:
                        r.update(scip_S=sc["S"], scip_J=sc["J"], scip_cert1=sc["cert1"], scip_cert2=sc["cert2"],
                                 scip_t=time.time() - t)
                rows.append(r)
            print(f"完成 业务数 {nb} LF {lf}，耗时 {time.time() - t0:.0f}s", flush=True)

    import csv
    out = HERE / "diving_baseline_results.csv"
    keys = sorted({k for r in rows for k in r})
    with open(out, "w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=keys)
        wr.writeheader()
        wr.writerows(rows)

    def mean(key, sub):
        v = [r[key] for r in sub if key in r]
        return np.mean(v) if v else float("nan")

    print("\n==== 分组均值（S 越大越好，J 越小越好）====")
    names = ["greedy", "round", "diving", "qpround", "qpdive", "scip"]
    print(f"{'业务数':>6s}{'LF':>5s}" + "".join(f"{n + '_S':>10s}" for n in names) + f"{'认证1':>7s}"
          + "".join(f"{n + '_J':>10s}" for n in names) + f"{'qpdive秒':>9s}{'scip秒':>8s}")
    for nb in nb_list:
        for lf in lf_list:
            sub = [r for r in rows if r["nbus"] == nb and r["lf"] == lf]
            c1 = sum(r.get("scip_cert1", False) for r in sub)
            print(f"{nb:>6d}{lf:>5.1f}" + "".join(f"{mean(n + '_S', sub):>10.4f}" for n in names) + f"{c1:>4d}/{len(sub):<2d}"
                  + "".join(f"{mean(n + '_J', sub):>10.4f}" for n in names) + f"{mean('qpdive_t', sub):>9.3f}{mean('scip_t', sub):>8.2f}")
    print("\n总体: " + " ".join(f"{n}_S {mean(n + '_S', rows):.4f}" for n in names))
    print("总体: " + " ".join(f"{n}_J {mean(n + '_J', rows):.4f}" for n in names))
    if args.scip:
        cert = [r for r in rows if r.get("scip_cert1")]
        if cert:
            for name in ["greedy", "round", "diving", "qpround", "qpdive"]:
                gaps = [(r["scip_S"] - r[f"{name}_S"]) / r["scip_S"] for r in cert]
                hit = [r for r, g in zip(cert, gaps) if g < 1e-6 and r.get("scip_cert2")]
                jg = np.mean([(r[f"{name}_J"] - r["scip_J"]) / r["scip_J"] for r in hit]) * 100 if hit else float("nan")
                print(f"{name:8s} 相对认证 S* 的平均相对 Gap {np.mean(gaps) * 100:.3f}%，达到 S* 的比例 {np.mean([g < 1e-6 for g in gaps]):.3f}，"
                      f"n={len(cert)}；S 持平且阶段二认证的 {len(hit)} 例上 J 相对 Gap {jg:.2f}%")
    print("对照：现有报告 wo_diff 开发集均值 S=0.9757，J=0.2923（不同实例种子，不是配对）")
    print(f"relax_qp 阶段二重试次数 {RELAX_QP_RETRY[0]}，失败次数 {RELAX_QP_FAIL[0]}")
    print(f"结果已写入 {out}，总耗时 {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
