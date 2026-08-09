import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function BrandsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["admin-brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addBrandMutation = useMutation({
    mutationFn: async () => {
      const brandSlug = slug.trim() || name.trim().toLowerCase().replace(/\s+/g, "-");
      const { error } = await supabase.from("brands").insert([{ name, slug: brandSlug, logo_url: logoUrl || null }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      setName("");
      setSlug("");
      setLogoUrl("");
      toast({ title: "تمت إضافة الماركة بنجاح" });
    },
    onError: (err: any) => {
      toast({ title: "خطأ عند الإضافة", description: err.message, variant: "destructive" });
    },
  });

  const toggleBrandMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("brands").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
      queryClient.invalidateQueries({ queryKey: ["brands"] });
    },
  });

  const deleteBrandMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("brands").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast({ title: "تم حذف الماركة" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 bg-card space-y-4">
        <h3 className="font-semibold text-base">إضافة ماركة تجارية جديدة</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input placeholder="اسم الماركة (مثال: سامسونج)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="الرابط المختصر (Slug)" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <Input placeholder="رابط الشعار (Logo URL)" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
        </div>
        <Button
          onClick={() => addBrandMutation.mutate()}
          disabled={!name.trim() || addBrandMutation.isPending}
          className="gap-2"
        >
          {addBrandMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          إضافة الماركة
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الشعار</TableHead>
              <TableHead>الاسم</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>مفعلة</TableHead>
              <TableHead className="text-left">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">جاري التحميل...</TableCell>
              </TableRow>
            ) : brands.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">لا توجد ماركات حالياً</TableCell>
              </TableRow>
            ) : (
              brands.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    {b.logo_url ? (
                      <img src={b.logo_url} alt={b.name} className="h-8 w-12 object-contain" />
                    ) : (
                      <span className="text-xs text-muted-foreground">لا يوجد</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="text-xs font-mono">{b.slug}</TableCell>
                  <TableCell>
                    <Switch
                      checked={b.is_active}
                      onCheckedChange={(checked) => toggleBrandMutation.mutate({ id: b.id, is_active: checked })}
                    />
                  </TableCell>
                  <TableCell className="text-left">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteBrandMutation.mutate(b.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
    }
        
