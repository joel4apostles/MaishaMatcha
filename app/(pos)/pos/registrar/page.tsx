import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PosEyebrow, PosFrame } from "@/components/pos/PosFrame";
import { RegisterDeviceForm } from "@/components/pos/RegisterDeviceForm";
import { backOfficeOwner } from "@/lib/pos/server";

export const dynamic = "force-dynamic";

/** Owner-only: turn this browser into a registered counter device. */
export default async function RegisterDevicePage() {
  const t = await getTranslations({ locale: "es", namespace: "pos.register" });
  const owner = await backOfficeOwner();

  return (
    <PosFrame>
      <div className="max-w-[40rem]">
        <PosEyebrow>{t("eyebrow")}</PosEyebrow>
        <h1 className="mt-4 font-serif text-[2rem] font-light leading-tight">{t("title")}</h1>
        {owner ? (
          <>
            <p className="mt-4 leading-relaxed text-sumi/85">{t("body")}</p>
            <RegisterDeviceForm />
          </>
        ) : (
          <>
            <p className="mt-4 leading-relaxed text-sumi/85">{t("needOwner")}</p>
            <Link
              href="/admin/login?redirect=%2Fpos%2Fregistrar"
              className="mt-8 inline-flex min-h-[52px] items-center rounded-[2px] bg-sumi px-8 text-sm font-medium tracking-wide text-washi hover:opacity-90"
            >
              {t("signIn")}
            </Link>
          </>
        )}
      </div>
    </PosFrame>
  );
}
