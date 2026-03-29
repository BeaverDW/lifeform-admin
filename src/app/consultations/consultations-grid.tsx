"use client";

import { useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, type ColDef, type ICellRendererParams } from "ag-grid-community";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

function formatPhone(phone: string) {
  if (phone.length === 11) {
    return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
  }
  return phone;
}

function InterestRenderer(params: ICellRendererParams) {
  const data = params.data;
  const interests: string[] = [];
  if (data.interest_internet) interests.push("인터넷");
  if (data.interest_tv) interests.push("TV");
  if (data.interest_rental) interests.push("가전렌탈");
  if (data.interest_purifier) interests.push("정수기");
  return (
    <div className="flex gap-1 items-center h-full">
      {interests.map((i) => (
        <Badge key={i} variant="secondary">{i}</Badge>
      ))}
    </div>
  );
}

function UtmRenderer(params: ICellRendererParams) {
  const { utm_source, utm_medium } = params.data;
  if (!utm_source) return <span className="text-muted-foreground">직접 유입</span>;
  return (
    <span className="text-muted-foreground">
      {utm_source}{utm_medium ? ` / ${utm_medium}` : ""}
    </span>
  );
}

export function ConsultationsGrid({ data }: { data: Record<string, unknown>[] }) {
  const [uaOpen, setUaOpen] = useState(false);
  const [uaValue, setUaValue] = useState("");

  const columnDefs = useMemo<ColDef[]>(() => [
    { field: "name", headerName: "이름", width: 100, pinned: "left" },
    { field: "phone", headerName: "연락처", width: 140, valueFormatter: (p) => p.value ? formatPhone(p.value) : "" },
    { headerName: "관심 항목", width: 200, cellRenderer: InterestRenderer },
    { field: "preferred_time", headerName: "희망 시간", width: 120 },
    { headerName: "유입 경로", width: 150, cellRenderer: UtmRenderer },
    { field: "region", headerName: "지역", width: 100 },
    { field: "page_url", headerName: "페이지", width: 200, tooltipField: "page_url" },
    { field: "ip", headerName: "IP", width: 130 },
    {
      field: "user_agent",
      headerName: "UA",
      width: 150,
      onCellClicked: (e) => {
        if (e.value) {
          setUaValue(e.value);
          setUaOpen(true);
        }
      },
      cellStyle: { cursor: "pointer" },
    },
    {
      field: "created_at",
      headerName: "신청일",
      width: 160,
      sort: "desc",
      valueFormatter: (p) => {
        if (!p.value) return "";
        return new Intl.DateTimeFormat("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(p.value));
      },
    },
  ], []);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    suppressMovable: false,
  }), []);

  return (
    <>
      <div className="h-[600px] w-full">
        <AgGridReact
          modules={[AllCommunityModule]}
          rowData={data}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          pagination={true}
          paginationPageSize={20}
          paginationPageSizeSelector={[20, 50, 100]}
        />
      </div>
      <Dialog open={uaOpen} onOpenChange={setUaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Agent</DialogTitle>
          </DialogHeader>
          <p className="text-sm break-all">{uaValue}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
