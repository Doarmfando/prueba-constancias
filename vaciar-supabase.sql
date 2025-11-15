-- ================================================
-- VACIAR TODOS LOS DATOS DE SUPABASE
-- ================================================
-- ⚠️  CUIDADO: Este script elimina TODOS los registros
-- Ejecuta en Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- ================================================
-- OPCIÓN 1: ELIMINAR TODO (INCLUYENDO USUARIOS)
-- ================================================

-- Eliminar en orden inverso de dependencias
DELETE FROM auditoria;
DELETE FROM registros;
DELETE FROM documentos_persona;
DELETE FROM proyectos_registros;
DELETE FROM expedientes;
DELETE FROM personas;
DELETE FROM usuarios;

-- Opcional: Resetear secuencias (IDs empezarán desde 1)
ALTER SEQUENCE personas_id_seq RESTART WITH 1;
ALTER SEQUENCE expedientes_id_seq RESTART WITH 1;
ALTER SEQUENCE registros_id_seq RESTART WITH 1;
ALTER SEQUENCE proyectos_registros_id_seq RESTART WITH 1;
ALTER SEQUENCE documentos_persona_id_seq RESTART WITH 1;
ALTER SEQUENCE auditoria_id_seq RESTART WITH 1;
ALTER SEQUENCE usuarios_id_seq RESTART WITH 1;

SELECT 'TODOS LOS DATOS ELIMINADOS' AS resultado;

-- ================================================
-- OPCIÓN 2: ELIMINAR TODO EXCEPTO ADMINISTRADORES
-- ================================================

-- Descomentar estas líneas y comentar OPCIÓN 1 si quieres mantener admins
/*
DELETE FROM auditoria;
DELETE FROM registros;
DELETE FROM documentos_persona;
DELETE FROM proyectos_registros;
DELETE FROM expedientes;
DELETE FROM personas;
DELETE FROM usuarios WHERE rol = 'trabajador';

ALTER SEQUENCE personas_id_seq RESTART WITH 1;
ALTER SEQUENCE expedientes_id_seq RESTART WITH 1;
ALTER SEQUENCE registros_id_seq RESTART WITH 1;
ALTER SEQUENCE proyectos_registros_id_seq RESTART WITH 1;
ALTER SEQUENCE documentos_persona_id_seq RESTART WITH 1;
ALTER SEQUENCE auditoria_id_seq RESTART WITH 1;

SELECT 'DATOS ELIMINADOS (ADMINS MANTENIDOS)' AS resultado;
*/

-- ================================================
-- OPCIÓN 3: ELIMINAR SOLO DATOS OPERATIVOS
-- (Mantener usuarios, proyectos y estados)
-- ================================================

-- Descomentar estas líneas si solo quieres limpiar datos operativos
/*
DELETE FROM auditoria;
DELETE FROM registros;
DELETE FROM documentos_persona;
DELETE FROM expedientes;
DELETE FROM personas;

ALTER SEQUENCE personas_id_seq RESTART WITH 1;
ALTER SEQUENCE expedientes_id_seq RESTART WITH 1;
ALTER SEQUENCE registros_id_seq RESTART WITH 1;
ALTER SEQUENCE documentos_persona_id_seq RESTART WITH 1;
ALTER SEQUENCE auditoria_id_seq RESTART WITH 1;

SELECT 'DATOS OPERATIVOS ELIMINADOS' AS resultado;
*/

-- ================================================
-- NOTA IMPORTANTE SOBRE AUTH.USERS
-- ================================================
-- Los usuarios de auth.users NO se eliminan con este script
-- Para eliminarlos debes usar el script de Node.js (vaciar-supabase.js)
-- O hacerlo manualmente desde el dashboard de Supabase:
-- https://supabase.com/dashboard/project/_/auth/users

-- ================================================
-- VERIFICAR DATOS RESTANTES
-- ================================================
SELECT
  'personas' as tabla, COUNT(*) as total FROM personas
UNION ALL
SELECT 'expedientes', COUNT(*) FROM expedientes
UNION ALL
SELECT 'registros', COUNT(*) FROM registros
UNION ALL
SELECT 'proyectos_registros', COUNT(*) FROM proyectos_registros
UNION ALL
SELECT 'documentos_persona', COUNT(*) FROM documentos_persona
UNION ALL
SELECT 'usuarios', COUNT(*) FROM usuarios
UNION ALL
SELECT 'auditoria', COUNT(*) FROM auditoria
UNION ALL
SELECT 'estados', COUNT(*) FROM estados
ORDER BY tabla;
