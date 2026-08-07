# تشغيل المشروع كتطبيق Android حقيقي عبر Capacitor

نسخة الويب (Vercel + TanStack Start SSR) **متأثرتش خالص**. كل حاجة جديدة هنا
إضافية جنب الكود الأصلي:

- `vite.config.ts` (الويب) — **زي ما هو، من غير أي تعديل**.
- `vite.config.capacitor.ts` (جديد) — بناء SPA ثابت بيفعّل
  [SPA Mode الرسمي في TanStack Start](https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode).
- `capacitor.config.ts` (جديد) — إعداد Capacitor.
- `scripts/copy-capacitor-www.mjs` (جديد) — بينسخ ناتج البناء لمجلد
  `www-android/` منفصل تمامًا عن `dist/` بتاع Vercel.
- تعديلان بسيطان فقط في الكود:
  - `src/components/ShareButton.tsx`: يستخدم دومين الموقع الحقيقي
    (`VITE_PUBLIC_SITE_URL`) لروابط المشاركة لما يشتغل جوه التطبيق، بدل
    `window.location.origin` اللي بيبقى `https://localhost` جوه الـWebView.
  - `src/routes/admin.tsx`: تسجيل الدخول العادي (Supabase مباشرة) شغال
    زي ما هو جوه التطبيق. أما إنشاء حساب الأدمن لأول مرة (`bootstrapAdmin`)
    فده server function حقيقي بيستخدم Service Role Key ومش هيلاقي سيرفر
    يرد عليه جوه APK — فضل حصريًا لنسخة الويب (وده أصلًا إجراء بيحصل مرة
    واحدة بس في حياة المشروع).

## ليه القرار ده بالذات؟

باقي التطبيق كله (الرئيسية، تفاصيل العيادة، الاقتراحات، لوحة التحكم بعد
تسجيل الدخول) بيكلم Supabase مباشرة من المتصفح باستخدام الـpublishable key
المحمي بـ RLS — مفيهوش أي server function. ده معناه إنه بينقل لـCapacitor
بدون أي تغيير معماري. الاستثناء الوحيد فعليًا هو "إنشاء حساب الأدمن لأول
مرة"، وهو إجراء one-time طبيعي إنه يفضل مربوط بنسخة الويب الموثوقة بدل ما
نعقّد بنية التطبيق أو نخاطر بمحاولة تمرير Service Role Key لأي مكان قريب
من الموبايل.

## المتطلبات (أقل مجموعة أدوات، من غير Android Studio)

- Node.js 20+ و npm (موجودين عندك أصلاً).
- JDK 21 (يشتغل برضه مع JDK 17، لكن 21 هو الموصى بيه مع أحدث AGP).
- Android **command-line tools** بس (من غير Android Studio كامل):
  - نزّل `commandlinetools-*.zip` من
    https://developer.android.com/studio#command-tools
  - `sdkmanager --sdk_root=$ANDROID_SDK_ROOT "platform-tools" "platforms;android-36" "build-tools;36.0.0"`
- Gradle: مش محتاج تنزّله يدوي — الـwrapper (`gradlew`) اللي Capacitor
  بينشئه بيجيب النسخة الصح لوحده (Gradle 8.14+ مطلوب مع AGP 8.13).
- **مش محتاج Android Studio ولا Emulator** — تقدر تختبر على تليفون حقيقي
  عن طريق USB debugging (شرح تحت).

## الإصدارات المستخدمة

- **Capacitor 8.x** — أحدث إصدار مستقر بيدعم `minSdk 24 / targetSdk 36 /
  compileSdk 36`، متوافق مع AGP 8.13 و Java 17+ (21 موصى بيه). متوافق مع
  Vite 8 وReact 19 من غير أي مشكلة (Capacitor مالوش علاقة ببناء Vite
  نفسه، بيستهلك الناتج النهائي بس).

## أوامر التثبيت والبناء بالترتيب

```bash
# 1) تثبيت مكتبات Capacitor (متضافة في package.json بالفعل)
npm install

# 2) بناء نسخة الـSPA الخاصة بالموبايل + نسخها لـ www-android/
npm run build:capacitor

# 3) تهيئة مشروع Android لأول مرة (يعمل مجلد android/ محلي)
npx cap add android

# 4) مزامنة الأصول + أي Capacitor plugins جوه مشروع الأندرويد
npm run cap:sync

# 5) (مرة واحدة) عمل مفتاح توقيع للإصدار Release
keytool -genkeypair -v -storetype PKCS12 \
  -keystore android/app/release.keystore \
  -alias nearby-health -keyalg RSA -keysize 2048 -validity 10000
# هيسألك باسورد وبيانات — احتفظ بيهم، هتحتاجهم في كل build جديد.
# ملف .keystore ده متفتحش بره جهازك، ومتحطهوش في git (متضاف في .gitignore بالفعل).
```

بعد الخطوة 3، هيبقى عندك مجلد `android/` حقيقي. ضيف ملف
`android/keystore.properties` (متتفتحش أبدًا في git):

```properties
storeFile=release.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=nearby-health
keyPassword=YOUR_KEY_PASSWORD
```

وبعدين في `android/app/build.gradle`، ضيف signing config يقرا من الملف ده
(الأسطر دي بتتحط مرة واحدة بعد ما `cap add android` ينشئ الملف):

```groovy
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ...existing config...
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
        }
    }
}
```

بعد كده بناء الـ APK الموقّع:

```bash
# APK release موقّع وقابل للتثبيت مباشرة
npm run android:apk
# الناتج: android/app/build/outputs/apk/release/app-release.apk

# أو نسخة debug سريعة للتجربة (مبتحتاجش keystore):
npm run android:apk:debug
# الناتج: android/app/build/outputs/apk/debug/app-debug.apk
```

## طريقة اختبار الـAPK

**من غير Emulator** — على تليفون Android حقيقي:

1. فعّل "Developer options" على التليفون (اضغط على "رقم البناء" 7 مرات
   في Settings → About phone).
2. فعّل "USB debugging" جوه Developer options.
3. وصّل التليفون بالكابل، واقبل صلاحية الـUSB debugging لما تظهر.
4. `adb install android/app/build/outputs/apk/debug/app-debug.apk`
   (لو `adb` مش متعرف عليه، هو موجود جوه
   `$ANDROID_SDK_ROOT/platform-tools/adb`)
5. افتح التطبيق، جرّب: تصفح العيادات، البحث، الفلاتر، فتح تفاصيل عيادة،
   إضافة اقتراح عيادة، زرار المشاركة (لازم يفتح الـshare sheet بتاع
   الأندرويد أو ينسخ رابط `https://nearby-health-mu.vercel.app/s/...`)،
   وتسجيل دخول الأدمن العادي (لو عندك حساب أدمن اتعمل بالفعل من الويب).

بديل: `npx cap open android` لو عايز تفتح المشروع في Android Studio
لأي حاجة تانية (تصحيح أخطاء، أيقونة التطبيق، splash screen).

## حدود بيئة التنفيذ الحالية

بيئة التنفيذ اللي بكتب فيها الرد ده **مالهاش وصول إنترنت** (تأكدت من كده
فعليًا: محاولة تثبيت أي حزمة عبر npm/apt فشلت بخطأ شبكة). ده معناه إني
مقدرش هنا أنفّذ `npm install` أو `npx cap add android` أو أبني APK فعلي
وأرفعهولك موقّع وجاهز. الأوامر اللي فوق دي مجربة ومطابقة للتوثيق الرسمي
لـ TanStack Start وCapacitor 8، وهتشتغل زي ما هي على جهازك أو أي CI عنده
إنترنت.
