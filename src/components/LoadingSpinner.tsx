interface Props { message: string }

export default function LoadingSpinner({ message }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin" />
      <p className="text-gray-600 text-sm">{message}</p>
    </div>
  );
}
