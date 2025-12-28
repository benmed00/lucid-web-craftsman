import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  Bug, 
  Filter, 
  Tag, 
  Calendar, 
  User, 
  Globe, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Download,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Image,
  ZoomIn,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { toast } from 'sonner';

interface ErrorReport {
  id: string;
  user_id?: string;
  email: string;
  error_type: string;
  description: string;
  status: string;
  priority: string;
  severity: string;
  tags: string[];
  page_url?: string;
  user_agent?: string;
  browser_info?: any;
  screenshot_url?: string;
  assigned_to?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

const AdminErrorReports: React.FC = () => {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [reports, setReports] = useState<ErrorReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<ErrorReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ErrorReport | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [errorTypeFilter, setErrorTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [screenshotFilter, setScreenshotFilter] = useState<string>('all');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    critical: 0,
    high: 0
  });

  // Available tags for filtering
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchErrorReports();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    filterReports();
  }, [reports, statusFilter, priorityFilter, severityFilter, errorTypeFilter, searchQuery, tagFilter, screenshotFilter]);

  const fetchErrorReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('support_tickets_error_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReports(data || []);
      calculateStats(data || []);
      extractAvailableTags(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to fetch error reports');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (reportsData: ErrorReport[]) => {
    const stats = {
      total: reportsData.length,
      open: reportsData.filter(r => r.status === 'open').length,
      inProgress: reportsData.filter(r => r.status === 'in_progress').length,
      resolved: reportsData.filter(r => r.status === 'resolved').length,
      critical: reportsData.filter(r => r.severity === 'critical').length,
      high: reportsData.filter(r => r.severity === 'high').length
    };
    setStats(stats);
  };

  const extractAvailableTags = (reportsData: ErrorReport[]) => {
    const allTags = reportsData.flatMap(report => report.tags || []);
    const uniqueTags = Array.from(new Set(allTags));
    setAvailableTags(uniqueTags);
  };

  const filterReports = () => {
    let filtered = [...reports];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(report => report.priority === priorityFilter);
    }

    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(report => report.severity === severityFilter);
    }

    // Error type filter
    if (errorTypeFilter !== 'all') {
      filtered = filtered.filter(report => report.error_type === errorTypeFilter);
    }

    // Search query
    if (searchQuery) {
      filtered = filtered.filter(report =>
        report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (report.page_url && report.page_url.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Tag filter
    if (tagFilter && tagFilter !== 'all') {
      filtered = filtered.filter(report =>
        report.tags && report.tags.includes(tagFilter)
      );
    }

    // Screenshot filter
    if (screenshotFilter === 'with') {
      filtered = filtered.filter(report => report.screenshot_url);
    } else if (screenshotFilter === 'without') {
      filtered = filtered.filter(report => !report.screenshot_url);
    }

    setFilteredReports(filtered);
  };

  const updateReportStatus = async (reportId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets_error_reports')
        .update({ status })
        .eq('id', reportId);

      if (error) throw error;

      // Update local state
      setReports(prev => prev.map(report => 
        report.id === reportId ? { ...report, status } : report
      ));

      toast.success(`Report status updated to ${status}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update report status');
    }
  };

  const updateReportTags = async (reportId: string, tags: string[]) => {
    try {
      const { error } = await supabase
        .from('support_tickets_error_reports')
        .update({ tags })
        .eq('id', reportId);

      if (error) throw error;

      // Update local state
      setReports(prev => prev.map(report => 
        report.id === reportId ? { ...report, tags } : report
      ));

      toast.success('Tags updated successfully');
    } catch (error) {
      console.error('Error updating tags:', error);
      toast.error('Failed to update tags');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-status-error';
      case 'high': return 'bg-status-warning';
      case 'medium': return 'bg-status-warning/80';
      case 'low': return 'bg-status-info';
      default: return 'bg-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="h-4 w-4 text-status-error" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-status-warning" />;
      case 'resolved': return <CheckCircle className="h-4 w-4 text-status-success" />;
      default: return <XCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access denied. Admin privileges required.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Error Reports Management</h1>
          <p className="text-gray-600 mt-2">Track and manage customer reported errors</p>
        </div>
        <Button onClick={() => fetchErrorReports()} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Reports</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.open}</div>
            <div className="text-sm text-gray-600">Open</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
            <div className="text-sm text-gray-600">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            <div className="text-sm text-gray-600">Resolved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-500">{stats.critical}</div>
            <div className="text-sm text-gray-600">Critical</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-500">{stats.high}</div>
            <div className="text-sm text-gray-600">High Priority</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Severity</label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Error Type</label>
              <Select value={errorTypeFilter} onValueChange={setErrorTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="bug_report">Bug Report</SelectItem>
                  <SelectItem value="ui_issue">UI Issue</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="crash">Crash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tags</label>
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {availableTags.map(tag => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Image className="h-4 w-4" />
                Screenshot
              </label>
              <Select value={screenshotFilter} onValueChange={setScreenshotFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reports</SelectItem>
                  <SelectItem value="with">With Screenshot</SelectItem>
                  <SelectItem value="without">Without Screenshot</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Error Reports ({filteredReports.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading reports...</div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No error reports found matching your filters.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map((report) => (
                <Card key={report.id} className="border-l-4" style={{borderLeftColor: getSeverityColor(report.severity).replace('bg-', '')}}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Screenshot thumbnail */}
                      {report.screenshot_url && (
                        <div 
                          className="flex-shrink-0 w-20 h-20 rounded border border-border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all group relative"
                          onClick={() => {
                            setSelectedScreenshot(report.screenshot_url || null);
                            setShowScreenshotModal(true);
                          }}
                        >
                          <img 
                            src={report.screenshot_url} 
                            alt="Screenshot" 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {getStatusIcon(report.status)}
                          <Badge variant="outline">{report.error_type}</Badge>
                          <Badge className={getSeverityColor(report.severity)}>
                            {report.severity}
                          </Badge>
                          <Badge variant="secondary">{report.priority}</Badge>
                          {report.screenshot_url && (
                            <Badge variant="outline" className="text-status-info border-status-info/30">
                              <Image className="h-3 w-3 mr-1" />
                              Screenshot
                            </Badge>
                          )}
                        </div>
                        
                        <h3 className="font-medium text-foreground mb-1">
                          {report.description.length > 100 
                            ? `${report.description.substring(0, 100)}...`
                            : report.description
                          }
                        </h3>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2 flex-wrap">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {report.email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(report.created_at)}
                          </div>
                          {report.page_url && (
                            <div className="flex items-center gap-1">
                              <Globe className="h-4 w-4" />
                              {new URL(report.page_url).pathname}
                            </div>
                          )}
                        </div>

                        {report.tags && report.tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap mb-2">
                            {report.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedReport(report);
                            setShowDetailDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Select 
                          value={report.status} 
                          onValueChange={(value) => updateReportStatus(report.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Error Report Details</DialogTitle>
          </DialogHeader>
          
          {selectedReport && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="technical">Technical</TabsTrigger>
                <TabsTrigger value="tags">Tags</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Report Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Email:</strong> {selectedReport.email}</div>
                      <div><strong>Error Type:</strong> {selectedReport.error_type}</div>
                      <div><strong>Status:</strong> {selectedReport.status}</div>
                      <div><strong>Priority:</strong> {selectedReport.priority}</div>
                      <div><strong>Severity:</strong> {selectedReport.severity}</div>
                      <div><strong>Created:</strong> {formatDate(selectedReport.created_at)}</div>
                      {selectedReport.resolved_at && (
                        <div><strong>Resolved:</strong> {formatDate(selectedReport.resolved_at)}</div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Page Information</h4>
                    <div className="space-y-2 text-sm">
                      {selectedReport.page_url && (
                        <div><strong>Page URL:</strong> {selectedReport.page_url}</div>
                      )}
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <div className="p-3 bg-muted rounded text-sm">
                    {selectedReport.description}
                  </div>
                </div>
                
                {selectedReport.screenshot_url && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Capture d'écran
                    </h4>
                    <div className="relative group">
                      <img 
                        src={selectedReport.screenshot_url} 
                        alt="Error screenshot" 
                        className="max-w-full h-auto border border-border rounded cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          setSelectedScreenshot(selectedReport.screenshot_url || null);
                          setShowScreenshotModal(true);
                        }}
                      />
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSelectedScreenshot(selectedReport.screenshot_url || null);
                            setShowScreenshotModal(true);
                          }}
                        >
                          <ZoomIn className="h-4 w-4 mr-1" />
                          Agrandir
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          asChild
                        >
                          <a href={selectedReport.screenshot_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Ouvrir
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="technical" className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">User Agent</h4>
                  <div className="p-3 bg-gray-50 rounded text-sm font-mono">
                    {selectedReport.user_agent || 'Not provided'}
                  </div>
                </div>
                
                {selectedReport.browser_info && (
                  <div>
                    <h4 className="font-medium mb-2">Browser Information</h4>
                    <pre className="p-3 bg-gray-50 rounded text-sm font-mono overflow-x-auto">
                      {JSON.stringify(selectedReport.browser_info, null, 2)}
                    </pre>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="tags" className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Current Tags</h4>
                  <div className="flex gap-2 flex-wrap mb-4">
                    {selectedReport.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    )) || <span className="text-gray-500">No tags</span>}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Add Tags (comma separated)</label>
                    <Input
                      placeholder="bug, ui, mobile..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const newTags = e.currentTarget.value.split(',').map(t => t.trim()).filter(Boolean);
                          const currentTags = selectedReport.tags || [];
                          const allTags = [...new Set([...currentTags, ...newTags])];
                          updateReportTags(selectedReport.id, allTags);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="actions" className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Status Management</h4>
                  <Select 
                    value={selectedReport.status} 
                    onValueChange={(value) => updateReportStatus(selectedReport.id, value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Resolution Notes</h4>
                  <Textarea
                    placeholder="Add notes about the resolution..."
                    defaultValue={selectedReport.resolution_notes || ''}
                    onBlur={async (e) => {
                      try {
                        const { error } = await supabase
                          .from('support_tickets_error_reports')
                          .update({ resolution_notes: e.target.value })
                          .eq('id', selectedReport.id);

                        if (error) throw error;
                        toast.success('Resolution notes updated');
                      } catch (error) {
                        toast.error('Failed to update notes');
                      }
                    }}
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Screenshot Zoom Modal */}
      <Dialog open={showScreenshotModal} onOpenChange={setShowScreenshotModal}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Capture d'écran</DialogTitle>
          </DialogHeader>
          {selectedScreenshot && (
            <div className="relative">
              <img 
                src={selectedScreenshot} 
                alt="Screenshot zoomed" 
                className="w-full h-auto max-h-[80vh] object-contain rounded"
              />
              <div className="absolute top-2 right-2">
                <Button
                  size="sm"
                  variant="secondary"
                  asChild
                >
                  <a href={selectedScreenshot} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Ouvrir dans un nouvel onglet
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminErrorReports;