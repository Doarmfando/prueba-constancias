-- ================================================
-- CORREGIR ESTADOS - Ejecutar en Supabase SQL Editor
-- ================================================

-- Primero, borrar los estados incorrectos que puse
DELETE FROM estados WHERE nombre IN ('Pendiente', 'En Proceso', 'Completado', 'Cancelado');

-- Insertar los estados CORRECTOS del sistema
INSERT INTO estados (nombre) VALUES
  ('Recibido'),
  ('En Caja'),
  ('Entregado'),
  ('Tesoreria')
ON CONFLICT (nombre) DO NOTHING;

-- Verificar que se insertaron correctamente
SELECT * FROM estados ORDER BY id;
