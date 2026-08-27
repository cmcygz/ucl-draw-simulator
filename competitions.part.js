// ---------------------------------------------------------------------------
// Turnuvalar: bicim + takim listesi
// ---------------------------------------------------------------------------
// `format` engine.js icindeki FORMATS anahtari.
// `dates` her hafta icin { day, month, year }; ay adi dile gore cevrilir.
// `teams` bos ve `available:false` ise kura henuz cekilmemis demektir.

const UCL_TEAMS = [
  { id:'psg',        name:'Paris',        code:'PAR', country:'FRA', pot:1, rating:1950 },
  { id:'bayern',     name:'Bayern',       code:'BAY', country:'GER', pot:1, rating:1930 },
  { id:'real',       name:'Real Madrid',  code:'RMA', country:'ESP', pot:1, rating:1910 },
  { id:'arsenal',    name:'Arsenal',      code:'ARS', country:'ENG', pot:1, rating:1905 },
  { id:'liverpool',  name:'Liverpool',    code:'LIV', country:'ENG', pot:1, rating:1900 },
  { id:'mancity',    name:'Man City',     code:'MCI', country:'ENG', pot:1, rating:1890 },
  { id:'barcelona',  name:'Barcelona',    code:'BAR', country:'ESP', pot:1, rating:1885 },
  { id:'inter',      name:'Inter',        code:'INT', country:'ITA', pot:1, rating:1880 },
  { id:'atleti',     name:'Atlético',     code:'ATM', country:'ESP', pot:1, rating:1850 },

  { id:'dortmund',   name:'Dortmund',     code:'DOR', country:'GER', pot:2, rating:1790 },
  { id:'villa',      name:'Aston Villa',  code:'AVL', country:'ENG', pot:2, rating:1780 },
  { id:'manutd',     name:'Man Utd',      code:'MUN', country:'ENG', pot:2, rating:1775 },
  { id:'roma',       name:'Roma',         code:'ROM', country:'ITA', pot:2, rating:1770 },
  { id:'sporting',   name:'Sporting CP',  code:'SPO', country:'POR', pot:2, rating:1760 },
  { id:'porto',      name:'Porto',        code:'POR', country:'POR', pot:2, rating:1740 },
  { id:'betis',      name:'Real Betis',   code:'BET', country:'ESP', pot:2, rating:1730 },
  { id:'psv',        name:'PSV',          code:'PSV', country:'NED', pot:2, rating:1720 },
  { id:'brugge',     name:'Club Brugge',  code:'BRU', country:'BEL', pot:2, rating:1700 },

  { id:'napoli',     name:'Napoli',       code:'NAP', country:'ITA', pot:3, rating:1710 },
  { id:'leipzig',    name:'Leipzig',      code:'RBL', country:'GER', pot:3, rating:1690 },
  { id:'villarreal', name:'Villarreal',   code:'VIL', country:'ESP', pot:3, rating:1680 },
  { id:'feyenoord',  name:'Feyenoord',    code:'FEY', country:'NED', pot:3, rating:1660 },
  { id:'galatasaray',name:'Galatasaray',  code:'GAL', country:'TUR', pot:3, rating:1655 },
  { id:'lille',      name:'Lille',        code:'LIL', country:'FRA', pot:3, rating:1650 },
  { id:'fenerbahce', name:'Fenerbahçe',   code:'FEN', country:'TUR', pot:3, rating:1640 },
  { id:'bodo',       name:'Bodø/Glimt',   code:'BOD', country:'NOR', pot:3, rating:1600 },
  { id:'shakhtar',   name:'Shakhtar',     code:'SHA', country:'UKR', pot:3, rating:1590 },

  { id:'stuttgart',  name:'Stuttgart',    code:'VFB', country:'GER', pot:4, rating:1580 },
  { id:'como',       name:'Como',         code:'COM', country:'ITA', pot:4, rating:1550 },
  { id:'lens',       name:'Lens',         code:'LEN', country:'FRA', pot:4, rating:1545 },
  { id:'slavia',     name:'Slavia Praha', code:'SLA', country:'CZE', pot:4, rating:1540 },
  { id:'aek',        name:'AEK Athens',   code:'AEK', country:'GRE', pot:4, rating:1520 },
  { id:'lask',       name:'LASK',         code:'LSK', country:'AUT', pot:4, rating:1490 },
  { id:'viking',     name:'Viking',       code:'VIK', country:'NOR', pot:4, rating:1470 },
  { id:'slovan',     name:'S. Bratislava',code:'SLO', country:'SVK', pot:4, rating:1460 },
  { id:'sabah',      name:'Sabah',        code:'SAB', country:'AZE', pot:4, rating:1420 },
];

const COMPETITIONS = {
  ucl: {
    id: 'ucl',
    format: 'ucl',
    season: '2026/27',
    available: true,
    teamCount: 36,
    drawnOn: '2026-08-27',
    dates: [
      { day: '8-10', month: 9, year: 2026 },
      { day: '13/14', month: 10, year: 2026 },
      { day: '20/21', month: 10, year: 2026 },
      { day: '3/4', month: 11, year: 2026 },
      { day: '24/25', month: 11, year: 2026 },
      { day: '8/9', month: 12, year: 2026 },
      { day: '19/20', month: 1, year: 2027 },
      { day: '27', month: 1, year: 2027 }
    ],
    teams: UCL_TEAMS
  },

  uel: {
    id: 'uel',
    format: 'uel',
    season: '2026/27',
    available: false,
    teamCount: 36,
    drawnOn: '2026-08-28',
    dates: [
      { day: '24/25', month: 9, year: 2026 },
      { day: '1/2', month: 10, year: 2026 },
      { day: '22/23', month: 10, year: 2026 },
      { day: '5/6', month: 11, year: 2026 },
      { day: '26/27', month: 11, year: 2026 },
      { day: '10/11', month: 12, year: 2026 },
      { day: '21/22', month: 1, year: 2027 },
      { day: '28/29', month: 1, year: 2027 }
    ],
    teams: []
  },

  uecl: {
    id: 'uecl',
    format: 'uecl',
    season: '2026/27',
    available: false,
    teamCount: 36,
    drawnOn: '2026-08-28',
    dates: [
      { day: '24/25', month: 9, year: 2026 },
      { day: '1/2', month: 10, year: 2026 },
      { day: '22/23', month: 10, year: 2026 },
      { day: '5/6', month: 11, year: 2026 },
      { day: '26/27', month: 11, year: 2026 },
      { day: '10/11', month: 12, year: 2026 }
    ],
    teams: []
  }
};

const COMP_IDS = ['ucl', 'uel', 'uecl'];

if (typeof module !== 'undefined') {
  module.exports = { COMPETITIONS, COMP_IDS };
}
