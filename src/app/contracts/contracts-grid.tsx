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
  type CellClickedEvent,
} from "ag-grid-community";
import { createClient } from "@/lib/supabase/client";
import { FileSpreadsheet, Plus, Printer, Save, Search, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const RENTAL_COMPANY_MAP: Record<number, string> = {
  10: "위드렌탈",
  20: "렌탈세계",
  30: "에이케이넷",
  40: "티엘파트너스",
  90: "기타",
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
  "부산", "경남", "광주", "전북", "제주", "신협", "새마을금고", "수협", "케이뱅크", "우체국",
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
  isDeleted: string;
  owner: string;
}

export function ContractsGrid({
  data,
  userMap = {},
  currentEmail = null,
  isAdmin = false,
  users = [],
}: {
  data: Record<string, unknown>[];
  userMap?: Record<string, string>;
  currentEmail?: string | null;
  isAdmin?: boolean;
  users?: { email: string; name: string }[];
}) {
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
    isDeleted: "N",
    owner: currentEmail ?? "",
  });

  useEffect(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setFilters((prev) => ({
      ...prev,
      installDateFrom: `${firstDayOfMonth.getFullYear()}-${String(firstDayOfMonth.getMonth() + 1).padStart(2, "0")}-01`,
      installDateTo: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
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
    if (selected.some((row) => !row._tempId && row.created_by !== currentEmail)) {
      toast.error("본인이 등록한 계약만 삭제할 수 있습니다.");
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
  }, [currentEmail]);

  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerNameKw, setCustomerNameKw] = useState("");
  const [customerPhoneKw, setCustomerPhoneKw] = useState("");
  const [customerResults, setCustomerResults] = useState<Record<string, unknown>[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);

  const runCustomerSearch = useCallback(
    async (nameKw: string, phoneKw: string) => {
      setCustomerLoading(true);
      const supabase = createClient();
      let q = supabase
        .from("customers")
        .select("id, name, phone")
        .eq("created_by", currentEmail ?? "");
      if (nameKw.trim()) q = q.ilike("name", `%${nameKw.trim()}%`);
      if (phoneKw.trim()) q = q.ilike("phone", `%${phoneKw.trim()}%`);
      const { data } = await q.order("name").limit(200);
      setCustomerResults(data ?? []);
      setCustomerLoading(false);
    },
    [currentEmail]
  );

  const openCustomerPicker = useCallback(
    (node: IRowNode) => {
      selectingRef.current = false;
      targetNodeRef.current = node;
      setCustomerNameKw("");
      setCustomerPhoneKw("");
      setCustomerResults([]);
      setCustomerModalOpen(true);
      runCustomerSearch("", "");
    },
    [runCustomerSearch]
  );

  const addBlankRow = useCallback(() => {
    const api = gridRef.current;
    if (!api) return;
    const tempId = `_new_${Date.now()}`;
    newRowIds.current.add(tempId);
    // 정렬 해제 + 1페이지 이동 → 새 빈 행이 항상 맨 위에 보이도록
    api.applyColumnState({ defaultState: { sort: null } });
    api.applyTransaction({ add: [{ _tempId: tempId }], addIndex: 0 });
    api.paginationGoToPage(0);
    setDirty(true);
  }, []);

  const handleCellClicked = useCallback(
    (e: CellClickedEvent) => {
      if (e.node?.rowPinned) return;
      // 고객 선택은 신규행(_tempId)에서만 가능, 저장된 행은 변경 불가
      if (e.colDef.field === "customer_name" && e.node?.data?._tempId) {
        openCustomerPicker(e.node);
      }
    },
    [openCustomerPicker]
  );

  const selectingRef = useRef(false);
  const targetNodeRef = useRef<IRowNode | null>(null);
  const selectCustomer = useCallback((customer: Record<string, unknown>) => {
    if (selectingRef.current) return;
    selectingRef.current = true;
    const node = targetNodeRef.current;
    if (node) {
      const updated = {
        ...node.data,
        customer_id: customer.id,
        customer_name: customer.name,
        phone: customer.phone,
      };
      node.setData(updated);
      if (updated._tempId) {
        newRowIds.current.add(updated._tempId as string);
      } else if (updated.id) {
        modifiedIds.current.add(updated.id as string);
      }
      setDirty(true);
    }
    setCustomerModalOpen(false);
  }, []);

  const trackChange = useCallback((row: Record<string, unknown>) => {
    if (row._tempId) {
      newRowIds.current.add(row._tempId as string);
    } else if (row.id) {
      modifiedIds.current.add(row.id as string);
    }
    setTimeout(() => setDirty(true), 0);
  }, []);

  const [pinnedBottomRowData, setPinnedBottomRowData] = useState<Record<string, unknown>[]>([
    { _isTotal: true, commission: 0, gift_amount: 0 },
  ]);
  const [filteredCount, setFilteredCount] = useState(data.length);

  const recalcTotals = useCallback(() => {
    const api = gridRef.current;
    if (!api) return;
    let totalCommission = 0;
    let totalGift = 0;
    let count = 0;
    api.forEachNodeAfterFilter((node) => {
      if (node.data && !node.data._isTotal) {
        totalCommission += Number(node.data.commission ?? 0);
        totalGift += Number(node.data.gift_amount ?? 0);
        count++;
      }
    });
    setPinnedBottomRowData([{ _isTotal: true, commission: totalCommission, gift_amount: totalGift }]);
    setFilteredCount(count);
  }, []);

  const exportExcel = useCallback(() => {
    const api = gridRef.current;
    if (!api) return;
    const rows: Record<string, unknown>[] = [];
    api.forEachNodeAfterFilter((node) => {
      if (node.data && !node.data._isTotal && !node.data._tempId) {
        const d = node.data;
        rows.push({
          "렌탈사": RENTAL_COMPANY_MAP[d.rental_company] ?? "",
          "고객이름": d.customer_name ?? "",
          "전화번호": d.phone ? formatPhone(String(d.phone)) : "",
          "생년월일": d.birth_date ? formatDate(d.birth_date) : "",
          "설치주소": d.install_address ?? "",
          "은행명": d.bank_name ?? "",
          "계좌번호": d.account_number ?? "",
          "예금주": d.account_holder ?? "",
          "설치상품": PRODUCT_MAP[d.install_product] ?? "",
          "제품번호": d.product_number ?? "",
          "수당": Number(d.commission ?? 0),
          "사은품": Number(d.gift_amount ?? 0),
          "순익": Number(d.commission ?? 0) - Number(d.gift_amount ?? 0),
          "설치일": d.install_date ? formatDate(d.install_date) : "",
        });
      }
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "계약목록");
    XLSX.writeFile(wb, `계약목록_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, []);

  const printTable = useCallback(() => {
    const api = gridRef.current;
    if (!api) return;
    const rows: Record<string, unknown>[] = [];
    let totalCommission = 0;
    let totalGift = 0;
    api.forEachNodeAfterFilter((node) => {
      if (node.data && !node.data._isTotal && !node.data._tempId) {
        const d = node.data;
        totalCommission += Number(d.commission ?? 0);
        totalGift += Number(d.gift_amount ?? 0);
        rows.push(d);
      }
    });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>계약목록</title>
<style>
  body { font-family: 'Malgun Gothic', sans-serif; font-size: 11px; margin: 20px; }
  h2 { text-align: center; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #333; padding: 4px 6px; }
  th { background: #f0f0f0; }
  td.right { text-align: right; }
  tr.total { font-weight: bold; background: #fef2f2; }
  @media print { body { margin: 0; } }
</style></head><body>
<h2>계약 목록 (${rows.length}건)</h2>
<table><thead><tr>
  <th>렌탈사</th><th>고객이름</th><th>전화번호</th><th>설치주소</th><th>예금주</th>
  <th>설치상품</th><th>제품번호</th><th>수당</th><th>사은품</th><th>순익</th><th>설치일</th>
</tr></thead><tbody>
${rows.map((d) => `<tr>
  <td>${RENTAL_COMPANY_MAP[d.rental_company as number] ?? ""}</td>
  <td>${d.customer_name ?? ""}</td>
  <td>${d.phone ? formatPhone(String(d.phone)) : ""}</td>
  <td>${d.install_address ?? ""}</td>
  <td>${d.account_holder ?? ""}</td>
  <td>${PRODUCT_MAP[d.install_product as number] ?? ""}</td>
  <td>${d.product_number ?? ""}</td>
  <td class="right">${Number(d.commission ?? 0).toLocaleString("ko-KR")}원</td>
  <td class="right">${Number(d.gift_amount ?? 0).toLocaleString("ko-KR")}원</td>
  <td class="right">${(Number(d.commission ?? 0) - Number(d.gift_amount ?? 0)).toLocaleString("ko-KR")}원</td>
  <td>${d.install_date ? formatDate(String(d.install_date)) : ""}</td>
</tr>`).join("")}
<tr class="total">
  <td colspan="7" style="text-align:center">합계</td>
  <td class="right">${totalCommission.toLocaleString("ko-KR")}원</td>
  <td class="right">${totalGift.toLocaleString("ko-KR")}원</td>
  <td class="right">${(totalCommission - totalGift).toLocaleString("ko-KR")}원</td>
  <td></td>
</tr></tbody></table></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.print();
  }, []);

  const onCellValueChanged = useCallback((e: CellValueChangedEvent) => {
    trackChange(e.data);
    recalcTotals();
  }, [trackChange, recalcTotals]);

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
        customer_id: row.customer_id ?? null,
        customer_name: row.customer_name ?? null,
        phone: row.phone ?? null,
        birth_date: row.birth_date || null,
        install_address: row.install_address || null,
        bank_name: row.bank_name || null,
        account_number: row.account_number || null,
        account_holder: row.account_holder || null,
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
      filters.bankName ||
      filters.isDeleted ||
      filters.owner
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
      if (filters.isDeleted === "N") {
        if (d.is_deleted === true) return false;
      } else if (filters.isDeleted === "Y") {
        if (d.is_deleted !== true) return false;
      }
      if (filters.owner) {
        if (String(d.created_by ?? "") !== filters.owner) return false;
      }

      return true;
    },
    [filters]
  );

  // 편집 가능 여부: 신규행(_tempId) 또는 본인 등록분만 (관리자도 동일)
  const isRowEditable = useCallback(
    (p: { data?: Record<string, unknown> }) =>
      Boolean(p.data?._tempId) || p.data?.created_by === currentEmail,
    [currentEmail]
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
        editable: isRowEditable,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: [10, 20, 30, 40, 90] },
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
        editable: false,
        cellStyle: (p) => {
          if (p.node?.rowPinned) return null;
          const isNew = !!p.data?._tempId;
          return {
            cursor: isNew ? "pointer" : "default",
            color: p.value ? "inherit" : "#9ca3af",
          };
        },
        valueFormatter: (p) => {
          if (p.node?.rowPinned) return "";
          if (p.value) return String(p.value);
          return p.data?._tempId ? "고객선택" : "";
        },
      },
      {
        field: "phone",
        headerName: "전화번호",
        width: 140,
        editable: false,
        cellStyle: { textAlign: "center" },
        valueFormatter: (p) => (p.value ? formatPhone(p.value) : ""),
      },
      {
        field: "birth_date",
        headerName: "생년월일",
        width: 130,
        editable: isRowEditable,
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
        editable: isRowEditable,
        tooltipField: "install_address",
      },
      {
        field: "bank_name",
        headerName: "은행명",
        width: 110,
        editable: isRowEditable,
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
        editable: isRowEditable,
        cellStyle: { textAlign: "center" },
      },
      {
        field: "account_holder",
        headerName: "예금주",
        width: 100,
        editable: isRowEditable,
        cellStyle: { textAlign: "center" },
      },
      {
        field: "install_product",
        headerName: "설치상품",
        width: 120,
        editable: isRowEditable,
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
        editable: isRowEditable,
      },
      {
        field: "commission",
        headerName: "수당",
        width: 110,
        editable: isRowEditable,
        cellEditor: "agNumberCellEditor",
        valueFormatter: (p) => formatCurrency(p.value),
        cellStyle: { textAlign: "right" },
      },
      {
        field: "gift_amount",
        headerName: "사은품",
        width: 110,
        editable: isRowEditable,
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
        editable: isRowEditable,
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
        field: "created_by",
        headerName: "등록자",
        width: 100,
        editable: false,
        cellStyle: { textAlign: "center" },
        valueFormatter: (p) =>
          p.node?.rowPinned ? "" : p.value ? userMap[p.value] ?? p.value : "",
      },
      {
        field: "updated_by",
        headerName: "수정자",
        width: 100,
        editable: false,
        cellStyle: { textAlign: "center" },
        valueFormatter: (p) =>
          p.node?.rowPinned ? "" : p.value ? userMap[p.value] ?? p.value : "",
      },
    ],
    [userMap, isRowEditable]
  );

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

  // 고객검색 모달 그리드 (읽기전용)
  const customerColDefs = useMemo<ColDef[]>(
    () => [
      { field: "name", headerName: "고객명", flex: 1, minWidth: 120 },
      {
        field: "phone",
        headerName: "전화번호",
        width: 160,
        cellStyle: { textAlign: "center" },
        valueFormatter: (p) => (p.value ? formatPhone(String(p.value)) : ""),
      },
    ],
    []
  );
  const customerDefaultColDef = useMemo<ColDef>(
    () => ({ editable: false, sortable: true, resizable: true }),
    []
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>계약 목록</CardTitle>
        <CardDescription>
          총 {filteredCount}건의 계약
        </CardDescription>
        <CardAction>
          <TooltipProvider>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon-sm" variant="outline" onClick={addBlankRow}>
                    <Plus className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>신규등록</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon-sm" variant="outline" onClick={removeRows}>
                    <Trash2 className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>선택 삭제</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant={dirty ? "default" : "outline"}
                    onClick={handleSave}
                    disabled={!dirty || saving}
                  >
                    <Save className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>저장</TooltipContent>
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
            </div>
          </TooltipProvider>
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
            <Label className="text-xs text-muted-foreground">삭제여부</Label>
            <Select
              value={filters.isDeleted}
              onValueChange={(v) => updateFilter("isDeleted", v)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="N">N</SelectItem>
                <SelectItem value="Y">Y</SelectItem>
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

          {isAdmin && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">등록자</Label>
              <Select
                value={filters.owner}
                onValueChange={(v) => updateFilter("owner", v === "all" ? "" : v)}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.email} value={u.email}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
            onGridReady={(e) => { gridRef.current = e.api; recalcTotals(); }}
            onFilterChanged={recalcTotals}
            isExternalFilterPresent={isExternalFilterPresent}
            doesExternalFilterPass={doesExternalFilterPass}
            onCellValueChanged={onCellValueChanged}
            onCellEditingStopped={onCellEditingStopped}
            onCellClicked={handleCellClicked}
          />
        </div>
      </CardContent>

      {/* 고객 검색 모달 */}
      <Dialog open={customerModalOpen} onOpenChange={setCustomerModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>고객 검색</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* 조회조건 */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">고객명</Label>
                <Input
                  className="w-[160px]"
                  placeholder="고객명"
                  value={customerNameKw}
                  onChange={(e) => setCustomerNameKw(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") runCustomerSearch(customerNameKw, customerPhoneKw);
                  }}
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">전화번호</Label>
                <Input
                  className="w-[160px]"
                  placeholder="전화번호"
                  value={customerPhoneKw}
                  onChange={(e) => setCustomerPhoneKw(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") runCustomerSearch(customerNameKw, customerPhoneKw);
                  }}
                />
              </div>
              <Button
                variant="outline"
                onClick={() => runCustomerSearch(customerNameKw, customerPhoneKw)}
              >
                <Search className="size-4" /> 조회
              </Button>
            </div>
            {/* 그리드 */}
            <style>{`
              .customer-picker-grid .ag-header-cell-label { justify-content: center; }
              .customer-picker-grid .ag-header-cell-text { font-weight: 700; }
            `}</style>
            <div className="customer-picker-grid h-[360px] w-full">
              <AgGridReact
                modules={[AllCommunityModule]}
                rowData={customerResults}
                columnDefs={customerColDefs}
                defaultColDef={customerDefaultColDef}
                pagination={true}
                paginationPageSize={20}
                onRowDoubleClicked={(e) => {
                  if (e.data) selectCustomer(e.data);
                }}
                overlayNoRowsTemplate={
                  customerLoading ? "검색 중..." : "검색 결과가 없습니다."
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              행을 더블클릭하면 해당 고객으로 선택됩니다.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
