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
  nombre TEXT NOT NULL,
  nombre_usuario TEXT,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT CHECK(rol IN ('administrador', 'trabajador')) DEFAULT 'trabajador',
  activo BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  ultimo_acceso TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para usuarios
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (proyecto_id) REFERENCES proyectos_registros(id) ON DELETE CASCADE,
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
  FOREIGN KEY (expediente_id) REFERENCES expedientes(id) ON DELETE CASCADE,
  FOREIGN KEY (estado_id) REFERENCES estados(id),
  FOREIGN KEY (usuario_creador_id) REFERENCES usuarios(id)
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

-- Políticas básicas (puedes ajustarlas según tus necesidades)
-- Por ahora, permitir todo para usuarios autenticados

-- Usuarios
CREATE POLICY "Usuarios pueden ver todos los usuarios" ON usuarios
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Solo administradores pueden insertar usuarios" ON usuarios
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON usuarios
  FOR UPDATE USING (auth.uid()::text = id::text OR auth.role() = 'authenticated');

-- Personas
CREATE POLICY "Usuarios autenticados pueden ver personas" ON personas
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden crear personas" ON personas
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden actualizar personas" ON personas
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden eliminar personas" ON personas
  FOR DELETE USING (auth.role() = 'authenticated');

-- Estados
CREATE POLICY "Usuarios autenticados pueden ver estados" ON estados
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Solo administradores pueden modificar estados" ON estados
  FOR ALL USING (auth.role() = 'authenticated');

-- Expedientes
CREATE POLICY "Usuarios autenticados pueden ver expedientes" ON expedientes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden crear expedientes" ON expedientes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden actualizar expedientes" ON expedientes
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden eliminar expedientes" ON expedientes
  FOR DELETE USING (auth.role() = 'authenticated');

-- Proyectos
CREATE POLICY "Usuarios pueden ver proyectos públicos o propios" ON proyectos_registros
  FOR SELECT USING (
    es_publico = true OR
    usuario_creador_id = auth.uid()::bigint OR
    auth.role() = 'authenticated'
  );

CREATE POLICY "Usuarios autenticados pueden crear proyectos" ON proyectos_registros
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Creadores pueden actualizar sus proyectos" ON proyectos_registros
  FOR UPDATE USING (
    usuario_creador_id = auth.uid()::bigint OR
    auth.role() = 'authenticated'
  );

-- Registros
CREATE POLICY "Usuarios autenticados pueden ver registros" ON registros
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden crear registros" ON registros
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden actualizar registros" ON registros
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden eliminar registros" ON registros
  FOR DELETE USING (auth.role() = 'authenticated');

-- Documentos
CREATE POLICY "Usuarios autenticados pueden ver documentos" ON documentos_persona
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden crear documentos" ON documentos_persona
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden actualizar documentos" ON documentos_persona
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden eliminar documentos" ON documentos_persona
  FOR DELETE USING (auth.role() = 'authenticated');

-- Auditoría
CREATE POLICY "Usuarios autenticados pueden ver auditoría" ON auditoria
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden insertar en auditoría" ON auditoria
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ================================================
-- DATOS INICIALES
-- ================================================

-- Insertar estados por defecto (si no existen)
INSERT INTO estados (nombre) VALUES
  ('Pendiente'),
  ('En Proceso'),
  ('Completado'),
  ('Cancelado')
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
