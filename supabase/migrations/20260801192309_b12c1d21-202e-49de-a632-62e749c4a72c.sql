-- ENUMS
CREATE TYPE public.app_role AS ENUM ('customer','vendor','admin');
CREATE TYPE public.order_status AS ENUM ('pending','confirmed','processing','shipped','delivered','cancelled');

-- CATEGORIES
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'Shirt',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_public_read" ON public.categories FOR SELECT TO anon, authenticated USING (true);

-- VENDORS
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL DEFAULT 'صنعاء',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vendors TO anon, authenticated;
GRANT ALL ON public.vendors TO service_role;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendors_public_read" ON public.vendors FOR SELECT TO anon, authenticated USING (true);

-- PRODUCTS
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric(12,2) NOT NULL,
  old_price numeric(12,2),
  rating numeric(2,1) NOT NULL DEFAULT 0,
  reviews_count int NOT NULL DEFAULT 0,
  sales_count int NOT NULL DEFAULT 0,
  city text NOT NULL DEFAULT 'صنعاء',
  images text[] NOT NULL DEFAULT '{}',
  sizes text[] NOT NULL DEFAULT '{}',
  colors text[] NOT NULL DEFAULT '{}',
  badge text,
  is_local boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_public_read" ON public.products FOR SELECT TO anon, authenticated USING (is_active);
CREATE INDEX products_category_idx ON public.products(category_id);

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text,
  wallet_balance numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_own_read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_own_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_own_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- USER ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'customer',
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_own_read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- REVIEWS
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT 'مستخدم',
  rating int NOT NULL DEFAULT 5,
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_public_read" ON public.reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "reviews_own_insert" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_own_update" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_own_delete" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ADDRESSES
CREATE TABLE public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'المنزل',
  recipient_name text NOT NULL,
  phone text NOT NULL,
  city text NOT NULL,
  district text NOT NULL DEFAULT '',
  details text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "addresses_own_all" ON public.addresses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- CART
CREATE TABLE public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity int NOT NULL DEFAULT 1,
  size text,
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id, size, color)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cart_own_all" ON public.cart_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ORDERS
CREATE SEQUENCE public.order_number_seq START 1001;
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number text NOT NULL UNIQUE DEFAULT ('TSK-' || nextval('public.order_number_seq')::text),
  status public.order_status NOT NULL DEFAULT 'pending',
  total numeric(12,2) NOT NULL DEFAULT 0,
  shipping_name text NOT NULL DEFAULT '',
  shipping_phone text NOT NULL DEFAULT '',
  shipping_city text NOT NULL DEFAULT '',
  shipping_details text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT USAGE ON SEQUENCE public.order_number_seq TO authenticated, service_role;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_own_read" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "orders_own_insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_image text NOT NULL DEFAULT '',
  unit_price numeric(12,2) NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  size text,
  color text
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_own_read" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "order_items_own_insert" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

-- NEW USER TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SEED CATEGORIES
INSERT INTO public.categories (slug, name, icon, sort_order) VALUES
  ('fashion','أزياء','Shirt',1),
  ('electronics','إلكترونيات','Smartphone',2),
  ('home','منزل ومطبخ','CookingPot',3),
  ('beauty','جمال وعناية','Sparkles',4),
  ('grocery','مواد غذائية','ShoppingBasket',5),
  ('accessories','إكسسوارات','Watch',6),
  ('furniture','أثاث وديكور','Lamp',7),
  ('local','منتجات يمنية','Landmark',8);

-- SEED VENDORS
INSERT INTO public.vendors (name, city) VALUES
  ('متجر الأناقة','صنعاء'),
  ('تك ستور','عدن'),
  ('بيت العسل الدوعني','حضرموت'),
  ('حرف تعز','تعز');

-- SEED PRODUCTS
INSERT INTO public.products (category_id, vendor_id, name, description, price, old_price, rating, reviews_count, sales_count, city, images, sizes, colors, badge, is_local)
SELECT c.id, v.id, p.name, p.description, p.price, p.old_price, p.rating, p.reviews_count, p.sales_count, p.city, p.images, p.sizes, p.colors, p.badge, p.is_local
FROM (VALUES
  ('fashion','متجر الأناقة','عباية مطرزة فخمة – قماش كريب','عباية نسائية أنيقة من قماش الكريب الفاخر، تطريز يدوي على الأكمام، خفيفة ومناسبة لجميع المناسبات. قابلة للغسل في الغسالة ولا تحتاج كي.',18500,24000,4.8,126,420,'صنعاء',ARRAY['/products/p-abaya.jpg','/products/p-craft.jpg'],ARRAY['S','M','L','XL'],ARRAY['أسود','كحلي','بني'],'خصم ٢٣٪',false),
  ('fashion','متجر الأناقة','قميص رجالي كلاسيكي قطن ١٠٠٪','قميص رجالي من القطن المصري الخالص، قصة كلاسيكية مريحة، مناسب للعمل والمناسبات الرسمية.',9500,12000,4.5,63,310,'عدن',ARRAY['/products/p-abaya.jpg'],ARRAY['M','L','XL','XXL'],ARRAY['أبيض','أزرق فاتح'],NULL,false),
  ('fashion','متجر الأناقة','فستان صيفي مطبوع','فستان صيفي خفيف بنقشة زهرية، قماش تنفسي مناسب للجو الحار.',13000,NULL,4.4,38,150,'الحديدة',ARRAY['/products/p-abaya.jpg'],ARRAY['S','M','L'],ARRAY['وردي','أخضر'],'جديد',false),
  ('electronics','تك ستور','سماعة بلوتوث لاسلكية عازلة للضوضاء','سماعة رأس لاسلكية بتقنية عزل الضوضاء النشط، بطارية تدوم ٣٠ ساعة، جودة صوت عالية الدقة مع ميكروفون مدمج للمكالمات.',32000,39000,4.6,89,560,'عدن',ARRAY['/products/p-headphones.jpg'],ARRAY[]::text[],ARRAY['أسود','أبيض'],'الأكثر طلبًا',false),
  ('electronics','تك ستور','شاحن سريع ٦٥ واط بثلاث مخارج','شاحن جداري بتقنية GaN، ٦٥ واط، يشحن الجوال واللابتوب معًا، حماية من الحرارة الزائدة.',11500,14000,4.7,72,340,'صنعاء',ARRAY['/products/p-headphones.jpg'],ARRAY[]::text[],ARRAY['أسود'],NULL,false),
  ('electronics','تك ستور','ساعة ذكية رياضية','ساعة ذكية بشاشة AMOLED، قياس نبضات القلب والأكسجين، مقاومة للماء، بطارية ٧ أيام.',27000,33000,4.3,45,210,'عدن',ARRAY['/products/p-headphones.jpg'],ARRAY[]::text[],ARRAY['أسود','فضي'],'خصم ١٨٪',false),
  ('home','متجر الأناقة','طقم أواني طهي غير لاصق – ٦ قطع','طقم أواني طهي مكوّن من ٦ قطع بطبقة داخلية غير لاصقة، مقابض مقاومة للحرارة، مناسب لجميع أنواع المواقد.',45000,NULL,4.7,54,180,'صنعاء',ARRAY['/products/p-cookware.jpg'],ARRAY[]::text[],ARRAY['رمادي','أحمر'],NULL,false),
  ('home','متجر الأناقة','غلاية كهربائية ستانلس ١.٨ لتر','غلاية ماء كهربائية سريعة، إيقاف تلقائي، جسم ستانلس ستيل مقاوم للصدأ.',8900,10500,4.5,88,260,'تعز',ARRAY['/products/p-cookware.jpg'],ARRAY[]::text[],ARRAY['فضي'],NULL,false),
  ('home','متجر الأناقة','طقم أكواب شاي زجاجي – ١٢ قطعة','أكواب شاي زجاجية شفافة مقاومة للحرارة، تصميم أنيق للضيافة اليمنية.',6500,NULL,4.6,31,120,'صنعاء',ARRAY['/products/p-cookware.jpg'],ARRAY[]::text[],ARRAY[]::text[],NULL,false),
  ('beauty','متجر الأناقة','سيروم مرطب للوجه بفيتامين سي','سيروم مركّز بفيتامين سي وحمض الهيالورونيك، يوحّد لون البشرة ويمنحها نضارة، مناسب لجميع أنواع البشرة.',9800,12500,4.9,211,730,'عدن',ARRAY['/products/p-serum.jpg'],ARRAY[]::text[],ARRAY[]::text[],'جديد',false),
  ('beauty','متجر الأناقة','كريم واقي شمس SPF 50','واقي شمس خفيف لا يترك أثرًا أبيض، حماية عالية من الأشعة فوق البنفسجية.',7200,NULL,4.6,96,290,'صنعاء',ARRAY['/products/p-serum.jpg'],ARRAY[]::text[],ARRAY[]::text[],NULL,false),
  ('beauty','متجر الأناقة','زيت أرغان طبيعي للشعر','زيت أرغان نقي ١٠٠٪ لتغذية الشعر وتقليل التقصف، بدون مواد حافظة.',5400,6800,4.7,140,410,'تعز',ARRAY['/products/p-serum.jpg'],ARRAY[]::text[],ARRAY[]::text[],'خصم ٢٠٪',false),
  ('grocery','بيت العسل الدوعني','عسل سدر دوعني أصلي – ١ كجم','عسل سدر دوعني أصلي من وادي دوعن بحضرموت، مقطوف هذا الموسم، مفحوص مخبريًا، يأتي بشهادة أصالة.',55000,NULL,5.0,342,890,'حضرموت',ARRAY['/products/p-honey.jpg'],ARRAY['٥٠٠ جرام','١ كجم'],ARRAY[]::text[],'حضرموت',true),
  ('grocery','بيت العسل الدوعني','قهوة يمنية خولاني مطحونة – ٥٠٠ جرام','قهوة خولانية من مرتفعات صعدة، تحميص وسط، نكهة غنية برائحة الفواكه.',16500,19000,4.8,127,470,'صعدة',ARRAY['/products/p-honey.jpg'],ARRAY['٢٥٠ جرام','٥٠٠ جرام'],ARRAY[]::text[],'محلي',true),
  ('grocery','بيت العسل الدوعني','زبيب يمني طبيعي – ١ كجم','زبيب يمني مجفف طبيعيًا بدون سكر مضاف أو مواد حافظة.',7800,NULL,4.6,58,190,'صنعاء',ARRAY['/products/p-honey.jpg'],ARRAY[]::text[],ARRAY[]::text[],NULL,true),
  ('accessories','حرف تعز','بخور عود يمني مع مبخرة نحاسية','بخور عود يمني فاخر مع مبخرة نحاسية مشغولة يدويًا، رائحة تدوم طويلًا، مثالي للمجالس والمناسبات.',14500,NULL,4.8,97,380,'صنعاء',ARRAY['/products/p-oud.jpg'],ARRAY[]::text[],ARRAY['نحاسي'],'صنعاء',true),
  ('accessories','حرف تعز','جنبية يمنية تقليدية للزينة','جنبية تقليدية مشغولة يدويًا بنقوش يمنية أصيلة، للزينة والهدايا التذكارية.',38000,45000,4.7,29,80,'صنعاء',ARRAY['/products/p-craft.jpg'],ARRAY[]::text[],ARRAY[]::text[],'حرف يدوية',true),
  ('furniture','حرف تعز','سلة خوص مصنوعة يدويًا بنقوش تقليدية','سلة خوص طبيعية مصنوعة يدويًا في تعز بنقوش يمنية تقليدية، متعددة الاستخدامات للتخزين أو الديكور.',7500,NULL,4.7,41,140,'تعز',ARRAY['/products/p-craft.jpg'],ARRAY['وسط','كبير'],ARRAY[]::text[],'حرف يدوية',true)
) AS p(cat, vend, name, description, price, old_price, rating, reviews_count, sales_count, city, images, sizes, colors, badge, is_local)
JOIN public.categories c ON c.slug = p.cat
JOIN public.vendors v ON v.name = p.vend;

-- SEED REVIEWS
INSERT INTO public.reviews (product_id, author_name, rating, comment)
SELECT p.id, r.author, r.rating, r.comment
FROM public.products p
JOIN (VALUES
  ('أم محمد',5,'المنتج وصل بحالة ممتازة وأسرع مما توقعت، جودة تستحق السعر.'),
  ('سامي ع.',4,'جيد جدًا بشكل عام، لكن التغليف كان يمكن أن يكون أفضل.'),
  ('فاطمة',5,'أنصح به بشدة، مطابق للوصف تمامًا.')
) AS r(author, rating, comment) ON true
WHERE p.reviews_count > 50;