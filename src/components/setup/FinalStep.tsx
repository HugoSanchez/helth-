import { useSearchParams, useRouter } from 'next/navigation'
import type { Preferences } from '@/hooks/usePreferences'
import { ScanStep } from './ScanStep'
import { ReadyStep } from './ReadyStep'

interface FinalStepProps {
    onComplete: () => void
    preferences: Preferences | null
}

export function FinalStep({ onComplete, preferences }: FinalStepProps) {
    const searchParams = useSearchParams()
    const router = useRouter()
    const skipped = searchParams.get('skipped') === 'true'

    if (skipped) {
        return <ReadyStep preferences={preferences} />
    }

    return (
        <ScanStep
            onComplete={onComplete}
            preferences={preferences}
            onSkip={() => {
                router.push('/settings?step=3&skipped=true')
            }}
        />
    )
}
