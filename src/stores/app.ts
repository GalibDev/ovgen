import {create} from 'zustand';
import {localDate} from '../lib/db';
export const useAppStore=create<{date:string;setDate:(date:string)=>void;notice:string;notify:(notice:string)=>void}>(set=>({date:localDate(),setDate:date=>set({date}),notice:'',notify:notice=>set({notice})}));
