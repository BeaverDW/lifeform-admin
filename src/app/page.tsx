import { AdminLayout } from "@/components/layout/admin-layout";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Wifi, Refrigerator, Clock } from "lucide-react";

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatPhone(phone: string) {
  if (phone.length === 11) {
    return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
  }
  return phone;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: consultations } = await supabase
    .from("consultations")
    .select("*")
    .order("created_at", { ascending: false });

  const all = consultations ?? [];
  const today = all.filter(
    (c) =>
      new Date(c.created_at).toDateString() === new Date().toDateString()
  );
  const internetCount = all.filter((c) => c.interest_internet).length;
  const rentalCount = all.filter((c) => c.interest_rental).length;
  const recent = all.slice(0, 5);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">대시보드</h1>
          <p className="text-muted-foreground text-sm">
            상담 신청 현황을 한눈에 확인하세요. (테스트 업데이트)
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>전체 신청</CardDescription>
                <MessageSquare className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">{all.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>오늘 신청</CardDescription>
                <Clock className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">{today.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>인터넷TV</CardDescription>
                <Wifi className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">{internetCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>가전렌탈</CardDescription>
                <Refrigerator className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">{rentalCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* 최근 신청 */}
        <Card>
          <CardHeader>
            <CardTitle>최근 상담 신청</CardTitle>
            <CardDescription>최근 접수된 상담 신청 5건</CardDescription>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                아직 상담 신청이 없습니다.
              </p>
            ) : (
              <div className="space-y-4">
                {recent.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPhone(c.phone)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.interest_internet && (
                        <Badge variant="secondary">인터넷TV</Badge>
                      )}
                      {c.interest_rental && (
                        <Badge variant="secondary">가전렌탈</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(c.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
