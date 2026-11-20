import {RULES} from './academy';
import type {RulebookEntry} from './rulebook';

/**
 * English game-menu names and compact sanction notation are from the owner's
 * original training table. Never fabricate a game-menu command for a new rule.
 * Missing table entries use explicitly marked descriptive English labels and
 * sanctions transcribed from the owner's written rules.
 */
export type CardCommand={
 code:string;
 englishName:string;
 punishmentCode:string;
 isGameMenuName:boolean;
 source:'table'|'written';
};
const official=new Map(RULES.map(r=>[normalizeCode(r.code),r]));

/** Not game-menu identifiers; for rules absent from the photographed command table. */
const writtenOnly:Record<string,{name:string;sanction:string}>={
 CHAT9:{name:'Impersonating administration',sanction:'Ban Permanent'},
 CHAT10:{name:'Deceiving players',sanction:'Ban Permanent'},
 CHAT11:{name:'Deceiving administration',sanction:'Ban Permanent'},
 CHAT12:{name:'Defamation',sanction:'Ban up to 30 days'},
 CHAT17:{name:'Personal information disclosure',sanction:'Ban Permanent'},
 TCHAT2:{name:'Misleading trade information',sanction:'Mute 10 min'},
 'ABUSE3.1':{name:'Intentional rule violations',sanction:'Ban Permanent'},
 ALERT1:{name:'Ban evasion',sanction:'Ban 14 days or Permanent'},
 ALERT2:{name:'Project server damage',sanction:'Ban Permanent'},
 ALERT3:{name:'Third-party cheating software',sanction:'Ban Permanent'},
 ALERT5:{name:'External-platform defamation',sanction:'Ban Permanent'},
 ALERT6:{name:'Third-party project promotion',sanction:'Ban 14 days or Permanent'},
 ALERT7:{name:'Senior administration decision',sanction:'By senior administration'}
};
export function normalizeCode(code:string){return code.replace(/\s+/g,'').toUpperCase();}
export function displayRuleCode(code:string){
 return normalizeCode(code).replace(/^([A-Z]+)([0-9].*)$/,'$1 $2');
}
export function getCardCommand(rule:RulebookEntry):CardCommand{
 const canonical=normalizeCode(rule.code);
 const code=displayRuleCode(canonical);
 const game=official.get(canonical);
 if(game){
  return {code,englishName:game.name,punishmentCode:
   game.kind==='Kick'?'Kick in Game':game.kind+' '+game.duration,
   isGameMenuName:true,source:'table'};
 }
 const note=writtenOnly[canonical];
 if(note)return {code,englishName:note.name,punishmentCode:note.sanction,isGameMenuName:false,source:'written'};
 // Do not invent a missing game-menu name or punishment.
 return {code,englishName:'Not listed in command table',
  punishmentCode:'See full punishment',isGameMenuName:false,source:'written'};
}
