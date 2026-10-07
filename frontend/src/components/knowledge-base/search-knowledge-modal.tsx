"use client";
import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSearchKB } from "@/hooks/use-kb";
import { Search, Loader2 } from "lucide-react";
import { ErrorState } from "@/components/ui/error-state";
interface SearchKnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}
export function SearchKnowledgeModal({ isOpen, onClose, projectId }: SearchKnowledgeModalProps) {
  const [query, setQuery] = React.useState("");
  const [k, setK] = React.useState(5);
  const { mutate: search, data, isPending, error } = useSearchKB(projectId);

const handleSearch = (e: React.FormEvent) => {
e.preventDefault();
if (query.trim().length >= 2) {
search({ query: query.trim(), k });
}
};
React.useEffect(() => {
if (!isOpen) {
setQuery("");
setK(5);
} }, [isOpen]);
return (
<Modal isOpen={isOpen} onClose={onClose} title="Search Knowledge
Base" description="Perform a semantic vector search across your
documents.">
<div className="space-y-6">
<form onSubmit={handleSearch} className="flex gap-2">
<div className="flex-1 space-y-2">
<Label htmlFor="searchQuery"
className="sr-only">Query</Label>
<Input
id="searchQuery"
value={query}
onChange={(e) => setQuery(e.target.value)}
placeholder="E.g., How do I reset a password?"
disabled={isPending}
/>
</div>
<div className="w-20 space-y-2">
<Label htmlFor="searchK" className="sr-only">Limit</Label>
<Input
id="searchK"
type="number"
min={1}
max={20}
value={k}
onChange={(e) => setK(Number(e.target.value))}
disabled={isPending}
/>
</div>
<Button type="submit" disabled={isPending ||
query.trim().length < 2} className="px-3">
{isPending ? <Loader2 className="h-4 w-4 animate-spin" />
: <Search className="h-4 w-4" />}
</Button>
</form>
{error && (
<ErrorState variant="section" message="Search failed. Please
try again." />
)}
<div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
{data?.results && data.results.length === 0 && (
<p className="text-sm text-muted-foreground text-center
py-8">No results found.</p>
)} {data?.results?.map((result) => (
<div key={result.id} className="rounded-lg border
border-border p-4 bg-muted/30 space-y-2">
<p className="text-sm font-sans text-foreground
leading-relaxed line-clamp-3">
{result.content}
</p>
<div className="flex items-center justify-between mt-2">
<span className="text-[10px] uppercase font-mono
text-muted-foreground font-semibold tracking-wider">
Chunk {result.chunk_index}
</span>
<div className="flex items-center gap-2"
title={`Relevance: ${result.score.toFixed(3)}`}>
<span className="text-xs
text-muted-foreground">Relevance</span>
<div className="h-1.5 w-16 bg-background
rounded-full overflow-hidden">
<div
className="h-full bg-primary"
style={{ width: `${Math.max(0, Math.min(100,
result.score * 100))}%` }}
/>
</div>
</div>
</div>
</div>
))}
</div>
</div>
</Modal>
);
}
