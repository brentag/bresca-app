-- Agrega campo email opcional a profiles para familiares y futura integración email-to-vault
ALTER TABLE profiles ADD COLUMN email TEXT;
