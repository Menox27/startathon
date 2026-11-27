import { appIcon } from "@/lib/app-icon";

const SIZES = [192, 512] as const;
export const dynamicParams = false;
export const generateStaticParams = () => SIZES.map((s) => ({ size: String(s) }));

/** PNG icons referenced by the web app manifest: /pwa-icon/192, /pwa-icon/512. */
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  return appIcon(Number((await params).size));
}
