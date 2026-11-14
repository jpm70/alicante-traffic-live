import { RefObject, useEffect, useRef } from 'react';

// Accessible behaviour shared by every full-screen dialog of the app:
//  - announced as a modal dialog to screen readers (role, aria-modal, name),
//  - Escape closes it,
//  - keyboard focus moves into it when it opens, stays inside while it is open (Tab
//    cycles through its controls) and returns to the button that opened it on close.
// Only the dialog opened last reacts, so a dialog over another one closes first.

const openDialogs: symbol[] = [];

// The control the user last pressed or tapped: the one that opened the dialog. Asking the
// browser for the focused element when the dialog mounts is not enough, because a tap on
// a touch screen (and a click in Safari) does not focus the button.
let lastPressed: HTMLElement | null = null;
if (typeof document !== 'undefined') {
  const remember = (e: Event) => {
    const target = e.target instanceof Element ? e.target.closest<HTMLElement>('button, a[href], [role="button"], input, select') : null;
    if (target) lastPressed = target;
  };
  document.addEventListener('pointerdown', remember, true);
  document.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && remember(e), true);
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogOptions {
  // Accessible name read when the dialog opens
  label: string;
  // False while the component is mounted but shows nothing
  active?: boolean;
  // False for dialogs that already handle Escape themselves
  closeOnEscape?: boolean;
  // The component's own ref to the dialog element, when it already has one
  ref?: RefObject<HTMLDivElement | null>;
}

export function useDialog(onClose: () => void, options: DialogOptions) {
  const { label, active = true, closeOnEscape = true } = options;
  const ownRef = useRef<HTMLDivElement>(null);
  const ref = options.ref ?? ownRef;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;

    const id = Symbol('dialog');
    openDialogs.push(id);
    const isTop = () => openDialogs[openDialogs.length - 1] === id;

    const focused = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    const opener = focused ?? lastPressed;
    if (!node.contains(document.activeElement)) node.focus({ preventScroll: true });

    const visibleControls = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isTop()) return;
      if (e.key === 'Escape' && closeOnEscape) {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const controls = visibleControls();
      if (controls.length === 0) {
        e.preventDefault();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      const current = document.activeElement;
      if (!node.contains(current)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && (current === first || current === node)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const index = openDialogs.indexOf(id);
      if (index !== -1) openDialogs.splice(index, 1);
      if (opener && document.contains(opener) && !node.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [active, closeOnEscape]);

  return {
    ref,
    role: 'dialog' as const,
    'aria-modal': true as const,
    'aria-label': label,
    tabIndex: -1,
  };
}
