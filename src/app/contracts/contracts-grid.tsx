"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  type ColDef,
  type GridApi,
  type IRowNode,
  type CellValueChangedEvent,
  type CellEditingStoppedEvent,
} from "ag-grid-community";
import { createClient } from "@/lib/supabase/client";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RENTAL_COMPANY_MAP: Record<number, string> = {
  10: "위드렌탈",
  20: "렌탈세계",
  30: "에이케이넷",
};

const PRODUCT_MAP: Record<number, string> = {
  10: "인터넷",
  20: "인터넷TV",
  30: "정수기",
  40: "가전렌탈",
  50: "기타",
};

const BANK_OPTIONS = [
  "국민", "신한", "우리", "하나", "농협",
  "기업", "카카오뱅크", "토스뱅크", "SC제일", "대구",
  "부산", "경남", "광주", "전북", "제주",
];

function formatPhone(phone: string) {
  if (phone.length === 11) {
    return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
  }
  return phone;
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "";
  return value.toLocaleString("ko-KR") + "원";
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
  rentalCompany: string;
  installDateFrom: string;
  installDateTo: string;
  customerName: string;
  installProduct: string;
  bankName: string;
}

export function ContractsGrid({ data }: { data: Record<string, unknown>[] }) {
  const router = useRouter();
  const gridRef = useRef<GridApi | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const modifiedIds = useRef<Set<string>>(new Set());
  const newRowIds = useRef<Set<string>>(new Set());
  const deletedIds = useRef<Set<string>>(new Set());

  const [filters, setFilters] = useState<Filters>({
    rentalCompany: "",
    installDateFrom: "",
    installDateTo: "",
    customerName: "",
    installProduct: "",
    bankName: "",
  });

  useEffect(() => {
    const today = new Date();
    const twoMonthsAgo = new Date(today);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    setFilters((prev) => ({
      ...prev,
      installDateFrom: twoMonthsAgo.toISOString().slice(0, 10),
      installDateTo: today.toISOString().slice(0, 10),
    }));
    setTimeout(() => gridRef.current?.onFilterChanged(), 0);
  }, []);

  const updateFilter = useCallback(
    (key: keyof Filters, value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setTimeout(() => gridRef.current?.onFilterChanged(), 0);
    },
    []
  );

  const removeRows = useCallback(() => {
    const api = gridRef.current;
    if (!api) return;
    api.stopEditing();
    const selected = api.getSelectedRows();
    if (selected.length === 0) {
      toast.error("삭제할 행을 선택해주세요.");
      return;
    }
    for (const row of selected) {
      if (row._tempId) {
        newRowIds.current.delete(row._tempId);
      } else if (row.id) {
        deletedIds.current.add(row.id);
        modifiedIds.current.delete(row.id);
      }
    }
    api.applyTransaction({ remove: selected });
    setDirty(true);
  }, []);

  const addRow = useCallback(() => {
    const tempId = `_new_${Date.now()}`;
    const newRow = { _tempId: tempId };
    newRowIds.current.add(tempId);
    gridRef.current?.applyTransaction({ add: [newRow], addIndex: 0 });
    setDirty(true);
  }, []);

  const trackChange = useCallback((row: Record<string, unknown>) => {
    if (row._tempId) {
      newRowIds.current.add(row._tempId as string);
    } else if (row.id) {
      modifiedIds.current.add(row.id as string);
    }
    setTimeout(() => setDirty(true), 0);
  }, []);

  const onCellValueChanged = useCallback((e: CellValueChangedEvent) => {
    trackChange(e.data);
  }, [trackChange]);

  const onCellEditingStopped = useCallback((e: CellEditingStoppedEvent) => {
    if (e.oldValue !== e.newValue && e.data) {
      trackChange(e.data);
    }
  }, [trackChange]);

  const handleSave = useCallback(async () => {
    const api = gridRef.current;
    if (!api) return;
    api.stopEditing();
    setSaving(true);

    const supabase = createClient();
    const updates: Record<string, unknown>[] = [];
    const inserts: Record<string, unknown>[] = [];
    let validationError = "";

    api.forEachNode((node) => {
      if (validationError) return;
      const row = node.data;
      if (!row) return;

      const payload = {
        rental_company: row.rental_company ?? null,
        customer_name: row.customer_name ?? null,
        phone: row.phone ?? null,
        birth_date: row.birth_date || null,
        install_address: row.install_address || null,
        bank_name: row.bank_name || null,
        account_number: row.account_number || null,
        install_product: row.install_product ?? null,
        product_number: row.product_number || null,
        commission: row.commission ?? 0,
        gift_amount: row.gift_amount ?? 0,
        install_date: row.install_date || null,
      };

      if (row._tempId && newRowIds.current.has(row._tempId)) {
        const missing: string[] = [];
        if (!payload.customer_name) missing.push("고객명");
        if (!payload.phone) missing.push("전화번호");
        if (missing.length > 0) {
          validationError = `${missing.join(", ")}을(를) 입력해주세요.`;
          return;
        }
        inserts.push(payload);
      } else if (row.id && modifiedIds.current.has(row.id)) {
        updates.push({ ...payload, id: row.id });
      }
    });

    if (validationError) {
      setSaving(false);
      toast.error(validationError);
      return;
    }

    if (deletedIds.current.size > 0) {
      await supabase.from("contracts").update({ is_deleted: true }).in("id", Array.from(deletedIds.current));
    }
    if (inserts.length > 0) {
      await supabase.from("contracts").insert(inserts);
    }
    for (const row of updates) {
      const { id, ...rest } = row;
      await supabase.from("contracts").update(rest).eq("id", id);
    }

    deletedIds.current.clear();
    modifiedIds.current.clear();
    newRowIds.current.clear();
    setDirty(false);
    setSaving(false);
    api.deselectAll();
    router.refresh();
  }, [router]);

  const isExternalFilterPresent = useCallback(() => {
    return !!(
      filters.rentalCompany ||
      filters.installDateFrom ||
      filters.installDateTo ||
      filters.customerName ||
      filters.installProduct ||
      filters.bankName
    );
  }, [filters]);

  const doesExternalFilterPass = useCallback(
    (node: IRowNode) => {
      const d = node.data;
      if (!d) return false;
      if (d._tempId) return true;

      if (filters.rentalCompany) {
        if (String(d.rental_company) !== filters.rentalCompany) return false;
      }
      if (filters.installDateFrom && d.install_date) {
        if (String(d.install_date) < filters.installDateFrom) return false;
      }
      if (filters.installDateTo && d.install_date) {
        if (String(d.install_date) > filters.installDateTo) return false;
      }
      if (filters.customerName) {
        if (
          !String(d.customer_name ?? "")
            .toLowerCase()
            .includes(filters.customerName.toLowerCase())
        )
          return false;
      }
      if (filters.installProduct) {
        if (String(d.install_product) !== filters.installProduct) return false;
      }
      if (filters.bankName) {
        if (d.bank_name !== filters.bankName) return false;
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
        cellStyle: (p) => (p.node?.rowPinned ? { visibility: "hidden" } : null),
      },
      {
        field: "rental_company",
        headerName: "렌탈사",
        width: 120,
        pinned: "left",
        editable: true,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: [10, 20, 30] },
        valueFormatter: (p) => {
          if (p.node?.rowPinned) return "";
          return RENTAL_COMPANY_MAP[p.value] ?? "선택";
        },
        cellStyle: (p) => (
          !p.value && !p.node?.rowPinned
            ? { color: "#9ca3af", borderRight: "none" }
            : { color: "inherit", borderRight: "none" }
        ),
      },
      {
        field: "customer_name",
        headerName: "고객이름",
        width: 100,
        editable: true,
      },
      {
        field: "phone",
        headerName: "전화번호",
        width: 140,
        editable: true,
        cellStyle: { textAlign: "center" },
        valueFormatter: (p) => (p.value ? formatPhone(p.value) : ""),
      },
      {
        field: "birth_date",
        headerName: "생년월일",
        width: 130,
        editable: true,
        cellStyle: (p) => ({
          textAlign: "center",
          color: (!p.value && !p.node?.rowPinned) ? "#9ca3af" : "inherit",
        }),
        cellEditor: "agDateStringCellEditor",
        valueFormatter: (p) => {
          if (p.node?.rowPinned) return "";
          return p.value ? formatDate(p.value) : "날짜선택";
        },
      },
      {
        field: "install_address",
        headerName: "설치주소",
        width: 200,
        editable: true,
        tooltipField: "install_address",
      },
      {
        field: "bank_name",
        headerName: "은행명",
        width: 110,
        editable: true,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: BANK_OPTIONS },
        valueFormatter: (p) => {
          if (p.node?.rowPinned) return "";
          return p.value || "선택";
        },
        cellStyle: (p) => {
          if (p.node?.rowPinned) return null;
          return !p.value ? { color: "#9ca3af", textAlign: "center" } : { color: "inherit", textAlign: "center" };
        },
      },
      {
        field: "account_number",
        headerName: "계좌번호",
        width: 150,
        editable: true,
        cellStyle: { textAlign: "center" },
      },
      {
        field: "install_product",
        headerName: "설치상품",
        width: 120,
        editable: true,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: [10, 20, 30, 40, 50] },
        valueFormatter: (p) => {
          if (p.node?.rowPinned) return "합계";
          return PRODUCT_MAP[p.value] ?? "선택";
        },
        cellStyle: (p) => ({
          color: (!p.value && !p.node?.rowPinned) ? "#9ca3af" : "inherit",
          textAlign: p.node?.rowPinned ? "center" : "left",
        }),
      },
      {
        field: "product_number",
        headerName: "제품번호",
        width: 130,
        editable: true,
      },
      {
        field: "commission",
        headerName: "수당",
        width: 110,
        editable: true,
        cellEditor: "agNumberCellEditor",
        valueFormatter: (p) => formatCurrency(p.value),
        cellStyle: { textAlign: "right" },
      },
      {
        field: "gift_amount",
        headerName: "사은품",
        width: 110,
        editable: true,
        cellEditor: "agNumberCellEditor",
        valueFormatter: (p) => formatCurrency(p.value),
        cellStyle: { textAlign: "right" },
      },
      {
        headerName: "순익",
        width: 110,
        editable: false,
        valueGetter: (p) => {
          const commission = Number(p.data?.commission ?? 0);
          const gift = Number(p.data?.gift_amount ?? 0);
          return commission - gift;
        },
        valueFormatter: (p) => formatCurrency(p.value),
        cellStyle: { textAlign: "right" },
      },
      {
        field: "install_date",
        headerName: "설치일",
        width: 130,
        sort: "desc",
        editable: true,
        cellStyle: (p) => ({
          textAlign: "center",
          color: (!p.value && !p.node?.rowPinned) ? "#9ca3af" : "inherit",
        }),
        cellEditor: "agDateStringCellEditor",
        valueFormatter: (p) => {
          if (p.node?.rowPinned) return "";
          return p.value ? formatDate(p.value) : "날짜선택";
        },
      },
    ],
    []
  );

  const pinnedBottomRowData = useMemo(() => {
    const totalCommission = data.reduce((sum, r) => sum + Number(r.commission ?? 0), 0);
    const totalGift = data.reduce((sum, r) => sum + Number(r.gift_amount ?? 0), 0);
    return [
      {
        _isTotal: true,
        commission: totalCommission,
        gift_amount: totalGift,
      },
    ];
  }, [data]);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      suppressMovable: false,
      headerClass: "ag-header-cell-center",
      editable: (params) => !params.node.rowPinned,
    }),
    []
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>계약 목록</CardTitle>
        <CardDescription>
          총 {data.length}건의 계약
        </CardDescription>
        <CardAction>
          <div className="flex items-center gap-1">
            <Button size="icon-sm" variant="outline" onClick={addRow}>
              <Plus className="size-4" />
            </Button>
            <Button size="icon-sm" variant="outline" onClick={removeRows}>
              <Trash2 className="size-4" />
            </Button>
            <Button
              size="icon-sm"
              variant={dirty ? "default" : "outline"}
              onClick={handleSave}
              disabled={!dirty || saving}
            >
              <Save className="size-4" />
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 조회조건 */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">설치일</Label>
              <Input
                type="date"
                className="w-[150px]"
                value={filters.installDateFrom}
                onChange={(e) => updateFilter("installDateFrom", e.target.value)}
              />
            </div>
            <span className="pb-2 text-sm text-muted-foreground">~</span>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">&nbsp;</Label>
              <Input
                type="date"
                className="w-[150px]"
                value={filters.installDateTo}
                onChange={(e) => updateFilter("installDateTo", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">렌탈사</Label>
            <Select
              value={filters.rentalCompany}
              onValueChange={(v) => updateFilter("rentalCompany", v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {Object.entries(RENTAL_COMPANY_MAP).map(([code, label]) => (
                  <SelectItem key={code} value={code}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
            <Label className="text-xs text-muted-foreground">상품분류</Label>
            <Select
              value={filters.installProduct}
              onValueChange={(v) => updateFilter("installProduct", v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {Object.entries(PRODUCT_MAP).map(([code, label]) => (
                  <SelectItem key={code} value={code}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">은행</Label>
            <Select
              value={filters.bankName}
              onValueChange={(v) => updateFilter("bankName", v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {BANK_OPTIONS.map((bank) => (
                  <SelectItem key={bank} value={bank}>
                    {bank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 그리드 */}
        <div className="h-[600px] w-full">
          <AgGridReact
            modules={[AllCommunityModule]}
            rowData={data}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            pinnedBottomRowData={pinnedBottomRowData}
            getRowStyle={(params) => {
              if (params.node.rowPinned === "bottom") {
                return { fontWeight: "bold", color: "#dc2626", backgroundColor: "#fef2f2" };
              }
              return undefined;
            }}
            singleClickEdit={true}
            rowSelection="multiple"
            pagination={true}
            paginationPageSize={20}
            paginationPageSizeSelector={[20, 50, 100]}
            onGridReady={(e) => (gridRef.current = e.api)}
            isExternalFilterPresent={isExternalFilterPresent}
            doesExternalFilterPass={doesExternalFilterPass}
            onCellValueChanged={onCellValueChanged}
            onCellEditingStopped={onCellEditingStopped}
          />
        </div>
      </CardContent>

    </Card>
  );
}
