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
const DatabaseService = require('./src/main/services/DatabaseService');
const StorageService = require('./src/main/services/StorageService');

// Importar modelos
const PersonaModel = require('./src/main/models/PersonaModel');
const RegistroModel = require('./src/main/models/RegistroModel');
const UsuarioModel = require('./src/main/models/UsuarioModel');
const ExpedienteModel = require('./src/main/models/ExpedienteModel');
const ProyectoModel = require('./src/main/models/ProyectoModel');
const DocumentoPersonaModel = require('./src/main/models/DocumentoPersonaModel');
const AuditoriaModel = require('./src/main/models/AuditoriaModel');

// Importar controladores
const PersonaController = require('./src/main/controllers/PersonaController');
const RegistroController = require('./src/main/controllers/RegistroController');
const AuthController = require('./src/main/controllers/AuthController');
const ProyectoController = require('./src/main/controllers/ProyectoController');
const DocumentoPersonaControllerWeb = require('./src/main/controllers/DocumentoPersonaControllerWeb');
const InformacionController = require('./src/main/controllers/InformacionController');
const AuditoriaController = require('./src/main/controllers/AuditoriaController');

// Inicializar servicios
let services = {};
let controllers = {};
let models = {};
const channelHandlers = new Map();
const notAvailable = (feature) => async () => ({
  success: false,
  error: `${feature} no está disponible en el modo web`,
});
const noopSuccess = async () => ({ success: true });

async function initializeServices() {
  try {
    console.log('?? Inicializando servicios...');

    services.database = new DatabaseService();
    const clients = await services.database.connect();
    services.dbUser = clients.user;
    services.dbAdmin = clients.admin;

    services.storage = new StorageService(services.dbAdmin, 'Archivos');

    models.registro = new RegistroModel(services.dbAdmin);
    models.persona = new PersonaModel(services.dbAdmin);
    models.expediente = new ExpedienteModel(services.dbAdmin);
    models.documentoPersona = new DocumentoPersonaModel(services.dbAdmin);
    models.proyecto = new ProyectoModel(services.dbUser);
    models.usuario = new UsuarioModel(services.dbUser);
    if (typeof models.usuario.setAdminClient === 'function') {
      models.usuario.setAdminClient(services.dbAdmin);
    }
    models.auditoria = new AuditoriaModel(services.dbAdmin);

    controllers.persona = new PersonaController(models.persona);
    controllers.registro = new RegistroController(models.registro, models.proyecto);
    controllers.auth = new AuthController(models.usuario, models.auditoria);
    controllers.proyecto = new ProyectoController(models.proyecto, models.auditoria, models.registro);
    controllers.documentoPersona = new DocumentoPersonaControllerWeb(
      models.documentoPersona,
      models.persona,
      services.storage
    );
    controllers.informacion = new InformacionController(models.persona, models.expediente, models.registro);
    controllers.auditoria = new AuditoriaController(models.auditoria);

    registerChannelHandlers();

    console.log('? Servicios inicializados correctamente');
  } catch (error) {
    console.error('? Error inicializando servicios:', error);
    throw error;
  }
}

function registerChannelHandlers() {
  const register = (channel, handler) => channelHandlers.set(channel, handler);

  register('auth-login', ({ nombre_usuario, password } = {}) =>
    controllers.auth.login(nombre_usuario, password)
  );
  register('auth-verificar-sesion', ({ usuarioId } = {}) =>
    controllers.auth.verificarSesion(usuarioId)
  );
  register('auth-obtener-perfil', ({ usuarioId } = {}) =>
    controllers.auth.obtenerPerfil(usuarioId)
  );
  register('auth-cambiar-password', ({ id, passwordAnterior, passwordNuevo, usuario } = {}) =>
    controllers.auth.cambiarPassword(id, passwordAnterior, passwordNuevo, usuario)
  );
  register('auth-crear-usuario', ({ datosUsuario, usuario } = {}) =>
    controllers.auth.crearUsuario(datosUsuario, usuario)
  );
  register('auth-listar-usuarios', ({ usuario } = {}) =>
    controllers.auth.listarUsuarios(usuario)
  );
  register('auth-actualizar-usuario', ({ id, datos, usuario } = {}) =>
    controllers.auth.actualizarUsuario(id, datos, usuario)
  );
  register('auth-desactivar-usuario', ({ id, usuario } = {}) =>
    controllers.auth.desactivarUsuario(id, usuario)
  );
  register('auth-obtener-estadisticas', ({ usuario } = {}) =>
    controllers.auth.obtenerEstadisticas(usuario)
  );

  register('personas-obtener-con-documentos', () =>
    controllers.persona.obtenerConDocumentos()
  );
  register('personas-buscar', (termino) => controllers.persona.buscar(termino));
  register('personas-crear', (datos) => controllers.persona.crear(datos));
  register('personas-actualizar', (datos) => controllers.persona.actualizar(datos));
  register('personas-eliminar', ({ id, usuario } = {}) =>
    controllers.persona.eliminar({ id, usuario })
  );

  register('obtener-registros', () => controllers.registro.obtenerRegistros());
  register('obtener-registros-borrados', () => controllers.registro.obtenerPapeleria());
  register('obtener-registros-proyecto', (proyectoId) =>
    controllers.registro.obtenerRegistrosPorProyecto(proyectoId)
  );
  register('agregar-registro', (payload) => controllers.registro.agregarRegistro(payload));
  register('actualizar-registro', (payload) =>
    controllers.registro.actualizarRegistro(payload)
  );
  register('editar-registro', (payload) =>
    controllers.registro.actualizarRegistro(payload)
  );
  register('mover-a-papelera', (payload) => controllers.registro.moverAPapelera(payload));
  register('mover-a-papelera-multiple', (payload) =>
    controllers.registro.moverMultipleAPapelera(payload)
  );
  register('restaurar-registro', (payload) => controllers.registro.restaurarRegistro(payload));
  register('restaurar-registro-multiple', (payload) =>
    controllers.registro.restaurarMultiple(payload)
  );
  register('eliminarRegistro', (payload) =>
    controllers.registro.eliminarPermanentemente(payload)
  );
  register('eliminar-registro-multiple', (payload) =>
    controllers.registro.eliminarMultiple(payload)
  );
  register('actualizarMultiple', notAvailable('Actualización múltiple de registros'));
  register('buscar-por-dni', (dni) => controllers.registro.buscarPorDni(dni));
  register('mover-a-papelera-dni-completo', (dni) =>
    controllers.registro.moverDniCompletoAPapelera(dni)
  );
  register('obtener-registros-eliminados', () => controllers.registro.obtenerPapeleria());
  register('dashboard-estadisticas', (params) =>
    controllers.registro.obtenerEstadisticas(params || {})
  );
  register('fechas-disponibles', (params) =>
    controllers.registro.obtenerFechasDisponibles((params && params.tipo) || 'registro')
  );
  register('guardar-pdf', notAvailable('Guardado de PDF local'));
  register('abrir-whatsapp', notAvailable('Acción abrir WhatsApp'));
  register('abrir-correo', notAvailable('Acción abrir correo'));
  register('exportar-registros', notAvailable('Exportación de registros local'));
  register('importar-registros', notAvailable('Importación de registros local'));
  register('vaciar-registros', notAvailable('Vaciar registros'));
  register('cerrar-app', noopSuccess);
  register('abrir-menu-contextual', noopSuccess);

  register('proyecto-obtener-mis-proyectos', ({ usuarioId, usuario } = {}) =>
    controllers.proyecto.obtenerMisProyectos(usuarioId, usuario)
  );
  register('proyecto-crear', ({ datos, usuario } = {}) =>
    controllers.proyecto.crear(datos, usuario)
  );
  register('proyecto-eliminar', ({ id, usuario } = {}) =>
    controllers.proyecto.eliminar(id, usuario)
  );
  register('proyecto-hacer-publico', ({ id, usuario } = {}) =>
    controllers.proyecto.hacerPublico(id, usuario)
  );
  register('proyecto-hacer-privado', ({ id, usuario } = {}) =>
    controllers.proyecto.hacerPrivado(id, usuario)
  );
  register('proyecto-obtener-publicos', () =>
    controllers.proyecto.obtenerProyectosPublicos()
  );
  register('proyecto-obtener-por-id', ({ id, usuario } = {}) =>
    controllers.proyecto.obtenerPorId(id, usuario)
  );
  register('proyecto-obtener-privados-otros', ({ usuario } = {}) =>
    controllers.proyecto.obtenerProyectosPrivadosOtros(usuario)
  );
  register('proyecto-exportar-pdf', ({ proyectoId, titulo, incluirEliminados, usuario } = {}) =>
    controllers.proyecto.exportarProyectoPDF(proyectoId, titulo, incluirEliminados, usuario)
  );
  register('proyecto-obtener-detalle', ({ id, usuario } = {}) =>
    controllers.proyecto.obtenerPorId(id, usuario)
  );

  register('buscar-persona-por-dni', ({ dni } = {}) =>
    controllers.informacion.buscarPersonaPorDni({ dni })
  );
  register('actualizar-informacion', (payload) =>
    controllers.informacion.actualizarInformacion(payload)
  );
  register('navegar-a-informacion', noopSuccess);

  register('auditoria-obtener-historial', (payload = {}) =>
    controllers.auditoria.obtenerHistorial(
      payload.usuario || { id: 1, rol: 'administrador' },
      payload.limite || 50,
      payload.offset || 0,
      payload.filtros || {}
    )
  );
  register('auditoria-obtener-estadisticas', ({ usuario } = {}) =>
    controllers.auditoria.obtenerEstadisticas(usuario || { id: 1, rol: 'administrador' })
  );

  // Registrar cierre de sesión para modo web
  register('auditoria-registrar-logout', (usuario = {}) =>
    controllers.auditoria.registrarLogout(usuario)
  );

  register('obtener-estadisticas-base-datos', notAvailable('Estadísticas de base de datos'));
  register('exportar-datos', notAvailable('Exportación de datos'));
  register('importar-datos', notAvailable('Importación de datos'));
  register('limpiar-datos', notAvailable('Limpieza de datos'));
  register('crear-backup', notAvailable('Creación de backup'));

  register('documento-persona-obtener-por-persona', (persona_id) =>
    controllers.documentoPersona.obtenerDocumentosPersona(persona_id)
  );
  register('documento-persona-eliminar', (payload) =>
    controllers.documentoPersona.eliminarDocumento(payload)
  );
  register('documento-persona-actualizar-comentario', (payload) =>
    controllers.documentoPersona.actualizarComentario(payload)
  );
  register('documento-persona-estadisticas', () =>
    controllers.documentoPersona.obtenerEstadisticas()
  );
  register('documento-persona-abrir', notAvailable('Abrir documento local'));
  register('documento-persona-descargar', notAvailable('Descargar documento local'));
  register('documento-persona-subir', notAvailable('Subir documento mediante IPC'));
  register('documento-persona-seleccionar-archivo', notAvailable('Selección de archivos local'));

  register('storage:sincronizar', notAvailable('Sincronización de storage'));
  register('storage:estadisticas-cola', notAvailable('Estadísticas de almacenamiento'));
  register('storage:subir-archivo', notAvailable('Subir archivo local'));
  register('storage:descargar-archivo', notAvailable('Descargar archivo local'));
  register('storage:eliminar-archivo', notAvailable('Eliminar archivo local'));
  register('storage:listar-archivos', notAvailable('Listado de storage'));
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

// Mover registro a papelería
app.post('/api/registros/:id/papeleria', ensureInitialized, async (req, res) => {
  try {
    const resultado = await controllers.registro.moverAPapelera({ id: req.params.id, usuario: req.body.usuario });
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Restaurar registro desde papelería
app.post('/api/registros/:id/restaurar', ensureInitialized, async (req, res) => {
  try {
    const resultado = await controllers.registro.restaurarRegistro({ id: req.params.id, usuario: req.body.usuario });
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

// Endpoint para registrar logout (usado por sendBeacon al cerrar ventana)
app.post('/api/auditoria/logout', ensureInitialized, async (req, res) => {
  try {
    const usuario = req.body;
    if (usuario && usuario.id) {
      await controllers.auditoria.registrarLogout(usuario);
    }
    // Responder inmediatamente para que sendBeacon tenga éxito
    res.status(204).send(); // 204 No Content
  } catch (error) {
    console.error('Error registrando logout:', error);
    res.status(204).send(); // Aún así responder 204 para no bloquear el cierre
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
    const resultado = await controllers.documentoPersona.descargarDocumento(req.params.id);

    if (!resultado.success) {
      return res.status(500).json({ success: false, error: resultado.error });
    }

    // Enviar archivo al cliente
    res.setHeader('Content-Disposition', `attachment; filename="${resultado.nombre_archivo}"`);
    res.setHeader('Content-Type', resultado.content_type);
    res.send(resultado.buffer);
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

app.post('/api/ipc', ensureInitialized, async (req, res) => {
  const { channel, payload } = req.body || {};

  if (!channel) {
    return res.status(400).json({
      success: false,
      error: 'Es necesario especificar el canal a ejecutar',
    });
  }

  const handler = channelHandlers.get(channel);
  if (!handler) {
    return res.status(404).json({
      success: false,
      error: `Canal no soportado en modo web: ${channel}`,
    });
  }

  try {
    const resultado = await handler(payload);
    if (typeof resultado === 'undefined') {
      return res.json({ success: true });
    }
    return res.json(resultado);
  } catch (error) {
    console.error(`Error ejecutando canal ${channel}:`, error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno',
    });
  }
});

app.post('/api/proyectos/:id/exportar-pdf', ensureInitialized, async (req, res) => {
  try {
    const proyectoId = parseInt(req.params.id, 10);
    const { titulo, incluirEliminados = false, fechaExportacion = null, usuario } = req.body || {};

    if (!proyectoId) {
      return res.status(400).json({ success: false, error: 'ID de proyecto invalido' });
    }

    const resultado = await controllers.proyecto.exportarProyectoPDF(
      proyectoId,
      titulo,
      incluirEliminados,
      usuario || {},
      { soloBuffer: true, fechaExportacion }
    );

    if (!resultado?.success) {
      return res.status(400).json({ success: false, error: resultado?.error || 'No se pudo generar el PDF' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${resultado.fileName || 'proyecto.pdf'}"`);
    return res.send(resultado.buffer);
  } catch (error) {
    console.error('Error exportando proyecto a PDF en modo web:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Servir archivos estáticos (tanto en desarrollo como producción)
// En desarrollo, webpack dev server escribirá en dist/ gracias a writeToDisk: true
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback - todas las rutas no-API devuelven index.html
app.get('*', (req, res, next) => {
  // Si es una petición a /api, pasar al siguiente handler
  if (req.path.startsWith('/api')) {
    return next();
  }

  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

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
