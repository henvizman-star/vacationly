# Northwind — מה למדנו ומה לוקחים ל־Vacationly

נבדק בתאריך 2026-09-15. מקור: `01 - Northwind/`.
מסמך זה מתאר את סקירת הכיתה ההיסטורית. המצב העדכני של Vacationly נמצא בסעיף 17 ב־PROJECT_MEMORY.md; יכולות ניהול, דוחות, AI/MCP ובדיקות MySQL נוספו מאז.
המשתמש ביקש ללמוד את פרויקט הכיתה ולהתחיל את Vacationly בגישה דומה. הממשק באנגלית לפי בחירתו.

## מסקנה

פרויקט הכיתה הוא אוסף לימודי רחב של Full Stack: SQL, MongoDB, CRUD, אימות, העלאת קבצים, React, Redux, AI, MCP, RAG, Socket.IO ובדיקות. המערכת שלנו תשתמש במבנה ובשיטות הרלוונטיים למטלה.

נבדקו קובצי המקור של השרת והלקוח, תצורות הבנייה, Docker Compose, מבנה הייצוא למסדים, קובצי הבדיקות ורכיבי הממשק. מסמכי מדיניות, מסד וקטורי וקובצי BSON הם נכסי דוגמה ל־RAG/MongoDB ואינם נדרשים ל־Vacationly. לא הועתקו ערכי `.env` מפרויקט הכיתה.

## 1. מבנה השרת והזרימה

```text
HTTP request
  → middleware: authentication / role
  → controller: parse input and return HTTP response
  → model/schema: validate data
  → service: business rules
  → DAL: parameterized SQL
  → MySQL
```

- `src/app.ts`: יצירת Express, רישום middleware, controllers ותחילת האזנה.
- `controllers/*-controller.ts`: מחלקה עם `router`, רישום נתיבים ופעולות קצרות.
- `services/*-service.ts`: מחלקות עם לוגיקה עסקית; מופע מיוצא לשימוש ב־controllers.
- `models/`: מודלים, סכימות Zod, תפקידים ושגיאות לקוח.
- `utils/dal.ts`: pool של MySQL, SQL עם placeholders ופעולה המחזירה Promise.
- `utils/cyber.ts`: גיבוב סיסמאות, יצירת JWT ובדיקת token.
- `utils/app-config.ts`: משתני סביבה דרך dotenv.
- `middleware/`: הרשאות, טיפול מרכזי בשגיאות, Helmet ו־rate limit.
- `smart-saver` ו־`express-fileupload`: העלאת תמונות ושמירת שם קובץ.
- MongoDB עם Mongoose משמש בין השאר ספקים ומכירות; MySQL משמש משתמשים, מוצרים והזמנות.

### מה כבר אימצנו

- אותן תיקיות `controllers/services/models/middleware/utils`.
- מחלקות שירות ומופעים מיוצאים.
- Express + TypeScript + Zod + dotenv + JWT.
- DAL ושאילתות עם ערכים נפרדים.
- MySQL למסד היחיד של הפרויקט, כהחלטת מימוש על סמך דוגמת הכיתה.
- תגובות HTTP ושגיאות JSON ברורות.
- `Role.Admin = 1`, `Role.User = 2` בכל שכבות המערכת.

### התאמות מכוונות

- DAL משתמש ב־`mysql2/promise`: אותו עיקרון מהכיתה, ללא עטיפה ידנית של callback.
- `server.ts` יוצר את האפליקציה; `app.ts` מפעיל את השרת. כך אפשר לבדוק נתיבים ללא האזנה קבועה או המתנה של 500ms.
- הסיסמאות נשמרות עם scrypt ו־salt אקראי לכל סיסמה. בכיתה מופיע HMAC עם salt משותף.
- token מכיל רק שדות משתמש ציבוריים. בשרת נבדק גם המשתמש הנוכחי במסד כדי לכבד שינוי תפקיד.
- אימייל ייחודי נאכף במסד, כולל מצב של שתי הרשמות בו־זמנית.
- נשמרת מדיניות המטלה: 4 תווים לפחות לסיסמה. דוגמת הכיתה מאפשרת 2.
- לא מסירים תגיות מתוך סיסמה או משנים אותה לפני אימות. בדוגמת הכיתה middleware של striptags פועל על כל שדה טקסט.
- נוצרה סכימת נתונים חדשה לחופשות; אין העתקה של הנתונים העסקיים של Northwind.

## 2. מבנה הלקוח והזרימה

```text
React component
  → service
  → Axios instance + Bearer token
  → Backend
  → component state / Redux user state
```

- `main.tsx`: React root, BrowserRouter ו־Redux Provider.
- `components/layout-area`: Layout, Header, Menu, Routing ו־Footer.
- חלוקה לפי תחום: `product-area`, `user-area`, `pages-area`, `shared-area`.
- רכיבי פונקציה, props, `useState`, `useEffect`.
- React Hook Form לטפסים.
- Axios בתוך מחלקות שירות.
- Redux Toolkit לנתונים משותפים ומידע על המשתמש.
- Axios interceptor להוספת Authorization.
- ניווט עם React Router.
- CSS נפרד ורכיבים רספונסיביים; בחלק מדוגמת הכיתה יש MUI.

### מה כבר אימצנו

- React עם Vite ו־TypeScript.
- `layout-area/user-area/vacation-area/pages-area/shared-area`.
- React Hook Form בטופסי כניסה והרשמה.
- מחלקות `UserService` ו־`VacationService`.
- Redux Toolkit למצב המשתמש.
- Axios instance עם interceptor.
- כרטיס חופשה שמקבל props; רשימה שנטענת דרך service.
- רכיב ניתוב מוגן ואודות ציבורי.
- ממשק באנגלית; עיצוב עצמאי בצבעי ירוק ושמנת.

### התאמות מכוונות

- בדוגמה צד השרת מחזיר `roleId` מספרי ואילו הלקוח בודק `role` מסוג string. אצלנו החוזה אחיד.
- בהפעלת האפליקציה נבדק token קיים מול `/api/me`, ולא מסתפקים ב־decode.
- Axios instance ייעודי ל־API שלנו מונע שליחת token לכל כתובת דרך interceptor גלובלי.
- רכיב `ProtectedRoute` מונע רינדור תוכן מוגן עבור אורח. דוגמת הכיתה מנווטת בתוך effect לאחר הרינדור.
- רשימת החופשות אינה נשמרת כמטמון גלובלי בלתי מוגבל. מצב Like שייך למשתמש, והתוצאות משתנות לפי מסנן ועמוד.
- סינון ומיון מתבצעים בשרת לפני Pagination.
- בקשות רשימה ישנות מתבטלות כאשר המשתמש משנה מסנן/עמוד.
- בעת עריכת טפסים בהמשך נשתמש ב־`reset`/API מתועד של React Hook Form; בקובץ הכיתה מופיע `setValues`, שלא נעתיק ללא אימות.
- טפסים מציגים קלט חובה, מגבלות והודעות שגיאה; כפתורי שליחה מושבתים בזמן בקשה.

## 3. AI, MCP ושאר הנושאים בכיתה

| נושא | מה מופיע בכיתה | שימוש ב־Vacationly |
| --- | --- | --- |
| GPT | שירות קריאות למודל | המלצות לפי יעד, בהמשך |
| MCP | server, register, tools להזמנות | אותה חלוקה עבור כלי חופשות, בהמשך |
| RAG | embedding, אחסון וקטורים וחיפוש במסמכי מדיניות | אינו נדרש במטלה |
| Socket.IO | צ׳אט ושידור הודעות | אינו נדרש במטלה |
| MongoDB | Mongoose, schemas, CRUD, virtual fields | לא נדרש לצד MySQL שנבחר |
| CAPTCHA | אימות reCAPTCHA בהרשמה | אינו נדרש במטלה |
| MUI | רכיבי טופס וערכת נושא | אופציונלי; כרגע CSS ורכיבי HTML |
| Mocha/Chai/Supertest | בדיקות שירות ו־API | בדיקות API עם Supertest ו־Node test runner |
| Vitest/Testing Library | בדיקות רכיבי React | אומץ בפרויקט החדש |
| Docker Compose | מסדים, שרת ולקוח | הוכן עבור MySQL, Backend ו־Frontend |

### נקודות להמשך AI/MCP

- `Frontend/src/services/gpt-service.ts` בכיתה יוצר לקוח OpenAI בדפדפן עם `dangerouslyAllowBrowser`.
- ב־Vacationly מפתח ספק ה־AI יישאר בשרת. לא מעתיקים מפתחות או כתובת ngrok מדוגמת הכיתה.
- דוגמת MCP בכיתה חושפת SSE וכלים להזמנות. אצלנו נבנה כלים לקריאה מחופשות, עם הרשאות מתאימות.
- נבחר transport של MCP לפי התיעוד והגרסה בזמן המימוש; לא נניח ששיתוף מופע שרת יחיד בין sessions הוא הדרך המתאימה.
- RAG, מסמכי שילוח והחזרות וצ׳אט Socket.IO לא יתווספו רק משום שהופיעו בכיתה.

## 4. שלב ראשון שנכתב

- Backend עם הרשמה, כניסה, בדיקת משתמש, רשימת חופשות ולייקים.
- סכימת SQL עם users, vacations, likes ונתוני אתחול ל־12 חופשות.
- אינדקסים, מפתחות זרים, מניעת לייק כפול ומחיקת קשרים בעת מחיקת חופשה.
- React: כניסה, הרשמה, כרטיסיות, מסננים, Pagination, יציאה, אודות ו־404.
- תמונות מקומיות ל־12 יעדים. מקורותיהן ב־`Backend/assets/image-sources.json`.
- Dockerfiles, Compose וסקריפט להגדרות מקומיות.
- בדיקות אוטומטיות ובדיקה בדפדפן עם API מדומה.

חשוב: MySQL/Docker אינם זמינים בסביבה שנבדקה. טרם בוצעה הרצה מלאה מול מסד אמיתי או בדיקת קונטיינרים. הסכימה ונתוני האתחול הם קבצים מוכנים לייבוא, לא מסד שכבר רץ.

## 5. המשך

1. הפעלת MySQL באמצעות Docker Desktop או התקנה קיימת ובדיקת זרימת הרשמה וחופשות מולו.
2. ממשק מנהל והעלאת תמונות עם כל כללי ההוספה/עריכה במטלה.
3. גרף ו־CSV.
4. המלצות AI ושרת MCP.
5. השלמת פרטי המתכנת באודות.
6. בדיקות קונטיינרים, ייצוא מסד אמיתי, אוסף Postman מלא, GitHub ואריזת הגשה.

## תיעוד טכני שנבדק

- [Express: טיפול בשגיאות](https://expressjs.com/en/guide/error-handling/)
- [MySQL2: שאילתות וחיבור למסד](https://sidorares.github.io/node-mysql2/docs)
- [Vite: הקמה והרצה](https://vite.dev/guide/)
- [React Hook Form: תיעוד הטפסים](https://github.com/react-hook-form/documentation/blob/master/src/content/faqs.mdx)
