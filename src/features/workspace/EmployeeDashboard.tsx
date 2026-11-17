'use client';
import { useState } from 'react';

export type EmployeeDashboardModel = {
  tasks: { id: string; title: string; project: string; status: string; due: string }[];
  notifications: { title: string; context: string }[];
  attendance: { day: string; clockIn: string; clockOut: string }[];
  leaves: { id: string; from: string; through: string; kind: string; status: string }[];
  events: { id: string; day: number; month: number; year: number;
    title: string; category: string; time: string }[];
};

const heatmap=Array.from({length:52},(_,week)=>
  Array.from({length:7},(_,day)=> ((week*11+day*7+week*day)%13>8 ?
    0 : (week*3+day*5)%5)));

function ActivityHeatmap() {
  return <div className="work-activity-card" role="img"
    aria-label="Illustrative activity contribution heatmap, 52 weeks of sample task completions">
    <h3 className="work-activity-heading">Task completion activity</h3>
    <div className="work-activity-grid-width">
      <div className="work-activity-months" aria-hidden="true">
        {['Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov'].map(x=>
          <span className="role-heatmap-month" key={x}>{x}</span>)}
      </div>
      <div className="work-activity-weeks" aria-hidden="true">{heatmap.map((week,i)=>
        <div className="work-activity-week" key={i}>{week.map((level,j)=>
          <span className="work-activity-day" key={j} data-level={level}/>)}</div>)}</div>
      <p className="role-heatmap-legend">Less activity <span className="role-activity-scale">
        {[0,1,2,3,4].map(level=><i key={level} data-level={level}/>)}</span> More activity</p>
    </div>
  </div>;
}

function WorkBoard({data}:{data:EmployeeDashboardModel}) {
  const [taskFilter,setTaskFilter]=useState<'open'|'all'>('open');
  const tasks=data.tasks.filter(t=>taskFilter==='all'||t.status!=='Done');
  return <section id="employeeDashboardWork" className="employee-work-board"
    aria-label="Employee work overview">
    <header className="employee-work-heading">
      <h2>My work</h2>
      <p className="role-preview-note">Read-only example records</p>
    </header>
    <div className="employee-work-grid">
      <article className="employee-work-tile employee-work-tasks"
        aria-labelledby="employeeTasksTitle">
        <header className="employee-tile-header">
          <div><h3 id="employeeTasksTitle">Assigned tasks</h3>
            <span className="employee-tile-sub">Your latest assignments</span></div>
          <strong className="employee-tile-number">{data.tasks.filter(t=>t.status!=='Done').length}</strong>
        </header>
        <div className="role-task-filter" role="group" aria-label="Filter tasks">
          {(['open','all'] as const).map(value=>
            <button type="button" className="secondary" key={value} aria-pressed={taskFilter===value}
              onClick={()=>setTaskFilter(value)}>{value==='open'?'Open':'All'} tasks</button>)}
        </div>
        <div className="employee-record-list" aria-live="polite">
          {tasks.length===0?<p>No tasks in this view.</p>:tasks.map(task=>
            <div className="hr-record role-task-record" key={task.id}>
              <h3>{task.title}</h3><p>{task.project} · Due {task.due}</p>
              <span className="role-task-state">{task.status}</span>
            </div>)}
        </div>
        <details className="employee-work-details">
          <summary><span>Notifications</span><span aria-hidden="true">⌄</span></summary>
          <div className="employee-details-body employee-record-list">
            {data.notifications.map(n=><div className="hr-record" key={n.title}>
              <strong>{n.title}</strong><p>{n.context}</p></div>)}
          </div>
        </details>
      </article>

      <article className="employee-work-tile employee-work-attendance"
        aria-labelledby="employeeAttendanceTitle">
        <header className="employee-tile-header"><div><h3 id="employeeAttendanceTitle">Attendance</h3>
          <span className="employee-tile-sub">Daily check-in and check-out</span></div>
          <strong className="employee-tile-status">Clocked out</strong>
        </header>
        <div className="hr-actions employee-work-attendance-action">
          <button type="button" disabled>Clock in</button>
          <button type="button" disabled className="secondary">Clock out</button>
        </div>
        <div className="employee-attendance-summary">
          <p>Check-in controls become active after backend verification.</p>
        </div>
        <details className="employee-work-details" open>
          <summary><span>Attendance history</span><span aria-hidden="true">⌄</span></summary>
          <div className="employee-details-body employee-record-list">
            {data.attendance.map(a=><div className="hr-record role-attendance-record" key={a.day}>
              <strong>{a.day}</strong><span>{a.clockIn} — {a.clockOut}</span></div>)}
          </div>
        </details>
      </article>

      <article className="employee-work-tile employee-work-leave" aria-labelledby="employeeLeaveTitle">
        <header className="employee-tile-header"><div><h3 id="employeeLeaveTitle">Leave requests</h3>
          <span className="employee-tile-sub">Submit time away for approval</span></div></header>
        <div className="employee-leave-layout">
          <form className="employee-leave-form" onSubmit={e=>e.preventDefault()}
            aria-label="Preview of leave request form">
            <div className="employee-leave-fields">
              <label>From <input name="startOn" type="date" disabled/></label>
              <label>Through <input name="endOn" type="date" disabled/></label>
              <label>Leave type <select name="kind" disabled>
                <option value="annual">Annual</option><option value="sick">Sick</option>
                <option value="unpaid">Unpaid</option></select></label>
            </div>
            <label>Reason<textarea name="reason" rows={2} disabled
              placeholder="Available after backend integration"/></label>
            <button type="submit" disabled>Request leave</button>
          </form>
          <div className="employee-leave-history">
            <h4>Recent requests</h4>
            <div className="employee-record-list">{data.leaves.map(l=>
              <div className="hr-record" key={l.id}><strong>{l.kind} · {l.status}</strong>
                <p>{l.from} – {l.through}</p></div>)}</div>
          </div>
        </div>
      </article>
    </div>
  </section>;
}

function EmployeeCalendar({events}:{events:EmployeeDashboardModel['events']}) {
  const [month,setMonth]=useState(new Date(2026,10,1));
  const [mode,setMode]=useState<'month'|'week'|'day'|'list'>('month');
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('');
  const [selectedDay,setSelectedDay]=useState(10);
  const yy=month.getFullYear(),mm=month.getMonth();
  const days=new Date(yy,mm+1,0).getDate(),offset=new Date(yy,mm,1).getDay();
  const filtered=events.filter(e=>e.year===yy&&e.month===mm+1&&
    (!category||e.category===category)&&
    e.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()) &&
    (mode!=='day'||e.day===selectedDay)&&
    (mode!=='week'||Math.floor((e.day+offset-1)/7)===Math.floor((selectedDay+offset-1)/7)));
  const label=new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(month);
  const move=(step:number)=>{
    const next=new Date(yy,mm+step,1);setMonth(next);setSelectedDay(1);
  };
  return <section id="employeeCalendar" className="employee-calendar" aria-labelledby="employeeCalendarTitle">
    <header className="calendar-heading"><h2 id="employeeCalendarTitle">Calendar</h2>
      <div className="calendar-heading-actions"><button className="calendar-primary"
        type="button" disabled title="Event creation needs the backend">New event</button></div></header>
    <div className="calendar-toolbar">
      <div className="calendar-period"><strong aria-live="polite">{label}</strong>
        <button type="button" aria-label="Previous month" onClick={()=>move(-1)}>‹</button>
        <button type="button" onClick={()=>{setMonth(new Date(2026,10,1));setSelectedDay(10);}}>Sample month</button>
        <button type="button" aria-label="Next month" onClick={()=>move(1)}>›</button></div>
      <div className="calendar-view-tabs" role="group" aria-label="Calendar view">
        {(['month','week','day','list'] as const).map(value=>
          <button type="button" key={value} aria-pressed={mode===value}
            onClick={()=>setMode(value)}>{value[0].toUpperCase()+value.slice(1)}</button>)}
      </div>
    </div>
    <div className="calendar-filters">
      <input type="search" aria-label="Search events" placeholder="Search events" value={query}
        onChange={e=>setQuery(e.target.value)}/>
      <select aria-label="Filter by category" value={category}
        onChange={e=>setCategory(e.target.value)}>
        <option value="">All categories</option><option value="meeting">Meetings</option>
        <option value="task">Tasks</option><option value="reminder">Reminders</option>
        <option value="personal">Personal</option></select>
    </div>
    <p className="calendar-status" role="status">{filtered.length} sample event{filtered.length===1?'':'s'} · No calendar data is saved</p>
    <div className="calendar-grid">
      {mode==='month'?<div className="calendar-month">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>
          <div className="calendar-day-head" key={d}>{d}</div>)}
        {Array.from({length:Math.ceil((offset+days)/7)*7},(_,i)=>{
          const day=i-offset+1;
          return <div className="calendar-month-cell" key={i}>
            {day>=1&&day<=days&&<><button type="button" className="calendar-date-number"
              onClick={()=>{setSelectedDay(day);setMode('day');}}>{day}</button>
              <div className="calendar-events">{filtered.filter(e=>e.day===day).map(e=>
                <span key={e.id} className="calendar-event" title={e.time+' '+e.title}>
                  {e.title}</span>)}</div></>}
          </div>;
        })}
      </div>:<div className="calendar-list" aria-live="polite">
        {filtered.length?filtered.map(e=><div className="calendar-list-group" key={e.id}>
          <strong>{e.day} {label} · {e.time}</strong>
          <p>{e.title} · {e.category}</p></div>):
          <p className="calendar-empty">No sample events for these filters.</p>}
      </div>}
    </div>
  </section>;
}

/** Read-only employee dashboard. Every operation stays disabled until authorized APIs exist. */
export function EmployeeDashboard({data}:{data:EmployeeDashboardModel}) {
  return <section id="employeeDashboard" className="employee-dashboard"
    aria-labelledby="employeeDashboardTitle">
    <header className="employee-dashboard-heading"><h1 id="employeeDashboardTitle">
      My dashboard<span className="title-period">.</span></h1>
      <p>Your work, at a glance.</p></header>
    <section className="employee-dashboard-activity" aria-labelledby="employeeActivityTitle">
      <div className="employee-dashboard-activity-heading">
        <h2 id="employeeActivityTitle">Work activity</h2></div>
      <div id="workActivity" className="hr-activity-section">
        <ActivityHeatmap/></div>
    </section>
    <WorkBoard data={data}/>
    <EmployeeCalendar events={data.events}/>
  </section>;
}
