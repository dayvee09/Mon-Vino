import "./SiteHomeLink.scss";

/** Portfolio hub — Monvino is mounted under /monvino. */
export function portfolioHomeHref() {
  if (typeof window === "undefined") return "/";
  return `${window.location.origin}/`;
}

/**
 * Low-key link back to the AlpineCraft portfolio home.
 * @param {"on-dark" | "on-light"} [tone]
 */
export default function SiteHomeLink({
  tone = "on-dark",
  className = "",
}) {
  return (
    <a
      className={["SiteHomeLink", `SiteHomeLink--${tone}`, className]
        .filter(Boolean)
        .join(" ")}
      href={portfolioHomeHref()}
    >
      <svg
        className="SiteHomeLink__arrow"
        viewBox="0 0 16 16"
        width="11"
        height="11"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="currentColor"
          d="M10.78 2.22a.75.75 0 0 1 0 1.06L6.06 8l4.72 4.72a.75.75 0 1 1-1.06 1.06l-5.25-5.25a.75.75 0 0 1 0-1.06l5.25-5.25a.75.75 0 0 1 1.06 0z"
        />
      </svg>
      AlpineCraft
    </a>
  );
}
