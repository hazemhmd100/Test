# نشر الموقع على الإنترنت

هذا المشروع يحتاج استضافة Node.js لأن السيرفر يخفي مفتاح Supabase السري.
لا ترفعه كملفات HTML فقط على GitHub Pages أو Netlify static، لأن قاعدة البيانات تحتاج `server.cjs`.

## Render

1. ارفع مجلد المشروع إلى GitHub.
2. افتح Render واعمل `New Web Service`.
3. اختر مستودع المشروع.
4. استخدم هذه الإعدادات:
   - Build Command: اتركها فارغة أو `npm install`
   - Start Command: `npm start`
   - Environment: Node
5. أضف Environment Variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_TABLE=sales_app_data`
   - `HOST=0.0.0.0`
6. اضغط Deploy.

بعد النشر يعطيك Render رابط عام مثل:
`https://your-app-name.onrender.com`

## مهم

- لا ترفع ملف `.env`.
- لا تشارك `SUPABASE_SERVICE_ROLE_KEY`.
- ملف `.gitignore` يمنع رفع `.env` و `database.json`.
- عند فتح الرابط العام، كل الأجهزة ستقرأ وتكتب في Supabase.

## الدخول

تمت إزالة صفحة تسجيل الدخول. الموقع يفتح مباشرة بصلاحيات مدير كاملة.
