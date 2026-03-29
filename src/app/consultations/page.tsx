import { AdminLayout } from "@/components/layout/admin-layout";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MessageSquare, Wifi, Refrigerator } from "lucide-react";
import { ConsultationsGrid } from "./consultations-grid";

export default async function ConsultationsPage() {
  const supabase = await createClient();
  const { data: consultations, error } = await supabase
    .from("consultations")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">상담 신청</h1>
          <p className="text-muted-foreground text-sm">
            고객 상담 신청 목록을 관리합니다.
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>전체 신청</CardDescription>
                <MessageSquare className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">
                {consultations?.length ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>인터넷TV</CardDescription>
                <Wifi className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">
                {consultations?.filter((c) => c.interest_internet).length ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>가전렌탈</CardDescription>
                <Refrigerator className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">
                {consultations?.filter((c) => c.interest_rental).length ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* AG Grid */}
        <Card>
          <CardHeader>
            <CardTitle>신청 목록</CardTitle>
            <CardDescription>
              총 {consultations?.length ?? 0}건의 상담 신청
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="text-sm text-destructive">
                데이터를 불러오는 중 오류가 발생했습니다.
              </p>
            ) : !consultations || consultations.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                아직 상담 신청이 없습니다.
              </p>
            ) : (
              <ConsultationsGrid data={consultations} />
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
