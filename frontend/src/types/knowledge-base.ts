export interface KBDoc {
  id: string;
  title: string;
  doc_type: "pdf" | "text";
  content: string;
  total_chunks: number;
  created_at: string;
  has_file?: boolean;
}

 
export interface KBPaginatedResponse { 
  org_id: string; 
  count: number; 
  docs: KBDoc[]; 
} 
 
export interface KBCreateRequest { 
  content: string;  
} 
 
export interface KBCreateResponse { 
  message: string; 
  org_id: string; 
  chunks_stored: number; 
  chunk_ids: string[]; 
} 
 
export interface KBSearchRequest { 
  query: string; 
  k?: number; 
} 
 
export interface KBSearchResult { 
  id: string; 
  content: string; 
  chunk_index: number; 
  score: number; 
} 
 
export interface KBSearchResponse { 
  org_id: string; 
  query: string; 
  results: KBSearchResult[]; 
}