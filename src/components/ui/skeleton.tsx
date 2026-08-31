import React from "react";

export function Skeleton({className = "", style}: {className?: string; style?: React.CSSProperties}){
  return (
    <div
      aria-hidden
      className={["animate-pulse bg-[linear-gradient(90deg,#f6f6f6, #ececec, #f6f6f6)] rounded-[8px]", className].filter(Boolean).join(" ")}
      style={style}
    />
  );
}

export default Skeleton;
