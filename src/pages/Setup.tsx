import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, Database, Key, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SetupStep = 'checking' | 'postgres-check' | 'credentials' | 'create-user' | 'database' | 'complete';

export default function Setup({ onComplete }: { onComplete: () => void }) {
    const [currentStep, setCurrentStep] = useState<SetupStep>('checking');
    const [postgresInstalled, setPostgresInstalled] = useState(false);
    const [checkingPostgres, setCheckingPostgres] = useState(false);
    const [instructions, setInstructions] = useState('');

    const [credentials, setCredentials] = useState({
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        password: '',
        dbName: 'vittoria_launchpad'
    });

    // Superuser credentials for creating new user
    const [superuserPassword, setSuperuserPassword] = useState('');

    // New user credentials
    const [newUser, setNewUser] = useState({
        username: 'vittoria_admin',
        password: '',
        confirmPassword: ''
    });

    const [testing, setTesting] = useState(false);
    const [creatingUser, setCreatingUser] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);
    const [manualScript, setManualScript] = useState<string | null>(null);
    const [databases, setDatabases] = useState<any[]>([]);
    const [showDatabases, setShowDatabases] = useState(false);
    const [loadingDatabases, setLoadingDatabases] = useState(false);

    const { toast } = useToast();
    const api = window.api;

    useEffect(() => {
        console.log('[Setup] Component mounted, checking PostgreSQL...');
        checkPostgresInstallation();
    }, []);

    const checkPostgresInstallation = async () => {
        console.log('[Setup] checkPostgresInstallation called');
        setCheckingPostgres(true);
        setCurrentStep('postgres-check');

        try {
            console.log('[Setup] Calling api.setup.checkPostgres...');
            const result = await api.setup.checkPostgres();
            console.log('[Setup] checkPostgres result:', result);

            if (result.success && result.installed) {
                console.log('[Setup] PostgreSQL is installed, version:', result.version);
                setPostgresInstalled(true);
                setCurrentStep('credentials');
                toast({
                    title: "PostgreSQL Detected",
                    description: `Found PostgreSQL ${result.version || 'unknown version'}`,
                });
            } else {
                console.log('[Setup] PostgreSQL not installed');
                setPostgresInstalled(false);
                // Get installation instructions
                const instResult = await api.setup.getInstructions();
                console.log('[Setup] Installation instructions:', instResult);
                if (instResult.success) {
                    setInstructions(instResult.instructions);
                }
            }
        } catch (err: any) {
            console.error('[Setup] Error checking PostgreSQL:', err);
            setError(err.message || 'Failed to check PostgreSQL installation');
        } finally {
            setCheckingPostgres(false);
        }
    };

    const testConnection = async () => {
        console.log('[Setup] Testing connection with credentials:', { ...credentials, password: '***' });
        setTesting(true);
        setError(null);
        setAuthError(null);

        try {
            const result = await api.setup.testConnection(credentials);
            console.log('[Setup] Test connection result:', result);

            if (result.success) {
                toast({
                    title: "Connection Successful",
                    description: "Successfully connected to PostgreSQL",
                });
                // Auto-load databases after successful connection
                listDatabases();
                setCurrentStep('database');
            } else {
                // Check if it's an authentication error
                if (result.error?.includes('authentication failed') || result.error?.includes('password')) {
                    setAuthError(result.error || 'Authentication failed');
                    toast({
                        title: "Authentication Failed",
                        description: "Would you like to create a new PostgreSQL user?",
                        variant: "destructive",
                    });
                } else {
                    setError(result.message || result.error || 'Connection failed');
                    toast({
                        title: "Connection Failed",
                        description: result.message || result.error || 'Check your credentials and try again',
                        variant: "destructive",
                    });
                }
            }
        } catch (err: any) {
            console.error('[Setup] Test connection error:', err);
            setError(err.message || 'Failed to test connection');
        } finally {
            setTesting(false);
        }
    };

    const listDatabases = async () => {
        console.log('[Setup] Listing databases...');
        setLoadingDatabases(true);

        try {
            const result = await api.setup.listDatabases({
                host: credentials.host,
                port: parseInt(credentials.port),
                username: credentials.username,
                password: credentials.password
            });

            console.log('[Setup] List databases result:', result);

            if (result.success) {
                setDatabases(result.databases || []);
                setShowDatabases(true);
                toast({
                    title: "Databases Found",
                    description: `Found ${result.databases?.length || 0} databases`,
                });
            } else {
                throw new Error(result.error || 'Failed to list databases');
            }
        } catch (err: any) {
            console.error('[Setup] Failed to list databases:', err);
            toast({
                title: "Warning",
                description: "Could not list databases: " + err.message,
                variant: "destructive",
            });
        } finally {
            setLoadingDatabases(false);
        }
    };

    const createPostgresUser = async () => {
        console.log('[Setup] Creating new PostgreSQL user:', newUser.username);

        if (newUser.password !== newUser.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newUser.password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        setCreatingUser(true);
        setError(null);

        try {
            const result = await api.setup.createUser({
                superuser: {
                    host: credentials.host,
                    port: credentials.port,
                    username: credentials.username,
                    password: superuserPassword
                },
                newUser: {
                    username: newUser.username,
                    password: newUser.password
                }
            });

            console.log('[Setup] Create user result:', result);

            if (result.success) {
                toast({
                    title: "User Created",
                    description: `PostgreSQL user '${newUser.username}' created successfully`,
                });

                // Update credentials to use the new user
                setCredentials({
                    ...credentials,
                    username: newUser.username,
                    password: newUser.password
                });

                // Test connection with new credentials
                setCurrentStep('credentials');
                setAuthError(null);
                setSuperuserPassword('');
            } else {
                setError(result.message || result.error || 'Failed to create user. Try the manual option if you don\'t have the superuser password.');
                toast({
                    title: "Failed to Create User",
                    description: result.message || result.error || 'Try the manual creation option',
                    variant: "destructive",
                });
            }
        } catch (err: any) {
            console.error('[Setup] Create user error:', err);
            setError(err.message || 'Failed to create user');
        } finally {
            setCreatingUser(false);
        }
    };


    const generateManualScript = async () => {
        console.log('[Setup] Generating manual user creation script');

        if (newUser.password !== newUser.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newUser.password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        try {
            const result = await api.setup.generateUserScript({
                newUser: {
                    username: newUser.username,
                    password: newUser.password
                }
            });

            if (result.success && result.script) {
                setManualScript(result.script);
                toast({
                    title: "Script Generated",
                    description: "Copy the command and run it in your terminal",
                });
            }
        } catch (err: any) {
            console.error('[Setup] Generate script error:', err);
            setError(err.message || 'Failed to generate script');
        }
    };

    const handleManualUserCreated = () => {
        // Update credentials to use the new user
        setCredentials({
            ...credentials,
            username: newUser.username,
            password: newUser.password
        });

        // Go back to credentials to test
        setCurrentStep('credentials');
        setAuthError(null);
        setManualScript(null);

        toast({
            title: "Ready to Test",
            description: "Now test the connection with your new user credentials",
        });
    };

    const createDatabaseAndInitialize = async () => {
        console.log('[Setup] Creating database and initializing schema...');
        setCreating(true);
        setError(null);

        try {
            // Step 1: Create database
            console.log('[Setup] Step 1: Creating database...');
            const createResult = await api.setup.createDatabase(credentials);
            console.log('[Setup] Create database result:', createResult);

            if (!createResult.success) {
                throw new Error(createResult.message || createResult.error || 'Failed to create database');
            }

            // Step 2: Initialize schema
            console.log('[Setup] Step 2: Initializing schema...');
            const initResult = await api.setup.initializeSchema(credentials);
            console.log('[Setup] Initialize schema result:', initResult);

            if (!initResult.success) {
                throw new Error(initResult.message || initResult.error || 'Failed to initialize schema');
            }

            // Step 3: Save configuration
            console.log('[Setup] Step 3: Saving configuration...');
            const saveResult = await api.setup.saveConfig(credentials);
            console.log('[Setup] Save config result:', saveResult);

            if (!saveResult.success) {
                throw new Error(saveResult.message || 'Failed to save configuration');
            }

            // Step 4: Mark setup as complete
            console.log('[Setup] Step 4: Marking setup as complete...');
            const completeResult = await api.setup.complete();
            console.log('[Setup] Complete setup result:', completeResult);

            if (completeResult.success) {
                setCurrentStep('complete');
                toast({
                    title: "Setup Complete",
                    description: "Database initialized successfully",
                });

                // Notify parent to reload
                setTimeout(() => {
                    console.log('[Setup] Calling onComplete callback...');
                    onComplete();
                }, 2000);
            }
        } catch (err: any) {
            console.error('[Setup] Database setup error:', err);
            setError(err.message || 'Failed to setup database');
            toast({
                title: "Setup Failed",
                description: err.message || 'An error occurred during setup',
                variant: "destructive",
            });
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="text-2xl">Database Setup</CardTitle>
                    <CardDescription>
                        Configure PostgreSQL connection for Vittoria Launchpad
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Step 1: Checking PostgreSQL */}
                    {currentStep === 'checking' && (
                        <div className="text-center py-8">
                            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                            <p className="text-muted-foreground">Checking system requirements...</p>
                        </div>
                    )}

                    {/* Step 2: PostgreSQL Check */}
                    {currentStep === 'postgres-check' && (
                        <div className="space-y-4">
                            {checkingPostgres ? (
                                <div className="text-center py-8">
                                    <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                                    <p className="text-muted-foreground">Checking PostgreSQL installation...</p>
                                </div>
                            ) : !postgresInstalled ? (
                                <>
                                    <Alert variant="destructive">
                                        <XCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            PostgreSQL is not installed or not running on your system.
                                        </AlertDescription>
                                    </Alert>

                                    <div className="bg-muted p-4 rounded-lg">
                                        <h3 className="font-semibold mb-2">Installation Instructions:</h3>
                                        <pre className="text-sm whitespace-pre-wrap">{instructions}</pre>
                                    </div>

                                    <Button onClick={checkPostgresInstallation} className="w-full">
                                        Re-check Installation
                                    </Button>
                                </>
                            ) : null}
                        </div>
                    )}

                    {/* Step 3: Credentials */}
                    {currentStep === 'credentials' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-green-600 mb-4">
                                <CheckCircle2 className="h-5 w-5" />
                                <span className="font-medium">PostgreSQL Detected</span>
                            </div>

                            <Alert>
                                <Database className="h-4 w-4" />
                                <AlertDescription>
                                    <div className="space-y-2">
                                        <p className="font-medium">Choose your setup method:</p>
                                        <ul className="text-sm space-y-1 ml-4">
                                            <li>• <strong>Use Existing Credentials</strong> - If you already have a PostgreSQL user</li>
                                            <li>• <strong>Create New User</strong> - If you need to create a dedicated user for Vittoria</li>
                                        </ul>
                                    </div>
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Host</label>
                                        <Input
                                            value={credentials.host}
                                            onChange={(e) => setCredentials({ ...credentials, host: e.target.value })}
                                            placeholder="localhost"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Port</label>
                                        <Input
                                            value={credentials.port}
                                            onChange={(e) => setCredentials({ ...credentials, port: e.target.value })}
                                            placeholder="5432"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Username</label>
                                    <Input
                                        value={credentials.username}
                                        onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                                        placeholder="postgres"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Password</label>
                                    <Input
                                        type="password"
                                        value={credentials.password}
                                        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                        placeholder="Enter PostgreSQL password"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Database Name</label>
                                    <Input
                                        value={credentials.dbName}
                                        onChange={(e) => setCredentials({ ...credentials, dbName: e.target.value })}
                                        placeholder="vittoria_launchpad"
                                    />
                                </div>
                            </div>

                            {error && (
                                <Alert variant="destructive">
                                    <XCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {authError && (
                                <Alert variant="destructive">
                                    <XCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        <div className="space-y-2">
                                            <p>{authError}</p>
                                            <p className="text-sm">Try the "Create New User" option below if you don't have valid credentials.</p>
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    onClick={testConnection}
                                    disabled={testing || !credentials.password}
                                    variant="default"
                                >
                                    {testing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Testing...
                                        </>
                                    ) : (
                                        <>
                                            <Key className="mr-2 h-4 w-4" />
                                            Use These Credentials
                                        </>
                                    )}
                                </Button>

                                <Button
                                    onClick={() => {
                                        setCurrentStep('create-user');
                                        setError(null);
                                        setAuthError(null);
                                    }}
                                    variant="outline"
                                >
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Create New User
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 3.5: Create PostgreSQL User */}
                    {currentStep === 'create-user' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold">Create PostgreSQL User</h3>
                                <p className="text-sm text-muted-foreground">
                                    Create a dedicated PostgreSQL user for Vittoria Launchpad with database creation privileges.
                                </p>
                            </div>

                            <Alert>
                                <Database className="h-4 w-4" />
                                <AlertDescription>
                                    <div className="space-y-3">
                                        <p className="font-medium">Choose your method:</p>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-start gap-2">
                                                <span className="font-semibold min-w-fit">Option 1:</span>
                                                <span><strong>Automatic</strong> - Have the postgres superuser password? We'll create the user for you.</span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <span className="font-semibold min-w-fit">Option 2:</span>
                                                <span><strong>Manual</strong> - Don't have the password? We'll generate a command for you to run in terminal.</span>
                                            </div>
                                        </div>
                                    </div>
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-medium text-sm">New User Details</h4>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Username</label>
                                    <Input
                                        value={newUser.username}
                                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                        placeholder="vittoria_admin"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Password</label>
                                    <Input
                                        type="password"
                                        value={newUser.password}
                                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                        placeholder="Enter new password (min 8 characters)"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Confirm Password</label>
                                    <Input
                                        type="password"
                                        value={newUser.confirmPassword}
                                        onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                                        placeholder="Confirm password"
                                    />
                                </div>
                            </div>

                            {!manualScript && (
                                <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium text-sm">Option 1: Automatic Creation</h4>
                                        <span className="text-xs text-muted-foreground">(Optional)</span>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">PostgreSQL 'postgres' Superuser Password</label>
                                        <Input
                                            type="password"
                                            value={superuserPassword}
                                            onChange={(e) => setSuperuserPassword(e.target.value)}
                                            placeholder="Enter postgres password (if you have it)"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Leave empty if you don't have this password - you can use manual creation instead.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <Alert variant="destructive">
                                    <XCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {manualScript && (
                                <Alert>
                                    <CheckCircle2 className="h-4 w-4" />
                                    <AlertDescription>
                                        <div className="space-y-3">
                                            <p className="font-medium">Copy and run this command in your terminal:</p>
                                            <div className="bg-black text-green-400 p-3 rounded font-mono text-xs overflow-x-auto">
                                                <pre>{manualScript}</pre>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(manualScript.split('\n').find(line => line.startsWith('sudo')) || '');
                                                        toast({
                                                            title: "Copied!",
                                                            description: "Command copied to clipboard",
                                                        });
                                                    }}
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1"
                                                >
                                                    Copy Command
                                                </Button>
                                                <Button
                                                    onClick={handleManualUserCreated}
                                                    size="sm"
                                                    className="flex-1"
                                                >
                                                    I've Run the Command
                                                </Button>
                                            </div>
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        onClick={createPostgresUser}
                                        disabled={creatingUser || !superuserPassword || !newUser.username || !newUser.password || !newUser.confirmPassword}
                                        variant="default"
                                    >
                                        {creatingUser ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus className="mr-2 h-4 w-4" />
                                                Create Automatically
                                            </>
                                        )}
                                    </Button>

                                    <Button
                                        onClick={generateManualScript}
                                        disabled={!newUser.username || !newUser.password || !newUser.confirmPassword || !!manualScript}
                                        variant="outline"
                                    >
                                        <Database className="mr-2 h-4 w-4" />
                                        Generate Manual Command
                                    </Button>
                                </div>

                                <Button
                                    onClick={() => {
                                        setCurrentStep('credentials');
                                        setError(null);
                                        setManualScript(null);
                                    }}
                                    variant="ghost"
                                    className="w-full"
                                >
                                    ← Back to Credentials
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Database Creation */}
                    {currentStep === 'database' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-green-600 mb-4">
                                <CheckCircle2 className="h-5 w-5" />
                                <span className="font-medium">Connection Verified</span>
                            </div>

                            <Alert>
                                <Database className="h-4 w-4" />
                                <AlertDescription>
                                    Ready to create database <strong>{credentials.dbName}</strong> and initialize schema.
                                </AlertDescription>
                            </Alert>

                            {error && (
                                <Alert variant="destructive">
                                    <XCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <Button
                                onClick={createDatabaseAndInitialize}
                                disabled={creating}
                                className="w-full"
                            >
                                {creating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Setting up Database...
                                    </>
                                ) : (
                                    <>
                                        <Database className="mr-2 h-4 w-4" />
                                        Create Database & Initialize
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* Step 5: Complete */}
                    {currentStep === 'complete' && (
                        <div className="text-center py-8">
                            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold mb-2">Setup Complete!</h3>
                            <p className="text-muted-foreground mb-4">
                                Database has been configured successfully.
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Redirecting to application...
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
