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

const app = express();
const PORT = 3003;

app.use(cors());
app.use(express.json());

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
app.use('/api', reportesRouter); // Dashboard y Reportes montados en la raíz /api

app.listen(PORT, () => {
  console.log(`🚀 Backend de Chiffon Master corriendo en http://localhost:${PORT}`);
});