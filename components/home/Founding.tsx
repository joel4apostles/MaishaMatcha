import Image from "next/image";
import { useTranslations } from "next-intl";
import matchaPowder from "@/public/images/matcha-powder.jpg";
import { Section } from "@/components/Section";
import { Reveal } from "@/components/Reveal";
import { WaitlistForm } from "@/components/WaitlistForm";
import { Numeral } from "@/components/Numeral";

export function Founding() {
  const t = useTranslations("home.founding");
  const privileges = [t("privilege1"), t("privilege2"), t("privilege3")];
  return (
    // Inverted closing band: the page opens dark and closes dark.
    <Section id="socios" className="brand-band relative scroll-mt-16 overflow-hidden bg-matcha" as="section">
      {/* Real matcha powder across the band, under a green veil. */}
      <Image
        src={matchaPowder}
        alt=""
        aria-hidden="true"
        fill
        sizes="100vw"
        quality={50}
        placeholder="blur"
        className="object-cover"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-matcha/85" />
      <Reveal className="relative grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-16">
        <div>
          <p className="flex items-center gap-3 text-eyebrow font-medium uppercase text-sumi/85">
            <Numeral>五</Numeral>
            <span>{t("eyebrow")}</span>
          </p>
          <h2 className="mt-5 text-balance font-serif text-title font-light text-sumi">
            {t("title")}
          </h2>
          <p className="measure mt-6 text-lg text-sumi/85">{t("body")}</p>
          <ul className="mt-8 space-y-3">
            {privileges.map((p) => (
              <li key={p} className="flex items-start gap-3 text-sumi/85">
                <span
                  aria-hidden="true"
                  className="mt-3 h-px w-5 shrink-0 bg-sumi/50"
                />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <WaitlistForm dark />
        </div>
      </Reveal>
    </Section>
  );
}
