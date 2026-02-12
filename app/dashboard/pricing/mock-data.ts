export interface MonetizationIntelligence {
    companyName: string;
    monitoringStatus: "Active" | "Calibration Needed" | "Coverage Gaps";
    lastAnalyzed: string;
    aiMonetizationConfidence: number;
    executiveVerdict: {
        pricingModel: string;
        monetizationMaturity: string;
        pricingStability: "Stable" | "Volatile" | "Experimental";
        upmarketMovement: string;
        competitivePressure: "Low" | "Moderate" | "High";
        aiSummary: string;
        confidence: "Low" | "Medium" | "High";
    };
    structureAnalysis: {
        plansAndTiers: string[];
        entryBarrier: string[];
        tierStrategy: string[];
        aiInsight: string;
    };
    monetizationSignals: {
        detectedChanges: string[];
        aiInterpretation: string;
    };
    packagingPositioning: {
        featureGatingIntensity: "Low" | "Moderate" | "High";
        valueFraming: string;
        discountStrategy: string;
        upsellDepth: "Limited" | "Moderate" | "Aggressive";
        aiAnalysis: string;
    };
    strategicRisks: {
        strengths: string[];
        risks: string[];
        strategicImplication: string;
        confidence: "Low" | "Medium" | "High";
    };
    competitivePositioning: {
        vsPeers: string[];
        aiConclusion: string;
    };
    advancedSignals: {
        ctaLanguage: string;
        headlineKeywords: string;
        gatingDistribution: string;
    };
}

const PRICING_GROWW: MonetizationIntelligence = {
    companyName: "Groww (Demo)",
    monitoringStatus: "Active",
    lastAnalyzed: "Feb 12, 2026",
    aiMonetizationConfidence: 79,
    executiveVerdict: {
        pricingModel: "Hybrid brokerage + platform monetization",
        monetizationMaturity: "Advanced retail model",
        pricingStability: "Stable",
        upmarketMovement: "No enterprise expansion detected",
        competitivePressure: "Moderate",
        aiSummary:
            "Competitor monetization model is optimized for high-volume retail participation rather than premium account expansion.",
        confidence: "High",
    },
    structureAnalysis: {
        plansAndTiers: [
            "Free Account Tier",
            "Brokerage-based earnings",
            "Add-on premium research tools",
        ],
        entryBarrier: ["Low friction onboarding", "Minimal pricing complexity"],
        tierStrategy: [
            "Retail mass adoption focus",
            "No enterprise segmentation",
            "No high-ticket advisory layer",
        ],
        aiInsight:
            "Structure indicates scale-driven revenue strategy, not margin-driven positioning.",
    },
    monetizationSignals: {
        detectedChanges: [
            "No plan restructuring",
            "No pricing page headline shift",
            "No feature gating modification",
            "No trial experimentation",
        ],
        aiInterpretation:
            "Stable monetization suggests either high conversion confidence or lack of experimentation velocity.",
    },
    packagingPositioning: {
        featureGatingIntensity: "Low",
        valueFraming: "Cost advantage emphasis",
        discountStrategy: "None visible",
        upsellDepth: "Limited",
        aiAnalysis:
            "Competitor focuses on simplicity and trust rather than aggressive revenue optimization layers.",
    },
    strategicRisks: {
        strengths: [
            "Clear pricing transparency",
            "Low complexity reduces buyer friction",
            "Strong retail appeal",
        ],
        risks: [
            "No tier depth for power users",
            "Limited monetization diversification",
            "Revenue vulnerable to trading volume decline",
        ],
        strategicImplication:
            "If market activity slows, revenue volatility risk increases due to retail dependency.",
        confidence: "Medium",
    },
    competitivePositioning: {
        vsPeers: [
            "Lower pricing complexity",
            "Lower enterprise push",
            "Lower upsell sophistication",
            "Higher retail clarity",
        ],
        aiConclusion:
            "Competitor is a scale-driven volume player, not a premium monetization strategist.",
    },
    advancedSignals: {
        ctaLanguage: "Invest, Start (Low urgency)",
        headlineKeywords: "Free, Zero, Direct",
        gatingDistribution: "90% Open / 10% Gated",
    },
};

const PRICING_ZERODHA: MonetizationIntelligence = {
    companyName: "Zerodha",
    monitoringStatus: "Active",
    lastAnalyzed: "Feb 12, 2026",
    aiMonetizationConfidence: 92,
    executiveVerdict: {
        pricingModel: "Flat fee discount brokerage",
        monetizationMaturity: "Market Standard Setter",
        pricingStability: "Stable",
        upmarketMovement: "API monetization focus",
        competitivePressure: "Low",
        aiSummary:
            "The gold standard for low-cost brokerage. Monetization is purely volume-driven with zero marginal cost scaling.",
        confidence: "High",
    },
    structureAnalysis: {
        plansAndTiers: [
            "Zero Equity Delivery",
            "Flat ₹20 Intraday/F&O",
            "API Subscription (Kite Connect)",
        ],
        entryBarrier: ["Account opening fee (historically)", "KYC friction"],
        tierStrategy: [
            "Single tier for all users",
            "Developer tax via API pricing",
            "No premium service tiers",
        ],
        aiInsight:
            "Radical simplicity eliminates decision fatigue. Revenue is a function of active trader volume.",
    },
    monetizationSignals: {
        detectedChanges: [
            "Maintained account opening fee despite competitors dropping it",
            "No change in brokerage caps",
        ],
        aiInterpretation:
            "Confidence in product superiority allows them to charge for entry where others subsidize it.",
    },
    packagingPositioning: {
        featureGatingIntensity: "Low",
        valueFraming: "Technology & Reliability",
        discountStrategy: "Zero Brokerage as hook",
        upsellDepth: "Limited",
        aiAnalysis:
            "Positioning is built on 'No Gimmicks'. They monetize the serious trader, not the casual browser.",
    },
    strategicRisks: {
        strengths: [
            "Unmatched cost structure efficiency",
            "High trust in transparent billing",
            "Developer ecosystem lock-in",
        ],
        risks: [
            "Race to zero on F&O changes",
            "Regulatory caps on volume-based incentives",
        ],
        strategicImplication:
            "Regulatory headwinds pose the only real threat to their monetization model.",
        confidence: "High",
    },
    competitivePositioning: {
        vsPeers: [
            "Higher entry cost (Account opening)",
            "Lower hidden costs",
            "Higher API monetization",
        ],
        aiConclusion:
            "The incumbent that defines the baseline. Everyone else prices relative to them.",
    },
    advancedSignals: {
        ctaLanguage: "Sign up, Open account",
        headlineKeywords: "Zero, Free, Flat",
        gatingDistribution: "100% Usage Based",
    },
};

const PRICING_ANGEL_ONE: MonetizationIntelligence = {
    companyName: "Angel One",
    monitoringStatus: "Active",
    lastAnalyzed: "Feb 11, 2026",
    aiMonetizationConfidence: 85,
    executiveVerdict: {
        pricingModel: "Aggressive Acquisition & Cross-Sell",
        monetizationMaturity: "High-Velocity Fintech",
        pricingStability: "Experimental",
        upmarketMovement: "Services & Credit expansion",
        competitivePressure: "High",
        aiSummary:
            "Monetization strategy relies on aggressive acquisition (waived fees) followed by intense cross-selling of third-party products.",
        confidence: "Medium",
    },
    structureAnalysis: {
        plansAndTiers: [
            "Free Equity Delivery",
            "First Year AMC Waived",
            "Margin Trade Funding (MTF)",
        ],
        entryBarrier: ["Zero friction (Free Account)", "Instant Activation"],
        tierStrategy: [
            "Mass market entry",
            "Revenue from lending (MTF) & distribution",
        ],
        aiInsight:
            "Loss-leader entry strategy subsidized by high-margin lending and distribution products.",
    },
    monetizationSignals: {
        detectedChanges: [
            "Aggressive marketing of MTF (Margin Funding)",
            "New credit line integrations",
        ],
        aiInterpretation:
            "Shift from pure broking revenue to 'Financial Super App' ARPU maximization.",
    },
    packagingPositioning: {
        featureGatingIntensity: "Moderate",
        valueFraming: "One-Stop Financial Shop",
        discountStrategy: "Heavy acquisition subsidies",
        upsellDepth: "Aggressive",
        aiAnalysis:
            "The 'Amazon of Finance' approach - get them in cheap, sell them everything.",
    },
    strategicRisks: {
        strengths: [
            "Massive distribution network",
            "High ARPU potential via cross-sell",
            "Strong vernacular penetration",
        ],
        risks: [
            "High churn quality users",
            "Brand perception as 'Salesy'",
            "Complexity of fee structure hidden in fine print",
        ],
        strategicImplication:
            "ARPU expansion is critical as CAC rises. If cross-sell fails, acquisition burn becomes unsustainable.",
        confidence: "High",
    },
    competitivePositioning: {
        vsPeers: [
            "Higher cross-sell intensity",
            "Lower entry barriers",
            "More complex hidden fees (MTF interest)",
        ],
        aiConclusion:
            "A volume aggregator play. Competing on distribution and bundle value, not platform superiority.",
    },
    advancedSignals: {
        ctaLanguage: "Claim Offer, Activate Now",
        headlineKeywords: "Free, Waived, margin",
        gatingDistribution: "Upsell driven",
    },
};

function generateGenericPricingProfile(
    id: string,
    name: string | null
): MonetizationIntelligence {
    const safeName = name || "Unknown Competitor";
    const hash = safeName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const models = [
        "Freemium SaaS",
        "Enterprise Sales-Led",
        "Usage-Based PLG",
        "Tiered Subscription"
    ];
    const maturities = ["Early Stage", "Growth Phase", "Mature Optimization", "Legacy Transition"];
    const stabilities: ("Stable" | "Volatile" | "Experimental")[] = ["Stable", "Experimental", "Stable", "Volatile"];

    return {
        companyName: safeName,
        monitoringStatus: "Active",
        lastAnalyzed: "Feb 12, 2026",
        aiMonetizationConfidence: 65 + (hash % 30),
        executiveVerdict: {
            pricingModel: models[hash % models.length],
            monetizationMaturity: maturities[hash % maturities.length],
            pricingStability: stabilities[hash % stabilities.length],
            upmarketMovement: hash % 2 === 0 ? "Detected" : "None",
            competitivePressure: hash % 3 === 0 ? "High" : "Moderate",
            aiSummary: `AI analysis indicates ${safeName} is employing a ${models[hash % models.length].toLowerCase()} model to capture market share.`,
            confidence: "Medium",
        },
        structureAnalysis: {
            plansAndTiers: ["Standard Plan", "Professional Tier", "Enterprise Custom"],
            entryBarrier: ["Moderate friction", "Credit card required"],
            tierStrategy: ["Feature-gated differentiation", "Seat-based scaling"],
            aiInsight: "Classic tiered structure designed to segment users by willingness to pay.",
        },
        monetizationSignals: {
            detectedChanges: [
                "Minor copy updates on pricing page",
                "No structural plan changes detected",
            ],
            aiInterpretation: "Pricing strategy appears established with minor optimization tests.",
        },
        packagingPositioning: {
            featureGatingIntensity: "Moderate",
            valueFraming: "Feature-rich solution",
            discountStrategy: "Annual pre-payment discounts",
            upsellDepth: "Moderate",
            aiAnalysis: "Value is framed around feature completeness and scalability.",
        },
        strategicRisks: {
            strengths: ["Clear value metric", "Standardized terms"],
            risks: ["Commoditizing feature set", "Price sensitivity in lower tiers"],
            strategicImplication: "Must continuously ship features to justify current price points.",
            confidence: "Medium",
        },
        competitivePositioning: {
            vsPeers: ["Standard pricing alignment", "Average complexity"],
            aiConclusion: "Follows industry standard conventions without significant innovation.",
        },
        advancedSignals: {
            ctaLanguage: "Start Trial, Contact Sales",
            headlineKeywords: "Pricing, Plans, Enterprise",
            gatingDistribution: "Feature based",
        },
    };
}

export function getMockPricingIntelligence(
    competitorId: string,
    competitorName: string | null
): MonetizationIntelligence {
    const safeName = competitorName || "Unknown Competitor";
    const nameLower = safeName.toLowerCase();

    if (nameLower.includes("groww")) return { ...PRICING_GROWW, companyName: safeName };
    if (nameLower.includes("zerodha")) return { ...PRICING_ZERODHA, companyName: safeName };
    if (nameLower.includes("angel")) return { ...PRICING_ANGEL_ONE, companyName: safeName };

    return generateGenericPricingProfile(competitorId, competitorName);
}
