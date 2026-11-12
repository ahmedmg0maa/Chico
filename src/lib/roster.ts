import type { Rank } from './types';
/** Names/ranks transcribed from the CHICO 1.1 source; no performance records. Confirm before importing. */
export const APPROVED_ROSTER: {name:string;rank:Rank}[] = [
  {name:'General',rank:'Responsible'},
  {name:'Marwan',rank:'Administrator'},{name:'Bashar',rank:'Administrator'},{name:'Nar',rank:'Administrator'},
  ...['Alhassan','Bish','Gambul','Haitham','Sundus','Sirbos','Darklight','Zeroo','Dark','Elyas','Bnammo'].map(name=>({name,rank:'Moderator' as const})),
  ...['Sherlock','Gaby','Moody','Gehad'].map(name=>({name,rank:'SN.Helper' as const})),
  ...['Abdullahh','Alrawi','Yoyo','Rey','Mohamad','Kararr','Coconot','Leogirl'].map(name=>({name,rank:'Helper' as const}))
];
