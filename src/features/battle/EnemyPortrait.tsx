import { CityEnemyPortrait } from "./CityEnemyPortrait";
/** Original temporary character illustration, separate from dialogue and battle rules. */
export function EnemyPortrait({
  emotion = "neutral",
  variant,
  portrait,
}: {
  emotion?: string;
  variant?: "A" | "B" | "C";
  portrait?: "porter" | "fortune" | "archivist" | "conductor";
}) {
  if (portrait) return <CityEnemyPortrait kind={portrait} emotion={emotion} />;
  if (variant === "B" || variant === "C")
    return (
      <svg
        className={`enemy-portrait expression-${emotion}`}
        viewBox="0 0 180 200"
        aria-hidden="true"
      >
        <ellipse cx="90" cy="191" rx="77" ry="8" fill="#1b2c29" opacity=".25" />
        <path
          d="M34 193v-47q5-23 39-27h34q34 4 39 27v47"
          fill={variant === "B" ? "#755f4a" : "#4c6270"}
        />
        <path d="m69 122 21 47 21-47-21 12z" fill="#f3ebdb" />
        <path d="M79 108h23v27H79z" fill="#d2ab85" />
        <path
          d="M57 62q0-38 33-38t33 38v26q-6 33-33 38-27-5-33-38z"
          fill="#e1bb91"
        />
        <path
          d="M55 63q-9-47 35-48 45 1 36 48l-11-24q-21 13-50 10z"
          fill={variant === "B" ? "#585044" : "#7c7b6d"}
        />
        <path d="m64 65 17-4m20 0 16 4" stroke="#514a3e" strokeWidth="4" />
        <path
          d="M66 78h13m24 0h13m-27 1-4 16h10"
          stroke="#705a43"
          strokeWidth="3"
          fill="none"
        />
        <path
          d={variant === "B" ? "M75 104h32" : "M78 102q13 9 25-2"}
          stroke="#785b49"
          strokeWidth="3"
          fill="none"
        />
        {variant === "B" ? (
          <>
            <rect
              x="35"
              y="143"
              width="65"
              height="45"
              rx="3"
              fill="#eee3c8"
              stroke="#927951"
              strokeWidth="2"
            />
            <path
              d="M46 154h43m-43 10h43m-43 10h43"
              stroke="#b0a285"
              strokeWidth="2"
            />
            <path d="M68 144v43" stroke="#a68c63" strokeWidth="3" />
            <path
              d="M121 144v21m-14 1h29v14h-29z"
              stroke="#a57a4a"
              strokeWidth="7"
              fill="#543b2e"
            />
          </>
        ) : (
          <>
            <path d="m37 167 44-20 5 41H37z" fill="#d2bc8b" />
            <path d="m95 148 49 18v22H95z" fill="#c7bc8f" />
            <path d="M90 137v55" stroke="#f4eee0" strokeWidth="7" />
            <path
              d="m48 169 24-10m36 0 24 11"
              stroke="#8d876b"
              strokeWidth="3"
            />
          </>
        )}
      </svg>
    );
  return (
    <svg
      className={`enemy-portrait expression-${emotion}`}
      viewBox="0 0 180 200"
      aria-hidden="true"
    >
      <ellipse cx="90" cy="191" rx="77" ry="8" fill="#1b2c29" opacity=".25" />
      <path d="M35 193v-47q4-22 35-26h40q31 4 35 26v47" fill="#465f57" />
      <path d="m69 124 21 45 21-45-21 9z" fill="#ece6d4" />
      <path d="m89 142-5 15 6 21 6-21-5-15z" fill="#a68b57" />
      <path d="M78 108h24v28H78z" fill="#d2ab85" />
      <path
        d="M58 61q0-36 32-36t32 36v25q-5 35-32 39-27-4-32-39z"
        fill="#e1bb91"
      />
      <path
        d="M56 66q-10-48 34-51 46 2 35 51l-8-18-13-9q-20 16-42 12z"
        fill="#4a4540"
      />
      <path d="M59 69h62M87 75h8" stroke="#776046" strokeWidth="3" />
      <circle
        cx="73"
        cy="76"
        r="13"
        fill="#f4ecd7"
        fillOpacity=".22"
        stroke="#776046"
        strokeWidth="3"
      />
      <circle
        cx="108"
        cy="76"
        r="13"
        fill="#f4ecd7"
        fillOpacity=".22"
        stroke="#776046"
        strokeWidth="3"
      />
      <path d="m65 59 15 3m21-3 14-3" stroke="#4a4540" strokeWidth="4" />
      <path d="m89 78-4 15h9" stroke="#ac805d" strokeWidth="2" fill="none" />
      <path
        d="M77 105q13-5 27 0"
        stroke="#785b49"
        strokeWidth="3"
        fill="none"
      />
      <path
        d="m46 178-10-21-2-24q0-8 6-6l6 17-2-34q0-8 7-5l5 30-1-39q0-8 7-5l5 43 2-33q2-8 8-3l-2 43 9-10q7-5 10 1l-11 25-17 23z"
        fill="#f8f4e8"
        stroke="#c9c9b6"
        strokeWidth="2"
      />
      <path
        d="m128 182 17-22 4-22q1-8-6-8l-7 16 5-34q0-8-7-6l-7 29 3-39q-1-8-7-5l-7 43-1-32q-2-8-8-4l1 44-8-10q-7-5-10 1l10 25 12 22z"
        fill="#f8f4e8"
        stroke="#c9c9b6"
        strokeWidth="2"
      />
      <path
        d="m43 168 27 7m-25-2 24 8m-22-2 20 7m44-10 29-6m-28 12 25-6m-23 12 21-6"
        stroke="#d7d5c4"
        strokeWidth="3"
      />
    </svg>
  );
}
