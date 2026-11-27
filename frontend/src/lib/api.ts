export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type Role = "STUDENT" | "CLUB" | "OFFICE";
export type User = { id: string; uniId: string; fullName: string; role: Role };
export type PublicUser = { id: string; fullName: string; role: Role };
export type Persona = { key: string; uniId: string; fullName: string; role: Role };
export type EventStatus = "PENDING" | "APPROVED" | "REJECTED";
export type CampusEvent = {
  id: string;
  title: string;
  description: string | null;
  buildingId: string;
  startTime: string;
  endTime: string;
  status: EventStatus;
  createdBy: PublicUser;
  attendees: { user: PublicUser }[];
};
export type Building = {
  id: string;
  name: string;
  description: string | null;
  events: CampusEvent[];
  presenceCount: number | null;
};
export type ChatType = "PUBLIC_CLUB" | "PRIVATE_GROUP" | "DIRECT";
export type MyChat = { id: string; type: ChatType; name: string | null; members: PublicUser[] };
export type PublicChannel = { id: string; type: ChatType; name: string | null; memberCount: number; isMember: boolean };
export type Message = { id: string; roomId: string; body: string; createdAt: string; sender: PublicUser };

export const ROLE_LABEL: Record<Role, string> = {
  STUDENT: "Studierende:r",
  CLUB: "Verein",
  OFFICE: "Hochschulbüro",
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const hasBody = init.body !== undefined;
  const res = await fetch(`${API_URL}${path}`, {
    method: init.method ?? "GET",
    credentials: "include", // sends the HttpOnly session cookie
    headers: hasBody ? { "Content-Type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? res.statusText);
  return data as T;
}
