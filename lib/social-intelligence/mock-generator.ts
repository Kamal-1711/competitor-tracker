export type SocialPlatform = "linkedin" | "twitter" | "youtube" | "instagram";

export interface PlatformMetrics {
    sentiment: "Positive" | "Neutral" | "Negative";
    postVolume: number;
    engagementRate: string;
    trend: "up" | "down" | "stable";
    topTheme: string;
}

export interface SocialSignalCluster {
    title: string;
    signals: string[];
    type: "expansion" | "gtm" | "reduction" | "generic";
}

export interface SocialPost {
    platform: SocialPlatform;
    text: string;
    engagement: string;
    date: string;
}

export interface CompetitorSocialImpact {
    competitorId: string;
    overallMomentum: "Rising" | "Stable" | "Declining";
    momentumValue: number; // 0-100
    marketSummary: string;
    narrativeShift: {
        previous: string[];
        emerging: string[];
        interpretation: string;
    };
    platformMetrics: Record<SocialPlatform, PlatformMetrics>;
    signalClusters: SocialSignalCluster[];
    strategicForecast: {
        forecast: string;
        watchSignals: string[];
    };
    topPosts: SocialPost[];
}

/**
 * Deterministic mock generator based on competitorId.
 */
export function getSocialImpactForCompetitor(competitorId: string, name: string): CompetitorSocialImpact {
    // Use sum of char codes as seed for semi-determinism
    const seed = Array.from(competitorId).reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const momentumValue = (seed % 40) + 60; // 60-100
    const overallMomentum = momentumValue > 85 ? "Rising" : momentumValue > 70 ? "Stable" : "Declining";

    return {
        competitorId,
        overallMomentum,
        momentumValue,
        marketSummary: `Over the last 30 days, ${name}'s social presence has shown ${overallMomentum.toLowerCase()} momentum, particularly driven by engagement in ${seed % 2 === 0 ? "AI-first" : "Enterprise-grade"} product narratives.`,
        narrativeShift: {
            previous: ["Feature-led growth", "Generic efficiency", "Service stability"],
            emerging: [
                seed % 2 === 0 ? "AI-Native Workflows" : "Predictive Analytics",
                "Enterprise Orchestration",
                "Autonomous Operations"
            ],
            interpretation: `${name} is successfully repositioning from a utility provider to a strategic AI partner in the eyes of their core audience.`
        },
        platformMetrics: {
            linkedin: {
                sentiment: "Positive",
                postVolume: (seed % 15) + 5,
                engagementRate: `${(seed % 5) + 2.5}%`,
                trend: "up",
                topTheme: "Thought Leadership"
            },
            twitter: {
                sentiment: seed % 3 === 0 ? "Neutral" : "Positive",
                postVolume: (seed % 30) + 20,
                engagementRate: `${(seed % 2) + 0.5}%`,
                trend: seed % 2 === 0 ? "up" : "stable",
                topTheme: "Product Updates"
            },
            youtube: {
                sentiment: "Positive",
                postVolume: (seed % 3) + 1,
                engagementRate: `${(seed % 8) + 4}%`,
                trend: "up",
                topTheme: "Technical Demos"
            },
            instagram: {
                sentiment: "Neutral",
                postVolume: 2,
                engagementRate: "1.2%",
                trend: "stable",
                topTheme: "Culture"
            }
        },
        signalClusters: [
            {
                title: "AI Talent Acquisition",
                type: "expansion",
                signals: [
                    "Increased mentions of 'GenAI Engineering' in hiring",
                    "3 senior AI researchers joined in last 60 days",
                    "Active sponsorship of LLM hackathons"
                ]
            },
            {
                title: "Large Enterprise Pivot",
                type: "gtm",
                signals: [
                    "Shift from SMB-focused content to 'Global Scale'",
                    "New case studies featuring Fortune 500 clients",
                    "Speaking slots at enterprise-focused summits"
                ]
            }
        ],
        strategicForecast: {
            forecast: `Expect ${name} to announce a major platform-wide AI integration or rebranding within the next 45-60 days based on their current messaging density.`,
            watchSignals: [
                "Domain registration for 'AI-subdomain'",
                "Patent filings related to predictive modeling",
                "Leadership changes in product marketing"
            ]
        },
        topPosts: [
            {
                platform: "linkedin",
                text: `Excited to showcase how we're reshaping ${name} with native AI primitives...`,
                engagement: "1.2k likes",
                date: "2 days ago"
            },
            {
                platform: "twitter",
                text: "The future of automation isn't code, it's context. 🧵 1/10",
                engagement: "450 retweets",
                date: "4 days ago"
            }
        ]
    };
}
