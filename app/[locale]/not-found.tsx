import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { quietLinkClass } from "@/components/Button";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <main className="mx-auto flex min-h-dvh max-w-[1100px] flex-col justify-center px-6 py-24 sm:px-8">
      <p className="text-eyebrow uppercase text-sumi/65">404</p>
      <h1 className="mt-4 font-serif text-title font-light text-sumi">
        {t("title")}
      </h1>
      <p className="measure mt-4 text-lg text-sumi/80">{t("line")}</p>
      <div className="mt-8">
        <Link href="/" className={quietLinkClass}>
          {t("home")}
        </Link>
      </div>
    </main>
  );
}
