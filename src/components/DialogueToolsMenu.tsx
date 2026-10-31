import { useEffect, useState, type ReactNode } from "react";

/** Keep secondary controls compact on a narrow screen and visible on desktop. */
export function DialogueToolsMenu({ children }: { children: ReactNode }) {
  const [compact, setCompact] = useState(
    () => window.matchMedia("(max-width: 700px)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(max-width: 700px)");
    const sync = () => setCompact(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  if (!compact) return <>{children}</>;
  return (
    <details className="vn-tools-menu">
      <summary>会話の操作</summary>
      <div className="vn-tools-items">{children}</div>
    </details>
  );
}
