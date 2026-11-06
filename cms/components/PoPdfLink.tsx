"use client";

import { useDocumentInfo } from "@payloadcms/ui";

/** "Descargar PDF" on a saved purchase order (the same PDF the supplier gets). */
export function PoPdfLink() {
  const { id } = useDocumentInfo();
  if (!id) return null;
  return (
    <p style={{ margin: "0 0 1.5rem" }}>
      <a href={`/api/purchase-orders/${id}/pdf`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline", textUnderlineOffset: 4 }}>
        Descargar el pedido en PDF
      </a>
    </p>
  );
}
