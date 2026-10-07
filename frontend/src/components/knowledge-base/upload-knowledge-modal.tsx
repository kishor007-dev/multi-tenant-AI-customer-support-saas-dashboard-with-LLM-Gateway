"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UploadKnowledgeModal({ isOpen, onClose, onSuccess }: UploadModalProps) {

  const [mode, setMode] = useState<"text" | "pdf">("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      if (title) formData.append("title", title);

      if (mode === "text") {
        formData.append("content", content);
      } else if (mode === "pdf" && file) {
        formData.append("file", file);
      } else {
        alert("Please provide the required content or file.");
        setIsSubmitting(false);
        return;
      }

      // 🔥 THE FIX: Properly parse the nested token from auth-storage
      let myToken = "";
      try {
        const authStorageStr = localStorage.getItem("auth-storage");
        if (authStorageStr) {
          const authData = JSON.parse(authStorageStr);
          myToken = authData?.state?.accessToken || "";
        }
      } catch (parseError) {
        console.error("Failed to parse auth token", parseError);
      }

      console.log("MY EXTRACTED TOKEN IS:", myToken);

      if (!myToken) {
        alert("No token found! You are not properly logged in.");
        setIsSubmitting(false);
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${apiUrl}/kb/`, { // or /api/v1/kb depending on your backend
        method: "POST",
        headers: {
          Authorization: `Bearer ${myToken}`, 
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to save document");

      // Reset form
      setTitle("");
      setContent("");
      setFile(null);
      if (onSuccess) onSuccess();
      alert("Document added to Knowledge Base successfully!");
    } catch (err) {
      console.error(err);
      alert("Error uploading document.");
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <Card className="max-w-xl mx-auto shadow-md">
      <CardHeader>
        <CardTitle>Add Knowledge Base Document</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Document Title</label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="e.g. Company Policy & Guidelines" 
              required
            />
          </div>

          {/* Tab Switcher */}
          <div>
            <div className="flex rounded-lg bg-muted p-1 mb-4">
              <button
                type="button"
                onClick={() => setMode("text")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                  mode === "text" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <FileText className="h-4 w-4" /> Direct Text
              </button>
              <button
                type="button"
                onClick={() => setMode("pdf")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                  mode === "pdf" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Upload className="h-4 w-4" /> Upload PDF
              </button>
            </div>

            {mode === "text" ? (
              <div className="space-y-1">
                <label className="block text-sm font-medium mb-1">Content</label>
                <Textarea 
                  value={content} 
                  onChange={(e) => setContent(e.target.value)} 
                  placeholder="Paste your knowledge base documentation here..." 
                  rows={6}
                />
              </div>
            ) : (
              <div className="space-y-1 border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input 
                  type="file" 
                  accept=".pdf" 
                  id="pdf-upload"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setFile(e.target.files[0]);
                  }}
                />
                <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {file ? file.name : "Click to select a PDF file or drag & drop"}
                  </span>
                  <span className="text-xs text-muted-foreground">PDF format only</span>
                </label>
              </div>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Processing & Saving..." : "Add to Knowledge Base"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Provide a default export as well just in case anything else imports it defaultly
export default UploadKnowledgeModal;
