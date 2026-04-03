import { pool } from './db.js';

/**
 * SQL Schema para inicialización
 */
const schema = `
CREATE TABLE IF NOT EXISTS \`alertas\` (
  \`alerta_id\` int NOT NULL AUTO_INCREMENT,
  \`ingrediente_id\` int DEFAULT NULL,
  \`fecha\` date DEFAULT NULL,
  \`mensaje\` text COLLATE utf8mb3_spanish2_ci,
  PRIMARY KEY (\`alerta_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

CREATE TABLE IF NOT EXISTS \`clientes\` (
  \`cliente_id\` int NOT NULL AUTO_INCREMENT,
  \`nombre\` varchar(100) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  \`categoria\` enum('Snack','Externo','Especial') COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  \`telefono\` varchar(20) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  \`direccion\` varchar(255) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  \`tarjeta_snack\` int DEFAULT '0',
  PRIMARY KEY (\`cliente_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

CREATE TABLE IF NOT EXISTS \`contenedores\` (
  \`contenedor_id\` int NOT NULL AUTO_INCREMENT,
  \`cliente_id\` int DEFAULT NULL,
  \`estado\` enum('EnUso','Devuelto','Baja') COLLATE utf8mb3_spanish2_ci DEFAULT 'EnUso',
  \`uso_actual\` int DEFAULT '0',
  PRIMARY KEY (\`contenedor_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

CREATE TABLE IF NOT EXISTS \`ingredientes\` (
  \`ingrediente_id\` int NOT NULL AUTO_INCREMENT,
  \`nombre\` varchar(100) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  \`unidad_medida\` enum('gr','Kg','Doc','Uni','Mt','cm') COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  \`stock_actual\` decimal(10,3) DEFAULT '0.000',
  \`stock_minimo\` decimal(10,3) DEFAULT '0.000',
  \`costo_unitario\` decimal(10,3) DEFAULT '0.000',
  PRIMARY KEY (\`ingrediente_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

CREATE TABLE IF NOT EXISTS \`precio_insumos\` (
  \`precio_id\` int NOT NULL AUTO_INCREMENT,
  \`ingrediente_id\` int DEFAULT NULL,
  \`fecha\` date DEFAULT NULL,
  \`costo_unitario\` decimal(10,3) DEFAULT NULL,
  PRIMARY KEY (\`precio_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

CREATE TABLE IF NOT EXISTS \`productos\` (
  \`producto_id\` int NOT NULL AUTO_INCREMENT,
  \`nombre\` varchar(100) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  \`sabor\` varchar(50) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  \`precio_snack\` decimal(10,2) DEFAULT NULL,
  \`precio_externo\` decimal(10,2) DEFAULT NULL,
  \`precio_especial\` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (\`producto_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

CREATE TABLE IF NOT EXISTS \`recetas\` (
  \`receta_id\` int NOT NULL AUTO_INCREMENT,
  \`producto_id\` int DEFAULT NULL,
  \`ingrediente_id\` int DEFAULT NULL,
  \`cantidad_necesaria\` decimal(10,3) DEFAULT NULL,
  PRIMARY KEY (\`receta_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

CREATE TABLE IF NOT EXISTS \`usuarios\` (
  \`usuario_id\` int NOT NULL AUTO_INCREMENT,
  \`username\` varchar(50) COLLATE utf8mb3_spanish2_ci NOT NULL,
  \`password\` varchar(255) COLLATE utf8mb3_spanish2_ci NOT NULL,
  \`rol\` enum('Administrador','Vendedor','Cliente') COLLATE utf8mb3_spanish2_ci NOT NULL,
  \`cliente_id\` int DEFAULT NULL,
  PRIMARY KEY (\`usuario_id\`),
  UNIQUE KEY \`username\` (\`username\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

CREATE TABLE IF NOT EXISTS \`ventas\` (
  \`venta_id\` int NOT NULL AUTO_INCREMENT,
  \`fecha\` date DEFAULT NULL,
  \`cliente_id\` int DEFAULT NULL,
  \`total\` decimal(10,2) DEFAULT NULL,
  \`usuario_id\` int DEFAULT NULL,
  \`forma_pago\` enum('QR','Contado','CreditoDia') COLLATE utf8mb3_spanish2_ci DEFAULT 'QR',
  PRIMARY KEY (\`venta_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

CREATE TABLE IF NOT EXISTS \`detalle_venta\` (
  \`detalle_id\` int NOT NULL AUTO_INCREMENT,
  \`venta_id\` int DEFAULT NULL,
  \`producto_id\` int DEFAULT NULL,
  \`cantidad\` int DEFAULT NULL,
  \`precio_unitario\` decimal(10,2) DEFAULT NULL,
  \`subtotal\` decimal(10,2) DEFAULT NULL,
  \`es_regalo\` tinyint DEFAULT '0',
  PRIMARY KEY (\`detalle_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

CREATE TABLE IF NOT EXISTS \`egresos\` (
  \`egreso_id\` int NOT NULL AUTO_INCREMENT,
  \`fecha\` date DEFAULT NULL,
  \`tipo\` enum('Insumos','Pasajes','Almuerzo','Sueldo','Otros') COLLATE utf8mb3_spanish2_ci DEFAULT 'Insumos',
  \`concepto\` varchar(255) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  \`monto\` decimal(10,3) DEFAULT NULL,
  \`proveedor_id\` int DEFAULT NULL,
  PRIMARY KEY (\`egreso_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

CREATE TABLE IF NOT EXISTS \`proveedores\` (
  \`proveedor_id\` int NOT NULL AUTO_INCREMENT,
  \`nombre\` varchar(100) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  \`telefono\` varchar(20) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  \`direccion\` varchar(255) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  PRIMARY KEY (\`proveedor_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

CREATE TABLE IF NOT EXISTS \`rentabilidad_historica\` (
  \`registro_id\` int NOT NULL AUTO_INCREMENT,
  \`producto_id\` int NOT NULL,
  \`fecha\` date NOT NULL,
  \`costo_total\` decimal(10,3) NOT NULL,
  \`margen_snack\` decimal(10,3) DEFAULT NULL,
  \`margen_externo\` decimal(10,3) DEFAULT NULL,
  \`margen_especial\` decimal(10,3) DEFAULT NULL,
  PRIMARY KEY (\`registro_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;
`;

/**
 * Carga datos iniciales (Seed) para insumos y productos base
 */
const seedDatabase = async () => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    console.log("🌱 Sembrando datos iniciales...");

    // 1. Insumos Base
    const insumos = [
      ['Harina Especial', 'Kg', 50, 5, 4.50],
      ['Huevo Rosado', 'Doc', 100, 10, 6.00],
      ['Azúcar Blanca', 'Kg', 40, 4, 3.80],
      ['Aceite Vegetal', 'Uni', 20, 2, 7.50],
      ['Sal Yodada', 'gr', 1000, 100, 0.01],
      ['Maizena', 'gr', 500, 50, 0.05],
      ['Cremor Tartaro', 'gr', 200, 20, 0.15],
      ['Polvo de Hornear', 'gr', 300, 30, 0.08]
    ];

    const [insumoResult] = await connection.query(
      "INSERT INTO ingredientes (nombre, unidad_medida, stock_actual, stock_minimo, costo_unitario) VALUES ?",
      [insumos]
    );

    // 2. Producto de Ejemplo
    const [prodResult] = await connection.query(
      "INSERT INTO productos (nombre, sabor, precio_snack, precio_externo, precio_especial) VALUES (?, ?, ?, ?, ?)",
      ['Chifón Clásico Zuzú', 'Vainilla', 25.00, 28.00, 22.00]
    );
    const productoId = prodResult.insertId;

    // 3. Receta para el producto de ejemplo (Vinculando con los IDs insertados)
    // Obtenemos los IDs reales de los insumos recién creados
    const [rows] = await connection.query("SELECT ingrediente_id, nombre FROM ingredientes");
    
    const getIngId = (name) => rows.find(r => r.nombre.includes(name))?.ingrediente_id;

    const receta = [
      [productoId, getIngId('Harina'), 0.285],
      [productoId, getIngId('Huevo'), 8],
      [productoId, getIngId('Azúcar'), 0.250],
      [productoId, getIngId('Aceite'), 0.140]
    ].filter(item => item[1] !== undefined);

    if (receta.length > 0) {
      await connection.query(
        "INSERT INTO recetas (producto_id, ingrediente_id, cantidad_necesaria) VALUES ?",
        [receta]
      );
    }

    await connection.commit();
    console.log("✨ Datos iniciales cargados con éxito.");
  } catch (error) {
    await connection.rollback();
    console.error("⚠️ No se pudo completar el seeding:", error.message);
  } finally {
    connection.release();
  }
};

/**
 * Inicializa la base de datos solo si no existen tablas.
 */
export const initializeDatabase = async () => {
  try {
    // 1. Verificar si la base de datos ya tiene tablas
    const [rows] = await pool.query("SHOW TABLES");
    
    if (rows.length > 0) {
      console.log("ℹ️ La base de datos ya contiene tablas. Saltando inicialización.");
      return;
    }

    console.log("🚀 Base de datos vacía detectada. Iniciando creación de esquema...");

    // 2. Ejecutar el esquema completo
    await pool.query(schema);
    
    // 3. Cargar datos de prueba
    await seedDatabase();
    
    console.log("✅ Esquema de base de datos creado exitosamente.");

    // 3. Crear usuario administrador por defecto si no existe (Opcional pero recomendado)
    const [adminExists] = await pool.query("SELECT * FROM usuarios WHERE username = 'Administrador'");
    if (adminExists.length === 0) {
      // Password: 'admin' (Encriptado con bcrypt rounds=10)
      const defaultAdminPass = '$2a$10$9v3J6W5qWl.YhN8F.hF6.eXyH6pQ6O6pQ6O6pQ6O6pQ6O6pQ6O6pQ'; 
      await pool.query(
        "INSERT INTO usuarios (username, password, rol) VALUES (?, ?, ?)",
        ['Administrador', defaultAdminPass, 'Administrador']
      );
      console.log("👤 Usuario administrador por defecto creado (Administrador/Administrador).");
    }

  } catch (error) {
    console.error("❌ Error durante la inicialización de la base de datos:", error.message);
    throw error;
  }
};
