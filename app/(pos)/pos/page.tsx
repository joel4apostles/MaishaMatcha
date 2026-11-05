import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PinLogin } from "@/components/pos/PinLogin";
import { PosEyebrow, PosFrame } from "@/components/pos/PosFrame";
import { currentDevice, currentPosSession, pinStaff } from "@/lib/pos/server";
import { logoutAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const t = await getTranslations({ locale: "es", namespace: "pos" });
  const device = await currentDevice();

  if (!device) {
    return (
      <PosFrame>
        <div className="max-w-[40rem]">
          <PosEyebrow>{t("unregistered.eyebrow")}</PosEyebrow>
          <h1 className="mt-4 font-serif text-[2rem] font-light leading-tight">
            {t("unregistered.title")}
          </h1>
          <p className="mt-4 max-w-[46ch] leading-relaxed text-sumi/85">{t("unregistered.body")}</p>
          <Link
            href="/pos/registrar"
            className="mt-8 inline-flex min-h-[52px] items-center rounded-[2px] bg-sumi px-8 text-sm font-medium tracking-wide text-washi hover:opacity-90"
          >
            {t("unregistered.action")}
          </Link>
        </div>
      </PosFrame>
    );
  }

  const session = await currentPosSession();
  if (!session) {
    return (
      <PosFrame aside={<span className="text-sm text-sumi/70">{device.name}</span>}>
        <PinLogin staff={await pinStaff()} />
      </PosFrame>
    );
  }

  const { staff } = session;
  return (
    <PosFrame
      aside={
        <form action={logoutAction} className="flex items-center gap-6">
          <span className="hidden text-sm text-sumi/70 sm:inline">
            {staff.name} · {t(`home.role.${staff.role}`)}
          </span>
          <button
            type="submit"
            className="inline-flex min-h-[44px] items-center text-sm underline decoration-wood/50 underline-offset-4 hover:decoration-sumi/70"
          >
            {t("home.logout")}
          </button>
        </form>
      }
    >
      <div className="max-w-[40rem]">
        <PosEyebrow>{t("home.device", { device: device.name })}</PosEyebrow>
        <h1 className="mt-4 font-serif text-[2.5rem] font-light leading-tight">
          {t("home.greeting", { name: staff.name })}
        </h1>
        <p className="mt-8 text-lg">{t("home.next")}</p>
        <p className="mt-3 max-w-[50ch] leading-relaxed text-sumi/85">{t("home.nextBody")}</p>
        {staff.role !== "barista" && (
          <Link
            href="/admin"
            className="mt-10 inline-flex min-h-[44px] items-center text-sm underline decoration-wood/50 underline-offset-4 hover:decoration-sumi/70"
          >
            {t("home.backOffice")}
          </Link>
        )}
      </div>
    </PosFrame>
  );
}
