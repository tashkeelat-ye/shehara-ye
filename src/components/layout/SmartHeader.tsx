import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingBag, Heart, User, MapPin, Menu, X } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function SmartHeader() {
  const { count: cartCount, setDrawerOpen } = useCart();
  const { wishlistIds } = useWishlist();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("صنعاء");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* الشريط العلوي للتنقل والتخصيص */}
      <div className="container flex h-16 items-center justify-between gap-4 px-4">
        
        {/* اللوجو والزر الجانبي للشاشات الصغيرة */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <span>تشكيلات</span>
          </Link>
        </div>

        {/* محرك البحث السريع */}
        <form onSubmit={handleSearch} className="hidden flex-1 max-w-md md:flex relative">
          <Input
            type="search"
            placeholder="ابحث عن منتج، ماركة، أو فئة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 rounded-full border-muted-foreground/20 focus-visible:ring-primary"
          />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            className="absolute left-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
          >
            <Search className="h-4 w-4" />
          </Button>
        </form>

        {/* أدوات التحكم الجانبية */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* محدد المدينة */}
          <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-full border">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span>التوصيل إلى:</span>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-transparent font-medium text-foreground outline-none cursor-pointer"
            >
              <option value="صنعاء">صنعاء</option>
              <option value="عدن">عدن</option>
              <option value="تعز">تعز</option>
              <option value="المكلا">المكلا</option>
              <option value="إب">إب</option>
            </select>
          </div>

          {/* زر المفضلة */}
          <Link to="/wishlist">
            <Button variant="ghost" size="icon" className="relative">
              <Heart className="h-5 w-5" />
              {wishlistIds.length > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px]"
                >
                  {wishlistIds.length}
                </Badge>
              )}
            </Button>
          </Link>

          {/* زر السلة الجانبية */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setDrawerOpen(true)}
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <Badge
                className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground"
              >
                {cartCount}
              </Badge>
            )}
          </Button>

          {/* الحساب الشخصي */}
          <Link to={user ? "/profile" : "/auth"}>
            <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2 rounded-full">
              <User className="h-4 w-4" />
              <span>{user ? "حسابي" : "دخول"}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* حقل البحث للجوال فقط */}
      <div className="px-4 pb-3 md:hidden">
        <form onSubmit={handleSearch} className="relative">
          <Input
            type="search"
            placeholder="ابحث عن منتج..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 rounded-full text-sm"
          />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            className="absolute left-1 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
