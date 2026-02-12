"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpRight, Search, Filter, RefreshCw, Rss } from "lucide-react";
import Image from "next/image";

interface BlogPost {
    id: string;
    competitor_id: string;
    title: string;
    url: string;
    publish_date: string | null;
    excerpt: string | null;
    author: string | null;
    image_url: string | null;
    first_detected_at: string;
    tags_json?: any;
}

interface Competitor {
    id: string;
    name: string;
    url: string;
    logo_url: string | null;
}

function timeAgo(dateString: string | null) {
    if (!dateString) return "Recently";
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function formatDate(dateString: string | null) {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' });
}

export function BlogFeed({ initialPosts, competitors }: { initialPosts: any[]; competitors: any[] }) {
    const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
    const [selectedCompetitorId, setSelectedCompetitorId] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [refreshing, setRefreshing] = useState(false);

    // Filter posts
    const filteredPosts = useMemo(() => {
        return posts.filter(post => {
            const matchesCompetitor = selectedCompetitorId === "all" || post.competitor_id === selectedCompetitorId;
            const term = searchTerm.toLowerCase();
            const matchesSearch = !term ||
                post.title.toLowerCase().includes(term) ||
                (post.excerpt?.toLowerCase().includes(term) ?? false);
            return matchesCompetitor && matchesSearch;
        });
    }, [posts, selectedCompetitorId, searchTerm]);

    // Insights
    const insights = useMemo(() => {
        const total = filteredPosts.length;
        const last30 = filteredPosts.filter(p => {
            const d = p.publish_date ? new Date(p.publish_date) : new Date(p.first_detected_at);
            const diff = Date.now() - d.getTime();
            return diff < 30 * 24 * 60 * 60 * 1000;
        }).length;

        // Most Active
        const counts: Record<string, number> = {};
        filteredPosts.forEach(p => {
            counts[p.competitor_id] = (counts[p.competitor_id] || 0) + 1;
        });
        const mostActiveId = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, "");
        const mostActiveComp = competitors.find(c => c.id === mostActiveId);

        // Themes (Simple keyword extraction)
        const allText = filteredPosts.map(p => `${p.title} ${p.excerpt || ""}`).join(" ").toLowerCase();
        const words = allText.match(/\b\w{4,}\b/g) || [];
        const ignored = new Set(["with", "from", "that", "this", "blog", "post", "read", "more", "your", "market"]);
        const wordCounts: Record<string, number> = {};
        words.forEach(w => {
            if (!ignored.has(w)) wordCounts[w] = (wordCounts[w] || 0) + 1;
        });
        const themes = Object.entries(wordCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([w]) => w);

        return { total, last30, mostActiveComp, themes };
    }, [filteredPosts, competitors]);

    const handleRefresh = () => {
        setRefreshing(true);
        setTimeout(() => {
            window.location.reload();
        }, 800);
    };

    const getCompName = (id: string) => competitors.find(c => c.id === id)?.name || "Unknown";

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
            {/* Left: Feed */}
            <div className="flex-1 flex flex-col space-y-4 h-full">
                {/* Filters */}
                <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search topics..."
                            className="pl-9 bg-background/50 border-border/60"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={selectedCompetitorId} onValueChange={setSelectedCompetitorId}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="All Competitors" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Competitors</SelectItem>
                            {competitors.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
                        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                    </Button>
                </div>

                {/* Feed List */}
                <div className="flex-1 overflow-auto rounded-md border border-border/40 bg-background/30 p-4">
                    <div className="space-y-4">
                        {filteredPosts.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">
                                <Rss className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                <p>No blog posts found yet.</p>
                                <p className="text-xs mt-1">Check back after the next scheduled crawl.</p>
                            </div>
                        ) : (
                            filteredPosts.map(post => (
                                <Card key={post.id} className="glass-subtle border border-border/40 hover:bg-muted/10 transition-colors group">
                                    <CardContent className="p-4 flex gap-4">
                                        {/* Thumbnail (Optional) */}
                                        {post.image_url && (
                                            <div className="hidden sm:block w-24 h-24 flex-shrink-0 rounded-md overflow-hidden relative bg-muted">
                                                {/* Using standard img for external URLs to avoid Next.js domain config issues */}
                                                <img
                                                    src={post.image_url}
                                                    alt=""
                                                    className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity"
                                                    onError={(e) => e.currentTarget.style.display = 'none'}
                                                />
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-semibold text-lg leading-tight mb-1 group-hover:text-primary transition-colors">
                                                    <a href={post.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                        {post.title}
                                                    </a>
                                                </h3>
                                                <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground ml-2">
                                                    <ArrowUpRight className="h-4 w-4" />
                                                </a>
                                            </div>

                                            <div className="text-xs text-muted-foreground flex items-center gap-2 mb-2">
                                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
                                                    {getCompName(post.competitor_id)}
                                                </Badge>
                                                <span>•</span>
                                                <span>{post.publish_date ? formatDate(post.publish_date) : timeAgo(post.first_detected_at)}</span>
                                                {post.author && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="truncate max-w-[150px]">{post.author}</span>
                                                    </>
                                                )}
                                            </div>

                                            <p className="text-sm text-muted-foreground/80 line-clamp-2">
                                                {post.excerpt || "No excerpt available."}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Right: Insights Sidebar */}
            <div className="w-full lg:w-80 flex flex-col gap-4">
                <Card className="glass-subtle border border-border/60">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Publishing Velocity (30d)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{insights.last30}</div>
                        <p className="text-xs text-muted-foreground mt-1">New articles detected</p>
                    </CardContent>
                </Card>

                <Card className="glass-subtle border border-border/60">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Most Active</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {insights.mostActiveComp ? (
                            <div>
                                <div className="font-semibold text-lg">{insights.mostActiveComp.name}</div>
                                <div className="text-xs text-muted-foreground">Leading content volume</div>
                            </div>
                        ) : (
                            <div className="text-muted-foreground text-sm">Not enough data</div>
                        )}
                    </CardContent>
                </Card>

                <Card className="glass-subtle border border-border/60 flex-1 h-min">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Top Themes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {insights.themes.length > 0 ? (
                                insights.themes.map(theme => (
                                    <Badge key={theme} variant="outline" className="capitalize text-xs">
                                        {theme}
                                    </Badge>
                                ))
                            ) : (
                                <div className="text-muted-foreground text-sm">No themes detected</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
