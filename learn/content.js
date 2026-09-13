/* ============================================================
   Learning World — shared content (single source of truth)
   Letters (sound + keyword + picture) and a picture word bank.
   Curriculum order is decodable-first (s,a,t,p,i,n...) with
   confusable pairs (b/d, p/q, m/n) kept apart.
   ============================================================ */
window.LWC = (function () {
  "use strict";

  // sound = TTS approximation, always anchored by the keyword when spoken
  var LETTERS = [
    { L:"s", key:"snake",    e:"🐍", s:"sss"  },
    { L:"a", key:"apple",    e:"🍎", s:"aah"  },
    { L:"t", key:"tiger",    e:"🐯", s:"tuh"  },
    { L:"p", key:"pig",      e:"🐷", s:"puh"  },
    { L:"i", key:"insect",   e:"🐜", s:"ih"   },
    { L:"n", key:"nose",     e:"👃", s:"nnn"  },
    { L:"d", key:"dog",      e:"🐶", s:"duh"  },
    { L:"m", key:"monkey",   e:"🐵", s:"mmm"  },
    { L:"g", key:"goat",     e:"🐐", s:"guh"  },
    { L:"o", key:"octopus",  e:"🐙", s:"oh"   },
    { L:"c", key:"cat",      e:"🐱", s:"kuh"  },
    { L:"k", key:"kite",     e:"🪁", s:"kuh"  },
    { L:"e", key:"egg",      e:"🥚", s:"eh"   },
    { L:"h", key:"hat",      e:"🎩", s:"huh"  },
    { L:"u", key:"umbrella", e:"☂️", s:"uh"   },
    { L:"r", key:"rabbit",   e:"🐰", s:"rrr"  },
    { L:"b", key:"ball",     e:"⚽", s:"buh"  },
    { L:"f", key:"fish",     e:"🐟", s:"fff"  },
    { L:"l", key:"lion",     e:"🦁", s:"lll"  },
    { L:"j", key:"juice",    e:"🧃", s:"juh"  },
    { L:"v", key:"van",      e:"🚐", s:"vvv"  },
    { L:"w", key:"whale",    e:"🐳", s:"wuh"  },
    { L:"y", key:"yo-yo",    e:"🪀", s:"yuh"  },
    { L:"z", key:"zebra",    e:"🦓", s:"zzz"  },
    { L:"x", key:"box",      e:"📦", s:"kss"  },
    { L:"q", key:"queen",    e:"👑", s:"kwuh" }
  ];
  var BY_L = {}; LETTERS.forEach(function (d, i) { d.idx = i; BY_L[d.L] = d; });

  var WORDS = [
    {w:"apple",e:"🍎",L:"a"}, {w:"ant",e:"🐜",L:"a"},
    {w:"ball",e:"⚽",L:"b",fam:"all"}, {w:"bat",e:"🦇",L:"b",fam:"at"},
    {w:"bee",e:"🐝",L:"b",fam:"ee"}, {w:"bug",e:"🐛",L:"b",fam:"ug"},
    {w:"box",e:"📦",L:"b",fam:"ox"}, {w:"bun",e:"🍞",L:"b",fam:"un"},
    {w:"cat",e:"🐱",L:"c",fam:"at"}, {w:"car",e:"🚗",L:"c",fam:"ar"},
    {w:"cake",e:"🍰",L:"c",fam:"ake"}, {w:"cow",e:"🐄",L:"c"},
    {w:"dog",e:"🐶",L:"d",fam:"og"}, {w:"duck",e:"🦆",L:"d"},
    {w:"egg",e:"🥚",L:"e"}, {w:"fish",e:"🐟",L:"f"},
    {w:"fox",e:"🦊",L:"f",fam:"ox"}, {w:"frog",e:"🐸",L:"f",fam:"og"},
    {w:"goat",e:"🐐",L:"g"}, {w:"hat",e:"🎩",L:"h",fam:"at"},
    {w:"jar",e:"🫙",L:"j",fam:"ar"}, {w:"king",e:"🤴",L:"k",fam:"ing"},
    {w:"kite",e:"🪁",L:"k"}, {w:"lion",e:"🦁",L:"l"},
    {w:"monkey",e:"🐵",L:"m"}, {w:"mug",e:"☕",L:"m",fam:"ug"},
    {w:"nose",e:"👃",L:"n"}, {w:"octopus",e:"🐙",L:"o"},
    {w:"pig",e:"🐷",L:"p"}, {w:"queen",e:"👑",L:"q"},
    {w:"rat",e:"🐀",L:"r",fam:"at"}, {w:"ring",e:"💍",L:"r",fam:"ing"},
    {w:"snake",e:"🐍",L:"s",fam:"ake"}, {w:"star",e:"⭐",L:"s",fam:"ar"},
    {w:"sun",e:"☀️",L:"s",fam:"un"}, {w:"tiger",e:"🐯",L:"t"},
    {w:"tree",e:"🌳",L:"t",fam:"ee"}, {w:"umbrella",e:"☂️",L:"u"},
    {w:"van",e:"🚐",L:"v"}, {w:"whale",e:"🐳",L:"w"},
    {w:"wall",e:"🧱",L:"w",fam:"all"}, {w:"yo-yo",e:"🪀",L:"y"},
    {w:"zebra",e:"🦓",L:"z"}
  ];
  var BY_W = {}; WORDS.forEach(function (d) { BY_W[d.w] = d; });
  var FAM = {}; WORDS.forEach(function (d) { if (d.fam) { (FAM[d.fam] = FAM[d.fam] || []).push(d.w); } });

  // letter-sound approximations for any letter
  var SND = {}; LETTERS.forEach(function (d) { SND[d.L] = d.s; });

  return { LETTERS: LETTERS, BY_L: BY_L, WORDS: WORDS, BY_W: BY_W, FAM: FAM, SND: SND };
})();
