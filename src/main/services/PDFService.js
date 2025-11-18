const PdfPrinter = require('pdfmake');
const fs = require('fs');
const path = require('path');

let electronApp = null;
let electronDialog = null;
try {
  const electron = require('electron');
  electronApp = electron?.app || null;
  electronDialog = electron?.dialog || null;
} catch (error) {
  electronApp = null;
  electronDialog = null;
}

class PDFService {
  constructor() {
    this.fonts = {
      Roboto: {
        normal: path.join(__dirname, '../../fonts/Roboto-Regular.ttf'),
        bold: path.join(__dirname, '../../fonts/Roboto-Medium.ttf'),
        italics: path.join(__dirname, '../../fonts/Roboto-Italic.ttf'),
        bolditalics: path.join(__dirname, '../../fonts/Roboto-MediumItalic.ttf')
      }
    };

    try {
      if (!fs.existsSync(this.fonts.Roboto.normal)) {
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
    this.electronApp = electronApp;
    this.dialog = electronDialog;
  }

  async exportarProyectoPDF(proyecto, registros, opciones = {}) {
    try {
      const {
        titulo = proyecto.nombre,
        incluirEliminados = false,
        registrosEliminados = [],
        fechaExportacion = null,
        soloBuffer = false
      } = opciones;

      // Si viene fechaExportacion, parsearla correctamente evitando problemas de zona horaria
      let fechaActual;
      if (fechaExportacion) {
        // Formato: yyyy-MM-dd -> crear fecha local sin conversión UTC
        const [year, month, day] = fechaExportacion.split('-').map(Number);
        const fechaLocal = new Date(year, month - 1, day);
        fechaActual = fechaLocal.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      } else {
        fechaActual = null;
      }

      const formatearFecha = (valor) => {
        if (!valor || valor === 'No entregado') return valor || '---';
        const d = new Date(valor);
        return Number.isNaN(d.getTime()) ? '---' : d.toLocaleDateString('es-ES');
      };

      const tablaPrincipal = [
        [
          { text: '#', style: 'tableHeader' },
          { text: 'Nombre', style: 'tableHeader' },
          { text: 'DNI', style: 'tableHeader' },
          { text: 'Expediente', style: 'tableHeader' },
          { text: 'Número', style: 'tableHeader' },
          { text: 'Fecha Registro', style: 'tableHeader' },
          { text: 'Estado', style: 'tableHeader' },
          { text: 'Fecha en Caja', style: 'tableHeader' }
        ],
        ...registros.map((registro, index) => ([
          { text: (index + 1).toString(), style: 'tableCell' },
          { text: registro.nombre || '---', style: 'tableCell' },
          { text: registro.dni || '---', style: 'tableCell' },
          { text: registro.expediente || registro.codigo || '---', style: 'tableCell' },
          { text: registro.numero || '---', style: 'tableCell' },
          { text: formatearFecha(registro.fecha_registro), style: 'tableCell' },
          { text: registro.estado || '---', style: 'tableCell' },
          { text: formatearFecha(registro.fecha_en_caja) || '---', style: 'tableCell' }
        ]))
      ];

      const contenido = [];

      if (registros.length > 0) {
        contenido.push({
          table: {
            headerRows: 1,
            widths: ['5%', '17%', '11%', '17%', '11%', '13%', '11%', '15%'],
            body: tablaPrincipal
          },
          layout: {
            fillColor: (rowIndex) => (rowIndex === 0 ? '#3b82f6' : (rowIndex % 2 === 0 ? '#f9fafb' : null)),
            hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 1 : 0.5),
            vLineWidth: () => 0.5,
            hLineColor: () => '#e5e7eb',
            vLineColor: () => '#e5e7eb',
            paddingLeft: () => 8,
            paddingRight: () => 8,
            paddingTop: () => 6,
            paddingBottom: () => 6
          }
        });
      } else {
        contenido.push({ text: 'No hay registros para este proyecto', style: 'info', italics: true, color: '#6b7280' });
      }

      if (incluirEliminados && Array.isArray(registrosEliminados) && registrosEliminados.length > 0) {
        contenido.push({ text: '\nRegistros eliminados', style: 'sectionHeader' });
        contenido.push({
          table: {
            headerRows: 1,
            widths: ['20%', '20%', '20%', '20%', '20%'],
            body: [
              [
                { text: 'Nombre', style: 'tableHeader' },
                { text: 'DNI', style: 'tableHeader' },
                { text: 'Expediente', style: 'tableHeader' },
                { text: 'Usuario', style: 'tableHeader' },
                { text: 'Fecha', style: 'tableHeader' }
              ],
              ...registrosEliminados.map((item) => ([
                { text: item.nombre || '---', style: 'tableCell' },
                { text: item.dni || '---', style: 'tableCell' },
                { text: item.expediente || '---', style: 'tableCell' },
                { text: item.usuario_elimino || '---', style: 'tableCell' },
                { text: formatearFecha(item.fecha_eliminado), style: 'tableCell' }
              ]))
            ]
          },
          layout: {
            fillColor: (rowIndex) => (rowIndex === 0 ? '#b91c1c' : (rowIndex % 2 === 0 ? '#fef2f2' : null)),
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#fca5a5',
            vLineColor: () => '#fca5a5',
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 5,
            paddingBottom: () => 5
          }
        });
      }

      const docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [40, 60, 40, 60],
        header: fechaExportacion ? {
          margin: [40, 20, 40, 0],
          columns: [
            { text: '', alignment: 'left' },
            { text: fechaActual, style: 'subheader', alignment: 'right' }
          ]
        } : undefined,
        footer: (currentPage, pageCount) => ({
          margin: [40, 0, 40, 20],
          columns: [
            { text: 'Generado con Sistema de Gestión', style: 'footer', alignment: 'left' },
            { text: `Página ${currentPage} de ${pageCount}`, style: 'footer', alignment: 'right' }
          ]
        }),
        content: [
          { text: titulo || proyecto.nombre, style: 'title', margin: [0, 0, 0, 20] },
          ...contenido
        ],
        styles: {
          header: { fontSize: 10, bold: true, color: '#1f2937' },
          subheader: { fontSize: 9, color: '#6b7280' },
          footer: { fontSize: 8, color: '#9ca3af' },
          title: { fontSize: 20, bold: true, color: '#1f2937', alignment: 'center' },
          sectionHeader: { fontSize: 14, bold: true, color: '#1f2937', margin: [0, 10, 0, 10] },
          info: { fontSize: 10, color: '#4b5563', margin: [0, 2, 0, 2] },
          tableHeader: { fontSize: 10, bold: true, color: '#ffffff', alignment: 'left' },
          tableCell: { fontSize: 9, color: '#374151' }
        },
        defaultStyle: { font: 'Roboto' }
      };

      const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
      const fileName = `${titulo.replace(/[^a-z0-9]/gi, '_') || 'proyecto'}_${Date.now()}.pdf`;
      const puedeUsarDialogo = !soloBuffer && this.dialog && this.electronApp;

      if (!puedeUsarDialogo) {
        return new Promise((resolve, reject) => {
          const chunks = [];
          pdfDoc.on('data', (chunk) => chunks.push(chunk));
          pdfDoc.on('end', () => resolve({
            success: true,
            buffer: Buffer.concat(chunks),
            fileName
          }));
          pdfDoc.on('error', (error) => reject({
            success: false,
            error: error.message
          }));
          pdfDoc.end();
        });
      }

      const documentsPath = this.electronApp?.getPath('documents') || process.cwd();
      const { canceled, filePath } = await this.dialog.showSaveDialog({
        title: 'Guardar PDF',
        defaultPath: path.join(documentsPath, fileName),
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      });

      if (canceled || !filePath) {
        return { success: false, message: 'Exportación cancelada por el usuario' };
      }

      return new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(filePath);
        pdfDoc.pipe(writeStream);
        pdfDoc.end();
        writeStream.on('finish', () => resolve({
          success: true,
          message: 'PDF exportado correctamente',
          filePath
        }));
        writeStream.on('error', (error) => reject({
          success: false,
          error: error.message
        }));
      });
    } catch (error) {
      console.error('Error exportando PDF:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = PDFService;
