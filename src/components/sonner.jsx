import { Toaster as Sonner } from 'sonner';
import { Icon } from './icon.jsx';

export function Toaster({ theme }) {
  return <Sonner
    className="console-toaster"
    theme={theme}
    position="top-center"
    duration={3000}
    offset={16}
    mobileOffset={12}
    closeButton
    toastOptions={{
      unstyled: true,
      closeButtonAriaLabel: 'Dismiss notification',
      classNames: {
        toast: 'console-toast',
        icon: 'console-toast-icon',
        content: 'console-toast-content',
        title: 'console-toast-title',
        description: 'console-toast-description',
        closeButton: 'console-toast-close',
      },
    }}
    icons={{
      loading: <span className="console-toast-spinner" aria-hidden="true" />,
      success: <Icon name="check" />,
      info: <Icon name="info" />,
      error: <Icon name="error" />,
      warning: <Icon name="warning" />,
      close: <Icon name="close" />,
    }}
  />;
}
