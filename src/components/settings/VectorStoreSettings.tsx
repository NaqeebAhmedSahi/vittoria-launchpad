import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Database, Box, CheckCircle } from "lucide-react";
import { useState } from "react";

export function VectorStoreSettings() {
  const [selectedStore, setSelectedStore] = useState<'pgvector' | 'qdrant'>('pgvector');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Vector Store Configuration</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Choose your vector database for embeddings and similarity search
        </p>
      </div>

      <RadioGroup value={selectedStore} onValueChange={(v: any) => setSelectedStore(v)}>
        <Card className={selectedStore === 'pgvector' ? 'border-primary' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RadioGroupItem value="pgvector" id="pgvector" />
                <Label htmlFor="pgvector" className="cursor-pointer flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  <span className="font-semibold">pgvector (PostgreSQL)</span>
                </Label>
              </div>
              <Badge variant="default">Recommended</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-sm space-y-2">
              <p>
                Integrated vector extension for PostgreSQL. Stores embeddings directly 
                in your primary database.
              </p>
              <div className="flex items-start gap-2 text-xs text-muted-foreground mt-3">
                <CheckCircle className="h-4 w-4 text-status-success mt-0.5 flex-shrink-0" />
                <span>No additional infrastructure</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-status-success mt-0.5 flex-shrink-0" />
                <span>ACID transactions with relational data</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-status-success mt-0.5 flex-shrink-0" />
                <span>Simpler deployment and maintenance</span>
              </div>
            </CardDescription>
          </CardContent>
        </Card>

        <Card className={selectedStore === 'qdrant' ? 'border-primary' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RadioGroupItem value="qdrant" id="qdrant" />
                <Label htmlFor="qdrant" className="cursor-pointer flex items-center gap-2">
                  <Box className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Qdrant (Docker)</span>
                </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-sm space-y-2">
              <p>
                Dedicated vector database running in Docker. Optimized for large-scale 
                vector similarity search.
              </p>
              <div className="flex items-start gap-2 text-xs text-muted-foreground mt-3">
                <CheckCircle className="h-4 w-4 text-status-success mt-0.5 flex-shrink-0" />
                <span>High-performance vector operations</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-status-success mt-0.5 flex-shrink-0" />
                <span>Advanced filtering and payload support</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-status-success mt-0.5 flex-shrink-0" />
                <span>Scales independently from main database</span>
              </div>
            </CardDescription>
          </CardContent>
        </Card>
      </RadioGroup>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> This setting is for UI preference only. 
            Actual infrastructure configuration will be handled during deployment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
