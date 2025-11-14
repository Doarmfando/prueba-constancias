-- ================================================
-- OPCIÓN 3: RLS CON AUTENTICACIÓN PERSONALIZADA
-- ================================================
-- Esta opción permite usar tu tabla usuarios y RLS
-- Usa el patrón de "application user" en vez de auth.uid()

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
-- FUNCIÓN PARA OBTENER EL USUARIO ACTUAL
-- ================================================
-- Esta función lee el ID de usuario desde la configuración de sesión
CREATE OR REPLACE FUNCTION current_app_user_id()
RETURNS BIGINT AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.user_id', TRUE), '')::BIGINT,
    0
  );
$$ LANGUAGE SQL STABLE;

-- ================================================
-- POLÍTICAS RLS BASADAS EN ROLES
-- ================================================

-- Usuarios
CREATE POLICY "usuarios_select_policy" ON usuarios
  FOR SELECT USING (true);

CREATE POLICY "usuarios_insert_policy" ON usuarios
  FOR INSERT WITH CHECK (
    (SELECT rol FROM usuarios WHERE id = current_app_user_id()) = 'administrador'
  );

CREATE POLICY "usuarios_update_policy" ON usuarios
  FOR UPDATE USING (
    id = current_app_user_id() OR
    (SELECT rol FROM usuarios WHERE id = current_app_user_id()) = 'administrador'
  );

CREATE POLICY "usuarios_delete_policy" ON usuarios
  FOR DELETE USING (
    (SELECT rol FROM usuarios WHERE id = current_app_user_id()) = 'administrador'
  );

-- Personas (todos los usuarios autenticados pueden gestionar)
CREATE POLICY "personas_all_policy" ON personas
  FOR ALL USING (current_app_user_id() > 0);

-- Estados (solo lectura para trabajadores, todo para administradores)
CREATE POLICY "estados_select_policy" ON estados
  FOR SELECT USING (current_app_user_id() > 0);

CREATE POLICY "estados_modify_policy" ON estados
  FOR ALL USING (
    (SELECT rol FROM usuarios WHERE id = current_app_user_id()) = 'administrador'
  );

-- Expedientes (todos pueden gestionar)
CREATE POLICY "expedientes_all_policy" ON expedientes
  FOR ALL USING (current_app_user_id() > 0);

-- Proyectos (ver públicos o propios, editar solo propios o si es admin)
CREATE POLICY "proyectos_select_policy" ON proyectos_registros
  FOR SELECT USING (
    es_publico = true OR
    usuario_creador_id = current_app_user_id() OR
    (SELECT rol FROM usuarios WHERE id = current_app_user_id()) = 'administrador'
  );

CREATE POLICY "proyectos_insert_policy" ON proyectos_registros
  FOR INSERT WITH CHECK (current_app_user_id() > 0);

CREATE POLICY "proyectos_update_policy" ON proyectos_registros
  FOR UPDATE USING (
    usuario_creador_id = current_app_user_id() OR
    (SELECT rol FROM usuarios WHERE id = current_app_user_id()) = 'administrador'
  );

CREATE POLICY "proyectos_delete_policy" ON proyectos_registros
  FOR DELETE USING (
    usuario_creador_id = current_app_user_id() OR
    (SELECT rol FROM usuarios WHERE id = current_app_user_id()) = 'administrador'
  );

-- Registros (todos pueden gestionar)
CREATE POLICY "registros_all_policy" ON registros
  FOR ALL USING (current_app_user_id() > 0);

-- Documentos (todos pueden gestionar)
CREATE POLICY "documentos_all_policy" ON documentos_persona
  FOR ALL USING (current_app_user_id() > 0);

-- Auditoría (solo lectura para todos, inserción automática)
CREATE POLICY "auditoria_select_policy" ON auditoria
  FOR SELECT USING (current_app_user_id() > 0);

CREATE POLICY "auditoria_insert_policy" ON auditoria
  FOR INSERT WITH CHECK (current_app_user_id() > 0);

-- ================================================
-- COMENTARIOS
-- ================================================
COMMENT ON FUNCTION current_app_user_id() IS
'Retorna el ID del usuario actual desde la sesión.
Se debe configurar usando: SET LOCAL app.user_id = <user_id>';
