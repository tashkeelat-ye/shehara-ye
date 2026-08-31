import React from "react";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  title?: string;
};

export function BottomSheet({open, onClose, children, title}: BottomSheetProps){
  return (
    <div
      aria-hidden={!open}
      className={[
        'fixed inset-0 z-[var(--z-drawer)] flex items-end justify-center',
        open ? '' : 'pointer-events-none'
      ].join(' ')}
    >
      <div
        onClick={onClose}
        className={[
          'absolute inset-0 bg-black/40 transition-opacity',
          open ? 'opacity-100' : 'opacity-0'
        ].join(' ')}
      />

      <div
        role="dialog"
        aria-modal="true"
        className={[
          'relative w-full max-w-xl rounded-t-[var(--radius)] bg-[var(--color-surface)] p-4',
          open ? 'translate-y-0' : 'translate-y-[100%]',
        ].join(' ')}
      >
        {title ? (
          <div className="mb-2 text-[14px] font-bold">{title}</div>
        ) : null}

        {children}
      </div>
    </div>
  );
}

export default BottomSheet;
