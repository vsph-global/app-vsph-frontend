'use client';
import { useState, type ReactNode } from 'react';

export type OwnerDashboardModel = {
  cashCollected: number; invoiced: number; outstanding: number; pastDue: number;
  months: { month: string; collected: number }[];
  customers: number; activeProjects: number; employees: number;
  products: { code: string; name: string; description: string }[];
  completion: number; completedProjects: number; openTasks: number; doneTasks: number;
  blockedTasks: number; overdueTasks: number; overdueMilestones: number;
  team: { active: number; onboarding: number; other: number };
  milestones: { title: string; project: string; due: string }[];
  projects: { name: string; state: string; done: number; total: number }[];
  activity: { label: string; detail: string; when: string }[];
};
const money = (n:number) => '₹' + new Intl.NumberFormat('en-IN',{maximumFractionDigits:0}).format(n);
const DisabledLink=({children}:{children:ReactNode})=>
  <span className="owner-text-control role-disabled-link" aria-disabled="true">{children}</span>;

/** Reusable, read-only original VSPH owner overview. Fixtures live elsewhere. */
export function OwnerDashboard({data}:{data:OwnerDashboardModel}) {
  const [period,setPeriod]=useState<1|3|6>(6);
  const [month,setMonth]=useState<number|null>(null);
  const months=data.months.slice(-period);
  const max=Math.max(1,...months.map(m=>m.collected));
  const points=months.map((m,i)=>({
    x:months.length===1?320:28+i*584/(months.length-1),
    y:192-m.collected/max*150,m,
  }));
  const line=points.map(p=>p.x+','+p.y).join(' ');
  const done=data.doneTasks,open=Math.max(0,data.openTasks-data.blockedTasks);
  const total=Math.max(1,done+open+data.blockedTasks);
  return <section id="ownerOverview" className="owner-overview" aria-labelledby="ownerOverviewTitle">
    <header className="owner-heading">
      <h1 id="ownerOverviewTitle">Company overview</h1>
      <div className="owner-actions"><span aria-disabled="true" className="role-disabled-action">Open projects</span>
        <button type="button" disabled title="Requires live backend">Refresh overview</button></div>
    </header>
    <div className="owner-board owner-operations">
      <article className="owner-tile owner-hero" aria-labelledby="ownerHeroTitle">
        <div className="owner-hero-top">
          <div><p className="owner-kicker">THE BIG PICTURE</p>
            <h2 id="ownerHeroTitle">Your business,<br/><span>in focus.</span></h2></div>
          <div className="owner-hero-cash"><p className="owner-label">Cash collected</p>
            <strong>{money(data.cashCollected)}</strong>
            <span className="owner-caption">All time · net of reversals</span></div>
        </div>
        <div className="owner-pulse" aria-hidden="true">{data.months.map(m=>
          <span key={m.month} title={m.month} style={{height:(12+78*m.collected/Math.max(1,...data.months.map(x=>x.collected)))+'%'}}/>)}</div>
        <p className="owner-caption">Six calendar months of recorded receipts</p>
        <div className="owner-company-metrics" aria-label="Operating metrics">
          {([['Active customers',data.customers],['Active projects',data.activeProjects],
            ['Active employees',data.employees],['Active products',data.products.length]] as const)
            .map(([name,value])=><div key={name} className="role-owner-metric">
            <span className="owner-label">{name}</span><strong>{value}</strong></div>)}
        </div>
      </article>
      <article className="owner-tile owner-products" aria-labelledby="ownerProductsTitle">
        <header className="owner-tile-head"><h2 id="ownerProductsTitle">Product portfolio</h2>
          <span className="owner-badge">{data.products.length} registered</span></header>
        <div className="owner-product-stack">{data.products.map(product=>
          <div className="owner-product-card" key={product.code}><strong>{product.name}</strong>
            <span className="owner-caption">{product.description}</span></div>)}</div>
        <div className="owner-tile-bottom"><p className="owner-caption">Product registry snapshot</p>
          <DisabledLink>Manage products</DisabledLink></div>
      </article>
      <article className="owner-tile owner-completion" aria-labelledby="ownerCompletionTitle">
        <header className="owner-tile-head"><h2 id="ownerCompletionTitle">Task completion</h2>
          <span className="owner-badge">All projects</span></header>
        <div className="owner-gauge" role="img" aria-label={'Task completion '+data.completion+' percent'}>
          <svg viewBox="0 0 200 116" aria-hidden="true"><path className="owner-gauge-track"
            d="M20 100 A80 80 0 0 1 180 100"/>
            <path d="M20 100 A80 80 0 0 1 180 100" pathLength="100"
              strokeDasharray={data.completion+' 100'} className="role-owner-gauge-fill"/></svg>
          <strong>{data.completion}%</strong></div>
        <p className="owner-caption owner-center">Completed assigned tasks</p>
        <dl className="owner-gauge-stats">
          <div><dt>Completed projects</dt><dd>{data.completedProjects}</dd></div>
          <div><dt>Blocked tasks</dt><dd>{data.blockedTasks}</dd></div></dl>
      </article>
      <article className="owner-tile owner-trend" aria-labelledby="ownerMonthlyTitle">
        <header className="owner-tile-head"><h2 id="ownerMonthlyTitle">Cash collections</h2>
          <div className="owner-ranges" role="group" aria-label="Cash collection period">
            {([1,3,6] as const).map(value=><button type="button" key={value}
              aria-pressed={period===value} onClick={()=>{setPeriod(value);setMonth(null);}}>
              {value}M</button>)}</div></header>
        <div className="owner-chart-heading">
          <div><p className="owner-label">Last {period} calendar {period===1?'month':'months'}</p>
            <strong>{money(months.reduce((s,m)=>s+m.collected,0))}</strong></div>
          <span className="owner-badge">INR · cash ledger</span>
        </div>
        <div className="owner-chart-wrap"><svg id="ownerCashChart" viewBox="0 0 640 236"
          role="img" aria-label="Example cash collections by month">
          <line x1="28" y1="192" x2="612" y2="192" stroke="#D4DCE3"/>
          <line x1="28" y1="117" x2="612" y2="117" stroke="#D4DCE3" strokeDasharray="4 6"/>
          <polyline fill="none" stroke="#0069C8" strokeWidth="3"
            strokeLinecap="round" strokeLinejoin="round" points={line}/>
          {points.map((p,i)=><circle key={p.m.month} cx={p.x} cy={p.y}
            r={month===i?7:5} fill="#0069C8" stroke="#fff" strokeWidth="2"/>)}
          </svg></div>
        <div className="owner-chart-months" role="group" aria-label="Inspect a month">
          {months.map((m,i)=><button key={m.month} type="button"
            aria-pressed={month===i} onClick={()=>setMonth(i)}>{m.month}</button>)}
        </div>
        <p className="owner-chart-selection" role="status">
          {month!==null&&months[month]?months[month].month+': '+money(months[month].collected):
            'Select a month to inspect its recorded receipts.'}</p>
        <dl className="owner-finance-summary">
          <div><dt>Invoiced</dt><dd>{money(data.invoiced)}</dd></div>
          <div><dt>Outstanding</dt><dd>{money(data.outstanding)}</dd></div>
          <div><dt>Past due</dt><dd>{money(data.pastDue)}</dd></div></dl>
        <DisabledLink>Browse finance journal</DisabledLink>
      </article>
      <article className="owner-tile owner-workload" aria-labelledby="ownerWorkloadTitle">
        <header className="owner-tile-head"><h2 id="ownerWorkloadTitle">Work distribution</h2>
          <span className="owner-badge">Tasks</span></header>
        <strong className="owner-feature-number">{data.openTasks}</strong>
        <p className="owner-caption">Open tasks, excluding cancellations</p>
        <div className="owner-segments" aria-hidden="true">
          <span className="role-segment-done" style={{width:100*done/total+'%'}}/>
          <span className="role-segment-open" style={{width:100*open/total+'%'}}/>
          <span className="role-segment-blocked" style={{width:100*data.blockedTasks/total+'%'}}/>
        </div>
        <dl className="owner-work-legend">
          <div><dt><i className="owner-dot owner-dot-done"/>Done</dt><dd>{done}</dd></div>
          <div><dt><i className="owner-dot owner-dot-open"/>Other open</dt><dd>{open}</dd></div>
          <div><dt><i className="owner-dot owner-dot-blocked"/>Blocked</dt><dd>{data.blockedTasks}</dd></div>
        </dl>
      </article>
      <article className="owner-tile owner-attention" aria-labelledby="ownerAttentionTitle">
        <header className="owner-tile-head"><h2 id="ownerAttentionTitle">Needs attention</h2>
          <span className="owner-badge">Due dates</span></header>
        <strong className="owner-attention-number">{data.overdueTasks}</strong>
        <p className="owner-attention-label">overdue open tasks</p>
        <dl className="owner-attention-facts">
          <div><dt>Overdue milestones</dt><dd>{data.overdueMilestones}</dd></div></dl>
        <div className="owner-next-header"><h3>Coming up next</h3>
          <span className="owner-caption">Milestones</span></div>
        <ul className="owner-upcoming">{data.milestones.map(item=><li key={item.title}>
          <strong>{item.title}</strong><span>{item.project}</span><small>{item.due}</small>
        </li>)}</ul><DisabledLink>Manage delivery</DisabledLink>
      </article>
      <article className="owner-tile owner-people" aria-labelledby="ownerPeopleTitle">
        <header className="owner-tile-head"><h2 id="ownerPeopleTitle">Your team</h2>
          <DisabledLink>Directory</DisabledLink></header>
        <div className="owner-people-top"><div><strong className="owner-feature-number">
          {data.employees}</strong><p className="owner-caption">Internal roster records</p></div>
          <div className="owner-people-marks" aria-hidden="true"><span>VP</span><span>EX</span><span>TM</span></div></div>
        <dl className="owner-people-states">
          <div><dt>Active</dt><dd>{data.team.active}</dd></div>
          <div><dt>Onboarding</dt><dd>{data.team.onboarding}</dd></div>
          <div><dt>Other states</dt><dd>{data.team.other}</dd></div></dl>
      </article>
      <article className="owner-tile owner-projects" aria-labelledby="ownerProjectsTitle">
        <header className="owner-tile-head"><h2 id="ownerProjectsTitle">Active projects</h2>
          <DisabledLink>View portfolio</DisabledLink></header>
        <ul className="owner-project-list">{data.projects.map(item=><li key={item.name}>
          <strong>{item.name}</strong><span>{item.state}</span>
          <small>{item.done}/{item.total} tasks complete</small></li>)}</ul>
        <p className="owner-caption">Selected ongoing project records</p>
      </article>
      <article className="owner-tile owner-activity" aria-labelledby="ownerActivityTitle">
        <header className="owner-tile-head"><h2 id="ownerActivityTitle">Recent project activity</h2>
          <span className="owner-badge">Recorded history</span></header>
        <ol className="owner-activity-list">{data.activity.map(item=>
          <li key={item.label+item.when}><strong>{item.label}</strong>
            <span>{item.detail}</span><small>{item.when}</small></li>)}</ol>
      </article>
    </div>
  </section>;
}
