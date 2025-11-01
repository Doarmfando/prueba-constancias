// src/main/services/DatabaseService.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { app } = require("electron");
const fs = require("fs");

class DatabaseService {
  constructor() {
    this.db = null;
  }

  getDatabasePath() {
    // Si la app NO está empaquetada, usar siempre la BD de desarrollo
    if (!app.isPackaged) {
      return path.join(__dirname, "../../../database.sqlite");
    }

    // Solo cuando está empaquetada (instalador), usar userData
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'database.sqlite');
  }

  async ensureDatabaseExists(dbPath) {
    // Si no existe la base de datos en userData, copiar desde recursos
    if (!fs.existsSync(dbPath)) {
      const resourceDbPath = path.join(process.resourcesPath, 'database.sqlite');

      // Si existe en resources, copiar
      if (fs.existsSync(resourceDbPath)) {
        console.log(`📋 Copiando base de datos desde: ${resourceDbPath}`);
        fs.copyFileSync(resourceDbPath, dbPath);
        console.log(`✅ Base de datos copiada a: ${dbPath}`);
      } else {
        // Si no existe, crear una nueva
        console.log(`📋 Creando nueva base de datos en: ${dbPath}`);
      }
    }
  }

  async connect() {
    const dbPath = this.getDatabasePath();

    // Asegurar que el directorio existe
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Asegurar que la base de datos existe
    await this.ensureDatabaseExists(dbPath);

    console.log(`🔄 Intentando conectar a base de datos en: ${dbPath}`);
    console.log(`🔄 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔄 Existe archivo: ${fs.existsSync(dbPath)}`);

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
          console.error("❌ Error al conectar BD:", err.message);
          return reject(err);
        }

        this.configurePragmas();
        console.log("✅ Conectado a SQLite en", dbPath);

        // Verificar que la base de datos tiene las tablas correctas
        this.verificarEsquema();

        resolve(this.db);
      });
    });
  }

  configurePragmas() {
    this.db.run("PRAGMA foreign_keys = ON;");
    this.db.run("PRAGMA journal_mode = WAL;");
    this.db.run("PRAGMA synchronous = NORMAL;");
  }

  getDatabase() {
    return this.db;
  }

  verificarEsquema() {
    console.log("🔍 Verificando esquema de base de datos...");

    // Usar promesa para verificación más segura
    const verificarTablas = new Promise((resolve, reject) => {
      this.db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });

    verificarTablas
      .then(rows => {
        const tablas = rows.map(row => row.name);
        console.log("📋 Tablas encontradas:", tablas);

        const tablasEsperadas = ['registros', 'personas', 'expedientes', 'estados', 'usuarios'];
        const faltantes = tablasEsperadas.filter(tabla => !tablas.includes(tabla));

        if (faltantes.length > 0) {
          console.warn("⚠️ Tablas faltantes:", faltantes);
        } else {
          console.log("✅ Todas las tablas principales encontradas");
        }
      })
      .catch(err => {
        console.error("❌ Error verificando esquema:", err.message);
      });
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error("Error al cerrar la base de datos:", err.message);
        } else {
          console.log("Conexión a la base de datos cerrada.");
        }
      });
    }
  }

  // Método utilitario para transacciones
  async runTransaction(operations) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run("BEGIN TRANSACTION");
        
        Promise.all(operations)
          .then(results => {
            this.db.run("COMMIT", (err) => {
              if (err) {
                this.db.run("ROLLBACK");
                return reject(err);
              }
              resolve(results);
            });
          })
          .catch(error => {
            this.db.run("ROLLBACK");
            reject(error);
          });
      });
    });
  }
}

module.exports = DatabaseService;