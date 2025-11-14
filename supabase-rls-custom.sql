-- ================================================
-- POLÍTICAS RLS CON SUPABASE AUTH
-- ================================================
-- Esta configuración usa auth.uid() de Supabase Auth
-- Los usuarios se autentican con Supabase y se vinculan a la tabla usuarios

-- Primero, eliminar las políticas actuales
DROP POLICY IF EXISTS "Permitir acceso completo a usuarios" ON usuarios;
DROP POLICY IF EXISTS "Permitir acceso completo a personas" ON personas;
DROP POLICY IF EXISTS "Permitir acceso completo a estados" ON estados;
DROP POLICY IF EXISTS "Permitir acceso completo a expedientes" ON expedientes;
DROP POLICY IF EXISTS "Permitir acceso completo a proyectos" ON proyectos_registros;
DROP POLICY IF EXISTS "Permitir acceso completo a registros" ON registros;
DROP POLICY IF EXISTS "Permitir acceso completo a documentos" ON documentos_persona;
DROP POLICY IF EXISTS "Permitir acceso completo a auditoría" ON auditoria;

-- ================================================
-- POLÍTICAS RLS BASADAS EN ROLES Y SUPABASE AUTH
-- ================================================

-- Usuarios
CREATE POLICY "usuarios_select_policy" ON usuarios
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "usuarios_insert_policy" ON usuarios
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_id = auth.uid() AND rol = 'administrador' AND activo = true
    )
  );

CREATE POLICY "usuarios_update_policy" ON usuarios
  FOR UPDATE USING (
    auth_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_id = auth.uid() AND rol = 'administrador' AND activo = true
    )
  );

CREATE POLICY "usuarios_delete_policy" ON usuarios
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_id = auth.uid() AND rol = 'administrador' AND activo = true
    )
  );

-- Personas (todos los usuarios autenticados pueden gestionar)
CREATE POLICY "personas_all_policy" ON personas
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Estados (solo lectura para trabajadores, todo para administradores)
CREATE POLICY "estados_select_policy" ON estados
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "estados_modify_policy" ON estados
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_id = auth.uid() AND rol = 'administrador' AND activo = true
    )
  );

-- Expedientes (todos pueden gestionar)
CREATE POLICY "expedientes_all_policy" ON expedientes
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Proyectos (ver públicos o propios, editar solo propios o si es admin)
CREATE POLICY "proyectos_select_policy" ON proyectos_registros
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      es_publico = true OR
      usuario_creador_id = (SELECT id FROM usuarios WHERE auth_id = auth.uid()) OR
      EXISTS (
        SELECT 1 FROM usuarios
        WHERE auth_id = auth.uid() AND rol = 'administrador' AND activo = true
      )
    )
  );

CREATE POLICY "proyectos_insert_policy" ON proyectos_registros
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "proyectos_update_policy" ON proyectos_registros
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND (
      usuario_creador_id = (SELECT id FROM usuarios WHERE auth_id = auth.uid()) OR
      EXISTS (
        SELECT 1 FROM usuarios
        WHERE auth_id = auth.uid() AND rol = 'administrador' AND activo = true
      )
    )
  );

CREATE POLICY "proyectos_delete_policy" ON proyectos_registros
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND (
      usuario_creador_id = (SELECT id FROM usuarios WHERE auth_id = auth.uid()) OR
      EXISTS (
        SELECT 1 FROM usuarios
        WHERE auth_id = auth.uid() AND rol = 'administrador' AND activo = true
      )
    )
  );

-- Registros (todos pueden gestionar)
CREATE POLICY "registros_all_policy" ON registros
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Documentos (todos pueden gestionar)
CREATE POLICY "documentos_all_policy" ON documentos_persona
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Auditoría (solo lectura para todos, inserción automática)
CREATE POLICY "auditoria_select_policy" ON auditoria
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "auditoria_insert_policy" ON auditoria
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ================================================
-- COMENTARIOS
-- ================================================
COMMENT ON TABLE usuarios IS
'Tabla de usuarios vinculada a auth.users de Supabase.
Cada usuario autenticado tiene un registro aquí con información adicional (rol, permisos, etc.).';
