import { AdminLayout } from "@/components/layout/admin-layout";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Wifi, Refrigerator } from "lucide-react";
import { UserAgentCell } from "./user-agent-cell";

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
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

        {/* 테이블 */}
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>연락처</TableHead>
                      <TableHead>관심 항목</TableHead>
                      <TableHead>유입 경로</TableHead>
                      <TableHead>지역</TableHead>
                      <TableHead>페이지</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>UA</TableHead>
                      <TableHead>신청일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consultations.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{formatPhone(c.phone)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {c.interest_internet && (
                              <Badge variant="secondary">인터넷TV</Badge>
                            )}
                            {c.interest_rental && (
                              <Badge variant="secondary">가전렌탈</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {c.utm_source ? (
                            <span className="text-xs text-muted-foreground">
                              {c.utm_source}
                              {c.utm_medium ? ` / ${c.utm_medium}` : ""}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              직접 유입
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {c.region ?? "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {c.page_url ?? "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {c.ip ?? "-"}
                        </TableCell>
                        <TableCell>
                          <UserAgentCell value={c.user_agent} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(c.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
