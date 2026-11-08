import type { I18nClient } from "@payloadcms/translations";
import { BrandMark } from "../../components/BrandMark";
import { BrandWordmark } from "../../components/BrandWordmark";

/**
 * Sign-in screens: the lockup in kit green, smaller than the page it sits
 * on, with one spaced line saying where you are.
 */
export function AdminLogo({ i18n }: { i18n?: I18nClient }) {
  return (
    <div className="maisha-admin-logo">
      <BrandMark />
      <BrandWordmark />
      <span className="maisha-admin-sub">{i18n?.language === "en" ? "Back office" : "Administración"}</span>
    </div>
  );
}
