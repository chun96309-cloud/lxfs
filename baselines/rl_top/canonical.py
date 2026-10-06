"""Versioned, solver-independent canonical instance. Never regenerates on load."""
from copy import deepcopy
from pathlib import Path
import json
import math
import hashlib


def edge_key(u, v):
    return (u, v) if u < v else (v, u)


class CanonicalInstance:
    def __init__(self, data):
        d = deepcopy(data)
        self.data = d
        d.setdefault('schema_version', 'rl_minlp_canonical_v1')
        if d['schema_version'] != 'rl_minlp_canonical_v1':
            raise ValueError('Unknown canonical schema')
        d.setdefault('seed', None)
        d.setdefault('load_factor', None)
        if not d['edges'] or not d['demands']:
            raise ValueError('Nonempty businesses/links required')
        if len(set(d['nodes'])) != len(d['nodes']):
            raise ValueError('Duplicate topology nodes')
        edge_lookup = {}
        link_ids = []
        for i,e in enumerate(d['edges']):
            key=edge_key(e['u'], e['v'])
            if key in edge_lookup or e['u']==e['v'] or any(n not in d['nodes'] for n in key):
                raise ValueError('Invalid/duplicate undirected link')
            if not math.isfinite(e['capacity']) or e['capacity']<=0 or e.get('load',0)!=0:
                raise ValueError('Unified formal model requires positive capacity and zero initial load')
            e.setdefault('id', i); e.setdefault('cost',1.0)
            if not math.isfinite(e['cost']): raise ValueError('Nonfinite cost')
            link_ids.append(e['id']); edge_lookup[key]=i
        if len(set(link_ids)) != len(link_ids): raise ValueError('Duplicate link ID')
        self.business_ids=[b['id'] for b in d['demands']]
        if len(set(self.business_ids))!=len(self.business_ids): raise ValueError('Duplicate Business ID')
        d.setdefault('business_order', list(self.business_ids))
        if len(d['business_order'])!=len(self.business_ids) or set(d['business_order'])!=set(self.business_ids):
            raise ValueError('Business order must be an ID permutation')
        self.order=[self.business_ids.index(b) for b in d['business_order']]
        self.path_links=[]; self.path_costs=[]
        for b in d['demands']:
            if not math.isfinite(b['demand']) or b['demand']<=0: raise ValueError('Positive demand required')
            attrs=b.setdefault('path_attributes',[{} for _ in b['paths']])
            if len(attrs)!=len(b['paths']): raise ValueError('Path attribute length mismatch')
            ls=[]; costs=[]; ids=[]
            for slot,(nodes,attr) in enumerate(zip(b['paths'],attrs)):
                if len(nodes)<2 or len(set(nodes))!=len(nodes) or nodes[0]!=b['source'] or nodes[-1]!=b['target']:
                    raise ValueError('Candidate must be a simple source-target path')
                links=[edge_lookup[edge_key(u,v)] for u,v in zip(nodes,nodes[1:])]
                attr.setdefault('id', slot); ids.append(attr['id'])
                physical_ids=[link_ids[i] for i in links]
                if 'link_ids' in attr and attr['link_ids']!=physical_ids: raise ValueError('Path link IDs disagree with nodes')
                attr['link_ids']=physical_ids
                attr.setdefault('cost',sum(d['edges'][i]['cost'] for i in links))
                if not math.isfinite(attr['cost']): raise ValueError('Nonfinite path cost')
                ls.append(links); costs.append(attr['cost'])
            if len(set(ids))!=len(ids): raise ValueError('Duplicate candidate ID within business')
            self.path_links.append(ls); self.path_costs.append(costs)
        self.capacity=[e['capacity'] for e in d['edges']]
        self.demand=[b['demand'] for b in d['demands']]
        self.max_paths=max(map(len,self.path_links),default=0)
        self.n=len(self.business_ids)

    def save(self, path):
        Path(path).write_text(json.dumps(self.data,ensure_ascii=False,indent=2)+'\n')

    @classmethod
    def load(cls,path):
        return cls(json.loads(Path(path).read_text()))

    @property
    def fingerprint(self):
        return hashlib.sha256(json.dumps(self.data,sort_keys=True,separators=(',',':')).encode()).hexdigest()

    def benchmark_data(self):
        """Existing build_base_model/lexicographic accepts this same JSON dictionary."""
        return deepcopy(self.data)

    @classmethod
    def generate(cls, seed=10, load_factor=1.2):
        from instance_generator import generate_instance
        G,demands,paths=generate_instance(seed=seed,load_factor=load_factor)
        data=dict(instance_id=f'canonical_seed{seed}_lf{load_factor}',seed=seed,load_factor=load_factor,
                  nodes=list(G.nodes()),edges=[dict(u=u,v=v,**a) for u,v,a in G.edges(data=True)],
                  demands=[dict(b,paths=paths[b['id']]) for b in demands],business_order=[b['id'] for b in demands])
        return cls(data)
