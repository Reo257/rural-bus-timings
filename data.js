/* ==========================================================================
   Rural Bus Timings — timetable data
   --------------------------------------------------------------------------
   SAMPLE DATA. The place names are real, but every timing below is made up
   for demonstration. Replace ROUTES with the actual timetable of your area
   and the whole site updates automatically.

   To add a stop:   append an object to STOPS.
   To add a route:  append an object to ROUTES with its stop sequence,
                    the minutes each stop is from the origin, and the
                    departure times from the origin.
   ========================================================================== */

const AREA = {
  name: 'Nemmara – Kollengode Rural Belt',
  district: 'Palakkad, Kerala',
  hint: 'Sample timetable — demo data'
};

/* ---------------------------------------------------------------- stops --- */
const STOPS = [
  { id: 'nemmara',       name: 'Nemmara Bus Stand',      landmark: 'Town Hall, Nemmara' },
  { id: 'kizhakkummuri', name: 'Kizhakkummuri Junction', landmark: 'Kizhakkummuri' },
  { id: 'vithanassery',  name: 'Vithanassery',           landmark: 'Vithanassery Temple' },
  { id: 'ayilur',        name: 'Ayilur',                 landmark: 'Ayilur Junction' },
  { id: 'kollengode',    name: 'Kollengode Bus Stand',   landmark: 'Kollengode Market' },
  { id: 'pothundy',      name: 'Pothundy Dam Junction',  landmark: 'Pothundy Dam' },
  { id: 'kaiparamba',    name: 'Kaiparamba',             landmark: 'Kaiparamba' },
  { id: 'muthalamada',   name: 'Muthalamada',            landmark: 'Muthalamada Market' },
  { id: 'elavanchery',   name: 'Elavanchery',            landmark: 'Elavanchery' },
  { id: 'nelliampathy',  name: 'Nelliampathy',           landmark: 'Nelliampathy Hill Top' }
];

/* --------------------------------------------------------------- routes --- */
/* offsets = minutes from the route's starting point to each stop            */
const ROUTES = [
  {
    id: 'r1',
    name: 'Nemmara – Kollengode',
    operator: 'KSRTC',
    color: '#0e7c66',
    services: [
      {
        direction: 'Nemmara → Kollengode',
        stops:   ['nemmara', 'vithanassery', 'ayilur', 'kollengode'],
        offsets: [0, 14, 32, 55],
        departures: {
          weekday: ['06:15', '07:45', '09:30', '11:30', '13:45', '15:30', '17:15', '18:45'],
          sunday:  ['07:30', '10:00', '12:30', '15:00', '17:30']
        }
      },
      {
        direction: 'Kollengode → Nemmara',
        stops:   ['kollengode', 'ayilur', 'vithanassery', 'nemmara'],
        offsets: [0, 22, 40, 55],
        departures: {
          weekday: ['06:00', '07:30', '09:15', '11:15', '13:30', '15:15', '17:00', '18:30'],
          sunday:  ['07:15', '09:45', '12:15', '14:45', '17:15']
        }
      }
    ]
  },
  {
    id: 'r2',
    name: 'Nemmara – Nelliampathy',
    operator: 'KSRTC',
    color: '#b4530a',
    services: [
      {
        direction: 'Nemmara → Nelliampathy',
        stops:   ['nemmara', 'pothundy', 'kaiparamba', 'nelliampathy'],
        offsets: [0, 25, 55, 95],
        departures: {
          weekday: ['06:00', '09:00', '13:00', '16:00'],
          sunday:  ['07:00', '10:00', '14:00']
        }
      },
      {
        direction: 'Nelliampathy → Nemmara',
        stops:   ['nelliampathy', 'kaiparamba', 'pothundy', 'nemmara'],
        offsets: [0, 40, 70, 95],
        departures: {
          weekday: ['07:45', '11:00', '15:00', '17:45'],
          sunday:  ['08:45', '12:00', '15:45']
        }
      }
    ]
  },
  {
    id: 'r3',
    name: 'Nemmara – Muthalamada',
    operator: 'Private',
    color: '#1c5fd0',
    services: [
      {
        direction: 'Nemmara → Muthalamada',
        stops:   ['nemmara', 'elavanchery', 'muthalamada'],
        offsets: [0, 20, 42],
        departures: {
          weekday: ['06:45', '08:45', '10:45', '13:15', '15:45', '17:45'],
          sunday:  ['08:00', '11:30', '15:00', '17:30']
        }
      },
      {
        direction: 'Muthalamada → Nemmara',
        stops:   ['muthalamada', 'elavanchery', 'nemmara'],
        offsets: [0, 22, 42],
        departures: {
          weekday: ['06:30', '08:30', '10:30', '13:00', '15:30', '17:30'],
          sunday:  ['07:45', '11:15', '14:45', '17:15']
        }
      }
    ]
  },
  {
    id: 'r4',
    name: 'Kollengode – Nelliampathy',
    operator: 'KSRTC',
    color: '#8b2fa8',
    services: [
      {
        direction: 'Kollengode → Nelliampathy',
        stops:   ['kollengode', 'muthalamada', 'kaiparamba', 'nelliampathy'],
        offsets: [0, 30, 70, 110],
        departures: {
          weekday: ['07:00', '11:00', '15:30'],
          sunday:  ['08:00', '12:30', '16:00']
        }
      },
      {
        direction: 'Nelliampathy → Kollengode',
        stops:   ['nelliampathy', 'kaiparamba', 'muthalamada', 'kollengode'],
        offsets: [0, 40, 80, 110],
        departures: {
          weekday: ['09:00', '13:00', '17:00'],
          sunday:  ['10:00', '14:00', '17:45']
        }
      }
    ]
  },
  {
    id: 'r5',
    name: 'Kizhakkummuri – Nemmara (local)',
    operator: 'Private',
    color: '#c2185b',
    services: [
      {
        direction: 'Kizhakkummuri → Nemmara',
        stops:   ['kizhakkummuri', 'nemmara'],
        offsets: [0, 12],
        departures: {
          weekday: ['06:20', '07:20', '08:20', '09:20', '10:20', '11:20', '12:20',
                    '13:20', '14:20', '15:20', '16:20', '17:20', '18:20'],
          sunday:  ['07:20', '09:20', '11:20', '13:20', '15:20', '17:20']
        }
      },
      {
        direction: 'Nemmara → Kizhakkummuri',
        stops:   ['nemmara', 'kizhakkummuri'],
        offsets: [0, 12],
        departures: {
          weekday: ['06:45', '07:45', '08:45', '09:45', '10:45', '11:45', '12:45',
                    '13:45', '14:45', '15:45', '16:45', '17:45', '18:45'],
          sunday:  ['07:45', '09:45', '11:45', '13:45', '15:45', '17:45']
        }
      }
    ]
  }
];

/* ----------------------------------------------------- derived schedule --- */
function addMinutes(hhmm, mins) {
  const parts = hhmm.split(':');
  let total = Number(parts[0]) * 60 + Number(parts[1]) + mins;
  total = ((total % 1440) + 1440) % 1440;
  const h = String(Math.floor(total / 60)).padStart(2, '0');
  const m = String(total % 60).padStart(2, '0');
  return h + ':' + m;
}

/* One flat row per (stop, route, day, departure) so lookups stay trivial. */
const SCHEDULE = (function build() {
  const rows = [];
  ROUTES.forEach(function (route) {
    route.services.forEach(function (svc) {
      Object.keys(svc.departures).forEach(function (dayType) {
        svc.departures[dayType].forEach(function (originTime) {
          svc.stops.forEach(function (stopId, i) {
            rows.push({
              stopId: stopId,
              routeId: route.id,
              routeName: route.name,
              operator: route.operator,
              color: route.color,
              direction: svc.direction,
              dayType: dayType,
              time: addMinutes(originTime, svc.offsets[i])
            });
          });
        });
      });
    });
  });
  return rows;
})();
