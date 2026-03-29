import { AdminLayout } from "@/components/layout/admin-layout";
import { createClient } from "@/lib/supabase/server";
import { ContractsGrid } from "./contracts-grid";

export default async function ContractsPage() {
  const supabase = await createClient();
  const { data: contracts, error } = await supabase
    .from("contracts")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">계약서</h1>
          <p className="text-muted-foreground text-sm">
            계약서 목록을 관리합니다.
          </p>
        </div>

        {error ? (
          <p className="text-sm text-destructive">
            데이터를 불러오는 중 오류가 발생했습니다.
          </p>
        ) : (
          <ContractsGrid data={contracts ?? []} />
        )}
      </div>
    </AdminLayout>
  );
}
