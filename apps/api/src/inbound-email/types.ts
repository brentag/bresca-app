export interface PostmarkInboundPayload {
  From: string;
  To: string;
  Subject: string;
  TextBody: string;
  HtmlBody: string;
  Attachments: Array<{
    Name: string;
    Content: string;       // Base64-encoded
    ContentType: string;
    ContentLength: number;
  }>;
  Headers: Array<{ Name: string; Value: string }>;
  OriginalRecipient: string;
}

export interface ParsedAttachment {
  name: string;
  buffer: Buffer;
  mimeType: string;
  sizeBytes: number;
}

export interface ParsedLink {
  url: string;
  anchorText: string;
  source: 'html' | 'plain';
  score: number;
}

export interface InboundContext {
  logId: string;
  userId: string;
  profileId: string;
  fromEmail: string;
  toAddress: string;
  subject: string;
}

export type RejectionReason =
  | 'unknown_sender'
  | 'no_profile'
  | 'rate_limited'
  | 'invalid_attachment'
  | 'file_too_large'
  | 'no_content'
  | 'download_failed';
