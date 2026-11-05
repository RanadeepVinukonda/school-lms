export interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  color?: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
