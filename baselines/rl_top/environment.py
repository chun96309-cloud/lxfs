"""Canonical fixed-instance MDP; route fixed, allocated bandwidth reoptimized."""
import numpy as np
from .allocator import OptimalBandwidthAllocator
from .graph import observation
from .evaluation import evaluate,training_reward

class RoutingEnvironment:
    def __init__(self,instance,action_width=None):
        self.instance=instance
        self.max_paths=instance.max_paths if action_width is None else action_width-1
        if self.max_paths<instance.max_paths: raise ValueError('Action width truncates canonical slots')
        self.allocator=OptimalBandwidthAllocator()
        self.reset()

    @property
    def current_business(self):
        return self.instance.order[self.stage] if self.stage<self.instance.n else -1

    def reset(self):
        self.stage=0
        self.choices=np.full(self.instance.n,-2,dtype=int)
        self.x=np.zeros(self.instance.n); self.load=np.zeros(len(self.instance.capacity))
        return self.get_obs()

    def get_obs(self):
        return observation(self.instance,self.choices,self.x,self.load,self.current_business)

    def action_mask(self):
        mask=np.zeros(self.max_paths+1,dtype=np.float32)
        if self.current_business>=0: mask[:len(self.instance.path_links[self.current_business])]=1
        mask[-1]=1
        return mask

    def metrics(self):
        return evaluate(self.instance,self.choices,self.x,self.load)

    def step(self,action):
        if self.current_business<0: raise RuntimeError('Episode finished')
        if not isinstance(action,(int,np.integer)) or not 0<=action<=self.max_paths or not self.action_mask()[action]:
            raise ValueError('Invalid or masked action')
        before=self.metrics(); b=self.current_business
        self.choices[b]=-1 if action==self.max_paths else action
        self.x,self.load=self.allocator.allocate(self.instance.demand,self.instance.capacity,self.instance.path_links,self.choices)
        self.stage+=1
        metrics=self.metrics()
        if not metrics['feasible']: raise RuntimeError('Allocator returned infeasible solution')
        return training_reward(before,metrics),self.stage==self.instance.n,metrics
