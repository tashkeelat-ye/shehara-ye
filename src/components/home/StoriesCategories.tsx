import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type CategoryStory = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  badge: string | null;
  is_story_featured: boolean;
};

export function StoriesCategories() {
  const [categories, setCategories] = useState<CategoryStory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStories() {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("id, name, slug, icon, badge, is_story_featured")
          .eq("is_story_featured", true)
          .order("sort_order", { ascending: true });

        if (!error && data) {
          setCategories(data as CategoryStory[]);
        }
      } catch (err) {
        console.warn("Could not load story categories:", err);
      } finally {
        setLoading(false);
      }
    }

    void fetchStories();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-4 px-4 py-4 overflow-x-auto no-scrollbar">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex flex-col items-center gap-2 shrink-0">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="py-4 border-b bg-background/50 backdrop-blur-sm">
      <div className="flex items-center gap-4 px-4 overflow-x-auto no-scrollbar scroll-smooth">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={`/category/${cat.slug}`}
            className="group flex flex-col items-center gap-1.5 shrink-0 transition-transform active:scale-95"
          >
            {/* الإطار المتدرج حول القصة */}
            <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-primary via-accent to-primary/40 group-hover:from-primary group-hover:to-accent">
              <div className="p-0.5 bg-background rounded-full">
                <Avatar className="h-14 w-14 sm:h-16 sm:w-16">
                  <AvatarImage src={cat.icon} alt={cat.name} className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                    {cat.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* شارة التنبيه على الستوري */}
              {cat.badge && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 text-[9px] px-1.5 py-0 h-4 rounded-full border-2 border-background font-bold leading-none"
                >
                  {cat.badge}
                </Badge>
              )}
            </div>

            {/* اسم التصنيف */}
            <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors max-w-[68px] truncate text-center">
              {cat.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
