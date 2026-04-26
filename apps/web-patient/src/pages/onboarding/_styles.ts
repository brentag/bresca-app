import type React from 'react';
export const wrap: React.CSSProperties = { minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '40px 24px 32px', background: '#fff' };
export const title: React.CSSProperties = { fontSize: 24, fontWeight: 700, color: '#0F172A', marginBottom: 8 };
export const sub: React.CSSProperties = { fontSize: 14, color: '#64748B', marginBottom: 24, lineHeight: 1.6 };
export const input: React.CSSProperties = { width: '100%', padding: '14px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 16, color: '#0F172A', outline: 'none', minHeight: 52, marginBottom: 8 };
export const btn: React.CSSProperties = { width: '100%', padding: '16px', borderRadius: 100, border: 'none', background: '#00C87A', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer', minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk',sans-serif" };
export const skip: React.CSSProperties = { marginTop: 12, background: 'none', border: 'none', color: '#94A3B8', fontSize: 14, cursor: 'pointer', minHeight: 44, width: '100%' };
export const err: React.CSSProperties = { color: '#EF4444', fontSize: 13, marginBottom: 8 };
