/* ===== "Report a timing" sheet ===========================================
   Mobile-first: a floating button opens a bottom sheet with native time
   pickers and big tap targets.

   Note on storage: with no database configured (see config.js) a report is
   saved to this device only. The sheet says so plainly rather than implying
   it has been shared with anyone.
   ====================================================================== */
(function () {
  'use strict';

  var els = {
    fab:      document.getElementById('fabAdd'),
    sheet:    document.getElementById('sheet'),
    form:     document.getElementById('reportForm'),
    route:    document.getElementById('fRoute'),
    stop:     document.getElementById('fStop'),
    dir:      document.getElementById('fDir'),
    time:     document.getElementById('fTime'),
    name:     document.getElementById('fName'),
    note:     document.getElementById('fNote'),
    msg:      document.getElementById('fMsg'),
    submit:   document.getElementById('fSubmit'),
    myList:   document.getElementById('myReports'),
    copyBtn:  document.getElementById('copyReports'),
    storeNote: document.getElementById('storeNote')
  };
  if (!els.sheet) return;

  var dayChoice = 'weekday';
  var lastFocus = null;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function routeById(id) {
    return ROUTES.filter(function (r) { return r.id === id; })[0];
  }

  /* ------------------------------------------------------------ controls -- */
  function fillRoutes() {
    els.route.innerHTML = ROUTES.map(function (r) {
      return '<option value="' + esc(r.id) + '">' + esc(r.name) + '</option>';
    }).join('');
  }

  /* stops that actually appear on this route, in travel order */
  function stopsOnRoute(routeId) {
    var seen = [], out = [];
    ROUTES.filter(function (r) { return r.id === routeId; })[0].services.forEach(function (svc) {
      svc.stops.forEach(function (id) {
        if (seen.indexOf(id) === -1) { seen.push(id); out.push(id); }
      });
    });
    return out.map(function (id) {
      return STOPS.filter(function (s) { return s.id === id; })[0];
    }).filter(Boolean);
  }

  function fillStops(routeId, preselect) {
    var stops = stopsOnRoute(routeId);
    els.stop.innerHTML = stops.map(function (s) {
      return '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>';
    }).join('');
    if (preselect && stops.some(function (s) { return s.id === preselect; })) {
      els.stop.value = preselect;
    }
  }

  function fillDirections(routeId) {
    var r = routeById(routeId);
    els.dir.innerHTML = r.services.map(function (svc) {
      return '<option value="' + esc(svc.direction) + '">' + esc(svc.direction) + '</option>';
    }).join('');
  }

  function syncDayButtons() {
    els.form.querySelectorAll('.daytap').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-day') === dayChoice);
    });
  }

  function setMsg(text, kind) {
    els.msg.textContent = text || '';
    els.msg.className = 'formmsg' + (kind ? ' formmsg--' + kind : '');
    els.msg.hidden = !text;
  }

  /* --------------------------------------------------------------- open --- */
  function open() {
    lastFocus = document.activeElement;

    var preStop = (window.RuralBus && window.RuralBus.getSelectedStop()) || (STOPS[0] && STOPS[0].id);
    var preRoute = null;
    if (window.RuralBus && window.RuralBus.getSelectedRoute() !== 'all') {
      preRoute = window.RuralBus.getSelectedRoute();
    }
    /* a stop can belong to several routes — pick the filtered one, else the first */
    if (!preRoute && preStop) {
      var owner = ROUTES.filter(function (r) {
        return r.services.some(function (svc) { return svc.stops.indexOf(preStop) !== -1; });
      })[0];
      preRoute = owner ? owner.id : ROUTES[0].id;
    }

    els.route.value = preRoute || ROUTES[0].id;
    fillDirections(els.route.value);
    fillStops(els.route.value, preStop);

    els.time.value = '';
    els.note.value = '';
    setMsg('');
    dayChoice = (window.RuralBus && window.RuralBus.getDayType() === 'sunday') ? 'sunday' : 'weekday';
    syncDayButtons();
    renderMyReports();

    els.sheet.hidden = false;
    document.body.classList.add('is-locked');
    setTimeout(function () { els.time.focus(); }, 60);
  }

  function close() {
    els.sheet.hidden = true;
    document.body.classList.remove('is-locked');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ------------------------------------------------- "your reports" list -- */
  function renderMyReports() {
    var mine = [];
    try { mine = JSON.parse(Store.dumpLocal()); } catch (err) { mine = []; }

    if (Store.isCloud() || !mine.length) {
      els.myList.innerHTML = '';
      els.copyBtn.hidden = true;
      return;
    }

    var rows = mine.slice().reverse().map(function (e) {
      var stop = STOPS.filter(function (s) { return s.id === e.stopId; })[0];
      var r = routeById(e.routeId);
      return '<li class="mine">' +
        '<span class="mine__t">' + esc(e.time) + '</span>' +
        '<span class="mine__body">' + esc(stop ? stop.name : e.stopId) +
          '<span class="mine__sub">' + esc(r ? r.name : e.routeId) + ' · ' +
          (e.dayType === 'sunday' ? 'Sunday' : 'Mon–Sat') + '</span></span>' +
        '<button type="button" class="mine__del" data-del="' + esc(e.id) + '" aria-label="Delete report">×</button>' +
      '</li>';
    }).join('');

    els.myList.innerHTML = '<div class="listhead">Saved on this device</div>' +
      '<ul class="minelist">' + rows + '</ul>';
    els.copyBtn.hidden = false;
  }

  /* -------------------------------------------------------------- submit -- */
  function submit(ev) {
    ev.preventDefault();
    setMsg('');

    var time = els.time.value;
    if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
      setMsg('Pick the time the bus leaves this stop.', 'error');
      els.time.focus();
      return;
    }

    els.submit.disabled = true;
    els.submit.textContent = 'Sending…';

    Store.add({
      stopId: els.stop.value,
      routeId: els.route.value,
      direction: els.dir.value,
      time: time,
      dayType: dayChoice,
      submittedBy: els.name.value.trim(),
      note: els.note.value.trim()
    }).then(function () {
      els.submit.disabled = false;
      els.submit.textContent = 'Send report';
      setMsg(Store.isCloud()
        ? 'Thanks — sent for review. It appears in the timetable once approved.'
        : 'Saved on this device.', 'ok');
      els.time.value = '';
      els.note.value = '';
      renderMyReports();
      document.dispatchEvent(new CustomEvent('rbt:reports-changed'));
    }).catch(function (err) {
      els.submit.disabled = false;
      els.submit.textContent = 'Send report';
      setMsg(err.message || 'Could not send that. Try again.', 'error');
    });
  }

  /* --------------------------------------------------------------- bind --- */
  els.fab.addEventListener('click', open);
  els.sheet.addEventListener('click', function (ev) {
    if (ev.target.closest('[data-close]')) close();
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && !els.sheet.hidden) close();
  });

  els.route.addEventListener('change', function () {
    fillDirections(els.route.value);
    fillStops(els.route.value, null);
  });

  els.form.addEventListener('click', function (ev) {
    var btn = ev.target.closest('.daytap');
    if (!btn) return;
    dayChoice = btn.getAttribute('data-day');
    syncDayButtons();
  });

  els.form.addEventListener('submit', submit);

  els.myList.addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-del]');
    if (!btn) return;
    Store.remove(btn.getAttribute('data-del')).then(function () {
      renderMyReports();
      document.dispatchEvent(new CustomEvent('rbt:reports-changed'));
    });
  });

  els.copyBtn.addEventListener('click', function () {
    var text = Store.dumpLocal();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        setMsg('Copied. Send this to whoever maintains the timetable.', 'ok');
      }, function () {
        setMsg('Copy failed — your browser blocked the clipboard.', 'error');
      });
    } else {
      setMsg('Copying is not supported in this browser.', 'error');
    }
  });

  /* --------------------------------------------------------------- init --- */
  fillRoutes();
  fillDirections(ROUTES[0].id);
  fillStops(ROUTES[0].id, null);
  syncDayButtons();

  els.storeNote.textContent = Store.isCloud()
    ? 'Reports go to the shared timetable and are shown to everyone once approved.'
    : 'No shared database is configured, so reports are saved on this device only. '
      + 'To share them with everyone, add a Supabase URL and key in config.js.';
})();
