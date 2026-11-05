// تصميم التذكرة + توليد QR + التصدير PDF / صورة
(function () {
  const E = window.APP_CONFIG.EVENT;

  function qrSvg(text) {
    const qr = qrcode(0, "M");
    qr.addData(text); qr.make();
    const n = qr.getModuleCount(); let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg"><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#0a1a3f"/></svg>`;
  }

  const SCRUB = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="sgA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a8cf0"/><stop offset="1" stop-color="#2a55b8"/></linearGradient>
    <linearGradient id="sgB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs>
  <circle cx="100" cy="108" r="88" fill="#ffffff" fill-opacity=".06"/>
  <circle cx="100" cy="108" r="70" fill="#ffffff" fill-opacity=".05"/>
  <path d="M86 30 Q100 42 114 30 L100 72 Z" fill="#163a85"/>
  <path d="M64 38 L86 30 L100 72 L114 30 L136 38 L176 62 L160 100 L144 92 L146 178 Q100 186 54 178 L56 92 L40 100 L24 62 Z" fill="url(#sgA)" stroke="#143478" stroke-width="2" stroke-linejoin="round"/>
  <path d="M64 38 L86 30 L100 72 L114 30 L136 38 L150 46 Q100 70 50 46 Z" fill="url(#sgB)"/>
  <path d="M86 30 L100 72 L114 30" fill="none" stroke="#a9c8ff" stroke-opacity=".7" stroke-width="3" stroke-linejoin="round"/>
  <path d="M33 60 L48 95 M167 60 L152 95" stroke="#0f2d6b" stroke-opacity=".45" stroke-width="2.5"/>
  <path d="M56 92 Q60 66 64 40 M144 92 Q140 66 136 40" stroke="#0f2d6b" stroke-opacity=".25" stroke-width="1.5" fill="none"/>
  <rect x="117" y="86" width="5" height="20" rx="2.5" fill="#e8c27a"/>
  <rect x="124" y="89" width="4" height="16" rx="2" fill="#dfe8f8"/>
  <rect x="113" y="98" width="25" height="27" rx="3" fill="#2c5bc2" stroke="#cfe0ff" stroke-opacity=".5" stroke-width="2"/>
  <path d="M65 140 h27 v22 q0 4 -4 4 h-19 q-4 0 -4 -4z M108 140 h27 v22 q0 4 -4 4 h-19 q-4 0 -4 -4z" fill="none" stroke="#cfe0ff" stroke-opacity=".35" stroke-width="2"/>
  <g fill="none" stroke="#e9eff9" stroke-width="5" stroke-linecap="round">
    <path d="M84 34 C70 62 66 100 90 126"/>
    <path d="M116 34 C130 62 134 100 110 126"/>
    <path d="M90 126 Q100 134 110 126"/>
    <path d="M100 131 L100 145"/>
  </g>
  <circle cx="84" cy="33" r="4" fill="#e9eff9"/><circle cx="116" cy="33" r="4" fill="#e9eff9"/>
  <circle cx="100" cy="154" r="10" fill="#c7d3ea" stroke="#e9eff9" stroke-width="3"/>
  <circle cx="100" cy="154" r="4.5" fill="#8195bd"/>
  <path d="M168 22 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" fill="#fff" fill-opacity=".85"/>
  <path d="M30 150 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#9cc3ff" fill-opacity=".8"/>
</svg>`;

  const ECG = `<svg class="t-ecg" viewBox="0 0 300 30" preserveAspectRatio="none" aria-hidden="true"><polyline points="0,16 60,16 72,16 78,11 84,16 98,16 104,2 112,29 118,16 134,16 142,10 150,16 300,16" fill="none" stroke="#8fb6ff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="300" cy="16" r="3" fill="#cfe0ff"/></svg>`;

  const CROSS = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" fill="currentColor"/></svg>`;

  const KINDS = {
    regular: { badge: "", who: "اسم الطالب", foot: "ADMIT ONE · تذكرة دخول شخصية" },
    vip: { badge: "VIP", who: "اسم الضيف", foot: "VIP · شخصيات مهمة" },
    vvip: { badge: "VVIP", who: "اسم الضيف", foot: "VVIP · دعوة خاصة" }
  };

  function html(t) {
    const esc = U.esc, k = KINDS[t.kind] || KINDS.regular, guest = t.kind && t.kind !== "regular";
    const no = t.no || t.id;
    return `
<article class="ticket kind-${esc(t.kind || "regular")}" dir="rtl">
  ${k.badge ? `<div class="t-vip">${k.badge}</div>` : ""}
  <div class="t-top">
    <div class="t-pattern"></div>
    <div class="t-head">
      <div class="t-emblem">${CROSS}</div>
      <div class="t-uni"><b>${esc(E.university)}</b><span>${esc(E.department)}</span></div>
    </div>
    <div class="t-title-row">
      <div class="t-title">
        <div class="t-en">${esc(E.titleEn)}</div>
        <h2>حفلة<br><em>السكراب</em></h2>
        <div class="t-batch">${esc(E.batch)} · ${esc(E.batchEn)}</div>
      </div>
      <div class="t-art">${SCRUB}</div>
    </div>
    ${ECG}
    <div class="t-name"><span>${k.who}</span><strong>${esc(t.name)}</strong>${t.title ? `<em class="t-title-role">${esc(t.title)}</em>` : ""}</div>
    <div class="t-grid">
      ${guest ? `<div><span>نوع الدعوة</span><b>${k.badge}${t.kind === "vvip" ? " · خاصة جداً" : " · مهمة"}</b></div>` : `<div><span>المرحلة</span><b>${esc(E.stage.replace("المرحلة ", ""))}</b></div>`}
      <div><span>عدد التذاكر</span><b>${E.ticketsPerStudent} · تذكرة واحدة</b></div>
      <div><span>التاريخ</span><b>${esc(E.dateText)}${E.timeText ? " · " + esc(E.timeText) : ""}</b></div>
      <div><span>المكان</span><b>${esc(E.venue)} · ${esc(E.city)}</b></div>
    </div>
  </div>
  <div class="t-perf"></div>
  <div class="t-stub">
    <div class="t-qr">${qrSvg(E.qrPrefix + t.token)}</div>
    <div class="t-info">
      <span>رقم التذكرة</span><b class="t-no">№ ${U.no(no)}</b>
      <span>ممثل الدفعة</span><b>${esc(E.rep)}</b>
      <small>صالحة لشخص واحد ولدخول مرة واحدة. يرجى إبراز الهوية الجامعية عند البوابة.</small>
    </div>
  </div>
  <div class="t-foot">
    <span class="t-org"><i>${esc(E.organizerLabel || "ORGANIZED BY")}</i> <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18 5 7l4.5 4L12 5l2.5 6L19 7l2 11z" fill="currentColor"/></svg> <b>${esc(E.organizer || "")}</b></span>
    <span class="t-admit">${k.foot}</span>
    <span class="t-credit">DESIGNED BY MOHAMMED ASAAD AL-SAAD</span>
  </div>
  <div class="t-shine"></div>
</article>`;
  }

  async function toPng(el) {
    const opts = {
      pixelRatio: 3, cacheBust: false, backgroundColor: "#060f24",
      style: { transform: "none", margin: "0" },
      filter: n => !(n.classList && n.classList.contains("t-shine"))
    };
    await htmlToImage.toPng(el, opts);          // تحميل أولي للخطوط (مطلوب بسفاري)
    return htmlToImage.toPng(el, opts);
  }

  function fileName(t) { return (t.kind && t.kind !== "regular" ? "دعوة-" + t.kind.toUpperCase() + "-" : "تذكرة-") + "حفلة-السكراب-" + U.no(t.no || t.id); }

  async function downloadPng(el, t) {
    const url = await toPng(el);
    const a = document.createElement("a"); a.href = url; a.download = fileName(t) + ".png"; a.click();
  }

  async function downloadPdf(el, t) {
    const url = await toPng(el);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const w = 100, h = w * img.height / img.width, m = 8;
    const pdf = new jspdf.jsPDF({ unit: "mm", format: [w + m * 2, h + m * 2] });
    pdf.setFillColor(6, 15, 36); pdf.rect(0, 0, w + m * 2, h + m * 2, "F");
    pdf.addImage(url, "PNG", m, m, w, h);
    pdf.save(fileName(t) + ".pdf");
  }

  window.Ticket = { html, qrSvg, downloadPng, downloadPdf, SCRUB, CROSS, KINDS };
})();
