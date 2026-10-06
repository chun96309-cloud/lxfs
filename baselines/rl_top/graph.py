"""Adapted BPL features; canonical IDs/order and common effective-resource semantics."""
import numpy as np
import torch as th
import dgl

RELATIONS=[('business','owns','path'),('path','belongs_to','business'),('path','uses','link'),('link','used_by','path')]
FEATURES={'business':6,'path':5,'link':4}


def observation(instance, choices, x, load, current):
    demand=np.asarray(instance.demand); capacity=np.asarray(instance.capacity)
    scale=max(float(capacity.max()),float(demand.max()),1.)
    remaining=float(np.count_nonzero(choices==-2))/instance.n
    b=np.column_stack([demand/scale,choices!=-2,choices>=0,np.arange(instance.n)==current,x/demand,np.full(instance.n,remaining)])
    pf=[]; owners=[]; slots=[]; active=[]; effective=[]; pu=[]; lv=[]
    for k,paths in enumerate(instance.path_links):
        for slot,links in enumerate(paths):
            pid=len(pf); selected=choices[k]==slot
            enabled=choices[k]==-2 or selected
            pf.append([len(links)/max(1,len(instance.data['nodes'])-1),
                       instance.path_costs[k][slot]/max(1,sum(instance.path_costs[k])),
                       float(np.min(capacity[links]-load[links]))/scale,selected,k==current])
            owners.append(k); slots.append(slot); active.append(k==current); effective.append(enabled)
            # All versions share this semantic mask. Inactive historical alternatives
            # remain as nodes, but send no resource message to physical links.
            if enabled: pu.extend([pid]*len(links)); lv.extend(links)
    ids=list(range(len(pf)))
    g=dgl.heterograph(dict(zip(RELATIONS,[(owners,ids),(ids,owners),(pu,lv),(lv,pu)])),
        num_nodes_dict={'business':instance.n,'path':len(pf),'link':len(capacity)})
    l=np.column_stack([capacity/scale,load/scale,(capacity-load)/scale,load/capacity])
    for t,f in [('business',b),('path',np.asarray(pf).reshape(-1,5)),('link',l)]:
        g.nodes[t].data['feat']=th.tensor(f,dtype=th.float32)
    for key,values,dtype in [('slot',slots,th.long),('active',active,th.bool),('effective',effective,th.bool)]:
        g.nodes['path'].data[key]=th.tensor(values,dtype=dtype)
    return g
