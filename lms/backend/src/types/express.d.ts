declare namespace Express {
  interface Request {
    user?: {
      uid: string;
      email: string;
      role: string;
      name: string;
      classIds?: string[];
      class_id?: string;
      children_ids?: string[];
      school_id?: string;
      [key: string]: unknown;
    };
    activeAcademicYear: string;
  }
}
