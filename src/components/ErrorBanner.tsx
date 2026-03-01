interface Props { message: string; onDismiss: () => void }

export default function ErrorBanner({ message, onDismiss }: Props) {
  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm">
      <span className="flex-1">{message}</span>
      <button
        onClick={onDismiss}
        className="text-red-500 hover:text-red-700 font-bold text-lg leading-none"
        aria-label="Dismiss error"
      >
        &times;
      </button>
    </div>
  );
}
