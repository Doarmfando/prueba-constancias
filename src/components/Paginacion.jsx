import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

function Paginacion({
  paginaActual,
  totalPaginas,
  onCambioPagina,
  totalItems,
  itemsPorPagina,
  itemsEnPaginaActual
}) {
  const inicio = ((paginaActual - 1) * itemsPorPagina) + 1;
  const fin = inicio + itemsEnPaginaActual - 1;

  // Generar numeros de pagina para mostrar
  const generarNumerosPagina = () => {
    const paginas = [];
    const maxPaginasVisibles = 5;

    if (totalPaginas <= maxPaginasVisibles) {
      // Mostrar todas las paginas si son pocas
      for (let i = 1; i <= totalPaginas; i++) {
        paginas.push(i);
      }
    } else {
      // Logica para paginas con puntos suspensivos
      if (paginaActual <= 3) {
        // Inicio: 1 2 3 4 ... ultimo
        for (let i = 1; i <= 4; i++) {
          paginas.push(i);
        }
        paginas.push('...');
        paginas.push(totalPaginas);
      } else if (paginaActual >= totalPaginas - 2) {
        // Final: 1 ... antepenultimo penultimo ultimo
        paginas.push(1);
        paginas.push('...');
        for (let i = totalPaginas - 3; i <= totalPaginas; i++) {
          paginas.push(i);
        }
      } else {
        // Medio: 1 ... actual-1 actual actual+1 ... ultimo
        paginas.push(1);
        paginas.push('...');
        paginas.push(paginaActual - 1);
        paginas.push(paginaActual);
        paginas.push(paginaActual + 1);
        paginas.push('...');
        paginas.push(totalPaginas);
      }
    }

    return paginas;
  };

  if (totalPaginas <= 1) {
    return null; // No mostrar paginacion si solo hay 1 pagina
  }

  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        {/* Version movil - solo botones anterior/siguiente */}
        <button
          onClick={() => onCambioPagina(paginaActual - 1)}
          disabled={paginaActual === 1}
          className={`relative inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${
            paginaActual === 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          Anterior
        </button>
        <button
          onClick={() => onCambioPagina(paginaActual + 1)}
          disabled={paginaActual === totalPaginas}
          className={`relative ml-3 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${
            paginaActual === totalPaginas
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          Siguiente
        </button>
      </div>

      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        {/* Informacion de registros */}
        <div>
          <p className="text-sm text-gray-700">
            Mostrando <span className="font-medium">{inicio}</span> a{' '}
            <span className="font-medium">{fin}</span> de{' '}
            <span className="font-medium">{totalItems}</span> resultados
          </p>
        </div>

        {/* Controles de paginacion */}
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            {/* Boton anterior */}
            <button
              onClick={() => onCambioPagina(paginaActual - 1)}
              disabled={paginaActual === 1}
              className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 focus:z-20 focus:outline-offset-0 ${
                paginaActual === 1
                  ? 'cursor-not-allowed bg-gray-100'
                  : 'hover:bg-gray-50 bg-white'
              }`}
            >
              <span className="sr-only">Anterior</span>
              <FaChevronLeft className="h-3 w-3" aria-hidden="true" />
            </button>

            {/* Numeros de pagina */}
            {generarNumerosPagina().map((numero, index) => {
              if (numero === '...') {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 bg-white"
                  >
                    ...
                  </span>
                );
              }

              return (
                <button
                  key={numero}
                  onClick={() => onCambioPagina(numero)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0 ${
                    paginaActual === numero
                      ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                      : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 bg-white'
                  }`}
                >
                  {numero}
                </button>
              );
            })}

            {/* Boton siguiente */}
            <button
              onClick={() => onCambioPagina(paginaActual + 1)}
              disabled={paginaActual === totalPaginas}
              className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 focus:z-20 focus:outline-offset-0 ${
                paginaActual === totalPaginas
                  ? 'cursor-not-allowed bg-gray-100'
                  : 'hover:bg-gray-50 bg-white'
              }`}
            >
              <span className="sr-only">Siguiente</span>
              <FaChevronRight className="h-3 w-3" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}

export default Paginacion;
