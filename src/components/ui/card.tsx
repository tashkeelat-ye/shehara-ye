import React from "react";

export function Card({children, className = '', onClick}: {children: React.ReactNode; className?: string; onClick?: () => void}){
  return (
    <div
      onClick={onClick}
      className={[
        'rounded-[var(--radius)] bg-[var(--color-surface)] p-3 shadow-[0_10px_30px_-18px rgba(14,77,100,0.12)]',
        className
      ].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}

export default Card;
