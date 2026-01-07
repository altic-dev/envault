export interface Project {
  id: number;
  path: string;
  name: string;
  created_at: string;
}

export interface Variable {
  id: number;
  project_id: number;
  environment: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}
