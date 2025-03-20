import { CheckCircle2, AlertCircle, Search } from "lucide-react"

interface StatusMessageProps {
  type: 'success' | 'error' | 'info'
  text: string
}

export function StatusMessage({ type, text }: StatusMessageProps) {
  return (
    <div className={`rounded-lg px-4 py-3 ${
      type === 'success' ? 'bg-teal-400 text-white' :
      type === 'error' ? 'bg-transparent text-red-600 border border-red-600' :
      'bg-blue-100 text-blue-800 border border-blue-300'
    }`}>
      <div className="flex items-center gap-2">
        {type === 'success' ? (
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
        ) : type === 'error' ? (
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
        ) : (
          <Search className="h-5 w-5 flex-shrink-0" />
        )}
        <p className="text-sm">{text}</p>
      </div>
    </div>
  )
}
