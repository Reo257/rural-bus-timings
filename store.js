/* ===== Storage layer =====================================================
   Two backends behind one interface:

     local  (default) — browser localStorage. Works with zero setup and
                        offline, but reports stay on one device.
     cloud            — Supabase REST. Reports are shared, and land with
                        status 'pending' until they are approved.

   Pick a backend by filling in config.js.
   ====================================================================== */
var Store = (function () {
  'use strict';

  var LS_KEY = 'rbt.reports.v1';
  var cfg = (typeof CONFIG !== 'undefined' && CONFIG) ? CONFIG : {};
  var cloud = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  var base = cloud ? cfg.supabaseUrl.replace(/\/+$/, '') + '/rest/v1/' + (cfg.table || 'bus_timings') : '';
  var headers = cloud ? {
    'apikey': cfg.supabaseAnonKey,
    'Authorization': 'Bearer ' + cfg.supabaseAnonKey,
    'Content-Type': 'application/json'
  } : {};

  var COLS = 'id,stop_id,route_id,direction,time,day_type,submitted_by,note,status,created_at';

  function fromDb(r) {
    return {
      id: r.id, stopId: r.stop_id, routeId: r.route_id, direction: r.direction,
      time: r.time, dayType: r.day_type, submittedBy: r.submitted_by,
      note: r.note, status: r.status, createdAt: r.created_at
    };
  }

  /* status is deliberately not sent — the database decides it, so a user
     cannot mark their own report as approved. */
  function toDb(e) {
    return {
      stop_id: e.stopId, route_id: e.routeId, direction: e.direction,
      time: e.time, day_type: e.dayType,
      submitted_by: e.submittedBy || null, note: e.note || null
    };
  }

  function localAll() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch (err) { return []; }
  }
  function localWrite(list) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(list)); return true; }
    catch (err) { return false; }
  }

  function uid() {
    return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ------------------------------------------------------------- list --- */
  function list() {
    if (!cloud) {
      return Promise.resolve(localAll().map(function (e) {
        e.status = 'local';                       /* no reviewer exists locally */
        return e;
      }));
    }
    return fetch(base + '?select=' + COLS + '&order=created_at.desc', { headers: headers })
      .then(function (res) {
        if (!res.ok) throw new Error('load failed (' + res.status + ')');
        return res.json();
      })
      .then(function (rows) { return rows.map(fromDb); });
  }

  /* -------------------------------------------------------------- add --- */
  function add(entry) {
    if (!cloud) {
      var list0 = localAll();
      var rec = {
        id: uid(), stopId: entry.stopId, routeId: entry.routeId,
        direction: entry.direction, time: entry.time, dayType: entry.dayType,
        submittedBy: entry.submittedBy || '', note: entry.note || '',
        status: 'local', createdAt: new Date().toISOString()
      };
      var dup = list0.some(function (e) {
        return e.stopId === entry.stopId && e.routeId === entry.routeId &&
               e.dayType === entry.dayType && e.time === entry.time;
      });
      if (dup) return Promise.reject(new Error('That timing has already been reported.'));
      list0.push(rec);
      if (!localWrite(list0)) throw new Error('Your browser blocked local storage.');
      return Promise.resolve(rec);
    }
    return fetch(base, {
      method: 'POST',
      headers: Object.assign({ 'Prefer': 'return=representation' }, headers),
      body: JSON.stringify(toDb(entry))
    }).then(function (res) {
      if (res.status === 409) throw new Error('That timing has already been reported.');
      if (!res.ok) return res.text().then(function (t) { throw new Error('Could not submit (' + res.status + '). ' + t); });
      return res.json().then(function (rows) { return fromDb(rows[0]); });
    });
  }

  /* ----------------------------------------------------------- remove --- */
  /* Only the local backend can delete: in cloud mode there is no login, so
     there is no safe way to prove a report belongs to this user. */
  function remove(id) {
    if (cloud) return Promise.reject(new Error('Reports cannot be deleted once submitted.'));
    localWrite(localAll().filter(function (e) { return e.id !== id; }));
    return Promise.resolve(true);
  }

  function allLocalText() {
    return JSON.stringify(localAll(), null, 2);
  }

  return {
    list: list,
    add: add,
    remove: remove,
    isCloud: function () { return cloud; },
    dumpLocal: allLocalText
  };
})();
