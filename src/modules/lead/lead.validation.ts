import { z } from 'zod';

// Custom validator for flexible datetime parsing
const flexibleDatetime = z.string().refine((val) => {
  try {
    // Try to parse the datetime string in various formats
    // Accepts: ISO datetime with/without timezone, or date+time without seconds
    const date = new Date(val);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}, "Invalid datetime format");

export const generateLeadsSchema = z.object({
  count: z.number().int().min(1).max(500, "Cannot generate more than 500 leads at once"),
});

export const assignLeadsSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1, "At least one lead is required"),
  employeeId: z.string().uuid("Valid employee ID is required"),
});

export const createFollowUpSchema = z.object({
  leadId: z.string().uuid("Valid lead ID is required"),
  followUpType: z.enum(["Call", "Email", "Meeting", "Demo", "Proposal", "Negotiation", "Other"]),
  notes: z.string().optional(),
  nextFollowUpDate: flexibleDatetime.optional(),
});

export const updateLeadStatusSchema = z.object({
  status: z.enum(["New", "Contacted", "Interested", "Qualified", "Converted", "Lost", "OnHold"]),
  notes: z.string().optional(),
});


export const updateFollowUpSchema = z.object({
  status: z.enum(["Pending", "Completed", "Rescheduled"]),
  notes: z.string().optional(),
  nextFollowUpDate: flexibleDatetime.optional(),
});

// Bulk assignment: [{ leadId, employeeId }]
export const bulkAssignLeadsSchema = z.object({
  assignments: z.array(
    z.object({
      leadId: z.string().uuid("Valid lead ID is required"),
      employeeId: z.string().uuid("Valid employee ID is required"),
    })
  ).min(1, "At least one assignment is required"),
});
