// server.js - Servidor Express para modo web
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configurar multer para manejo de archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Importar servicios y controladores
const { supabaseUser, supabaseAdmin } = require('./src/config/supabase');
const DatabaseService = require('./src/main/services/DatabaseService');
const StorageService = require('./src/main/services/StorageService');
const HybridStorageService = require('./src/main/services/HybridStorageService');

// Importar modelos
const PersonaModel = require('./src/main/models/PersonaModel');
const RegistroModel = require('./src/main/models/RegistroModel');
const UsuarioModel = require('./src/main/models/UsuarioModel');
const ExpedienteModel = require('./src/main/models/ExpedienteModel');
const ProyectoModel = require('./src/main/models/ProyectoModel');
const DocumentoPersonaModel = require('./src/main/models/DocumentoPersonaModel');

// Importar controladores
const PersonaController = require('./src/main/controllers/PersonaController');
const RegistroController = require('./src/main/controllers/RegistroController');
const AuthController = require('./src/main/controllers/AuthController');
const ProyectoController = require('./src/main/controllers/ProyectoController');
const DocumentoPersonaController = require('./src/main/controllers/DocumentoPersonaController');

// Inicializar servicios
let services = {};
let controllers = {};

async function initializeServices() {
  try {
    console.log('🚀 Inicializando servicios...');

    // Obtener clientes de Supabase
    services.supabaseUser = supabaseUser;
    services.supabaseAdmin = supabaseAdmin;

    // Inicializar DatabaseService
    services.database = new DatabaseService(supabaseUser, supabaseAdmin);

    // Inicializar StorageService y HybridStorageService
    services.hybridStorage = new HybridStorageService(supabaseAdmin);

    // Inicializar modelos
    const models = {
      persona: new PersonaModel(services.database),
      registro: new RegistroModel(services.database),
      usuario: new UsuarioModel(services.database),
      expediente: new ExpedienteModel(services.database),
      proyecto: new ProyectoModel(services.database),
      documentoPersona: new DocumentoPersonaModel(services.database)
    };

    // Inicializar controladores
    controllers.persona = new PersonaController(models.persona);
    controllers.registro = new RegistroController(models.registro, models.persona, models.expediente, models.proyecto);
    controllers.auth = new AuthController(models.usuario);
    controllers.proyecto = new ProyectoController(models.proyecto);
    controllers.documentoPersona = new DocumentoPersonaController(
      models.documentoPersona,
      models.persona,
      services.hybridStorage
    );

    console.log('✅ Servicios inicializados correctamente');
  } catch (error) {
    console.error('❌ Error inicializando servicios:', error);
    throw error;
  }
}

// Middleware para verificar que los servicios estén inicializados
const ensureInitialized = (req, res, next) => {
  if (!controllers.persona) {
    return res.status(503).json({
      success: false,
      error: 'Servicios no inicializados'
    });
  }
  next();
};

// ====================
// RUTAS DE API
// ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: 'web' });
});

// PERSONAS
app.get('/api/personas', ensureInitialized, async (req, res) => {
  try {
    const resultado = await controllers.persona.listar();
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/personas/:id', ensureInitialized, async (req, res) => {
  try {
    const resultado = await controllers.persona.buscarPorId(req.params.id);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/personas', ensureInitialized, async (req, res) => {
  try {
    const resultado = await controllers.persona.crear(req.body);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/personas/:id', ensureInitialized, async (req, res) => {
  try {
    const resultado = await controllers.persona.actualizar({ id: req.params.id, ...req.body });
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/personas/:id', ensureInitialized, async (req, res) => {
  try {
    const resultado = await controllers.persona.eliminar(req.params.id);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// REGISTROS (Constancias)
app.get('/api/registros', ensureInitialized, async (req, res) => {
  try {
    const resultado = await controllers.registro.listar();
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/registros/:id', ensureInitialized, async (req, res) => {
  try {
    const resultado = await controllers.registro.buscarPorId(req.params.id);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/registros', ensureInitialized, async (req, res) => {
  try {
    const resultado = await controllers.registro.crear(req.body);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/registros/:id', ensureInitialized, async (req, res) => {
  try {
    const resultado = await controllers.registro.actualizar({ id: req.params.id, ...req.body });
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/registros/:id', ensureInitialized, async (req, res) => {
  try {
    const resultado = await controllers.registro.eliminar(req.params.id);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// AUTH / USUARIOS
app.post('/api/usuarios/login', ensureInitialized, async (req, res) => {
  try {
    const resultado = await controllers.auth.login(req.body);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/usuarios', ensureInitialized, async (req, res) => {
  try {
    const resultado = await controllers.auth.listarUsuarios(req.body);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/usuarios', ensureInitialized, async (req, res) => {
  try {
    const resultado = await controllers.auth.registrarUsuario(req.body);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PROYECTOS
app.get('/api/proyectos', ensureInitialized, async (req, res) => {
  try {
    const resultado = await controllers.proyecto.listar();
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DOCUMENTOS PERSONA
app.get('/api/documentos-persona/:persona_id', ensureInitialized, async (req, res) => {
  try {
    const resultado = await controllers.documentoPersona.obtenerDocumentosPersona(req.params.persona_id);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/documentos-persona/subir', ensureInitialized, upload.single('archivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No se proporcionó ningún archivo' });
    }

    const { persona_id, comentario, usuario_carga_id } = req.body;

    // Crear archivo temporal para que el controlador pueda leerlo
    const fs = require('fs');
    const os = require('os');
    const tempPath = path.join(os.tmpdir(), `upload_${Date.now()}_${req.file.originalname}`);

    // Escribir el buffer a un archivo temporal
    fs.writeFileSync(tempPath, req.file.buffer);

    // El archivo viene en req.file.buffer
    const resultado = await controllers.documentoPersona.subirDocumento({
      persona_id: parseInt(persona_id),
      archivo_origen: tempPath, // Pasar la ruta temporal
      nombre_archivo: req.file.originalname,
      comentario,
      usuario_carga_id: usuario_carga_id ? parseInt(usuario_carga_id) : null
    });

    // Eliminar archivo temporal
    try {
      fs.unlinkSync(tempPath);
    } catch (err) {
      console.error('Error eliminando archivo temporal:', err);
    }

    res.json(resultado);
  } catch (error) {
    console.error('Error en upload:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/documentos-persona/descargar/:id', ensureInitialized, async (req, res) => {
  try {
    const documento = await controllers.documentoPersona.model.obtenerPorId(req.params.id);

    if (!documento) {
      return res.status(404).json({ success: false, error: 'Documento no encontrado' });
    }

    // Descargar desde Supabase si es necesario
    if (documento.ubicacion_almacenamiento === 'SUPABASE') {
      const resultado = await services.hybridStorage.descargarArchivo(documento.ruta_archivo, false);

      if (!resultado.success) {
        return res.status(500).json({ success: false, error: 'No se pudo descargar el archivo' });
      }

      const buffer = Buffer.from(await resultado.data.arrayBuffer());

      // Enviar archivo al cliente
      res.setHeader('Content-Disposition', `attachment; filename="${documento.nombre_archivo}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.send(buffer);
    } else {
      return res.status(400).json({
        success: false,
        error: 'El archivo está almacenado localmente y no puede descargarse en modo web'
      });
    }
  } catch (error) {
    console.error('Error descargando documento:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/documentos-persona/:id', ensureInitialized, async (req, res) => {
  try {
    const resultado = await controllers.documentoPersona.eliminarDocumento({ id: req.params.id });
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// REPORTES
app.post('/api/reportes/excel', ensureInitialized, async (req, res) => {
  try {
    const resultado = await controllers.registro.generarReporteExcel(req.body);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/reportes/pdf', ensureInitialized, async (req, res) => {
  try {
    const resultado = await controllers.registro.generarReportePDF(req.body);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Servir archivos estáticos en producción
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Iniciar servidor
async function startServer() {
  try {
    await initializeServices();

    app.listen(PORT, () => {
      console.log(`\n🌐 Servidor web corriendo en http://localhost:${PORT}`);
      console.log(`📊 API disponible en http://localhost:${PORT}/api`);
      console.log(`🔍 Health check: http://localhost:${PORT}/api/health\n`);
    });
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
