import { AdminLayout } from "@/components/layout/admin-layout";
import { createClient } from "@/lib/supabase/server";
import { CustomersGrid } from "./customers-grid";

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: customers, error } = await supabase
    .from("customers")
    .select("*, contracts(id, is_deleted)")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">고객관리</h1>
          <p className="text-muted-foreground text-sm">
            고객 목록을 관리합니다.
          </p>
        </div>

        {error ? (
          <p className="text-sm text-destructive">
            데이터를 불러오는 중 오류가 발생했습니다.
          </p>
        ) : (
          <CustomersGrid
            data={(customers ?? []).map(({ contracts, ...rest }) => ({
              ...rest,
              contract_count: Array.isArray(contracts)
                ? contracts.filter((c: { is_deleted: boolean }) => !c.is_deleted).length
                : 0,
            }))}
          />
        )}
      </div>
    </AdminLayout>
  );
}
