const PdfPrinter = require('pdfmake');
const fs = require('fs');
const path = require('path');
const { app, dialog } = require('electron');

class PDFService {
  constructor() {
    // Definir fuentes
    this.fonts = {
      Roboto: {
        normal: path.join(__dirname, '../../fonts/Roboto-Regular.ttf'),
        bold: path.join(__dirname, '../../fonts/Roboto-Medium.ttf'),
        italics: path.join(__dirname, '../../fonts/Roboto-Italic.ttf'),
        bolditalics: path.join(__dirname, '../../fonts/Roboto-MediumItalic.ttf')
      }
    };

    // Si no existen las fuentes de Roboto, usar fuentes del sistema
    try {
      if (!fs.existsSync(this.fonts.Roboto.normal)) {
        // Usar fuentes por defecto de pdfmake
        this.fonts = {
          Roboto: {
            normal: 'Helvetica',
            bold: 'Helvetica-Bold',
            italics: 'Helvetica-Oblique',
            bolditalics: 'Helvetica-BoldOblique'
          }
        };
      }
    } catch (error) {
      console.warn('No se pudieron cargar fuentes personalizadas, usando fuentes por defecto');
      this.fonts = {
        Roboto: {
          normal: 'Helvetica',
          bold: 'Helvetica-Bold',
          italics: 'Helvetica-Oblique',
          bolditalics: 'Helvetica-BoldOblique'
        }
      };
    }

    this.printer = new PdfPrinter(this.fonts);
  }

  // Exportar proyecto a PDF
  async exportarProyectoPDF(proyecto, registros, opciones = {}) {
    try {
      const {
        titulo = proyecto.nombre,
        incluirEliminados = false,
        registrosEliminados = []
      } = opciones;

      const fechaActual = new Date().toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Estadísticas
      const activos = registros.length;
      const eliminados = registrosEliminados.length;
      const total = activos + eliminados;

      // Definición del documento
      const docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [40, 60, 40, 60],

        header: {
          margin: [40, 20, 40, 0],
          columns: [
            {
              text: titulo,
              style: 'header',
              alignment: 'left'
            },
            {
              text: fechaActual,
              style: 'subheader',
              alignment: 'right'
            }
          ]
        },

        footer: function(currentPage, pageCount) {
          return {
            margin: [40, 0, 40, 20],
            columns: [
              {
                text: 'Generado con Sistema de Gestión',
                style: 'footer',
                alignment: 'left'
              },
              {
                text: `Página ${currentPage} de ${pageCount}`,
                style: 'footer',
                alignment: 'right'
              }
            ]
          };
        },

        content: [
          // Título principal
          {
            text: titulo,
            style: 'title',
            margin: [0, 0, 0, 10]
          },

          // Información del proyecto
          {
            columns: [
              {
                width: '50%',
                stack: [
                  { text: 'Información del Proyecto', style: 'sectionHeader', margin: [0, 10, 0, 5] },
                  { text: `Nombre: ${proyecto.nombre}`, style: 'info' },
                  { text: `Descripción: ${proyecto.descripcion || 'Sin descripción'}`, style: 'info' },
                  { text: `Creador: ${proyecto.nombre_creador || 'Desconocido'}`, style: 'info' },
                  { text: `Fecha de creación: ${new Date(proyecto.fecha_creacion).toLocaleDateString('es-ES')}`, style: 'info' }
                ]
              },
              {
                width: '50%',
                stack: [
                  { text: 'Estadísticas', style: 'sectionHeader', margin: [0, 10, 0, 5] },
                  { text: `Total de registros: ${total}`, style: 'info' },
                  { text: `Registros activos: ${activos}`, style: 'info', color: '#10b981' },
                  { text: `En papelería: ${eliminados}`, style: 'info', color: '#ef4444' },
                  { text: `Visibilidad: ${proyecto.es_publico ? 'Público' : 'Privado'}`, style: 'info' }
                ]
              }
            ]
          },

          // Separador
          { canvas: [{ type: 'line', x1: 0, y1: 10, x2: 515, y2: 10, lineWidth: 1, lineColor: '#e5e7eb' }] },

          // Registros activos
          { text: 'Registros Activos', style: 'sectionHeader', margin: [0, 15, 0, 10] },

          registros.length > 0 ? {
            table: {
              headerRows: 1,
              widths: ['20%', '15%', '20%', '15%', '15%', '15%'],
              body: [
                // Encabezados
                [
                  { text: 'Nombre', style: 'tableHeader' },
                  { text: 'DNI', style: 'tableHeader' },
                  { text: 'Expediente', style: 'tableHeader' },
                  { text: 'Número', style: 'tableHeader' },
                  { text: 'Estado', style: 'tableHeader' },
                  { text: 'Fecha', style: 'tableHeader' }
                ],
                // Datos
                ...registros.map(r => [
                  { text: r.nombre || `${r.nombres || ''} ${r.apellidos || ''}`.trim() || '---', style: 'tableCell' },
                  { text: r.dni || '---', style: 'tableCell' },
                  { text: r.expediente || r.codigo || '---', style: 'tableCell' },
                  { text: r.numero || '---', style: 'tableCell' },
                  { text: r.estado || '---', style: 'tableCell' },
                  { text: r.fecha_registro ? new Date(r.fecha_registro).toLocaleDateString('es-ES') : '---', style: 'tableCell' }
                ])
              ]
            },
            layout: {
              fillColor: function (rowIndex) {
                return (rowIndex === 0) ? '#3b82f6' : (rowIndex % 2 === 0 ? '#f9fafb' : null);
              },
              hLineWidth: function (i, node) {
                return (i === 0 || i === node.table.body.length) ? 1 : 0.5;
              },
              vLineWidth: function () {
                return 0.5;
              },
              hLineColor: function () {
                return '#e5e7eb';
              },
              vLineColor: function () {
                return '#e5e7eb';
              },
              paddingLeft: function () { return 8; },
              paddingRight: function () { return 8; },
              paddingTop: function () { return 6; },
              paddingBottom: function () { return 6; }
            }
          } : { text: 'No hay registros activos', style: 'info', italics: true, color: '#6b7280' }
        ],

        styles: {
          header: {
            fontSize: 10,
            bold: true,
            color: '#1f2937'
          },
          subheader: {
            fontSize: 9,
            color: '#6b7280'
          },
          footer: {
            fontSize: 8,
            color: '#9ca3af'
          },
          title: {
            fontSize: 20,
            bold: true,
            color: '#1f2937',
            alignment: 'center'
          },
          sectionHeader: {
            fontSize: 14,
            bold: true,
            color: '#1f2937'
          },
          info: {
            fontSize: 10,
            color: '#4b5563',
            margin: [0, 2, 0, 2]
          },
          tableHeader: {
            fontSize: 10,
            bold: true,
            color: '#ffffff',
            alignment: 'left'
          },
          tableCell: {
            fontSize: 9,
            color: '#374151'
          }
        },

        defaultStyle: {
          font: 'Roboto'
        }
      };

      // Si se incluyen registros eliminados
      if (incluirEliminados && registrosEliminados.length > 0) {
        docDefinition.content.push(
          // Separador
          { text: '', pageBreak: 'before' },

          // Registros eliminados
          { text: 'Registros en Papelería', style: 'sectionHeader', margin: [0, 0, 0, 10] },

          {
            table: {
              headerRows: 1,
              widths: ['18%', '13%', '18%', '13%', '13%', '12%', '13%'],
              body: [
                // Encabezados
                [
                  { text: 'Nombre', style: 'tableHeader' },
                  { text: 'DNI', style: 'tableHeader' },
                  { text: 'Expediente', style: 'tableHeader' },
                  { text: 'Estado', style: 'tableHeader' },
                  { text: 'Eliminado por', style: 'tableHeader' },
                  { text: 'Fecha Elim.', style: 'tableHeader' },
                  { text: 'Motivo', style: 'tableHeader' }
                ],
                // Datos
                ...registrosEliminados.map(r => [
                  { text: r.nombre || `${r.nombres || ''} ${r.apellidos || ''}`.trim() || '---', style: 'tableCell' },
                  { text: r.dni || '---', style: 'tableCell' },
                  { text: r.expediente || r.codigo || '---', style: 'tableCell' },
                  { text: r.estado || '---', style: 'tableCell' },
                  { text: r.eliminado_por || '---', style: 'tableCell', fontSize: 8 },
                  { text: r.fecha_eliminacion ? new Date(r.fecha_eliminacion).toLocaleDateString('es-ES') : '---', style: 'tableCell', fontSize: 8 },
                  { text: r.motivo || 'Sin motivo', style: 'tableCell', fontSize: 8 }
                ])
              ]
            },
            layout: {
              fillColor: function (rowIndex) {
                return (rowIndex === 0) ? '#ef4444' : (rowIndex % 2 === 0 ? '#fef2f2' : null);
              },
              hLineWidth: function (i, node) {
                return (i === 0 || i === node.table.body.length) ? 1 : 0.5;
              },
              vLineWidth: function () {
                return 0.5;
              },
              hLineColor: function () {
                return '#e5e7eb';
              },
              vLineColor: function () {
                return '#e5e7eb';
              },
              paddingLeft: function () { return 6; },
              paddingRight: function () { return 6; },
              paddingTop: function () { return 5; },
              paddingBottom: function () { return 5; }
            }
          }
        );
      }

      // Crear el PDF
      const pdfDoc = this.printer.createPdfKitDocument(docDefinition);

      // Mostrar diálogo para guardar
      const nombreArchivo = `${titulo.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Guardar PDF',
        defaultPath: path.join(app.getPath('documents'), nombreArchivo),
        filters: [
          { name: 'PDF', extensions: ['pdf'] }
        ]
      });

      if (canceled || !filePath) {
        return {
          success: false,
          message: 'Exportación cancelada por el usuario'
        };
      }

      // Guardar el archivo
      return new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(filePath);

        pdfDoc.pipe(writeStream);
        pdfDoc.end();

        writeStream.on('finish', () => {
          resolve({
            success: true,
            message: 'PDF exportado correctamente',
            filePath
          });
        });

        writeStream.on('error', (error) => {
          reject({
            success: false,
            error: error.message
          });
        });
      });

    } catch (error) {
      console.error('Error exportando PDF:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = PDFService;
