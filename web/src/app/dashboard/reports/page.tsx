import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// Table component removed as custom grid is used below
import { CheckCircle2, XCircle, FileDown, Eye } from "lucide-react";

export default function ReportsPage() {
    return (
        <div className="flex flex-col gap-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Simulation Reports</h1>
                    <p className="text-muted-foreground mt-1">Review UX insights and behavior traces from past runs.</p>
                </div>
                <Button variant="outline">
                    <FileDown className="mr-2 h-4 w-4" />
                    Export All
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3 mb-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Simulations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold border-b border-border/50 pb-2 inline-block">124</div>
                        <p className="text-xs text-muted-foreground mt-2">+12% from last month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Average Success Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-accent border-b border-accent/20 pb-2 inline-block">68%</div>
                        <p className="text-xs text-muted-foreground mt-2">Based on predefined task outcomes</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Top Friction Point</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-destructive">User Registration Flow</div>
                        <p className="text-xs text-muted-foreground mt-2">Highest rate of interpretation confusion</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Reports</CardTitle>
                    <CardDescription>Detailed breakdown of individual persona tests.</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* We will use a basic layout for MVP since shadcn Table requires adding the component via CLI */}
                    <div className="border rounded-md border-border/50">
                        <div className="grid grid-cols-5 bg-muted/50 p-3 text-sm font-medium border-b border-border/50">
                            <div className="col-span-1">Status</div>
                            <div className="col-span-1">Project</div>
                            <div className="col-span-1">Persona</div>
                            <div className="col-span-1">Date</div>
                            <div className="col-span-1 text-right">Actions</div>
                        </div>
                        <div className="grid grid-cols-5 items-center p-3 text-sm border-b border-border/50">
                            <div className="col-span-1 flex items-center text-accent"><CheckCircle2 className="h-4 w-4 mr-2" /> Success</div>
                            <div className="col-span-1 font-medium">Acme CRM</div>
                            <div className="col-span-1 text-muted-foreground">Enterprise Buyer</div>
                            <div className="col-span-1 text-muted-foreground">2 hours ago</div>
                            <div className="col-span-1 flex justify-end gap-2">
                                <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon"><FileDown className="h-4 w-4" /></Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-5 items-center p-3 text-sm">
                            <div className="col-span-1 flex items-center text-destructive"><XCircle className="h-4 w-4 mr-2" /> Failed</div>
                            <div className="col-span-1 font-medium">Acme CRM</div>
                            <div className="col-span-1 text-muted-foreground">Impatient Developer</div>
                            <div className="col-span-1 text-muted-foreground">5 hours ago</div>
                            <div className="col-span-1 flex justify-end gap-2">
                                <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon"><FileDown className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
