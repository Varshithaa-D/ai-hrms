export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

export const formatDate = (date: string | Date) =>
  new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export const formatName = (first: string, last: string) => `${first} ${last}`;

export const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

export const generateInterviewToken = (jobTitle: string, jobDescription: string): string => {
  const data = JSON.stringify({ title: jobTitle, description: jobDescription });
  return btoa(data);
};

export const getInterviewLink = (token: string): string => {
  return `${window.location.origin}/interview/${token}`;
};