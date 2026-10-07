
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, FileText, File, Layers, Eye } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface KBDoc {
  id: string;
  title: string;
  doc_type: "pdf" | "text";
  content: string;
  total_chunks: number;
  created_at: string;
}

export function KBDocsTable({ docs = [] }: { docs: KBDoc[] }) {
  const queryClient = useQueryClient();

  // Delete Mutation
    // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (title: string) => {
      // 1. Extract the token from Zustand's persisted storage
      let token = "";
      try {
        const authStorageStr = localStorage.getItem("auth-storage");
        if (authStorageStr) {
          const authData = JSON.parse(authStorageStr);
          token = authData?.state?.accessToken || "";
        }
      } catch (error) {
        console.error("Failed to parse auth token", error);
      }

      if (!token) {
        throw new Error("Authentication token missing.");
      }

      // 2. Use the environment variable for the API URL
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      
      const res = await fetch(`${apiUrl}/kb/document/${encodeURIComponent(title)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) throw new Error("Failed to delete document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-docs"] });
    },
    onError: (error) => {
      alert("Error deleting document: " + error.message);
    }
  });


  return (
    <div className="border rounded-md bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>Document Title</TableHead>
            <TableHead>Preview</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Date Added</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {docs.map((doc) => {
            const isPdf = doc.doc_type === "pdf" || doc.title.toLowerCase().endsWith(".pdf");
            
            return (
              <TableRow key={doc.id}>
                {/* Icon */}
                <TableCell>
                  <div className={`p-2 rounded-md ${isPdf ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'}`}>
                    {isPdf ? <File className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </div>
                </TableCell>
                
                {/* Title */}
                <TableCell className="font-medium whitespace-nowrap">
                  {doc.title}
                </TableCell>
                
                {/* Content Preview */}
                <TableCell className="max-w-[200px] truncate text-muted-foreground text-xs">
                  {doc.content || "No preview available..."}
                </TableCell>
                
                {/* Size / Chunks */}
                <TableCell>
                  <div className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-md w-max font-medium">
                    <Layers className="h-3 w-3" />
                    {doc.total_chunks} Chunks
                  </div>
                </TableCell>
                
                {/* Date */}
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  {new Date(doc.created_at).toLocaleDateString("en-IN")}
                </TableCell>
                
                {/* Actions */}
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => {
                       if (confirm(`Are you sure you want to delete "${doc.title}"?`)) {
                         deleteMutation.mutate(doc.title);
                       }
                    }}
                    disabled={deleteMutation.isPending}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
