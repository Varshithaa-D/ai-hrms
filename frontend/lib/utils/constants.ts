export const AI_URL = process.env.NEXT_PUBLIC_AI_URL || 'http://localhost:8000';

export const DEPARTMENTS = ['Engineering','Product','Design','Marketing','HR','Finance','Operations','Sales'];

export const LEAVE_TYPES  = ['casual','sick','earned','maternity','paternity','unpaid'];

export const ROLE_LABELS: Record<string, string> = {
  management_admin: 'Management Admin',
  senior_manager:   'Senior Manager',
  hr_recruiter:     'HR Recruiter',
  employee:         'Employee',
};

export const ROLE_COLORS: Record<string, string> = {
  management_admin: '#4f8ef7',
  senior_manager:   '#7c5cfc',
  hr_recruiter:     '#22c97a',
  employee:         '#f5a623',
};

export const STATUS_COLORS: Record<string, string> = {
  active:    '#22c97a',
  pending:   '#f5a623',
  approved:  '#22c97a',
  rejected:  '#f7525a',
  processed: '#4f8ef7',
  paid:      '#22c97a',
  draft:     '#8892a4',
};