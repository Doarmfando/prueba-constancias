-- ==========================================
-- SCRIPT DE CONFIGURACIÓN DE SUPABASE REALTIME
-- Sistema de Constancias - Modo Web
-- ==========================================
--
-- INSTRUCCIONES:
-- 1. Abre Supabase Dashboard (https://app.supabase.com)
-- 2. Ve a tu proyecto
-- 3. Navega a SQL Editor
-- 4. Crea un nuevo query
-- 5. Copia y pega este script completo
-- 6. Ejecuta el script
--
-- ==========================================

-- ==========================================
-- PASO 1: HABILITAR REALTIME EN LAS TABLAS
-- ==========================================

-- Agregar tablas a la publicación de Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE personas;
ALTER PUBLICATION supabase_realtime ADD TABLE usuarios;
ALTER PUBLICATION supabase_realtime ADD TABLE expedientes;
ALTER PUBLICATION supabase_realtime ADD TABLE registros;
ALTER PUBLICATION supabase_realtime ADD TABLE documentos_persona;
ALTER PUBLICATION supabase_realtime ADD TABLE auditoria;
ALTER PUBLICATION supabase_realtime ADD TABLE proyectos_registro;

-- Verificar que las tablas se agregaron correctamente
SELECT
  tablename,
  schemaname,
  pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- ==========================================
-- PASO 2: CONFIGURAR ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Habilitar RLS en todas las tablas principales
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE expedientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_persona ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos_registro ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- PASO 3: CREAR POLÍTICAS DE ACCESO
-- ==========================================

-- NOTA: Ajusta estas políticas según tus necesidades de seguridad

-- ========== TABLA: PERSONAS ==========

-- Política: Todos los usuarios autenticados pueden ver personas
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver personas" ON personas;
CREATE POLICY "Usuarios autenticados pueden ver personas"
ON personas FOR SELECT
TO authenticated
USING (true);

-- Política: Todos los usuarios autenticados pueden insertar personas
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear personas" ON personas;
CREATE POLICY "Usuarios autenticados pueden crear personas"
ON personas FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política: Todos los usuarios autenticados pueden actualizar personas
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar personas" ON personas;
CREATE POLICY "Usuarios autenticados pueden actualizar personas"
ON personas FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política: Solo administradores pueden eliminar personas
DROP POLICY IF EXISTS "Solo administradores pueden eliminar personas" ON personas;
CREATE POLICY "Solo administradores pueden eliminar personas"
ON personas FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol = 'administrador'
  )
);

-- ========== TABLA: EXPEDIENTES ==========

-- Política: Todos los usuarios autenticados pueden ver expedientes
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver expedientes" ON expedientes;
CREATE POLICY "Usuarios autenticados pueden ver expedientes"
ON expedientes FOR SELECT
TO authenticated
USING (true);

-- Política: Usuarios pueden crear expedientes
DROP POLICY IF EXISTS "Usuarios pueden crear expedientes" ON expedientes;
CREATE POLICY "Usuarios pueden crear expedientes"
ON expedientes FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política: Usuarios pueden actualizar expedientes
DROP POLICY IF EXISTS "Usuarios pueden actualizar expedientes" ON expedientes;
CREATE POLICY "Usuarios pueden actualizar expedientes"
ON expedientes FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política: Solo administradores pueden eliminar expedientes
DROP POLICY IF EXISTS "Solo administradores pueden eliminar expedientes" ON expedientes;
CREATE POLICY "Solo administradores pueden eliminar expedientes"
ON expedientes FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol = 'administrador'
  )
);

-- ========== TABLA: PROYECTOS_REGISTRO ==========

-- Política: Todos pueden ver proyectos_registro
DROP POLICY IF EXISTS "Usuarios pueden ver proyectos_registro" ON proyectos_registro;
CREATE POLICY "Usuarios pueden ver proyectos_registro"
ON proyectos_registro FOR SELECT
TO authenticated
USING (true);

-- Política: Usuarios pueden crear relaciones
DROP POLICY IF EXISTS "Usuarios pueden crear proyectos_registro" ON proyectos_registro;
CREATE POLICY "Usuarios pueden crear proyectos_registro"
ON proyectos_registro FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política: Usuarios pueden actualizar relaciones
DROP POLICY IF EXISTS "Usuarios pueden actualizar proyectos_registro" ON proyectos_registro;
CREATE POLICY "Usuarios pueden actualizar proyectos_registro"
ON proyectos_registro FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política: Solo admin puede eliminar relaciones
DROP POLICY IF EXISTS "Solo admin puede eliminar proyectos_registro" ON proyectos_registro;
CREATE POLICY "Solo admin puede eliminar proyectos_registro"
ON proyectos_registro FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol = 'administrador'
  )
);

-- ========== TABLA: REGISTROS ==========

-- Política: Todos los usuarios autenticados pueden ver registros
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver registros" ON registros;
CREATE POLICY "Usuarios autenticados pueden ver registros"
ON registros FOR SELECT
TO authenticated
USING (true);

-- Política: Usuarios pueden crear registros
DROP POLICY IF EXISTS "Usuarios pueden crear registros" ON registros;
CREATE POLICY "Usuarios pueden crear registros"
ON registros FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política: Usuarios pueden actualizar registros
DROP POLICY IF EXISTS "Usuarios pueden actualizar registros" ON registros;
CREATE POLICY "Usuarios pueden actualizar registros"
ON registros FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política: Solo administradores pueden eliminar registros
DROP POLICY IF EXISTS "Solo administradores pueden eliminar registros" ON registros;
CREATE POLICY "Solo administradores pueden eliminar registros"
ON registros FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol = 'administrador'
  )
);

-- ========== TABLA: DOCUMENTOS_PERSONA ==========

-- Política: Todos pueden ver documentos
DROP POLICY IF EXISTS "Usuarios pueden ver documentos" ON documentos_persona;
CREATE POLICY "Usuarios pueden ver documentos"
ON documentos_persona FOR SELECT
TO authenticated
USING (true);

-- Política: Usuarios pueden subir documentos
DROP POLICY IF EXISTS "Usuarios pueden subir documentos" ON documentos_persona;
CREATE POLICY "Usuarios pueden subir documentos"
ON documentos_persona FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política: Usuarios pueden actualizar comentarios de documentos
DROP POLICY IF EXISTS "Usuarios pueden actualizar documentos" ON documentos_persona;
CREATE POLICY "Usuarios pueden actualizar documentos"
ON documentos_persona FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política: Solo admin puede eliminar documentos
DROP POLICY IF EXISTS "Solo admin puede eliminar documentos" ON documentos_persona;
CREATE POLICY "Solo admin puede eliminar documentos"
ON documentos_persona FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol = 'administrador'
  )
);

-- ========== TABLA: USUARIOS ==========

-- Política: Todos pueden ver usuarios activos
DROP POLICY IF EXISTS "Ver usuarios activos" ON usuarios;
CREATE POLICY "Ver usuarios activos"
ON usuarios FOR SELECT
TO authenticated
USING (activo = true);

-- Política: Solo administradores pueden crear usuarios
DROP POLICY IF EXISTS "Solo admin puede crear usuarios" ON usuarios;
CREATE POLICY "Solo admin puede crear usuarios"
ON usuarios FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol = 'administrador'
  )
);

-- Política: Solo administradores pueden actualizar usuarios
DROP POLICY IF EXISTS "Solo admin puede actualizar usuarios" ON usuarios;
CREATE POLICY "Solo admin puede actualizar usuarios"
ON usuarios FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol = 'administrador'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol = 'administrador'
  )
);

-- ========== TABLA: AUDITORIA ==========

-- Política: Solo administradores pueden ver auditoría
DROP POLICY IF EXISTS "Solo admin ve auditoría" ON auditoria;
CREATE POLICY "Solo admin ve auditoría"
ON auditoria FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol = 'administrador'
  )
);

-- Política: El sistema puede insertar en auditoría
DROP POLICY IF EXISTS "Sistema puede insertar auditoría" ON auditoria;
CREATE POLICY "Sistema puede insertar auditoría"
ON auditoria FOR INSERT
TO authenticated
WITH CHECK (true);

-- ==========================================
-- PASO 4: VERIFICAR CONFIGURACIÓN
-- ==========================================

-- Ver todas las políticas configuradas
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verificar que RLS está habilitado
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('personas', 'usuarios', 'expedientes', 'registros', 'documentos_persona', 'auditoria', 'proyectos_registro')
ORDER BY tablename;

-- ==========================================
-- PASO 5: CREAR FUNCIÓN HELPER (OPCIONAL)
-- ==========================================

-- Función para verificar si un usuario es administrador
CREATE OR REPLACE FUNCTION es_administrador()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol = 'administrador'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- CONFIGURACIÓN COMPLETADA
-- ==========================================

-- Verificar que todo está correcto
DO $$
DECLARE
  tablas_count INTEGER;
  politicas_count INTEGER;
BEGIN
  -- Contar tablas en realtime
  SELECT COUNT(*) INTO tablas_count
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
    AND tablename IN ('personas', 'usuarios', 'expedientes', 'registros', 'documentos_persona', 'auditoria', 'proyectos_registro');

  -- Contar políticas
  SELECT COUNT(*) INTO politicas_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('personas', 'usuarios', 'expedientes', 'registros', 'documentos_persona', 'auditoria', 'proyectos_registro');

  RAISE NOTICE '✅ CONFIGURACIÓN COMPLETADA';
  RAISE NOTICE '📊 Tablas en Realtime: %', tablas_count;
  RAISE NOTICE '🔒 Políticas RLS creadas: %', politicas_count;

  IF tablas_count = 7 THEN
    RAISE NOTICE '✅ Todas las tablas están configuradas para Realtime';
  ELSE
    RAISE WARNING '⚠️ Solo % de 7 tablas están en Realtime', tablas_count;
  END IF;

  IF politicas_count > 0 THEN
    RAISE NOTICE '✅ Políticas RLS configuradas correctamente';
  ELSE
    RAISE WARNING '⚠️ No se encontraron políticas RLS';
  END IF;
END $$;

-- ==========================================
-- NOTAS IMPORTANTES
-- ==========================================

/*
1. Las políticas RLS aquí definidas son ejemplos básicos.
   Ajústalas según tus necesidades de seguridad.

2. Para probar Realtime:
   - Ejecuta este script
   - Abre tu aplicación web (npm run web)
   - Abre la consola del navegador
   - Deberías ver: "✅ Suscrito a cambios en tiempo real de [tabla]"

3. Para verificar que funciona:
   - Abre dos pestañas del navegador
   - En una, haz un cambio (agregar/editar/eliminar)
   - La otra pestaña se actualizará automáticamente

4. Si tienes problemas:
   - Verifica que las variables de entorno estén correctas (.env)
   - Revisa la consola del navegador en busca de errores
   - Consulta SUPABASE_REALTIME_SETUP.md para más detalles

5. Límites de Realtime según el plan de Supabase:
   - Free: 200 conexiones concurrentes
   - Pro: 500 conexiones concurrentes
   - Team: Ilimitado

6. Para deshabilitar Realtime en una tabla:
   ALTER PUBLICATION supabase_realtime DROP TABLE nombre_tabla;
*/
