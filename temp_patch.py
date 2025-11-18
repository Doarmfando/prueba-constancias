import re, pathlib
path = pathlib.Path(r'src/pages/ProyectoDetalle.jsx')
text = path.read_bytes().decode('utf-8','replace')
pattern = r"  const cargarEstadisticas = async \(\) => \{.*?\n  \};"
new = """  const cargarEstadisticas = async () => {
    try {
      const registrosFiltrados = filtrarPorAnio(registros);
      const eliminadosFiltrados = filtrarPorAnio(registrosEliminados);

      // Calcular estadisticas por estado desde los registros filtrados
      const recibidos = registrosFiltrados.filter(r => r.estado == 'Recibido').length;
      const enCaja = registrosFiltrados.filter(r => r.estado == 'En Caja').length;
      const entregados = registrosFiltrados.filter(r => r.estado == 'Entregado').length;
      const tesoreria = registrosFiltrados.filter(r => r.estado == 'Tesoreria').length;
      const activos = registrosFiltrados.length;
      const papeleria = eliminadosFiltrados.length;
      const total = activos + papeleria;

      setEstadisticas({
        recibidos,
        enCaja,
        entregados,
        tesoreria,
        total,
        activos,
        papeleria,
        pendientes: recibidos
      });
    } except Exception as error:
      print('Error cargando estadisticas:', error)
      setEstadisticas({
        recibidos: 0,
        enCaja: 0,
        entregados: 0,
        tesoreria: 0,
        total: 0,
        activos: 0,
        papeleria: 0,
        pendientes: 0
      })
  };"""
text = re.sub(pattern, new, text, flags=re.S)
path.write_text(text, encoding='utf-8')