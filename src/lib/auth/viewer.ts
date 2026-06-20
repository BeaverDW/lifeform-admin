import { createClient } from "@/lib/supabase/server";

export interface ViewerUser {
  email: string;
  name: string;
}

export interface ViewerContext {
  currentEmail: string | null;
  /** SUPER_ADMIN / SYS_ADMIN 이면 전체 조회 가능 + 등록자 필터 노출 */
  isAdmin: boolean;
  /** email → 표시이름 (이름 없으면 email) */
  userMap: Record<string, string>;
  /** 등록자 필터 드롭다운용 사용자 목록 (같은 법인) */
  users: ViewerUser[];
}

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "SYS_ADMIN"]);

/**
 * 로그인 사용자 + 같은 법인 사용자들의 이름 맵을 한 번에 조회.
 * profiles RLS 가 같은 법인 row 를 읽게 해줘서 일반 사용자도 이름 맵은 받을 수 있음.
 */
export async function getViewerContext(): Promise<ViewerContext> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, name, cd_role");

  const list = profiles ?? [];
  const me = list.find((p) => p.id === user?.id);

  const users: ViewerUser[] = list
    .map((p) => ({
      email: (p.email as string) ?? "",
      name: ((p.name as string) || (p.email as string)) ?? "",
    }))
    .filter((u) => u.email)
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const userMap: Record<string, string> = {};
  for (const u of users) userMap[u.email] = u.name;

  return {
    currentEmail: user?.email ?? null,
    isAdmin: me ? ADMIN_ROLES.has(me.cd_role as string) : false,
    userMap,
    users,
  };
}
