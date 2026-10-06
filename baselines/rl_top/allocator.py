"""Numerical lexicographic LP + convex QP for FIXED selected paths.

Variables are satisfaction fractions u=x/d. No binary variables are optimized.
SciPy HiGHS solves stage 1, SLSQP solves stage 2 with analytic derivatives.
A final LP bounds the convex QP objective gap via its first-order condition.
Failures raise; there is no silent fallback to greedy.
"""
import numpy as np
from scipy.optimize import linprog, minimize

class OptimalBandwidthAllocator:
    def __init__(self, satisfaction_tolerance=1e-8, optimality_tolerance=1e-6):
        if satisfaction_tolerance < 0 or optimality_tolerance <= 0:
            raise ValueError('Invalid optimization tolerance')
        self.satisfaction_tolerance = satisfaction_tolerance
        self.optimality_tolerance = optimality_tolerance
        self.last_diagnostics = {}

    def allocate(self, demand, capacity, path_links, choices):
        demand=np.asarray(demand,dtype=float); capacity=np.asarray(capacity,dtype=float)
        choices=np.asarray(choices)
        K=len(demand); E=len(capacity)
        if K==0 or E==0 or not np.isfinite(demand).all() or not np.isfinite(capacity).all() or np.any(demand<=0) or np.any(capacity<=0):
            raise ValueError('Requires finite positive demand/capacity')
        if len(choices)!=K or len(path_links)!=K:
            raise ValueError('Inconsistent business dimensions')
        selected=np.flatnonzero(choices>=0)
        x=np.zeros(K); load=np.zeros(E)
        if not len(selected):
            self.last_diagnostics=dict(stage1_satisfaction=0.,satisfaction=0.,congestion=0.,optimality_gap_bound=0.)
            return x,load
        incidence=np.zeros((E,len(selected)))
        for col,k in enumerate(selected):
            p=choices[k]
            if int(p)!=p or p>=len(path_links[k]): raise ValueError('Invalid path choice')
            edges=np.asarray(path_links[k][int(p)],dtype=int)
            if not len(edges) or np.any(edges<0) or np.any(edges>=E): raise ValueError('Invalid path links')
            incidence[np.unique(edges),col]=1.
        # A@u is utilization, hence capacity RHS=1.
        A=incidence*demand[selected][None,:]/capacity[:,None]
        c=np.full(len(selected),1./K)
        opts={'dual_feasibility_tolerance':1e-9,'primal_feasibility_tolerance':1e-9}
        lp=linprog(-c,A_ub=A,b_ub=np.ones(E),bounds=(0.,1.),method='highs',options=opts)
        if not lp.success: raise RuntimeError('Bandwidth stage 1 failed: '+lp.message)
        star=float(c@lp.x)
        floor=max(0.,star-self.satisfaction_tolerance)
        B=np.vstack([A,-c]); rhs=np.r_[np.ones(E),-floor]
        def objective(u): return float(np.mean((A@u)**2))
        def gradient(u): return 2.*A.T@(A@u)/E
        qp=minimize(objective,lp.x,jac=gradient,method='SLSQP',bounds=[(0.,1.)]*len(selected),
                    constraints=[{'type':'ineq','fun':lambda u:rhs-B@u,'jac':lambda u:-B}],
                    options={'ftol':1e-12,'maxiter':500})
        if not qp.success: raise RuntimeError('Bandwidth stage 2 failed: '+qp.message)
        u=np.clip(qp.x,0.,1.)
        # Repair only floating-point capacity overshoot by a common infinitesimal scale.
        max_util=float(np.max(A@u))
        if max_util>1.: u=u/max_util
        if float(c@u)<floor-1e-9:
            raise RuntimeError('Stage 2 violated satisfaction floor')
        # Convex first-order bound: J(u)-J* <= grad(J(u))@(u-v),
        # where v minimizes the linearized objective over the same feasible set.
        grad=gradient(u)
        cert=linprog(grad,A_ub=B,b_ub=rhs,bounds=(0.,1.),method='highs',options=opts)
        if not cert.success: raise RuntimeError('QP certificate LP failed: '+cert.message)
        gap=max(0.,float(grad@u-cert.fun))
        if gap>self.optimality_tolerance: raise RuntimeError(f'QP optimality gap bound too large: {gap}')
        x[selected]=demand[selected]*u
        load=incidence@x[selected]
        if not np.isfinite(x).all() or np.max(load-capacity)>1e-8:
            raise RuntimeError('Invalid optimized allocation')
        self.last_diagnostics=dict(stage1_satisfaction=star,satisfaction=float(c@u),
                                   congestion=objective(u),optimality_gap_bound=gap)
        return x,load
