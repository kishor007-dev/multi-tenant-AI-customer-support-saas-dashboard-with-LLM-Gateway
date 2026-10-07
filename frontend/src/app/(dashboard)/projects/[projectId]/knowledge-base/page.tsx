"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useKBDocs } from "@/hooks/use-kb";
import { kbService } from "@/services/kb-service";
import { BookOpen, File, FileText, Trash2, Layers, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";

export default function KnowledgeBasePage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useKBDocs(projectId, 20, 0);

  const [showDocsModal, setShowDocsModal] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"text" | "pdf">("text");
  const [file, setFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const docs = data?.docs || [];
  const recentDocs = docs.slice(0, 4);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      const formData = new FormData();
      if (title) formData.append("title", title);

      if (activeTab === "pdf" && file) {
        formData.append("file", file);
      } else {
        formData.append("content", content);
      }

      await kbService.createDoc(projectId, formData);
      setTitle("");
      setContent("");
      setFile(null);

      queryClient.invalidateQueries({ queryKey: ["kb"] });
      alert("Document successfully added to Knowledge Base!");
    } catch (err: any) {
      alert("Error uploading document: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${docTitle}"?`)) return;
    try {
      await kbService.deleteDoc(projectId, docTitle);
      queryClient.invalidateQueries({ queryKey: ["kb"] });
    } catch (err: any) {
      alert("Error deleting document: " + err.message);
    }
  };

  return (
    <div className="mx-auto h-full max-w-7xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Knowledge Base</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your organization's vector embeddings for AI answers.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Upload form */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-soft lg:col-span-3">
          <h2 className="text-lg font-semibold text-foreground">Add Document</h2>
          <form onSubmit={handleUpload} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label>Document Title</Label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Company Policy & Guidelines"
              />
            </div>

            <div className="flex w-max rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setActiveTab("text")}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  activeTab === "text" ? "bg-background text-foreground shadow-soft" : "text-muted-foreground"
                )}
              >
                Direct Text
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pdf")}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  activeTab === "pdf" ? "bg-background text-foreground shadow-soft" : "text-muted-foreground"
                )}
              >
                Upload PDF
              </button>
            </div>

            {activeTab === "pdf" ? (
              <div className="space-y-1.5">
                <Label>Select PDF</Label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20"
                  required
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Content</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  required
                  placeholder="Paste your knowledge base documentation here..."
                />
              </div>
            )}

            <Button type="submit" disabled={isUploading} className="w-full">
              {isUploading ? "Uploading & processing…" : "Add to Knowledge Base"}
            </Button>
          </form>
        </div>

        {/* Library preview */}
        <div className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Library</h2>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${docs.length} document${docs.length === 1 ? "" : "s"} indexed`}
          </p>

          <div className="mt-5 flex-1 space-y-2">
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading documents…</div>
            ) : recentDocs.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center text-muted-foreground">
                <BookOpen className="mb-2 h-8 w-8 opacity-20" />
                <p className="text-sm">No documents uploaded yet.</p>
              </div>
            ) : (
              recentDocs.map((doc: any) => {
                const isPdf = doc.doc_type === "pdf" || doc.title?.toLowerCase().endsWith(".pdf");
                return (
                  <div
                    key={doc.id || doc.title}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/30"
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        isPdf ? "bg-violet/10 text-violet" : "bg-primary/10 text-primary"
                      )}
                    >
                      {isPdf ? <File className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{doc.total_chunks || 1} chunks</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {docs.length > 0 && (
            <Button variant="outline" className="mt-4 w-full" onClick={() => setShowDocsModal(true)}>
              View all documents
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Dialog open={showDocsModal} onOpenChange={(open) => !open && setShowDocsModal(false)}>
        <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col p-0">
          <DialogHeader className="border-b border-border p-5">
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Uploaded Documents
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-5">
            {isLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Loading documents…</div>
            ) : docs.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center text-muted-foreground">
                <BookOpen className="mb-3 h-10 w-10 opacity-20" />
                <p className="text-sm">No documents uploaded yet.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {docs.map((doc: any) => {
                  const isPdf = doc.doc_type === "pdf" || doc.title?.toLowerCase().endsWith(".pdf");
                  return (
                    <div
                      key={doc.id || doc.title}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                            isPdf ? "bg-violet/10 text-violet" : "bg-primary/10 text-primary"
                          )}
                        >
                          {isPdf ? <File className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{doc.title}</p>
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Layers className="h-3 w-3" /> {doc.total_chunks || 1} chunks
                            </span>
                            <span>Added {new Date(doc.created_at).toLocaleDateString("en-IN")}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(doc.title)}
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}