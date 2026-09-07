import { BrandMark } from "../../components/BrandMark";
import { BrandWordmark } from "../../components/BrandWordmark";

/** Login-screen branding: the full lockup in kit green. */
export function AdminLogo() {
  return (
    <div className="maisha-admin-logo">
      <BrandMark />
      <BrandWordmark />
    </div>
  );
}
