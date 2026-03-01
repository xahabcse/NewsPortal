import SEO from '../components/SEO'
import DailyTimeline from '../components/DailyTimeline'

const TimelinePage = () => {
    return (
        <>
            <SEO
                title="Daily News Timeline"
                description="Day-wise national and international news highlights"
            />
            <main className="max-w-6xl mx-auto px-4 py-8">
                <DailyTimeline />
            </main>
        </>
    )
}

export default TimelinePage
