# نشر تجريبي آمن — CHICO Next Generation

- ابدأ في فرع Git جديد مثل `chico-next-generation` داخل المستودع الحالي أو مستودع منفصل.
- **لا تكتب فوق كود فرع `main` قبل الاعتماد.**
- شغّل `npm install && npm run typecheck && npm run test:rules && npm run build`.
- استخدم Supabase Test منفصلًا إذا أمكن. نفّذ `db/001_chico_next.sql` في المشروع التجريبي، وليس قاعدة الفريق الحالية مباشرة.
- أضف `DATABASE_URL`, `CHICO_OWNER_PASSWORD`, `CHICO_SESSION_SECRET` إلى Preview Environment في مشروع Vercel التجريبي.
- تأكد من Framework = Next.js وRoot Directory = مجلد المشروع الجديد، ولا تستخدم قواعد `rewrites` الخاصة بإصدار Python.
- تحقق من `/api/health` ثم `/api/auth` ثم جرب الدخول، إضافة اسم تجريبي، قراءة تجريبية وحذفها من **قاعدة اختبار فقط**.
- راجع لقطات الكمبيوتر والموبايل، الاستيراد ومطابقة الأسماء، وتقرير Discord.
- فقط بعد اجتياز الاختبارات ومراجعة البيانات الحقيقية يمكن نقل المشروع إلى Production.
- أي تحديث للبيئة على Vercel يحتاج Deployment جديدًا؛ لا تنسخ الأسرار داخل Git.
