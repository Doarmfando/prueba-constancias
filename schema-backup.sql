CREATE TABLE sqlite_sequence(name,seq);
CREATE TABLE personas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      dni TEXT,
      numero TEXT
    , fecha_registro DATETIME);
CREATE TABLE estados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE
    );
CREATE TABLE expedientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      persona_id INTEGER NOT NULL,
      codigo TEXT UNIQUE,
      fecha_solicitud TEXT DEFAULT NULL,
      observacion TEXT,
      fecha_entrega TEXT,
      FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
    );
CREATE TABLE usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      rol TEXT CHECK(rol IN ('administrador', 'trabajador')) DEFAULT 'trabajador',
      activo INTEGER DEFAULT 1,
      fecha_creacion TEXT DEFAULT (datetime('now')),
      ultimo_acceso TEXT
    , nombre_usuario TEXT);
CREATE TABLE proyectos_registros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      usuario_creador_id INTEGER NOT NULL,
      es_publico INTEGER DEFAULT 0,
      permite_edicion INTEGER DEFAULT 1,
      fecha_creacion TEXT DEFAULT (datetime('now')),
      fecha_publicacion TEXT,
      activo INTEGER DEFAULT 1,
      FOREIGN KEY (usuario_creador_id) REFERENCES usuarios(id)
    );
CREATE TABLE auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      accion TEXT NOT NULL,
      tabla_afectada TEXT NOT NULL,
      registro_id INTEGER,
      proyecto_id INTEGER,
      detalles TEXT,
      fecha TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
      FOREIGN KEY (proyecto_id) REFERENCES proyectos_registros(id)
    );
CREATE TABLE IF NOT EXISTS "registros" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            proyecto_id INTEGER NOT NULL DEFAULT 1,
            persona_id INTEGER NOT NULL,
            expediente_id INTEGER NOT NULL,
            estado_id INTEGER NOT NULL,
            usuario_creador_id INTEGER NOT NULL DEFAULT 1,
            fecha_registro TEXT DEFAULT (datetime('now')),
            fecha_en_caja TEXT,
            eliminado INTEGER DEFAULT 0,
            FOREIGN KEY (proyecto_id) REFERENCES proyectos_registros(id) ON DELETE CASCADE,
            FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
            FOREIGN KEY (expediente_id) REFERENCES expedientes(id) ON DELETE CASCADE,
            FOREIGN KEY (estado_id) REFERENCES estados(id),
            FOREIGN KEY (usuario_creador_id) REFERENCES usuarios(id)
          );
CREATE TABLE documentos_persona (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  persona_id INTEGER NOT NULL,
  nombre_archivo TEXT NOT NULL,
  ruta_archivo TEXT NOT NULL,
  tipo_archivo TEXT,
  comentario TEXT,
  fecha_carga DATETIME DEFAULT CURRENT_TIMESTAMP,
  usuario_carga_id INTEGER,
  tamaño_bytes INTEGER,
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_carga_id) REFERENCES usuarios(id)
);
