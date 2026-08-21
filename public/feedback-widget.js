// ============================================================
// FEEDBACK WIDGET v2.1 — CORREGIDO
// Fixes: redirect: follow, CORS mode, error handling
// ============================================================

var FeedbackWidget = (function () {
  "use strict";

  var state = {
    apiUrl: "",
    project: "General",
    adminUsers: [],
    currentUser: "",
    isAdmin: false,
    active: false,
    comments: [],
    selectedComment: null,
    dragStart: null,
    isDragging: false,
    filter: "todos",
    sidebarOpen: false,
    detailOpen: false,
    polling: null,
    formOpen: false,
  };

  var TYPES = {
    error:   { label: "Está mal",     icon: "🔴", color: "#ef4444" },
    change:  { label: "Cambiar",      icon: "🎨", color: "#f59e0b" },
    add:     { label: "Agregar",      icon: "➕", color: "#22c55e" },
    remove:  { label: "Quitar",       icon: "✂️", color: "#8b5cf6" },
    comment: { label: "Comentario",   icon: "💬", color: "#6b7280" },
  };

  var STATUSES = {
    pendiente:  { label: "Pendiente",    icon: "⏳", color: "#ef4444", bg: "#fef2f2" },
    duda:       { label: "Con duda",     icon: "❓", color: "#f59e0b", bg: "#fffbeb" },
    proceso:    { label: "En proceso",   icon: "⚙️", color: "#3b82f6", bg: "#eff6ff" },
    finalizado: { label: "Finalizado",   icon: "✅", color: "#22c55e", bg: "#f0fdf4" },
    aprobado:   { label: "Aprobado",     icon: "👍", color: "#6b7280", bg: "#f9fafb" },
  };

  function injectStyles() {
    if (document.getElementById("fw-styles")) return;
    var style = document.createElement("style");
    style.id = "fw-styles";
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');
      .fw-root, .fw-root * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
      .fw-root { --fw-primary: #6366f1; --fw-primary-light: #818cf8; --fw-primary-bg: #eef2ff; --fw-dark: #1e1b4b; --fw-gray-50: #f8fafc; --fw-gray-100: #f1f5f9; --fw-gray-200: #e2e8f0; --fw-gray-300: #cbd5e1; --fw-gray-400: #94a3b8; --fw-gray-500: #64748b; --fw-gray-600: #475569; --fw-gray-700: #334155; --fw-gray-800: #1e293b; --fw-gray-900: #0f172a; --fw-red: #ef4444; --fw-orange: #f59e0b; --fw-green: #22c55e; --fw-blue: #3b82f6; --fw-shadow: 0 4px 24px rgba(0,0,0,.12); --fw-shadow-lg: 0 12px 48px rgba(0,0,0,.18); --fw-radius: 12px; --fw-radius-sm: 8px; --fw-transition: all .2s cubic-bezier(.4,0,.2,1); z-index: 999990; }
      .fw-toggle { position: fixed; bottom: 24px; right: 24px; z-index: 999999; display: flex; align-items: center; gap: 8px; padding: 12px 20px; border: none; border-radius: 50px; font-size: 14px; font-weight: 600; cursor: pointer !important; transition: var(--fw-transition); box-shadow: var(--fw-shadow-lg); }
      .fw-toggle.off { background: var(--fw-gray-800); color: #fff; }
      .fw-toggle.off:hover { background: var(--fw-gray-700); transform: scale(1.04); }
      .fw-toggle.on { background: var(--fw-primary); color: #fff; animation: fw-pulse-toggle 2s infinite; }
      .fw-toggle.on:hover { background: var(--fw-primary-light); }
      @keyframes fw-pulse-toggle { 0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,.5); } 50% { box-shadow: 0 0 0 10px rgba(99,102,241,0); } }
      .fw-sidebar-toggle { position: fixed; bottom: 24px; right: 220px; z-index: 999999; width: 44px; height: 44px; border: none; border-radius: 50%; background: var(--fw-gray-800); color: #fff; font-size: 18px; cursor: pointer !important; transition: var(--fw-transition); box-shadow: var(--fw-shadow); display: flex; align-items: center; justify-content: center; }
      .fw-sidebar-toggle:hover { background: var(--fw-gray-700); transform: scale(1.08); }
      .fw-sidebar-toggle .fw-badge { position: absolute; top: -4px; right: -4px; min-width: 20px; height: 20px; border-radius: 10px; background: var(--fw-red); color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; padding: 0 5px; }
      .fw-banner { position: fixed; top: 0; left: 0; right: 0; z-index: 999998; padding: 10px 20px; background: linear-gradient(135deg, var(--fw-dark), #312e81); color: #fff; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 16px; transform: translateY(-100%); transition: transform .4s cubic-bezier(.4,0,.2,1); }
      .fw-banner.visible { transform: translateY(0); }
      .fw-banner-item { display: flex; align-items: center; gap: 5px; padding: 4px 12px; background: rgba(255,255,255,.12); border-radius: 20px; }
      .fw-banner-close { background: none; border: none; color: rgba(255,255,255,.7); font-size: 18px; cursor: pointer !important; margin-left: 12px; padding: 4px; }
      .fw-banner-close:hover { color: #fff; }
      body.fw-mode-active { cursor: crosshair; }
      body.fw-mode-active #root { cursor: crosshair; }
      body.fw-mode-active #root * { cursor: crosshair; }
      .fw-drag-overlay { position: absolute; border: 2px dashed var(--fw-primary); background: rgba(99,102,241,.08); border-radius: 4px; z-index: 999993; pointer-events: none; }
      .fw-pin { position: absolute; z-index: 999994; cursor: pointer !important; transition: var(--fw-transition); }
      .fw-pin-dot { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.25); transition: var(--fw-transition); position: relative; }
      .fw-pin-dot span { position: relative; z-index: 2; }
      .fw-pin:hover .fw-pin-dot { transform: scale(1.2); }
      .fw-pin.active .fw-pin-dot { transform: scale(1.3); box-shadow: 0 0 0 6px rgba(99,102,241,.3), 0 4px 12px rgba(0,0,0,.3); }
      .fw-pin.inactive { opacity: .5; }
      .fw-pin-label { position: absolute; top: -28px; left: 50%; transform: translateX(-50%); background: var(--fw-gray-800); color: #fff; font-size: 11px; padding: 3px 8px; border-radius: 4px; white-space: nowrap; opacity: 0; transition: opacity .2s; pointer-events: none; }
      .fw-pin:hover .fw-pin-label { opacity: 1; }
      .fw-pin-type { position: absolute; bottom: -3px; right: -3px; font-size: 10px; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; background: #fff; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,.2); }
      .fw-area { position: absolute; z-index: 999993; border-radius: 6px; cursor: pointer !important; transition: var(--fw-transition); }
      .fw-area-border { border: 2px solid; border-radius: 6px; width: 100%; height: 100%; position: relative; transition: var(--fw-transition); }
      .fw-area:hover .fw-area-border { box-shadow: 0 0 0 4px rgba(99,102,241,.15); }
      .fw-area.active .fw-area-border { box-shadow: 0 0 0 6px rgba(99,102,241,.25); }
      .fw-area.inactive { opacity: .4; }
      .fw-area-tag { position: absolute; top: -12px; left: 12px; display: flex; align-items: center; gap: 4px; padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 600; color: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.15); }
      .fw-sidebar { position: fixed; top: 0; right: 0; width: 380px; height: 100vh; background: #fff; z-index: 999996; box-shadow: -4px 0 32px rgba(0,0,0,.1); transform: translateX(100%); transition: transform .35s cubic-bezier(.4,0,.2,1); display: flex; flex-direction: column; overflow: hidden; }
      .fw-sidebar.open { transform: translateX(0); }
      .fw-sidebar-header { padding: 20px 20px 12px; border-bottom: 1px solid var(--fw-gray-100); }
      .fw-sidebar-title { font-size: 16px; font-weight: 700; color: var(--fw-gray-900); display: flex; align-items: center; justify-content: space-between; }
      .fw-sidebar-close { background: none; border: none; font-size: 20px; cursor: pointer !important; color: var(--fw-gray-400); padding: 4px; border-radius: 6px; transition: var(--fw-transition); }
      .fw-sidebar-close:hover { background: var(--fw-gray-100); color: var(--fw-gray-700); }
      .fw-filters { display: flex; gap: 6px; padding: 12px 20px; border-bottom: 1px solid var(--fw-gray-100); flex-wrap: wrap; }
      .fw-filter-btn { padding: 5px 12px; border: 1px solid var(--fw-gray-200); border-radius: 20px; background: #fff; font-size: 12px; font-weight: 500; cursor: pointer !important; transition: var(--fw-transition); color: var(--fw-gray-600); }
      .fw-filter-btn:hover { border-color: var(--fw-primary); color: var(--fw-primary); }
      .fw-filter-btn.active { background: var(--fw-primary); color: #fff; border-color: var(--fw-primary); }
      .fw-projects { padding: 12px 20px; border-bottom: 1px solid var(--fw-gray-100); }
      .fw-project-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: var(--fw-radius-sm); cursor: default; font-size: 13px; transition: var(--fw-transition); }
      .fw-project-item:hover { background: var(--fw-gray-50); }
      .fw-project-name { font-weight: 600; color: var(--fw-gray-800); }
      .fw-project-counts { display: flex; gap: 8px; }
      .fw-project-count { font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 600; }
      .fw-list { flex: 1; overflow-y: auto; padding: 8px 12px; }
      .fw-group { margin-bottom: 8px; }
      .fw-group-header { padding: 8px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--fw-gray-400); display: flex; align-items: center; gap: 6px; }
      .fw-group-count { background: var(--fw-gray-200); color: var(--fw-gray-600); padding: 1px 7px; border-radius: 10px; font-size: 10px; }
      .fw-item { padding: 12px; border-radius: var(--fw-radius-sm); cursor: pointer !important; transition: var(--fw-transition); border: 1px solid transparent; margin-bottom: 4px; }
      .fw-item:hover { background: var(--fw-gray-50); border-color: var(--fw-gray-200); }
      .fw-item.active { background: var(--fw-primary-bg); border-color: var(--fw-primary); }
      .fw-item-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
      .fw-item-number { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0; }
      .fw-item-type-badge { font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 600; }
      .fw-item-comment { font-size: 13px; color: var(--fw-gray-700); line-height: 1.4; margin-bottom: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .fw-item-meta { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--fw-gray-400); }
      .fw-item-user { font-weight: 600; color: var(--fw-gray-500); }
      .fw-item-children { font-size: 11px; color: var(--fw-primary); font-weight: 600; margin-top: 4px; }
      .fw-detail { position: fixed; top: 0; right: 0; width: 380px; height: 100vh; background: #fff; z-index: 999997; box-shadow: -4px 0 32px rgba(0,0,0,.15); transform: translateX(100%); transition: transform .35s cubic-bezier(.4,0,.2,1); display: flex; flex-direction: column; }
      .fw-detail.open { transform: translateX(0); }
      .fw-detail-header { padding: 16px 20px; border-bottom: 1px solid var(--fw-gray-100); display: flex; align-items: center; justify-content: space-between; }
      .fw-detail-back { background: none; border: none; font-size: 14px; cursor: pointer !important; color: var(--fw-gray-500); display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 6px; transition: var(--fw-transition); }
      .fw-detail-back:hover { background: var(--fw-gray-100); }
      .fw-detail-status { font-size: 12px; padding: 4px 12px; border-radius: 20px; font-weight: 600; }
      .fw-detail-body { flex: 1; overflow-y: auto; }
      .fw-detail-main { padding: 20px; border-bottom: 1px solid var(--fw-gray-100); }
      .fw-detail-comment { font-size: 15px; color: var(--fw-gray-800); line-height: 1.5; margin-bottom: 12px; }
      .fw-detail-info { display: flex; flex-wrap: wrap; gap: 8px; font-size: 12px; color: var(--fw-gray-400); }
      .fw-detail-info-tag { padding: 3px 10px; background: var(--fw-gray-100); border-radius: 6px; }
      .fw-detail-children { padding: 12px 20px; border-bottom: 1px solid var(--fw-gray-100); }
      .fw-detail-children-title { font-size: 12px; font-weight: 700; color: var(--fw-gray-400); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 8px; }
      .fw-child-item { padding: 10px 12px; border-radius: var(--fw-radius-sm); background: var(--fw-gray-50); margin-bottom: 6px; cursor: pointer !important; transition: var(--fw-transition); border: 1px solid var(--fw-gray-100); }
      .fw-child-item:hover { border-color: var(--fw-primary); }
      .fw-thread { padding: 16px 20px; }
      .fw-thread-title { font-size: 12px; font-weight: 700; color: var(--fw-gray-400); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 12px; }
      .fw-bubble { max-width: 85%; padding: 10px 14px; border-radius: 14px; margin-bottom: 8px; font-size: 13px; line-height: 1.4; animation: fw-fade-up .3s ease; }
      .fw-bubble-other { background: var(--fw-gray-100); color: var(--fw-gray-800); border-bottom-left-radius: 4px; align-self: flex-start; }
      .fw-bubble-mine { background: var(--fw-primary); color: #fff; border-bottom-right-radius: 4px; align-self: flex-end; margin-left: auto; }
      .fw-bubble-user { font-size: 11px; font-weight: 600; margin-bottom: 3px; }
      .fw-bubble-mine .fw-bubble-user { color: rgba(255,255,255,.8); }
      .fw-bubble-other .fw-bubble-user { color: var(--fw-primary); }
      .fw-bubble-time { font-size: 10px; margin-top: 4px; opacity: .6; }
      @keyframes fw-fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      .fw-reply { padding: 12px 20px 20px; border-top: 1px solid var(--fw-gray-100); }
      .fw-reply-input { width: 100%; padding: 10px 14px; border: 1px solid var(--fw-gray-200); border-radius: var(--fw-radius-sm); font-size: 13px; resize: none; outline: none; transition: var(--fw-transition); min-height: 40px; max-height: 120px; font-family: inherit; cursor: text !important; }
      .fw-reply-input:focus { border-color: var(--fw-primary); box-shadow: 0 0 0 3px rgba(99,102,241,.1); }
      .fw-reply-actions { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
      .fw-btn { padding: 7px 14px; border: none; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer !important; transition: var(--fw-transition); }
      .fw-btn:hover { transform: translateY(-1px); }
      .fw-btn-primary { background: var(--fw-primary); color: #fff; }
      .fw-btn-primary:hover { background: var(--fw-primary-light); }
      .fw-btn-outline { background: #fff; color: var(--fw-gray-600); border: 1px solid var(--fw-gray-200); }
      .fw-btn-outline:hover { border-color: var(--fw-gray-400); }
      .fw-btn-success { background: var(--fw-green); color: #fff; }
      .fw-btn-warning { background: var(--fw-orange); color: #fff; }
      .fw-btn-danger { background: var(--fw-red); color: #fff; }
      .fw-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 999999; display: flex; align-items: center; justify-content: center; animation: fw-fade-in .2s; }
      .fw-modal { background: #fff; border-radius: 16px; padding: 32px; width: 360px; max-width: 90vw; box-shadow: var(--fw-shadow-lg); animation: fw-scale-in .3s cubic-bezier(.4,0,.2,1); }
      .fw-modal h3 { font-size: 18px; font-weight: 700; color: var(--fw-gray-900); margin-bottom: 6px; }
      .fw-modal p { font-size: 13px; color: var(--fw-gray-500); margin-bottom: 20px; line-height: 1.4; }
      .fw-modal input { width: 100%; padding: 12px 16px; border: 2px solid var(--fw-gray-200); border-radius: var(--fw-radius-sm); font-size: 14px; outline: none; transition: var(--fw-transition); cursor: text !important; }
      .fw-modal input:focus { border-color: var(--fw-primary); }
      .fw-modal button { width: 100%; margin-top: 12px; padding: 12px; border: none; border-radius: var(--fw-radius-sm); background: var(--fw-primary); color: #fff; font-size: 14px; font-weight: 600; cursor: pointer !important; transition: var(--fw-transition); }
      .fw-modal button:hover { background: var(--fw-primary-light); }
      @keyframes fw-fade-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes fw-scale-in { from { opacity: 0; transform: scale(.9); } to { opacity: 1; transform: scale(1); } }
      .fw-new-form { position: absolute; z-index: 999999; background: #fff; border-radius: var(--fw-radius); box-shadow: var(--fw-shadow-lg); width: 320px; padding: 20px; animation: fw-scale-in .25s cubic-bezier(.4,0,.2,1); cursor: default !important; }
      .fw-new-form * { cursor: default !important; }
      .fw-new-form h4 { font-size: 14px; font-weight: 700; color: var(--fw-gray-900); margin-bottom: 12px; }
      .fw-type-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
      .fw-type-chip { padding: 6px 12px; border: 2px solid var(--fw-gray-200); border-radius: 20px; font-size: 12px; font-weight: 500; cursor: pointer !important; transition: var(--fw-transition); background: #fff; display: flex; align-items: center; gap: 4px; user-select: none; }
      .fw-type-chip:hover { border-color: var(--fw-gray-400); }
      .fw-type-chip.selected { border-color: var(--fw-primary); background: var(--fw-primary-bg); color: var(--fw-primary); }
      .fw-new-textarea { width: 100%; padding: 10px 12px; border: 1px solid var(--fw-gray-200); border-radius: var(--fw-radius-sm); font-size: 13px; resize: none; outline: none; min-height: 70px; font-family: inherit; transition: var(--fw-transition); cursor: text !important; }
      .fw-new-textarea:focus { border-color: var(--fw-primary); box-shadow: 0 0 0 3px rgba(99,102,241,.1); }
      .fw-new-form-actions { display: flex; gap: 8px; margin-top: 12px; justify-content: flex-end; }
      .fw-highlight { position: absolute; z-index: 999992; border-radius: 8px; background: rgba(99,102,241,.1); border: 2px solid var(--fw-primary); pointer-events: none; animation: fw-highlight-anim 1.5s ease forwards; }
      @keyframes fw-highlight-anim { 0% { opacity: 0; transform: scale(.95); } 20% { opacity: 1; transform: scale(1.01); } 80% { opacity: 1; } 100% { opacity: 0; } }
      .fw-list::-webkit-scrollbar, .fw-detail-body::-webkit-scrollbar { width: 5px; }
      .fw-list::-webkit-scrollbar-track, .fw-detail-body::-webkit-scrollbar-track { background: transparent; }
      .fw-list::-webkit-scrollbar-thumb, .fw-detail-body::-webkit-scrollbar-thumb { background: var(--fw-gray-300); border-radius: 4px; }
      .fw-empty { padding: 40px 20px; text-align: center; }
      .fw-empty-icon { font-size: 40px; margin-bottom: 12px; }
      .fw-empty-text { font-size: 14px; color: var(--fw-gray-400); line-height: 1.5; }
      .fw-loading { display: flex; align-items: center; justify-content: center; padding: 40px; }
      .fw-spinner { width: 28px; height: 28px; border: 3px solid var(--fw-gray-200); border-top-color: var(--fw-primary); border-radius: 50%; animation: fw-spin .7s linear infinite; }
      @keyframes fw-spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
  }

  // ── API — CORREGIDA con redirect: follow ────────────────────
  function apiGet(params) {
    var qs = Object.keys(params)
      .map(function(k) { return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); })
      .join("&");
    return fetch(state.apiUrl + "?" + qs, {
      method: "GET",
      redirect: "follow",
      mode: "cors"
    })
    .then(function(r) { return r.text(); })
    .then(function(text) {
      var d = JSON.parse(text);
      if (!d.success) throw new Error(d.error);
      return d.data;
    });
  }

  function apiPost(body) {
    body.project = state.project;
    return fetch(state.apiUrl, {
      method: "POST",
      redirect: "follow",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
    })
    .then(function(r) { return r.text(); })
    .then(function(text) {
      var d = JSON.parse(text);
      if (!d.success) throw new Error(d.error);
      return d;
    });
  }

  function $(sel, parent) { return (parent || document).querySelector(sel); }
  function $$(sel, parent) { return Array.from((parent || document).querySelectorAll(sel)); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function timeAgo(dateStr) {
    var d = new Date(dateStr);
    var s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return "ahora";
    if (s < 3600) return Math.floor(s / 60) + "m";
    if (s < 86400) return Math.floor(s / 3600) + "h";
    return Math.floor(s / 86400) + "d";
  }
  function getIndex(comment) {
    var roots = state.comments
      .filter(function(c) { return !c.parentId && c.status !== "aprobado"; })
      .sort(function(a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });
    return roots.indexOf(comment) + 1;
  }
  function escHtml(s) {
    if (!s) return "";
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }
  function isWidgetElement(element) {
    if (!element) return false;
    return !!(
      element.closest(".fw-root") ||
      element.closest(".fw-pin") ||
      element.closest(".fw-area") ||
      element.closest(".fw-new-form") ||
      element.closest(".fw-toggle") ||
      element.closest(".fw-sidebar-toggle") ||
      element.closest(".fw-sidebar") ||
      element.closest(".fw-detail") ||
      element.closest(".fw-modal-overlay") ||
      element.closest(".fw-banner") ||
      element.closest(".fw-drag-overlay")
    );
  }

  function ensureUser(cb) {
    var stored = localStorage.getItem("fw-user");
    if (stored) {
      state.currentUser = stored;
      state.isAdmin = state.adminUsers.indexOf(stored) !== -1;
      cb();
      return;
    }
    showUserModal(cb);
  }

  function showUserModal(cb) {
    if ($(".fw-modal-overlay")) return;
    var overlay = el("div", "fw-modal-overlay");
    var modal = el("div", "fw-modal");
    modal.innerHTML =
      '<h3>👋 ¡Hola!</h3>' +
      "<p>Escribe tu nombre para identificar tus ajustes.</p>" +
      '<input type="text" placeholder="Tu nombre..." id="fw-user-input" autocomplete="off" />' +
      '<button id="fw-user-submit">Continuar</button>';
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    setTimeout(function() { document.getElementById("fw-user-input").focus(); }, 100);
    function submit() {
      var inp = document.getElementById("fw-user-input");
      var val = inp.value.trim();
      if (!val) { inp.style.borderColor = "#ef4444"; return; }
      localStorage.setItem("fw-user", val);
      state.currentUser = val;
      state.isAdmin = state.adminUsers.indexOf(val) !== -1;
      overlay.remove();
      cb();
    }
    document.getElementById("fw-user-submit").addEventListener("click", submit);
    document.getElementById("fw-user-input").addEventListener("keydown", function(e) { if (e.key === "Enter") submit(); });
  }

  function loadComments() {
    return apiGet({ project: state.project }).then(function(data) {
      state.comments = data;
      return data;
    });
  }

  function getChildren(parentId) {
    return state.comments.filter(function(c) { return c.parentId === parentId; });
  }

  function getFilteredComments() {
    var roots = state.comments
      .filter(function(c) { return !c.parentId && c.status !== "aprobado"; })
      .sort(function(a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });
    if (state.filter === "mios") roots = roots.filter(function(c) { return c.user === state.currentUser; });
    else if (state.filter === "pendientes") roots = roots.filter(function(c) { return c.status === "pendiente"; });
    else if (state.filter === "dudas") roots = roots.filter(function(c) { return c.status === "duda"; });
    else if (state.filter === "finalizados") roots = roots.filter(function(c) { return c.status === "finalizado"; });
    if (!state.isAdmin && state.filter === "todos") roots = roots.filter(function(c) { return c.user === state.currentUser; });
    return roots;
  }

  function renderMarkers() {
    $$(".fw-pin, .fw-area").forEach(function(e) { e.remove(); });
    var roots = state.comments
      .filter(function(c) { return !c.parentId && c.status !== "aprobado"; })
      .sort(function(a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });
    roots.forEach(function(c, i) {
      if (c.selectionType === "area") renderArea(c, i + 1);
      else renderPin(c, i + 1);
      getChildren(c.id).forEach(function(child) {
        if (child.status === "aprobado") return;
        if (child.selectionType === "area") renderArea(child, (i + 1) + "·");
        else renderPin(child, (i + 1) + "·");
      });
    });
  }

  function renderPin(c, num) {
    var statusInfo = STATUSES[c.status] || STATUSES.pendiente;
    var typeInfo = TYPES[c.type] || TYPES.comment;
    var pin = el("div", "fw-pin");
    pin.dataset.id = c.id;
    var docW = document.documentElement.scrollWidth;
    var docH = document.documentElement.scrollHeight;
    pin.style.left = (c.x / 100 * docW - 16) + "px";
    pin.style.top = (c.y / 100 * docH - 16) + "px";
    if (state.selectedComment && state.selectedComment.id === c.id) pin.classList.add("active");
    else if (state.selectedComment) pin.classList.add("inactive");
    pin.innerHTML =
      '<div class="fw-pin-dot" style="background:' + statusInfo.color + '"><span>' + num + "</span></div>" +
      '<div class="fw-pin-type">' + typeInfo.icon + "</div>" +
      '<div class="fw-pin-label">' + escHtml(c.user) + " · " + typeInfo.label + "</div>";
    pin.addEventListener("click", function(e) { e.preventDefault(); e.stopPropagation(); selectComment(c); });
    document.body.appendChild(pin);
  }

  function renderArea(c, num) {
    var statusInfo = STATUSES[c.status] || STATUSES.pendiente;
    var typeInfo = TYPES[c.type] || TYPES.comment;
    var area = el("div", "fw-area");
    area.dataset.id = c.id;
    var docW = document.documentElement.scrollWidth;
    var docH = document.documentElement.scrollHeight;
    area.style.left = (c.x / 100 * docW) + "px";
    area.style.top = (c.y / 100 * docH) + "px";
    area.style.width = (c.width / 100 * docW) + "px";
    area.style.height = (c.height / 100 * docH) + "px";
    if (state.selectedComment && state.selectedComment.id === c.id) area.classList.add("active");
    else if (state.selectedComment) area.classList.add("inactive");
    area.innerHTML =
      '<div class="fw-area-border" style="border-color:' + statusInfo.color + '; background:' + statusInfo.color + '11"></div>' +
      '<div class="fw-area-tag" style="background:' + statusInfo.color + '">' +
      "<span>" + num + "</span> " + typeInfo.icon + " " + typeInfo.label + "</div>";
    area.addEventListener("click", function(e) { e.preventDefault(); e.stopPropagation(); selectComment(c); });
    document.body.appendChild(area);
  }

  function renderSidebar() {
    var sb = $(".fw-sidebar");
    if (!sb) return;
    var list = $(".fw-list", sb);
    list.innerHTML = "";
    var filtered = getFilteredComments();
    if (filtered.length === 0) {
      list.innerHTML = '<div class="fw-empty"><div class="fw-empty-icon">✨</div><div class="fw-empty-text">No hay ajustes aquí.<br>¡Todo se ve bien!</div></div>';
      return;
    }
    var groups = {};
    var groupOrder = ["duda", "pendiente", "proceso", "finalizado"];
    groupOrder.forEach(function(s) { groups[s] = []; });
    filtered.forEach(function(c) {
      var s = c.status;
      if (!groups[s]) groups[s] = [];
      groups[s].push(c);
    });
    groupOrder.forEach(function(s) {
      if (!groups[s] || groups[s].length === 0) return;
      var statusInfo = STATUSES[s];
      var group = el("div", "fw-group");
      group.innerHTML = '<div class="fw-group-header">' + statusInfo.icon + " " + statusInfo.label + ' <span class="fw-group-count">' + groups[s].length + "</span></div>";
      groups[s].forEach(function(c) {
        var idx = getIndex(c);
        var typeInfo = TYPES[c.type] || TYPES.comment;
        var statusColor = STATUSES[c.status] ? STATUSES[c.status].color : "#999";
        var children = getChildren(c.id);
        var isActive = state.selectedComment && state.selectedComment.id === c.id;
        var item = el("div", "fw-item" + (isActive ? " active" : ""));
        item.innerHTML =
          '<div class="fw-item-top"><div class="fw-item-number" style="background:' + statusColor + '">' + idx + "</div>" +
          '<span class="fw-item-type-badge" style="background:' + typeInfo.color + '22; color:' + typeInfo.color + '">' + typeInfo.icon + " " + typeInfo.label + "</span></div>" +
          '<div class="fw-item-comment">' + escHtml(c.comment) + "</div>" +
          '<div class="fw-item-meta"><span class="fw-item-user">' + escHtml(c.user) + "</span><span>·</span><span>" + timeAgo(c.createdAt) + "</span>" +
          (c.responses && c.responses.length ? "<span>· 💬 " + c.responses.length + "</span>" : "") + "</div>" +
          (children.length > 0 ? '<div class="fw-item-children">📌 ' + children.length + " sub-ajuste" + (children.length > 1 ? "s" : "") + "</div>" : "");
        item.addEventListener("click", function() { selectComment(c); scrollToComment(c); });
        group.appendChild(item);
      });
      list.appendChild(group);
    });
  }

  function renderDetail(c) {
    var det = $(".fw-detail");
    if (!det) return;
    var statusInfo = STATUSES[c.status] || STATUSES.pendiente;
    var typeInfo = TYPES[c.type] || TYPES.comment;
    var idx = getIndex(c) || "·";
    var children = getChildren(c.id);
    $(".fw-detail-status", det).textContent = statusInfo.icon + " " + statusInfo.label;
    $(".fw-detail-status", det).style.background = statusInfo.bg;
    $(".fw-detail-status", det).style.color = statusInfo.color;
    var body = $(".fw-detail-body", det);
    body.innerHTML = "";
    var main = el("div", "fw-detail-main");
    main.innerHTML =
      '<div class="fw-detail-comment">' + escHtml(c.comment) + "</div>" +
      '<div class="fw-detail-info">' +
      '<span class="fw-detail-info-tag">👤 ' + escHtml(c.user) + "</span>" +
      '<span class="fw-detail-info-tag">' + typeInfo.icon + " " + typeInfo.label + "</span>" +
      '<span class="fw-detail-info-tag">🕐 ' + new Date(c.createdAt).toLocaleString() + "</span>" +
      '<span class="fw-detail-info-tag">#' + idx + (c.selectionType === "area" ? " · Área" : " · Pin") + "</span></div>";
    body.appendChild(main);
    if (children.length > 0) {
      var childSection = el("div", "fw-detail-children");
      childSection.innerHTML = '<div class="fw-detail-children-title">📌 Sub-ajustes (' + children.length + ")</div>";
      children.forEach(function(ch) {
        var childType = TYPES[ch.type] || TYPES.comment;
        var childStatus = STATUSES[ch.status] || STATUSES.pendiente;
        var ci = el("div", "fw-child-item");
        ci.innerHTML =
          '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="font-size:11px;padding:2px 6px;border-radius:8px;background:' + childStatus.color + '22;color:' + childStatus.color + '">' + childStatus.icon + "</span>" +
          '<span style="font-size:12px">' + childType.icon + " " + childType.label + "</span></div>" +
          '<div style="font-size:13px;color:#334155">' + escHtml(ch.comment) + "</div>" +
          '<div style="font-size:11px;color:#94a3b8;margin-top:4px">' + escHtml(ch.user) + " · " + timeAgo(ch.createdAt) + "</div>";
        ci.addEventListener("click", function() { selectComment(ch); scrollToComment(ch); });
        childSection.appendChild(ci);
      });
      body.appendChild(childSection);
    }
    if (c.selectionType === "area" && !c.parentId) {
      var addSub = el("div", "");
      addSub.style.cssText = "padding:8px 20px";
      var addBtn = el("button", "fw-btn fw-btn-outline", "➕ Agregar sub-ajuste dentro de esta área");
      addBtn.style.cssText = "width:100%;font-size:12px";
      addBtn.addEventListener("click", function() { closeDetail(); startSubAdjustMode(c); });
      addSub.appendChild(addBtn);
      body.appendChild(addSub);
    }
    var thread = el("div", "fw-thread");
    thread.innerHTML = '<div class="fw-thread-title">💬 Conversación</div>';
    if (c.responses && c.responses.length > 0) {
      c.responses.forEach(function(r) {
        var isMine = r.user === state.currentUser;
        var bubble = el("div", "fw-bubble " + (isMine ? "fw-bubble-mine" : "fw-bubble-other"));
        bubble.innerHTML = '<div class="fw-bubble-user">' + escHtml(r.user) + "</div><div>" + escHtml(r.text) + "</div>" + '<div class="fw-bubble-time">' + timeAgo(r.createdAt) + "</div>";
        thread.appendChild(bubble);
      });
    } else {
      thread.appendChild(el("div", "", '<p style="font-size:12px;color:#94a3b8;text-align:center;padding:16px 0">Sin mensajes aún</p>'));
    }
    body.appendChild(thread);
    var reply = $(".fw-reply", det);
    reply.innerHTML = "";
    var textarea = el("textarea", "fw-reply-input");
    textarea.placeholder = "Escribe un mensaje...";
    reply.appendChild(textarea);
    var actions = el("div", "fw-reply-actions");
    var sendBtn = el("button", "fw-btn fw-btn-primary", "Enviar");
    sendBtn.addEventListener("click", function() {
      var txt = textarea.value.trim();
      if (!txt) return;
      sendBtn.disabled = true; sendBtn.textContent = "...";
      apiPost({ action: "addResponse", id: c.id, user: state.currentUser, text: txt, isAdmin: state.isAdmin })
        .then(function(res) {
          var found = state.comments.find(function(x) { return x.id === c.id; });
          if (found) found.responses = res.responses;
          renderDetail(found || c); renderSidebar(); renderMarkers();
        }).catch(function() { sendBtn.disabled = false; sendBtn.textContent = "Enviar"; });
    });
    actions.appendChild(sendBtn);
    if (state.isAdmin) {
      if (c.status === "pendiente" || c.status === "duda") {
        var procBtn = el("button", "fw-btn fw-btn-warning", "⚙️ En proceso");
        procBtn.addEventListener("click", function() { updateStatus(c, "proceso"); });
        actions.appendChild(procBtn);
      }
      if (c.status !== "finalizado" && c.status !== "aprobado") {
        var finBtn = el("button", "fw-btn fw-btn-success", "✅ Finalizado");
        finBtn.addEventListener("click", function() { updateStatus(c, "finalizado"); });
        actions.appendChild(finBtn);
      }
    }
    if (!state.isAdmin && c.user === state.currentUser && c.status === "finalizado") {
      var appBtn = el("button", "fw-btn fw-btn-success", "👍 Aprobar");
      appBtn.addEventListener("click", function() { updateStatus(c, "aprobado"); });
      actions.appendChild(appBtn);
      var rejBtn = el("button", "fw-btn fw-btn-danger", "↩️ Rechazar");
      rejBtn.addEventListener("click", function() { updateStatus(c, "pendiente"); });
      actions.appendChild(rejBtn);
    }
    reply.appendChild(actions);
    state.detailOpen = true;
    det.classList.add("open");
  }

  function updateStatus(c, newStatus) {
    apiPost({ action: "updateStatus", id: c.id, status: newStatus }).then(function() {
      var found = state.comments.find(function(x) { return x.id === c.id; });
      if (found) found.status = newStatus;
      if (newStatus === "aprobado") { closeDetail(); state.selectedComment = null; }
      else renderDetail(found);
      renderSidebar(); renderMarkers();
    });
  }

  function selectComment(c) {
    state.selectedComment = c;
    renderMarkers(); renderSidebar(); renderDetail(c);
  }

  function closeDetail() {
    var det = $(".fw-detail");
    if (det) det.classList.remove("open");
    state.detailOpen = false;
  }

  function scrollToComment(c) {
    var docW = document.documentElement.scrollWidth;
    var docH = document.documentElement.scrollHeight;
    var px = c.x / 100 * docW;
    var py = c.y / 100 * docH;
    window.scrollTo({ left: px - window.innerWidth / 2, top: py - window.innerHeight / 2, behavior: "smooth" });
    setTimeout(function() {
      var hl = el("div", "fw-highlight");
      if (c.selectionType === "area") {
        hl.style.left = (c.x / 100 * docW - 4) + "px"; hl.style.top = (c.y / 100 * docH - 4) + "px";
        hl.style.width = (c.width / 100 * docW + 8) + "px"; hl.style.height = (c.height / 100 * docH + 8) + "px";
      } else {
        hl.style.left = (px - 30) + "px"; hl.style.top = (py - 30) + "px";
        hl.style.width = "60px"; hl.style.height = "60px"; hl.style.borderRadius = "50%";
      }
      document.body.appendChild(hl);
      setTimeout(function() { hl.remove(); }, 1600);
    }, 400);
  }

  var pendingForm = null;
  var subAdjustParent = null;

  function onDocumentClick(e) {
    if (!state.active) return;
    if (state.formOpen) return;
    if (isWidgetElement(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    if (pendingForm) { pendingForm.remove(); pendingForm = null; }
    var docW = document.documentElement.scrollWidth;
    var docH = document.documentElement.scrollHeight;
    var x = (e.pageX / docW) * 100;
    var y = (e.pageY / docH) * 100;
    showNewForm(x, y, 0, 0, "pin", e.pageX, e.pageY);
  }

  function onDocumentMouseDown(e) {
    if (!state.active || state.formOpen || isWidgetElement(e.target) || e.button !== 0) return;
    state.dragStart = { x: e.pageX, y: e.pageY, time: Date.now() };
    state.isDragging = false;
  }

  function onDocumentMouseMove(e) {
    if (!state.dragStart || state.formOpen) return;
    var dx = e.pageX - state.dragStart.x;
    var dy = e.pageY - state.dragStart.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      state.isDragging = true;
      var overlay = $(".fw-drag-overlay");
      if (!overlay) { overlay = el("div", "fw-drag-overlay"); document.body.appendChild(overlay); }
      var left = Math.min(state.dragStart.x, e.pageX);
      var top = Math.min(state.dragStart.y, e.pageY);
      overlay.style.left = left + "px"; overlay.style.top = top + "px";
      overlay.style.width = Math.abs(dx) + "px"; overlay.style.height = Math.abs(dy) + "px";
    }
  }

  function onDocumentMouseUp(e) {
    if (!state.dragStart) return;
    var overlay = $(".fw-drag-overlay");
    if (overlay) overlay.remove();
    if (state.isDragging) {
      e.preventDefault(); e.stopPropagation();
      var docW = document.documentElement.scrollWidth;
      var docH = document.documentElement.scrollHeight;
      var x = Math.min(state.dragStart.x, e.pageX);
      var y = Math.min(state.dragStart.y, e.pageY);
      var w = Math.abs(e.pageX - state.dragStart.x);
      var h = Math.abs(e.pageY - state.dragStart.y);
      if (w > 20 && h > 20) {
        var xPct = (x / docW) * 100; var yPct = (y / docH) * 100;
        var wPct = (w / docW) * 100; var hPct = (h / docH) * 100;
        if (pendingForm) { pendingForm.remove(); pendingForm = null; }
        showNewForm(xPct, yPct, wPct, hPct, "area", x + w / 2, y);
      }
    }
    state.dragStart = null; state.isDragging = false;
  }

  function showNewForm(x, y, w, h, selType, screenX, screenY) {
    if (pendingForm) pendingForm.remove();
    state.formOpen = true;
    var form = el("div", "fw-new-form");
    var selectedType = "comment";
    var chipsHtml = Object.keys(TYPES).map(function(k) {
      var t = TYPES[k];
      var sel = k === "comment" ? " selected" : "";
      return '<div class="fw-type-chip' + sel + '" data-type="' + k + '">' + t.icon + " " + t.label + "</div>";
    }).join("");
    form.innerHTML =
      "<h4>" + (selType === "area" ? "📐 Ajuste de área" : "📌 Ajuste puntual") + "</h4>" +
      '<div class="fw-type-chips">' + chipsHtml + "</div>" +
      '<textarea class="fw-new-textarea" placeholder="Describe el ajuste..."></textarea>' +
      '<div class="fw-new-form-actions"><button class="fw-btn fw-btn-outline fw-new-cancel">Cancelar</button><button class="fw-btn fw-btn-primary fw-new-submit">✓ Guardar ajuste</button></div>';
    var formLeft = Math.min(screenX + 12, document.documentElement.scrollWidth - 350);
    var formTop = screenY + 12;
    form.style.left = formLeft + "px"; form.style.top = formTop + "px";
    form.addEventListener("click", function(e) { e.stopPropagation(); });
    form.addEventListener("mousedown", function(e) { e.stopPropagation(); });
    form.addEventListener("mouseup", function(e) { e.stopPropagation(); });
    form.addEventListener("mousemove", function(e) { e.stopPropagation(); });
    document.body.appendChild(form);
    pendingForm = form;
    var chips = form.querySelectorAll(".fw-type-chip");
    chips.forEach(function(chip) {
      chip.addEventListener("click", function(e) {
        e.stopPropagation();
        chips.forEach(function(c) { c.classList.remove("selected"); });
        chip.classList.add("selected");
        selectedType = chip.getAttribute("data-type");
      });
    });
    form.querySelector(".fw-new-cancel").addEventListener("click", function(e) {
      e.stopPropagation(); form.remove(); pendingForm = null; state.formOpen = false;
    });
    form.querySelector(".fw-new-submit").addEventListener("click", function(e) {
      e.stopPropagation();
      var textArea = form.querySelector(".fw-new-textarea");
      var comment = textArea.value.trim();
      if (!comment) { textArea.style.borderColor = "#ef4444"; textArea.focus(); return; }
      var btn = form.querySelector(".fw-new-submit");
      btn.disabled = true; btn.textContent = "Guardando...";
      apiPost({
        action: "create", url: window.location.href,
        type: selectedType, selectionType: selType,
        x: x, y: y, width: w, height: h,
        comment: comment, user: state.currentUser,
        parentId: subAdjustParent ? subAdjustParent.id : "",
        viewportWidth: window.innerWidth,
      }).then(function(res) {
        state.comments.push(res.data);
        form.remove(); pendingForm = null; state.formOpen = false; subAdjustParent = null;
        var subBanner = document.getElementById("fw-sub-banner");
        if (subBanner) subBanner.remove();
        renderMarkers(); renderSidebar(); showNotifications();
      }).catch(function(err) {
        console.error("FW Error:", err);
        btn.disabled = false; btn.textContent = "✓ Guardar ajuste";
        btn.style.background = "#ef4444";
        setTimeout(function() { btn.style.background = ""; }, 2000);
      });
    });
    setTimeout(function() { var ta = form.querySelector(".fw-new-textarea"); if (ta) ta.focus(); }, 100);
  }

  function startSubAdjustMode(parentComment) {
    subAdjustParent = parentComment; state.active = true; updateToggle();
    var banner = el("div", "fw-banner visible");
    banner.id = "fw-sub-banner";
    banner.innerHTML = '<span>📌 Señala los sub-ajustes dentro del área</span><button class="fw-banner-close" id="fw-sub-cancel">✕ Cancelar</button>';
    document.body.appendChild(banner);
    document.getElementById("fw-sub-cancel").addEventListener("click", function() { subAdjustParent = null; banner.remove(); });
  }

  function showNotifications() {
    var banner = $(".fw-banner:not(#fw-sub-banner)");
    if (!banner) return;
    var myComments;
    if (state.isAdmin) myComments = state.comments.filter(function(c) { return c.status !== "aprobado"; });
    else myComments = state.comments.filter(function(c) { return c.user === state.currentUser && c.status !== "aprobado"; });
    var counts = { pendiente: 0, duda: 0, proceso: 0, finalizado: 0 };
    myComments.forEach(function(c) { if (counts.hasOwnProperty(c.status)) counts[c.status]++; });
    var total = counts.pendiente + counts.duda + counts.proceso + counts.finalizado;
    if (total === 0) { banner.classList.remove("visible"); return; }
    var items = [];
    if (state.isAdmin) {
      if (counts.pendiente > 0) items.push('<span class="fw-banner-item">⏳ ' + counts.pendiente + " pendiente" + (counts.pendiente > 1 ? "s" : "") + "</span>");
      if (counts.duda > 0) items.push('<span class="fw-banner-item">❓ ' + counts.duda + " con duda</span>");
      if (counts.proceso > 0) items.push('<span class="fw-banner-item">⚙️ ' + counts.proceso + " en proceso</span>");
    } else {
      if (counts.duda > 0) items.push('<span class="fw-banner-item">❓ ' + counts.duda + " duda" + (counts.duda > 1 ? "s" : "") + " por responder</span>");
      if (counts.finalizado > 0) items.push('<span class="fw-banner-item">✅ ' + counts.finalizado + " listo" + (counts.finalizado > 1 ? "s" : "") + " para revisar</span>");
      if (counts.pendiente > 0) items.push('<span class="fw-banner-item">⏳ ' + counts.pendiente + " pendiente" + (counts.pendiente > 1 ? "s" : "") + "</span>");
    }
    banner.innerHTML = items.join("") + '<button class="fw-banner-close">✕</button>';
    banner.classList.add("visible");
    banner.querySelector(".fw-banner-close").addEventListener("click", function() { banner.classList.remove("visible"); });
  }

  function loadProjectsSummary() {
    if (!state.isAdmin) return Promise.resolve();
    return apiGet({ summary: "true" }).then(function(data) { renderProjectsSummary(data); }).catch(function() {});
  }

  function renderProjectsSummary(projects) {
    var container = $(".fw-projects");
    if (!container) return;
    container.innerHTML = "";
    if (!projects || projects.length === 0) return;
    projects.forEach(function(p) {
      var total = p.pendiente + p.duda + p.proceso + p.finalizado;
      if (total === 0 && p.project !== state.project) return;
      var item = el("div", "fw-project-item");
      var isCurrent = p.project === state.project;
      item.innerHTML =
        '<span class="fw-project-name">' + (isCurrent ? "📍 " : "📊 ") + escHtml(p.project) + "</span>" +
        '<div class="fw-project-counts">' +
        (p.pendiente > 0 ? '<span class="fw-project-count" style="background:#fef2f2;color:#ef4444">' + p.pendiente + " ⏳</span>" : "") +
        (p.duda > 0 ? '<span class="fw-project-count" style="background:#fffbeb;color:#f59e0b">' + p.duda + " ❓</span>" : "") +
        (p.proceso > 0 ? '<span class="fw-project-count" style="background:#eff6ff;color:#3b82f6">' + p.proceso + " ⚙️</span>" : "") +
        (total === 0 ? '<span class="fw-project-count" style="background:#f0fdf4;color:#22c55e">✓</span>' : "") + "</div>";
      container.appendChild(item);
    });
  }

  function updateToggle() {
    var toggle = $(".fw-toggle");
    if (!toggle) return;
    if (state.active) {
      toggle.className = "fw-toggle on"; toggle.innerHTML = "🎯 Modo ajustes ON";
      document.body.classList.add("fw-mode-active");
    } else {
      toggle.className = "fw-toggle off"; toggle.innerHTML = "📝 Pedir ajustes";
      document.body.classList.remove("fw-mode-active");
    }
  }

  function startPolling() {
    if (state.polling) clearInterval(state.polling);
    state.polling = setInterval(function() {
      loadComments().then(function() {
        renderMarkers(); renderSidebar(); showNotifications();
        if (state.selectedComment && state.detailOpen) {
          var updated = state.comments.find(function(c) { return c.id === state.selectedComment.id; });
          if (updated) { state.selectedComment = updated; renderDetail(updated); }
        }
      });
    }, 60000);
  }

  function init(config) {
    if (!config || !config.apiUrl) { console.error("FeedbackWidget: falta apiUrl en config"); return; }
    state.apiUrl = config.apiUrl;
    state.project = config.project || "General";
    state.adminUsers = config.adminUsers || [];
    injectStyles();
    ensureUser(function() {
      buildUI();
      loadComments().then(function() {
        renderMarkers(); renderSidebar(); showNotifications(); loadProjectsSummary(); startPolling();
      });
    });
  }

  function buildUI() {
    var root = el("div", "fw-root");
    root.id = "fw-root";
    root.appendChild(el("div", "fw-banner"));
    var toggle = el("button", "fw-toggle off", "📝 Pedir ajustes");
    toggle.addEventListener("click", function(e) {
      e.stopPropagation(); state.active = !state.active; updateToggle();
      if (!state.active && pendingForm) { pendingForm.remove(); pendingForm = null; state.formOpen = false; }
    });
    root.appendChild(toggle);
    var sbToggle = el("button", "fw-sidebar-toggle", "📋");
    var badge = el("span", "fw-badge", "0");
    badge.style.display = "none";
    sbToggle.appendChild(badge);
    sbToggle.addEventListener("click", function(e) {
      e.stopPropagation(); state.sidebarOpen = !state.sidebarOpen;
      $(".fw-sidebar").classList.toggle("open", state.sidebarOpen);
      if (!state.sidebarOpen) closeDetail();
    });
    root.appendChild(sbToggle);
    var sidebar = el("div", "fw-sidebar");
    sidebar.addEventListener("click", function(e) { e.stopPropagation(); });
    sidebar.addEventListener("mousedown", function(e) { e.stopPropagation(); });
    sidebar.innerHTML =
      '<div class="fw-sidebar-header"><div class="fw-sidebar-title"><span>📊 ' + escHtml(state.project) + "</span>" +
      '<button class="fw-sidebar-close">✕</button></div></div>' +
      (state.isAdmin ? '<div class="fw-projects"></div>' : "") +
      '<div class="fw-filters"></div>' +
      '<div class="fw-list"><div class="fw-loading"><div class="fw-spinner"></div></div></div>';
    sidebar.querySelector(".fw-sidebar-close").addEventListener("click", function() {
      state.sidebarOpen = false; sidebar.classList.remove("open"); closeDetail();
    });
    var filterContainer = sidebar.querySelector(".fw-filters");
    var filters = state.isAdmin
      ? [{ key: "todos", label: "Todos" }, { key: "pendientes", label: "⏳ Pendientes" }, { key: "dudas", label: "❓ Dudas" }, { key: "finalizados", label: "✅ Finalizados" }]
      : [{ key: "todos", label: "Todos" }, { key: "mios", label: "Míos" }, { key: "pendientes", label: "⏳ Pendientes" }, { key: "dudas", label: "❓ Dudas" }, { key: "finalizados", label: "✅ Finalizados" }];
    filters.forEach(function(f) {
      var btn = el("button", "fw-filter-btn" + (f.key === state.filter ? " active" : ""), f.label);
      btn.addEventListener("click", function() {
        state.filter = f.key;
        filterContainer.querySelectorAll(".fw-filter-btn").forEach(function(b) { b.classList.remove("active"); });
        btn.classList.add("active"); renderSidebar();
      });
      filterContainer.appendChild(btn);
    });
    root.appendChild(sidebar);
    var detail = el("div", "fw-detail");
    detail.addEventListener("click", function(e) { e.stopPropagation(); });
    detail.addEventListener("mousedown", function(e) { e.stopPropagation(); });
    detail.innerHTML =
      '<div class="fw-detail-header"><button class="fw-detail-back">← Volver</button><span class="fw-detail-status"></span></div>' +
      '<div class="fw-detail-body"></div><div class="fw-reply"></div>';
    detail.querySelector(".fw-detail-back").addEventListener("click", function() {
      closeDetail(); state.selectedComment = null; renderMarkers(); renderSidebar();
    });
    root.appendChild(detail);
    document.body.appendChild(root);
    document.addEventListener("click", onDocumentClick, true);
    document.addEventListener("mousedown", onDocumentMouseDown, true);
    document.addEventListener("mousemove", onDocumentMouseMove);
    document.addEventListener("mouseup", onDocumentMouseUp, true);
    document.addEventListener("keydown", function(e) {
      if (e.key === "Escape") {
        if (pendingForm) { pendingForm.remove(); pendingForm = null; state.formOpen = false; return; }
        if (state.detailOpen) { closeDetail(); state.selectedComment = null; renderMarkers(); renderSidebar(); return; }
        if (state.sidebarOpen) { state.sidebarOpen = false; $(".fw-sidebar").classList.remove("open"); return; }
        if (state.active) { state.active = false; updateToggle(); }
      }
    });
    setInterval(function() {
      var pending = state.comments.filter(function(c) {
        if (c.status === "aprobado") return false;
        if (state.isAdmin) return true;
        return c.user === state.currentUser;
      }).length;
      var b = $(".fw-sidebar-toggle .fw-badge");
      if (b) { b.textContent = pending; b.style.display = pending > 0 ? "flex" : "none"; }
    }, 1000);
  }

  return { init: init };
})();
