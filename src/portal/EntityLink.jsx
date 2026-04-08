import React from "react";

/**
 * Clickable entity cross-reference link.
 * Navigates to the target page within the portal using setActivePage.
 *
 * @param {string}   label        - Display text
 * @param {string}   targetPage   - Portal page key (e.g. "invoices", "clients", "scheduling")
 * @param {function} setActivePage - Navigation setter from SharonPortalWebsite
 * @param {string}   [icon]       - Optional emoji prefix
 * @param {string}   [colour]     - Text colour (defaults to purple)
 */
export default function EntityLink({ label, targetPage, setActivePage, icon, colour = "#6A1B9A" }) {
  if (!label || !targetPage || !setActivePage) return <span>{label || "—"}</span>;
  return (
    <span
      onClick={(e) => { e.stopPropagation(); setActivePage(targetPage); }}
      style={{
        color: colour,
        fontWeight: 700,
        cursor: "pointer",
        textDecoration: "none",
        borderBottom: `1px dashed ${colour}40`,
        fontSize: "inherit",
      }}
      title={`Go to ${targetPage}`}
    >
      {icon ? `${icon} ` : ""}{label}
    </span>
  );
}
