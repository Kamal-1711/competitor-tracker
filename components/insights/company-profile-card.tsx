import React from "react";

interface CompanyProfileProps {
    company: {
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
}

const CompanyProfileCard: React.FC<CompanyProfileProps> = ({ company }) => {
    return (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 mb-8 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight">{company.name}</h2>
                    <p className="text-sm text-neutral-500">
                        Structured Company Intelligence Snapshot
                    </p>
                </div>

                <div className="text-xs px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 font-medium">
                    Data Confidence: {company.websiteConfidence}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <ProfileItem label="Industry" value={company.industry} />
                <ProfileItem label="Founded" value={company.foundedYear} />
                <ProfileItem label="Employees" value={company.employees} />
                <ProfileItem label="Headquarters" value={company.headquarters} />
                <ProfileItem label="LinkedIn Followers" value={company.linkedinFollowers} />
                <ProfileItem label="Funding Stage" value={company.fundingStage} />
                <ProfileItem label="App Rating" value={company.appRating || "N/A"} />
            </div>
        </div>
    );
};

const ProfileItem = ({ label, value }: { label: string; value: string }) => (
    <div>
        <p className="text-xs text-neutral-500 mb-1">{label}</p>
        <p className="font-medium text-sm md:text-base">{value}</p>
    </div>
);

export default CompanyProfileCard;
