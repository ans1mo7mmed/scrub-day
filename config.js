// =====================================================================
//  الإعدادات — هذا الملف الوحيد اللي تحتاج تعدّله
// =====================================================================
window.APP_CONFIG = {
  // من Supabase → Project Settings → API (أو Data API)
  // إذا تركتهم فارغين، الموقع يشتغل بـ"وضع تجريبي" على نفس الجهاز فقط
  SUPABASE_URL: "https://giskxbbjhcqlmdgjgyml.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_t_Lh384XOBiuWXMWj91Olw_r-DOzzVc",   // المفتاح العام (publishable) — آمن للنشر

  EVENT: {
    title: "حفلة السكراب",
    titleEn: "SCRUB DAY",
    university: "جامعة الفرقدين الأهلية",
    department: "قسم تقنيات التخدير والعناية المركزة",
    batch: "الدفعة الرابعة",
    batchEn: "BATCH IV",
    stage: "المرحلة الرابعة",
    dateText: "الجمعة 27 / 11 / 2026",
    dateShort: "الجمعة 27/11",
    timeText: "",                       // مثال: "4:00 عصراً" — اتركه فارغ إذا ما محدد
    startISO: "2026-11-27T16:00:00+03:00", // وقت بداية الحفلة للعدّاد التنازلي (توقيت العراق)
    venue: "ملعب الميناء",
    city: "البصرة",
    rep: "حسين جليل",
    organizer: "BASRA KING",          // شركة التنظيم
    organizerLabel: "ORGANIZED BY",
    ticketsPerStudent: 1,
    qrPrefix: "FRQ4:"
  }
};
