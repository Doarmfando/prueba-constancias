-- ================================================
-- ESQUEMA POSTGRESQL PARA SUPABASE
-- Sistema de Constancias - Migración desde SQLite
-- ================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- TABLA: usuarios
-- ================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id BIGSERIAL PRIMARY KEY,
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  nombre_usuario TEXT,
  email TEXT UNIQUE,
  rol TEXT CHECK(rol IN ('administrador', 'trabajador')) DEFAULT 'trabajador',
  activo BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  ultimo_acceso TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(auth_id)
);

-- Índices para usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_id ON usuarios(auth_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_nombre_usuario ON usuarios(nombre_usuario);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);

-- ================================================
-- TABLA: personas
-- ================================================
CREATE TABLE IF NOT EXISTS personas (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  dni TEXT,
  numero TEXT,
  fecha_registro TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para personas
CREATE INDEX IF NOT EXISTS idx_personas_dni ON personas(dni);
CREATE INDEX IF NOT EXISTS idx_personas_nombre ON personas(nombre);

-- ================================================
-- TABLA: estados
-- ================================================
CREATE TABLE IF NOT EXISTS estados (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- TABLA: expedientes
-- ================================================
CREATE TABLE IF NOT EXISTS expedientes (
  id BIGSERIAL PRIMARY KEY,
  persona_id BIGINT NOT NULL,
  codigo TEXT UNIQUE,
  fecha_solicitud DATE,
  observacion TEXT,
  fecha_entrega DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
);

-- Índices para expedientes
CREATE INDEX IF NOT EXISTS idx_expedientes_persona_id ON expedientes(persona_id);
CREATE INDEX IF NOT EXISTS idx_expedientes_codigo ON expedientes(codigo);
CREATE INDEX IF NOT EXISTS idx_expedientes_fecha_solicitud ON expedientes(fecha_solicitud);

-- ================================================
-- TABLA: proyectos_registros
-- ================================================
CREATE TABLE IF NOT EXISTS proyectos_registros (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  usuario_creador_id BIGINT NOT NULL,
  es_publico BOOLEAN DEFAULT false,
  permite_edicion BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  fecha_publicacion TIMESTAMPTZ,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (usuario_creador_id) REFERENCES usuarios(id)
);

-- Índices para proyectos_registros
CREATE INDEX IF NOT EXISTS idx_proyectos_usuario_creador ON proyectos_registros(usuario_creador_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_activo ON proyectos_registros(activo);
CREATE INDEX IF NOT EXISTS idx_proyectos_es_publico ON proyectos_registros(es_publico);

-- ================================================
-- TABLA: registros
-- ================================================
CREATE TABLE IF NOT EXISTS registros (
  id BIGSERIAL PRIMARY KEY,
  proyecto_id BIGINT NOT NULL DEFAULT 1,
  persona_id BIGINT NOT NULL,
  expediente_id BIGINT NOT NULL,
  estado_id BIGINT NOT NULL,
  usuario_creador_id BIGINT NOT NULL DEFAULT 1,
  fecha_registro TIMESTAMPTZ DEFAULT NOW(),
  fecha_en_caja DATE,
  eliminado BOOLEAN DEFAULT false,
  eliminado_por BIGINT,
  fecha_eliminacion TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (proyecto_id) REFERENCES proyectos_registros(id) ON DELETE CASCADE,
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
  FOREIGN KEY (expediente_id) REFERENCES expedientes(id) ON DELETE CASCADE,
  FOREIGN KEY (estado_id) REFERENCES estados(id),
  FOREIGN KEY (usuario_creador_id) REFERENCES usuarios(id),
  FOREIGN KEY (eliminado_por) REFERENCES usuarios(id)
);

-- Índices para registros
CREATE INDEX IF NOT EXISTS idx_registros_proyecto_id ON registros(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_registros_persona_id ON registros(persona_id);
CREATE INDEX IF NOT EXISTS idx_registros_expediente_id ON registros(expediente_id);
CREATE INDEX IF NOT EXISTS idx_registros_estado_id ON registros(estado_id);
CREATE INDEX IF NOT EXISTS idx_registros_usuario_creador ON registros(usuario_creador_id);
CREATE INDEX IF NOT EXISTS idx_registros_fecha_registro ON registros(fecha_registro);
CREATE INDEX IF NOT EXISTS idx_registros_eliminado ON registros(eliminado);

-- ================================================
-- TABLA: documentos_persona
-- ================================================
CREATE TABLE IF NOT EXISTS documentos_persona (
  id BIGSERIAL PRIMARY KEY,
  persona_id BIGINT NOT NULL,
  nombre_archivo TEXT NOT NULL,
  ruta_archivo TEXT NOT NULL,  -- Ahora será la ruta en Supabase Storage
  tipo_archivo TEXT,
  comentario TEXT,
  fecha_carga TIMESTAMPTZ DEFAULT NOW(),
  usuario_carga_id BIGINT,
  tamaño_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_carga_id) REFERENCES usuarios(id)
);

-- Índices para documentos_persona
CREATE INDEX IF NOT EXISTS idx_documentos_persona_id ON documentos_persona(persona_id);
CREATE INDEX IF NOT EXISTS idx_documentos_tipo_archivo ON documentos_persona(tipo_archivo);
CREATE INDEX IF NOT EXISTS idx_documentos_usuario_carga ON documentos_persona(usuario_carga_id);

-- ================================================
-- TABLA: auditoria
-- ================================================
CREATE TABLE IF NOT EXISTS auditoria (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL,
  accion TEXT NOT NULL,
  tabla_afectada TEXT NOT NULL,
  registro_id BIGINT,
  proyecto_id BIGINT,
  detalles TEXT,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (proyecto_id) REFERENCES proyectos_registros(id)
);

-- Índices para auditoria
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_id ON auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_tabla_afectada ON auditoria(tabla_afectada);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(fecha);
CREATE INDEX IF NOT EXISTS idx_auditoria_proyecto_id ON auditoria(proyecto_id);

-- ================================================
-- TRIGGERS para updated_at automático
-- ================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personas_updated_at
  BEFORE UPDATE ON personas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_estados_updated_at
  BEFORE UPDATE ON estados
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expedientes_updated_at
  BEFORE UPDATE ON expedientes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proyectos_updated_at
  BEFORE UPDATE ON proyectos_registros
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registros_updated_at
  BEFORE UPDATE ON registros
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documentos_updated_at
  BEFORE UPDATE ON documentos_persona
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- SINCRONIZACIÓN CON SUPABASE AUTH
-- ================================================

-- Función para crear usuario en tabla usuarios cuando se registra en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (auth_id, nombre, email, nombre_usuario, rol, activo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre_usuario', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'trabajador'),
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para sincronizar nuevos usuarios
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Función para obtener el usuario actual desde auth.uid()
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS BIGINT AS $$
  SELECT id FROM public.usuarios WHERE auth_id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Función para verificar si el usuario es administrador
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE auth_id = auth.uid() AND rol = 'administrador' AND activo = true
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE estados ENABLE ROW LEVEL SECURITY;
ALTER TABLE expedientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos_registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_persona ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

-- Políticas simplificadas para desarrollo
-- NOTA: Por ahora permitimos acceso completo. Puedes ajustar según tus necesidades.

-- Para desarrollo, permitir acceso completo a usuarios autenticados
-- Esto es temporal y deberás ajustarlo en producción

-- Usuarios
CREATE POLICY "Permitir acceso completo a usuarios" ON usuarios
  FOR ALL USING (true);

-- Personas
CREATE POLICY "Permitir acceso completo a personas" ON personas
  FOR ALL USING (true);

-- Estados
CREATE POLICY "Permitir acceso completo a estados" ON estados
  FOR ALL USING (true);

-- Expedientes
CREATE POLICY "Permitir acceso completo a expedientes" ON expedientes
  FOR ALL USING (true);

-- Proyectos
CREATE POLICY "Permitir acceso completo a proyectos" ON proyectos_registros
  FOR ALL USING (true);

-- Registros
CREATE POLICY "Permitir acceso completo a registros" ON registros
  FOR ALL USING (true);

-- Documentos
CREATE POLICY "Permitir acceso completo a documentos" ON documentos_persona
  FOR ALL USING (true);

-- Auditoría
CREATE POLICY "Permitir acceso completo a auditoría" ON auditoria
  FOR ALL USING (true);

-- ================================================
-- DATOS INICIALES
-- ================================================

-- Insertar estados por defecto (si no existen)
INSERT INTO estados (nombre) VALUES
  ('Recibido'),
  ('En Caja'),
  ('Entregado'),
  ('Tesoreria')
ON CONFLICT (nombre) DO NOTHING;

-- ================================================
-- COMENTARIOS EN TABLAS
-- ================================================

COMMENT ON TABLE usuarios IS 'Usuarios del sistema con roles de administrador o trabajador';
COMMENT ON TABLE personas IS 'Personas que solicitan constancias';
COMMENT ON TABLE estados IS 'Estados posibles de los expedientes';
COMMENT ON TABLE expedientes IS 'Expedientes de constancias de pago';
COMMENT ON TABLE proyectos_registros IS 'Proyectos para agrupar registros';
COMMENT ON TABLE registros IS 'Registros de expedientes en proyectos';
COMMENT ON TABLE documentos_persona IS 'Documentos adjuntos a personas (almacenados en Supabase Storage)';
COMMENT ON TABLE auditoria IS 'Registro de auditoría de todas las acciones del sistema';
