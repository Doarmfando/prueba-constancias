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
        // Ignorado: no se mostrará papelería en el PDF
        incluirEliminados = false,
        registrosEliminados = [],
        // Opcional: permitir pasar una fecha de exportación (Date|string)
        fechaExportacion = null
      } = opciones;

      const fechaReferencia = fechaExportacion ? new Date(fechaExportacion) : new Date();
      const fechaActual = fechaReferencia.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      // Helper local para formatear fechas de filas
      const formatearFecha = (valor) => {
        if (!valor || valor === 'No entregado') return valor || '---';
        const d = new Date(valor);
        return isNaN(d.getTime()) ? '---' : d.toLocaleDateString('es-ES');
      };

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
              text: `Fecha de exportación: ${fechaActual}`,
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
          registros.length > 0 ? {
            table: {
              headerRows: 1,
              widths: ['18%', '12%', '18%', '12%', '14%', '12%', '14%'],
              body: [
                // Encabezados (orden solicitado)
                [
                  { text: 'Nombre', style: 'tableHeader' },
                  { text: 'DNI', style: 'tableHeader' },
                  { text: 'Expediente', style: 'tableHeader' },
                  { text: 'Número', style: 'tableHeader' },
                  { text: 'Fecha Registro', style: 'tableHeader' },
                  { text: 'Estado', style: 'tableHeader' },
                  { text: 'Fecha en Caja', style: 'tableHeader' }
                ],
                // Datos (con formateo de fechas)
                ...registros.map(r => [
                  { text: r.nombre || `${r.nombres || ''} ${r.apellidos || ''}`.trim() || '---', style: 'tableCell' },
                  { text: r.dni || '---', style: 'tableCell' },
                  { text: r.expediente || r.codigo || '---', style: 'tableCell' },
                  { text: r.numero || '---', style: 'tableCell' },
                  { text: formatearFecha(r.fecha_registro), style: 'tableCell' },
                  { text: r.estado || '---', style: 'tableCell' },
                  { text: formatearFecha(r.fecha_en_caja), style: 'tableCell' }
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
          } : { text: 'No hay registros', style: 'info', italics: true, color: '#6b7280' }
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

      // Se elimina la inclusión de registros eliminados (Papelería) de forma fija

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
