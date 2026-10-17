import { z } from 'zod';

export const feedbackSchema = z.object({
  displayName: z.string().trim().min(1, 'Please enter your first name or display name').max(60, 'Keep it under 60 characters'),
  email: z.string().trim().email('Enter a valid email').max(255),
  tradingCategory: z.string().trim().max(60, 'Keep it under 60 characters').optional().or(z.literal('')),
  rating: z.number().int().min(1).max(5).nullable(),
  message: z.string().trim().min(20, 'Please write at least 20 characters').max(1000, 'Keep it under 1000 characters'),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;

export const feedbackErrorMessages: Record<string, string> = {
  duplicate: 'We already received this feedback. Thank you!',
  rate_limited: 'You have shared feedback recently. Please try again later.',
  invalid_name: 'Please check your name.',
  invalid_email: 'Please check your email.',
  invalid_message: 'Feedback must be 20–1000 characters.',
  invalid_category: 'Trading category is too long.',
  invalid_rating: 'Rating must be between 1 and 5.',
};

export const approvedFeedbackSchema = z.array(z.object({
  id: z.string(),
  display_name: z.string().min(1),
  trading_category: z.string().nullable(),
  rating: z.number().int().min(1).max(5).nullable(),
  message: z.string().min(1),
}));

export type ApprovedReview = z.infer<typeof approvedFeedbackSchema>[number];

