# Tashkilat: Your Yemeni Shopping Hub

أريد بناء تطبيق ويب (PWA / Web App) للتسوق الإلكتروني باسم "تشكيلات" (Tashkilat)، 

موجه للسوق اليمني، بواجهة عربية بالكامل واتجاه RTL.



الهوية البصرية:

- الاسم: تشكيلات

- الشعار النصي: "كل ما تحتاجه... بتشكيلة واحدة"

- الألوان الأساسية: بنفسجي دافئ (Primary) مع لمسات ذهبية/كهرمانية (Accent)، 

  خلفية فاتحة نظيفة، تصميم عصري وبسيط يوحي بالفخامة والتنوع

- الخطوط: خط عربي واضح وحديث يدعم القراءة بسهولة (مثل Tajawal أو Cairo أو IBM Plex Arabic)

- الاتجاه: RTL بالكامل (Right to Left) لأن اللغة الأساسية هي العربية



المطلوب في هذه المرحلة الأولى:

1. صفحة رئيسية (Home) تحتوي على:

   - Header علوي ثابت فيه: شعار "تشكيلات"، حقل بحث، أيقونة سلة التسوق، أيقونة حساب المستخدم

   - قسم Banner/Slider ترويجي في الأعلى (عروض وخصومات)

   - قسم "تصفح حسب الفئة" بأيقونات دائرية للفئات (أزياء، إلكترونيات، منزل ومطبخ، 

     جمال وعناية، مواد غذائية، إكسسوارات، أثاث وديكور، منتجات يمنية محلية)

   - قسم "الأكثر مبيعًا" بشبكة منتجات (بطاقة منتج فيها صورة، اسم، سعر، تقييم نجوم، زر إضافة للسلة)

   - قسم "منتجات يمنية محلية" مميز بتصميم مختلف قليلاً (عسل، بخور، حرف يدوية)

   - Footer فيه روابط (من نحن، تواصل معنا، سياسة الاستبدال، تابعنا على وسائل التواصل)

2. Bottom Navigation Bar (شريط تنقل سفلي) للجوال فيه: الرئيسية، الفئات، السلة، المفضلة، حسابي

3. تصميم متجاوب بالكامل (Responsive) يعمل بشكل ممتاز على الجوال أولاً (Mobile-first) 

   لأن أغلب المستخدمين سيدخلون من الهاتف

4. استخدم بيانات وهمية (mock data) مؤقتة للمنتجات والفئات لعرض التصميم الآن، 

   سنربطها بقاعدة بيانات حقيقية لاحقًا



اجعل التصميم نظيفًا، سريع التحميل، وسهل الاستخدام لجميع الفئات العمرية 

(بعض المستخدمين ليسوا خبراء تقنيًا)، مع مراعاة أن بعض المستخدمين يملكون اتصال إنترنت بطيء 

لذا يفضل تصميم خفيف بدون عناصر ثقيلة غير ضرورية. أستخدم الخط المرفق في التطبيق

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/18fef08b-bce0-4117-9547-755ef1363b0e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
