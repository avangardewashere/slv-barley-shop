'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Star, Eye, CheckCircle, XCircle, MessageSquare, ThumbsUp, AlertTriangle } from 'lucide-react';

interface Review {
  _id: string;
  productId: {
    _id: string;
    name: string;
  };
  customerId: {
    _id: string;
    name: string;
    email: string;
  };
  rating: number;
  title: string;
  content: string;
  images?: string[];
  isVerified: boolean;
  isApproved: boolean;
  isReported: boolean;
  helpfulVotes: number;
  qualityScore: number;
  adminResponse?: {
    content: string;
    adminId: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function ReviewManagement() {
  const { token } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [currentPage, searchTerm, ratingFilter, statusFilter]);

  const fetchReviews = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        includeProduct: 'true',
        includeCustomer: 'true',
      });

      if (searchTerm) params.append('search', searchTerm);
      if (ratingFilter) params.append('rating', ratingFilter);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/reviews?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
        setTotalPages(Math.ceil((data.pagination?.total || 0) / 10));
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateReviewStatus = async (reviewId: string, action: 'approve' | 'reject' | 'flag') => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/${action}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchReviews();
      }
    } catch (error) {
      console.error(`Failed to ${action} review:`, error);
    }
  };

  const submitAdminResponse = async () => {
    if (!selectedReview || !adminResponse.trim()) return;

    setIsSubmittingResponse(true);
    try {
      const response = await fetch(`/api/reviews/${selectedReview._id}/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content: adminResponse }),
      });

      if (response.ok) {
        setAdminResponse('');
        fetchReviews();
        setShowReviewModal(false);
      }
    } catch (error) {
      console.error('Failed to submit admin response:', error);
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'text-accent-500 fill-current' : 'text-neutral-300'
        }`}
      />
    ));
  };

  const getStatusColor = (isApproved: boolean, isReported: boolean) => {
    if (isReported) return 'bg-danger-100 text-danger-700 border-danger-200';
    if (isApproved) return 'bg-success-100 text-success-700 border-success-200';
    return 'bg-warning-100 text-warning-700 border-warning-200';
  };

  const getStatusText = (isApproved: boolean, isReported: boolean) => {
    if (isReported) return 'Reported';
    if (isApproved) return 'Approved';
    return 'Pending';
  };

  const getQualityScoreColor = (score: number) => {
    if (score >= 8) return 'text-success-600';
    if (score >= 6) return 'text-accent-600';
    if (score >= 4) return 'text-warning-600';
    return 'text-danger-600';
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-200 rounded mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-neutral-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-brand-900 font-display mb-2">Review Management</h1>
          <p className="text-lg text-brand-600">Moderate and respond to customer reviews</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card-premium rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-premium pl-10 w-full"
            />
          </div>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="input-premium w-full"
          >
            <option value="">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-premium w-full"
          >
            <option value="">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="reported">Reported</option>
          </select>
          <button
            onClick={() => {
              setSearchTerm('');
              setRatingFilter('');
              setStatusFilter('');
            }}
            className="btn-secondary"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review._id} className="card-premium rounded-2xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-2">
                  <div className="flex items-center space-x-1">
                    {renderStars(review.rating)}
                    <span className="text-sm font-medium text-brand-900 ml-2">
                      {review.rating}/5
                    </span>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(review.isApproved, review.isReported)}`}>
                    {getStatusText(review.isApproved, review.isReported)}
                  </span>
                  {review.isVerified && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-700 border border-primary-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified Purchase
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg font-semibold text-brand-900 mb-1">
                  {review.title}
                </h3>
                
                <div className="flex items-center space-x-4 text-sm text-brand-600 mb-3">
                  <span>By {review.customerId.name}</span>
                  <span>•</span>
                  <span>For {review.productId.name}</span>
                  <span>•</span>
                  <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span className={`font-medium ${getQualityScoreColor(review.qualityScore)}`}>
                    Quality Score: {review.qualityScore}/10
                  </span>
                </div>
                
                <p className="text-brand-700 mb-3 line-clamp-3">
                  {review.content}
                </p>
                
                <div className="flex items-center space-x-6 text-sm text-brand-600">
                  <div className="flex items-center space-x-1">
                    <ThumbsUp className="h-4 w-4" />
                    <span>{review.helpfulVotes} helpful</span>
                  </div>
                  {review.adminResponse && (
                    <div className="flex items-center space-x-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>Admin responded</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setSelectedReview(review);
                    setShowReviewModal(true);
                  }}
                  className="text-primary-600 hover:text-primary-800 transition-colors p-2"
                  title="View Details"
                >
                  <Eye className="h-4 w-4" />
                </button>
                
                {!review.isApproved && (
                  <button
                    onClick={() => updateReviewStatus(review._id, 'approve')}
                    className="text-success-600 hover:text-success-800 transition-colors p-2"
                    title="Approve Review"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                )}
                
                <button
                  onClick={() => updateReviewStatus(review._id, 'reject')}
                  className="text-danger-600 hover:text-danger-800 transition-colors p-2"
                  title="Reject Review"
                >
                  <XCircle className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => updateReviewStatus(review._id, 'flag')}
                  className="text-warning-600 hover:text-warning-800 transition-colors p-2"
                  title="Flag Review"
                >
                  <AlertTriangle className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-brand-600">
          Showing {reviews.length} reviews
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-brand-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

      {/* Review Details Modal */}
      {showReviewModal && selectedReview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-brand-900 font-display">
                  Review Details
                </h2>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="text-neutral-500 hover:text-neutral-700"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Review Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <div className="flex items-center space-x-1">
                        {renderStars(selectedReview.rating)}
                        <span className="text-lg font-semibold text-brand-900 ml-2">
                          {selectedReview.rating}/5
                        </span>
                      </div>
                      <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(selectedReview.isApproved, selectedReview.isReported)}`}>
                        {getStatusText(selectedReview.isApproved, selectedReview.isReported)}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-brand-900 mb-2">
                      {selectedReview.title}
                    </h3>
                  </div>
                </div>

                {/* Review Meta */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-neutral-50 rounded-xl">
                  <div>
                    <h4 className="font-semibold text-brand-900 mb-2">Customer Information</h4>
                    <div className="space-y-1 text-sm">
                      <div><span className="text-brand-600">Name:</span> {selectedReview.customerId.name}</div>
                      <div><span className="text-brand-600">Email:</span> {selectedReview.customerId.email}</div>
                      <div><span className="text-brand-600">Verified Purchase:</span> {selectedReview.isVerified ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-brand-900 mb-2">Review Information</h4>
                    <div className="space-y-1 text-sm">
                      <div><span className="text-brand-600">Product:</span> {selectedReview.productId.name}</div>
                      <div><span className="text-brand-600">Date:</span> {new Date(selectedReview.createdAt).toLocaleDateString()}</div>
                      <div><span className="text-brand-600">Quality Score:</span> 
                        <span className={`ml-1 font-medium ${getQualityScoreColor(selectedReview.qualityScore)}`}>
                          {selectedReview.qualityScore}/10
                        </span>
                      </div>
                      <div><span className="text-brand-600">Helpful Votes:</span> {selectedReview.helpfulVotes}</div>
                    </div>
                  </div>
                </div>

                {/* Review Content */}
                <div>
                  <h4 className="font-semibold text-brand-900 mb-3">Review Content</h4>
                  <div className="p-4 bg-white border border-neutral-200 rounded-xl">
                    <p className="text-brand-700 whitespace-pre-wrap">
                      {selectedReview.content}
                    </p>
                  </div>
                </div>

                {/* Images if any */}
                {selectedReview.images && selectedReview.images.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-brand-900 mb-3">Review Images</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {selectedReview.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Review image ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-neutral-200"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Existing Admin Response */}
                {selectedReview.adminResponse && (
                  <div>
                    <h4 className="font-semibold text-brand-900 mb-3">Admin Response</h4>
                    <div className="p-4 bg-primary-50 border border-primary-200 rounded-xl">
                      <p className="text-brand-700 whitespace-pre-wrap">
                        {selectedReview.adminResponse.content}
                      </p>
                      <div className="text-sm text-brand-600 mt-2">
                        Responded on {new Date(selectedReview.adminResponse.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Response Form */}
                {!selectedReview.adminResponse && (
                  <div>
                    <h4 className="font-semibold text-brand-900 mb-3">Add Admin Response</h4>
                    <div className="space-y-4">
                      <textarea
                        value={adminResponse}
                        onChange={(e) => setAdminResponse(e.target.value)}
                        placeholder="Write your response to this review..."
                        rows={4}
                        className="w-full input-premium resize-none"
                      />
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => setAdminResponse('')}
                          className="btn-secondary"
                        >
                          Clear
                        </button>
                        <button
                          onClick={submitAdminResponse}
                          disabled={!adminResponse.trim() || isSubmittingResponse}
                          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmittingResponse ? 'Submitting...' : 'Submit Response'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
                  {!selectedReview.isApproved && (
                    <button
                      onClick={() => {
                        updateReviewStatus(selectedReview._id, 'approve');
                        setShowReviewModal(false);
                      }}
                      className="btn-secondary bg-success-100 text-success-700 hover:bg-success-200"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Review
                    </button>
                  )}
                  <button
                    onClick={() => {
                      updateReviewStatus(selectedReview._id, 'reject');
                      setShowReviewModal(false);
                    }}
                    className="btn-secondary bg-danger-100 text-danger-700 hover:bg-danger-200"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Review
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}