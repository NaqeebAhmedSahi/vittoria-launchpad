import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Lock } from "lucide-react";

const datastores = [
  {
    name: 'core',
    description: 'Primary operational data - candidates, firms, mandates, deals',
    status: 'active',
    rls: true,
  },
  {
    name: 'internal_vittoria',
    description: 'Internal notes, avoid lists, political assessments, full intelligence',
    status: 'active',
    rls: true,
  },
  {
    name: 'edge_clients',
    description: 'Client-facing sanitized views - redacted, banded, no internal notes',
    status: 'active',
    rls: true,
  },
  {
    name: 'system_metrics',
    description: 'System health, performance metrics, audit logs',
    status: 'active',
    rls: false,
  },
];

export function DatastorePanel() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Datastore Schemas</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Logical separation of data by access level and purpose
        </p>
      </div>

      <div className="grid gap-4">
        {datastores.map((store) => (
          <Card key={store.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{store.name}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {store.rls && (
                    <Badge variant="outline" className="text-xs">
                      <Lock className="h-3 w-3 mr-1" />
                      RLS
                    </Badge>
                  )}
                  <Badge variant={store.status === 'active' ? 'default' : 'secondary'}>
                    {store.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                {store.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> These are logical schema namespaces within the PostgreSQL database. 
            Row-Level Security (RLS) policies enforce access control where enabled.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
