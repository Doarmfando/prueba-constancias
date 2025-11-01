import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './styles.css';

// 🔍 Debugging: Capturar errores en consola
console.log('🚀 Iniciando aplicación React...');
console.log('📍 Entorno:', process.env.NODE_ENV);
console.log('🔌 electronAPI disponible:', !!window.electronAPI);
console.log('🔌 electron disponible:', !!window.electron);

// Capturar errores globales
window.addEventListener('error', (event) => {
  console.error('❌ Error global capturado:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Promise rechazada:', event.reason);
});

try {
  ReactDOM.render(
    <App />,
    document.getElementById('root')
  );
  console.log('✅ React montado correctamente');
} catch (error) {
  console.error('❌ Error al montar React:', error);
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: monospace;">
      <h1 style="color: red;">Error al cargar la aplicación</h1>
      <pre>${error.stack}</pre>
    </div>
  `;
}
