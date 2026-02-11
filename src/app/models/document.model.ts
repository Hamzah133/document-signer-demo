export interface PageImage {
  pageNumber: number;
  imageUrl: string;
  width: number;
  height: number;
}

export interface Recipient {
  id: string;
  name: string;
  email: string;
  color: string;
}

export interface Field {
  id: string;
  type: 'SIGNATURE' | 'TEXT' | 'DATE' | 'INITIALS' | 'NUMBER';
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  recipientId: string;
  value?: string;
  required: boolean;
}

export interface DocumentState {
  id: string;
  name: string;
  pages: PageImage[];
  fields: Field[];
  recipients: Recipient[];
  createdAt: Date;
  status: 'draft' | 'sent' | 'completed';
  userId?: string;
}
