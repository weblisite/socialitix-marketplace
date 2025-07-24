import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useToast } from '../hooks/use-toast';
import { apiRequest } from '../lib/utils';
import { Clock, DollarSign, Target, MessageSquare } from 'lucide-react';

interface AvailableAssignmentsProps {
  assignments: any[];
  onAssignmentClaimed: () => void;
}

export function AvailableAssignments({ assignments, onAssignmentClaimed }: AvailableAssignmentsProps) {
  const [claimingIds, setClaimingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const handleClaimAssignment = async (assignmentId: string) => {
    setClaimingIds(prev => new Set(prev).add(assignmentId));

    try {
      const response = await apiRequest('POST', `/api/provider/claim-assignment/${assignmentId}`, {});
      
      if (response.ok) {
        toast({
          title: "Success!",
          description: "Assignment claimed successfully. You can now work on it.",
        });
        onAssignmentClaimed();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to claim assignment",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to claim assignment",
        variant: "destructive",
      });
    } finally {
      setClaimingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(assignmentId);
        return newSet;
      });
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h remaining`;
    }
    
    return `${hours}h ${minutes}m remaining`;
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'followers':
        return <Target className="w-4 h-4" />;
      case 'likes':
        return <MessageSquare className="w-4 h-4" />;
      case 'comments':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  if (assignments.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-6">
          <div className="text-center text-gray-400">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Available Assignments</h3>
            <p className="text-sm">
              There are currently no assignments available for your selected services. 
              Check back later or make sure you have the right services selected.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Available Assignments</h2>
        <Badge variant="secondary" className="bg-lime-600 text-white">
          {assignments.length} available
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {assignments.map((assignment) => (
          <Card key={assignment.id} className="bg-gray-900 border-gray-700 hover:border-lime-500 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  {getActionIcon(assignment.action_type)}
                  {assignment.platform} {assignment.action_type}
                </CardTitle>
                <Badge 
                  variant="outline" 
                  className={`${
                    assignment.status === 'available' 
                      ? 'border-green-500 text-green-400' 
                      : 'border-gray-500 text-gray-400'
                  }`}
                >
                  {assignment.status}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Earnings:</span>
                <span className="text-lime-400 font-medium flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {assignment.price_per_action} KES
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Quantity:</span>
                <span className="text-white">{assignment.quantity}</span>
              </div>

              {assignment.target_url && (
                <div className="text-sm">
                  <span className="text-gray-400">Target:</span>
                  <p className="text-white truncate">{assignment.target_url}</p>
                </div>
              )}

              {assignment.comment_text && (
                <div className="text-sm">
                  <span className="text-gray-400">Comment:</span>
                  <p className="text-white">{assignment.comment_text}</p>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Expires:</span>
                <span className="text-orange-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTimeRemaining(assignment.expires_at)}
                </span>
              </div>

              <Button
                onClick={() => handleClaimAssignment(assignment.id)}
                disabled={claimingIds.has(assignment.id)}
                className="w-full bg-lime-600 hover:bg-lime-700 text-white"
              >
                {claimingIds.has(assignment.id) ? 'Claiming...' : 'Claim Assignment'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 