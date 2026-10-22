/* ===== Rural Bus Timings — app logic =====================================
   Reads STOPS / ROUTES / SCHEDULE from data.js (plain globals, so the page
   also works when opened directly from disk).
   ======================================================================== */
(function () {
  'use strict';

  var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var STORAGE_KEY = 'rural-bus-timings.stop';

  var state = {
    query: '',
    routeId: 'all',
    sortByTime: true,
    dayMode: 'auto',          // auto | weekday | sunday
    selectedStopId: null
  };

  var routeById = {};
  ROUTES.forEach(function (r) { routeById[r.id] = r; });

  /* The timetable is the seed from data.js plus whatever passengers have
     reported. `submittedRows` are reports good enough to show in the
     timetable; `pendingRows` are still awaiting a check and are listed
     separately so nobody mistakes them for an official time. */
  var submittedRows = [];
  var pendingRows = [];

  function allRows() { return SCHEDULE.concat(submittedRows); }

  var routesByStop = {};
  function rebuildRoutesIndex() {
    routesByStop = {};
    allRows().forEach(function (e) {
      if (!routesByStop[e.stopId]) routesByStop[e.stopId] = [];
      if (routesByStop[e.stopId].indexOf(e.routeId) === -1) routesByStop[e.stopId].push(e.routeId);
    });
  }
  rebuildRoutesIndex();

  /* Turn a stored report into a timetable row. */
  function toRow(rec) {
    var route = routeById[rec.routeId];
    var known = STOPS.some(function (s) { return s.id === rec.stopId; });
    if (!route || !known) return null;
    return {
      id: rec.id,
      stopId: rec.stopId,
      routeId: rec.routeId,
      routeName: route.name,
      operator: 'Passenger report',
      color: route.color,
      direction: rec.direction || route.name,
      dayType: rec.dayType === 'sunday' ? 'sunday' : 'weekday',
      time: rec.time,
      reported: true,
      reporter: rec.submittedBy || '',
      note: rec.note || ''
    };
  }

  function badTime(t) { return !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(t || ''); }

  function loadReports() {
    return Store.list().then(function (rows) {
      var live = [], waiting = [];
      rows.forEach(function (rec) {
        if (badTime(rec.time)) return;                 /* ignore junk */
        var row = toRow(rec);
        if (!row) return;
        if (rec.status === 'pending') waiting.push(row); else live.push(row);
      });
      submittedRows = live;
      pendingRows = waiting;
      rebuildRoutesIndex();
      renderAll();
    }).catch(function (err) {
      console.warn('Passenger reports could not be loaded:', err);
    });
  }

  var els = {
    areaName:  document.getElementById('areaName'),
    areaSub:   document.getElementById('areaSub'),
    areaHint:  document.getElementById('areaHint'),
    clockTime: document.getElementById('clockTime'),
    clockDay:  document.getElementById('clockDay'),
    search:    document.getElementById('search'),
    clearSearch: document.getElementById('clearSearch'),
    routeChips: document.getElementById('routeChips'),
    sortByTime: document.getElementById('sortByTime'),
    soonList:  document.getElementById('soonList'),
    stopList:  document.getElementById('stopList'),
    stopCount: document.getElementById('stopCount'),
    detail:    document.getElementById('detail')
  };

  /* ------------------------------------------------------------ helpers -- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toMinutes(t) { var p = t.split(':'); return Number(p[0]) * 60 + Number(p[1]); }
  function byTime(a, b) { return toMinutes(a.time) - toMinutes(b.time); }

  function to12h(t) {
    var p = t.split(':');
    var h = Number(p[0]);
    var ap = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12; if (h12 === 0) h12 = 12;
    return h12 + ':' + p[1] + ' ' + ap;
  }

  function humanMins(m) {
    if (m < 1) return 'now';
    if (m < 60) return 'in ' + m + ' min';
    var h = Math.floor(m / 60), r = m % 60;
    return 'in ' + h + ' hr' + (r ? ' ' + r + ' min' : '');
  }

  function dayTypeForDate(d) { return d.getDay() === 0 ? 'sunday' : 'weekday'; }
  function activeDayType() {
    return state.dayMode === 'auto' ? dayTypeForDate(new Date()) : state.dayMode;
  }
  function dayLabel(dt) { return dt === 'sunday' ? 'Sunday' : 'Monday–Saturday'; }

  function matchesRoute(e) {
    return state.routeId === 'all' || e.routeId === state.routeId;
  }

  function routesFor(stopId) { return routesByStop[stopId] || []; }

  /* ------------------------------------------------- departure lookups --- */
  function nextDeparture(stopId) {
    var now = new Date();
    var cur = now.getHours() * 60 + now.getMinutes();
    var dt = activeDayType();

    var today = allRows().filter(function (e) {
      return e.stopId === stopId && e.dayType === dt && matchesRoute(e);
    }).sort(byTime);

    for (var i = 0; i < today.length; i++) {
      var m = toMinutes(today[i].time);
      if (m >= cur) {
        var d = new Date(now);
        d.setHours(Math.floor(m / 60), m % 60, 0, 0);
        return { entry: today[i], epoch: d.getTime(), inMin: m - cur, tomorrow: false };
      }
    }

    /* nothing left today — fall back to the first bus tomorrow */
    var t = new Date(now);
    t.setDate(t.getDate() + 1);
    var dtm = dayTypeForDate(t);
    var first = allRows().filter(function (e) {
      return e.stopId === stopId && e.dayType === dtm && matchesRoute(e);
    }).sort(byTime)[0];

    if (!first) return null;

    var nm = toMinutes(first.time);
    var d2 = new Date(t);
    d2.setHours(Math.floor(nm / 60), nm % 60, 0, 0);
    return {
      entry: first,
      epoch: d2.getTime(),
      inMin: Math.round((d2.getTime() - now.getTime()) / 60000),
      tomorrow: true,
      tomorrowIsSunday: dtm === 'sunday'
    };
  }

  function upcomingFor(stopId, limit) {
    var now = new Date();
    var cur = now.getHours() * 60 + now.getMinutes();
    var dt = activeDayType();
    return allRows().filter(function (e) {
      return e.stopId === stopId && e.dayType === dt && matchesRoute(e) &&
             toMinutes(e.time) >= cur;
    }).sort(byTime).slice(0, limit);
  }

  function groupBy(rows) {
    var groups = [], index = {};
    rows.forEach(function (e) {
      var key = e.routeId + '|' + e.direction;
      if (!index[key]) {
        index[key] = {
          routeName: e.routeName, operator: e.operator,
          color: e.color, direction: e.direction, times: []
        };
        groups.push(index[key]);
      }
      index[key].times.push({ time: e.time, reported: !!e.reported, reporter: e.reporter || '' });
    });
    return groups;
  }

  function rowsAt(stopId, dayType) {
    return allRows().filter(function (e) {
      return e.stopId === stopId && e.dayType === dayType && matchesRoute(e);
    }).sort(byTime);
  }

  function groupRows(stopId) { return groupBy(rowsAt(stopId, activeDayType())); }

  /* reports still waiting for a check — shown apart from the real timetable */
  function pendingGroups(stopId) {
    return groupBy(pendingRows.filter(function (e) {
      return e.stopId === stopId && e.dayType === activeDayType() && matchesRoute(e);
    }).sort(byTime));
  }

  function countdownClass(nd) {
    if (nd.tomorrow) return 'is-tom';
    if (nd.inMin <= 0) return 'is-now';
    if (nd.inMin <= 5) return 'is-soon';
    return '';
  }
  function countdownText(nd) {
    if (nd.tomorrow) return 'tomorrow';
    return humanMins(nd.inMin);
  }

  /* ------------------------------------------------------------- render -- */
  function renderSoon() {
    var items = STOPS.map(function (s) {
      return { stop: s, nd: nextDeparture(s.id) };
    }).filter(function (x) {
      return x.nd && !x.nd.tomorrow;
    }).sort(function (a, b) {
      return a.nd.epoch - b.nd.epoch;
    }).slice(0, 8);

    if (!items.length) {
      els.soonList.innerHTML =
        '<li class="empty" style="grid-column:1/-1"><span class="empty__icon">🌙</span>' +
        'No more buses from any stop today. First services start again in the morning.</li>';
      return;
    }

    els.soonList.innerHTML = items.map(function (x) {
      return '<li>' +
        '<button type="button" class="soon__item" data-stop="' + esc(x.stop.id) + '">' +
          '<span class="soon__in ' + countdownClass(x.nd) + '" data-epoch="' + x.nd.epoch + '">' +
            esc(countdownText(x.nd)) + '</span>' +
          '<span class="soon__body">' +
            '<span class="soon__stop">' + esc(x.stop.name) + '</span>' +
            '<span class="soon__meta">' + esc(to12h(x.nd.entry.time)) + ' · ' +
              esc(x.nd.entry.direction) + '</span>' +
          '</span>' +
        '</button></li>';
    }).join('');
  }

  function renderStops() {
    var q = state.query.trim().toLowerCase();

    var list = STOPS.filter(function (s) {
      var hitQuery = !q ||
        (s.name + ' ' + s.landmark).toLowerCase().indexOf(q) !== -1 ||
        routesFor(s.id).map(function (id) { return routeById[id] ? routeById[id].name : ''; })
          .join(' ').toLowerCase().indexOf(q) !== -1;
      var hitRoute = state.routeId === 'all' || routesFor(s.id).indexOf(state.routeId) !== -1;
      return hitQuery && hitRoute;
    }).map(function (s) {
      return { stop: s, nd: nextDeparture(s.id) };
    });

    list.sort(state.sortByTime
      ? function (a, b) {
          return (a.nd ? a.nd.epoch : Infinity) - (b.nd ? b.nd.epoch : Infinity);
        }
      : function (a, b) { return a.stop.name.localeCompare(b.stop.name); });

    els.stopCount.textContent = list.length + ' of ' + STOPS.length;

    if (!list.length) {
      els.stopList.innerHTML =
        '<div class="empty"><span class="empty__icon">🔍</span>' +
        'No bus stop matches your search.</div>';
      return;
    }

    els.stopList.innerHTML = list.map(function (x) {
      var dots = routesFor(x.stop.id).map(function (id) {
        var r = routeById[id];
        return '<span class="stop__routedot" style="background:' + esc(r.color) + '" title="' + esc(r.name) + '"></span>';
      }).join('');

      var right = x.nd
        ? '<span class="stop__time">' + esc(to12h(x.nd.entry.time)) + '</span>' +
          '<span class="stop__in ' + countdownClass(x.nd) + '" data-epoch="' + x.nd.epoch + '">' +
            esc(countdownText(x.nd)) + '</span>'
        : '<span class="stop__in is-tom">no service</span>';

      return '<button type="button" class="stop' +
          (state.selectedStopId === x.stop.id ? ' is-active' : '') +
          '" data-stop="' + esc(x.stop.id) + '">' +
        '<span class="stop__main">' +
          '<span class="stop__name">' + esc(x.stop.name) + '</span>' +
          '<span class="stop__land">' + esc(x.stop.landmark) + '</span>' +
          '<span class="stop__routes">' + dots + '</span>' +
        '</span>' +
        '<span class="stop__next">' + right + '</span>' +
      '</button>';
    }).join('');
  }

  function renderDetail() {
    var stop = STOPS.filter(function (s) { return s.id === state.selectedStopId; })[0];

    if (!stop) {
      els.detail.innerHTML =
        '<div class="empty"><span class="empty__icon">👇</span>' +
        'Pick a bus stop to see the next bus and the full timetable.</div>';
      return;
    }

    var nd = nextDeparture(stop.id);
    var upcoming = upcomingFor(stop.id, 5);
    var groups = groupRows(stop.id);
    var dt = activeDayType();
    var cur = new Date().getHours() * 60 + new Date().getMinutes();

    var html = '<div class="detail__head">' +
      '<h3>' + esc(stop.name) + '</h3>' +
      '<p>' + esc(stop.landmark) + ' · ' + esc(AREA.district) +
        ' · ' + esc(dayLabel(dt)) + ' timetable</p>' +
    '</div>';

    /* big next-bus card */
    if (nd) {
      html += '<div class="bignext">' +
        '<div class="bignext__label">' + (nd.tomorrow ? 'Next bus — tomorrow' : 'Next bus') + '</div>' +
        '<div class="bignext__row">' +
          '<span class="bignext__time">' + esc(to12h(nd.entry.time)) + '</span>' +
          (nd.tomorrow
            ? '<span class="bignext__count">' +
                esc(nd.tomorrowIsSunday ? 'Sunday service' : 'Mon–Sat service') + '</span>'
            : '<span class="bignext__count" data-epoch="' + nd.epoch + '">' +
                esc(countdownText(nd)) + '</span>') +
        '</div>' +
        '<div class="bignext__meta">' + esc(nd.entry.direction) + ' · ' +
          esc(nd.entry.operator) + ' · Route ' + esc(nd.entry.routeName) +
          (nd.entry.reported
            ? '<br><span class="repflag">✎ Passenger report' +
              (nd.entry.reporter ? ' — ' + esc(nd.entry.reporter) : '') +
              ' · not yet verified</span>'
            : '') +
        '</div>' +
      '</div>';
    } else {
      html += '<div class="bignext"><div class="bignext__label">Next bus</div>' +
              '<div class="bignext__row"><span class="bignext__time">—</span></div>' +
              '<div class="bignext__meta">No service on this day for the selected route.</div></div>';
    }

    /* later today */
    html += '<div><div class="listhead">Later today</div>';
    if (upcoming.length) {
      html += '<ul class="upcoming">' + upcoming.map(function (e) {
        var mins = toMinutes(e.time) - cur;
        return '<li>' +
          '<span class="upcoming__time">' + esc(to12h(e.time)) + '</span>' +
          '<span class="upcoming__dir">' + esc(e.direction) + '</span>' +
          '<span class="upcoming__in">' + esc(humanMins(mins)) + '</span>' +
        '</li>';
      }).join('') + '</ul>';
    } else {
      html += '<p class="muted" style="margin:0">No more buses from this stop today. ' +
              'First bus tomorrow is shown above.</p>';
    }
    html += '</div>';

    /* full timetable */
    html += '<div><div class="listhead">Full timetable · ' + esc(dayLabel(dt)) + '</div>';
    if (!groups.length) {
      html += '<p class="muted" style="margin:0">No buses on this route at this stop.</p>';
    } else {
      html += groups.map(function (g) {
        return '<div class="ttgroup">' +
          '<div class="ttgroup__head">' +
            '<span class="ttgroup__dot" style="background:' + esc(g.color) + '"></span>' +
            '<span>' + esc(g.direction) + '</span>' +
            '<span class="ttgroup__op">' + esc(g.operator) + '</span>' +
          '</div>' +
          '<div class="times">' + g.times.map(function (t) {
            var mins = toMinutes(t.time);
            var isNext = nd && !nd.tomorrow &&
                         nd.entry.time === t.time && nd.entry.direction === g.direction;
            var cls = isNext ? ' is-next' : (mins < cur ? ' is-past' : '');
            if (t.reported) cls += ' is-reported';
            return '<span class="times__t' + cls + '"' +
              (t.reported
                ? ' title="Reported by a passenger' +
                  (t.reporter ? ': ' + esc(t.reporter) : '') + ' — not an official timing"'
                : '') +
              '>' + esc(t.time) +
              (t.reported ? '<span class="times__flag" aria-hidden="true">✎</span>' : '') +
            '</span>';
          }).join('') + '</div>' +
        '</div>';
      }).join('');

      if (groups.some(function (g) {
        return g.times.some(function (t) { return t.reported; });
      })) {
        html += '<p class="legend">✎ reported by a passenger — not checked against an ' +
                'official timetable. Treat with care.</p>';
      }
    }
    html += '</div>';

    /* reports still awaiting a check — deliberately kept out of the timetable */
    var waiting = pendingGroups(stop.id);
    if (waiting.length) {
      var waitCount = waiting.reduce(function (n, g) { return n + g.times.length; }, 0);
      html += '<div class="awaiting">' +
        '<div class="listhead">Awaiting review <span class="muted">' + waitCount + '</span></div>' +
        '<p class="awaiting__warn">Reported by passengers but not yet checked. ' +
          'These are <strong>not</strong> included in the timetable above.</p>' +
        waiting.map(function (g) {
          return '<div class="ttgroup">' +
            '<div class="ttgroup__head">' +
              '<span class="ttgroup__dot" style="background:' + esc(g.color) + '"></span>' +
              '<span>' + esc(g.direction) + '</span>' +
            '</div>' +
            '<div class="times">' + g.times.map(function (t) {
              return '<span class="times__t is-pending"' +
                (t.reporter ? ' title="Reported by ' + esc(t.reporter) + '"' : '') +
              '>' + esc(t.time) + '</span>';
            }).join('') + '</div>' +
          '</div>';
        }).join('') +
      '</div>';
    }

    els.detail.innerHTML = html;
  }

  function renderAll() {
    renderSoon();
    renderStops();
    renderDetail();
  }

  /* -------------------------------------------------------------- chips -- */
  function buildChips() {
    var all = '<button type="button" class="chip is-active" data-route="all">All routes</button>';
    var rest = ROUTES.map(function (r) {
      return '<button type="button" class="chip" data-route="' + esc(r.id) + '">' +
        '<span class="chip__dot" style="background:' + esc(r.color) + '"></span>' +
        esc(r.name) + '</button>';
    }).join('');
    els.routeChips.innerHTML = all + rest;

    els.routeChips.addEventListener('click', function (ev) {
      var btn = ev.target.closest('.chip');
      if (!btn) return;
      state.routeId = btn.getAttribute('data-route');
      els.routeChips.querySelectorAll('.chip').forEach(function (c) {
        c.classList.toggle('is-active', c === btn);
      });
      renderAll();
    });
  }

  function syncDayButtons() {
    document.querySelectorAll('.daypick__btn').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-day') === state.dayMode);
    });
  }

  /* -------------------------------------------------------------- clock -- */
  function updateClock() {
    var d = new Date();
    els.clockTime.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
    els.clockDay.textContent = DAY_NAMES[d.getDay()] + ' · ' +
      (dayTypeForDate(d) === 'sunday' ? 'Sunday service' : 'Mon–Sat service');
  }

  function tick() {
    updateClock();

    var now = Date.now();
    var stale = false;

    document.querySelectorAll('[data-epoch]').forEach(function (el) {
      if (el.classList.contains('is-tom')) return;   /* stays "tomorrow" */
      var epoch = Number(el.getAttribute('data-epoch'));
      if (epoch <= now) { stale = true; return; }
      var text = humanMins(Math.round((epoch - now) / 60000));
      if (el.textContent !== text) el.textContent = text;
    });

    /* the next bus just left — move everything forward */
    if (stale) renderAll();
  }

  /* ------------------------------------------------------------- events -- */
  function bind() {
    els.search.addEventListener('input', function () {
      state.query = els.search.value;
      els.clearSearch.hidden = !state.query;
      renderStops();
    });

    els.clearSearch.addEventListener('click', function () {
      els.search.value = '';
      state.query = '';
      els.clearSearch.hidden = true;
      els.search.focus();
      renderStops();
    });

    els.sortByTime.addEventListener('change', function () {
      state.sortByTime = els.sortByTime.checked;
      renderStops();
    });

    document.querySelector('.daypick').addEventListener('click', function (ev) {
      var btn = ev.target.closest('.daypick__btn');
      if (!btn) return;
      state.dayMode = btn.getAttribute('data-day');
      syncDayButtons();
      renderAll();
    });

    function selectStop(id) {
      state.selectedStopId = id;
      try { localStorage.setItem(STORAGE_KEY, id); } catch (e) { /* private mode */ }
      renderStops();
      renderDetail();
    }

    function onStopClick(ev) {
      var btn = ev.target.closest('[data-stop]');
      if (!btn) return;
      selectStop(btn.getAttribute('data-stop'));
    }

    els.stopList.addEventListener('click', onStopClick);
    els.soonList.addEventListener('click', onStopClick);

    /* keep the countdown honest when the tab wakes up again */
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) renderAll();
    });
  }

  /* --------------------------------------------------------------- boot -- */
  /* The only surface submit.js is allowed to touch, so it does not have to
     reach inside this closure. */
  window.RuralBus = {
    getSelectedStop:  function () { return state.selectedStopId; },
    getSelectedRoute: function () { return state.routeId; },
    getDayType:       function () { return activeDayType(); }
  };

  document.addEventListener('rbt:reports-changed', function () { loadReports(); });

  function init() {
    els.areaName.textContent = AREA.name;
    els.areaSub.textContent = AREA.district;
    els.areaHint.textContent = AREA.hint + ' — replace the timetable in data.js with your local one.';

    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    if (saved && STOPS.some(function (s) { return s.id === saved; })) {
      state.selectedStopId = saved;
    } else {
      /* open on the stop where the next bus leaves soonest */
      var first = STOPS.map(function (s) { return { id: s.id, nd: nextDeparture(s.id) }; })
        .filter(function (x) { return x.nd; })
        .sort(function (a, b) { return a.nd.epoch - b.nd.epoch; })[0];
      state.selectedStopId = first ? first.id : (STOPS[0] && STOPS[0].id);
    }

    buildChips();
    syncDayButtons();
    bind();
    updateClock();
    renderAll();

    /* Show the seed timetable straight away, then fold in passenger reports
       when they arrive. The page must be usable even if that request fails. */
    loadReports();

    setInterval(tick, 1000);
  }

  init();
})();
