/** Temporary silhouettes and props, independent of the enemy's script. */
export function CityEnemyPortrait({
  kind,
  emotion,
}: {
  kind: "porter" | "fortune" | "archivist" | "conductor";
  emotion?: string;
}) {
  const colors = {
    porter: "#8d6242",
    fortune: "#725a73",
    archivist: "#5c7574",
    conductor: "#292c39",
  };
  return (
    <svg
      className={`enemy-portrait expression-${emotion ?? "neutral"}`}
      viewBox="0 0 180 200"
      aria-hidden="true"
    >
      <ellipse cx="90" cy="192" rx="80" ry="7" fill="#172725" opacity=".3" />
      <path
        d={
          kind === "conductor"
            ? "M64 112 20 192h140l-43-80z"
            : "M35 192v-45q5-26 39-30h31q35 4 40 30v45z"
        }
        fill={colors[kind]}
      />
      <path d="m70 120 20 48 21-48-21 14z" fill="#eee6d3" />
      <path d="M79 105h23v29H79z" fill="#c99f79" />
      <path
        d={
          kind === "porter"
            ? "M53 58q2-34 37-34 38 0 38 34v31q-6 38-38 39-31-4-37-39z"
            : "M59 58q1-34 31-34t31 34v29q-4 36-31 39-27-4-31-39z"
        }
        fill="#dcb48a"
      />
      <path
        d="M58 59q-8-42 32-43 44 0 34 44l-12-22q-22 12-47 10z"
        fill={kind === "archivist" ? "#aba794" : "#494039"}
      />
      <path
        d={
          kind === "conductor"
            ? "m63 63 17 7m20 0 17-7"
            : "m64 66 16-3m20 0 16 3"
        }
        fill="none"
        stroke="#504234"
        strokeWidth="4"
      />
      <path
        d="M67 79h10m27 0h10m-25 0-4 16h10"
        fill="none"
        stroke="#76573f"
        strokeWidth="3"
      />
      <path
        d={kind === "fortune" ? "M79 105q12 10 23-2" : "M78 105h25"}
        fill="none"
        stroke="#79513f"
        strokeWidth="3"
      />
      {kind === "porter" && (
        <>
          <path d="M48 48q0-35 42-35t43 35z" fill="#aaa17d" />
          <path d="M42 49h98" stroke="#d0c199" strokeWidth="7" />
          <path
            d="m39 137 25 49m77-49-24 49"
            stroke="#b59a69"
            strokeWidth="10"
          />
          <rect
            x="48"
            y="154"
            width="86"
            height="35"
            rx="3"
            fill="#b8b0a1"
            stroke="#867d6f"
            strokeWidth="3"
          />
          <path
            d="M58 165h22m32 12h13m-39-19 8 22"
            stroke="#e3d9cc"
            strokeWidth="3"
          />
        </>
      )}
      {kind === "fortune" && (
        <>
          <path d="M67 13h46l8 30H58z" fill="#574354" />
          <path d="M49 45h82" stroke="#b9a37a" strokeWidth="6" />
          <path
            d="M69 123q21 42 43 0"
            stroke="#c3ab63"
            strokeWidth="3"
            fill="none"
          />
          <circle cx="91" cy="153" r="8" fill="#d2bf78" />
          {[45, 117].map((x) => (
            <g key={x}>
              <rect
                x={x}
                y="162"
                width="19"
                height="26"
                rx="5"
                fill="#c1cebb"
                fillOpacity=".7"
                stroke="#e3d7a9"
              />
              <path d={`M${x + 4} 159h11`} stroke="#af8a57" strokeWidth="7" />
            </g>
          ))}
        </>
      )}
      {kind === "archivist" && (
        <>
          <circle
            cx="73"
            cy="78"
            r="11"
            stroke="#5a5849"
            strokeWidth="3"
            fill="none"
          />
          <circle
            cx="108"
            cy="78"
            r="11"
            stroke="#5a5849"
            strokeWidth="3"
            fill="none"
          />
          <path d="M84 78h13" stroke="#5a5849" strokeWidth="3" />
          <rect
            x="45"
            y="147"
            width="92"
            height="44"
            fill="#9c7852"
            stroke="#6f5842"
            strokeWidth="3"
          />
          {[151, 169].map((y) => (
            <g key={y}>
              <rect
                x="50"
                y={y}
                width="82"
                height="17"
                fill="#c2a075"
                stroke="#6f5842"
              />
              <rect x="83" y={y + 6} width="16" height="4" fill="#6f5842" />
            </g>
          ))}
        </>
      )}
      {kind === "conductor" && (
        <>
          <path d="m75 132 15 8 15-8v16l-15-8-15 8z" fill="#c6ac6e" />
          <path
            d="M77 99q9-4 13 2 7-6 15-3"
            fill="none"
            stroke="#494039"
            strokeWidth="4"
          />
          <path
            d="m45 155-20-27 10-16m105 44 16-27-4-16"
            fill="none"
            stroke="#dcb48a"
            strokeWidth="9"
          />
          <path d="m149 114 16-61" stroke="#e1d4ad" strokeWidth="4" />
          <circle cx="166" cy="49" r="8" fill="#d6cba9" />
          <path d="m69 177 8-22h24l8 22z" fill="#ac875a" />
          <path d="M90 157v16" stroke="#e3d6b4" strokeWidth="3" />
        </>
      )}
    </svg>
  );
}
