"""One numeric evaluator for canonical RL/heuristic/solver solutions.

Matches optimization_model.mean_satisfaction/mean_congestion. Training reward is separate.
"""
import math


def evaluate(instance, choices, bandwidth, reported_load=None, tolerance=1e-8):
    if len(choices)!=instance.n or len(bandwidth)!=instance.n:
        raise ValueError('Solution dimensions disagree')
    x=[float(v) for v in bandwidth]
    if not all(math.isfinite(v) for v in x): raise ValueError('Nonfinite bandwidth')
    load=[0.0]*len(instance.capacity)
    bound=0.0
    for b,(slot,amount) in enumerate(zip(choices,x)):
        if int(slot)!=slot or slot < -2 or slot >=len(instance.path_links[b]):
            raise ValueError('Invalid canonical path slot')
        bound=max(bound,-amount,amount-(instance.demand[b] if slot>=0 else 0.0))
        if slot>=0:
            for e in instance.path_links[b][int(slot)]: load[e]+=amount
    capacity_violation=max(0.0,max(l-c for l,c in zip(load,instance.capacity)))
    mismatch=0.0
    if reported_load is not None:
        if len(reported_load)!=len(load) or not all(math.isfinite(float(v)) for v in reported_load):
            raise ValueError('Invalid reported load')
        mismatch=max(abs(float(a)-b) for a,b in zip(reported_load,load))
    violation=max(bound,capacity_violation,mismatch)
    S=sum(a/d for a,d in zip(x,instance.demand))/instance.n
    J=sum((l/c)**2 for l,c in zip(load,instance.capacity))/len(load)
    return dict(S=S,J=J,feasible=violation<=tolerance,violation=violation,
                capacity_violation=capacity_violation,allocation_violation=bound,load_mismatch=mismatch,
                load=load,acceptance=sum(s>=0 for s in choices)/instance.n)


def lexicographic_gap(metrics, reference, satisfaction_tolerance=1e-8):
    """Reference must explicitly certify both stages; never invent a scalar lexicographic gap."""
    if not reference.get('stage1_proven_optimal',False):
        return dict(S_gap=None,J_gap=None,reason='Stage 1 not certified optimal')
    sg=reference['S_star']-metrics['S']
    eligible=metrics['feasible'] and abs(sg)<=satisfaction_tolerance
    return dict(S_gap=sg,J_gap=metrics['J']-reference['J_star'] if eligible and reference.get('stage2_proven_optimal',False) else None)


def training_reward(before,after):
    return after['S']-before['S']-0.01*(after['J']-before['J'])-10*after['violation']
