export interface IUser {
  _id: string; // Tienes que añadir el ID manualmente si no extiendes de Document
  documentType: string;
  document: string;
  names: string;
  lastnames: string;
  email: string;
  password?: string;
  phone: string;
  city: string;
  department: string;
  address: string;
  gender: string;
  verification: boolean;
  type: string;
  dayscredit: number;
  role: string;
  deleted: boolean;
}