export interface StrategicIntelligence {
    companyName: string;
    domain: string;
    lastAnalyzed: string;
    monitoringStatus: "Stable" | "Active Shift" | "Expansion Detected";
    aiConfidenceScore: number;
    companyProfile: {
        name: string;
        industry: string;
        foundedYear: string;
        employees: string;
        headquarters: string;
        linkedinFollowers: string;
        fundingStage: string;
        appRating?: string;
        websiteConfidence: "High" | "Medium" | "Low";
    };
    executiveVerdict: {
        strategicPosture: string;
        currentMotion: string;
        riskLevel: "Low" | "Moderate" | "High";
        momentumDirection: string;
        confidenceLevel: "Low" | "Medium" | "High";
        signalsUsed: string[];
    };
    strategicMovement: {
        messagingChanges: string[];
        pricingChanges: string[];
        gtmSignals: string[];
        aiInterpretation: string;
    };
    strengthRiskAnalysis: {
        strengths: string[];
        risks: string[];
        strategicImplication: string;
        confidence: "Low" | "Medium" | "High";
    };
    pricingIntelligence: {
        plans: { name: string; price: string; features: string[] }[];
        recentChanges: string[];
        aiAnalysis: string;
    };
    narrativeDrift: {
        pastFocus: string[];
        currentFocus: string[];
        aiConclusion: string;
    };
    blogIntelligence: {
        topThemes: string[];
        funnelIntent: {
            top: "Low" | "Medium" | "High";
            mid: "Low" | "Medium" | "High";
            bottom: "Low" | "Medium" | "High";
        };
        aiInsight: string;
        suggestedCounterMove: string;
    };
    watchAlerts: string[];
    advancedSignals: {
        headlineFrequency: string;
        ctaShift: string;
        pricingStructure: string;
        contentVolume: string;
    };
    rawLogs: {
        timestamp: string;
        source: string;
        event: string;
    }[];
}

const DATA_GROWW: StrategicIntelligence = {
    companyName: "Groww",
    domain: "groww.in",
    lastAnalyzed: "Feb 12, 2026",
    monitoringStatus: "Stable",
    aiConfidenceScore: 82,
    companyProfile: {
        name: "Groww",
        industry: "FinTech (Retail Investing)",
        foundedYear: "2016",
        employees: "2,000+",
        headquarters: "Bengaluru, India",
        linkedinFollowers: "450,000+",
        fundingStage: "Series E (Public reports)",
        appRating: "4.3 / 5 (Play Store)",
        websiteConfidence: "Medium",
    },
    executiveVerdict: {
        strategicPosture: "Growth-Oriented Challenger",
        currentMotion: "Messaging expansion toward long-term wealth positioning",
        riskLevel: "Moderate",
        momentumDirection: "Positive acceleration detected",
        confidenceLevel: "High",
        signalsUsed: ["Homepage", "Pricing", "Blog Content", "CTA Patterns"],
    },
    strategicMovement: {
        messagingChanges: [
            'Increased frequency of "long-term investing"',
            "Added trust-driven language",
            "Reduced short-term trading emphasis",
        ],
        pricingChanges: [
            "No structural price changes",
            "Strengthened value articulation in premium tiers",
        ],
        gtmSignals: [
            'CTA tone shifted from "Start Trading" to "Start Investing Smartly"',
            "Increased educational funnel push",
        ],
        aiInterpretation:
            "Competitor appears to be repositioning from high-frequency trading focus toward long-term wealth management narrative.",
    },
    strengthRiskAnalysis: {
        strengths: [
            "Clear retail-focused positioning",
            "Strong content velocity in education",
            "High CTA clarity",
            "Consistent brand tone",
        ],
        risks: [
            "Limited enterprise signaling",
            "No experimentation in pricing tiers",
            "Narrow vertical targeting",
            "Heavy dependency on retail sentiment",
        ],
        strategicImplication:
            "If retail market slows, growth velocity may decline due to concentrated segment exposure.",
        confidence: "Medium",
    },
    pricingIntelligence: {
        plans: [
            { name: "Direct Mutual Funds", price: "₹0", features: ["0% commission", "No hidden charges"] },
            { name: "Equity Delivery", price: "₹20 or 0.05%", features: ["Lower of the two", "Flat fee structure"] },
            { name: "Intraday", price: "₹20", features: ["Flat fee per executed order"] }
        ],
        recentChanges: ["Clarified checking charges on pricing page", "Highlighted 'No AMC' feature"],
        aiAnalysis: "Maintaining aggressive low-cost leadership to sustain user acquisition momentum."
    },
    narrativeDrift: {
        pastFocus: ["Low-cost trading", "Fast execution", "Brokerage advantage"],
        currentFocus: ["Long-term investing", "Wealth creation", "Financial literacy"],
        aiConclusion:
            "Brand messaging evolving toward trust-based wealth positioning strategy.",
    },
    blogIntelligence: {
        topThemes: [
            "Personal finance basics",
            "SIP education",
            "Mutual fund comparison",
        ],
        funnelIntent: {
            top: "High",
            mid: "Medium",
            bottom: "Low",
        },
        aiInsight:
            "Content engine optimized for acquisition, not conversion acceleration.",
        suggestedCounterMove:
            "Introduce deeper mid-funnel comparative assets to intercept buyer evaluation stage.",
    },
    watchAlerts: [
        "Messaging repositioning trend",
        "Retail dependency risk",
        "Education-heavy funnel bias",
        "No enterprise expansion signal",
    ],
    advancedSignals: {
        headlineFrequency: "High recurrence of 'Wealth' and 'Long-term' keywords.",
        ctaShift: "Shift from 'Trade' to 'Invest' verbs in primary buttons.",
        pricingStructure: "Stable flat-fee structure detected.",
        contentVolume: "12 new blog posts detected in last 30 days.",
    },
    rawLogs: [
        { timestamp: "2026-02-12 14:30", source: "Crawler", event: "Detected strict CSP on pricing page" },
        { timestamp: "2026-02-12 14:28", source: "Analyzer", event: "Identified 3 new blog posts" },
        { timestamp: "2026-02-12 10:15", source: "Monitor", event: "Homepage hero text check: No change" }
    ]
};

const DATA_ZERODHA: StrategicIntelligence = {
    companyName: "Zerodha",
    domain: "zerodha.com",
    lastAnalyzed: "Feb 12, 2026",
    monitoringStatus: "Stable",
    aiConfidenceScore: 94,
    companyProfile: {
        name: "Zerodha",
        industry: "FinTech (Brokerage)",
        foundedYear: "2010",
        employees: "1,100+",
        headquarters: "Bengaluru, India",
        linkedinFollowers: "850,000+",
        fundingStage: "Bootstrapped",
        appRating: "4.2 / 5",
        websiteConfidence: "High",
    },
    executiveVerdict: {
        strategicPosture: "Market Leader / Incumbent",
        currentMotion: "Focus on ecosystem consolidation and tech superiority",
        riskLevel: "Low",
        momentumDirection: "Stable compounding",
        confidenceLevel: "High",
        signalsUsed: ["API Documentation", "Support Portal", "Homepage", "Pricing"],
    },
    strategicMovement: {
        messagingChanges: [
            "Subtle shift towards 'Partner' terminology",
            "Emphasis on 'Clean code' and reliability",
        ],
        pricingChanges: ["No changes detected", "Maintained zero-brokerage stance"],
        gtmSignals: [
            "Reduced aggressive acquisition marketing",
            "Focus on community-driven growth",
        ],
        aiInterpretation:
            "Zerodha is doubling down on technical trust and ecosystem lock-in rather than aggressive new user acquisition.",
    },
    strengthRiskAnalysis: {
        strengths: [
            "Domestically unmatched technical reputation",
            "Extremely low CAC due to referral/brand",
            "Deep API ecosystem lock-in",
        ],
        risks: [
            "Perceived lack of advisory/hand-holding for new users",
            "UI aging compared to newer neobrokers",
        ],
        strategicImplication:
            "High barrier to exit for power users, but vulnerable to 'easy-to-use' competitors capturing Gen-Z entry segment.",
        confidence: "High",
    },
    pricingIntelligence: {
        plans: [
            { name: "Equity Delivery", price: "₹0", features: ["Free forever", "No hidden costs"] },
            { name: "Intraday & F&O", price: "₹20", features: ["Flat fee per executed order"] }
        ],
        recentChanges: ["No changes in last 90 days"],
        aiAnalysis: "Pricing consistency reinforces brand value of transparency and stability."
    },
    narrativeDrift: {
        pastFocus: ["Lowest cost", "Technology first", "Disruption"],
        currentFocus: ["Ecosystem", "Education (Varsity)", "Financial Health"],
        aiConclusion:
            "Maturation from 'Disruptor' to 'Standard Bearer' of the industry.",
    },
    blogIntelligence: {
        topThemes: ["Market regulation", "Technical trading", "System architecture"],
        funnelIntent: {
            top: "Low",
            mid: "High",
            bottom: "Medium",
        },
        aiInsight:
            "Content targets sophisticated users and builds authority, ignoring basic SEO fluff.",
        suggestedCounterMove:
            "Target the 'intimidated beginner' segment that finds Zerodha too complex.",
    },
    watchAlerts: [
        "Regulatory impact on F&O volumes",
        "New API pricing tiers",
        "Competitor feature parity speed",
    ],
    advancedSignals: {
        headlineFrequency: "Dominance of 'Invest', 'Future', 'Tech' keywords.",
        ctaShift: "Static 'Sign up' - no aggressive variants tested.",
        pricingStructure: "Zero equity delivery, flat F&O fees.",
        contentVolume: "Low frequency, high technical depth posts.",
    },
    rawLogs: [
        { timestamp: "2026-02-12 11:00", source: "Crawler", event: "Successfully parsed sitemap.xml" },
        { timestamp: "2026-02-12 10:55", source: "System", event: "Scheduled daily crawl job" }
    ]
};

const DATA_ANGEL_ONE: StrategicIntelligence = {
    companyName: "Angel One",
    domain: "angelone.in",
    lastAnalyzed: "Feb 11, 2026",
    monitoringStatus: "Expansion Detected",
    aiConfidenceScore: 88,
    companyProfile: {
        name: "Angel One",
        industry: "FinTech (Full Service Broker)",
        foundedYear: "1996",
        employees: "3,500+",
        headquarters: "Mumbai, India",
        linkedinFollowers: "300,000+",
        fundingStage: "Public (NSE/BSE)",
        appRating: "4.4 / 5",
        websiteConfidence: "High",
    },
    executiveVerdict: {
        strategicPosture: "Aggressive Scale-Up",
        currentMotion: "Rapid diversification into Super-App territory",
        riskLevel: "Moderate",
        momentumDirection: "High velocity expansion",
        confidenceLevel: "Medium",
        signalsUsed: ["App Store Updates", "Landing Pages", "Press Releases"],
    },
    strategicMovement: {
        messagingChanges: [
            "Heavy use of 'Super App' terminology",
            "Added 'Loans' and 'Insurance' to primary nav",
        ],
        pricingChanges: ["New cross-sell bundles detected"],
        gtmSignals: [
            "Massive influencer marketing campaigns detected",
            "Tier 2/3 city focused vernacular landing pages",
        ],
        aiInterpretation:
            "Clear strategy to become the financial operating system for Bharat, moving beyond just broking.",
    },
    strengthRiskAnalysis: {
        strengths: [
            "Massive offline-to-online conversion network",
            "Strong vernacular support",
            "Rapid feature shipping velocity",
        ],
        risks: [
            "Brand dilution due to too many products",
            "UX clutter in the main app",
            "High dependency on authorized persons network",
        ],
        strategicImplication:
            "Will likely capture the next 100M users via distribution muscle, but may lose premium users to cleaner UX apps.",
        confidence: "High",
    },
    pricingIntelligence: {
        plans: [
            { name: "iTrade Prime", price: "₹20", features: ["Flat fee structure", "Zero brokerage on delivery"] },
            { name: "Margin Funding", price: "18% p.a.", features: ["Competitive MTF rates"] }
        ],
        recentChanges: ["New bundled offers for loan products"],
        aiAnalysis: "Using brokerage as loss leader to drive high-margin lending revenue."
    },
    narrativeDrift: {
        pastFocus: ["Traditional Broking", "Advisory", "Trust"],
        currentFocus: ["Fintech Super App", "Credit", "Lifestyle"],
        aiConclusion:
            "Pivot from 'Broker' to 'Fintech Giant' is fully underway.",
    },
    blogIntelligence: {
        topThemes: ["IPO explainers", "Loan eligibility", "Market updates"],
        funnelIntent: {
            top: "High",
            mid: "Low",
            bottom: "High",
        },
        aiInsight:
            "Content strategy is purely transactional and SEO volume driven.",
        suggestedCounterMove:
            "Highlight 'Specialization' and 'Expertise' to contrast against their 'Generalist' approach.",
    },
    watchAlerts: [
        "Super-app bundling success rate",
        "Credit product adoption",
        "Tier 2/3 market share shift",
    ],
    advancedSignals: {
        headlineFrequency: "High 'Free', 'Offer', 'All-in-one' frequency.",
        ctaShift: "Aggressive, urgency-based CTAs detected.",
        pricingStructure: "Complex tiered structure with cross-subsidies.",
        contentVolume: "Very high volume (daily market wraps + seo pages).",
    },
    rawLogs: [
        { timestamp: "2026-02-11 09:30", source: "Crawler", event: "Detected 4 new landing pages" },
        { timestamp: "2026-02-11 09:32", source: "Analyzer", event: "Triggered 'Super App' keyword alert" }
    ]
};

// Generic Generator for unknown companies
function generateGenericProfile(
    id: string,
    name: string
): StrategicIntelligence {
    // Simple deterministic hash for consistency
    const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hash2 = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const riskLevels: ("Low" | "Moderate" | "High")[] = [
        "Low",
        "Moderate",
        "High",
        "Moderate",
    ];
    const statuses: ("Stable" | "Active Shift" | "Expansion Detected")[] = [
        "Stable",
        "Active Shift",
        "Expansion Detected",
        "Stable",
    ];
    const postures = [
        "Niche Specialist",
        "Aggressive Challenger",
        "Defensive Incumbent",
        "Product-Led Growth",
        "Sales-Led Enterprise"
    ];
    const motions = [
        "Optimizing conversion funnels",
        "Expanding into adjacent verticals",
        "Moving up-market to enterprise",
        "Doubling down on core community",
        "Retrenching to profitable segments"
    ];

    return {
        companyName: name,
        domain: name.toLowerCase().replace(/\s+/g, "") + ".com",
        lastAnalyzed: "Feb 12, 2026",
        monitoringStatus: statuses[hash % statuses.length],
        aiConfidenceScore: 70 + (hash2 % 28),
        companyProfile: {
            name: name,
            industry: "Technology / SaaS",
            foundedYear: "2018",
            employees: "100-500",
            headquarters: "San Francisco, CA",
            linkedinFollowers: "10,000+",
            fundingStage: "Series B",
            appRating: "N/A",
            websiteConfidence: "Medium",
        },
        executiveVerdict: {
            strategicPosture: postures[hash % postures.length],
            currentMotion: motions[hash2 % motions.length],
            riskLevel: riskLevels[hash % riskLevels.length],
            momentumDirection:
                hash % 2 === 0 ? "Positive and accelerating" : "Stabilizing / Flat",
            confidenceLevel: "Medium",
            signalsUsed: ["Website Changes", "Pricing Page", "LinkedIn Insights"],
        },
        strategicMovement: {
            messagingChanges: [
                `Detected nuances in value proposition phrasing for ${name}`,
                "Minor adjustments to feature highlighting on homepage",
            ],
            pricingChanges: [
                "No major public pricing structure changes currently",
                "Potential A/B testing on lower tier observed",
            ],
            gtmSignals: [
                "Consistent blog cadence maintained",
                "Social signaling indicates focus on retention",
            ],
            aiInterpretation: `AI analysis suggests ${name} is currently in a phase of ${motions[hash2 % motions.length].toLowerCase()}.`,
        },
        strengthRiskAnalysis: {
            strengths: [
                `Strong brand recall in core ${name} segment`,
                "Efficient digital footprint",
                "Clear primary value proposition",
            ],
            risks: [
                "Competitive density increasing in their niche",
                "Potential over-reliance on single channel",
            ],
            strategicImplication: `Competitor ${name} remains a relevant threat in specific segments but shows vulnerability to differentiated attacks.`,
            confidence: "Medium",
        },
        pricingIntelligence: {
            plans: [
                { name: "Starter", price: "$29/mo", features: ["Core features", "Email support"] },
                { name: "Pro", price: "$99/mo", features: ["Advanced analytics", "Priority support"] }
            ],
            recentChanges: [],
            aiAnalysis: "Standard tier-based SaaS pricing model detected."
        },
        narrativeDrift: {
            pastFocus: ["Core Product Features", "Utility", "Speed"],
            currentFocus: ["Solutions", "Outcomes", "Customer Success"],
            aiConclusion: "Gradual shift from feature-selling to solution-selling detected.",
        },
        blogIntelligence: {
            topThemes: ["Industry Trends", "How-to Guides", "Case Studies"],
            funnelIntent: {
                top: hash % 2 === 0 ? "High" : "Medium",
                mid: "Medium",
                bottom: hash % 2 === 0 ? "Low" : "High"
            },
            aiInsight: "Content mix suggests a balanced approach, though effectiveness varies.",
            suggestedCounterMove: "Outflank with higher specificity content targeting their dissatisfied users."
        },
        watchAlerts: [
            `Monitor ${name} for pricing changes`,
            "Watch for new feature announcements",
            "Track key personnel hires"
        ],
        advancedSignals: {
            headlineFrequency: `Standard keyword density for this sector.`,
            ctaShift: "Standard 'Get Started' / 'Demo' split.",
            pricingStructure: "Appears standard.",
            contentVolume: "Moderate (~2-3 posts/month detected)."
        },
        rawLogs: []
    };
}

export function getMockIntelligence(
    competitorId: string,
    competitorName: string
): StrategicIntelligence {
    const nameLower = competitorName.toLowerCase();

    if (nameLower.includes("groww")) return { ...DATA_GROWW, companyName: competitorName };
    if (nameLower.includes("zerodha")) return { ...DATA_ZERODHA, companyName: competitorName };
    if (nameLower.includes("angel")) return { ...DATA_ANGEL_ONE, companyName: competitorName };

    return generateGenericProfile(competitorId, competitorName);
}
