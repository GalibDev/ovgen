import {useState} from 'react';
import {Link} from 'react-router-dom';
import {Check,Minus,Plus,MoreVertical,Pencil,Trash2,ArrowUpRight} from 'lucide-react';
import type {Habit,Progress} from '../../types';
import {percent,changeValue,toggleStep,updateProgress,deleteHabit} from '../../lib/db';
import {useAppStore} from '../../stores/app';
import {HabitIcon} from './habit-icon';
export function Controls({habit:h,progress:p,date}:{habit:Habit;progress?:Progress;date:string}){
 const notify=useAppStore(s=>s.notify);const run=(task:Promise<unknown>)=>{void task.catch(()=>notify('Could not save progress. Please try again.'));};
 if(h.tracking==='steps')return <div className="steps">{h.steps.map(s=><button key={s.id} className={p?.steps.includes(s.id)?'step checked':'step'} onClick={()=>run(toggleStep(h,date,s.id))}><span>{p?.steps.includes(s.id)?<Check size={13}/>:null}</span>{s.name}</button>)}</div>;
 if(h.tracking==='boolean')return <button className={p?.value?'complete done':'complete'} onClick={()=>run(updateProgress(h,date,p=>({...p,value:p.value?0:1})))}><Check size={16}/>{p?.value?'Completed · undo':'Mark complete'}</button>;
 return <div className="counter"><button aria-label={`Decrease ${h.name}`} disabled={!p?.value} onClick={()=>run(changeValue(h,date,h.tracking==='duration'?-5:-1))}><Minus size={16}/></button><span>{p?.value||0} / {h.target} {h.unit}</span><button aria-label={`Increase ${h.name}`} onClick={()=>run(changeValue(h,date,h.tracking==='duration'?5:1))}><Plus size={16}/></button>{h.tracking==='duration'&&<label className="manual">Minutes<input aria-label="Record completed minutes" type="number" min="0" value={p?.value||0} onChange={e=>{const value=Number(e.target.value);if(Number.isFinite(value)&&value>=0)run(updateProgress(h,date,p=>({...p,value})));}}/></label>}</div>;
}
export function HabitCard({habit:h,progress:p,date}:{habit:Habit;progress?:Progress;date:string}){
 const [menu,setMenu]=useState(false);const notify=useAppStore(s=>s.notify);const n=percent(h,p);const amount=h.tracking==='steps'?h.steps.filter(s=>p?.steps.includes(s.id)).length:p?.value||0;
 return <article className="habit-card" style={{'--habit-color':h.color} as React.CSSProperties}><HabitIcon name={h.icon} color={h.color}/><div className="habit-main"><div className="card-top"><Link className="habit-title" to={`/habits/${h.id}`}>{h.name}</Link><span className="percent">{n}%</span><div className="menu-wrap"><button className="more" aria-label={`Options for ${h.name}`} aria-expanded={menu} onClick={()=>setMenu(!menu)}><MoreVertical size={21}/></button>{menu&&<div className="menu"><Link to={`/habits/${h.id}`}><ArrowUpRight size={15}/>View details</Link><Link to={`/habits/${h.id}/edit`}><Pencil size={15}/>Edit habit</Link><button onClick={()=>{if(confirm(`Delete ${h.name} and its history?`))void deleteHabit(h.id).then(()=>notify('Habit deleted')).catch(()=>notify('Could not delete habit'));setMenu(false);}}><Trash2 size={15}/>Delete habit</button></div>}</div></div><p className="habit-sub">{h.tracking==='boolean'?(n?'A little win for today':'Ready when you are'): `${amount} / ${h.tracking==='steps'?h.steps.length:h.target} ${h.unit}`}</p><div className="progress-track"><span style={{width:`${n}%`,background:h.color}}/></div><Controls habit={h} progress={p} date={date}/></div></article>;
}
