import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import qrcode from "qrcode-generator";
import { getTranslations } from "next-intl/server";
import { BrandMark } from "@/components/BrandMark";
import { PrintButton } from "@/components/pos/PrintButton";
import { onlineSettings } from "@/lib/online";
import { currentPosSession, payloadClient } from "@/lib/pos/server";

export const dynamic = "force-dynamic";

/** One QR per table, A4-printable: each opens /es/pedir?mesa=N. */
export default async function TablesPage() {
  const session = await currentPosSession();
  if (!session) redirect("/pos");
  if (session.staff.role === "barista") redirect("/pos");
  const t = await getTranslations({ locale: "es", namespace: "pos.tables" });
  const { tables } = await onlineSettings(await payloadClient());
  const h = await headers();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${h.get("host")}`;
  const codes = Array.from({ length: tables }, (_, i) => {
    const n = i + 1;
    const qr = qrcode(0, "M");
    qr.addData(`${base}/es/pedir?mesa=${n}`);
    qr.make();
    return { n, svg: qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true }) };
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8 print:p-0">
      <div className="mb-8 flex flex-wrap items-center gap-3 print:hidden">
        <h1 className="mr-auto font-serif text-[2rem] font-light">{t("title")}</h1>
        {tables ? <PrintButton label={t("print")} /> : null}
        <Link href="/pos" className="inline-flex min-h-[48px] items-center rounded-[2px] border border-sumi/55 px-6 text-sm">
          {t("back")}
        </Link>
      </div>
      {tables === 0 ? (
        <p className="text-sumi/80">{t("off")}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-6 print:gap-0">
          {codes.map((c) => (
            <li key={c.n} className="flex flex-col items-center gap-4 rounded-[2px] border border-wood/40 p-8 text-center print:break-inside-avoid">
              <BrandMark className="h-8 w-auto text-matcha" />
              {/* Deterministic QR of our own URL; no user input. */}
              <div className="h-40 w-40 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: c.svg }} />
              <p className="font-serif text-2xl font-light">{t("table", { n: c.n })}</p>
              <p className="text-sm text-sumi/75">{t("hint")}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
