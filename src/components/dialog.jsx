import { useRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

// shadcn/ui Dialog composition using the console's Bootstrap theme tokens.
export const Dialog = DialogPrimitive.Root;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ children, dismissible, returnFocus, className = '' }) {
  const panel = useRef(null);
  function preventDismiss(event) {
    if (!dismissible) event.preventDefault();
  }

  return <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay data-slot="dialog-overlay" className="console-dialog-overlay" />
    <DialogPrimitive.Content
      ref={panel}
      data-slot="dialog-content"
      className={`console-dialog ${className}`}
      aria-describedby={undefined}
      onOpenAutoFocus={event => {
        event.preventDefault();
        panel.current?.focus({ preventScroll: true });
      }}
      onEscapeKeyDown={event => {
        if (event.target?.closest?.('[data-search-picker-open]')) event.preventDefault();
        else preventDismiss(event);
      }}
      onInteractOutside={preventDismiss}
      onCloseAutoFocus={event => {
        if (returnFocus?.isConnected) {
          event.preventDefault();
          returnFocus.focus({ preventScroll: true });
        }
      }}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>;
}

export function DialogHeader({ children }) {
  return <div data-slot="dialog-header" className="console-dialog-header">{children}</div>;
}

export function DialogTitle({ children }) {
  return <DialogPrimitive.Title asChild>
    <h5 data-slot="dialog-title" className="mb-0">{children}</h5>
  </DialogPrimitive.Title>;
}

export function DialogFooter({ children }) {
  return <div data-slot="dialog-footer" className="console-dialog-footer">{children}</div>;
}
