"""Existing benchmark integration; import in the original RL_MINLP Python environment."""
from .evaluation import evaluate


def check_fixed_solution(instance,choices,x,reported_load=None):
    import pyomo.environ as pyo
    from optimization_model import build_base_model
    from benchmark_lexicographic import calculate_metrics
    metrics=evaluate(instance,choices,x,reported_load)
    model,opt=build_base_model(instance.benchmark_data())
    for row,k in enumerate(instance.business_ids):
        model.x[k].value=float(x[row]); model.z[k].value=int(choices[row]>=0)
        for p in range(len(instance.path_links[row])):
            y=int(p==choices[row]); model.y[k,p].value=y; model.w[k,p].value=float(x[row])*y
    for e,load in zip(opt['edges'],metrics['load']): model.edge_load[e].value=load
    legacy=calculate_metrics(model,instance.benchmark_data(),opt['edges'])
    cap_violation=max(0.,max(pyo.value(model.edge_load[e]-model.capacity[e]) for e in model.E))
    max_constraint_violation=0.
    for constraint in model.component_data_objects(pyo.Constraint,active=True):
        value=pyo.value(constraint.body)
        if constraint.has_lb(): max_constraint_violation=max(max_constraint_violation,pyo.value(constraint.lower)-value)
        if constraint.has_ub(): max_constraint_violation=max(max_constraint_violation,value-pyo.value(constraint.upper))
    diffs=dict(S=abs(metrics['S']-pyo.value(model.mean_satisfaction)),J=abs(metrics['J']-pyo.value(model.mean_congestion)),
               legacy_S=abs(metrics['S']-legacy['mean_business_satisfaction']),legacy_J=abs(metrics['J']-legacy['mean_congestion']),
               capacity_violation=abs(metrics['capacity_violation']-cap_violation),constraint_violation=abs(max_constraint_violation-metrics['violation']))
    if max(diffs.values())>1e-8: raise AssertionError(diffs)
    return dict(metrics=metrics,differences=diffs)


def build_scip_stages(instance):
    """Reuses the original model builder; no random instance generation here."""
    from optimization_model import build_base_model
    import pyomo.environ as pyo
    first,_=build_base_model(instance.benchmark_data())
    first.objective=pyo.Objective(expr=first.mean_satisfaction,sense=pyo.maximize)
    def second(S_star):
        model,_=build_base_model(instance.benchmark_data())
        model.satisfaction_floor=pyo.Constraint(expr=model.mean_satisfaction>=S_star-1e-8)
        model.objective=pyo.Objective(expr=model.mean_congestion,sense=pyo.minimize)
        return model
    return first,second
