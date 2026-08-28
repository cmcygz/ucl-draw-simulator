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

const UEL_TEAMS = [
  { id:'benfica',    name:'Benfica',      code:'BEN', country:'POR', pot:1, rating:1720 },
  { id:'leverkusen', name:'Leverkusen',   code:'B04', country:'GER', pot:1, rating:1710 },
  { id:'juventus',   name:'Juventus',     code:'JUV', country:'ITA', pot:1, rating:1705 },
  { id:'marseille',  name:'Marseille',    code:'MAR', country:'FRA', pot:1, rating:1695 },
  { id:'milan',      name:'Milan',        code:'MIL', country:'ITA', pot:1, rating:1690 },
  { id:'lyon',       name:'Lyon',         code:'LYO', country:'FRA', pot:1, rating:1670 },
  { id:'sociedad',   name:'Real Sociedad',code:'RSO', country:'ESP', pot:1, rating:1650 },
  { id:'olympiacos', name:'Olympiacos',   code:'OLY', country:'GRE', pot:1, rating:1630 },
  { id:'az',         name:'AZ Alkmaar',   code:'AZA', country:'NED', pot:1, rating:1600 },

  { id:'celtic',     name:'Celtic',       code:'CEL', country:'SCO', pot:2, rating:1570 },
  { id:'salzburg',   name:'Salzburg',     code:'SAL', country:'AUT', pot:2, rating:1560 },
  { id:'dinamozg',   name:'Dinamo Zagreb',code:'DZG', country:'CRO', pot:2, rating:1545 },
  { id:'rennes',     name:'Rennes',       code:'REN', country:'FRA', pot:2, rating:1540 },
  { id:'unionsg',    name:'Union SG',     code:'USG', country:'BEL', pot:2, rating:1535 },
  { id:'anderlecht', name:'Anderlecht',   code:'AND', country:'BEL', pot:2, rating:1520 },
  { id:'sparta',     name:'Sparta Praha', code:'SPA', country:'CZE', pot:2, rating:1510 },
  { id:'ferencvaros',name:'Ferencváros',  code:'FER', country:'HUN', pot:2, rating:1500 },
  { id:'plzen',      name:'Viktoria Plzeň',code:'PLZ',country:'CZE', pot:2, rating:1495 },

  { id:'palace',     name:'Crystal Palace',code:'CRY',country:'ENG', pot:3, rating:1580 },
  { id:'bournemouth',name:'Bournemouth',  code:'BOU', country:'ENG', pot:3, rating:1565 },
  { id:'sunderland', name:'Sunderland',   code:'SUN', country:'ENG', pot:3, rating:1530 },
  { id:'celta',      name:'Celta',        code:'CTA', country:'ESP', pot:3, rating:1520 },
  { id:'sturm',      name:'Sturm Graz',   code:'STU', country:'AUT', pot:3, rating:1450 },
  { id:'lech',       name:'Lech Poznań',  code:'LEC', country:'POL', pot:3, rating:1430 },
  { id:'jagiellonia',name:'Jagiellonia',  code:'JAG', country:'POL', pot:3, rating:1410 },
  { id:'celje',      name:'Celje',        code:'CLJ', country:'SVN', pot:3, rating:1395 },
  { id:'omonia',     name:'Omonia',       code:'OMO', country:'CYP', pot:3, rating:1385 },

  { id:'hoffenheim', name:'Hoffenheim',   code:'TSG', country:'GER', pot:4, rating:1490 },
  { id:'besiktas',   name:'Beşiktaş',     code:'BJK', country:'TUR', pot:4, rating:1470 },
  { id:'nec',        name:'NEC',          code:'NEC', country:'NED', pot:4, rating:1420 },
  { id:'beersheva',  name:'H. Beer-Sheva',code:'HBS', country:'ISR', pot:4, rating:1390 },
  { id:'ofi',        name:'OFI',          code:'OFI', country:'GRE', pot:4, rating:1360 },
  { id:'lillestrom', name:'Lillestrøm',   code:'LSK', country:'NOR', pot:4, rating:1350 },
  { id:'levski',     name:'Levski Sofia', code:'LEV', country:'BUL', pot:4, rating:1330 },
  { id:'torreense',  name:'Torreense',    code:'TOR', country:'POR', pot:4, rating:1320 },
  { id:'ararat',     name:'Ararat-Armenia',code:'ARA',country:'ARM', pot:4, rating:1290 },
];

const UECL_TEAMS = [
  { id:'atalanta',   name:'Atalanta',     code:'ATA', country:'ITA', pot:1, rating:1560 },
  { id:'ajax',       name:'Ajax',         code:'AJA', country:'NED', pot:1, rating:1540 },
  { id:'monaco',     name:'Monaco',       code:'ASM', country:'FRA', pot:1, rating:1530 },
  { id:'freiburg',   name:'Freiburg',     code:'SCF', country:'GER', pot:1, rating:1520 },
  { id:'braga',      name:'Braga',        code:'BRA', country:'POR', pot:1, rating:1490 },
  { id:'copenhagen', name:'Copenhagen',   code:'FCK', country:'DEN', pot:1, rating:1470 },

  { id:'brighton',   name:'Brighton',     code:'BHA', country:'ENG', pot:2, rating:1545 },
  { id:'midtjylland',name:'Midtjylland',  code:'FCM', country:'DEN', pot:2, rating:1440 },
  { id:'panathinaikos',name:'Panathinaikos',code:'PAO',country:'GRE',pot:2, rating:1430 },
  { id:'zvezda',     name:'Crvena Zvezda',code:'CRV', country:'SRB', pot:2, rating:1425 },
  { id:'gent',       name:'Gent',         code:'GNT', country:'BEL', pot:2, rating:1415 },
  { id:'pafos',      name:'Pafos',        code:'PAF', country:'CYP', pot:2, rating:1380 },

  { id:'getafe',     name:'Getafe',       code:'GET', country:'ESP', pot:3, rating:1450 },
  { id:'twente',     name:'Twente',       code:'TWE', country:'NED', pot:3, rating:1400 },
  { id:'lugano',     name:'Lugano',       code:'LUG', country:'SUI', pot:3, rating:1370 },
  { id:'kups',       name:'KuPS',         code:'KUP', country:'FIN', pot:3, rating:1300 },
  { id:'borac',      name:'Borac',        code:'BOR', country:'BIH', pot:3, rating:1270 },
  { id:'redimps',    name:'L. Red Imps',  code:'LRI', country:'GIB', pot:3, rating:1150 },

  { id:'trabzonspor',name:'Trabzonspor',  code:'TRA', country:'TUR', pot:4, rating:1420 },
  { id:'hearts',     name:'Hearts',       code:'HEA', country:'SCO', pot:4, rating:1360 },
  { id:'brann',      name:'Brann',        code:'BRN', country:'NOR', pot:4, rating:1345 },
  { id:'sinttruiden',name:'Sint-Truiden', code:'STV', country:'BEL', pot:4, rating:1330 },
  { id:'craiova',    name:'U. Craiova',   code:'UCR', country:'ROU', pot:4, rating:1320 },
  { id:'kairat',     name:'Kairat',       code:'KAI', country:'KAZ', pot:4, rating:1280 },

  { id:'hajduk',     name:'Hajduk Split', code:'HAJ', country:'CRO', pot:5, rating:1330 },
  { id:'nordsjaelland',name:'Nordsjælland',code:'FCN',country:'DEN', pot:5, rating:1320 },
  { id:'agf',        name:'AGF',          code:'AGF', country:'DEN', pot:5, rating:1310 },
  { id:'jablonec',   name:'Jablonec',     code:'JAB', country:'CZE', pot:5, rating:1295 },
  { id:'riga',       name:'Riga FC',      code:'RIG', country:'LVA', pot:5, rating:1240 },
  { id:'escaldes',   name:"Inter d'Escaldes",code:'IDE',country:'AND',pot:5,rating:1160 },

  { id:'mjallby',    name:'Mjällby',      code:'MJA', country:'SWE', pot:6, rating:1280 },
  { id:'thun',       name:'Thun',         code:'THU', country:'SUI', pot:6, rating:1265 },
  { id:'cska',       name:'CSKA Sofia',   code:'CSK', country:'BUL', pot:6, rating:1250 },
  { id:'kaunas',     name:'Kauno Žalgiris',code:'KZA',country:'LTU', pot:6, rating:1200 },
  { id:'egnatia',    name:'Egnatia',      code:'EGN', country:'ALB', pot:6, rating:1190 },
  { id:'iberia',     name:'Iberia 1999',  code:'IBE', country:'GEO', pot:6, rating:1180 },
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
    available: true,
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
    teams: UEL_TEAMS
  },

  uecl: {
    id: 'uecl',
    format: 'uecl',
    season: '2026/27',
    available: true,
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
    teams: UECL_TEAMS
  }
};

const COMP_IDS = ['ucl', 'uel', 'uecl'];

if (typeof module !== 'undefined') {
  module.exports = { COMPETITIONS, COMP_IDS };
}
