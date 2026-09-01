import { NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { requireStaff } from '@/lib/firebaseAdmin';

// GA4 Property ID (numeric, e.g. "123456789") — set in env
const PROPERTY_ID = process.env.GA4_PROPERTY_ID;

// Disable body parsing (not needed for GET)
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    // Internal traffic data — staff only. Without this check, anyone who
    // discovers the URL could pull site analytics with no login at all.
    const staffEmail = await requireStaff(req);
    if (!staffEmail) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!PROPERTY_ID) {
        return NextResponse.json(
            { error: 'GA4_PROPERTY_ID not configured' },
            { status: 503 }
        );
    }

    try {
        // Uses Application Default Credentials automatically:
        // - In Cloud Run / App Hosting: uses the service account identity
        // - Locally: uses `gcloud auth application-default login`
        const analyticsClient = new BetaAnalyticsDataClient();
        const propertyId = `properties/${PROPERTY_ID}`;

        const [realtimeReport, sevenDayReport] = await Promise.all([
            // Active users in last 30 minutes
            analyticsClient.runRealtimeReport({
                property: propertyId,
                metrics: [{ name: 'activeUsers' }],
            }),

            // 7-day summary: sessions, page views, unique users, avg session duration
            analyticsClient.runReport({
                property: propertyId,
                dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
                metrics: [
                    { name: 'sessions' },
                    { name: 'screenPageViews' },
                    { name: 'activeUsers' },
                    { name: 'averageSessionDuration' },
                    { name: 'bounceRate' },
                ],
            }),
        ]);

        // Top 8 pages by views in last 7 days
        const [topPagesReport, dailyReport] = await Promise.all([
            analyticsClient.runReport({
                property: propertyId,
                dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
                dimensions: [{ name: 'pagePath' }],
                metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
                orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
                limit: 8,
            }),

            // Daily page views for the last 7 days (for sparkline)
            analyticsClient.runReport({
                property: propertyId,
                dateRanges: [{ startDate: '6daysAgo', endDate: 'today' }],
                dimensions: [{ name: 'date' }],
                metrics: [{ name: 'screenPageViews' }, { name: 'sessions' }],
                orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
            }),
        ]);

        // Parse realtime
        const activeUsers = Number(
            realtimeReport[0]?.rows?.[0]?.metricValues?.[0]?.value ?? 0
        );

        // Parse 7-day summary
        const summaryRow = sevenDayReport[0]?.rows?.[0]?.metricValues ?? [];
        const summary = {
            sessions: Number(summaryRow[0]?.value ?? 0),
            pageViews: Number(summaryRow[1]?.value ?? 0),
            users: Number(summaryRow[2]?.value ?? 0),
            avgSessionDuration: parseFloat(summaryRow[3]?.value ?? '0'),
            bounceRate: parseFloat(summaryRow[4]?.value ?? '0'),
        };

        // Parse top pages
        const topPages = (topPagesReport[0]?.rows ?? []).map(row => ({
            path: row.dimensionValues?.[0]?.value ?? '/',
            views: Number(row.metricValues?.[0]?.value ?? 0),
            users: Number(row.metricValues?.[1]?.value ?? 0),
        }));

        // Parse daily chart data
        const daily = (dailyReport[0]?.rows ?? []).map(row => {
            const raw = row.dimensionValues?.[0]?.value ?? '';
            const date = `${raw.slice(6, 8)}/${raw.slice(4, 6)}`;
            return {
                date,
                pageViews: Number(row.metricValues?.[0]?.value ?? 0),
                sessions: Number(row.metricValues?.[1]?.value ?? 0),
            };
        });

        return NextResponse.json({
            activeUsers,
            summary,
            topPages,
            daily,
            fetchedAt: new Date().toISOString(),
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        // Permission errors (service account not granted Analytics Data API access)
        // return 503 so CDN logs them as service-unavailable, not server errors
        const status = message.includes('PERMISSION_DENIED') || message.includes('403') ? 503 : 500;
        console.error('Analytics API error:', message);
        return NextResponse.json({ error: message }, { status });
    }
}
