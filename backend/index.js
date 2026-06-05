console.log("🎬 Iniciando proceso del servidor backend...");
import { initializeDatabase } from './bd.js';
import express from 'express';
import cors from 'cors';

// Importación de Routers
import ventasRouter from './ventas.js';
import productosRouter from './productos.js';
import insumosRouter from './insumos.js';
import clientesRouter from './clientes.js';
import egresosRouter from './egresos.js';
import contenedoresRouter from './contenedores.js';
import authRouter from './authRouter.js';
import reportesRouter from './reportes.js';
import usuariosRouter from './usuarios.js';
import proveedoresRouter from './proveedores.js';
import recetasRouter from './recetas.js';
import adminRouter from './adminRouter.js';

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

app.use(cors());
app.use(express.json());

// --- INICIALIZACIÓN Y ARRANQUE ---
const startServer = async (retries = 5) => {
  while (retries) {
    try {
      await initializeDatabase();
      app.listen(PORT, () => {
        console.log(`🚀 Backend de Chiffon Master corriendo en el puerto ${PORT}`);
      });
      break; // Éxito, salimos del bucle
    } catch (err) {
      console.error(`❌ Error al conectar (reintentos restantes: ${retries - 1}):`, err);
      retries -= 1;
      if (retries === 0) {
        console.error("❌ No se pudo conectar a la DB tras varios intentos. Saliendo...");
        process.exit(1);
      }
      await new Promise(res => setTimeout(res, 5000)); // Esperar 5 segundos
    }
  }
};

// --- ENDPOINTS DEL API ---
app.use('/api/ventas', ventasRouter);
app.use('/api/proveedores', proveedoresRouter);
app.use('/api/productos', productosRouter);
app.use('/api/ingredientes', insumosRouter);
app.use('/api/clientes', clientesRouter);
app.use('/api/egresos', egresosRouter);
app.use('/api/contenedores', contenedoresRouter);
app.use('/api/auth', authRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/recetas', recetasRouter);
app.use('/api/admin', adminRouter);
app.use('/api', reportesRouter); // Dashboard y Reportes montados en la raíz /api

startServer();