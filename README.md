# 📊 استبيان الجاهزية للجمعيات الخيرية - شركة زاد

![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase)

منصة استبيان تفاعلية ومتطورة لتقييم مدى الجاهزية المؤسسية للجمعيات الخيرية، مصممة خصيصاً لمستشاري **شركة زاد**. تم بناء النظام ليفصل بين واجهة المستخدم العام (الجمعيات) ولوحة تحكم الإدارة الآمنة، مع حفظ البيانات سحابياً لضمان الموثوقية العالية.

---

## 🌟 الميزات الرئيسية

- 📝 **استبيان ديناميكي مقسّم لمحاور:** 10 محاور تقييم رئيسية و 64 سؤالاً يتم عرضها بشكل تدريجي مع مؤثرات انتقال سلسة (Transitions).
- 🔒 **بوابة إدارة محميّة:** نظام دخول آمن (Authentication) عبر `Middleware` خاص بموظفي الإدارة.
- 📊 **لوحة تحكم احترافية (Dashboard):** عرض شامل لجميع الجمعيات التي أتمت الاستبيان مع نتائج مفصلة لكل محور على حدة.
- ☁️ **قاعدة بيانات سحابية:** ربط متكامل مع **Supabase** (PostgreSQL) باستخدام **Prisma ORM** لحفظ وعرض البيانات بشكل دائم وتلقائي.
- 📱 **تصميم متجاوب وعصري:** واجهة مستخدم (UI/UX) مصممة بعناية باستخدام تقنية **Glassmorphism** مع التوافق التام مع شاشات الجوال والحاسوب.
- 🌐 **دعم كامل للغة العربية:** واجهات منسقة باتجاه (RTL) مع خطوط **Noto Kufi Arabic**.

---

## 🏗️ هيكلية المشروع (التوجيه السلس)

- **`/` (الصفحة الرئيسية):** بوابة تسجيل الدخول الآمنة لموظفي الإدارة.
- **`/survey`:** رابط الاستبيان العام المفتوح للجمعيات (بدون الحاجة لتسجيل الدخول).
- **`/dashboard`:** لوحة تحكم الإدارة (محمية) تعرض جدول الإحصائيات.
- **`/dashboard/[id]`:** صفحة تقرير مفصلة لكل جمعية تظهر درجة كل محور وتفاصيل الإجابات بدقة.

---

## 🚀 التشغيل المحلي (للمطورين)

### 1️⃣ المتطلبات المسبقة
تأكد من وجود البرامج التالية على جهازك:
- [Node.js](https://nodejs.org/en/) (الإصدار 18+)
- [Git](https://git-scm.com/)

### 2️⃣ خطوات التثبيت

1. قم بنسخ المستودع:
   ```bash
   git clone https://github.com/khaledsh18/zad_survey.git
   cd zad_survey
   ```

2. قم بتثبيت الحزم:
   ```bash
   npm install
   ```

3. قم بإعداد متغيرات البيئة `.env`:
   انسخ ملف `.env.example` (إن وجد) أو أنشئ ملف `.env` وضع فيه:
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_SUPABASE_PROJECT.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"
   DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_SUPABASE_PROJECT.supabase.co:5432/postgres"
   ADMIN_PASSWORD="ZadAdmin2026"
   ```

4. مزامنة قاعدة البيانات (Prisma):
   ```bash
   npx prisma generate
   ```

5. تشغيل بيئة التطوير:
   ```bash
   npm run dev
   ```

> الموقع سيعمل الآن على الرابط: `http://localhost:3000`

---

## 💻 التقنيات المستخدمة
- **إطار العمل:** Next.js (App Router)
- **لغة البرمجة:** TypeScript
- **تنسيق الواجهات:** Tailwind CSS v4
- **قاعدة البيانات:** PostgreSQL (مستضافة على Supabase)
- **مُدير البيانات (ORM):** Prisma
- **الخطوط:** Google Fonts (`next/font/google`)

---
**تطوير:** تم البناء بأعلى معايير جودة الويب الحديثة، لضمان استقرار التطبيق وقابلية التوسع مستقبلاً.
