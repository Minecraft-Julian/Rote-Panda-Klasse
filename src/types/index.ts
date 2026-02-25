export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  username?: string;
}

// Messenger
export interface Group {
  id: string;
  name: string;
  createdBy: string;
  members: string[];
  createdAt: Date;
  description?: string;
}

export interface Message {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  text?: string;
  fileUrl?: string;
  fileType?: 'image' | 'video' | 'file';
  fileName?: string;
  timestamp: Date;
  replyToId?: string;
  replyToText?: string;
  deletedFor?: string[];
  reported?: boolean;
}

export interface Report {
  id: string;
  messageId: string;
  groupId: string;
  reportedBy: string;
  reason: string;
  timestamp: Date;
  resolved: boolean;
}

// Class List
export interface ClassMember {
  uid: string;
  displayName: string;
  email?: string;
  phone?: string;
  address?: string;
  isSickToday?: boolean;
  sickDate?: string;
}

// Homework
export interface HomeworkEntry {
  id: string;
  subject: string;
  description: string;
  notes?: string;
  dueDate?: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  correctionProposal?: string;
  correctionVotes?: string[];
  correctionAgainst?: string[];
}

// Rate limiting
export interface UserRateLimit {
  uid: string;
  lastMessageTime: Date;
  messagesToday: number;
  lastResetDate: string;
}
