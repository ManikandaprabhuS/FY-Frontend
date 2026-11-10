import {useEffect} from "react";
import {create} from "zustand";
import api from "../services/api";
export type OrderFlow={steps:Array<{status:string;label:string;description:string}>;transitions:Record<string,string[]>;cancellable:string[];cancellationMessageStatuses:string[];cancellationMessage:string;legacyDisplay:Record<string,string>};
let request:Promise<void>|undefined;
export const useOrderFlowStore=create<{flow:OrderFlow|null;error:boolean;load:()=>Promise<void>}>((set,get)=>({
 flow:null,error:false,load:()=>{if(get().flow)return Promise.resolve();if(request)return request;
 request=api.get<{data:{flow:OrderFlow}}>("/orders/status-flow",{timeout:15000}).then(r=>set({flow:r.data.data.flow,error:false})).catch(()=>set({error:true})).finally(()=>{request=undefined;});
 return request;},
}));
export const useOrderFlow=()=>{
 const flow=useOrderFlowStore(s=>s.flow),error=useOrderFlowStore(s=>s.error),load=useOrderFlowStore(s=>s.load);
 useEffect(()=>{const timer=setTimeout(()=>void load(),0);return()=>clearTimeout(timer);},[load]);
 return{flow,error,retry:load};
};
