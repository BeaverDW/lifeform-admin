"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  type ColDef,
  type GridApi,
  type IRowNode,
} from "ag-grid-community";
import { createClient } from "@/lib/supabase/client";
import { FileSpreadsheet, Plus, Printer, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function formatPhone(phone: string) {
  if (phone.length === 11) {
    return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
  }
  if (phone.length === 10) {
    if (phone.startsWith("02")) {
      return `${phone.slice(0, 2)}-${phone.slice(2, 6)}-${phone.slice(6)}`;
    }
    return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
  }
  if (phone.length === 9 && phone.startsWith("02")) {
    return `${phone.slice(0, 2)}-${phone.slice(2, 5)}-${phone.slice(5)}`;
  }
  if (phone.length === 8 && /^1[0-9]{3}/.test(phone)) {
    return `${phone.slice(0, 4)}-${phone.slice(4)}`;
  }
  return phone;
}

function validatePhone(phone: string): string | null {
  if (!phone) return "전화번호를 입력해주세요.";

  // 휴대폰: 010 + 8자리
  if (/^010\d{8}$/.test(phone)) return null;
  // 인터넷전화: 070 + 8자리
  if (/^070\d{8}$/.test(phone)) return null;
  // 서울 유선: 02 + 7~8자리
  if (/^02\d{7,8}$/.test(phone)) return null;
  // 지방 유선: 0(31~64) + 7~8자리
  if (/^0[3-6][1-4]\d{7,8}$/.test(phone)) return null;
  // 대표번호: 15xx, 16xx, 18xx + 4자리
  if (/^1[5689]\d{2}\d{4}$/.test(phone)) return null;

  return "올바른 전화번호 형식이 아닙니다.";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

interface Filters {
  customerName: string;
  phone: string;
  hasContract: "" | "Y" | "N";
}

export function CustomersGrid({ data }: { data: Record<string, unknown>[] }) {
  const router = useRouter();
  const gridRef = useRef<GridApi | null>(null);

  const [filters, setFilters] = useState<Filters>({
    customerName: "",
    phone: "",
    hasContract: "",
  });

  const [filteredCount, setFilteredCount] = useState(data.length);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Record<string, unknown> | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const updateFilter = useCallback(
    (key: keyof Filters, value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setTimeout(() => gridRef.current?.onFilterChanged(), 0);
    },
    []
  );

  const recalcCount = useCallback(() => {
    const api = gridRef.current;
    if (!api) return;
    let count = 0;
    api.forEachNodeAfterFilter((node) => {
      if (node.data) count++;
    });
    setFilteredCount(count);
  }, []);

  const handleCreate = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setSubmitting(true);

      const formData = new FormData(e.currentTarget);
      const name = (formData.get("name") as string).trim();
      const phone = (formData.get("phone") as string).replace(/\D/g, "");
      const memo = (formData.get("memo") as string).trim();

      if (!name) {
        toast.error("고객명을 입력해주세요.");
        setSubmitting(false);
        return;
      }

      const phoneError = validatePhone(phone);
      if (phoneError) {
        toast.error(phoneError);
        setSubmitting(false);
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.from("customers").insert({
        name,
        phone,
        memo: memo || null,
      });

      setSubmitting(false);

      if (error) {
        toast.error("등록 중 오류가 발생했습니다.");
        return;
      }

      toast.success("고객이 등록되었습니다.");
      setDialogOpen(false);
      router.refresh();
    },
    [router]
  );

  const handleUpdate = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!editTarget?.id) return;
      setSubmitting(true);

      const formData = new FormData(e.currentTarget);
      const name = (formData.get("name") as string).trim();
      const phone = (formData.get("phone") as string).replace(/\D/g, "");
      const memo = (formData.get("memo") as string).trim();

      if (!name) {
        toast.error("고객명을 입력해주세요.");
        setSubmitting(false);
        return;
      }

      const phoneError = validatePhone(phone);
      if (phoneError) {
        toast.error(phoneError);
        setSubmitting(false);
        return;
      }

      const supabase = createClient();
      const { error } = await supabase
        .from("customers")
        .update({
          name,
          phone,
          memo: memo || null,
        })
        .eq("id", editTarget.id);

      setSubmitting(false);

      if (error) {
        toast.error("수정 중 오류가 발생했습니다.");
        return;
      }

      toast.success("고객 정보가 수정되었습니다.");
      setEditDialogOpen(false);
      setEditTarget(null);
      router.refresh();
    },
    [editTarget, router]
  );

  const exportExcel = useCallback(() => {
    const api = gridRef.current;
    if (!api) return;
    const rows: Record<string, unknown>[] = [];
    api.forEachNodeAfterFilter((node) => {
      if (node.data) {
        const d = node.data;
        rows.push({
          "고객명": d.name ?? "",
          "전화번호": d.phone ? formatPhone(String(d.phone)) : "",
          "계약건수": d.contract_count ?? 0,
          "메모": d.memo ?? "",
          "등록일": d.created_at ? formatDate(d.created_at) : "",
          "수정일": d.updated_at ? formatDate(d.updated_at) : "",
        });
      }
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "고객목록");
    XLSX.writeFile(wb, `고객목록_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, []);

  const printTable = useCallback(() => {
    const api = gridRef.current;
    if (!api) return;
    const rows: Record<string, unknown>[] = [];
    api.forEachNodeAfterFilter((node) => {
      if (node.data) rows.push(node.data);
    });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>고객목록</title>
<style>
  body { font-family: 'Malgun Gothic', sans-serif; font-size: 11px; margin: 20px; }
  h2 { text-align: center; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #333; padding: 4px 6px; }
  th { background: #f0f0f0; }
  td.center { text-align: center; }
  @media print { body { margin: 0; } }
</style></head><body>
<h2>고객 목록 (${rows.length}건)</h2>
<table><thead><tr>
  <th>고객명</th><th>전화번호</th><th>계약건수</th><th>메모</th><th>등록일</th><th>수정일</th>
</tr></thead><tbody>
${rows.map((d) => `<tr>
  <td>${d.name ?? ""}</td>
  <td class="center">${d.phone ? formatPhone(String(d.phone)) : ""}</td>
  <td class="center">${d.contract_count ?? 0}</td>
  <td>${d.memo ?? ""}</td>
  <td class="center">${d.created_at ? formatDate(String(d.created_at)) : ""}</td>
  <td class="center">${d.updated_at ? formatDate(String(d.updated_at)) : ""}</td>
</tr>`).join("")}
</tbody></table></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.print();
  }, []);

  const confirmDelete = useCallback(() => {
    const api = gridRef.current;
    if (!api) return;
    const selected = api.getSelectedRows();
    if (selected.length === 0) {
      toast.error("삭제할 행을 선택해주세요.");
      return;
    }
    setDeleteDialogOpen(true);
  }, []);

  const executeDelete = useCallback(async () => {
    const api = gridRef.current;
    if (!api) return;
    const selected = api.getSelectedRows();
    const ids = selected.map((row) => row.id).filter(Boolean);
    if (ids.length === 0) return;

    const supabase = createClient();

    const { error: custError } = await supabase
      .from("customers")
      .update({ is_deleted: true })
      .in("id", ids);

    if (custError) {
      toast.error("삭제 중 오류가 발생했습니다.");
      return;
    }

    const { error: contError } = await supabase
      .from("contracts")
      .update({ is_deleted: true })
      .in("customer_id", ids);

    if (contError) {
      toast.error("연결된 계약 삭제 중 오류가 발생했습니다.");
      return;
    }

    toast.success(`${ids.length}건이 삭제되었습니다.`);
    setDeleteDialogOpen(false);
    router.refresh();
  }, [router]);

  const isExternalFilterPresent = useCallback(() => {
    return !!(filters.customerName || filters.phone || filters.hasContract);
  }, [filters]);

  const doesExternalFilterPass = useCallback(
    (node: IRowNode) => {
      const d = node.data;
      if (!d) return false;

      if (filters.customerName) {
        if (
          !String(d.name ?? "")
            .toLowerCase()
            .includes(filters.customerName.toLowerCase())
        )
          return false;
      }
      if (filters.phone) {
        if (!String(d.phone ?? "").includes(filters.phone)) return false;
      }
      if (filters.hasContract === "Y") {
        if (Number(d.contract_count ?? 0) === 0) return false;
      } else if (filters.hasContract === "N") {
        if (Number(d.contract_count ?? 0) > 0) return false;
      }

      return true;
    },
    [filters]
  );

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerCheckboxSelection: true,
        checkboxSelection: true,
        width: 50,
        pinned: "left",
        sortable: false,
        filter: false,
        resizable: false,
        editable: false,
      },
      {
        field: "name",
        headerName: "고객명",
        width: 120,
      },
      {
        field: "phone",
        headerName: "전화번호",
        width: 150,
        cellStyle: { textAlign: "center" },
        valueFormatter: (p) => (p.value ? formatPhone(p.value) : ""),
      },
      {
        field: "contract_count",
        headerName: "계약건수",
        width: 100,
        cellStyle: { textAlign: "center" },
      },
      {
        field: "memo",
        headerName: "메모",
        flex: 1,
        minWidth: 200,
        tooltipField: "memo",
        cellStyle: {
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        } as Record<string, string>,
      },
      {
        field: "created_at",
        headerName: "등록일",
        width: 130,
        cellStyle: { textAlign: "center" },
        valueFormatter: (p) => (p.value ? formatDate(p.value) : ""),
        sort: "desc",
      },
      {
        field: "updated_at",
        headerName: "수정일",
        width: 130,
        cellStyle: { textAlign: "center" },
        valueFormatter: (p) => (p.value ? formatDate(p.value) : ""),
      },
    ],
    [router]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      suppressMovable: false,
      headerClass: "ag-header-cell-center",
    }),
    []
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>고객 목록</CardTitle>
        <CardDescription>총 {filteredCount}건의 고객</CardDescription>
        <CardAction>
          <TooltipProvider>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    onClick={() => setDialogOpen(true)}
                  >
                    <Plus className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>고객 등록</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon-sm" variant="outline" onClick={exportExcel}>
                    <FileSpreadsheet className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>엑셀 다운로드</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon-sm" variant="outline" onClick={printTable}>
                    <Printer className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>인쇄</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon-sm" variant="outline" onClick={confirmDelete}>
                    <Trash2 className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>선택 삭제</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 조회조건 */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">고객명</Label>
            <Input
              className="w-[150px]"
              placeholder="고객명"
              value={filters.customerName}
              onChange={(e) => updateFilter("customerName", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">전화번호</Label>
            <Input
              className="w-[150px]"
              placeholder="전화번호"
              value={filters.phone}
              onChange={(e) => updateFilter("phone", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">계약여부</Label>
            <Select
              value={filters.hasContract}
              onValueChange={(v) => updateFilter("hasContract", v === "ALL" ? "" : v)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체</SelectItem>
                <SelectItem value="Y">보유</SelectItem>
                <SelectItem value="N">미보유</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 그리드 */}
        <style>{`
          .customers-grid .ag-cell-focus,
          .customers-grid .ag-cell-no-focus {
            border: none !important;
          }
          .customers-grid .ag-cell:focus {
            border: none !important;
            outline: none !important;
          }
        `}</style>
        <div className="customers-grid h-[600px] w-full">
          <AgGridReact
            modules={[AllCommunityModule]}
            rowData={data}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            rowSelection="multiple"
            pagination={true}
            paginationPageSize={20}
            paginationPageSizeSelector={[20, 50, 100]}
            onGridReady={(e) => {
              gridRef.current = e.api;
              recalcCount();
            }}
            onFilterChanged={recalcCount}
            onRowDoubleClicked={(e) => {
              if (e.data?.id) {
                setEditTarget(e.data);
                setEditDialogOpen(true);
              }
            }}
            isExternalFilterPresent={isExternalFilterPresent}
            doesExternalFilterPass={doesExternalFilterPass}
          />
        </div>
      </CardContent>
      {/* 고객 등록 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>고객 등록</DialogTitle>
            <DialogDescription>
              새로운 고객 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cust-name">고객명 <span className="-ml-1 text-destructive translate-y-[3px]">*</span></Label>
              <Input
                id="cust-name"
                name="name"
                placeholder="고객명을 입력하세요"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cust-phone">전화번호 <span className="-ml-1 text-destructive translate-y-[3px]">*</span></Label>
              <Input
                id="cust-phone"
                name="phone"
                type="tel"
                placeholder="01012345678"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cust-memo">메모</Label>
              <Textarea
                id="cust-memo"
                name="memo"
                rows={8}
                placeholder="메모를 입력하세요"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "등록 중..." : "등록"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* 고객 수정 다이얼로그 */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>고객 수정</DialogTitle>
            <DialogDescription>고객 정보를 수정합니다.</DialogDescription>
          </DialogHeader>
          {editTarget && (
            <form onSubmit={handleUpdate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-name">고객명 <span className="-ml-1 text-destructive translate-y-[3px]">*</span></Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={String(editTarget.name ?? "")}
                  placeholder="고객명을 입력하세요"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-phone">전화번호 <span className="-ml-1 text-destructive translate-y-[3px]">*</span></Label>
                <Input
                  id="edit-phone"
                  name="phone"
                  type="tel"
                  defaultValue={String(editTarget.phone ?? "")}
                  placeholder="01012345678"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-memo">메모</Label>
                <Textarea
                  id="edit-memo"
                  name="memo"
                  rows={8}
                  defaultValue={String(editTarget.memo ?? "")}
                  placeholder="메모를 입력하세요"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditDialogOpen(false);
                    setEditTarget(null);
                  }}
                >
                  취소
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "저장 중..." : "저장"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              선택한 고객 정보가 영구적으로 삭제되며, 해당 고객에
              연결된 계약 데이터도 함께 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>아니오</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={executeDelete}>
              예
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
