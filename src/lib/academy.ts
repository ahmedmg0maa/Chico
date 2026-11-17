// Transcribed from the supplied team table; Media1 intentionally removed by owner.
export type Kind='Jail'|'Mute'|'Ban'|'Kick';
export type TrainingRank='Helper'|'SN.Helper'|'Moderator';
export type Rule={code:string;name:string;arabic:string;kind:Kind;duration:string;note:string};
const rows=[
  [
    "Rp1",
    "Deathmatch",
    "القتل العشوائي",
    "Jail",
    "20 min",
    "ضرورة إدخال السبب Rp1"
  ],
  [
    "Rp2",
    "DeathmatchAuto",
    "القتل التلقائي",
    "Jail",
    "20 min",
    "ضرورة إدخال السبب"
  ],
  [
    "Rp3",
    "NrpPower",
    "إساءة استخدام القوة خارج RP",
    "Jail",
    "10 min",
    ""
  ],
  [
    "Rp4",
    "CreatingNrpSituations",
    "إنشاء مواقف خارج إطار RP",
    "Jail",
    "15 min",
    ""
  ],
  [
    "Rp5",
    "Metagaming",
    "استخدام معلومات خارج اللعبة داخل RP",
    "Mute",
    "30 min",
    "كتم بكل قناة الرسائل"
  ],
  [
    "Rp6",
    "RoleplayRejection",
    "رفض تقمص الأدوار",
    "Jail",
    "30 min",
    ""
  ],
  [
    "Rp7",
    "RoleplayDisbalance",
    "الإخلال بتوازن تقمص الأدوار",
    "Jail",
    "20 min",
    ""
  ],
  [
    "Rp8",
    "AfkInGame",
    "الخمول داخل اللعبة",
    "Kick",
    "In game",
    ""
  ],
  [
    "Rp9",
    "DriveBy",
    "إطلاق النار من المركبة",
    "Jail",
    "60 min",
    ""
  ],
  [
    "Rp9.1",
    "MassDriveBy",
    "إطلاق النار الجماعي من المركبة",
    "Ban",
    "12 h",
    "حظر حساب فقط"
  ],
  [
    "RP10",
    "RepeatKill",
    "القتل المتكرر",
    "Jail",
    "90 min",
    ""
  ],
  [
    "Rp11",
    "GreenZoneViolation",
    "انتهاك المنطقة الآمنة",
    "Jail",
    "45 min",
    ""
  ],
  [
    "Rp12",
    "NrpKidnapping",
    "اختطاف خارج إطار RP",
    "Jail",
    "30 min",
    ""
  ],
  [
    "Rp13",
    "NrpFactionActions",
    "تصرفات الفصيل خارج إطار RP",
    "Ban",
    "3 days",
    "حظر حساب فقط"
  ],
  [
    "Rp14",
    "SexualHarassment",
    "التحرش الجنسي",
    "Ban",
    "30 days",
    "حظر حساب فقط"
  ],
  [
    "Rp15",
    "FactionMemberProvocation",
    "استفزاز أعضاء الفصيل",
    "Jail",
    "30 min",
    ""
  ],
  [
    "Rp16",
    "CrimesAgainstEmergencyPersonnel",
    "الجرائم ضد موظفي الطوارئ",
    "Ban",
    "12 h",
    "حظر حساب فقط"
  ],
  [
    "Name1",
    "NrpNickname",
    "اسم مستعار خارج إطار RP",
    "Kick",
    "In game",
    ""
  ],
  [
    "Name2",
    "OffensiveNickname",
    "اسم مستعار مسيء",
    "Kick",
    "In game",
    ""
  ],
  [
    "Chat1",
    "InsultingPlayer",
    "إهانة لاعب",
    "Ban",
    "24 h",
    ""
  ],
  [
    "Chat2",
    "InsultingRelatives",
    "إهانة أقارب اللاعب",
    "Ban",
    "3 days",
    ""
  ],
  [
    "Chat3",
    "DiscriminationInsults",
    "الإهانات التمييزية",
    "Ban",
    "3 days",
    ""
  ],
  [
    "Chat4",
    "InsultingAdministration",
    "إهانة الإدارة",
    "Ban",
    "7 days",
    ""
  ],
  [
    "Chat5",
    "SpamAndFlood",
    "السبام والإغراق",
    "Mute",
    "10 min",
    "كتم بكل قناة الرسائل"
  ],
  [
    "Chat6",
    "ReportSystemAbuse",
    "إساءة استخدام نظام البلاغات",
    "Mute",
    "30 min",
    "كتم بكل قناة الرسائل"
  ],
  [
    "Chat7",
    "UnauthorizedAdvertising",
    "الإعلانات غير المصرح بها",
    "Ban",
    "10 days",
    ""
  ],
  [
    "Chat8",
    "MusicInVoiceChat",
    "تشغيل الموسيقى في المحادثة الصوتية",
    "Mute",
    "60 min",
    "كتم مايك فقط"
  ],
  [
    "Chat13",
    "RealLifeThreats",
    "التهديدات في الحياة الواقعية",
    "Ban",
    "10 days",
    ""
  ],
  [
    "Chat14",
    "ProvokingRuleViolations",
    "التحريض على مخالفة القواعد",
    "Ban",
    "12 h",
    ""
  ],
  [
    "Chat15",
    "ToxicBehavior",
    "السلوك السام",
    "Ban",
    "3 days",
    ""
  ],
  [
    "Chat16",
    "UnofficialLanguageUsage",
    "استخدام لغة غير رسمية",
    "Mute",
    "10 min",
    "كتم بكل قناة الرسائل"
  ],
  [
    "TChat1",
    "TradeChatAbuse",
    "إساءة استخدام دردشة التجارة",
    "Mute",
    "20 min",
    "كتم بكل قناة الرسائل"
  ],
  [
    "Abuse1",
    "GameModeAbuse",
    "إساءة استخدام نظام اللعبة",
    "Ban",
    "30 days",
    "حظر حساب فقط"
  ],
  [
    "Abuse2",
    "AfkAbuse",
    "إساءة استخدام حالة الخمول",
    "Ban",
    "3 days",
    "حظر حساب فقط"
  ],
  [
    "Abuse3",
    "SystematicRuleViolation",
    "المخالفات المنهجية للقواعد",
    "Ban",
    "30 days",
    "حظر حساب فقط"
  ],
  [
    "Abuse4",
    "LargeScaleRpInterruption",
    "تعطيل RP على نطاق واسع",
    "Ban",
    "24 h",
    "حظر حساب فقط"
  ],
  [
    "Abuse5",
    "GameplayObstruction",
    "عرقلة أسلوب اللعب",
    "Jail",
    "60 min",
    ""
  ],
  [
    "Alert4",
    "EconomyDamage",
    "الإضرار بالاقتصاد",
    "Ban",
    "Permanent",
    "حظر حساب فقط"
  ],
  [
    "Clan1",
    "GangNameViolation",
    "مخالفة اسم العصابة",
    "Kick",
    "In game",
    ""
  ],
  [
    "Clan2",
    "BlockingGangHouse",
    "إغلاق أو حجب مقر العصابة",
    "Jail",
    "60 min",
    ""
  ],
  [
    "Clan3",
    "GangChatViolation",
    "مخالفة دردشة العصابة",
    "Mute",
    "240 min",
    "كتم رسائل من كل مكان فقط"
  ],
  [
    "Clan4",
    "GangTeaming",
    "التحالف أو التعاون غير المسموح بين العصابات",
    "Jail",
    "30 min",
    ""
  ],
  [
    "Clan5",
    "GangTazerAbuse",
    "إساءة استخدام الصاعق من قبل العصابة",
    "Jail",
    "90 min",
    ""
  ],
  [
    "Clan6",
    "GangRecruitmentGreenZone",
    "تجنيد العصابات في المنطقة الآمنة",
    "Mute",
    "60 min",
    "كتم رسائل من كل مكان فقط"
  ],
  [
    "Clan10",
    "GangCurrencyAbuse",
    "إساءة استخدام عملة العصابة",
    "Ban",
    "30 days",
    "حظر حساب فقط"
  ]
] as const;
export const RULES:Rule[]=rows.map(([code,name,arabic,kind,duration,note])=>({code,name,arabic,kind,duration,note}));
export function permission(rule:Rule,rank:TrainingRank):'allowed'|'evidence'|'restricted'{
 if(rule.kind==='Kick')return 'evidence';
 if(rule.kind==='Jail'||rule.kind==='Mute')return 'allowed';
 return rank==='Moderator'&&rule.duration!=='Permanent'?'allowed':'restricted';
}
export const LESSONS=[
 {id:'jail',title:'Jail 01 — سجن اللاعب',example:'Rp9 · DriveBy · 60 min',steps:['ابحث عن اسم اللاعب في Search players.','افتح Sanctions ثم Punish.','اختر DriveBy من قائمة المخالفات.','أدخل Rp9 في خانة السبب ثم اضغط Punish.','راجع رسالة النظام للتأكد من تطبيق العقوبة.'],source:'1.mov'},
 {id:'jail-2',title:'Jail 02 — نسخة تدريبية ثانية',example:'Rp9 · DriveBy · 60 min',steps:['ابحث عن اسم اللاعب في Search players.','افتح Sanctions ثم Punish.','اختر DriveBy من قائمة المخالفات.','أدخل Rp9 في خانة السبب ثم اضغط Punish.','راجع رسالة النظام للتأكد من تطبيق العقوبة.'],source:'2.mov'},
 {id:'mute',title:'Mute — كتم اللاعب',example:'Chat8 · MusicInVoiceChat · 60 min',steps:['ابحث عن اللاعب في Search players.','افتح Sanctions ثم Punish.','اختر MusicInVoiceChat.','أدخل Chat8 في خانة السبب ثم اضغط Punish.','راجع رسالة النظام وتأكد من كتم المحادثة الصوتية فقط.'],source:'3.mov'}
] as const;
