export type DocumentType = 'document' | 'template';

export interface PageImage {
  pageNumber: number;
  imageUrl: string;
  width: number;
  height: number;
}

export interface SignatureRequest {
  id: string;
  documentId: string;
  signerEmail: string;
  signerName: string;
  status: 'pending' | 'viewed' | 'signed';
  order: number;
  accessToken: string;
  createdAt: Date;
  signedAt?: Date;
}

export interface Recipient {
  id: string;
  name: string;
  email: string;
  color: string;
  order: number;
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
  role?: string;
  value?: string;
  required: boolean;
}

export interface DocumentState {
  id: string;
  name: string;
  type: DocumentType;
  pages: PageImage[];
  fields: Field[];
  recipients: Recipient[];
  createdAt: Date;
  sentAt?: Date;
  status: 'draft' | 'sent' | 'completed';
  userId?: string;
  signatureRequests?: SignatureRequest[];
  isTemplate: boolean;
  currentSigner?: any;
  filteredFields?: Field[];
}

export interface Template {
  id: string;
  name: string;
  pages: PageImage[];
  fields: TemplateField[];
  roles: TemplateRole[];
  createdAt: Date;
  userId: string;
}

export interface TemplateField {
  id: string;
  type: 'SIGNATURE' | 'TEXT' | 'DATE' | 'INITIALS' | 'NUMBER';
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  role: string;
  required: boolean;
}

export interface TemplateRole {
  id: string;
  name: string;
  color: string;
  order: number;
}
