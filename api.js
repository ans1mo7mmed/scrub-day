// طبقة الاتصال بالسيرفر (Supabase) + نسخة تجريبية محلية بنفس الواجهة بالضبط
(function () {
  const cfg = window.APP_CONFIG || {};
  const LIVE = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);

  class NetError extends Error {}

  async function remote(fn, args) {
    let res;
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 12000);
    try {
      res = await fetch(cfg.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/rpc/" + fn, {
        method: "POST", signal: ctl.signal,
        headers: { apikey: cfg.SUPABASE_ANON_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(args || {})
      });
    } catch (e) { throw new NetError("network"); }
    finally { clearTimeout(to); }
    if (!res.ok) throw new Error("server " + res.status + ": " + (await res.text()).slice(0, 300));
    return res.json();
  }

  async function sha256(t) {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
    return Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, "0")).join("");
  }

  // ---------------- وضع تجريبي (localStorage) ----------------
  const SAMPLE = [
    "حسين عبد الجليل", "علي حسين كاظم", "زهراء عبد الأمير جاسم", "محمد قاسم عبد الله", "فاطمة جبار ناصر",
    "حسن علي مهدي", "مريم صادق جعفر", "عبد الرحمن عادل حميد", "نور الهدى سلام كريم",
    "أحمد ماجد عباس", "سجاد حيدر عبد الزهرة", "رقية محمد طالب", "مصطفى نزار هاشم"
  ];
  const KEY = "frq_demo_db_v4";
  let db = null;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }
  function blank(n) {
    const no = db.students.reduce((m, s) => Math.max(m, s.ticket_no || 0), 0) + 1;
    return { id: ++db.seq, ticket_no: no, full_name: n, kind: "regular", title: null, note: null, listed: true, token: null, issued_at: null, open_count: 0, checked_in_at: null, checked_in_by: null, override_count: 0 };
  }
  const tj = s => ({ status: "ok", id: s.id, no: s.ticket_no, name: s.full_name, kind: s.kind, title: s.title, token: s.token, checked_in: !!s.checked_in_at });
  function load() {
    try { const s = localStorage.getItem(KEY); if (s) db = JSON.parse(s); } catch (e) {}
    if (!db) {
      db = { seq: 0, lseq: 0, settings: { admin_pin: "1234", scanner_pin: "0000", tickets_open: "true" }, students: [], log: [] };
      SAMPLE.forEach(n => db.students.push(blank(n)));
      save();
    }
    return db;
  }
  const pin = (k, p) => load().settings[k + "_pin"] === p;
  const tok = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join("");
  const now = () => new Date().toISOString();
  const byName = (a, b) => a.full_name.localeCompare(b.full_name, "ar");
  const find = id => db.students.find(x => x.id === id);
  function log(s, result, gate, reason) {
    db.log.push({ id: ++db.lseq, sid: s ? s.id : null, name: s ? s.full_name : null, result, gate: gate || "", reason: reason || null, at: now() });
  }
  function doCheckin(s, gate, kind) {
    const base = { id: s.id, no: s.ticket_no, name: s.full_name, kind: s.kind, title: s.title };
    if (s.checked_in_at) {
      log(s, "used", gate); save();
      return { status: "used", ...base, at: s.checked_in_at, by: s.checked_in_by, overrides: s.override_count };
    }
    s.checked_in_at = now(); s.checked_in_by = gate || ""; log(s, kind, gate); save();
    return { status: "ok", ...base, at: s.checked_in_at };
  }
  const BAD = { status: "bad_pin" };

  const Mock = {
    list_students: () => ({ open: load().settings.tickets_open === "true", students: db.students.filter(s => s.listed).sort(byName).map(s => ({ id: s.id, name: s.full_name })) }),
    issue_ticket: ({ p_id }) => {
      const s = (load(), find(p_id)); if (!s || !s.listed) return { status: "not_found" };
      if (!s.token && db.settings.tickets_open !== "true") return { status: "closed" };
      if (!s.token) { s.token = tok(); s.issued_at = now(); }
      s.open_count++; save();
      return tj(s);
    },
    get_ticket: ({ p_token }) => {
      const s = load().students.find(x => x.token && x.token === p_token);
      return s ? tj(s) : { status: "invalid" };
    },
    check_in: ({ p_token, p_pin, p_gate, p_offline }) => {
      if (!pin("scanner", p_pin)) return BAD;
      const s = db.students.find(x => x.token && x.token === p_token);
      if (!s) { log(null, "invalid", p_gate); save(); return { status: "invalid" }; }
      return doCheckin(s, p_gate, p_offline ? "offline" : "ok");
    },
    check_in_by_id: ({ p_id, p_pin, p_gate }) => {
      if (!pin("scanner", p_pin)) return BAD;
      const s = find(p_id); return s ? doCheckin(s, p_gate, "manual") : { status: "invalid" };
    },
    override_entry: ({ p_id, p_pin, p_gate, p_reason }) => {
      if (!pin("scanner", p_pin)) return BAD;
      const s = find(p_id); if (!s) return { status: "invalid" };
      s.override_count++; if (!s.checked_in_at) { s.checked_in_at = now(); s.checked_in_by = p_gate || ""; }
      log(s, "override", p_gate, (p_reason || "").trim() || "بدون سبب"); save();
      return { status: "override", id: s.id, no: s.ticket_no, name: s.full_name, kind: s.kind, overrides: s.override_count };
    },
    scanner_list: async ({ p_pin }) => {
      if (!pin("scanner", p_pin)) return BAD;
      const rows = db.students.slice().sort(byName);
      return { status: "ok", students: await Promise.all(rows.map(async s => ({ id: s.id, no: s.ticket_no, name: s.full_name, k: s.kind, h: s.token ? await sha256(s.token) : null, at: s.checked_in_at, by: s.checked_in_by, ov: s.override_count }))) };
    },
    admin_list: ({ p_pin }) => {
      if (!pin("admin", p_pin)) return BAD;
      return { status: "ok", open: db.settings.tickets_open === "true", students: db.students.slice().sort((a, b) => a.ticket_no - b.ticket_no).map(s => ({ id: s.id, no: s.ticket_no, name: s.full_name, kind: s.kind, title: s.title, note: s.note, listed: s.listed, issued_at: s.issued_at, open_count: s.open_count, at: s.checked_in_at, by: s.checked_in_by, ov: s.override_count })) };
    },
    admin_update: ({ p_pin, p_id, p_data: d }) => {
      if (!pin("admin", p_pin)) return BAD;
      const s = find(p_id); if (!s) return { status: "ok" };
      if ("name" in d) { const n = String(d.name).trim().replace(/\s+/g, " "); if (n.length < 3) return { status: "short" }; if (db.students.some(x => x.full_name === n && x.id !== p_id)) return { status: "duplicate" }; s.full_name = n; }
      if ("no" in d) { const n = parseInt(d.no, 10); if (!(n > 0)) return { status: "bad_value" }; if (db.students.some(x => x.ticket_no === n && x.id !== p_id)) return { status: "duplicate" }; s.ticket_no = n; }
      if ("kind" in d) { if (!["regular", "vip", "vvip"].includes(d.kind)) return { status: "bad_value" }; s.kind = d.kind; }
      if ("title" in d) s.title = String(d.title || "").trim() || null;
      if ("note" in d) s.note = String(d.note || "").trim() || null;
      if ("listed" in d) s.listed = !!d.listed;
      save(); return { status: "ok" };
    },
    admin_add_guest: ({ p_pin, p_name, p_kind, p_title, p_listed }) => {
      if (!pin("admin", p_pin)) return BAD;
      const n = String(p_name || "").trim().replace(/\s+/g, " "); if (n.length < 3) return { status: "short" };
      if (db.students.some(x => x.full_name === n)) return { status: "duplicate" };
      const s = blank(n); Object.assign(s, { kind: p_kind || "regular", title: (p_title || "").trim() || null, listed: !!p_listed, token: tok(), issued_at: now() });
      db.students.push(s); save(); return tj(s);
    },
    admin_get_ticket: ({ p_pin, p_id }) => {
      if (!pin("admin", p_pin)) return BAD;
      const s = find(p_id); if (!s) return { status: "not_found" };
      if (!s.token) { s.token = tok(); s.issued_at = now(); } save(); return tj(s);
    },
    admin_checkin: ({ p_pin, p_id }) => { if (!pin("admin", p_pin)) return BAD; const s = find(p_id); return s ? doCheckin(s, "الإدارة", "manual") : { status: "invalid" }; },
    admin_log_delete: ({ p_pin, p_log_id }) => { if (!pin("admin", p_pin)) return BAD; db.log = db.log.filter(l => l.id !== p_log_id); save(); return { status: "ok" }; },
    admin_log_clear: ({ p_pin }) => { if (!pin("admin", p_pin)) return BAD; db.log = []; save(); return { status: "ok" }; },
    admin_log_add: ({ p_pin, p_sid, p_result, p_reason }) => { if (!pin("admin", p_pin)) return BAD; log(find(p_sid) || null, p_result, "الإدارة", (p_reason || "").trim() || null); save(); return { status: "ok" }; },
    admin_delete_all: ({ p_pin }) => { if (!pin("admin", p_pin)) return BAD; db.students = []; db.log = []; save(); return { status: "ok" }; },
    admin_log: ({ p_pin, p_limit }) => {
      if (!pin("admin", p_pin)) return BAD;
      return { status: "ok", log: db.log.slice(-(p_limit || 300)).reverse() };
    },
    admin_add: ({ p_pin, p_names }) => {
      if (!pin("admin", p_pin)) return BAD;
      let added = 0, skipped = 0;
      p_names.forEach(n => {
        n = n.trim().replace(/\s+/g, " "); if (n.length < 3) return;
        if (db.students.some(s => s.full_name === n)) skipped++; else { db.students.push(blank(n)); added++; }
      });
      save(); return { status: "ok", added, skipped };
    },
    admin_rename: ({ p_pin, p_id, p_name }) => {
      if (!pin("admin", p_pin)) return BAD;
      p_name = p_name.trim().replace(/\s+/g, " ");
      if (p_name.length < 3) return { status: "short" };
      if (db.students.some(s => s.full_name === p_name && s.id !== p_id)) return { status: "duplicate" };
      const s = find(p_id); if (s) s.full_name = p_name; save(); return { status: "ok" };
    },
    admin_delete: ({ p_pin, p_id }) => {
      if (!pin("admin", p_pin)) return BAD;
      db.students = db.students.filter(s => s.id !== p_id); save(); return { status: "ok" };
    },
    admin_reset_ticket: ({ p_pin, p_id }) => {
      if (!pin("admin", p_pin)) return BAD;
      const s = find(p_id); if (s) { s.token = null; s.issued_at = null; s.open_count = 0; } save(); return { status: "ok" };
    },
    admin_undo_checkin: ({ p_pin, p_id }) => {
      if (!pin("admin", p_pin)) return BAD;
      const s = find(p_id); if (s) { s.checked_in_at = null; s.checked_in_by = null; log(s, "undo", "الإدارة"); } save(); return { status: "ok" };
    },
    admin_reset_checkins: ({ p_pin }) => {
      if (!pin("admin", p_pin)) return BAD;
      db.students.forEach(s => { s.checked_in_at = null; s.checked_in_by = null; s.override_count = 0; }); db.log = []; save();
      return { status: "ok" };
    },
    admin_set_setting: ({ p_pin, p_key, p_value }) => {
      if (!pin("admin", p_pin)) return BAD;
      if (!["tickets_open", "scanner_pin", "admin_pin"].includes(p_key)) return { status: "bad_key" };
      if (p_key.endsWith("_pin") && String(p_value || "").length < 6) return { status: "short" };
      db.settings[p_key] = p_value; save(); return { status: "ok" };
    }
  };

  async function rpc(fn, args) {
    if (LIVE) return remote(fn, args);
    await new Promise(r => setTimeout(r, 140));
    if (cfg.DEMO_OFFLINE) throw new NetError("network");
    db = null; // اقرأ آخر نسخة (لو صفحة ثانية غيّرت)
    return JSON.parse(JSON.stringify(await Mock[fn](args || {})));
  }

  // ---------------- أدوات مشتركة ----------------
  const U = {
    sha256, NetError,
    esc: s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),
    norm: s => String(s || "")
      .replace(/[ً-ٰٟـ]/g, "")
      .replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
      .replace(/\s+/g, " ").trim().toLowerCase(),
    no: id => String(id).padStart(4, "0"),
    time: iso => iso ? new Date(iso).toLocaleTimeString("ar-IQ", { hour: "numeric", minute: "2-digit" }) : "",
    dateTime: iso => iso ? new Date(iso).toLocaleString("ar-IQ", { day: "numeric", month: "numeric", hour: "numeric", minute: "2-digit" }) : "",
    store: {
      get(k, area) { try { return JSON.parse((area || localStorage).getItem(k)); } catch (e) { return null; } },
      set(k, v, area) { try { (area || localStorage).setItem(k, JSON.stringify(v)); } catch (e) {} },
      del(k, area) { try { (area || localStorage).removeItem(k); } catch (e) {} }
    },
    toast(msg, kind) {
      let t = document.getElementById("toast");
      if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); }
      t.textContent = msg; t.className = "show " + (kind || "");
      clearTimeout(t._h); t._h = setTimeout(() => (t.className = ""), 2800);
    },
    demoBanner() {
      if (LIVE) return;
      const b = document.createElement("div");
      b.className = "demo-banner";
      b.innerHTML = "وضع تجريبي — البيانات على هذا الجهاز فقط. رمز الإدارة 1234 · رمز الماسح 0000";
      document.body.prepend(b);
    }
  };

  // حقوق التصميم — تظهر أسفل كل الصفحات
  document.addEventListener("DOMContentLoaded", () => {
    const f = document.createElement("footer");
    f.className = "credit";
    f.innerHTML = "© 2026 · تصميم وتطوير النظام: <b>محمد أسعد السعد</b>";
    document.body.appendChild(f);
  });

  window.API = { rpc, LIVE, cfg };
  window.U = U;
})();
