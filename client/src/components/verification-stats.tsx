import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  TrendingUp,
  TrendingDown,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface VerificationStats {
  total_submissions: number;
  approved_manually: number;
  approved_by_ai: number;
  ai_reverified_after_rejection: number;
  rejected_by_buyer: number;
  rejected_by_ai: number;
  flagged_for_reuse: number;
  success_rate: number;
}

export function VerificationStats() {
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/provider/verification-stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        throw new Error('Failed to fetch verification stats');
      }
    } catch (error) {
      console.error('Error fetching verification stats:', error);
      toast({
        title: "Error",
        description: "Failed to load verification statistics",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchStats();
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSuccessRateIcon = (rate: number) => {
    if (rate >= 90) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (rate >= 75) return <TrendingUp className="h-4 w-4 text-yellow-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading statistics...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Data Available</h3>
          <p className="text-gray-600 text-center">
            No verification statistics available yet. Submit your first proof to see your stats.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalApproved = stats.approved_manually + stats.approved_by_ai + stats.ai_reverified_after_rejection;
  const totalRejected = stats.rejected_by_buyer + stats.rejected_by_ai + stats.flagged_for_reuse;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Verification Statistics</h2>
          <p className="text-gray-600">
            Track your proof submission performance and success rates
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </button>
      </div>

      {/* Success Rate Overview */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getSuccessRateIcon(stats.success_rate)}
            Overall Success Rate
          </CardTitle>
          <CardDescription>
            Percentage of proofs that were approved (manually or by AI)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold mb-2">
            <span className={getSuccessRateColor(stats.success_rate)}>
              {stats.success_rate.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{totalApproved} approved out of {stats.total_submissions} total</span>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Submissions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Total Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {stats.total_submissions}
            </div>
            <p className="text-sm text-gray-600">
              All proof submissions made
            </p>
          </CardContent>
        </Card>

        {/* Manually Approved */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Manually Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 mb-2">
              {stats.approved_manually}
            </div>
            <p className="text-sm text-gray-600">
              Approved by buyers
            </p>
          </CardContent>
        </Card>

        {/* AI Approved */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              AI Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {stats.approved_by_ai}
            </div>
            <p className="text-sm text-gray-600">
              Approved by AI system
            </p>
          </CardContent>
        </Card>

        {/* AI Re-verified After Rejection */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              AI Re-verified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 mb-2">
              {stats.ai_reverified_after_rejection}
            </div>
            <p className="text-sm text-gray-600">
              Overturned buyer rejections
            </p>
          </CardContent>
        </Card>

        {/* Rejected */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 mb-2">
              {totalRejected}
            </div>
            <p className="text-sm text-gray-600">
              Rejected or flagged
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Approval Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Approval Breakdown</CardTitle>
            <CardDescription>
              How your proofs were approved
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Manual Approval</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{stats.approved_manually}</span>
                <Badge variant="secondary">
                  {stats.total_submissions > 0 
                    ? ((stats.approved_manually / stats.total_submissions) * 100).toFixed(1)
                    : '0'
                  }%
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <span>AI Approval</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{stats.approved_by_ai}</span>
                <Badge variant="secondary">
                  {stats.total_submissions > 0 
                    ? ((stats.approved_by_ai / stats.total_submissions) * 100).toFixed(1)
                    : '0'
                  }%
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>AI Re-verified</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{stats.ai_reverified_after_rejection}</span>
                <Badge variant="secondary">
                  {stats.total_submissions > 0 
                    ? ((stats.ai_reverified_after_rejection / stats.total_submissions) * 100).toFixed(1)
                    : '0'
                  }%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rejection Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Rejection Breakdown</CardTitle>
            <CardDescription>
              Why proofs were rejected
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span>Buyer Rejected</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{stats.rejected_by_buyer}</span>
                <Badge variant="secondary">
                  {stats.total_submissions > 0 
                    ? ((stats.rejected_by_buyer / stats.total_submissions) * 100).toFixed(1)
                    : '0'
                  }%
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-orange-500" />
                <span>AI Rejected</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{stats.rejected_by_ai}</span>
                <Badge variant="secondary">
                  {stats.total_submissions > 0 
                    ? ((stats.rejected_by_ai / stats.total_submissions) * 100).toFixed(1)
                    : '0'
                  }%
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span>Flagged for Reuse</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{stats.flagged_for_reuse}</span>
                <Badge variant="secondary">
                  {stats.total_submissions > 0 
                    ? ((stats.flagged_for_reuse / stats.total_submissions) * 100).toFixed(1)
                    : '0'
                  }%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warnings and Tips */}
      {stats.flagged_for_reuse > 0 && (
        <Alert className="bg-orange-50 border-orange-200">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <strong>Warning:</strong> You have {stats.flagged_for_reuse} proof(s) flagged for image reuse. 
            Repeated violations may result in account suspension. Always use unique screenshots for each assignment.
          </AlertDescription>
        </Alert>
      )}

      {stats.success_rate < 75 && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            <strong>Improvement Needed:</strong> Your success rate is below 75%. 
            Consider reviewing our proof submission guidelines to improve your approval rate.
          </AlertDescription>
        </Alert>
      )}

      {stats.success_rate >= 90 && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <strong>Excellent Performance:</strong> Your success rate is above 90%! 
            Keep up the great work with high-quality proof submissions.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
} 