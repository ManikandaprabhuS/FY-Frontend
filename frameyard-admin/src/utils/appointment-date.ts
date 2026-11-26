// datetime-local expects browser-local time, not an ISO UTC string.
export function appointmentMinimum(now=new Date()):string{
 const next=new Date(Math.floor(now.getTime()/60000)*60000+60000);
 const pad=(value:number)=>String(value).padStart(2,'0');
 return `${next.getFullYear()}-${pad(next.getMonth()+1)}-${pad(next.getDate())}T${pad(next.getHours())}:${pad(next.getMinutes())}`;
}
